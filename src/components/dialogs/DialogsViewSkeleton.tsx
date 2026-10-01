import React from 'react';

export function DialogsViewSkeleton() {
  return (
    <div
      aria-hidden="true"
      aria-busy="true"
      className="flex flex-col gap-4 p-4 w-full animate-pulse"
      data-testid="dialogs-view-skeleton"
    >
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
  );
}
