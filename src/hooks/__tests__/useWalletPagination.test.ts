import { renderHook, act } from '@testing-library/react';
import { useWalletPagination } from '../useWalletPagination';

interface MockItem {
  id: string;
  type: string;
  amount: number;
}

function createItems(count: number, type = 'transfer'): MockItem[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `tx-${idx + 1}`,
    type,
    amount: (idx + 1) * 50,
  }));
}

describe('useWalletPagination', () => {
  describe('First page initialization', () => {
    it('initializes with page 1, visibleItems for first page, and correct hasMore status', () => {
      const items = createItems(15);
      const { result } = renderHook(() =>
        useWalletPagination({ items, pageSize: 5 })
      );

      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(5);
      expect(result.current.totalCount).toBe(15);
      expect(result.current.displayedCount).toBe(5);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.visibleItems).toEqual(items.slice(0, 5));
    });

    it('defaults to pageSize 10 when not specified', () => {
      const items = createItems(25);
      const { result } = renderHook(() => useWalletPagination({ items }));

      expect(result.current.pageSize).toBe(10);
      expect(result.current.displayedCount).toBe(10);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('Load-more append behavior', () => {
    it('appends next page of items when loadMore is called', () => {
      const items = createItems(12);
      const { result } = renderHook(() =>
        useWalletPagination({ items, pageSize: 5 })
      );

      expect(result.current.displayedCount).toBe(5);
      expect(result.current.hasMore).toBe(true);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.page).toBe(2);
      expect(result.current.displayedCount).toBe(10);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.visibleItems).toEqual(items.slice(0, 10));

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.page).toBe(3);
      expect(result.current.displayedCount).toBe(12);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.visibleItems).toEqual(items);
    });
  });

  describe('End-of-list boundary behavior', () => {
    it('does not increment page or append items when loadMore is called at end of list', () => {
      const items = createItems(5);
      const { result } = renderHook(() =>
        useWalletPagination({ items, pageSize: 5 })
      );

      expect(result.current.hasMore).toBe(false);
      expect(result.current.displayedCount).toBe(5);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.page).toBe(1);
      expect(result.current.displayedCount).toBe(5);
      expect(result.current.hasMore).toBe(false);
    });

    it('handles empty items array safely', () => {
      const { result } = renderHook(() =>
        useWalletPagination({ items: [], pageSize: 5 })
      );

      expect(result.current.page).toBe(1);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.displayedCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.visibleItems).toEqual([]);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.page).toBe(1);
      expect(result.current.displayedCount).toBe(0);
    });
  });

  describe('Reset-on-filter & reset behavior', () => {
    it('resets page to 1 when reset() is manually invoked', () => {
      const items = createItems(15);
      const { result } = renderHook(() =>
        useWalletPagination({ items, pageSize: 5 })
      );

      act(() => {
        result.current.loadMore();
      });
      expect(result.current.page).toBe(2);
      expect(result.current.displayedCount).toBe(10);

      act(() => {
        result.current.reset();
      });

      expect(result.current.page).toBe(1);
      expect(result.current.displayedCount).toBe(5);
      expect(result.current.hasMore).toBe(true);
    });

    it('resets to page 1 automatically when filter prop changes', () => {
      const items = [
        ...createItems(5, 'deposit'),
        ...createItems(5, 'withdrawal'),
      ];

      const { result, rerender } = renderHook(
        ({ filterFn }) =>
          useWalletPagination({
            items,
            pageSize: 3,
            filter: filterFn,
          }),
        {
          initialProps: {
            filterFn: (item: MockItem) => item.type === 'deposit',
          },
        }
      );

      expect(result.current.totalCount).toBe(5);
      expect(result.current.displayedCount).toBe(3);

      act(() => {
        result.current.loadMore();
      });
      expect(result.current.page).toBe(2);
      expect(result.current.displayedCount).toBe(5);

      // Change filter function
      const newFilter = (item: MockItem) => item.type === 'withdrawal';
      rerender({ filterFn: newFilter });

      expect(result.current.page).toBe(1);
      expect(result.current.totalCount).toBe(5);
      expect(result.current.displayedCount).toBe(3);
      expect(result.current.visibleItems[0].type).toBe('withdrawal');
    });

    it('resets to page 1 automatically when items reference changes', () => {
      const initialItems = createItems(10);
      const { result, rerender } = renderHook(
        ({ itemList }) =>
          useWalletPagination({
            items: itemList,
            pageSize: 4,
          }),
        {
          initialProps: { itemList: initialItems },
        }
      );

      act(() => {
        result.current.loadMore();
      });
      expect(result.current.page).toBe(2);

      const nextItems = createItems(20);
      rerender({ itemList: nextItems });

      expect(result.current.page).toBe(1);
      expect(result.current.displayedCount).toBe(4);
      expect(result.current.totalCount).toBe(20);
    });
  });
});
