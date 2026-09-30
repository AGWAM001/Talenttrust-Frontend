# Milestones Hooks

Reference for custom React hooks used in the Milestones domain.

---

## `useOptimisticMilestoneMutation`

A hook that applies milestone mutations (create, update, delete) optimistically to the UI and rolls back if persistence fails.

### Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| `milestones` | `Milestone[]` | The current list of milestones from React state. |
| `setMilestones` | `React.Dispatch<React.SetStateAction<Milestone[]>>` | State setter used to apply optimistic changes and rollbacks. |

### Returns

Returns an object containing three mutation functions:

| Property | Type | Description |
|----------|------|-------------|
| `optimisticCreate` | `(milestone: Milestone) => OptimisticResult` | Adds a milestone optimistically. |
| `optimisticUpdate` | `(id: string, patch: Partial<Milestone>) => OptimisticResult` | Updates an existing milestone optimistically. |
| `optimisticDelete` | `(ids: string[]) => OptimisticResult` | Deletes milestones optimistically by ID. |

### `OptimisticResult` (States)

The mutation functions return an object indicating success or failure.

| State | Shape | Description |
|-------|-------|-------------|
| Success | `{ ok: true }` | The mutation succeeded and the optimistic change is committed. |
| Failure | `{ ok: false, stale: boolean, error: string }` | The mutation failed, the UI rolled back. `stale` indicates if the error was due to an out-of-date version. |

### Usage Example

```tsx
import { useState } from 'react';
import { useOptimisticMilestoneMutation } from '@/hooks/useOptimisticMilestoneMutation';
import { useToast } from '@/components/toast/toast-provider';
import type { Milestone } from '@/types/domain';

export function MilestonesManager({ initialMilestones }: { initialMilestones: Milestone[] }) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const { optimisticCreate, optimisticUpdate, optimisticDelete } = 
    useOptimisticMilestoneMutation(milestones, setMilestones);
  const { showToast } = useToast();

  const handleAddMilestone = (newMilestone: Milestone) => {
    const result = optimisticCreate(newMilestone);
    if (!result.ok) {
      showToast({ 
        title: 'Failed to create milestone', 
        description: result.error, 
        variant: 'destructive' 
      });
    }
  };

  const handleUpdateStatus = (id: string, newStatus: Milestone['status']) => {
    const result = optimisticUpdate(id, { status: newStatus });
    if (!result.ok) {
      showToast({ 
        title: 'Failed to update status', 
        description: result.error, 
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = (ids: string[]) => {
    const result = optimisticDelete(ids);
    if (!result.ok) {
      showToast({ 
        title: 'Failed to delete', 
        description: result.error, 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div>
      {/* Render milestones UI */}
    </div>
  );
}
```
