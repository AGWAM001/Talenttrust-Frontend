/**
 * Tests for KbdHint component and CreateStreamForm keyboard shortcut hints.
 *
 * KbdHint:
 *   - Renders key chips in <kbd> elements
 *   - Separators are aria-hidden
 *   - Synthesised aria-label on the wrapper
 *   - srOnly mode hides visually but stays in a11y tree
 *   - Single-key, multi-key, label-only, no-label variants
 *   - No axe violations
 *
 * CreateStreamForm:
 *   - All fields render with correct labels / aria attributes
 *   - Validation fires and shows field errors
 *   - Ctrl+Enter submits a valid form
 *   - Escape invokes onCancel
 *   - KbdHint chips are present in the DOM
 *   - Successful submit calls onSubmit with cleaned values
 *   - No axe violations
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { KbdHint } from '../KbdHint';
import { CreateStreamForm } from '../CreateStreamForm';

// ---------------------------------------------------------------------------
// KbdHint — unit tests
// ---------------------------------------------------------------------------

describe('KbdHint — rendering', () => {
  it('renders a single key chip inside a <kbd> element', () => {
    render(<KbdHint keys={['Enter']} />);
    const kbd = screen.getByText('Enter').closest('kbd');
    expect(kbd).toBeInTheDocument();
  });

  it('renders multiple key chips', () => {
    render(<KbdHint keys={['Ctrl', 'Enter']} />);
    expect(screen.getByText('Ctrl').closest('kbd')).toBeInTheDocument();
    expect(screen.getByText('Enter').closest('kbd')).toBeInTheDocument();
  });

  it('renders a "+" separator between keys', () => {
    const { container } = render(<KbdHint keys={['Ctrl', 'Enter']} />);
    // The separator span carries aria-hidden="true"
    const sep = container.querySelector('[aria-hidden="true"]');
    expect(sep?.textContent).toBe('+');
  });

  it('renders a label after the key chips', () => {
    render(<KbdHint keys={['Ctrl', 'Enter']} label="to submit" />);
    expect(screen.getByText('to submit')).toBeInTheDocument();
  });

  it('does not render a label span when label is omitted', () => {
    render(<KbdHint keys={['Esc']} />);
    // Only one text node should exist (the key itself)
    expect(screen.queryByText('to')).not.toBeInTheDocument();
  });

  it('renders three keys with two separators', () => {
    const { container } = render(<KbdHint keys={['Ctrl', 'Shift', 'P']} />);
    const seps = container.querySelectorAll('[aria-hidden="true"]');
    // Backdrop + two "+" seps (label span also carries aria-hidden when no label)
    const plusSeps = Array.from(seps).filter((el) => el.textContent === '+');
    expect(plusSeps).toHaveLength(2);
  });
});

describe('KbdHint — accessibility', () => {
  it('wrapper carries role="img"', () => {
    render(<KbdHint keys={['Ctrl', 'Enter']} label="to submit" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('aria-label combines keys with "+" and appends the label with em-dash', () => {
    render(<KbdHint keys={['Ctrl', 'Enter']} label="to submit" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('aria-label', 'Ctrl+Enter — to submit');
  });

  it('aria-label contains only the keys when no label is supplied', () => {
    render(<KbdHint keys={['Escape']} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Escape');
  });

  it('srOnly mode adds the sr-only class', () => {
    const { container } = render(<KbdHint keys={['Enter']} srOnly />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('sr-only');
  });

  it('non-srOnly mode does NOT add the sr-only class', () => {
    const { container } = render(<KbdHint keys={['Enter']} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('sr-only');
  });

  it('has no axe violations (single key)', async () => {
    const { container } = render(<KbdHint keys={['Enter']} />);
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it('has no axe violations (multi-key + label)', async () => {
    const { container } = render(
      <KbdHint keys={['Ctrl', 'Enter']} label="to submit" />,
    );
    expect((await axe(container)).violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CreateStreamForm — field rendering
// ---------------------------------------------------------------------------

describe('CreateStreamForm — field rendering', () => {
  it('renders the heading', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Create Payment Stream' }),
    ).toBeInTheDocument();
  });

  it('renders all four labelled inputs / selects', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/stream title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rate \/ second/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
  });

  it('renders the Create Stream submit button', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Create Stream' }),
    ).toBeInTheDocument();
  });

  it('renders a Cancel button when onCancel is supplied', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not render a Cancel button when onCancel is omitted', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CreateStreamForm — KbdHint chips
// ---------------------------------------------------------------------------

describe('CreateStreamForm — KbdHint presence', () => {
  it('renders at least one <kbd> element for the submit shortcut', () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    const kbds = container.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThanOrEqual(1);
  });

  it('renders an Enter key chip', () => {
    render(<CreateStreamForm onSubmit={jest.fn()} />);
    // There may be multiple kbd elements; at least one should say "Enter"
    const kbds = screen.getAllByText('Enter');
    expect(kbds.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a screen-reader-only KbdHint for assistive technologies', () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    const srOnlyHint = container.querySelector('.sr-only[role="img"]');
    expect(srOnlyHint).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CreateStreamForm — validation
// ---------------------------------------------------------------------------

describe('CreateStreamForm — validation', () => {
  it('shows required-field errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Create Stream' }));

    expect(screen.getByText('Stream title is required.')).toBeInTheDocument();
    expect(screen.getByText('Recipient address is required.')).toBeInTheDocument();
    expect(screen.getByText('Rate per second is required.')).toBeInTheDocument();
  });

  it('shows an address format error for an invalid Stellar key', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText(/recipient address/i), 'not-a-valid-key');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));

    expect(
      screen.getByText(/valid Stellar public key/i),
    ).toBeInTheDocument();
  });

  it('shows an error when rate is non-numeric', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText(/rate \/ second/i), 'abc');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));

    expect(screen.getByText(/positive number/i)).toBeInTheDocument();
  });

  it('shows an error when rate is zero', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    await user.type(screen.getByLabelText(/rate \/ second/i), '0');
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));

    expect(screen.getByText(/positive number/i)).toBeInTheDocument();
  });

  it('clears a field error when the user starts correcting their input', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    // Submit to trigger errors
    await user.click(screen.getByRole('button', { name: 'Create Stream' }));
    expect(screen.getByText('Stream title is required.')).toBeInTheDocument();

    // Type into the title field — error should disappear
    await user.type(screen.getByLabelText(/stream title/i), 'Test');
    expect(screen.queryByText('Stream title is required.')).not.toBeInTheDocument();
  });

  it('does not call onSubmit when validation fails', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<CreateStreamForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Create Stream' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// CreateStreamForm — keyboard shortcuts
// ---------------------------------------------------------------------------

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

    // Focus must be inside the form for the keyDown handler to fire
    titleInput.focus();
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Weekly retainer',
        ratePerSecond: '0.001',
      }),
    );
  });

  it('Ctrl+Enter shows validation errors when form is invalid', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    // Focus into the section so the keyDown handler fires
    screen.getByLabelText(/stream title/i).focus();
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(screen.getByText('Stream title is required.')).toBeInTheDocument();
  });

  it('Escape invokes onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<CreateStreamForm onSubmit={jest.fn()} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/stream title/i), 'Typing…');
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape does nothing when onCancel is not supplied', async () => {
    const user = userEvent.setup();
    render(<CreateStreamForm onSubmit={jest.fn()} />);

    screen.getByLabelText(/stream title/i).focus();
    // Should not throw
    await expect(
      user.keyboard('{Escape}'),
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// CreateStreamForm — successful submit
// ---------------------------------------------------------------------------

describe('CreateStreamForm — successful submit', () => {
  it('trims whitespace from title and uppercases the recipient address', async () => {
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

// ---------------------------------------------------------------------------
// CreateStreamForm — accessibility (axe)
// ---------------------------------------------------------------------------

describe('CreateStreamForm — axe', () => {
  it('has no violations in the empty state', async () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it('has no violations when validation errors are displayed', async () => {
    const { container } = render(<CreateStreamForm onSubmit={jest.fn()} />);
    fireEvent.submit(container.querySelector('form')!);
    expect((await axe(container)).violations).toHaveLength(0);
  });
});
