'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { WalletItem } from '@/types/domain';

const STATUS_OPTIONS: WalletItem['status'][] = ['Active', 'Archived', 'Pending'];

export interface EditableWalletRowProps {
  item: WalletItem;
  editing: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onSave: (id: string, updated: WalletItem) => void;
  onCancel: (id: string) => void;
  onDelete?: (id: string) => void;
}

const EditableWalletRow: React.FC<EditableWalletRowProps> = ({
  item,
  editing,
  selected,
  onToggleSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [name, setName] = useState(item.name);
  const [type, setType] = useState(item.type);
  const [balance, setBalance] = useState(String(item.balance));
  const [currency, setCurrency] = useState(item.currency);
  const [status, setStatus] = useState(item.status);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const nameId = useId();
  const typeId = useId();
  const balanceId = useId();
  const currencyId = useId();
  const statusId = useId();
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) {
      setName(item.name);
      setType(item.type);
      setBalance(String(item.balance));
      setCurrency(item.currency);
      setStatus(item.status);
      setError('');
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [editing, item]);

  const startEditing = () => {
    setError('');
    onEdit(item.id);
  };

  const cancelEditing = () => {
    setName(item.name);
    setType(item.type);
    setBalance(String(item.balance));
    setCurrency(item.currency);
    setStatus(item.status);
    setError('');
    setEditing(false, true);
  };

  const setEditing = (_editing: boolean, internalCancel?: boolean) => {
    if (internalCancel) {
      setAnnouncement('Edit cancelled.');
      onCancel(item.id);
    }
  };

  const validate = (): string | null => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return 'Name is required.';

    const trimmedType = type.trim();
    if (trimmedType.length === 0) return 'Type is required.';

    const trimmedCurrency = currency.trim();
    if (trimmedCurrency.length === 0) return 'Currency is required.';

    const parsedBalance = Number(balance);
    if (balance.trim().length === 0 || Number.isNaN(parsedBalance)) return 'Balance must be a valid number.';
    if (parsedBalance < 0) return 'Balance cannot be negative.';

    return null;
  };

  const saveEditing = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      nameInputRef.current?.focus();
      return;
    }

    const updated: WalletItem = {
      ...item,
      name: name.trim(),
      type: type.trim(),
      balance: Number(balance),
      currency: currency.trim(),
      status,
    };

    onSave(item.id, updated);
    setError('');
    setAnnouncement(`"${name.trim()}" updated.`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  const handleBalanceChange = (value: string) => {
    setBalance(value);
    if (error) setError('');
  };

  const liveRegion = (
    <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </span>
  );

  if (!editing) {
    return (
      <tr
        key={item.id}
        data-testid={`wallet-item-row-${item.id}`}
        data-selected={selected || undefined}
        className={`transition-colors hover:bg-slate-50/80 focus-within:bg-slate-100/80 dark:hover:bg-slate-800/40 dark:focus-within:bg-slate-800/60 ${
          selected ? 'bg-blue-50/40 dark:bg-slate-800/60' : ''
        }`}
      >
        <td className="w-12 px-4 py-4 text-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Select ${item.name}`}
            data-testid={`select-item-checkbox-${item.id}`}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          />
        </td>
        <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">
          {item.name}
          {item.address && (
            <span className="block font-mono text-xs text-slate-400 truncate max-w-[160px]">
              {item.address}
            </span>
          )}
        </td>
        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.type}</td>
        <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100">
          {item.balance.toLocaleString()} {item.currency}
        </td>
        <td className="px-4 py-4">
          <span
            data-wallet-status={item.status}
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              item.status === 'Active'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : item.status === 'Pending'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {item.status}
          </span>
        </td>
        <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{item.createdAt}</td>
        <td className="px-4 py-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              ref={editButtonRef}
              type="button"
              onClick={startEditing}
              aria-label={`Edit ${item.name}`}
              data-testid={`edit-item-btn-${item.id}`}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950/50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:hover:bg-rose-950/50"
                aria-label={`Delete ${item.name}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      key={item.id}
      data-testid={`wallet-item-row-${item.id}`}
      data-editing="true"
      className="bg-blue-50/60 transition-colors dark:bg-blue-950/30"
      onKeyDown={handleKeyDown}
    >
      <td className="w-12 px-4 py-4 text-center">
        <input
          type="checkbox"
          checked={selected}
          disabled
          aria-label={`Select ${name}`}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 opacity-50 dark:border-slate-700 dark:bg-slate-800"
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="sr-only">Name</label>
          <input
            id={nameId}
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            aria-label="Item name"
            data-testid={`edit-name-input-${item.id}`}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {item.address && (
            <span className="block font-mono text-xs text-slate-400 truncate max-w-[160px]">
              {item.address}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <label htmlFor={typeId} className="sr-only">Type</label>
        <input
          id={typeId}
          type="text"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            if (error) setError('');
          }}
          aria-label="Item type"
          data-testid={`edit-type-input-${item.id}`}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <label htmlFor={balanceId} className="sr-only">Balance</label>
          <input
            id={balanceId}
            type="text"
            inputMode="decimal"
            value={balance}
            onChange={(e) => handleBalanceChange(e.target.value)}
            aria-label="Balance"
            data-testid={`edit-balance-input-${item.id}`}
            className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <label htmlFor={currencyId} className="sr-only">Currency</label>
          <input
            id={currencyId}
            type="text"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              if (error) setError('');
            }}
            aria-label="Currency"
            data-testid={`edit-currency-input-${item.id}`}
            className="w-16 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </td>
      <td className="px-4 py-4">
        <label htmlFor={statusId} className="sr-only">Status</label>
        <select
          id={statusId}
          value={status}
          onChange={(e) => setStatus(e.target.value as WalletItem['status'])}
          aria-label="Status"
          data-testid={`edit-status-select-${item.id}`}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">{item.createdAt}</td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={cancelEditing}
            aria-label={`Cancel editing ${name}`}
            data-testid={`cancel-edit-btn-${item.id}`}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEditing}
            aria-label={`Save ${name}`}
            data-testid={`save-edit-btn-${item.id}`}
            className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-600" data-testid={`edit-error-${item.id}`}>
            {error}
          </p>
        )}
      </td>
      {liveRegion}
    </tr>
  );
};

export default EditableWalletRow;
