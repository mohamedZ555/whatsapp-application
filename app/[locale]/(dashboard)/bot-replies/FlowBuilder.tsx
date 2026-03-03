"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

type NodeType =
  | "start"
  | "send_text"
  | "send_buttons"
  | "send_list"
  | "condition_text"
  | "assign_category"
  | "end";

type ButtonOption = {
  id: string;
  title: string;
  nextId?: string;
  categoryId?: string;
};

type ListRow = {
  id: string;
  title: string;
  description?: string;
  nextId?: string;
  categoryId?: string;
};

type FlowNodeData = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  text?: string;
  nextId?: string;
  operator?: "equals" | "contains" | "starts_with" | "ends_with";
  value?: string;
  trueNextId?: string;
  falseNextId?: string;
  buttons?: ButtonOption[];
  listButtonText?: string;
  sections?: Array<{ title?: string; rows: ListRow[] }>;
  categoryId?: string; // for assign_category node
};

type JobCategory = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  flow: {
    id: string;
    flowName: string;
    data: any;
    status: number;
  };
  categories: JobCategory[];
  onClose: () => void;
  onSaved: () => void;
};

// ─── Constants ─────────────────────────────────────────────────────────────

const NODE_WIDTH = 220;
const NODE_MIN_HEIGHT = 80;
const COLORS: Record<
  NodeType,
  { bg: string; border: string; badge: string; text: string }
> = {
  start: {
    bg: "#1a1a2e",
    border: "#7c3aed",
    badge: "#7c3aed",
    text: "#a78bfa",
  },
  send_text: {
    bg: "#1a1a2e",
    border: "#059669",
    badge: "#059669",
    text: "#34d399",
  },
  send_buttons: {
    bg: "#1a1a2e",
    border: "#0284c7",
    badge: "#0284c7",
    text: "#38bdf8",
  },
  send_list: {
    bg: "#1a1a2e",
    border: "#d97706",
    badge: "#d97706",
    text: "#fbbf24",
  },
  condition_text: {
    bg: "#1a1a2e",
    border: "#db2777",
    badge: "#db2777",
    text: "#f472b6",
  },
  assign_category: {
    bg: "#1a1a2e",
    border: "#16a34a",
    badge: "#16a34a",
    text: "#4ade80",
  },
  end: { bg: "#1a1a2e", border: "#6b7280", badge: "#6b7280", text: "#9ca3af" },
};

const NODE_LABELS: Record<NodeType, string> = {
  start: "Start",
  send_text: "Send Text",
  send_buttons: "Send Buttons",
  send_list: "Send List",
  condition_text: "Condition",
  assign_category: "Assign Category",
  end: "End",
};

const NODE_ICONS: Record<NodeType, string> = {
  start: "▶",
  send_text: "💬",
  send_buttons: "🔘",
  send_list: "📋",
  condition_text: "⚡",
  assign_category: "👥",
  end: "⏹",
};

function generateId() {
  return "node_" + Math.random().toString(36).slice(2, 9);
}

// ─── Parse existing flow data → canvas nodes ───────────────────────────────

function parseFlowData(data: any): FlowNodeData[] {
  if (!data || !Array.isArray(data.nodes)) return [];
  return (data.nodes as any[]).map((n: any, idx: number) => ({
    id: n.id ?? generateId(),
    type: (n.type as NodeType) ?? "send_text",
    x: n._x ?? 100 + idx * 260,
    y: n._y ?? 100,
    text: n.text,
    nextId: n.nextId,
    operator: n.operator,
    value: n.value,
    trueNextId: n.trueNextId,
    falseNextId: n.falseNextId,
    buttons: n.buttons,
    listButtonText: n.listButtonText,
    sections: n.sections,
    categoryId: n.categoryId,
  }));
}

// ─── Serialize canvas nodes → flow data ────────────────────────────────────

function serializeNodes(
  nodes: FlowNodeData[],
  startNodeId: string,
  trigger: any,
) {
  const serialized = nodes.map((n) => {
    const base: any = { id: n.id, type: n.type, _x: n.x, _y: n.y };
    if (n.text !== undefined) base.text = n.text;
    if (n.nextId) base.nextId = n.nextId;
    if (n.operator) base.operator = n.operator;
    if (n.value !== undefined) base.value = n.value;
    if (n.trueNextId) base.trueNextId = n.trueNextId;
    if (n.falseNextId) base.falseNextId = n.falseNextId;
    if (n.buttons) base.buttons = n.buttons;
    if (n.listButtonText) base.listButtonText = n.listButtonText;
    if (n.sections) base.sections = n.sections;
    if (n.categoryId) base.categoryId = n.categoryId;
    return base;
  });
  return { trigger, startNodeId, nodes: serialized };
}

// ─── Node height helper ─────────────────────────────────────────────────────

function getNodeHeight(node: FlowNodeData): number {
  switch (node.type) {
    case "send_buttons":
      return 80 + (node.buttons?.length ?? 0) * 38 + 48;
    case "send_list":
      return 80 + (node.sections?.[0]?.rows?.length ?? 0) * 38 + 48;
    case "condition_text":
      return 130;
    case "assign_category":
      return 100;
    default:
      return NODE_MIN_HEIGHT;
  }
}

// ─── Port positions ─────────────────────────────────────────────────────────

type Port = { x: number; y: number; nodeId: string; portId: string };

function getOutputPorts(node: FlowNodeData): Port[] {
  const cx = node.x + NODE_WIDTH;
  const h = getNodeHeight(node);

  if (node.type === "send_buttons" && node.buttons?.length) {
    const top = node.y + 80;
    return node.buttons.map((b, i) => ({
      x: cx,
      y: top + i * 38 + 19,
      nodeId: node.id,
      portId: `btn_${b.id}`,
    }));
  }
  if (node.type === "send_list" && node.sections?.[0]?.rows.length) {
    const rows = node.sections[0].rows;
    const top = node.y + 80;
    return rows.map((r, i) => ({
      x: cx,
      y: top + i * 38 + 19,
      nodeId: node.id,
      portId: `row_${r.id}`,
    }));
  }
  if (node.type === "condition_text") {
    return [
      { x: cx, y: node.y + h * 0.38, nodeId: node.id, portId: "true" },
      { x: cx, y: node.y + h * 0.65, nodeId: node.id, portId: "false" },
    ];
  }
  if (node.type === "end") return [];
  return [{ x: cx, y: node.y + h / 2, nodeId: node.id, portId: "default" }];
}

function getInputPort(node: FlowNodeData): Port {
  const h = getNodeHeight(node);
  return { x: node.x, y: node.y + h / 2, nodeId: node.id, portId: "input" };
}

// ─── Edge resolution ────────────────────────────────────────────────────────

type Edge = { fromPort: Port; toPort: Port; color: string; label?: string };

function buildEdges(nodes: FlowNodeData[]): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: Edge[] = [];

  for (const node of nodes) {
    const ports = getOutputPorts(node);
    const col = COLORS[node.type]?.badge ?? "#22c55e";

    const connect = (port: Port, targetId?: string, label?: string) => {
      if (!targetId) return;
      const target = nodeMap.get(targetId);
      if (!target) return;
      edges.push({
        fromPort: port,
        toPort: getInputPort(target),
        color: col,
        label,
      });
    };

    if (node.type === "send_buttons" && node.buttons?.length) {
      node.buttons.forEach((b, i) => connect(ports[i], b.nextId, b.title));
    } else if (node.type === "send_list" && node.sections?.[0]?.rows.length) {
      node.sections[0].rows.forEach((r, i) =>
        connect(ports[i], r.nextId, r.title),
      );
    } else if (node.type === "condition_text") {
      connect(ports[0], node.trueNextId, "True");
      connect(ports[1], node.falseNextId, "False");
    } else if (ports.length === 1) {
      connect(ports[0], node.nextId);
    }
  }
  return edges;
}

// ─── Bezier path helper ─────────────────────────────────────────────────────

function cubicBezier(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const dx = Math.abs(to.x - from.x);
  const ctrl = Math.max(60, dx * 0.5);
  return `M ${from.x} ${from.y} C ${from.x + ctrl} ${from.y}, ${to.x - ctrl} ${to.y}, ${to.x} ${to.y}`;
}

// ─── FlowBuilder Component ─────────────────────────────────────────────────

export default function FlowBuilder({
  flow,
  categories,
  onClose,
  onSaved,
}: Props) {
  // Parse trigger from existing data
  const initialData = flow.data ?? {};
  const initialTrigger = initialData.trigger ?? { type: "keyword", value: "" };

  const [nodes, setNodes] = useState<FlowNodeData[]>(() => {
    const parsed = parseFlowData(initialData);
    if (parsed.length === 0) {
      return [
        { id: "start_1", type: "start", x: 60, y: 200, text: "Welcome" },
        { id: "node_end", type: "end", x: 400, y: 200 },
      ];
    }
    return parsed;
  });

  const [flowName, setFlowName] = useState(flow.flowName);
  const [trigger, setTrigger] = useState<{ type: string; value: string }>(
    initialTrigger,
  );
  const [startNodeId, setStartNodeId] = useState<string>(
    initialData.startNodeId ?? nodes[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [canvas, setCanvas] = useState({ x: 0, y: 0, scale: 1 });
  const [panning, setPanning] = useState<{
    startX: number;
    startY: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{
    port: Port;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const edges = buildEdges(nodes);

  // ── Drag node ─────────────────────────────────────────────────────────────

  const onNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if ((e.target as HTMLElement).closest("[data-port]")) return;
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - canvas.x) / canvas.scale;
      const mouseY = (e.clientY - rect.top - canvas.y) / canvas.scale;
      setDragging({
        id: nodeId,
        offsetX: mouseX - node.x,
        offsetY: mouseY - node.y,
      });
      setSelectedNode(nodeId);
    },
    [nodes, canvas],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragging) {
        const mouseX = (e.clientX - rect.left - canvas.x) / canvas.scale;
        const mouseY = (e.clientY - rect.top - canvas.y) / canvas.scale;
        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragging.id
              ? {
                  ...n,
                  x: mouseX - dragging.offsetX,
                  y: mouseY - dragging.offsetY,
                }
              : n,
          ),
        );
      }

      if (panning) {
        setCanvas((prev) => ({
          ...prev,
          x: panning.canvasX + (e.clientX - panning.startX),
          y: panning.canvasY + (e.clientY - panning.startY),
        }));
      }

      if (connectingFrom) {
        const mouseX = (e.clientX - rect.left - canvas.x) / canvas.scale;
        const mouseY = (e.clientY - rect.top - canvas.y) / canvas.scale;
        setConnectingFrom((prev) =>
          prev ? { ...prev, mouseX, mouseY } : null,
        );
      }
    },
    [dragging, panning, connectingFrom, canvas],
  );

  const onMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(null);
    setConnectingFrom(null);
  }, []);

  // ── Canvas pan ────────────────────────────────────────────────────────────

  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && !dragging)) {
        setSelectedNode(null);
        setPanning({
          startX: e.clientX,
          startY: e.clientY,
          canvasX: canvas.x,
          canvasY: canvas.y,
        });
      }
    },
    [canvas, dragging],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvas((prev) => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * factor, 0.3), 2),
    }));
  }, []);

  // ── Port connection ────────────────────────────────────────────────────────

  const onPortMouseDown = useCallback(
    (e: React.MouseEvent, port: Port) => {
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - canvas.x) / canvas.scale;
      const mouseY = (e.clientY - rect.top - canvas.y) / canvas.scale;
      setConnectingFrom({ port, mouseX, mouseY });
    },
    [canvas],
  );

  const onInputPortMouseUp = useCallback(
    (e: React.MouseEvent, targetNodeId: string) => {
      if (!connectingFrom) return;
      e.stopPropagation();
      const { port } = connectingFrom;
      if (port.nodeId === targetNodeId) {
        setConnectingFrom(null);
        return;
      }

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== port.nodeId) return n;
          if (port.portId === "default") return { ...n, nextId: targetNodeId };
          if (port.portId === "true") return { ...n, trueNextId: targetNodeId };
          if (port.portId === "false")
            return { ...n, falseNextId: targetNodeId };
          if (port.portId.startsWith("btn_")) {
            const btnId = port.portId.slice(4);
            return {
              ...n,
              buttons: (n.buttons ?? []).map((b) =>
                b.id === btnId ? { ...b, nextId: targetNodeId } : b,
              ),
            };
          }
          if (port.portId.startsWith("row_")) {
            const rowId = port.portId.slice(4);
            return {
              ...n,
              sections: (n.sections ?? []).map((sec) => ({
                ...sec,
                rows: sec.rows.map((r) =>
                  r.id === rowId ? { ...r, nextId: targetNodeId } : r,
                ),
              })),
            };
          }
          return n;
        }),
      );
      setConnectingFrom(null);
    },
    [connectingFrom],
  );

  // ── Add node ──────────────────────────────────────────────────────────────

  const addNode = useCallback((type: NodeType) => {
    const id = generateId();
    const newNode: FlowNodeData = {
      id,
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 300,
      text:
        type === "send_text"
          ? "Enter your message here"
          : type === "send_buttons"
            ? "Choose an option:"
            : "",
      buttons:
        type === "send_buttons"
          ? [
              { id: `btn_1_${id}`, title: "Option 1" },
              { id: `btn_2_${id}`, title: "Option 2" },
            ]
          : undefined,
      sections:
        type === "send_list"
          ? [
              {
                title: "Options",
                rows: [
                  { id: `row_1_${id}`, title: "Row 1" },
                  { id: `row_2_${id}`, title: "Row 2" },
                ],
              },
            ]
          : undefined,
      listButtonText: type === "send_list" ? "View Options" : undefined,
      operator: type === "condition_text" ? "contains" : undefined,
      value: type === "condition_text" ? "" : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(id);
  }, []);

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => {
        // Remove all connections pointing to this node
        return prev
          .filter((n) => n.id !== id)
          .map((n) => ({
            ...n,
            nextId: n.nextId === id ? undefined : n.nextId,
            trueNextId: n.trueNextId === id ? undefined : n.trueNextId,
            falseNextId: n.falseNextId === id ? undefined : n.falseNextId,
            buttons: n.buttons?.map((b) =>
              b.nextId === id ? { ...b, nextId: undefined } : b,
            ),
            sections: n.sections?.map((s) => ({
              ...s,
              rows: s.rows.map((r) =>
                r.nextId === id ? { ...r, nextId: undefined } : r,
              ),
            })),
          }));
      });
      if (selectedNode === id) setSelectedNode(null);
    },
    [selectedNode],
  );

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    const sId = startNodeId || nodes[0]?.id || "";
    const data = serializeNodes(nodes, sId, trigger);
    await fetch(`/api/bot-flows/${flow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowName, data }),
    });
    setSaving(false);
    onSaved();
  }, [nodes, flowName, trigger, startNodeId, flow.id, onSaved]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        deleteNode(selectedNode);
      }
      if (e.key === "Escape") setSelectedNode(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNode, deleteNode]);

  // ── Selected node ─────────────────────────────────────────────────────────

  const selectedNodeData = nodes.find((n) => n.id === selectedNode) ?? null;

  const updateNode = (patch: Partial<FlowNodeData>) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode ? { ...n, ...patch } : n)),
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#0f0f1a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          background: "#141428",
          borderBottom: "1px solid #27274a",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "1px solid #374151",
            color: "#9ca3af",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ← Back
        </button>
        <input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          style={{
            background: "#1f1f3a",
            border: "1px solid #374151",
            color: "#f9fafb",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 14,
            fontWeight: 600,
            width: 220,
          }}
          placeholder="Flow name"
        />

        {/* Trigger config */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 8,
          }}
        >
          <span style={{ color: "#6b7280", fontSize: 12 }}>Trigger:</span>
          <select
            value={trigger.type}
            onChange={(e) =>
              setTrigger((t) => ({ ...t, type: e.target.value }))
            }
            style={{
              background: "#1f1f3a",
              border: "1px solid #374151",
              color: "#e5e7eb",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 12,
            }}
          >
            <option value="welcome">Welcome</option>
            <option value="keyword">Keyword</option>
            <option value="any">Any Message</option>
          </select>
          {trigger.type === "keyword" && (
            <input
              value={trigger.value}
              onChange={(e) =>
                setTrigger((t) => ({ ...t, value: e.target.value }))
              }
              placeholder="keyword..."
              style={{
                background: "#1f1f3a",
                border: "1px solid #374151",
                color: "#e5e7eb",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 12,
                width: 120,
              }}
            />
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() =>
              setCanvas((c) => ({ ...c, scale: Math.max(0.3, c.scale - 0.1) }))
            }
            style={btnStyle}
          >
            −
          </button>
          <span
            style={{
              color: "#6b7280",
              fontSize: 12,
              minWidth: 42,
              textAlign: "center",
            }}
          >
            {Math.round(canvas.scale * 100)}%
          </span>
          <button
            onClick={() =>
              setCanvas((c) => ({ ...c, scale: Math.min(2, c.scale + 0.1) }))
            }
            style={btnStyle}
          >
            +
          </button>
          <button
            onClick={() => setCanvas({ x: 0, y: 0, scale: 1 })}
            style={{ ...btnStyle, marginLeft: 4 }}
          >
            Reset
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? "#374151" : "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "7px 20px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {saving ? "Saving…" : "💾 Save Flow"}
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left Palette ── */}
        <div
          style={{
            width: 180,
            background: "#141428",
            borderRight: "1px solid #27274a",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <p
            style={{
              color: "#6b7280",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Add Node
          </p>
          {(Object.keys(NODE_LABELS) as NodeType[])
            .filter((t) => t !== "start")
            .map((type) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                style={{
                  background: "#1f1f3a",
                  border: `1px solid ${COLORS[type].border}`,
                  color: COLORS[type].text,
                  borderRadius: 8,
                  padding: "8px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>{NODE_ICONS[type]}</span>
                <span>{NODE_LABELS[type]}</span>
              </button>
            ))}

          <div
            style={{
              marginTop: 12,
              borderTop: "1px solid #27274a",
              paddingTop: 10,
            }}
          >
            <p
              style={{
                color: "#6b7280",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Tips
            </p>
            <p style={{ color: "#4b5563", fontSize: 10, lineHeight: 1.6 }}>
              • Drag nodes to reposition
              <br />
              • Drag from ● port to connect
              <br />
              • Click node to edit
              <br />• Delete key removes selected node
            </p>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            cursor: panning ? "grabbing" : "grab",
          }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseDown={onCanvasMouseDown}
          onWheel={onWheel}
        >
          {/* Grid dots */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <defs>
              <pattern
                id="grid"
                width={20 * canvas.scale}
                height={20 * canvas.scale}
                patternUnits="userSpaceOnUse"
                x={canvas.x % (20 * canvas.scale)}
                y={canvas.y % (20 * canvas.scale)}
              >
                <circle cx={1} cy={1} r={0.8} fill="#1e1e3a" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Edges + nodes SVG layer */}
          <svg
            ref={svgRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            <g
              transform={`translate(${canvas.x},${canvas.y}) scale(${canvas.scale})`}
            >
              {/* Edges */}
              {edges.map((edge, i) => {
                const path = cubicBezier(edge.fromPort, edge.toPort);
                const midX = (edge.fromPort.x + edge.toPort.x) / 2;
                const midY = (edge.fromPort.y + edge.toPort.y) / 2;
                return (
                  <g key={i}>
                    <path
                      d={path}
                      stroke={edge.color}
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="0"
                      opacity={0.85}
                    />
                    {edge.label && (
                      <text
                        x={midX}
                        y={midY - 6}
                        fill={edge.color}
                        fontSize={10}
                        textAnchor="middle"
                        style={{ pointerEvents: "none" }}
                      >
                        {edge.label}
                      </text>
                    )}
                    {/* Arrow at destination */}
                    <polygon
                      points={`${edge.toPort.x},${edge.toPort.y} ${edge.toPort.x - 8},${edge.toPort.y - 4} ${edge.toPort.x - 8},${edge.toPort.y + 4}`}
                      fill={edge.color}
                      opacity={0.85}
                    />
                  </g>
                );
              })}

              {/* Connecting preview line */}
              {connectingFrom && (
                <path
                  d={cubicBezier(connectingFrom.port, {
                    x: connectingFrom.mouseX,
                    y: connectingFrom.mouseY,
                  })}
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6 3"
                  opacity={0.7}
                />
              )}
            </g>
          </svg>

          {/* Nodes HTML layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "0 0",
              transform: `translate(${canvas.x}px,${canvas.y}px) scale(${canvas.scale})`,
            }}
          >
            {nodes.map((node) => (
              <FlowNode
                key={node.id}
                node={node}
                isSelected={selectedNode === node.id}
                categories={categories}
                onMouseDown={onNodeMouseDown}
                onPortMouseDown={onPortMouseDown}
                onInputPortMouseUp={onInputPortMouseUp}
                onDelete={deleteNode}
              />
            ))}
          </div>
        </div>

        {/* ── Right Panel: Node Editor ── */}
        {selectedNodeData && (
          <NodeEditor
            node={selectedNodeData}
            categories={categories}
            nodes={nodes}
            onChange={updateNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Button style constant ─────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  background: "#1f1f3a",
  border: "1px solid #374151",
  color: "#9ca3af",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 12,
};

// ─── FlowNode Component ────────────────────────────────────────────────────

interface FlowNodeProps {
  node: FlowNodeData;
  isSelected: boolean;
  categories: JobCategory[];
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, port: Port) => void;
  onInputPortMouseUp: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
}

function FlowNode({
  node,
  isSelected,
  categories,
  onMouseDown,
  onPortMouseDown,
  onInputPortMouseUp,
  onDelete,
}: FlowNodeProps) {
  const col = COLORS[node.type];
  const h = getNodeHeight(node);
  const ports = getOutputPorts(node);
  const inputPort = getInputPort(node);

  const category = node.categoryId
    ? categories.find((c) => c.id === node.categoryId)
    : null;

  return (
    <div
      onMouseDown={(e) => onMouseDown(e, node.id)}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        minHeight: h,
        background: col.bg,
        border: `2px solid ${isSelected ? "#f59e0b" : col.border}`,
        borderRadius: 12,
        boxShadow: isSelected
          ? `0 0 0 3px rgba(245,158,11,0.25), 0 8px 32px rgba(0,0,0,0.6)`
          : "0 4px 20px rgba(0,0,0,0.5)",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: col.badge,
          borderRadius: "10px 10px 0 0",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>{NODE_ICONS[node.type]}</span>
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
            {NODE_LABELS[node.type]}
          </span>
        </div>
        {node.type !== "start" && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "none",
              color: "#fff",
              borderRadius: 4,
              width: 18,
              height: 18,
              cursor: "pointer",
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "8px 10px" }}>
        {node.text && (
          <p
            style={{
              color: "#e5e7eb",
              fontSize: 11,
              lineHeight: 1.4,
              overflow: "hidden",
              maxHeight: 48,
              WebkitLineClamp: 3,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
            }}
          >
            {node.text}
          </p>
        )}
        {node.type === "condition_text" && (
          <p style={{ color: "#9ca3af", fontSize: 10 }}>
            {node.operator} "{node.value}"
          </p>
        )}
        {node.type === "assign_category" && category && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: category.color,
              }}
            />
            <span style={{ color: "#e5e7eb", fontSize: 11 }}>
              {category.name}
            </span>
          </div>
        )}

        {/* Button list preview */}
        {node.type === "send_buttons" &&
          node.buttons?.map((b) => (
            <div
              key={b.id}
              style={{
                marginTop: 4,
                background: "#1e3a5f",
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 11,
                color: "#93c5fd",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{b.title || "(empty)"}</span>
              {b.categoryId && (
                <span style={{ fontSize: 9, color: "#60a5fa" }}>📂</span>
              )}
            </div>
          ))}

        {/* List rows preview */}
        {node.type === "send_list" &&
          node.sections?.[0]?.rows.map((r) => (
            <div
              key={r.id}
              style={{
                marginTop: 4,
                background: "#2d1f0b",
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 11,
                color: "#fbbf24",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{r.title || "(empty)"}</span>
              {r.categoryId && <span style={{ fontSize: 9 }}>📂</span>}
            </div>
          ))}
      </div>

      {/* Input port (left) */}
      {node.type !== "start" && (
        <div
          data-port="input"
          onMouseUp={(e) => onInputPortMouseUp(e, node.id)}
          style={{
            position: "absolute",
            left: -8,
            top: h / 2 - 8,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#374151",
            border: `2px solid ${col.border}`,
            cursor: "crosshair",
            zIndex: 10,
          }}
        />
      )}

      {/* Output ports (right) */}
      {ports.map((port) => {
        const localY = port.y - node.y - 8;
        return (
          <div
            key={port.portId}
            data-port={port.portId}
            onMouseDown={(e) => {
              e.stopPropagation();
              onPortMouseDown(e, port);
            }}
            style={{
              position: "absolute",
              right: -8,
              top: localY,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: col.badge,
              border: "2px solid #1a1a2e",
              cursor: "crosshair",
              zIndex: 10,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── NodeEditor Component ──────────────────────────────────────────────────

interface NodeEditorProps {
  node: FlowNodeData;
  categories: JobCategory[];
  nodes: FlowNodeData[];
  onChange: (patch: Partial<FlowNodeData>) => void;
  onClose: () => void;
}

function NodeEditor({
  node,
  categories,
  nodes,
  onChange,
  onClose,
}: NodeEditorProps) {
  const col = COLORS[node.type];

  const addButton = () => {
    const id = `btn_${Date.now()}`;
    onChange({
      buttons: [...(node.buttons ?? []), { id, title: "New Option" }],
    });
  };
  const removeButton = (id: string) =>
    onChange({ buttons: node.buttons?.filter((b) => b.id !== id) });
  const updateButton = (id: string, patch: Partial<ButtonOption>) =>
    onChange({
      buttons: node.buttons?.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });

  const addRow = () => {
    const id = `row_${Date.now()}`;
    const sections = node.sections ?? [{ title: "Options", rows: [] }];
    onChange({
      sections: sections.map((s, i) =>
        i === 0 ? { ...s, rows: [...s.rows, { id, title: "New Row" }] } : s,
      ),
    });
  };
  const removeRow = (rowId: string) =>
    onChange({
      sections: node.sections?.map((s) => ({
        ...s,
        rows: s.rows.filter((r) => r.id !== rowId),
      })),
    });
  const updateRow = (rowId: string, patch: Partial<ListRow>) =>
    onChange({
      sections: node.sections?.map((s) => ({
        ...s,
        rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      })),
    });

  const otherNodes = nodes.filter((n) => n.id !== node.id);

  return (
    <div
      style={{
        width: 300,
        background: "#141428",
        borderLeft: "1px solid #27274a",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          background: col.badge,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{NODE_ICONS[node.type]}</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
            Edit: {NODE_LABELS[node.type]}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "none",
            color: "#fff",
            borderRadius: 4,
            width: 22,
            height: 22,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Node ID */}
        <div>
          <label style={labelStyle}>Node ID</label>
          <input
            readOnly
            value={node.id}
            style={{ ...inputStyle, opacity: 0.5 }}
          />
        </div>

        {/* Text field */}
        {(node.type === "send_text" ||
          node.type === "send_buttons" ||
          node.type === "send_list" ||
          node.type === "start") && (
          <div>
            <label style={labelStyle}>
              {node.type === "start" ? "Welcome Label" : "Message Text"}
            </label>
            <textarea
              value={node.text ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Enter message..."
            />
          </div>
        )}

        {/* Default next */}
        {(node.type === "send_text" ||
          node.type === "assign_category" ||
          node.type === "start") && (
          <div>
            <label style={labelStyle}>Next Node</label>
            <select
              value={node.nextId ?? ""}
              onChange={(e) =>
                onChange({ nextId: e.target.value || undefined })
              }
              style={inputStyle}
            >
              <option value="">— None —</option>
              {otherNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {NODE_ICONS[n.type]} {NODE_LABELS[n.type]} ({n.id.slice(-6)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Condition config */}
        {node.type === "condition_text" && (
          <>
            <div>
              <label style={labelStyle}>Operator</label>
              <select
                value={node.operator ?? "contains"}
                onChange={(e) => onChange({ operator: e.target.value as any })}
                style={inputStyle}
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Value</label>
              <input
                value={node.value ?? ""}
                onChange={(e) => onChange({ value: e.target.value })}
                style={inputStyle}
                placeholder="match value..."
              />
            </div>
            <div>
              <label style={labelStyle}>If True → Next Node</label>
              <select
                value={node.trueNextId ?? ""}
                onChange={(e) =>
                  onChange({ trueNextId: e.target.value || undefined })
                }
                style={inputStyle}
              >
                <option value="">— None —</option>
                {otherNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {NODE_LABELS[n.type]} ({n.id.slice(-6)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>If False → Next Node</label>
              <select
                value={node.falseNextId ?? ""}
                onChange={(e) =>
                  onChange({ falseNextId: e.target.value || undefined })
                }
                style={inputStyle}
              >
                <option value="">— None —</option>
                {otherNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {NODE_LABELS[n.type]} ({n.id.slice(-6)})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Assign category config */}
        {node.type === "assign_category" && (
          <div>
            <label style={labelStyle}>Job Category</label>
            <select
              value={node.categoryId ?? ""}
              onChange={(e) =>
                onChange({ categoryId: e.target.value || undefined })
              }
              style={inputStyle}
            >
              <option value="">— Select Category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>
              Assigns the contact to an employee in this category
            </p>
          </div>
        )}

        {/* Send Buttons config */}
        {node.type === "send_buttons" && (
          <div>
            <label style={labelStyle}>Buttons (max 3)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(node.buttons ?? []).map((btn) => (
                <div
                  key={btn.id}
                  style={{
                    background: "#1f1f3a",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <input
                      value={btn.title}
                      onChange={(e) =>
                        updateButton(btn.id, { title: e.target.value })
                      }
                      style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                      placeholder="Button title"
                      maxLength={20}
                    />
                    <button
                      onClick={() => removeButton(btn.id)}
                      style={smallBtnStyle}
                    >
                      ×
                    </button>
                  </div>
                  <label style={{ ...labelStyle, fontSize: 10 }}>
                    → Next Node
                  </label>
                  <select
                    value={btn.nextId ?? ""}
                    onChange={(e) =>
                      updateButton(btn.id, {
                        nextId: e.target.value || undefined,
                      })
                    }
                    style={{ ...inputStyle, marginBottom: 6 }}
                  >
                    <option value="">— None —</option>
                    {nodes
                      .filter((n) => n.id !== node.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {NODE_LABELS[n.type]} ({n.id.slice(-6)})
                        </option>
                      ))}
                  </select>
                  <label style={{ ...labelStyle, fontSize: 10 }}>
                    📂 Assign Category (optional)
                  </label>
                  <select
                    value={btn.categoryId ?? ""}
                    onChange={(e) =>
                      updateButton(btn.id, {
                        categoryId: e.target.value || undefined,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">— No Category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {(node.buttons?.length ?? 0) < 3 && (
              <button
                onClick={addButton}
                style={{ ...btnOutlineStyle, marginTop: 8, width: "100%" }}
              >
                + Add Button
              </button>
            )}
          </div>
        )}

        {/* Send List config */}
        {node.type === "send_list" && (
          <div>
            <label style={labelStyle}>Button Text</label>
            <input
              value={node.listButtonText ?? ""}
              onChange={(e) => onChange({ listButtonText: e.target.value })}
              style={inputStyle}
              placeholder="View Options"
            />
            <label style={{ ...labelStyle, marginTop: 10 }}>List Rows</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(node.sections?.[0]?.rows ?? []).map((row) => (
                <div
                  key={row.id}
                  style={{
                    background: "#1f1f3a",
                    border: "1px solid #374151",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <input
                      value={row.title}
                      onChange={(e) =>
                        updateRow(row.id, { title: e.target.value })
                      }
                      style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                      placeholder="Row title"
                    />
                    <button
                      onClick={() => removeRow(row.id)}
                      style={smallBtnStyle}
                    >
                      ×
                    </button>
                  </div>
                  <label style={{ ...labelStyle, fontSize: 10 }}>
                    → Next Node
                  </label>
                  <select
                    value={row.nextId ?? ""}
                    onChange={(e) =>
                      updateRow(row.id, { nextId: e.target.value || undefined })
                    }
                    style={{ ...inputStyle, marginBottom: 6 }}
                  >
                    <option value="">— None —</option>
                    {nodes
                      .filter((n) => n.id !== node.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {NODE_LABELS[n.type]} ({n.id.slice(-6)})
                        </option>
                      ))}
                  </select>
                  <label style={{ ...labelStyle, fontSize: 10 }}>
                    📂 Assign Category (optional)
                  </label>
                  <select
                    value={row.categoryId ?? ""}
                    onChange={(e) =>
                      updateRow(row.id, {
                        categoryId: e.target.value || undefined,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">— No Category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={addRow}
              style={{ ...btnOutlineStyle, marginTop: 8, width: "100%" }}
            >
              + Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 11,
  fontWeight: 600,
  display: "block",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  background: "#0f0f1a",
  border: "1px solid #374151",
  color: "#f3f4f6",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  width: "100%",
  boxSizing: "border-box",
};

const smallBtnStyle: React.CSSProperties = {
  background: "#991b1b",
  border: "none",
  color: "#fff",
  borderRadius: 4,
  width: 22,
  height: 22,
  cursor: "pointer",
  fontSize: 14,
  flexShrink: 0,
};

const btnOutlineStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px dashed #374151",
  color: "#6b7280",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};
