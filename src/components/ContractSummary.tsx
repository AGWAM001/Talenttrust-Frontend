'use client';

import React, { useEffect, useRef, useState } from 'react';
import StatusBadge, { StatusType } from './StatusBadge';
import { truncateAddress } from '@/lib/truncateAddress';
import { usePreferences } from '@/lib/preferences';
import { useToast } from '@/components/toast/toast-provider';
import { normalizeStellarAddress, isValidStellarAddress } from '@/lib/stellarAddress';
import { LastUpdated } from '@/components/LastUpdated';

/**
 * Sanitizes an address by stripping ASCII control characters (U+0000–U+001F, U+007F–U+009F)
 * and Unicode bidirectional text override/control characters (U+200E, U+200F, U+202A–U+202E, U+2066–U+2069)
 * to prevent hidden clipboard injection attacks.
 *
 * @param address - The raw address string.
 * @returns The sanitized address string.
 */
export function sanitizeAddress(address: string): string {
  if (typeof address !== 'string') {
    return '';
  }
  // eslint-disable-next-line no-control-regex
  const controlAndBidiRegex = /[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
  return address.replace(controlAndBidiRegex, '');
}

export type ContractParty = {
  label: string;
  address: string;
};

export type ContractSummaryProps = {
  contractName: string;
  /**
   * The list of parties involved in the contract.
   * Renders a fallback "No parties listed" when empty.
   * Uses composite keys to handle duplicate labels safely.
   */
  parties: ContractParty[];
  totalValue: number;
  currency: string;
  status: StatusType;
  createdAt: string;
  /**
   * ISO-8601 timestamp of the last update. Displayed as a relative
   * "Updated X ago" label with an accessible absolute-time alternative.
   * Falls back gracefully when absent.
   */
  updatedAt?: string;
  milestoneCount: number;
  /**
   * Monotonically incrementing version used by the persistence layer to guard
   * against stale overwrites. Consumers should treat this as opaque.
   */
  version?: number;
};

const ContractSummary = ({
  contractName,
  parties,
  totalValue,
  currency,
  status,
  createdAt,
  updatedAt,
  milestoneCount,
}: ContractSummaryProps) => {
  const { formatAmount } = usePreferences();
  const { showSuccess, showError } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formattedValue = formatAmount(totalValue, currency);

  /**
   * Copies the specified party address to the system clipboard.
   *
   * Guards against environments where the Clipboard API is unavailable
   * (e.g., insecure contexts or older browsers) and wraps the asynchronous
   * write in a try/catch block so that any clipboard write errors are caught
   * and displayed as user-visible error toasts rather than unhandled promise rejections.
   *
   * - Sets the `copiedAddress` state to the address upon successful copy,
   *   reverting it back to null after 2 seconds.
   * - Triggers a success toast on successful clipboard write.
   * - Triggers an error toast on any clipboard write failures.
   *
   * This function also ensures the button's accessible name reflects the
   * temporary copied state so that assistive technology users perceive the
   * per-party confirmation directly on the control.
   *
   * @param address - The full, non-truncated wallet address to copy.
   */
  const handleCopy = async (address: string) => {
    if (!navigator?.clipboard?.writeText) {
      showError({
        title: 'Copy not supported',
        description: 'Your browser does not support clipboard access. Please copy the address manually.',
      });
      return;
    }

    const sanitized = sanitizeAddress(address);
    const normalized = normalizeStellarAddress(sanitized);

    if (!isValidStellarAddress(normalized)) {
      console.warn(`[ContractSummary] Copied address appears malformed: "${normalized}"`);
    }

    try {
      await navigator.clipboard.writeText(normalized);
      setCopiedAddress(address);
      showSuccess({
        title: 'Address copied',
        description: 'The address has been successfully copied to your clipboard.',
      });

      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current);
      }

      copyResetTimeout.current = setTimeout(() => {
        setCopiedAddress(null);
        copyResetTimeout.current = null;
      }, 2000);
    } catch {
      showError({
        title: 'Copy failed',
        description: 'Unable to copy the address to your clipboard. Please try again.',
      });
    }
  };

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current);
      }
    };
  }, []);

  return (
    <section
      aria-labelledby="contract-summary-title"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-[0.24em]">Contract Summary</p>
          <h1 id="contract-summary-title" className="mt-2 text-2xl font-semibold text-slate-900">
            {contractName}
          </h1>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total value</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{formattedValue}</p>
          <p className="text-sm text-slate-500">{milestoneCount} milestone{milestoneCount === 1 ? '' : 's'}</p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Created</p>
          <p className="mt-2 text-base font-medium text-slate-900">{createdAt}</p>
          {updatedAt && <LastUpdated updatedAt={updatedAt} className="mt-1 block" />}
          <div className="mt-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <span className="text-sm text-slate-500">Parties</span>
            <span className="text-xs font-semibold text-slate-500" aria-live="polite">
              {parties.length} {parties.length === 1 ? 'party' : 'parties'}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {parties.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No parties listed</p>
            ) : (
              parties.map((party) => {
                const isCopied = copiedAddress === party.address;
                const compositeKey = `${party.label}-${party.address}`;
                return (
                  <div
                    key={compositeKey}
                    className="rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-600 font-medium">{party.label}</p>
                      <p className="mt-1 text-slate-500 font-mono truncate">
                        {truncateAddress(party.address)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(party.address)}
                      className="flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={isCopied ? `${party.label} address copied` : `Copy ${party.label} address to clipboard`}
                      title={isCopied ? `${party.label} address copied` : 'Copy address'}
                    >
                      {isCopied ? (
                        <svg aria-hidden="true" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContractSummary;
