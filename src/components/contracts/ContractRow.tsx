import React from 'react';
import type { Contract } from '@/types/domain';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/components/toast/toast-provider';
import { truncateAddress } from '@/lib/truncateAddress';

export interface ContractRowProps {
  contract: Contract;
}

export const ContractRow: React.FC<ContractRowProps> = ({ contract }) => {
  const { showSuccess, showError } = useToast();
  
  const { copied, copy } = useCopyToClipboard({
    onSuccess: () => {
      showSuccess({ title: 'ID copied', description: 'Contract ID copied to clipboard' });
    },
    onError: () => {
      showError({ title: 'Copy failed', description: 'Failed to copy contract ID' });
    },
  });

  const contractId = contract.id || contract.contractName;
  const displayId = contract.id ? truncateAddress(contract.id, 6, 4) : 'N/A';

  return (
    <li className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm flex justify-between items-center">
      <div>
        <p className="font-semibold text-slate-900">{contract.contractName}</p>
        <p className="text-sm text-slate-500">
          {contract.status} · Created {contract.createdAt}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-slate-500">{displayId}</span>
        <button
          onClick={() => copy(contractId)}
          aria-label={copied ? 'Contract ID copied' : `Copy contract ID ${contractId}`}
          title={copied ? 'Contract ID copied' : 'Copy contract ID'}
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {copied ? (
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
    </li>
  );
};
