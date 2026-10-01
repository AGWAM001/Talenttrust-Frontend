import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  paginateWalletItems,
  WalletPaginationState,
} from '@/lib/walletPagination';

export interface UseWalletPaginationOptions<T> {
  /** Full array of items. */
  items: T[];
  /** Page size limit per page. Defaults to 10. */
  pageSize?: number;
  /** Optional filter function. */
  filter?: (item: T) => boolean;
}

export interface UseWalletPaginationReturn<T> extends WalletPaginationState<T> {
  /** Loads the next page of items by incrementing the visible page. */
  loadMore: () => void;
  /** Resets pagination state back to page 1. */
  reset: () => void;
}

/**
 * React hook to manage deterministic pagination / load-more behavior for wallet items.
 *
 * Supports:
 * - First page initial load
 * - Incremental load-more appends
 * - End-of-list boundary detection
 * - Automatic reset on filter or items change
 * - Manual reset method
 *
 * @param options - Options for pagination including items, pageSize, and filter.
 * @returns Pagination state and control functions.
 */
export function useWalletPagination<T>(
  options: UseWalletPaginationOptions<T>
): UseWalletPaginationReturn<T> {
  const { items, pageSize = 10, filter } = options;
  const [page, setPage] = useState(1);

  // Keep track of previous filter/items references to detect changes and reset
  const prevFilterRef = useRef(filter);
  const prevItemsRef = useRef(items);

  useEffect(() => {
    if (prevFilterRef.current !== filter || prevItemsRef.current !== items) {
      prevFilterRef.current = filter;
      prevItemsRef.current = items;
      setPage(1);
    }
  }, [filter, items]);

  const paginationState = useMemo(() => {
    return paginateWalletItems({
      items,
      page,
      pageSize,
      filter,
    });
  }, [items, page, pageSize, filter]);

  const loadMore = useCallback(() => {
    setPage((prevPage) => {
      // If we already reached or exceeded totalPages, don't increment
      if (!paginationState.hasMore) {
        return prevPage;
      }
      return prevPage + 1;
    });
  }, [paginationState.hasMore]);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    ...paginationState,
    loadMore,
    reset,
  };
}
