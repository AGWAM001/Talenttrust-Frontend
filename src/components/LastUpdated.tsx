'use client';

import React, { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/relativeTime';

/** How often the displayed relative time re-renders to stay fresh, in ms. */
export const LAST_UPDATED_TICK_MS = 60_000;

export interface LastUpdatedProps {
  /** When the data was last updated. Accepts the same shapes as formatRelativeTime. */
  updatedAt: string | Date | number | null | undefined;
  /** Optional additional class names for layout. */
  className?: string;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({ updatedAt, className = '' }) => {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), LAST_UPDATED_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const date = updatedAt instanceof Date ? updatedAt : typeof updatedAt === 'number' || typeof updatedAt === 'string' ? new Date(updatedAt) : null;
  const isValid = date !== null && !isNaN(date.getTime());
  const absolute = isValid ? date.toLocaleString() : null;

  const relative = formatRelativeTime(updatedAt);

  return (
    <span className={['text-xs text-gray-500', className].filter(Boolean).join(' ')} title={absolute ?? undefined}>
      <span aria-hidden="true">Updated {relative}</span>
      {isValid && <span className="sr-only">Data last updated {absolute}</span>}
    </span>
  );
};