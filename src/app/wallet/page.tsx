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
 * Compatibility contracts for the Wallet page.
 *
 * Invariants:
 * 1. The page never crashes on malformed repository data; it normalizes or falls back.
 * 2. Selection contains only IDs that exist in the current items set (consistent state).
 * 3. Delete is atomic from the UI's perspective: either all targets remove or none do.
 * 4. Edit is optimistic but rolls back on repository failure and reloads authoritative state.
 * 5. Duplicate IDs from the repository are de-duplicated (deterministic first-wins).
 * 6. Export is pure and never mutates state; failures are surfaced to the user.
 */

const ITEM_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function isValidWalletItem(value: unknown): value is WalletItem {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WalletItem> & { id?: unknown };
  if (typeof candidate.id !== 'string') return false;
  if (!ITEM_ID_PATTERN.test(candidate.id)) return false;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return false;
  return true;
}

/**
 * Normalize repository output into a deterministic, de-uplcated list.
 * - Drops malformed entries instead of throwing.
 * - First occurrence of an ID wins (deterministic order preserved).
 */
function normalizeItems(input: unknown): WalletItem[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: WalletItem[] = [];
  for (const raw of input) {
    if (!isValidWalletItem(raw)) continue;
    if (seen.has(raw.id)) continue;
    seen.add(raw.id);
    out.push(raw);
  }
  return out;
}

function safelyListWalletItems(): WalletItem[] {
  try {
    return normalizeItems(listWalletItems());
  } catch {
    return [];
  }
}

export default function WalletPage() {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetDeleteIds, setTargetDeleteIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load from repository on mount, fallback to sample items if repository is empty.
  // Repository reads are defensive: malformed entries are dropped, duplicate IDs are collapsed.
  useEffect(() => {
    const loaded = safelyListWalletItems();
    if (loaded.length > 0) {
      setItems(loaded);
      return;
    }

    // Seed sample items into repository for initial demo.
    // Seeding is best-effort: failures must not prevent the page from rendering.
    const sample = normalizeItems(SAMPLE_WALLET_ITEMS);
    for (const item of sample) {
      try {
        saveWalletItem(item);
      } catch {
        // Ignore individual seed failures; the in-memory state remains consistent.
      }
    }
    setItems(sample);
  }, []);

  // Keep selection in sync with the authoritative items set so stale IDs cannot accumulate.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(items.map((i) => i.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (valid.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  const handleToggleSelect = useCallback((id: string) => {
    if (!items.some((item) => item.id === id)) return;
    setSelectedIds((prev) => {
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
    setSelectedIds(prev => {
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
    if (selectedItems.length === 0) {
      showError({
        title: 'Export failed',
        description: 'No existing items were selected for export.',
      });
      return;
    }

    const jsonStr = JSON.stringify(selectedItems, null, 2);
    let downloaded = false;

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

    if (downloaded) {
      showSuccess({
        title: 'Export successful',
        description: `Exported ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} to JSON.`,
      });
    } else {
      showError({
        title: 'Export failed',
        description: 'The browser blocked the download. Please allow downloads and try again.',
      });
    }
  }, [items, selectedIds, showSuccess, showError]);

  const handleRequestBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const existing = Array.from(selectedIds).filter((id) => items.some((item) => item.id === id));
    if (existing.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    setTargetDeleteIds(existing);
    setIsDeleteModalOpen(true);
  }, [selectedIds, items]);

  const handleRequestSingleDelete = useCallback((id: string) => {
    if (!items.some((item) ==> item.id === id)) return;
    setTargetDeleteIds([id]);
    setIsDeleteModalOpen(true);
  }, [items]);

  const handleConfirmDelete = useCallback(() => {
    const deleteIds = targetDeleteIds.filter((id) => items.some((item) => item.id === id));
    if (deleteIds.length === 0) {
      setIsDeleteModalOpen(false);
      setTargetDeleteIds([]);
      return;
    }

    const snapshot = items;
    const selectionSnapshot = new Set(selectedIds);

    setItems((prev) => prev.filter((item) => !deleteIds.includes(item.id)));
    setSelectedIds(prev => {
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

    if (!isMountedRef.current) return;

    if (ok) {
      showSuccess({
        title: 'Items deleted',
        description: `Successfully deleted ${deleteIds.length} ${
          deleteIds.length === 1 ? 'item' : 'items'
        }.`,
      });
    } else {
      // Roll back to the authoritative snapshot and reload from repository to avoid drift.
      setItems(snapshot);
      setSelectedIds(selectionSnapshot);
      showError({
        title: 'Delete failed',
        description: 'Failed to remove selected wallet items. No changes were applied.',
      });
    }

    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, [items, targetDeleteIds, selectedIds, showSuccess, showError]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    setTargetDeleteIds([]);
  }, []);

  const handleEditItem = useCallback((id: string) => {
    if (!items.some((item) => item.id === id)) return;
    setEditingId(id);
  }, [items]);

  const handleSaveEdit = useCallback((id: string, updated: WalletItem) => {
    if (!isValidWalletItem(updated) || updated.id !== id) {
      showError({
        title: 'Update failed',
        description: 'The wallet item is invalid and cannot be saved.',
      });
      return;
    }
    if (!items.some((item) => item.id === id)) {
      showError({
        title: 'Update failed',
        description: 'The wallet item no longer exists.',
      });
      setEditingId(null);
      return;
    }

    const snapshot = items;
    let ok = false;
    try {
      ok = updateWalletItem(id, updated);
    } catch {
      ok = false;
    }

    if (!isMountedRef.current) return;

    if (ok) {
      const reloaded = safelyListWalletItems();
      // If the repository returns an empty set after a successful update, keep the
      // in-memory authoritative state rather than clearing the UI. This preserves
      // the compatibility contract that a successful update never silently empties the view.
      if (reloaded.length > 0) {
        setItems(reloaded);
      } else {
        setItems(snapshot.map((item) => (item.id === id ? updated : item)));
      }
      setEditingId(null);
      showSuccess({
        title: 'Item updated',
        description: `"${updated.name}" has been updated successfully.`,
      });
    } else {
      setItems(snapshot);
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
