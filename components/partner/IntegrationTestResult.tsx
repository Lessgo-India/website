'use client';

import { CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { formatRelative } from '@web/lib/partner/format';
import type { IntegrationTestRun } from '@web/lib/partner/types';

/** Step-by-step result of a sandbox (or live health) check for an online channel. */
export default function IntegrationTestResult({
  run,
  compact = false,
}: {
  run: IntegrationTestRun;
  /** Summary line only, steps behind a disclosure. */
  compact?: boolean;
}) {
  const passed = run.steps.filter((step) => step.ok).length;
  const summary = (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${run.ok ? 'text-ok' : 'text-down'}`}>
      {run.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
      {run.environment === 'live' ? 'Live health check' : 'Sandbox checks'} {run.ok ? 'passed' : 'failed'} · {passed}/{run.steps.length}
      <span className="font-normal text-ink-muted">· {formatRelative(run.at)}</span>
    </span>
  );
  const steps = (
    <ol className="mt-2 space-y-1.5">
      {run.steps.map((step, index) => {
        const skipped = !step.ok && step.detail === 'Skipped';
        return (
          <li key={`${step.label}-${index}`} className="flex gap-2.5 text-sm">
            {step.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-ok" aria-label="Passed" />
            ) : skipped ? (
              <CircleSlash className="mt-0.5 h-4 w-4 flex-none text-ink-faint" aria-label="Skipped" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 flex-none text-down" aria-label="Failed" />
            )}
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{step.label}</span>
              <span className="block break-all font-mono text-[11px] text-ink-muted">{step.request}</span>
              <span className={`block text-xs ${step.ok || skipped ? 'text-ink-muted' : 'text-down'}`}>
                {step.detail}
                {step.ok ? ` · ${step.latencyMs} ms` : ''}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );

  if (!compact) {
    return (
      <div>
        {summary}
        {steps}
      </div>
    );
  }
  return (
    <details className="group">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {summary} <span className="text-xs font-semibold text-profile group-open:hidden">Show steps</span>
      </summary>
      {steps}
    </details>
  );
}
