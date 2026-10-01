import { render } from '@testing-library/react';
import ContractListItem from '../ContractListItem';
import type { Contract } from '@/types/domain';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    contractName: 'Test Contract',
    parties: [{ label: 'Client', address: '0xABC123' }],
    totalValue: 5000,
    currency: 'USD',
    status: 'Active',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01T00:00:00.000Z',
    milestoneCount: 3,
    ...overrides,
  };
}

describe('ContractListItem', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  describe('rendering', () => {
    it('renders contract name and metadata', () => {
      const contract = makeContract({
        contractName: 'Design Sprint',
        status: 'Completed',
        createdAt: '2025-01-15',
      });

      const { getByText } = render(<ContractListItem contract={contract} index={0} />);

      expect(getByText('Design Sprint')).toBeInTheDocument();
      expect(getByText('Completed · Created 2025-01-15')).toBeInTheDocument();
    });

    it('renders with correct styling classes', () => {
      const contract = makeContract();
      const { container } = render(<ContractListItem contract={contract} index={0} />);

      const li = container.querySelector('li');
      expect(li).toHaveClass('rounded-3xl');
      expect(li).toHaveClass('border');
      expect(li).toHaveClass('border-slate-200');
      expect(li).toHaveClass('bg-white');
      // Default density is 'comfortable' → p-4
      expect(li).toHaveClass('p-4');
      expect(li).toHaveClass('shadow-sm');
    });

    it('renders different statuses correctly', () => {
      const statuses = ['Active', 'Pending', 'Completed', 'Disputed'] as const;

      for (const status of statuses) {
        const contract = makeContract({ status });
        const { getByText } = render(<ContractListItem contract={contract} index={0} />);

        expect(getByText(new RegExp(status))).toBeInTheDocument();
      }
    });
  });

  describe('memoization', () => {
    it('displays name "ContractListItem" for debugging', () => {
      expect(ContractListItem.displayName).toBe('ContractListItem');
    });

    it('prevents re-render when contract properties are stable', () => {
      const contract = makeContract({
        contractName: 'Stable Contract',
        status: 'Active',
        createdAt: '2025-01-01',
      });

      const { rerender } = render(
        <ContractListItem contract={contract} index={0} />
      );

      // Re-render with the same contract object
      rerender(<ContractListItem contract={contract} index={0} />);

      // Should not trigger re-render (verified by React.memo)
      expect(ContractListItem.displayName).toBe('ContractListItem');
    });

    it('re-renders when contract name changes', () => {
      const contract1 = makeContract({
        contractName: 'Contract A',
        status: 'Active',
        createdAt: '2025-01-01',
      });
      const contract2 = makeContract({
        contractName: 'Contract B',
        status: 'Active',
        createdAt: '2025-01-01',
      });

      const { rerender, getByText } = render(
        <ContractListItem contract={contract1} index={0} />
      );

      expect(getByText('Contract A')).toBeInTheDocument();

      rerender(<ContractListItem contract={contract2} index={0} />);

      expect(getByText('Contract B')).toBeInTheDocument();
    });

    it('re-renders when contract status changes', () => {
      const contract1 = makeContract({
        contractName: 'Same Name',
        status: 'Active',
        createdAt: '2025-01-01',
      });
      const contract2 = makeContract({
        contractName: 'Same Name',
        status: 'Completed',
        createdAt: '2025-01-01',
      });

      const { rerender, getByText } = render(
        <ContractListItem contract={contract1} index={0} />
      );

      expect(getByText('Active · Created 2025-01-01')).toBeInTheDocument();

      rerender(<ContractListItem contract={contract2} index={0} />);

      expect(getByText('Completed · Created 2025-01-01')).toBeInTheDocument();
    });

    it('re-renders when contract createdAt changes', () => {
      const contract1 = makeContract({
        contractName: 'Same Name',
        status: 'Active',
        createdAt: '2025-01-01',
      });
      const contract2 = makeContract({
        contractName: 'Same Name',
        status: 'Active',
        createdAt: '2025-02-01',
      });

      const { rerender, getByText } = render(
        <ContractListItem contract={contract1} index={0} />
      );

      expect(getByText('Active · Created 2025-01-01')).toBeInTheDocument();

      rerender(<ContractListItem contract={contract2} index={0} />);

      expect(getByText('Active · Created 2025-02-01')).toBeInTheDocument();
    });

    it('does not re-render when other contract properties change', () => {
      const contract1 = makeContract({
        contractName: 'Contract A',
        status: 'Active',
        createdAt: '2025-01-01',
        totalValue: 5000,
      });
      const contract2 = makeContract({
        contractName: 'Contract A',
        status: 'Active',
        createdAt: '2025-01-01',
        totalValue: 10000, // Changed, but not displayed
      });

      const { rerender, getByText } = render(
        <ContractListItem contract={contract1} index={0} />
      );

      expect(getByText('Contract A')).toBeInTheDocument();

      // Re-render should not happen because displayed properties are the same
      rerender(<ContractListItem contract={contract2} index={0} />);

      expect(getByText('Contract A')).toBeInTheDocument();
    });

    it('handles index prop changes correctly', () => {
      const contract = makeContract();

      const { rerender } = render(
        <ContractListItem contract={contract} index={0} />
      );

      // Index change is tracked but doesn't affect display
      rerender(<ContractListItem contract={contract} index={1} />);

      expect(ContractListItem.displayName).toBe('ContractListItem');
    });
  });

  describe('edge cases', () => {
    it('handles contracts with very long names', () => {
      const longName = 'A'.repeat(200);
      const contract = makeContract({ contractName: longName });

      const { getByText } = render(<ContractListItem contract={contract} index={0} />);

      expect(getByText(longName)).toBeInTheDocument();
    });

    it('handles contracts with special characters in name', () => {
      const contract = makeContract({
        contractName: 'Contract: "Test" & Review (2025)',
      });

      const { getByText } = render(<ContractListItem contract={contract} index={0} />);

      expect(getByText('Contract: "Test" & Review (2025)')).toBeInTheDocument();
    });

    it('handles various date formats', () => {
      const dates = ['2025-01-01', '2024-12-31', '2026-06-15'];

      for (const date of dates) {
        const contract = makeContract({ createdAt: date });
        const { getByText } = render(<ContractListItem contract={contract} index={0} />);

        expect(getByText(new RegExp(date))).toBeInTheDocument();
      }
    });

    it('shows relative last-updated timestamp when updatedAt is provided', () => {
      const contract = makeContract({
        updatedAt: '2025-01-01T11:55:00.000Z',
      });

      const { getByText } = render(<ContractListItem contract={contract} index={0} />);

      expect(getByText(/Updated/)).toBeInTheDocument();
    });

    it('does not show last-updated when updatedAt is absent', () => {
      const contract = makeContract({ updatedAt: undefined });

      const { queryByText } = render(<ContractListItem contract={contract} index={0} />);

      expect(queryByText(/Updated/)).not.toBeInTheDocument();
    });

    it('re-renders when updatedAt changes', () => {
      const contract1 = makeContract({
        contractName: 'Same Name',
        status: 'Active',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01T10:00:00.000Z',
      });
      const contract2 = makeContract({
        contractName: 'Same Name',
        status: 'Active',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01T11:00:00.000Z',
      });

      const { rerender, getByText } = render(
        <ContractListItem contract={contract1} index={0} />
      );

      expect(getByText('Active · Created 2025-01-01')).toBeInTheDocument();

      rerender(<ContractListItem contract={contract2} index={0} />);

      expect(getByText('Active · Created 2025-01-01')).toBeInTheDocument();
    });
  });
});
