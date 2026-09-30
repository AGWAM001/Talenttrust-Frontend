# StatusBadge Component

## Overview

The `StatusBadge` component is a reusable, typed badge component that displays contract and milestone statuses with consistent styling and color mapping across the TalentTrust application.

## Purpose

This component eliminates duplicated status styling logic that previously existed in `MilestonesList` and `ContractSummary` components. It provides a single source of truth for:
- Status type definitions
- Color and styling rules
- Visual rendering

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `status` | `StatusType` | Yes | — | The status value to display. One of: `Active`, `Completed`, `Disputed`, `Pending`, or `Paid`. |
| `className` | `string` | No | `''` | Additional CSS classes to apply to the badge element. |

## Status Types

Each status renders an icon + label token so meaning is never conveyed by color alone (WCAG 1.4.1).

| Status    | Icon | Color token                  |
|-----------|------|------------------------------|
| Active    | ▶    | `--status-success-*`         |
| Completed | ✓    | `--status-info-*`            |
| Disputed  | ⚠    | `--status-error-*`           |
| Pending   | ⏳   | `--status-warning-*`         |
| Paid      | ✔    | `--status-success-*`         |

Icons are rendered in a child `<span aria-hidden="true">` so screen readers only announce the label text.

## Usage Examples

### Basic Usage

```tsx
import StatusBadge from '@/components/StatusBadge';

export function MilestoneItem() {
  return (
    <div>
      <h3>Complete Project</h3>
      <StatusBadge status="Pending" />
    </div>
  );
}
```

### With Additional Styling

```tsx
<StatusBadge status="Completed" className="ml-2 mt-4" />
```

### In Context (MilestonesList Example)

```tsx
import StatusBadge, { StatusType } from '@/components/StatusBadge';

type Milestone = {
  id: string;
  title: string;
  status: StatusType;
  payout: number;
  currency: string;
};

export function MilestonesList({ milestones }: { milestones: Milestone[] }) {
  return (
    <div>
      {milestones.map((milestone) => (
        <div key={milestone.id}>
          <p>{milestone.title}</p>
          <StatusBadge status={milestone.status} />
          <p>${milestone.payout}</p>
        </div>
      ))}
    </div>
  );
}
```

## Accessibility

The component includes:
- **Semantic HTML**: Uses appropriate `span` element
- **ARIA Attributes**: 
  - `role="status"` identifies the element as a status indicator
  - `aria-label={`Status: ${status}`}` provides accessible label for screen readers
- **Clear Visual Hierarchy**: Distinct colors for different statuses aid both sighted and visually impaired users

## Styling

The component applies:
- Base badge structure: `inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold`
- Status-specific colors from the unified `statusColorMap`
- Support for Tailwind CSS utility classes

All visual rendering uses Tailwind CSS classes for consistency with the rest of the TalentTrust design system.

## Testing

The component includes comprehensive test coverage:
- **Rendering tests**: Verifies correct text display for all status types
- **Styling tests**: Validates correct Tailwind classes applied per status
- **Props tests**: Tests additional className functionality
- **Accessibility tests**: Ensures proper ARIA attributes and roles
- **Snapshot tests**: Confirms visual consistency across status types

Run tests with: `npm test src/components/__tests__/StatusBadge.test.tsx`

## Integration

This component replaces inline status styling in:
- `MilestonesList.tsx` - for milestone status display
- `ContractSummary.tsx` - for contract status display

Both components now import `StatusBadge` and the shared `StatusType` type, ensuring consistent status handling throughout the application.

## Future Enhancements

Potential improvements for future iterations:
- Configurable badge sizes (small, medium, large)
- Additional status types as business requirements evolve
- Animation transitions on status changes
