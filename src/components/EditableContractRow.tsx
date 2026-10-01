'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { Contract } from '@/types/domain';
import type { StatusType } from './StatusBadge';

const STATUS_OPTIONS: StatusType[] = ['Active', 'Completed', 'Disputed', 'Pending', 'Paid'];

export interface EditableContractRowProps {
  contract: Contract;
  /**
   * Called with the contract's original name and the edited contract when a
   * valid save is committed. The original name lets the caller locate the row
   * even when the name itself was changed.
   */
  onSave: (originalName: string, updated: Contract) => void;
}

/**
 * A contracts list row that can switch into an inline edit mode with
 * save/cancel. Editing validates the name before saving, is keyboard
 * accessible (Escape cancels), and announces the outcome to assistive tech.
 */
const EditableContractRow: React.FC<EditableContractRowProps> = ({ contract, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contract.contractName);
  const [status, setStatus] = useState<StatusType>(contract.status);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const nameId = useId();
  const statusId = useId();
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      nameInputRef.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setName(contract.contractName);
    setStatus(contract.status);
    setError('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
    setAnnouncement('Edit cancelled.');
  };

  const saveEditing = () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Contract name is required.');
      nameInputRef.current?.focus();
      return;
    }

    onSave(contract.contractName, { ...contract, contractName: trimmedName, status });
    setEditing(false);
    setError('');
    setAnnouncement(`Contract "${trimmedName}" updated.`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  const liveRegion = (
    <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </span>
  );

  if (!editing) {
    return (
      <li className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900">{contract.contractName}</p>
            <p className="text-sm text-slate-500">
              {contract.status} · Created {contract.createdAt}
            </p>
          </div>
          <button
            type="button"
            onClick={startEditing}
            aria-label={`Edit ${contract.contractName}`}
            className="rounded-2xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Edit
          </button>
        </div>
        {liveRegion}
      </li>
    );
  }

  return (
    <li
      className="rounded-3xl border border-blue-200 bg-white p-4 shadow-sm"
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="text-sm font-medium text-slate-700">
            Contract name
          </label>
          <input
            id={nameId}
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError('');
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          />
          {error && (
            <p id={errorId} role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={statusId} className="text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id={statusId}
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusType)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelEditing}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEditing}
            className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Save
          </button>
        </div>
      </div>
      {liveRegion}
    </li>
  );
};

export default EditableContractRow;
