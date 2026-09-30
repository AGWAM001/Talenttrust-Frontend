'use client';

import React, { memo } from 'react';
import ContractListItem from './ContractListItem';
import type { Contract } from '@/types/domain';
import type { ContractsDensity } from '@/lib/preferences';

export interface ContractsListProps {
  contracts: Contract[];
  /** Current density setting; provided by the parent page. */
  density?: ContractsDensity;
  /** Called when the user toggles the density button. */
  onToggleDensity?: () => void;
}

/**
 * ContractsList renders a list of contracts with a density toggle.
 *
 * Memoized with React.memo to prevent re-renders when the contracts array
 * reference hasn't changed. This allows parent components to re-render without
 * triggering unnecessary re-renders of the entire list and all its child items.
 *
 * The density toggle button switches between 'comfortable' and 'compact' spacing.
 * Density is persisted via the preferences system and restored on mount.
 *
 * @param props.contracts - Array of contracts to display
 * @param props.density   - Active density setting ('comfortable' | 'compact')
 * @param props.onToggleDensity - Called when the user clicks the toggle button
 */
const ContractsList = memo(
  ({ contracts, density = 'comfortable', onToggleDensity }: ContractsListProps) => {
    const isCompact = density === 'compact';

    return (
      <>
        <div className="mb-4 flex justify-end">
          {onToggleDensity && (
            <button
              type="button"
              onClick={onToggleDensity}
              aria-pressed={isCompact}
              aria-label={isCompact ? 'Switch to comfortable density' : 'Switch to compact density'}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              {/* Density icon */}
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 16 16"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                {isCompact ? (
                  /* Compact → show "expand" lines */
                  <>
                    <line x1="2" y1="4" x2="14" y2="4" />
                    <line x1="2" y1="8" x2="14" y2="8" />
                    <line x1="2" y1="12" x2="14" y2="12" />
                  </>
                ) : (
                  /* Comfortable → show "compress" lines with gaps */
                  <>
                    <line x1="2" y1="3" x2="14" y2="3" />
                    <line x1="2" y1="6" x2="14" y2="6" />
                    <line x1="2" y1="10" x2="14" y2="10" />
                    <line x1="2" y1="13" x2="14" y2="13" />
                  </>
                )}
              </svg>
              {isCompact ? 'Comfortable' : 'Compact'}
            </button>
          )}
        </div>
        <ul
          className={`transition-[gap] ${isCompact ? 'space-y-2' : 'space-y-4'}`}
          aria-label="Contracts list"
        >
          {contracts.map((contract, idx) => (
            <ContractListItem
              key={`${contract.contractName}-${idx}`}
              contract={contract}
              index={idx}
              density={density}
            />
          ))}
        </ul>
      </>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    if (prevProps.density !== nextProps.density) return false;
    if (prevProps.onToggleDensity !== nextProps.onToggleDensity) return false;
    // Check array length first for quick bail-out
    if (prevProps.contracts.length !== nextProps.contracts.length) {
      return false;
    }

    // Check if each contract in the array is the same reference or has same values
    for (let i = 0; i < prevProps.contracts.length; i++) {
      const prev = prevProps.contracts[i];
      const next = nextProps.contracts[i];

      if (
        prev.contractName !== next.contractName ||
        prev.status !== next.status ||
        prev.createdAt !== next.createdAt ||
        prev.updatedAt !== next.updatedAt
      ) {
        return false;
      }
    }

    return true;
  },
);

ContractsList.displayName = 'ContractsList';

export default ContractsList;
