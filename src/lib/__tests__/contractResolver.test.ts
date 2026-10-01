import { resolveContractData } from '@/lib/contractResolver';

describe('resolveContractData', () => {
  it('coalesces duplicate work at the delay boundary and permits a later retry', async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    try {
      const first = resolveContractData('parallel-contract', {
        simulateDelay: 25,
      });
      const duplicate = resolveContractData('parallel-contract', {
        simulateDelay: 25,
      });

      expect(timeoutSpy).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(24);
      let firstSettled = false;
      void first.then(() => {
        firstSettled = true;
      });
      expect(firstSettled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
      expect(firstResult).toEqual(duplicateResult);
      expect(firstResult.id).toBe('parallel-contract');

      const retry = resolveContractData('parallel-contract', {
        simulateDelay: 25,
      });
      expect(timeoutSpy).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(25);
      await expect(retry).resolves.toEqual(firstResult);
    } finally {
      timeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('clears rejected in-flight work so an identical retry executes again', async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    try {
      const failed = resolveContractData('retry-contract', {
        simulateError: true,
        simulateDelay: 10,
      });
      const duplicate = resolveContractData('retry-contract', {
        simulateError: true,
        simulateDelay: 10,
      });
      expect(timeoutSpy).toHaveBeenCalledTimes(1);

      const rejectedResult = expect(
        Promise.all([failed, duplicate]),
      ).rejects.toThrow('Failed to load contract. Please try again.');
      await jest.advanceTimersByTimeAsync(10);
      await rejectedResult;

      const retry = resolveContractData('retry-contract', {
        simulateError: true,
        simulateDelay: 10,
      });
      expect(timeoutSpy).toHaveBeenCalledTimes(2);
      const retryRejection = expect(retry).rejects.toThrow(
        'Failed to load contract. Please try again.',
      );
      await jest.advanceTimersByTimeAsync(10);
      await retryRejection;
    } finally {
      timeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  /**
   * Covers the happy path for a known contract id and verifies the returned payload
   * includes the contract metadata the detail page expects.
   */
  it('returns the expected contract payload for a known id', async () => {
    const contract = await resolveContractData('contract-123');

    expect(contract).toEqual(
      expect.objectContaining({
        id: 'contract-123',
        name: 'Stellar Escrow Implementation',
        status: 'Active',
        totalValue: 7000,
        currency: 'USD',
        milestones: expect.arrayContaining([
          expect.objectContaining({ id: 'ms-1' }),
        ]),
      })
    );
  });

  /**
   * Documents the current resolver behavior for an unknown id: there is no not-found
   * branch in the implementation, so the function resolves a fallback contract record
   * instead of returning null or undefined.
   */
  it('does not return null for an unknown id and preserves the requested id', async () => {
    const contract = await resolveContractData('missing-contract');

    expect(contract).not.toBeNull();
    expect(contract).toEqual(expect.objectContaining({ id: 'missing-contract' }));
  });

  /**
   * Confirms the resolver does not trim or normalize incoming ids before returning them.
   * This documents the current contract for whitespace-sensitive ids.
   */
  it('does not trim or normalize ids before returning the contract payload', async () => {
    const rawId = '  contract-42  ';
    const contract = await resolveContractData(rawId);

    expect(contract.id).toBe(rawId);
  });

  /**
   * Guards against malformed ids so contract resolution stays safe and does not throw
   * when route params contain unexpected characters.
   */
  it('does not throw for malformed ids', async () => {
    await expect(resolveContractData('<script>bad</script>')).resolves.toEqual(
      expect.objectContaining({ id: '<script>bad</script>' })
    );
  });
});
