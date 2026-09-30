'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import EmptyState from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { WalletBulkToolbar } from '../../components/wallet/WalletBulkToolbar';
import { WalletItemList } from '../../components/wallet/WalletItemList';
import { listWalletItems, saveWalletItem, updateWalletItem, deleteWalletItems } from '@/lib/repository';
import { useToast } from '@/components/toast/toast-provider';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Guard against concurrent/re-entrant delete confirmations. The ref is checked
  // and set synchronously before any state update so a second invocation in
  // the same tick cannot apply the delete twice.
  const deleteInFlightRef = useRef<boolean>(false);

  // Load from repository on mount, fallback to sample items if repository is empty
  useEffect(() => {
    const loaded = listWalletItems();
    if (loaded.length > 0) {
      setItems(loaded);
    } else {
      // Seed sample items into repository for initial demo
      SAMPLE_WALLET_ITEMS.forEach((item) => saveWalletItem(item));
      setItems(SAMPLE_WALLET_ITEMS);
    }
  }, []);

  // I1: Prune selection whenever items change. This keeps the selection set a
  // subset of the current item ids, even if a parent or storage event removes
  // items without going through our delete handler.
  useEffect(() => {
    const validIds = new Set(items.map((item) => item.id));
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

  const handleExportSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter((item) => selectedIds.has(item.id));
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
      description: `Exported ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} to JSON.`,
    });
  }, [items, selectedIds, showSuccess]);

  const handleRequestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    // I4: dedupe and only retain ids that actually exist.
    const validIds = new Set(items.map((item) => item.id));
    const targets = dedupeIds(Array.from(selectedIds)).filter((id) => validIds.has(id));
    if (targets.length === 0) return;
    setTargetDeleteIds(targets);
    setIsDeleteModalOpen(true);
  }, [items, selectedIds]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    // Ignore requests for items that are not present.
    if (!items.some((item) => item.id === id)) return;
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, [items]);

  const handleConfirmDelete = useCallback(() => {
    // I2: confirm is idempotent. If a delete is already in flight, ignore the
    // duplicate invocation and do not touch state.
    if (deleteInFlightRef.current) return;
    if (targetDeleteIds.length === 0) {
      setIsDeleteModalOpen(false);
      return;
    }

    const deleteIds = dedupeIds(targetDeleteIds);
    if (deleteIds.length === 0) {
      setIsDeleteModalOpen(false);
      setTargetDeleteIds([]);
      return;
    }

    deleteInFlightRef.current = true;

    // Snapshot only the affected items so a rollback cannot clobber concurrent
    // additions/edits to unrelated items.
    const deleteSet = new Set(deleteIds);
    const snapshot = items.filter((item) => deleteSet.has(item.id));

    setItems((prev) => prev.filter((item) => !deleteSet.has(item.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteIds.forEach((id) => next.delete(id));
      return next;
    });

    let ok = false;
    try {
      ok = deleteWalletItems(deleteIds);
    } catch {
      ok = false;
    }

    if (ok) {
      showSuccess({
        title: 'Items deleted',
        description: `Successfully deleted ${deleteIds.length} ${
          deleteIds.length === 1 ? 'item' : 'items'
        }.`,
      });
    } else {
      // Roll back only the affected items. If an item was re-added concurrently
      // with the same id, it is preserved and the snapshot copy is skipped.
      setItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const restored = snapshot.filter((item) => !existing.has(item.id));
        if (restored.length === 0) return prev;
        return [...restored, ...prev];
      });
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

    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
    deleteInFlightRef.current = false;
  }, [items, targetDeleteIds, showSuccess, showError]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, []);

  const handleEditItem = useCallback((id: string) => {
    // I: only allow editing an item that exists.
    if (!items.some((item) => item.id === id)) return;
    setEditingId(id);
  }, [items]);

  const handleSaveEdit = useCallback((id: string, updated: WalletItem) => {
    // Reject mismatched ids and non-existent items before hitting the repository.
    if (!updated || updated.id !== id) {
      showError({
        title: 'Update failed',
        description: 'The item id mismatched the edit request.',
      });
      return;
    }
    if (!items.some((item) => item.id === id)) {
      setEditingId(null);
      showError( {
        title: 'Update failed',
        description: 'The wallet item no longer exists.',
      });
      return;
    }

    let ok = false;
    try {
      ok = updateWalletItem(id, updated);
    } catch {
      ok = false;
    }

    if (ok) {
      const reloaded = listWalletItems();
      setItems(reloaded);
      setEditingId(null);
      showSuccess({
        title: 'Item updated',
        description: `"${updated.name}" has been updated successfully.`,
      });
    } else {
      showError({
        title: 'Update failed',
        description: 'Failed to save changes to the wallet item.',
      });
    }
  }, [items, showSuccess, showError]);

  const handleCancelEdit = useCallback((_id: string) => {
    setEditingId(null);
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
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </main>
  );
}
