'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * RouteAnnouncer — client component that improves screen-reader UX during
 * client‑side navigation.
 *
 * On every `pathname` change the component:
 *  1. Focuses the `<main>` landmark (which must have `tabIndex={-1}`).
 *  2. Announces the new page title through a visually hidden `role="status"`
 *     region so assistive technology users know the page has changed.
 *
 * The announcement text is read from the first `<h1>` element on the page,
 * falling back to `"Page: <pathname>"` when no `<h1>` is found.
 *
 * @example
 * // Mount inside the root layout (already inside a client component boundary):
 * <RouteAnnouncer />
 */
export default function RouteAnnouncer() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    const main = document.querySelector<HTMLElement>('main');
    requestAnimationFrame(() => {
      main?.focus();
    });

    const h1 = document.querySelector('h1');
    const title = h1?.textContent?.trim() || `Page: ${pathname}`;
    setAnnouncement(`Navigated to ${title}`);
  }, [pathname]);

  return (
    <div role="status" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
