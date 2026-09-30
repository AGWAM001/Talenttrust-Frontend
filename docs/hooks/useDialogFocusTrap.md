```markdown
# useDialogFocusTrap

A hook that traps focus inside a dialog for accessibility.

## Usage Example

```tsx
import { useRef } from 'react';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

function MyDialog({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: firstInputRef,
    onEscape: onClose,
    restoreFocus: true,
  });

  if (!isOpen) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true">
      <input ref={firstInputRef} />
      <button onClick={onClose}>Close</button>
    </div>
  );
}