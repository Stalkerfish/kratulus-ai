'use client';

import React, { useMemo, useState } from 'react';
import { useAppDispatch, useAppState } from '@/lib/app-state';
import { requestTutorResponse } from '@/lib/tutorClient';

export default function TutorPanel() {
  const { tutorConversation, tutorActionRequests, tutorStatus, tutorError, confirmedExpression, dispatch, invokeTutor } = useAppState();
  const dispatch = useAppDispatch();
  const [input, setInput] = useState('');

  const canSend = useMemo(() => input.trim().length > 0 && Boolean(confirmedExpression?.latex), [confirmedExpression?.latex, input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    if (!confirmedExpression?.latex) {
      dispatch({
        type: 'tutor/requestFailed',
        payload: {
          error: 'Confirm an expression before messaging the tutor.',
        },
      });
      return;
    }

    const studentMessage = {
      id: `msg_${crypto.randomUUID()}`,
      role: 'student' as const,
      content: trimmed,
      createdAt: new Date().toLocaleTimeString([], { hour12: false }),
    };

    const requestId = `act_${crypto.randomUUID()}`;
    dispatch({ type: 'tutor/studentMessageAppended', payload: studentMessage });
    dispatch({
      type: 'tutor/requestStarted',
      payload: {
        requestId,
        actionType: 'step_hint',
        detail: 'Student free-form follow-up from Tutor Panel.',
      },
    });

    setInput('');

    try {
      const response = await invokeTutor({
        confirmedExpressionLatex: confirmedExpression.latex,
        conversation: [...tutorConversation, studentMessage],
      });

      dispatch({ type: 'tutor/requestSucceeded', payload: { requestId, response } });
    } catch (error) {
      dispatch({
        type: 'tutor/requestFailed',
        payload: {
          requestId,
          error: error instanceof Error ? error.message : 'Unable to send tutor message.',
        },
      });
    }
  };

  return (
    <div className="bg-white dark:bg-background-dark border border-primary/30 rounded-xl p-5 flex-grow flex flex-col relative overflow-hidden blueprint-grid">
      <div className="absolute top-0 right-0 p-2">
        <span className="material-symbols-outlined text-primary/20 text-6xl rotate-12">robot_2</span>
      </div>
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined font-variation-FILL-1">psychology</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white leading-none">The Analyst</h4>
            <span className="text-[10px] font-mono text-primary uppercase leading-none">{`Tutor ${tutorStatus}`}</span>
          </div>
        </div>

        <div className="space-y-4 flex-grow overflow-y-auto pr-1">
          {tutorStatus === 'loading' && (
            <div className="text-xs font-mono uppercase text-primary/70">Generating tutor response...</div>
          )}
          {tutorStatus === 'error' && <div className="text-xs text-red-500">{tutorError ?? 'Tutor unavailable.'}</div>}

          {tutorConversation.map((message) => (
            <div className="bg-slate-50 dark:bg-primary/5 border border-slate-200 dark:border-primary/20 p-3 rounded-lg" key={message.id}>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 uppercase">{message.role}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed italic">{message.content}</p>
              <p className="text-[10px] mt-2 font-mono text-slate-400">{message.createdAt}</p>
            </div>
          ))}

          <div className="border-l-2 border-secondary/50 pl-4 py-1">
            <p className="text-[10px] font-mono text-secondary uppercase font-bold tracking-tighter">Action Requests</p>
            <div className="mt-2 space-y-2">
              {tutorActionRequests.map((request) => (
                <div className="text-xs text-slate-600 dark:text-slate-400" key={request.id}>
                  <span className="font-mono text-secondary">{request.status}</span>
                  {` • ${request.type} (${request.requestedAt})`}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-primary/10">
          <div className="relative">
            <input
              aria-label="Ask the analyst"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              className="w-full bg-slate-100 dark:bg-primary/10 border-none rounded-xl py-2 px-4 text-xs focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
              placeholder="Ask The Analyst..."
              type="text"
            />
            <button
              aria-label="Send message"
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="absolute right-2 top-1.5 text-primary flex items-center justify-center rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">send</span>
              <span className="sr-only">Send message</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
