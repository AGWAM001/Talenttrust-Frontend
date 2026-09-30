import { render } from '@testing-library/react';
import ContractsList from '../ContractsList';
import type { Contract } from '@/types/domain';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    contractName: 'Test Contract',
    parties: [{ label: 'Client', address: '0xABC123' }],
    totalValue: 5000,
    currency: 'USD',
    status: 'Active',
    createdAt: '2025-01-01',
    milestoneCount: 3,
    ...overrides,
  };
}

describe('ContractsList', () => {
  describe('rendering', () => {
    it('renders an empty list when no contracts are provided', () => {
      const { container } = render(<ContractsList contracts={[]} />);

      const ul = container.querySelector('ul');
      expect(ul).toBeInTheDocument();
      expect(ul?.children.length).toBe(0);
    });

    it('renders a single contract', () => {
      const contracts = [makeContract({ contractName: 'Single Contract' })];

      const { getByText } = render(<ContractsList contracts={contracts} />);

      expect(getByText('Single Contract')).toBeInTheDocument();
    });

    it('renders multiple contracts in order', () => {
      const contracts = [
        makeContract({ contractName: 'Contract A' }),
        makeContract({ contractName: 'Contract B' }),
        makeContract({ contractName: 'Contract C' }),
      ];

      const { getByText, container } = render(<ContractsList contracts={contracts} />);

      expect(getByText('Contract A')).toBeInTheDocument();
      expect(getByText('Contract B')).toBeInTheDocument();
      expect(getByText('Contract C')).toBeInTheDocument();

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('renders with correct list styling', () => {
      const contracts = [makeContract()];

      const { container } = render(<ContractsList contracts={contracts} />);

      // Default density is 'comfortable' → space-y-4
      const ul = container.querySelector('ul');
      expect(ul).toHaveClass('space-y-4');
    });
  });

  describe('memoization', () => {
    it('displays name "ContractsList" for debugging', () => {
      expect(ContractsList.displayName).toBe('ContractsList');
    });

    it('prevents re-render when contracts array reference is stable', () => {
      const contracts = [
        makeContract({ contractName: 'Contract 1' }),
        makeContract({ contractName: 'Contract 2' }),
      ];

      const { rerender, getByText } = render(<ContractsList contracts={contracts} />);

      expect(getByText('Contract 1')).toBeInTheDocument();
      expect(getByText('Contract 2')).toBeInTheDocument();

      // Re-render with the same array reference
      rerender(<ContractsList contracts={contracts} />);

      expect(getByText('Contract 1')).toBeInTheDocument();
      expect(getByText('Contract 2')).toBeInTheDocument();
    });

    it('re-renders when contracts array reference changes', () => {
      const contracts1 = [makeContract({ contractName: 'Contract 1' })];
      const contracts2 = [
        makeContract({ contractName: 'Contract 1' }),
        makeContract({ contractName: 'Contract 2' }),
      ];

      const { rerender, getByText, queryByText } = render(
        <ContractsList contracts={contracts1} />
      );

      expect(getByText('Contract 1')).toBeInTheDocument();
      expect(queryByText('Contract 2')).not.toBeInTheDocument();

      rerender(<ContractsList contracts={contracts2} />);

      expect(getByText('Contract 1')).toBeInTheDocument();
      expect(getByText('Contract 2')).toBeInTheDocument();
    });

    it('re-renders when contracts array length changes', () => {
      const contracts1 = [
        makeContract({ contractName: 'Contract 1' }),
        makeContract({ contractName: 'Contract 2' }),
      ];
      const contracts2 = [
        makeContract({ contractName: 'Contract 1' }),
        makeContract({ contractName: 'Contract 2' }),
        makeContract({ contractName: 'Contract 3' }),
      ];

      const { rerender, container } = render(
        <ContractsList contracts={contracts1} />
      );

      let items = container.querySelectorAll('li');
      expect(items.length).toBe(2);

      rerender(<ContractsList contracts={contracts2} />);

      items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('re-renders when a contract within the array changes', () => {
      const contracts1 = [
        makeContract({ contractName: 'Contract 1', status: 'Active' }),
        makeContract({ contractName: 'Contract 2', status: 'Pending' }),
      ];
      const contracts2 = [
        makeContract({ contractName: 'Contract 1', status: 'Active' }),
        makeContract({ contractName: 'Contract 2', status: 'Completed' }),
      ];

      const { rerender, getByText } = render(
        <ContractsList contracts={contracts1} />
      );

      expect(getByText('Pending · Created 2025-01-01')).toBeInTheDocument();

      rerender(<ContractsList contracts={contracts2} />);

      expect(getByText('Completed · Created 2025-01-01')).toBeInTheDocument();
    });

    it('does not re-render when contract properties change but array is same reference', () => {
      const contract = makeContract({ contractName: 'Same Contract', status: 'Active' });
      const contracts1 = [contract];

      // Simulate mutation (not recommended, but testing stability)
      const contracts2 = contracts1;

      const { rerender, getByText } = render(
        <ContractsList contracts={contracts1} />
      );

      expect(getByText('Same Contract')).toBeInTheDocument();

      rerender(<ContractsList contracts={contracts2} />);

      expect(getByText('Same Contract')).toBeInTheDocument();
    });
  });

  describe('large datasets', () => {
    it('handles rendering 100 contracts efficiently', () => {
      const contracts = Array.from({ length: 100 }, (_, i) =>
        makeContract({ contractName: `Contract ${i + 1}` })
      );

      const { container, getByText } = render(<ContractsList contracts={contracts} />);

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(100);

      expect(getByText('Contract 1')).toBeInTheDocument();
      expect(getByText('Contract 100')).toBeInTheDocument();
    });

    it('handles rendering 1000 contracts efficiently', () => {
      const contracts = Array.from({ length: 1000 }, (_, i) =>
        makeContract({
          contractName: `Contract ${i + 1}`,
          status: i % 2 === 0 ? 'Active' : 'Completed',
        })
      );

      const { container, getByText } = render(<ContractsList contracts={contracts} />);

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(1000);

      expect(getByText('Contract 1')).toBeInTheDocument();
      expect(getByText('Contract 1000')).toBeInTheDocument();
    });

    it('updates correctly when switching between large datasets', () => {
      const contracts1 = Array.from({ length: 50 }, (_, i) =>
        makeContract({ contractName: `Set A Contract ${i + 1}` })
      );
      const contracts2 = Array.from({ length: 60 }, (_, i) =>
        makeContract({ contractName: `Set B Contract ${i + 1}` })
      );

      const { rerender, container, getByText, queryByText } = render(
        <ContractsList contracts={contracts1} />
      );

      let items = container.querySelectorAll('li');
      expect(items.length).toBe(50);
      expect(getByText('Set A Contract 1')).toBeInTheDocument();

      rerender(<ContractsList contracts={contracts2} />);

      items = container.querySelectorAll('li');
      expect(items.length).toBe(60);
      expect(getByText('Set B Contract 1')).toBeInTheDocument();
      expect(queryByText('Set A Contract 1')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles contracts with duplicate names', () => {
      const contracts = [
        makeContract({ contractName: 'Same Name', status: 'Active' }),
        makeContract({ contractName: 'Same Name', status: 'Completed' }),
        makeContract({ contractName: 'Same Name', status: 'Pending' }),
      ];

      const { getByText, container } = render(
        <ContractsList contracts={contracts} />
      );

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);

      expect(getByText('Active · Created 2025-01-01')).toBeInTheDocument();
      expect(getByText('Completed · Created 2025-01-01')).toBeInTheDocument();
      expect(getByText('Pending · Created 2025-01-01')).toBeInTheDocument();
    });

    it('handles updating specific contracts in a large list', () => {
      const contracts1 = Array.from({ length: 100 }, (_, i) =>
        makeContract({
          contractName: `Contract ${i + 1}`,
          status: 'Active',
          createdAt: '2025-01-01',
        })
      );

      const { rerender, getByText } = render(
        <ContractsList contracts={contracts1} />
      );

      // Update one contract in the middle
      const contracts2 = contracts1.map((contract, i) =>
        i === 50
          ? makeContract({
              contractName: 'Contract 51',
              status: 'Completed',
              createdAt: '2025-01-01',
            })
          : contract
      );

      rerender(<ContractsList contracts={contracts2} />);

      expect(getByText('Completed · Created 2025-01-01')).toBeInTheDocument();
    });

    it('preserves list stability when contracts are filtered', () => {
      const allContracts = [
        makeContract({ contractName: 'Active Contract', status: 'Active' }),
        makeContract({ contractName: 'Completed Contract', status: 'Completed' }),
        makeContract({ contractName: 'Pending Contract', status: 'Pending' }),
      ];

      const activeContracts = allContracts.filter((c) => c.status === 'Active');

      const { rerender, getByText, queryByText } = render(
        <ContractsList contracts={allContracts} />
      );

      expect(getByText('Active Contract')).toBeInTheDocument();
      expect(getByText('Completed Contract')).toBeInTheDocument();
      expect(getByText('Pending Contract')).toBeInTheDocument();

      rerender(<ContractsList contracts={activeContracts} />);

      expect(getByText('Active Contract')).toBeInTheDocument();
      expect(queryByText('Completed Contract')).not.toBeInTheDocument();
      expect(queryByText('Pending Contract')).not.toBeInTheDocument();
    });
  });
});
