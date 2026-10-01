/**
 * @file walletPagination.ts
 *
 * Deterministic pagination and load-more helpers for wallet data, transaction lists,
 * and escrow history.
 *
 * Provides pure functions to paginate item arrays, handle load-more page appends,
 * compute boundary conditions, and apply filtering with automatic state reset.
 */

export interface WalletPaginationParams<T> {
  /** The full collection of items to paginate. */
  items: T[];
  /** Current active page number (1-indexed). Defaults to 1. */
  page?: number;
  /** Number of items to display per page. Defaults to 10. */
  pageSize?: number;
  /** Optional filter function to apply to items before paginating. */
  filter?: (item: T) => boolean;
}

export interface WalletPaginationState<T> {
  /** Items visible up to the current page (accumulated visible list). */
  visibleItems: T[];
  /** Total items matching the current filter condition. */
  totalCount: number;
  /** Number of items currently visible. */
  displayedCount: number;
  /** Current page number (1-indexed). */
  page: number;
  /** Total number of available pages based on filtered items and page size. */
  totalPages: number;
  /** Configured page size. */
  pageSize: number;
  /** `true` if more items are available to be loaded via `loadMore()`. */
  hasMore: boolean;
}

/**
 * Normalizes page size to a positive integer (minimum 1, default 10).
 *
 * @param pageSize - Candidate page size value.
 * @returns Valid positive integer page size.
 */
export function normalizePageSize(pageSize?: number): number {
  if (typeof pageSize !== 'number' || Number.isNaN(pageSize) || pageSize < 1) {
    return 10;
  }
  return Math.floor(pageSize);
}

/**
 * Computes deterministic pagination state for a set of items.
 *
 * Handles:
 * - First page calculation
 * - Accumulated load-more items up to `page * pageSize`
 * - Filter application
 * - End-of-list boundary checks (`hasMore`)
 * - Safe handling of empty arrays and edge cases
 *
 * @param params - Pagination parameters including items, page, pageSize, and filter.
 * @returns Deterministic WalletPaginationState object.
 */
export function paginateWalletItems<T>(params: WalletPaginationParams<T>): WalletPaginationState<T> {
  const rawItems = Array.isArray(params.items) ? params.items : [];
  const normalizedPageSize = normalizePageSize(params.pageSize);

  // Filter items if filter function provided
  const filteredItems = params.filter
    ? rawItems.filter(params.filter)
    : rawItems;

  const totalCount = filteredItems.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / normalizedPageSize) : 0;

  // Clamp requested page between 1 and totalPages (or 1 if totalPages is 0)
  const requestedPage = typeof params.page === 'number' && !Number.isNaN(params.page) ? Math.floor(params.page) : 1;
  const currentPage = totalPages > 0 ? Math.min(Math.max(1, requestedPage), totalPages) : 1;

  // Calculate visible items count (accumulated load-more style: 1 * pageSize, 2 * pageSize, etc.)
  const targetCount = currentPage * normalizedPageSize;
  const visibleItems = filteredItems.slice(0, targetCount);
  const displayedCount = visibleItems.length;

  const hasMore = displayedCount < totalCount;

  return {
    visibleItems,
    totalCount,
    displayedCount,
    page: currentPage,
    totalPages,
    pageSize: normalizedPageSize,
    hasMore,
  };
}
