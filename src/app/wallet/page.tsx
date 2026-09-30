'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import EmptyState from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { WalletBulkToolbar } from '../../components/wallet/WalletBulkToolbar';
import { WalletItemList } from '../../components/wallet/WalletItemList';
import { listWalletItems, saveWalletItem, updateWalletItem, deleteWalletItems } from '@/lib/repository';
import { useToast } from '@/components/toast/toast-provider';
import { reportError } from '@/lib/errorReporter';
import type { WalletItem } from '@/types/domain';
import { SAMPLE_WALLET_ITEMS } from './constants';

export default function WalletPage() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const { showSuccess, showError } = useToast();

  // ---------------------------------------------------------------------------
  // Concurrency & Lockstep Synchronization Refs
  // ---------------------------------------------------------------------------
  // Synchronous mutex ref preventing duplicate in-flight requests or race conditions.
  const isMutatingRef = useRef<boolean>(false);
  // Mutable ref kept in strict lockstep with state so rapid sequential mutations
  // never build from stale closures.
  const itemsRef = useRef<WalletItem[]>([]);
  itemsRef.current = items;
  // Mount-guard ref preventing duplicate sample seeding under React StrictMode / double mount.
  const isMountedRef = useRef<boolean>(false);

  // Synchronous helper to update both the ref and queued React state in lockstep
  const commitItems = useCallback((next: WalletItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  // ---------------------------------------------------------------------------
  // Initial Mount & Seeding (Idempotent and Concurrency Safe)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    try {
      const loaded = listWalletItems();
      if (loaded && loaded.length > 0) {
        // Deduplicate in case of corrupt legacy state
        const seen = new Set<string>();
        const deduped: WalletItem[] = [];
        for (const item of loaded) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            deduped.push(item);
          }
        }
        commitItems(deduped);
      } else {
        // Seed sample items into repository for initial demo
        SAMPLE_WALLET_ITEMS.forEach((item) => saveWalletItem(item));
        commitItems(SAMPLE_WALLET_ITEMS);
      }
    } catch (err) {
      reportError(err, '[WalletPage] Failed to initialize wallet items.');
      commitItems(SAMPLE_WALLET_ITEMS);
    }
  }, [commitItems]);

  // ---------------------------------------------------------------------------
  // State Invariant: Prune selectedIds whenever items changes
  // Guarantees: selectedIds ⊆ {item.id | item ∈ items}
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(items.map((i) => i.id));
      let hasInvalid = false;
      for (const id of prev) {
        if (!validIds.has(id)) {
          hasInvalid = true;
          break;
        }
      }
      if (!hasInvalid) return prev;
      const pruned = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) {
          pruned.add(id);
        }
      }
      return pruned;
    });
  }, [items]);

  // ---------------------------------------------------------------------------
  // Selection Handlers
  // ---------------------------------------------------------------------------
  const handleToggleSelect = useCallback((id: string) => {
    if (isMutatingRef.current) return;
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
    if (isMutatingRef.current) return;
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

  // ---------------------------------------------------------------------------
  // Export Handler (Deterministic & Safe under Concurrent Changes)
  // ---------------------------------------------------------------------------
  const handleExportSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    // Re-verify against live items to avoid exporting concurrently deleted items
    const selectedItems = itemsRef.current.filter((item) => selectedIds.has(item.id));
    if (selectedItems.length === 0) return;

    const jsonStr = JSON.stringify(selectedItems, null, 2);

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback for non-browser or strict CSP environments
    }

    showSuccess({
      title: 'Export successful',
      description: `Exported ${selectedItems.length} ${
        selectedItems.length === 1 ? 'item' : 'items'
      } to JSON.`,
    });
  }, [selectedIds, showSuccess]);

  // ---------------------------------------------------------------------------
  // Deletion Handlers (Mutex Guarded, Idempotent, and Rollback Protected)
  // ---------------------------------------------------------------------------
  const handleRequestBulkDelete = useCallback(() => {
    if (isMutatingRef.current || selectedIds.size === 0) return;
    const validTargets = Array.from(selectedIds).filter((id) =>
      itemsRef.current.some((item) => item.id === id),
    );
    if (validTargets.length === 0) return;
    setTargetDeleteIds(validTargets);
    setIsDeleteModalOpen(true);
  }, [selectedIds]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    if (isMutatingRef.current) return;
    if (!itemsRef.current.some((item) => item.id === id)) return;
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    // In-flight mutex guard: reject duplicate clicks or concurrent invocations
    if (isMutatingRef.current || targetDeleteIds.length === 0) return;

    isMutatingRef.current = true;
    setIsMutating(true);

    const deleteIds = Array.from(new Set(targetDeleteIds));

    // Cancel inline editing if the active item is being deleted
    if (editingId && deleteIds.includes(editingId)) {
      setEditingId(null);
    }

    // Capture snapshot for rollback
    const previousItems = itemsRef.current;
    const remainingItems = previousItems.filter((item) => !deleteIds.includes(item.id));

    // Optimistically apply removal to ref and state
    commitItems(remainingItems);

    // Optimistically prune selection
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteIds.forEach((id) => next.delete(id));
      return next;
    });

    try {
      const result = deleteWalletItems(deleteIds);
      const ok = (result as unknown) instanceof Promise ? await result : result;

      if (ok) {
        showSuccess({
          title: 'Items deleted',
          description: `Successfully deleted ${deleteIds.length} ${
            deleteIds.length === 1 ? 'item' : 'items'
          }.`,
        });
      } else {
        // Rollback state on persistence failure
        commitItems(previousItems);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deleteIds.forEach((id) => next.add(id));
          return next;
        });
        showError({
          title: 'Delete failed',
          description: 'Failed to remove selected wallet items.',
        });
      }
    } catch (err) {
      reportError(err, '[WalletPage] Unexpected error during deleteWalletItems.');
      commitItems(previousItems);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteIds.forEach((id) => next.add(id));
        return next;
      });
      showError({
        title: 'Delete failed',
        description: 'Failed to remove selected wallet items.',
      });
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
      setIsDeleteModalOpen(false);
      setTargetDeleteIds([]);
    }
  }, [targetDeleteIds, editingId, commitItems, showSuccess, showError]);

  const handleCancelDelete = useCallback(() => {
    if (isMutatingRef.current) return;
    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Inline Editing Handlers (Concurrency Guarded)
  // ---------------------------------------------------------------------------
  const handleEditItem = useCallback((id: string) => {
    if (isMutatingRef.current) return;
    setEditingId(id);
  }, []);

  const handleSaveEdit = useCallback(
    async (id: string, updated: WalletItem) => {
      if (isMutatingRef.current) return;

      const existing = itemsRef.current.find((item) => item.id === id);
      if (!existing) {
        setEditingId(null);
        showError({
          title: 'Update failed',
          description: 'The wallet item no longer exists.',
        });
        return;
      }

      isMutatingRef.current = true;
      setIsMutating(true);

      const previousItems = itemsRef.current;
      const updatedItem = { ...existing, ...updated };

      // Optimistically update in lockstep
      const nextItems = previousItems.map((item) => (item.id === id ? updatedItem : item));
      commitItems(nextItems);

      try {
        const result = updateWalletItem(id, updatedItem);
        const ok = (result as unknown) instanceof Promise ? await result : result;

        if (ok) {
          setEditingId(null);
          showSuccess({
            title: 'Item updated',
            description: `"${updated.name}" has been updated successfully.`,
          });
        } else {
          // Rollback on update failure
          commitItems(previousItems);
          showError({
            title: 'Update failed',
            description: 'Failed to save changes to the wallet item.',
          });
        }
      } catch (err) {
        reportError(err, '[WalletPage] Unexpected error during updateWalletItem.');
        commitItems(previousItems);
        showError({
          title: 'Update failed',
          description: 'Failed to save changes to the wallet item.',
        });
      } finally {
        isMutatingRef.current = false;
        setIsMutating(false);
      }
    },
    [commitItems, showSuccess, showError],
  );

  const handleCancelEdit = useCallback((_id: string) => {
    setEditingId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Modal Labels (Memoized)
  // ---------------------------------------------------------------------------
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

      {items.length > 0 && (
        <WalletBulkToolbar
          selectedCount={selectedIds.size}
          onClearSelection={handleClearSelection}
          onExport={handleExportSelected}
          onDelete={handleRequestBulkDelete}
        />
      )}

      {items.length === 0 ? (
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
          editingId={editingId}
          onEditItem={handleEditItem}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title={deleteModalTitle}
        description={deleteModalDescription}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="destructive"
        isLoading={isMutating}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </main>
  );
}
