import {
  normalizePageSize,
  paginateWalletItems,
} from '../walletPagination';

interface MockWalletItem {
  id: string;
  name: string;
  category: string;
}

function generateItems(count: number, category = 'payment'): MockWalletItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `Wallet Transaction ${i + 1}`,
    category,
  }));
}

describe('normalizePageSize', () => {
  it('returns default page size 10 when value is undefined, invalid, or less than 1', () => {
    expect(normalizePageSize()).toBe(10);
    expect(normalizePageSize(undefined)).toBe(10);
    expect(normalizePageSize(0)).toBe(10);
    expect(normalizePageSize(-5)).toBe(10);
    expect(normalizePageSize(NaN)).toBe(10);
    expect(normalizePageSize('invalid' as unknown as number)).toBe(10);
  });

  it('floors positive decimal numbers and respects valid page sizes', () => {
    expect(normalizePageSize(5)).toBe(5);
    expect(normalizePageSize(15.8)).toBe(15);
    expect(normalizePageSize(1)).toBe(1);
  });
});

describe('paginateWalletItems', () => {
  describe('First page behavior', () => {
    it('returns first page items according to page size limit', () => {
      const items = generateItems(12);
      const result = paginateWalletItems({ items, page: 1, pageSize: 5 });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalCount).toBe(12);
      expect(result.displayedCount).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.visibleItems).toEqual(items.slice(0, 5));
    });

    it('defaults to page 1 and page size 10 when optional params are omitted', () => {
      const items = generateItems(15);
      const result = paginateWalletItems({ items });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalCount).toBe(15);
      expect(result.displayedCount).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.visibleItems).toEqual(items.slice(0, 10));
    });
  });

  describe('Load-more append behavior', () => {
    it('accumulates visible items across pages (page 2, page 3)', () => {
      const items = generateItems(12);

      const page1 = paginateWalletItems({ items, page: 1, pageSize: 5 });
      expect(page1.displayedCount).toBe(5);
      expect(page1.hasMore).toBe(true);

      const page2 = paginateWalletItems({ items, page: 2, pageSize: 5 });
      expect(page2.displayedCount).toBe(10);
      expect(page2.hasMore).toBe(true);
      expect(page2.visibleItems).toEqual(items.slice(0, 10));

      const page3 = paginateWalletItems({ items, page: 3, pageSize: 5 });
      expect(page3.displayedCount).toBe(12);
      expect(page3.hasMore).toBe(false);
      expect(page3.visibleItems).toEqual(items);
    });
  });

  describe('End-of-list & boundary behaviors', () => {
    it('handles empty item list gracefully', () => {
      const result = paginateWalletItems({ items: [], page: 1, pageSize: 5 });

      expect(result.page).toBe(1);
      expect(result.totalCount).toBe(0);
      expect(result.displayedCount).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.visibleItems).toEqual([]);
    });

    it('handles item list smaller than page size', () => {
      const items = generateItems(3);
      const result = paginateWalletItems({ items, page: 1, pageSize: 5 });

      expect(result.page).toBe(1);
      expect(result.totalCount).toBe(3);
      expect(result.displayedCount).toBe(3);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.visibleItems).toEqual(items);
    });

    it('handles exact page boundary without extra page', () => {
      const items = generateItems(10);
      const page1 = paginateWalletItems({ items, page: 1, pageSize: 5 });
      expect(page1.hasMore).toBe(true);

      const page2 = paginateWalletItems({ items, page: 2, pageSize: 5 });
      expect(page2.page).toBe(2);
      expect(page2.totalPages).toBe(2);
      expect(page2.displayedCount).toBe(10);
      expect(page2.hasMore).toBe(false);
    });

    it('clamps page to max totalPages when page is out of upper bounds', () => {
      const items = generateItems(12); // 3 pages of size 5
      const result = paginateWalletItems({ items, page: 99, pageSize: 5 });

      expect(result.page).toBe(3);
      expect(result.displayedCount).toBe(12);
      expect(result.hasMore).toBe(false);
    });

    it('clamps page to 1 when page requested is less than 1', () => {
      const items = generateItems(10);
      const result = paginateWalletItems({ items, page: -2, pageSize: 5 });

      expect(result.page).toBe(1);
      expect(result.displayedCount).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('handles non-array inputs safely', () => {
      const result = paginateWalletItems({ items: null as unknown as MockWalletItem[] });
      expect(result.totalCount).toBe(0);
      expect(result.visibleItems).toEqual([]);
    });
  });

  describe('Filtering behavior', () => {
    it('filters items prior to pagination and calculates totalCount correctly', () => {
      const items = [
        ...generateItems(4, 'payment'),
        ...generateItems(6, 'escrow'),
      ];

      const result = paginateWalletItems({
        items,
        page: 1,
        pageSize: 3,
        filter: (item) => item.category === 'escrow',
      });

      expect(result.totalCount).toBe(6);
      expect(result.displayedCount).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(result.visibleItems.every((item) => item.category === 'escrow')).toBe(true);
    });
  });
});
