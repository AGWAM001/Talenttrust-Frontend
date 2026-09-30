'use client';

import React, { useCallback } from 'react';
import StatusBadge, { StatusType } from '@/components/StatusBadge';
import { LastUpdated } from '@/components/LastUpdated';
import type { ContractParty } from '@/types/domain';

interface ContractRowItemProps {
  contractName: string;
  parties: ContractParty[];
  totalValue: number;
  currency: string;
  status: StatusType;
  createdAt: string;
  updatedAt?: string;
  milestoneCount: number;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onRowClick?: () => void;
}

/**
 * ContractRowItem
 *
 * Renders a single contract row with selection checkbox.
 * Supports keyboard accessibility with proper ARIA labels.
 * Checkbox can be toggled via space/enter keys or mouse click.
 */
export const ContractRowItem: React.FC<ContractRowItemProps> = ({
  contractName,
  parties,
  totalValue,
  currency,
  status,
  createdAt,
  updatedAt,
  milestoneCount,
  isSelected,
  onSelect,
  onRowClick,
}) => {
  /**
   * Handles checkbox change
   */
  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onSelect(e.target.checked);
    },
    [onSelect]
  );

  /**
   * Handles key down for checkbox toggling via Ctrl+Space.
   * Native checkbox already handles plain Space natively.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        onSelect(!isSelected);
      }
    },
    [isSelected, onSelect]
  );

  /**
   * Handles row click to navigate to contract details
   */
  const handleRowClick = useCallback(() => {
    onRowClick?.();
  }, [onRowClick]);

  return (
    <li
      role="row"
      className={`flex items-center gap-4 rounded-3xl border p-4 shadow-sm transition ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onKeyDown={handleKeyDown}
    >
      {/* Selection checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleCheckboxChange}
        aria-label={`Select contract: ${contractName}`}
        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      />

      {/* Contract content */}
      <div
        className="flex-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded"
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${contractName}. ${milestoneCount} milestone${milestoneCount !== 1 ? 's' : ''}. Status: ${status}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{contractName}</p>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
              <span>{parties.length} {parties.length === 1 ? 'party' : 'parties'}</span>
              <span>
                {totalValue.toLocaleString()} {currency}
              </span>
              <span>{milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Status and date */}
          <div className="ml-4 flex flex-col items-end gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-slate-400">{createdAt}</span>
            {updatedAt && <LastUpdated updatedAt={updatedAt} />}
          </div>
        </div>
      </div>
    </li>
  );
};

export default ContractRowItem;
