import prisma from "@/lib/prisma";
import { processAiReply } from "@/lib/openai";
import { sendInteractiveMessage, sendTextMessage } from "@/lib/whatsapp/api";

type FlowNode = {
  id: string;
  type: string;
  text?: string;
  nextId?: string;
  operator?: "equals" | "contains" | "starts_with" | "ends_with";
  value?: string;
  trueNextId?: string;
  falseNextId?: string;
  userId?: string;
  categoryId?: string;
  field?: string;
  fieldValue?: string;
  buttons?: Array<{
    id: string;
    title: string;
    nextId?: string;
    categoryId?: string;
  }>;
  listButtonText?: string;
  sections?: Array<{
    title?: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
      nextId?: string;
      categoryId?: string;
    }>;
  }>;
};

async function assignContactToCategory(
  vendorId: string,
  contactId: string,
  categoryId: string,
) {
  // Find all employees in this category, pick the one with fewest assigned contacts
  const employees = await prisma.vendorUser.findMany({
    where: { vendorId, jobCategoryId: categoryId, user: { status: 1 } },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          _count: { select: { assignedContacts: true } },
        },
      },
    },
  });
  if (employees.length === 0) return;
  // Sort by number of assigned contacts (least busy first)
  const sorted = employees.sort(
    (a, b) =>
      (a.user._count?.assignedContacts ?? 0) -
      (b.user._count?.assignedContacts ?? 0),
  );
  const targetUserId = sorted[0].userId;
  await prisma.contact.update({
    where: { id: contactId },
    data: { assignedUserId: targetUserId },
  });
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function mergeContactData(current: any, patch: Record<string, any>) {
  const base = asObject(current);
  return { ...base, ...patch };
}

async function getWhatsAppConfig(
  vendorId: string,
  webhookPhoneNumberId?: string,
) {
  const settings = await prisma.vendorSetting.findMany({
    where: {
      vendorId,
      settingKey: {
        in: [
          "whatsapp_access_token",
          "current_phone_number_id",
          "whatsapp_access_token",
          "whatsapp_phone_number_id",
        ],
      },
    },
  });
  const accessToken =
    settings.find((s) => s.settingKey === "whatsapp_access_token")
      ?.settingValue ?? null;
  const configuredPhoneNumberId =
    settings.find((s) => s.settingKey === "current_phone_number_id")
      ?.settingValue ??
    settings.find((s) => s.settingKey === "whatsapp_phone_number_id")
      ?.settingValue ??
    null;
  return {
    accessToken,
    phoneNumberId: webhookPhoneNumberId ?? configuredPhoneNumberId,
  };
}

async function sendAndLogText(
  vendorId: string,
  contact: any,
  phoneNumberId: string,
  accessToken: string,
  text: string,
) {
  await sendTextMessage(phoneNumberId, accessToken, contact.waId, text);
  await prisma.whatsappMessageLog.create({
    data: {
      vendorId,
      contactId: contact.id,
      messageType: "text",
      messageContent: text,
      status: "sent",
      wabPhoneNumberId: phoneNumberId,
      isIncomingMessage: false,
    },
  });
}

async function sendAndLogInteractive(
  vendorId: string,
  contact: any,
  phoneNumberId: string,
  accessToken: string,
  interactive: any,
  originalNode: FlowNode,
) {
  await sendInteractiveMessage(
    phoneNumberId,
    accessToken,
    contact.waId,
    interactive,
  );
  await prisma.whatsappMessageLog.create({
    data: {
      vendorId,
      contactId: contact.id,
      messageType: "interactive",
      messageContent: interactive?.body?.text ?? null,
      status: "sent",
      wabPhoneNumberId: phoneNumberId,
      isIncomingMessage: false,
      data: { flowNode: originalNode, interactive },
    },
  });
}

function resolveNodes(flowData: any): {
  startNodeId: string | null;
  nodesMap: Map<string, FlowNode>;
  trigger: any;
} {
  const data = asObject(flowData);
  const nodes = Array.isArray(data.nodes) ? (data.nodes as FlowNode[]) : [];
  const nodesMap = new Map<string, FlowNode>();
  for (const node of nodes) {
    if (node?.id) nodesMap.set(node.id, node);
  }
  return {
    startNodeId:
      (typeof data.startNodeId === "string" ? data.startNodeId : null) ??
      nodes[0]?.id ??
      null,
    nodesMap,
    trigger: asObject(data.trigger),
  };
}

function evaluateCondition(node: FlowNode, incomingText: string): boolean {
  const source = normalize(incomingText);
  const expected = normalize(node.value);
  switch (node.operator) {
    case "equals":
      return source === expected;
    case "starts_with":
      return source.startsWith(expected);
    case "ends_with":
      return source.endsWith(expected);
    case "contains":
    default:
      return source.includes(expected);
  }
}

export async function processBotAutomation(
  vendorId: string,
  contact: any,
  messageText: string,
  replyChoiceKey: string | null,
  webhookPhoneNumberId?: string,
) {
  const { accessToken, phoneNumberId } = await getWhatsAppConfig(
    vendorId,
    webhookPhoneNumberId,
  );
  if (!accessToken || !phoneNumberId) return;

  const contactData = asObject(contact.data);
  const state = asObject(contactData.botFlowState);
  const normalizedMessage = normalize(messageText);
  const normalizedChoice = normalize(replyChoiceKey);

  const continueFlow = async (
    flowId: string,
    fromNodeId: string,
    incomingForCondition: string,
  ) => {
    const flow = await prisma.botFlow.findFirst({
      where: { id: flowId, vendorId, status: 1 },
      select: { id: true, data: true },
    });
    if (!flow) return false;

    const { nodesMap } = resolveNodes(flow.data);
    let currentNodeId: string | undefined = fromNodeId;
    let loopGuard = 0;

    while (currentNodeId && loopGuard < 20) {
      loopGuard += 1;
      const node = nodesMap.get(currentNodeId);
      if (!node) break;

      if (node.type === "send_text") {
        if (node.text) {
          await sendAndLogText(
            vendorId,
            contact,
            phoneNumberId,
            accessToken,
            node.text,
          );
        }
        currentNodeId = node.nextId;
        continue;
      }

      if (node.type === "send_buttons") {
        const buttons = (node.buttons ?? []).slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        }));
        if (buttons.length === 0) break;
        await sendAndLogInteractive(
          vendorId,
          contact,
          phoneNumberId,
          accessToken,
          {
            type: "button",
            body: { text: node.text ?? "Please choose an option." },
            action: { buttons },
          },
          node,
        );
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            data: mergeContactData(contact.data, {
              botFlowState: {
                flowId,
                waitingNodeId: node.id,
                waitingType: "buttons",
                updatedAt: new Date().toISOString(),
              },
            }),
          },
        });
        return true;
      }

      if (node.type === "send_list") {
        const sections = (node.sections ?? []).map((s) => ({
          title: s.title,
          rows: (s.rows ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            ...(r.description ? { description: r.description } : {}),
          })),
        }));
        if (sections.length === 0) break;
        await sendAndLogInteractive(
          vendorId,
          contact,
          phoneNumberId,
          accessToken,
          {
            type: "list",
            body: { text: node.text ?? "Please choose from the list." },
            action: {
              button: node.listButtonText ?? "View options",
              sections,
            },
          },
          node,
        );
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            data: mergeContactData(contact.data, {
              botFlowState: {
                flowId,
                waitingNodeId: node.id,
                waitingType: "list",
                updatedAt: new Date().toISOString(),
              },
            }),
          },
        });
        return true;
      }

      if (node.type === "condition_text") {
        currentNodeId = evaluateCondition(node, incomingForCondition)
          ? node.trueNextId
          : node.falseNextId;
        continue;
      }

      if (node.type === "assign_user") {
        if (node.userId) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { assignedUserId: node.userId },
          });
        }
        currentNodeId = node.nextId;
        continue;
      }

      if (node.type === "assign_category") {
        if (node.categoryId) {
          await assignContactToCategory(vendorId, contact.id, node.categoryId);
        }
        currentNodeId = node.nextId;
        continue;
      }

      if (node.type === "set_contact_attribute") {
        const value = node.fieldValue ?? "";
        if (node.field === "firstName") {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { firstName: value },
          });
        } else if (node.field === "lastName") {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { lastName: value },
          });
        } else if (node.field === "email") {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { email: value },
          });
        } else {
          const patchedData = mergeContactData(contact.data, {
            [node.field ?? "custom_attribute"]: value,
          });
          await prisma.contact.update({
            where: { id: contact.id },
            data: { data: patchedData },
          });
        }
        currentNodeId = node.nextId;
        continue;
      }

      if (node.type === "end") {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            data: mergeContactData(contact.data, { botFlowState: null }),
          },
        });
        return true;
      }

      break;
    }

    return loopGuard > 0;
  };

  if (state.flowId && state.waitingNodeId) {
    const flow = await prisma.botFlow.findFirst({
      where: { id: String(state.flowId), vendorId, status: 1 },
      select: { id: true, data: true },
    });
    if (!flow) {
      // Flow deleted or deactivated — clear stale state and fall through
      await prisma.contact.update({
        where: { id: contact.id },
        data: { data: mergeContactData(contact.data, { botFlowState: null }) },
      });
    }
    if (flow) {
      const { nodesMap } = resolveNodes(flow.data);
      const waitingNode = nodesMap.get(String(state.waitingNodeId));
      if (
        waitingNode &&
        (waitingNode.type === "send_buttons" ||
          waitingNode.type === "send_list")
      ) {
        const matchedButton = (waitingNode.buttons ?? []).find(
          (b) =>
            normalize(b.id) === normalizedChoice ||
            normalize(b.title) === normalizedMessage ||
            normalize(b.title) === normalizedChoice,
        );
        const matchedRow = (waitingNode.sections ?? [])
          .flatMap((s) => s.rows ?? [])
          .find(
            (r) =>
              normalize(r.id) === normalizedChoice ||
              normalize(r.title) === normalizedMessage ||
              normalize(r.title) === normalizedChoice,
          );

        // If the matched button/row has a categoryId, assign contact to that category employees
        const chosenCategoryId =
          matchedButton?.categoryId ?? matchedRow?.categoryId;
        if (chosenCategoryId) {
          await assignContactToCategory(vendorId, contact.id, chosenCategoryId);
        }

        const nextId =
          matchedButton?.nextId ?? matchedRow?.nextId ?? waitingNode.nextId;
        if (nextId) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              data: mergeContactData(contact.data, {
                botFlowState: {
                  flowId: flow.id,
                  waitingNodeId: null,
                  waitingType: null,
                  updatedAt: new Date().toISOString(),
                },
              }),
            },
          });
          const handled = await continueFlow(flow.id, nextId, messageText);
          if (handled) return;
        }
      }
    }
  }

  const activeFlows = await prisma.botFlow.findMany({
    where: { vendorId, status: 1 },
    orderBy: { createdAt: "asc" },
    select: { id: true, data: true },
  });

  for (const flow of activeFlows) {
    const { trigger, startNodeId } = resolveNodes(flow.data);
    if (!startNodeId) continue;
    const triggerType = normalize(trigger.type ?? "any");
    const triggerValue = normalize(trigger.value);
    let matched = false;

    if (triggerType === "any") matched = true;
    if (triggerType === "keyword" && triggerValue)
      matched = normalizedMessage.includes(triggerValue);
    if (triggerType === "welcome") {
      const incomingCount = await prisma.whatsappMessageLog.count({
        where: { vendorId, contactId: contact.id, isIncomingMessage: true },
      });
      matched = incomingCount <= 1;
    }

    if (matched) {
      const handled = await continueFlow(flow.id, startNodeId, messageText);
      if (handled) return;
    }
  }

  const botReplies = await prisma.botReply.findMany({
    where: { vendorId, status: 1 },
    orderBy: { order: "asc" },
  });

  for (const reply of botReplies) {
    let matched = false;
    const subject = normalize(reply.triggerSubject);

    switch (reply.triggerType) {
      case "welcome": {
        const count = await prisma.whatsappMessageLog.count({
          where: { contactId: contact.id, isIncomingMessage: true },
        });
        matched = count <= 1;
        break;
      }
      case "is":
        matched = normalizedMessage === subject;
        break;
      case "starts_with":
        matched = normalizedMessage.startsWith(subject);
        break;
      case "ends_with":
        matched = normalizedMessage.endsWith(subject);
        break;
      case "contains_word":
        matched = normalizedMessage.split(/\s+/).includes(subject);
        break;
      case "contains":
        matched = normalizedMessage.includes(subject);
        break;
      case "start_ai_bot":
        if (normalizedMessage === subject) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { disableAiBot: false },
          });
        }
        break;
      case "stop_ai_bot":
        if (normalizedMessage === subject) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { disableAiBot: true },
          });
        }
        break;
      default:
        matched = normalizedMessage === subject;
        break;
    }

    if (!matched) continue;

    if (reply.replyType === "text" && reply.replyMessage) {
      const replyText = reply.replyMessage
        .replace(/{first_name}/g, contact.firstName ?? "")
        .replace(/{last_name}/g, contact.lastName ?? "")
        .replace(/{phone_number}/g, contact.waId ?? "")
        .replace(/{email}/g, contact.email ?? "");
      await sendAndLogText(
        vendorId,
        contact,
        phoneNumberId,
        accessToken,
        replyText,
      );
      return;
    }

    if (reply.replyType === "buttons") {
      const replyData = asObject(reply.data);
      const buttons = Array.isArray(replyData.buttons) ? replyData.buttons : [];
      if (buttons.length) {
        await sendAndLogInteractive(
          vendorId,
          contact,
          phoneNumberId,
          accessToken,
          {
            type: "button",
            body: { text: reply.replyMessage ?? "Please choose an option." },
            action: {
              buttons: buttons.slice(0, 3).map((btn: any) => ({
                type: "reply",
                reply: { id: String(btn.id), title: String(btn.title) },
              })),
            },
          },
          { id: reply.id, type: "send_buttons" },
        );
        return;
      }
    }

    if (reply.replyType === "list") {
      const replyData = asObject(reply.data);
      const sections = Array.isArray(replyData.sections)
        ? replyData.sections
        : [];
      if (sections.length) {
        await sendAndLogInteractive(
          vendorId,
          contact,
          phoneNumberId,
          accessToken,
          {
            type: "list",
            body: {
              text: reply.replyMessage ?? "Please choose from the list.",
            },
            action: {
              button: String(replyData.buttonText ?? "View options"),
              sections,
            },
          },
          { id: reply.id, type: "send_list" },
        );
        return;
      }
    }
  }

  if (!contact.disableAiBot) {
    try {
      const aiReply = await processAiReply(vendorId, contact.id, messageText);
      if (!aiReply) return;
      await sendAndLogText(
        vendorId,
        contact,
        phoneNumberId,
        accessToken,
        aiReply,
      );
    } catch {
      // Skip if AI processing fails.
    }
  }
}
