/**
 * FormsListStates.test.tsx
 *
 * Tests for FormsList state transitions (issue: test/forms-51-states).
 * Asserts that exactly the right UI is rendered for:
 *   - loading  → shows loading skeleton, hides list/empty/error
 *   - empty    → shows empty state, hides loading/list/error
 *   - error    → shows error message, hides loading/list/empty
 *   - success  → shows the list, hides loading/empty/error
 *
 * States are mutually exclusive: each test verifies one state is active and
 * confirms the others are absent.  No behaviour is changed by these tests.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe } from 'jest-axe';
import { FormsList, Form } from '../FormsList';

// ---------------------------------------------------------------------------
// Toast mock (FormsList uses useToast via CopyIdButton)
// ---------------------------------------------------------------------------

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleForms: Form[] = [
  { id: 'frm-001', title: 'Alpha Form', status: 'Published' },
  { id: 'frm-002', title: 'Beta Form', status: 'Draft' },
  { id: 'frm-003', title: 'Gamma Form', status: 'Published' },
];

describe('FormsList — accessibility (jest-axe)', () => {
  it('passes axe in the loaded state', async () => {
    const { container } = render(<FormsList forms={sampleForms} />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe in the empty state', async () => {
    const { container } = render(<FormsList forms={[]} />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe in the error state', async () => {
    const { container } = render(<FormsList forms={[]} error="Failed to load forms." />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('FormsList — loading state', () => {
  it('renders the loading skeleton when isLoading=true', () => {
    render(<FormsList forms={[]} isLoading />);
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();
  });

  it('loading skeleton has aria-busy="true"', () => {
    render(<FormsList forms={[]} isLoading />);
    expect(screen.getByTestId('forms-loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('loading skeleton has an accessible label', () => {
    render(<FormsList forms={[]} isLoading />);
    expect(screen.getByTestId('forms-loading')).toHaveAttribute('aria-label');
  });

  it('does NOT show the forms list while loading', () => {
    render(<FormsList forms={sampleForms} isLoading />);
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
  });

  it('does NOT show the empty state while loading', () => {
    render(<FormsList forms={[]} isLoading />);
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
  });

  it('does NOT show the error state while loading', () => {
    render(<FormsList forms={[]} isLoading error="something went wrong" />);
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();
  });

  it('states are mutually exclusive — only loading UI is visible', () => {
    render(<FormsList forms={sampleForms} isLoading />);
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('FormsList — error state', () => {
  it('renders the error message when error prop is set', () => {
    render(<FormsList forms={[]} error="Failed to load forms." />);
    expect(screen.getByTestId('forms-error')).toBeInTheDocument();
  });

  it('error element has role="alert"', () => {
    render(<FormsList forms={[]} error="Network error" />);
    expect(screen.getByTestId('forms-error')).toHaveAttribute('role', 'alert');
  });

  it('renders the error message text', () => {
    render(<FormsList forms={[]} error="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('does NOT show the forms list in the error state', () => {
    render(<FormsList forms={sampleForms} error="Oops" />);
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
  });

  it('does NOT show the loading skeleton in the error state', () => {
    render(<FormsList forms={[]} error="Oops" />);
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
  });

  it('does NOT show the empty state in the error state', () => {
    render(<FormsList forms={[]} error="Oops" />);
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
  });

  it('states are mutually exclusive — only error UI is visible', () => {
    render(<FormsList forms={sampleForms} error="Oh no!" />);
    expect(screen.getByTestId('forms-error')).toBeInTheDocument();
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('FormsList — empty state', () => {
  it('renders the empty state when forms is an empty array', () => {
    render(<FormsList forms={[]} />);
    expect(screen.getByTestId('forms-empty')).toBeInTheDocument();
  });

  it('empty state message is shown for the "All" filter by default', () => {
    render(<FormsList forms={[]} />);
    expect(screen.getByText('There are no forms to display.')).toBeInTheDocument();
  });

  it('renders a filter-specific empty message when no forms match the active filter', () => {
    const publishedOnly: Form[] = [{ id: 'frm-p', title: 'Pub Form', status: 'Published' }];
    render(<FormsList forms={publishedOnly} />);

    fireEvent.click(screen.getByText('Filter Draft'));
    expect(screen.getByTestId('forms-empty')).toBeInTheDocument();
    expect(screen.getByText(/No forms match the "Draft" filter/)).toBeInTheDocument();
  });

  it('does NOT show the forms list in the empty state', () => {
    render(<FormsList forms={[]} />);
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
  });

  it('does NOT show the loading skeleton in the empty state', () => {
    render(<FormsList forms={[]} />);
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
  });

  it('does NOT show the error state when empty', () => {
    render(<FormsList forms={[]} />);
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
  });

  it('states are mutually exclusive — only empty UI is visible', () => {
    render(<FormsList forms={[]} />);
    expect(screen.getByTestId('forms-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

describe('FormsList — success state', () => {
  it('renders the forms list when data is provided', () => {
    render(<FormsList forms={sampleForms} />);
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();
  });

  it('renders a list item for each form', () => {
    render(<FormsList forms={sampleForms} />);
    // Forms list is a <ul>, items are <li>
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(sampleForms.length);
  });

  it('renders each form title', () => {
    render(<FormsList forms={sampleForms} />);
    sampleForms.forEach((f) => {
      expect(screen.getByText(f.title)).toBeInTheDocument();
    });
  });

  it('renders each form id', () => {
    render(<FormsList forms={sampleForms} />);
    sampleForms.forEach((f) => {
      expect(screen.getByTestId(`form-id-${f.id}`)).toHaveTextContent(f.id);
    });
  });

  it('does NOT show the loading skeleton in the success state', () => {
    render(<FormsList forms={sampleForms} />);
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
  });

  it('does NOT show the error state in the success state', () => {
    render(<FormsList forms={sampleForms} />);
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
  });

  it('does NOT show the empty state in the success state', () => {
    render(<FormsList forms={sampleForms} />);
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
  });

  it('states are mutually exclusive — only success UI is visible', () => {
    render(<FormsList forms={sampleForms} />);
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('FormsList — state transitions', () => {
  it('transitions from loading → success correctly', () => {
    const { rerender } = render(<FormsList forms={[]} isLoading />);
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();

    rerender(<FormsList forms={sampleForms} isLoading={false} />);
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();
  });

  it('transitions from loading → empty correctly', () => {
    const { rerender } = render(<FormsList forms={[]} isLoading />);
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();

    rerender(<FormsList forms={[]} isLoading={false} />);
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-empty')).toBeInTheDocument();
  });

  it('transitions from loading → error correctly', () => {
    const { rerender } = render(<FormsList forms={[]} isLoading />);
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();

    rerender(<FormsList forms={[]} isLoading={false} error="Request failed." />);
    expect(screen.queryByTestId('forms-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-error')).toBeInTheDocument();
    expect(screen.getByText('Request failed.')).toBeInTheDocument();
  });

  it('transitions from error → success when error is cleared', () => {
    const { rerender } = render(<FormsList forms={sampleForms} error="Oops" />);
    expect(screen.getByTestId('forms-error')).toBeInTheDocument();

    rerender(<FormsList forms={sampleForms} error={null} />);
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();
  });

  it('transitions from success → empty when all forms are removed', () => {
    const { rerender } = render(<FormsList forms={sampleForms} />);
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();

    rerender(<FormsList forms={[]} />);
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-empty')).toBeInTheDocument();
  });

  it('loading state takes precedence over error state', () => {
    render(<FormsList forms={[]} isLoading error="something failed" />);
    // isLoading is checked first, so loading should win
    expect(screen.getByTestId('forms-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('forms-error')).not.toBeInTheDocument();
  });

  it('filter transition: success → empty → success when filter matches/unmatches', () => {
    const publishedForms: Form[] = [
      { id: 'frm-p1', title: 'Published One', status: 'Published' },
    ];
    render(<FormsList forms={publishedForms} />);

    // Initial: success
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();

    // Apply Draft filter: no matches → empty
    fireEvent.click(screen.getByText('Filter Draft'));
    expect(screen.queryByTestId('forms-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('forms-empty')).toBeInTheDocument();

    // Reset to All: back to success
    fireEvent.click(screen.getByText('Filter All'));
    expect(screen.getByTestId('forms-list')).toBeInTheDocument();
    expect(screen.queryByTestId('forms-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Backward-compatible pagination tests (guard against regression)
// ---------------------------------------------------------------------------

describe('FormsList — pagination (backward compatibility)', () => {
  const createForms = (count: number): Form[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `id-${i}`,
      title: `Form ${i}`,
      status: (i % 2 === 0 ? 'Draft' : 'Published') as Form['status'],
    }));

  it('renders the first 10 forms by default', () => {
    render(<FormsList forms={createForms(15)} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });

  it('loads more forms when Load More is clicked', () => {
    render(<FormsList forms={createForms(15)} />);
    fireEvent.click(screen.getByText('Load More'));
    expect(screen.getAllByRole('listitem')).toHaveLength(15);
  });

  it('shows "End of list" when all forms are loaded', () => {
    render(<FormsList forms={createForms(15)} />);
    fireEvent.click(screen.getByText('Load More'));
    expect(screen.getByText('End of list')).toBeInTheDocument();
    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });

  it('resets pagination when filter changes', () => {
    render(<FormsList forms={createForms(25)} />);
    fireEvent.click(screen.getByText('Load More')); // page 2 → 20 items
    fireEvent.click(screen.getByText('Filter Draft'));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(10);
  });
});
