import type { WalletItem } from '@/types/domain';

export const SAMPLE_WALLET_ITEMS: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
    status: 'Active',
    createdAt: '2026-01-15',
  },
  {
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3200,
    currency: 'USDC',
    address: 'GA2C456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
    status: 'Active',
    createdAt: '2026-02-01',
  },
  {
    id: 'w-3',
    name: 'Escrow Lock Key #402',
    type: 'Security Credential',
    balance: 1,
    currency: 'KEY',
    status: 'Pending',
    createdAt: '2026-03-10',
  },
  {
    id: 'w-4',
    name: 'Archived Client Token',
    type: 'Custom Asset',
    balance: 50,
    currency: 'ACT',
    status: 'Archived',
    createdAt: '2025-11-20',
  },
];
