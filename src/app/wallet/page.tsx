'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EmptyState from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { WalletBulkToolbar } from '../../components/wallet/WalletBulkToolbar';
import { WalletItemList } from '../../components/wallet/WalletItemList';
import { listWalletItems, saveWalletItem, deleteWalletItems } from '@/lib/repository';
import { useToast } from '@/components/toast/toast-provider';
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

export default function WalletPage() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Load from repository on mount, fallback to sample items if repository is empty
  // Deterministic recovery: atomic seeding to prevent partial persistence on failure
  useEffect(() => {
    try {
      const loaded = listWalletItems();
      if (loaded.length > 0) {
        setItems(loaded);
      } else {
        // Seed sample items atomically - all or nothing to prevent partial state
        let seedSuccess = false;
        try {
          SAMPLE_WALLET_ITEMS.forEach((item) => saveWalletItem(item));
          // Verify all items were persisted by re-reading
          const afterSeed = listWalletItems();
          if (afterSeed.length === SAMPLE_WALLET_ITEMS.length) {
            seedSuccess = true;
            setItems(SAMPLE_WALLET_ITEMS);
          } else {
            // Partial persistence detected - clear and retry
            console.error('[WalletPage] Partial seed detected, clearing repository');
            const { clearAppData } = require('@/lib/repository');
            clearAppData();
            SAMPLE_WALLET_ITEMS.forEach((item) => saveWalletItem(item));
            const retry = listWalletItems();
            if (retry.length === SAMPLE_WALLET_ITEMS.length) {
              seedSuccess = true;
              setItems(SAMPLE_WALLET_ITEMS);
            }
          }
        } catch (err) {
          console.error('[WalletPage] Failed to seed sample items:', err);
        }

        if (!seedSuccess) {
          setLoadError('Failed to initialize wallet data. Please refresh the page.');
          showError({
            title: 'Initialization failed',
            description: 'Could not load wallet data. Please refresh the page.',
          });
        }
      }
    } catch (err) {
      console.error('[WalletPage] Failed to load wallet items:', err);
      setLoadError('Failed to load wallet data. Please refresh the page.');
      showError({
        title: 'Load failed',
        description: 'Could not load wallet data. Please refresh the page.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length && items.length > 0) {
        return new Set();
      }
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExportSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
    const jsonStr = JSON.stringify(selectedItems, null, 2);
    
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showSuccess({
        title: 'Export successful',
        description: `Exported ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} to JSON.`,
      });
    } catch (err) {
      console.error('[WalletPage] Export failed:', err);
      showError({
        title: 'Export failed',
        description: 'Could not export wallet items. Your browser may have restrictions.',
      });
    }
  }, [items, selectedIds, showSuccess, showError]);

  const handleRequestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setTargetDeleteIds(Array.from(selectedIds));
    setIsDeleteModalOpen(true);
  }, [selectedIds]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (targetDeleteIds.length === 0) return;

    // Deterministic recovery: optimistic update with rollback on failure
    const previousItems = [...items];
    const previousSelectedIds = new Set(selectedIds);

    // Optimistically update UI
    const optimisticItems = items.filter((item) => !targetDeleteIds.includes(item.id));
    const optimisticSelectedIds = new Set(selectedIds);
    targetDeleteIds.forEach((id) => optimisticSelectedIds.delete(id));

    setItems(optimisticItems);
    setSelectedIds(optimisticSelectedIds);

    try {
      const ok = deleteWalletItems(targetDeleteIds);
      if (ok) {
        // Verify deletion by re-reading from repository
        const verified = listWalletItems();
        const expectedCount = previousItems.length - targetDeleteIds.length;
        
        if (verified.length === expectedCount) {
          showSuccess({
            title: 'Items deleted',
            description: `Successfully deleted ${targetDeleteIds.length} ${
              targetDeleteIds.length === 1 ? 'item' : 'items'
            }.`,
          });
        } else {
          // Repository state inconsistent - rollback and notify
          console.error('[WalletPage] Delete verification failed: count mismatch');
          setItems(previousItems);
          setSelectedIds(previousSelectedIds);
          showError({
            title: 'Delete verification failed',
            description: 'Could not verify deletion. Please refresh the page.',
          });
        }
      } else {
        // Delete failed - rollback optimistic update
        console.error('[WalletPage] Delete operation failed');
        setItems(previousItems);
        setSelectedIds(previousSelectedIds);
        showError({
          title: 'Delete failed',
          description: 'Failed to remove selected wallet items. Please try again.',
        });
      }
    } catch (err) {
      // Exception during delete - rollback optimistic update
      console.error('[WalletPage] Exception during delete:', err);
      setItems(previousItems);
      setSelectedIds(previousSelectedIds);
      showError({
        title: 'Delete failed',
        description: 'An error occurred while deleting items. Please try again.',
      });
    }

    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, [targetDeleteIds, items, selectedIds, showSuccess, showError]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, []);

  const deleteModalTitle = useMemo(() => {
    const count = targetDeleteIds.length;
    return count === 1 ? 'Delete wallet item?' : `Delete ${count} wallet items?`;
  }, [targetDeleteIds]);

  const deleteModalDescription = useMemo(() => {
    const count = targetDeleteIds.length;
    return count === 1
      ? 'Are you sure you want to delete this wallet item? This action cannot be undone.'
      : `Are you sure you want to delete the ${count} selected wallet items? This action cannot be undone.`;
  }, [targetDeleteIds]);

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Wallet Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your connected assets, security credentials, and escrow keys.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{loadError}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading wallet items...</p>
        </div>
      ) : items.length > 0 ? (
        <WalletBulkToolbar
          selectedCount={selectedIds.size}
          onClearSelection={handleClearSelection}
          onExport={handleExportSelected}
          onDelete={handleRequestBulkDelete}
        />
      ) : null}

      {isLoading ? null : items.length === 0 ? (
        <EmptyState
          illustration="contracts"
          title="No wallet items"
          description="Your wallet is empty. Items and tokens will appear here once connected."
        />
      ) : (
        <WalletItemList
          items={items}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onDeleteItem={handleRequestSingleDelete}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title={deleteModalTitle}
        description={deleteModalDescription}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </main>
  );
}
