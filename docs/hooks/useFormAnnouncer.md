# useFormAnnouncer

A hook for announcing form results to screen readers.

## Usage Example

```tsx
import { useFormAnnouncer } from '@/hooks/useFormAnnouncer';

function MyForm() {
  const { politeMessage, announce } = useFormAnnouncer();

  const handleSubmit = async () => {
    try {
      await saveData();
      announce({ message: 'Saved successfully!', type: 'success' });
    } catch {
      announce({ message: 'Save failed.', type: 'error' });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>...</form>
      <div className="sr-only" aria-live="polite">{politeMessage}</div>
    </>
  );
}