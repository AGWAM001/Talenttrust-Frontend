'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import EmptyState from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { WalletBulkToolbar } from '../../components/wallet/WalletBulkToolbar';
import { WalletItemList } from '../../components/wallet/WalletItemList';
import { listWalletItems, saveWalletItem, updateWalletItem, deleteWalletItems } from '@/lib/repository';
import { reportError } from '@/lib/errorReporter';
import { useToast } from '@/components/toast/toast-provider';
import type { WalletItem } from '@/types/domain';
import { getSampleWalletItems } from './constants';

export default function WalletPage() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  // Guards the one-time repository seed so retries, React StrictMode
  // double-invocation, or a changing `showError` identity can never seed twice
  // and leave duplicate or partially-persisted state.
  const seededRef = useRef(false);

  // Load from repository on mount, seeding starter items only when empty.
  // The UI is driven strictly by what actually persisted, so a failed write
  // (e.g. localStorage quota) can never leave phantom items on screen or
  // silently diverge the rendered list from the store.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    const loaded = listWalletItems();
    if (loaded.length > 0) {
      setItems(loaded);
      return;
    }

    const seed = getSampleWalletItems();
    if (seed.length === 0) {
      setItems([]);
      return;
    }

    const persisted: WalletItem[] = [];
    let failedCount = 0;

    for (const item of seed) {
      const ok = saveWalletItem(item);
      if (ok === false) {
        failedCount += 1;
      } else {
        persisted.push(item);
      }
    }

    setItems(persisted);

    if (failedCount > 0) {
      // Counts only — never log wallet addresses or identifiers.
      reportError(
        new Error(`Failed to persist ${failedCount} of ${seed.length} starter wallet items.`),
        'WalletPage.seed',
        'warn',
        { failedCount, totalCount: seed.length },
      );
      showError({
        title: 'Wallet data partially unavailable',
        description: `Couldn't save ${failedCount} of ${seed.length} starter items. Your existing data is safe.`,
      });
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
    setTargetDeleteIds(Array.from(selectedIds));
    setIsDeleteModalOpen(true);
  }, [selectedIds]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (targetDeleteIds.length === 0) return;

    const snapshot = items;
    const deleteIds = targetDeleteIds;

    setItems((prev) => prev.filter((item) => !deleteIds.includes(item.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteIds.forEach((id) => next.delete(id));
      return next;
    });

    const ok = deleteWalletItems(deleteIds);
    if (ok) {
      showSuccess({
        title: 'Items deleted',
        description: `Successfully deleted ${deleteIds.length} ${
          deleteIds.length === 1 ? 'item' : 'items'
        }.`,
      });
    } else {
      setItems(snapshot);
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
  }, [items, targetDeleteIds, showSuccess, showError]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, []);

  const handleEditItem = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleSaveEdit = useCallback((id: string, updated: WalletItem) => {
    const ok = updateWalletItem(id, updated);
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
  }, [showSuccess, showError]);

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
