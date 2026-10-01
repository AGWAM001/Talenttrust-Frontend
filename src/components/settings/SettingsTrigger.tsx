'use client';

import React, { useState, useRef, useMemo } from 'react';
import { SettingsPanel } from './SettingsPanel';
import { useRegisterCommandAction } from '@/components/CommandPalette';

export function SettingsTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Register the Settings dialog in the command palette.
  const settingsAction = useMemo(
    () => ({
      id: 'open-settings',
      label: 'Open Settings',
      keywords: ['settings', 'preferences', 'theme', 'config', 'currency'],
      section: 'Dialogs',
      onSelect: () => setIsOpen(true),
    }),
    [],
  );
  useRegisterCommandAction(settingsAction);

  const handleClose = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg hover:scale-110 transition-transform z-40 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
        aria-label="Open Settings"
      >
        <svg 
          aria-hidden="true"
          className="w-6 h-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
          />
        </svg>
      </button>

      <SettingsPanel isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
