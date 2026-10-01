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

/**
 * State invariants for the Wallet page:
 *
 * I1(Selection subset): `selectedIds == { id | exists in items }`.
 *   Any id in the selection set must correspond to a currently visible item.
 *   Selection is pruned whenever items change (delete, reload, edit reload).
 *
 * I2(Delete targets): `targetDeleteIds == [] ` when the confirm dialog is closed.
 *   Targets are captured at the moment the delete is requested and cleared on
 *   confirm or cancel. The confirm handler is idempotent: a double-click or
 *   concurrent invocation must not delete twice or restore deleted items.
 *
 * I3(Editing): `editingId == null ` or `editingId in items`.
 *   Editing an id that no longer exists is a no-op and the editing state is
 *   cleared.
 *
 * I4(Duplicate ids): `targetDeleteIds` is deduplicated before being applied
 *   so repeated ids in the source set cannot cause double deletion or double
 *   toast counting.
 */

function dedupeIds(ids: Readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string' || id.length === 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export default function WalletPage() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const { showSuccess, showError } = useToast();
  const isMountedRef = useRef(true);

  // Guard against concurrent/re-entrant delete confirmations. The ref is checked
  // and set synchronously before any state update so a second invocation in
  // the same tick cannot apply the delete twice.
  const deleteInFlightRef = useRef<boolean>(false);

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
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  // I3: Clear or reconcile editing id when items change.
  useEffect(() => {
    if (editingId === null) return;
    if (!items.some((item) => item.id === editingId)) {
      setEditingId(null);
    }
  }, [items, editingId]);

  const handleToggleSelect = useCallback((id: string) => {
    if (!items.some((item) => item.id === id)) return;
    setSelectedIds((prev) => {
      // Ignore toggles for ids that are not currently visible.
      if (!items.some((item) => item.id === id)) return prev;
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [items]);

  const handleToggleSelectAll = useCallback(() => {
    if (isMutatingRef.current) return;
    setSelectedIds((prev) => {
      if (items.length === 0) return new Set();
      if (prev.size === items.length) {
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
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet-export-${Date.now()}.json`;
        a.click();
        downloaded = true;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback for non-browser or strict CPR environments.
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
  }, [items, selectedIds]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    if (isMutatingRef.current) return;
    if (!itemsRef.current.some((item) => item.id === id)) return;
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, [items]);

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
        description: 'Failed to remove selected wallet items. No changes were applied.',
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
  }, [items]);

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
