/**
 * Tests for:
 *   - Skeleton component (themed shimmer block)
 *   - SkeletonContainer component (role="status" wrapper)
 *   - CreateStreamFormSkeleton (form-shaped loading placeholder)
 *   - CreateStreamForm isLoading prop (skeleton vs form rendering)
 *   - Full CreateStreamForm: fields, validation, submit, keyboard shortcuts
 *   - axe: no violations in loaded, loading, and error states
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Skeleton, SkeletonContainer } from '../Skeleton';
import { CreateStreamFormSkeleton, CreateStreamForm } from '../CreateStreamForm';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Skeleton — rendering', () => {
  it('renders a div with aria-hidden="true"', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies default width, height, and rounded classes', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('w-full');
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('rounded-md');
  });

  it('applies custom width, height, and rounded props', () => {
    const { container } = render(
      <Skeleton width="w-48" height="h-10" rounded="rounded-full" />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('w-48');
    expect(el.className).toContain('h-10');
    expect(el.className).toContain('rounded-full');
  });

  it('applies the animate-pulse class for the shimmer effect', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-pulse');
  });

  it('includes motion-reduce:animate-none for reduced-motion users', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain(
      'motion-reduce:animate-none',
    );
  });

  it('uses the --muted CSS token for background', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain('--muted');
  });

  it('forwards additional className prop', () => {
    const { container } = render(<Skeleton className="mb-4 mt-2" />);
    expect((container.firstChild as HTMLElement).className).toContain('mb-4');
    expect((container.firstChild as HTMLElement).className).toContain('mt-2');
  });

  it('has no axe violations', async () => {
    const { container } = render(<Skeleton />);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});

describe('SkeletonContainer — rendering', () => {
  it('renders with role="status"', () => {
    render(
      <SkeletonContainer label="Loading items">
        <Skeleton />
      </SkeletonContainer>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label matching the label prop', () => {
    render(
      <SkeletonContainer label="Loading contract summary">
        <Skeleton />
      </SkeletonContainer>,
    );
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading contract summary',
    );
  });

  it('has aria-live="polite"', () => {
    render(
      <SkeletonContainer label="Loading">
        <Skeleton />
      </SkeletonContainer>,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-busy="true" while showing the skeleton', () => {
    render(
      <SkeletonContainer label="Loading">
        <Skeleton />
      </SkeletonContainer>,
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders a visually-hidden text label inside', () => {
    render(
      <SkeletonContainer label="Loading payment stream form">
        <Skeleton />
      </SkeletonContainer>,
    );
    const srSpan = screen
      .getByRole('status')
      .querySelector('.sr-only') as HTMLElement;
    expect(srSpan).toBeInTheDocument();
    expect(srSpan.textContent).toBe('Loading payment stream form');
  });

  it('renders its children', () => {
    const { container } = render(
      <SkeletonContainer label="Loading">
        <Skeleton width="w-48" height="h-6" />
      </SkeletonContainer>,
    );
    const blocks = container.querySelectorAll('[aria-hidden="true"]');
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <SkeletonContainer label="Loading contract summary">
        <Skeleton width="w-full" height="h-4" />
        <Skeleton width="w-48" height="h-4" />
      </SkeletonContainer>,
    );
    expect((await axe(container)).violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateStreamFormSkeleton
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateStreamFormSkeleton', () => {
  it('renders a role="status" container', () => {
    render(<CreateStreamFormSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('announces "Loading payment stream form" to screen readers', () => {
    render(<CreateStreamFormSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading payment stream form',
    );
  });

  it('renders multiple skeleton blocks (mirrors form structure)', () => {
    const { container } = render(<CreateStreamFormSkeleton />);
    const blocks = container.querySelectorAll('[aria-hidden="true"]');
    // Heading, subheading, 2×label+input pairs, 4 grid cells, 2 action buttons = 12+
    expect(blocks.length).toBeGreaterThanOrEqual(8);
  });

  it('does not render any interactive controls', () => {
    render(<CreateStreamFormSkeleton />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<CreateStreamFormSkeleton />);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateStreamForm — isLoading prop
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateStreamForm — isLoading prop', () => {
  it('renders the skeleton when isLoading=true', () => {
    render(<CreateStreamForm isLoading onSubmit={jest.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Stream' })).not.toBeInTheDocument();
  });

  it('renders the form when isLoading=false (default)', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Create Stream' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('transitions from skeleton to form when isLoading changes', () => {
    const { rerender } = render(
      <CreateStreamForm isLoading onSubmit={jest.fn()} />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<CreateStreamForm isLoading={false} onSubmit={jest.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Stream' })).toBeInTheDocument();
  });

  it('skeleton has no axe violations', async () => {
    const { container } = render(
      <CreateStreamForm isLoading onSubmit={jest.fn()} />,
    );
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it('loaded form has no axe violations', async () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateStreamForm — field rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateStreamForm — field rendering', () => {
  it('renders the heading', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Create Payment Stream' }),
    ).toBeInTheDocument();
  });

  it('renders all four labelled fields', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/stream title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rate \/ second/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
  });

  it('renders the Create Stream submit button', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Create Stream' })).toBeInTheDocument();
  });

  it('renders a Cancel button when onCancel is supplied', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not render a Cancel button when onCancel is omitted', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders keyboard shortcut <kbd> hints in the action row', () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    const kbds = container.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateStreamForm — validation
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateStreamForm — validation', () => {
  it('shows required-field errors when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(screen.getByText('Stream title is required.')).toBeInTheDocument();
    expect(screen.getByText('Recipient address is required.')).toBeInTheDocument();
    expect(screen.getByText('Rate per second is required.')).toBeInTheDocument();
  });

  it('shows address format error for an invalid Stellar key', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText(/recipient address/i), 'NOTAVALIDKEY');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(screen.getByText(/valid Stellar public key/i)).toBeInTheDocument();
  });

  it('shows error when rate is non-numeric', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText(/rate \/ second/i), 'abc');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(screen.getByText(/positive number/i)).toBeInTheDocument();
  });

  it('shows error when rate is zero', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    await user.type(screen.getByLabelText(/rate \/ second/i), '0');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(screen.getByText(/positive number/i)).toBeInTheDocument();
  });

  it('clears a field error when the user types a correction', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(screen.getByText('Stream title is required.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/stream title/i), 'Fix');
    expect(screen.queryByText('Stream title is required.')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when form is invalid', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<CreateStreamForm onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('form with errors has no axe violations', async () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    fireEvent.submit(container.querySelector('form')!);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateStreamForm — keyboard shortcuts
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ADDRESS = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';

describe('CreateStreamForm — keyboard shortcuts', () => {
  it('Ctrl+Enter submits the form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<CreateStreamForm onSubmit={onSubmit} />);

    const titleInput = screen.getByLabelText(/stream title/i);
    await user.type(titleInput, 'Weekly retainer');
    await user.type(screen.getByLabelText(/recipient address/i), VALID_ADDRESS);
    await user.type(screen.getByLabelText(/rate \/ second/i), '0.001');

    titleInput.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Weekly retainer', ratePerSecond: '0.001' }),
    );
  });

  it('Ctrl+Enter shows validation errors when form is invalid', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    screen.getByLabelText(/stream title/i).focus();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByText('Stream title is required.')).toBeInTheDocument();
  });

  it('Escape invokes onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<CreateStreamForm onSubmit={jest.fn()} onCancel={onCancel} />);
    await user.type(screen.getByLabelText(/stream title/i), 'test');
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape does nothing when onCancel is not supplied', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    screen.getByLabelText(/stream title/i).focus();
    await expect(user.keyboard('{Escape}')).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateStreamForm — successful submit
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateStreamForm — successful submit', () => {
  it('trims whitespace from title and uppercases the recipient', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<CreateStreamForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/stream title/i), '  My stream  ');
    await user.type(
      screen.getByLabelText(/recipient address/i),
      VALID_ADDRESS.toLowerCase(),
    );
    await user.type(screen.getByLabelText(/rate \/ second/i), '1.5');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My stream',
        recipient: VALID_ADDRESS.toUpperCase(),
        ratePerSecond: '1.5',
        currency: 'XLM',
      }),
    );
  });

  it('Cancel button invokes onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<CreateStreamForm onSubmit={jest.fn()} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
