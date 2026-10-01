'use client';

import React from 'react';

export function ToastSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg animate-pulse"
    >
      <div className="h-1.5 w-full bg-slate-200" />
      <div className="flex items-start gap-3 p-4">
        <div className="h-6 w-16 rounded-full bg-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-3/4 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-full rounded bg-slate-200" />
          <div className="mt-3 h-7 w-16 rounded-md bg-slate-200" />
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
