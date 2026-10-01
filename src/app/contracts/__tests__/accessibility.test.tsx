import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import ContractsList from '@/components/contracts/ContractsList';
import EmptyState from '@/components/EmptyState';
import GlobalError from '@/app/error';
import type { Contract } from '@/types/domain';

jest.mock('@/lib/errorReporter', () => ({
  reportError: jest.fn(),
}));

const contracts: Contract[] = [
  {
    id: 'contract-1',
    contractName: 'Website redesign',
    parties: [
      { label: 'Client', address: 'GCLIENT' },
      { label: 'Freelancer', address: 'GFREELANCER' },
    ],
    totalValue: 2500,
    currency: 'USD',
    status: 'Active',
    createdAt: '2026-07-20',
    milestoneCount: 3,
  },
];

describe('contracts view accessibility', () => {
  it('has no automated accessibility violations in the loaded state', async () => {
    const { container } = render(
      <main>
        <h1>Contracts</h1>
        <ContractsList contracts={contracts} />
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no automated accessibility violations in the empty state', async () => {
    const { container } = render(
      <main>
        <h1>Contracts</h1>
        <EmptyState
          illustration="contracts"
          title="No contracts found"
          description="Create your first contract to get started."
          actionLabel="Create Contract"
          onAction={jest.fn()}
        />
      </main>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no automated accessibility violations in the error state', async () => {
    const { container } = render(
      <GlobalError error={new Error('Unable to load contracts')} reset={jest.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
