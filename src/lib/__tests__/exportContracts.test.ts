import {
  contractsToCsv,
  contractsToJson,
  triggerDownload,
  downloadContractsCsv,
  downloadContractsJson,
} from '../exportContracts';

import type { Contract } from '@/types/domain';

const VALID_ADDRESS_1 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const VALID_ADDRESS_2 = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const baseContract: Contract = {
  contractName: 'Website Redesign',
  parties: [
    { label: 'Client', address: VALID_ADDRESS_1 },
    { label: 'Freelancer', address: VALID_ADDRESS_2 },
  ],
  totalValue: 5000,
  currency: 'USD',
  status: 'Active',
  createdAt: 'Jan 15, 2025',
  milestoneCount: 3,
};

describe('contractsToCsv', () => {
  it('produces CSV with headers and data rows', () => {
    const csv = contractsToCsv([baseContract]);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('contractName,parties,totalValue,currency,status,createdAt,milestoneCount');
    expect(lines[1]).toContain('Website Redesign');
    expect(lines[1]).toContain('5000');
    expect(lines[1]).toContain('USD');
    expect(lines[1]).toContain('Active');
    expect(lines[1]).toContain('Jan 15, 2025');
    expect(lines[1]).toContain('3');
  });

  it('escapes fields containing commas', () => {
    const contract: Contract = { ...baseContract, contractName: 'Redesign, Phase 1' };
    const csv = contractsToCsv([contract]);
    const line = csv.split('\n')[1];
    expect(line).toContain('"Redesign, Phase 1"');
  });

  it('escapes fields containing double quotes', () => {
    const contract: Contract = { ...baseContract, contractName: 'Redesign "Phase 1"' };
    const csv = contractsToCsv([contract]);
    const line = csv.split('\n')[1];
    expect(line).toContain('"Redesign ""Phase 1"""');
  });

  it('escapes fields containing newlines', () => {
    const contract: Contract = { ...baseContract, contractName: 'Redesign\nPhase 1' };
    const csv = contractsToCsv([contract]);
    expect(csv).toContain('"Redesign');
    expect(csv).toContain('Phase 1"');
    expect(csv).toContain('Client (GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H)');
  });

  it('handles empty parties and zero values', () => {
    const contract: Contract = {
      contractName: 'Test',
      parties: [],
      totalValue: 0,
      currency: '',
      status: 'Pending' as const,
      createdAt: '',
      milestoneCount: 0,
    };
    const csv = contractsToCsv([contract]);
    expect(csv).toContain('Test');
    expect(csv).toContain('0');
  });

  it('handles null fields gracefully via defensive null check', () => {
    const contract = {
      contractName: null,
      parties: [{ label: 'Client', address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567' }],
      totalValue: 100,
      currency: 'USD',
      status: 'Active',
      createdAt: 'Jan 1, 2025',
      milestoneCount: 1,
    } as unknown as Contract;
    const csv = contractsToCsv([contract]);
    expect(csv).toContain('Active');
  });

  it('returns headers only for empty array', () => {
    const csv = contractsToCsv([]);
    expect(csv).toBe('contractName,parties,totalValue,currency,status,createdAt,milestoneCount');
  });

  it('joins parties with semicolons and wraps addresses', () => {
    const csv = contractsToCsv([baseContract]);
    const line = csv.split('\n')[1];
    expect(line).toContain('Client (GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H)');
    expect(line).toContain('Freelancer');
  });

  it('handles multiple contracts', () => {
    const c2: Contract = { ...baseContract, contractName: 'Mobile App' };
    const csv = contractsToCsv([baseContract, c2]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('Website Redesign');
    expect(lines[2]).toContain('Mobile App');
  });
});

describe('contractsToJson', () => {
  it('produces a JSON array', () => {
    const json = contractsToJson([baseContract]);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].contractName).toBe('Website Redesign');
  });

  it('produces pretty-printed JSON with indentation', () => {
    const json = contractsToJson([baseContract]);
    expect(json).toContain('\n  ');
  });

  it('returns empty array JSON for no contracts', () => {
    const json = contractsToJson([]);
    expect(json).toBe('[]');
  });

  it('preserves all contract fields', () => {
    const json = contractsToJson([baseContract]);
    const parsed = JSON.parse(json);
    expect(parsed[0]).toEqual(baseContract);
  });
});

describe('triggerDownload', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(document.body, 'appendChild').mockImplementation((el: Node) => el);
    jest.spyOn(document.body, 'removeChild').mockImplementation((el: Node) => el);
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a blob, anchor element, triggers click, and cleans up', () => {
    triggerDownload('content', 'file.csv', 'text/csv');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});

describe('downloadContractsCsv and downloadContractsJson', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(document.body, 'appendChild').mockImplementation((el: Node) => el);
    jest.spyOn(document.body, 'removeChild').mockImplementation((el: Node) => el);
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('downloadContractsCsv does not throw with contracts', () => {
    expect(() => downloadContractsCsv([baseContract])).not.toThrow();
  });

  it('downloadContractsJson does not throw with contracts', () => {
    expect(() => downloadContractsJson([baseContract])).not.toThrow();
  });

  it('handles empty contracts array for CSV', () => {
    expect(() => downloadContractsCsv([])).not.toThrow();
  });

  it('handles empty contracts array for JSON', () => {
    expect(() => downloadContractsJson([])).not.toThrow();
  });

  it('downloadContractsCsv triggers download once', () => {
    downloadContractsCsv([baseContract]);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it('downloadContractsJson triggers download once', () => {
    downloadContractsJson([baseContract]);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });
});
