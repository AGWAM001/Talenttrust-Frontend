'use client';

import { type RefObject, useEffect, useRef } from 'react';

export interface UseWalletFocusResult {
  connectButtonRef: RefObject<HTMLButtonElement | null>;
  connectedElementRef: RefObject<HTMLDivElement | null>;
}

export function useWalletFocus(address: string | null, isConnecting: boolean): UseWalletFocusResult {
  const connectButtonRef = useRef<HTMLButtonElement | null>(null);
  const connectedElementRef = useRef<HTMLDivElement | null>(null);

  const prevAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prevAddress = prevAddressRef.current;
    prevAddressRef.current = address;

    if (isConnecting) return;

    if (address !== null && prevAddress === null) {
      queueMicrotask(() => {
        connectedElementRef.current?.focus();
      });
    } else if (address === null && prevAddress !== null) {
      connectButtonRef.current?.focus();
    }
  }, [address, isConnecting]);

  return { connectButtonRef, connectedElementRef };
}
