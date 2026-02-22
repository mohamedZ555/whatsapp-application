'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type FlowStep = {
  type: 'send_text' | 'send_buttons' | 'send_list' | 'condition_text' | 'end';
  text?: string;
  conditionValue?: string;
  operator?: 'equals' | 'contains' | 'starts_with' | 'ends_with';
  optionsText?: string;
};

export default function BotRepliesPage() {
  const t = useTranslations('bot');
  const tc = useTranslations('common');
  const defaultWelcomeMessage = t('defaultWelcomeMessage');
  const [tab, setTab] = useState<'replies' | 'flows'>('replies');

  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyForm, setReplyForm] = useState({
    replyName: '',
    triggerType: 'is',
    triggerSubject: '',
    replyMessage: '',
    replyType: 'text',
    optionsText: '',
  });
  const [savingReply, setSavingReply] = useState(false);

  const [flows, setFlows] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [savingFlow, setSavingFlow] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowTriggerType, setFlowTriggerType] = useState<'any' | 'keyword' | 'welcome'>('keyword');
  const [flowTriggerValue, setFlowTriggerValue] = useState('');
  const [steps, setSteps] = useState<FlowStep[]>([
    { type: 'send_text', text: defaultWelcomeMessage },
    { type: 'end' },
  ]);

  const triggerTypes = ['welcome', 'is', 'starts_with', 'ends_with', 'contains_word', 'contains', 'stop_promotional', 'start_promotional', 'start_ai_bot', 'stop_ai_bot'];

  const canSaveFlow = useMemo(() => flowName.trim().length > 0 && steps.length > 0, [flowName, steps]);

  async function fetchReplies() {
    setLoadingReplies(true);
    const res = await fetch('/api/bot-replies');
    const data = await res.json();
    setReplies(Array.isArray(data) ? data : []);
    setLoadingReplies(false);
  }

  async function fetchFlows() {
    setLoadingFlows(true);
    const res = await fetch('/api/bot-flows');
    const data = await res.json();
    setFlows(Array.isArray(data) ? data : []);
    setLoadingFlows(false);
  }

  useEffect(() => {
    fetchReplies();
    fetchFlows();
  }, []);

  async function handleCreateReply(e: React.FormEvent) {
    e.preventDefault();
    setSavingReply(true);

    let data: any = {};
    if (replyForm.replyType === 'buttons') {
      const buttons = replyForm.optionsText
        .split(',')
        .map((s, idx) => ({ id: `btn_${idx + 1}`, title: s.trim() }))
        .filter((o) => o.title.length > 0);
      data = { buttons };
    } else if (replyForm.replyType === 'list') {
      const rows = replyForm.optionsText
        .split(',')
        .map((s, idx) => ({ id: `row_${idx + 1}`, title: s.trim() }))
        .filter((o) => o.title.length > 0);
      data = { buttonText: t('viewOptions'), sections: [{ title: t('optionsLabel'), rows }] };
    }

    await fetch('/api/bot-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replyName: replyForm.replyName,
        triggerType: replyForm.triggerType,
        triggerSubject: replyForm.triggerSubject,
        replyMessage: replyForm.replyMessage,
        replyType: replyForm.replyType,
        data,
      }),
    });
    setSavingReply(false);
    setShowReplyForm(false);
    setReplyForm({
      replyName: '',
      triggerType: 'is',
      triggerSubject: '',
      replyMessage: '',
      replyType: 'text',
      optionsText: '',
    });
    fetchReplies();
  }

  function moveStep(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const next = [...steps];
    const current = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = current;
    setSteps(next);
  }

  async function createFlow(e: React.FormEvent) {
    e.preventDefault();
    if (!canSaveFlow) return;
    setSavingFlow(true);

    const nodes = steps.map((step, idx) => {
      const id = `step_${idx + 1}`;
      const nextId = idx < steps.length - 1 ? `step_${idx + 2}` : undefined;

      if (step.type === 'send_buttons') {
        const buttons = (step.optionsText ?? '')
          .split(',')
          .map((value, optionIdx) => ({
            id: `${id}_btn_${optionIdx + 1}`,
            title: value.trim(),
            nextId,
          }))
          .filter((opt) => opt.title.length > 0);
        return { id, type: step.type, text: step.text, buttons, nextId };
      }

      if (step.type === 'send_list') {
        const rows = (step.optionsText ?? '')
          .split(',')
          .map((value, optionIdx) => ({
            id: `${id}_row_${optionIdx + 1}`,
            title: value.trim(),
            nextId,
          }))
          .filter((opt) => opt.title.length > 0);
        return {
          id,
          type: step.type,
          text: step.text,
          listButtonText: t('viewOptions'),
          sections: [{ title: t('optionsLabel'), rows }],
          nextId,
        };
      }

      if (step.type === 'condition_text') {
        return {
          id,
          type: step.type,
          operator: step.operator ?? 'contains',
          value: step.conditionValue ?? '',
          trueNextId: nextId,
          falseNextId: nextId,
        };
      }

      if (step.type === 'end') {
        return { id, type: 'end' };
      }

      return { id, type: step.type, text: step.text, nextId };
    });

    await fetch('/api/bot-flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowName,
        data: {
          trigger: { type: flowTriggerType, value: flowTriggerValue },
          startNodeId: 'step_1',
          nodes,
        },
      }),
    });

    setSavingFlow(false);
    setShowFlowForm(false);
    setFlowName('');
    setFlowTriggerType('keyword');
    setFlowTriggerValue('');
    setSteps([{ type: 'send_text', text: defaultWelcomeMessage }, { type: 'end' }]);
    fetchFlows();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm">
          <button onClick={() => setTab('replies')} className={`rounded-md px-3 py-1.5 ${tab === 'replies' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}>
            {t('quickReplies')}
          </button>
          <button onClick={() => setTab('flows')} className={`rounded-md px-3 py-1.5 ${tab === 'flows' ? 'bg-emerald-600 text-white' : 'text-gray-600'}`}>
            {t('flowBuilder')}
          </button>
        </div>
      </div>

      {tab === 'replies' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowReplyForm(true)} className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600">
              {t('createBotReply')}
            </button>
          </div>

          {showReplyForm && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-gray-900">{t('createBotReply')}</h2>
              <form onSubmit={handleCreateReply} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('replyName')}</label>
                  <input value={replyForm.replyName} onChange={e => setReplyForm({ ...replyForm, replyName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('triggerType')}</label>
                  <select value={replyForm.triggerType} onChange={e => setReplyForm({ ...replyForm, triggerType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {triggerTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                  </select>
                </div>
                {replyForm.triggerType !== 'welcome' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('triggerSubject')}</label>
                    <input value={replyForm.triggerSubject} onChange={e => setReplyForm({ ...replyForm, triggerSubject: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('replyType')}</label>
                  <select value={replyForm.replyType} onChange={e => setReplyForm({ ...replyForm, replyType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="text">{t('textReply')}</option>
                    <option value="buttons">{t('buttonsReply')}</option>
                    <option value="list">{t('listReply')}</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('replyMessage')}</label>
                  <textarea value={replyForm.replyMessage} onChange={e => setReplyForm({ ...replyForm, replyMessage: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                {replyForm.replyType !== 'text' && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t('optionsCommaSeparated')}</label>
                    <input value={replyForm.optionsText} onChange={e => setReplyForm({ ...replyForm, optionsText: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder={t('optionsPlaceholder')} />
                  </div>
                )}
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={savingReply} className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-60">{savingReply ? tc('saving') : tc('save')}</button>
                  <button type="button" onClick={() => setShowReplyForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">{tc('cancel')}</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {loadingReplies && <div className="py-8 text-center text-gray-400">{tc('loading')}</div>}
            {!loadingReplies && replies.length === 0 && <div className="rounded-xl border border-gray-100 bg-white py-12 text-center text-gray-400">{tc('noData')}</div>}
            {replies.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900">{r.replyName}</span>
                    <div className="mt-1 flex gap-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{r.triggerType}</span>
                      {r.triggerSubject && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">"{r.triggerSubject}"</span>}
                      <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">{r.replyType}</span>
                    </div>
                  </div>
                </div>
                {r.replyMessage && <p className="mt-2 truncate text-sm text-gray-600">{r.replyMessage}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'flows' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowFlowForm(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
              {t('createFlow')}
            </button>
          </div>

          {showFlowForm && (
            <form onSubmit={createFlow} className="mb-6 rounded-2xl border border-emerald-100 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('noCodeFlowBuilder')}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('flowName')}</label>
                  <input value={flowName} onChange={(e) => setFlowName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('trigger')}</label>
                  <select value={flowTriggerType} onChange={(e) => setFlowTriggerType(e.target.value as any)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="keyword">{t('keyword')}</option>
                    <option value="welcome">{t('welcome')}</option>
                    <option value="any">{t('anyMessage')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t('triggerValue')}</label>
                  <input value={flowTriggerValue} onChange={(e) => setFlowTriggerValue(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder={t('triggerValuePlaceholder')} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">{t('step')} {index + 1}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveStep(index, -1)} className="rounded border border-gray-300 px-2 py-0.5 text-xs">{t('up')}</button>
                        <button type="button" onClick={() => moveStep(index, 1)} className="rounded border border-gray-300 px-2 py-0.5 text-xs">{t('down')}</button>
                        <button type="button" onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== index))} className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600">{t('remove')}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <select
                        value={step.type}
                        onChange={(e) => {
                          const value = e.target.value as FlowStep['type'];
                          setSteps((prev) => prev.map((s, idx) => idx === index ? { ...s, type: value } : s));
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="send_text">{t('sendText')}</option>
                        <option value="send_buttons">{t('sendButtons')}</option>
                        <option value="send_list">{t('sendList')}</option>
                        <option value="condition_text">{t('condition')}</option>
                        <option value="end">{t('end')}</option>
                      </select>
                      {step.type === 'condition_text' && (
                        <select
                          value={step.operator ?? 'contains'}
                          onChange={(e) =>
                            setSteps((prev) => prev.map((s, idx) => idx === index ? { ...s, operator: e.target.value as any } : s))
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="contains">{t('contains')}</option>
                          <option value="equals">{t('equals')}</option>
                          <option value="starts_with">{t('startsWith')}</option>
                          <option value="ends_with">{t('endsWith')}</option>
                        </select>
                      )}
                      {(step.type === 'send_text' || step.type === 'send_buttons' || step.type === 'send_list') && (
                        <input
                          value={step.text ?? ''}
                          onChange={(e) => setSteps((prev) => prev.map((s, idx) => idx === index ? { ...s, text: e.target.value } : s))}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
                          placeholder={t('messageText')}
                        />
                      )}
                      {step.type === 'condition_text' && (
                        <input
                          value={step.conditionValue ?? ''}
                          onChange={(e) => setSteps((prev) => prev.map((s, idx) => idx === index ? { ...s, conditionValue: e.target.value } : s))}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
                          placeholder={t('conditionValue')}
                        />
                      )}
                      {(step.type === 'send_buttons' || step.type === 'send_list') && (
                        <input
                          value={step.optionsText ?? ''}
                          onChange={(e) => setSteps((prev) => prev.map((s, idx) => idx === index ? { ...s, optionsText: e.target.value } : s))}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2"
                          placeholder={t('optionsStepPlaceholder')}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSteps((prev) => [...prev, { type: 'send_text', text: '' }])} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+ {t('textReply')}</button>
                <button type="button" onClick={() => setSteps((prev) => [...prev, { type: 'send_buttons', text: '', optionsText: '' }])} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+ {t('buttonsReply')}</button>
                <button type="button" onClick={() => setSteps((prev) => [...prev, { type: 'send_list', text: '', optionsText: '' }])} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+ {t('listReply')}</button>
                <button type="button" onClick={() => setSteps((prev) => [...prev, { type: 'condition_text', conditionValue: '', operator: 'contains' }])} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+ {t('condition')}</button>
                <button type="button" onClick={() => setSteps((prev) => [...prev, { type: 'end' }])} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+ {t('end')}</button>
              </div>

              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={!canSaveFlow || savingFlow} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60">
                  {savingFlow ? tc('saving') : t('saveFlow')}
                </button>
                <button type="button" onClick={() => setShowFlowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  {tc('cancel')}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {loadingFlows && <div className="py-8 text-center text-gray-400">{tc('loading')}</div>}
            {!loadingFlows && flows.length === 0 && <div className="rounded-xl border border-gray-100 bg-white py-12 text-center text-gray-400">{tc('noData')}</div>}
            {flows.map((flow) => (
              <div key={flow.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{flow.flowName}</p>
                    <p className="mt-1 text-xs text-gray-500">{flow.description || t('noDescription')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${flow.status === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {flow.status === 1 ? tc('active') : tc('inactive')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
