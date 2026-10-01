'use client';

import React, { memo } from 'react';
import type { Contract } from '@/types/domain';
import { LastUpdated } from '@/components/LastUpdated';

export interface ContractListItemProps {
  contract: Contract;
  index: number;
  /** Controls spacing inside the card. Defaults to 'comfortable'. */
  density?: 'comfortable' | 'compact';
}

/**
 * ContractListItem renders a single contract in a list.
 *
 * Memoized with React.memo to prevent re-renders when the contract and index
 * props haven't changed. This is critical for performance when rendering large
 * contract lists, as parent re-renders due to unrelated state changes (e.g.,
 * showForm toggle) will not cause each list item to re-render unnecessarily.
 *
 * @param props - Component props
 * @param props.contract - The contract record to display
 * @param props.index - The index of the contract in the list (used for key)
 * @param props.density - Optional density override ('comfortable' | 'compact')
 *
 * @example
 * ```tsx
 * <ContractListItem contract={contract} index={0} density="compact" />
 * ```
 */
const ContractListItem = memo(
  ({ contract, index }: ContractListItemProps) => (
    <li
      key={`${contract.contractName}-${index}`}
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="font-semibold text-slate-900">{contract.contractName}</p>
      <p className="text-sm text-slate-500">
        {contract.status} · Created {contract.createdAt}
      </p>
      {contract.updatedAt && <LastUpdated updatedAt={contract.updatedAt} />}
    </li>
  ),
  (prevProps, nextProps) => {
    // Custom equality check: return true if props are equal (don't re-render)
    return (
      prevProps.contract.contractName === nextProps.contract.contractName &&
      prevProps.contract.status === nextProps.contract.status &&
      prevProps.contract.createdAt === nextProps.contract.createdAt &&
      prevProps.contract.updatedAt === nextProps.contract.updatedAt &&
      prevProps.index === nextProps.index
    );
  },
);

ContractListItem.displayName = 'ContractListItem';

export default ContractListItem;
