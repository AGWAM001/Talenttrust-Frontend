'use client';

import React, { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/relativeTime';

/** How often the displayed relative time re-renders to stay fresh, in ms. */
export const DIALOG_LAST_UPDATED_TICK_MS = 60_000;

export interface DialogLastUpdatedProps {
  /** When the underlying data was last updated. Accepts the same shapes as formatRelativeTime. */
  updatedAt: Date | string | number;
  /** Optional additional class names for layout. */
  className?: string;
}

/**
 * Shows how fresh a dialog's data is, e.g. "Updated 5 minutes ago".
 *
 * - Backed by the existing `formatRelativeTime` helper (stable, Intl-based formatter).
 * - Re-renders periodically so the relative text keeps advancing while the dialog stays open.
 * - Provides an accessible absolute-time alternative via `title` and visually-hidden text,
 *   since a bare relative string ("5 minutes ago") isn't precise enough for all users/assistive tech.
 */
export const DialogLastUpdated: React.FC<DialogLastUpdatedProps> = ({ updatedAt, className = '' }) => {
  // Re-render periodically so "5 minutes ago" keeps advancing without any other state change.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), DIALOG_LAST_UPDATED_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
  const isValid = !isNaN(date.getTime());
  const absolute = isValid ? date.toLocaleString() : null;

  return (
    <p className={['text-xs text-gray-500', className].filter(Boolean).join(' ')} title={absolute ?? undefined}>
      <span aria-hidden="true">Updated {formatRelativeTime(updatedAt)}</span>
      {isValid && <span className="sr-only">Data last updated {absolute}</span>}
    </p>
  );
};




// 'use client';

// import React, { useEffect, useState } from 'react';
// import { formatRelativeTime } from '@/lib/relativeTime';

// /** How often the displayed relative time re-renders to stay fresh, in ms. */
// export const DIALOG_LAST_UPDATED_TICK_MS = 60_000;

// export interface DialogLastUpdatedProps {
//   /** When the underlying data was last updated. Accepts the same shapes as formatRelativeTime. */
//   updatedAt: Date | string | number;
//   /** Optional additional class names for layout. */
//   className?: string;
// }

// /**
//  * Shows how fresh a dialog's data is, e.g. "Updated 5 minutes ago".
//  *
//  * - Backed by the existing `formatRelativeTime` helper (stable, Intl-based formatter).
//  * - Re-renders periodically so the relative text keeps advancing while the dialog stays open.
//  * - Provides an accessible absolute-time alternative via `title` and visually-hidden text,
//  *   since a bare relative string ("5 minutes ago") isn't precise enough for all users/assistive tech.
//  */
// export const DialogLastUpdated: React.FC<DialogLastUpdatedProps> = ({ updatedAt, className = '' }) => {
//   // Re-render periodically so "5 minutes ago" keeps advancing without any other state change.
//   const [, forceTick] = useState(0);
//   useEffect(() => {
//     const id = setInterval(() => forceTick((n) => n + 1), DIALOG_LAST_UPDATED_TICK_MS);
//     return () => clearInterval(id);
//   }, []);

//   const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
//   const isValid = !isNaN(date.getTime());
//   const absolute = isValid ? date.toLocaleString() : null;

//   return (
//     <p className={['text-xs text-gray-500', className].filter(Boolean).join(' ')} title={absolute ?? undefined}>
//       <span aria-hidden="true">Updated {formatRelativeTime(updatedAt)}</span>
//       {isValid && <span className="sr-only">Data last updated {absolute}</span>}
//     </p>
//   );
// };