'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EmptyState from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { WalletBulkToolbar } from '../../components/wallet/WalletBulkToolbar';
import { WalletItemList } from '../../components/wallet/WalletItemList';
import { listWalletItems, saveWalletItem, updateWalletItem, deleteWalletItems } from '@/lib/repository';
import { useToast } from '@/components/toast/toast-provider';
import type { WalletItem } from '@/types/domain';
import { SAMPLE_WALLET_ITEMS } from './constants';

/**
 * Validation boundaries for wallet page inputs.
 *
 * Invariants enforced here:
 * - IDs are non-empty strings; duplicate IDs are rejected at the boundary.
 * - Names are trimmed, non-empty, and bounded by MAX_NAME_LENGTH.
 * - Bulk operations are capped at MAX_BULK_SIZE to prevent unbounded work.
 * - Selection state only ever contains IDs that exist in the current item set.
 * - All boundary helpers are pure and deterministic so they can be unit tested.
 */
export const MAX_NAME_LENGTH = 120;
export const MAX_BULK_SIZE = 500;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0;
}

export function validateName(raw: unknown): ValidationResult<string> {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'Name must be a string.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'Name cannot be empty.' };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      reason: `Name cannot exceed ${MAX_NAME_LENGTH} characters.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function validateWalletItem(item: unknown): ValidationResult<WalletItem> {
  if (!item || typeof item !== 'object') {
    return { ok: false, reason: 'Wallet item must be an object.' };
  }
  const candidate = item as Partial<WalletItem>;
  if (!isValidId(candidate.id)) {
    return { ok: false, reason: 'Wallet item id is required.' };
  }
  const nameResult = validateName(candidate.name);
  if (!nameResult.ok) {
    return nameResult;
  }
  return {
    ok: true,
    value: { ...(candidate as WalletItem), id: candidate.id, name: nameResult.value },
  };
}

export function dedupeIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!isValidId(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function validateBulkIds(
  ids: readonly string[],
  knownIds: ReadonlySet<string>,
): ValidationResult<string[]> {
  const unique = dedupeIds(ids);
  if (unique.length === 0) {
    return { ok: false, reason: 'No valid items selected.' };
  }
  if (unique.length > MAX_BULK_SIZE) {
    return {
      ok: false,
      reason: `Cannot operate on more than ${MAX_BULK_SIZE} items at once.`,
    };
  }
  const unknown = unique.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    return {
      ok: false,
      reason: `Unknown wallet item id(s): ${unknown.join(', ')}.`,
    };
  }
  return { ok: true, value: unique };
}

export function sanitizeSelection(
  selection: ReadonlySet<string>,
  knownIds: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();
  selection.forEach((id) => {
    if (isValidId(id) && knownIds.has(id)) {
      next.add(id);
    }
  });
  return next;
}

export default function WalletPage() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const knownIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  // Keep selection bounded to IDs that still exist. This protects against
  // stale selections after deletes, reloads, or external mutations.
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = sanitizeSelection(prev, knownIds);
      if (next.size === prev.size) {
        let same = true;
        prev.forEach((id) => {
          if (!next.has(id)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
  }, [knownIds]);

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

  const handleToggleSelect = useCallback((id: string) => {
    if (!isValidId(id)) {
      showError({
        title: 'Invalid selection',
        description: 'The selected wallet item id is not valid.',
      });
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [showError]);

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
    const validation = validateBulkIds(Array.from(selectedIds), knownIds);
    if (!validation.ok) {
      showError({ title: 'Export rejected', description: validation.reason });
      return;
    }
    const selectedItems = items.filter((item) => validation.value.includes(item.id));
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
  }, [items, selectedIds, knownIds, showSuccess, showError]);

  const handleRequestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setTargetDeleteIds(Array.from(selectedIds));
    setIsDeleteModalOpen(true);
  }, [selectedIds]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    if (!isValidId(id) || !knownIds.has(id)) {
      showError({
        title: 'Delete rejected',
        description: 'The wallet item could not be found.',
      });
      return;
    }
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, [knownIds, showError]);

  const handleConfirmDelete = useCallback(() => {
    if (targetDeleteIds.length === 0) return;

    const snapshot = items;
    const deleteIds = targetDeleteIds;

    const validation = validateBulkIds(deleteIds, knownIds);
    if (!validation.ok) {
      showError({ title: 'Delete rejected', description: validation.reason });
      setIsDeleteModalOpen(false);
      setTargetDeleteIds([]);
      return;
    }
    const safeDeleteIds = validation.value;

    setItems((prev) => prev.filter((item) => !deleteIds.includes(item.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteIds.forEach((id) => next.delete(id));
      return next;
    });

    const ok = deleteWalletItems(safeDeleteIds);
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
  }, [items, targetDeleteIds, knownIds, showSuccess, showError]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, []);

  const handleEditItem = useCallback((id: string) => {
    if (!isValidId(id) || !knownIds.has(id)) {
      showError({
        title: 'Edit rejected',
        description: 'The wallet item could not be found.',
      });
      return;
    }
    setEditingId(id);
  }, [knownIds, showError]);

  const handleSaveEdit = useCallback((id: string, updated: WalletItem) => {
    if (!isValidId(id) || !knownIds.has(id)) {
      showError({
        title: 'Update rejected',
        description: 'The wallet item could not be found.',
      });
      return;
    }
    const validation = validateWalletItem({ ...updated, id });
    if (!validation.ok) {
      showError({ title: 'Update rejected', description: validation.reason });
      return;
    }
    const ok = updateWalletItem(id, validation.value);
    if (ok) {
      const reloaded = listWalletItems();
      setItems(reloaded);
      setEditingId(null);
      showSuccess({
        title: 'Item updated',
        description: `"${validation.value.name}" has been updated successfully.`,
      });
    } else {
      showError({
        title: 'Update failed',
        description: 'Failed to save changes to the wallet item.',
      });
    }
  }, [knownIds, showSuccess, showError]);

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
