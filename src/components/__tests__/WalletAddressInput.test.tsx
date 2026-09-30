/**
 * WalletAddressInput.test.tsx
 *
 * Tests for the WalletAddressInput component covering:
 *   1. Rendering — label, input, helper text, required indicator
 *   2. Real-time validation on blur — empty, invalid format, valid
 *   3. aria-invalid and aria-describedby wiring
 *   4. Normalization on blur (uppercase, trimmed)
 *   5. Error clearing on change
 *   6. onValidation callback integration
 *   7. Parent error prop takes precedence over internal error
 *   8. jest-axe accessibility audit
 *   9. Edge cases: fast type/blur sequences, whitespace-only, special chars
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WalletAddressInput } from '../WalletAddressInput';
import { assertNoA11yViolations } from '@/test-utils/a11y';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const VALID_ADDRESS_LOWERCASE = VALID_ADDRESS.toLowerCase();
const INVALID_TOO_SHORT = 'GABC';
const INVALID_NO_G_PREFIX = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INVALID_BAD_CHECKSUM = 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7I';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderInput(props?: Partial<Parameters<typeof WalletAddressInput>[0]>) {
  const onValidation = jest.fn();
  const onChange = jest.fn();
  const utils = render(
    <WalletAddressInput
      id="wallet-address"
      label="Wallet address"
      value=""
      onChange={onChange}
      onValidation={onValidation}
      {...props}
    />
  );
  return { ...utils, onValidation, onChange };
}

function getInput() {
  return screen.getByLabelText(/wallet address/i) as HTMLInputElement;
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe('WalletAddressInput – rendering', () => {
  it('renders a labelled text input with placeholder', () => {
    renderInput();
    const input = getInput();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('id', 'wallet-address');
    expect(input).toHaveAttribute('placeholder', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
  });

  it('renders custom placeholder when provided', () => {
    renderInput({ placeholder: 'GABC…' });
    expect(getInput()).toHaveAttribute('placeholder', 'GABC…');
  });

  it('renders helper text when provided', () => {
    renderInput({ helperText: '56-character public key' });
    expect(screen.getByText('56-character public key')).toBeInTheDocument();
  });

  it('renders required indicator in the label when required is true', () => {
    renderInput({ required: true });
    const label = document.querySelector('label');
    expect(label?.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('does not render required indicator when required is false', () => {
    renderInput({ required: false });
    const label = document.querySelector('label');
    expect(label?.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('does not render an error paragraph when there is no error', () => {
    renderInput();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Validation on blur
// ---------------------------------------------------------------------------

describe('WalletAddressInput – onBlur validation', () => {
  it('shows required error when blurring an empty input', () => {
    const onValidation = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value=""
        onChange={jest.fn()}
        onValidation={onValidation}
        required
      />
    );

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent('Wallet address is required');
    expect(onValidation).toHaveBeenCalledWith('wallet-address', 'Wallet address is required');
  });

  it('does not show required error on blur when not required and empty', () => {
    renderInput({ required: false });
    fireEvent.blur(getInput());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows format error when blurring an invalid address', () => {
    renderInput({ value: INVALID_TOO_SHORT, required: true });

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('shows format error for an address with the wrong checksum', () => {
    renderInput({ value: INVALID_BAD_CHECKSUM, required: true });

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('shows format error for an address without a G prefix', () => {
    renderInput({ value: INVALID_NO_G_PREFIX, required: true });

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('shows no error when blurring a valid address', () => {
    renderInput({ value: VALID_ADDRESS, required: true });

    fireEvent.blur(getInput());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no error when blurring a valid lowercase address (normalized on blur)', () => {
    renderInput({ value: VALID_ADDRESS_LOWERCASE, required: true });

    fireEvent.blur(getInput());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no error when blurring a valid address with whitespace', () => {
    const onChange = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={`  ${VALID_ADDRESS_LOWERCASE}  `}
        onChange={onChange}
        required
      />
    );

    fireEvent.blur(getInput());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Should normalize: trim + uppercase
    expect(onChange).toHaveBeenCalledWith(VALID_ADDRESS);
  });
});

// ---------------------------------------------------------------------------
// 3. Normalization on blur
// ---------------------------------------------------------------------------

describe('WalletAddressInput – normalization on blur', () => {
  it('normalizes lowercase to uppercase on blur', () => {
    const onChange = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={VALID_ADDRESS_LOWERCASE}
        onChange={onChange}
        required
      />
    );

    fireEvent.blur(getInput());

    expect(onChange).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it('trims whitespace on blur', () => {
    const onChange = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={`   ${VALID_ADDRESS}   `}
        onChange={onChange}
        required
      />
    );

    fireEvent.blur(getInput());
    expect(onChange).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it('does not fire onChange on blur when value is already normalized', () => {
    const onChange = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={VALID_ADDRESS}
        onChange={onChange}
        required
      />
    );

    fireEvent.blur(getInput());
    // Already normalized — no change event
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not fire onChange on blur when value is empty', () => {
    const onChange = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value=""
        onChange={onChange}
        required
      />
    );

    fireEvent.blur(getInput());
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. aria-invalid and aria-describedby
// ---------------------------------------------------------------------------

describe('WalletAddressInput – accessible error linking', () => {
  it('sets aria-invalid="false" when there is no error', () => {
    renderInput({ value: VALID_ADDRESS });
    fireEvent.blur(getInput());
    expect(getInput()).toHaveAttribute('aria-invalid', 'false');
  });

  it('sets aria-invalid="true" when there is a blur error', () => {
    renderInput({ value: INVALID_TOO_SHORT, required: true });
    fireEvent.blur(getInput());
    expect(getInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid="true" when a parent error is passed', () => {
    renderInput({ value: INVALID_TOO_SHORT, error: 'Parent says this is invalid' });
    expect(getInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('wires aria-describedby to the error element id on blur', () => {
    renderInput({ value: INVALID_TOO_SHORT, required: true });
    fireEvent.blur(getInput());
    expect(getInput()).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('wallet-address-error')
    );
  });

  it('wires aria-describedby to the helper text id', () => {
    renderInput({ helperText: '56 characters starting with G' });
    expect(getInput()).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('wallet-address-helper')
    );
  });

  it('wires both error and helper IDs to aria-describedby when both are present', () => {
    renderInput({ helperText: '56 characters starting with G', value: INVALID_TOO_SHORT, required: true });
    fireEvent.blur(getInput());
    const describedBy = getInput().getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('wallet-address-error');
    expect(describedBy).toContain('wallet-address-helper');
  });

  it('error message element has role="alert"', () => {
    renderInput({ value: INVALID_TOO_SHORT, required: true });
    fireEvent.blur(getInput());
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Error clearing on change
// ---------------------------------------------------------------------------

describe('WalletAddressInput – error clearing on change', () => {
  it('clears the blur error as soon as the user starts typing', () => {
    const onValidation = jest.fn();
    const TestHarness = () => {
      const [value, setValue] = React.useState(INVALID_TOO_SHORT);
      return (
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={value}
          onChange={setValue}
          onValidation={onValidation}
          required
        />
      );
    };

    render(<TestHarness />);

    // First blur triggers the error
    fireEvent.blur(getInput());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Now type to clear
    fireEvent.change(getInput(), { target: { value: VALID_ADDRESS } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onValidation).toHaveBeenLastCalledWith('wallet-address', null);
  });
});

// ---------------------------------------------------------------------------
// 6. onValidation callback
// ---------------------------------------------------------------------------

describe('WalletAddressInput – onValidation callback', () => {
  it('calls onValidation with null when blurring a valid address', () => {
    const onValidation = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={VALID_ADDRESS}
        onChange={jest.fn()}
        onValidation={onValidation}
        required
      />
    );

    fireEvent.blur(getInput());
    expect(onValidation).toHaveBeenCalledWith('wallet-address', null);
  });

  it('calls onValidation with error message when blurring an invalid address', () => {
    const onValidation = jest.fn();
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={INVALID_TOO_SHORT}
        onChange={jest.fn()}
        onValidation={onValidation}
        required
      />
    );

    fireEvent.blur(getInput());
    expect(onValidation).toHaveBeenCalledWith(
      'wallet-address',
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('calls onValidation with null on change after a previous error', () => {
    const onValidation = jest.fn();
    const TestHarness = () => {
      const [value, setValue] = React.useState(INVALID_TOO_SHORT);
      return (
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={value}
          onChange={setValue}
          onValidation={onValidation}
          required
        />
      );
    };

    render(<TestHarness />);

    // Blur triggers error
    fireEvent.blur(getInput());
    expect(onValidation).toHaveBeenCalledWith(
      'wallet-address',
      expect.any(String)
    );

    onValidation.mockClear();

    // Change clears
    fireEvent.change(getInput(), { target: { value: VALID_ADDRESS } });
    expect(onValidation).toHaveBeenCalledWith('wallet-address', null);
  });

  it('handles rapid blur-then-change sequences without stale state', () => {
    const onValidation = jest.fn();
    const TestHarness = () => {
      const [value, setValue] = React.useState(INVALID_TOO_SHORT);
      return (
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={value}
          onChange={setValue}
          onValidation={onValidation}
          required
        />
      );
    };

    render(<TestHarness />);

    // Rapid blur → change → blur
    fireEvent.blur(getInput());
    fireEvent.change(getInput(), { target: { value: VALID_ADDRESS } });
    fireEvent.blur(getInput());

    // Final state: no error
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onValidation).toHaveBeenLastCalledWith('wallet-address', null);
  });
});

// ---------------------------------------------------------------------------
// 7. Parent error takes precedence
// ---------------------------------------------------------------------------

describe('WalletAddressInput – parent error precedence', () => {
  it('shows parent error even when internal blur error would differ', () => {
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={VALID_ADDRESS}
        onChange={jest.fn()}
        error="Submit-error: fix this address"
        required
      />
    );

    // Even with a valid value, parent error is displayed
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Submit-error: fix this address');
  });

  it('shows parent error even after a valid blur clears internal error', () => {
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={VALID_ADDRESS}
        onChange={jest.fn()}
        error="Still broken from submit"
        required
      />
    );

    fireEvent.blur(getInput());

    // Internal validation passed, but parent error persists
    expect(screen.getByRole('alert')).toHaveTextContent('Still broken from submit');
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

describe('WalletAddressInput – edge cases', () => {
  it('handles whitespace-only input on blur', () => {
    renderInput({ value: '     ', required: true });

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent('Wallet address is required');
  });

  it('handles very long invalid input gracefully', () => {
    const longInput = 'G' + 'A'.repeat(100);
    renderInput({ value: longInput, required: true });

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('handles special characters in input', () => {
    renderInput({ value: 'G!@#$%^&*()_+', required: true });

    fireEvent.blur(getInput());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('renders with custom label and id', () => {
    render(
      <WalletAddressInput
        id="freelancerAddress"
        label="Freelancer Stellar address"
        value=""
        onChange={jest.fn()}
        required
      />
    );

    expect(screen.getByLabelText(/freelancer stellar address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/freelancer stellar address/i)).toHaveAttribute(
      'id',
      'freelancerAddress'
    );
  });
});

// ---------------------------------------------------------------------------
// 9. Keyboard operation — Enter key triggers blur / normalization
// ---------------------------------------------------------------------------

describe('WalletAddressInput – keyboard operation', () => {
  it('blur event normalizes address (Tab key to move focus away)', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <div>
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={VALID_ADDRESS_LOWERCASE}
          onChange={onChange}
          required
        />
        <button data-testid="next-focusable">Next</button>
      </div>
    );

    const input = screen.getByLabelText(/wallet address/i);
    input.focus();

    // Tab to move focus away → triggers blur → normalizes
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it('Tab away from empty required field triggers validation', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value=""
          onChange={jest.fn()}
          required
        />
        <button data-testid="next-focusable">Next</button>
      </div>
    );

    const input = screen.getByLabelText(/wallet address/i);
    input.focus();

    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent('Wallet address is required');
  });

  it('Tab away from invalid input triggers format validation', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={INVALID_TOO_SHORT}
          onChange={jest.fn()}
          required
        />
        <button data-testid="next-focusable">Next</button>
      </div>
    );

    const input = screen.getByLabelText(/wallet address/i);
    input.focus();

    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wallet address must be a valid Stellar G... address'
    );
  });

  it('Tab away from valid input shows no error', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={VALID_ADDRESS}
          onChange={jest.fn()}
          required
        />
        <button data-testid="next-focusable">Next</button>
      </div>
    );

    const input = screen.getByLabelText(/wallet address/i);
    input.focus();

    await user.tab();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blur respects parent error when present', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value={VALID_ADDRESS}
          onChange={jest.fn()}
          error="Submit error: fix this address"
          required
        />
        <button data-testid="next-focusable">Next</button>
      </div>
    );

    const input = screen.getByLabelText(/wallet address/i);
    input.focus();

    await user.tab();

    // Parent error persists even after valid blur
    expect(screen.getByRole('alert')).toHaveTextContent('Submit error: fix this address');
  });

  it('input is reachable by Tab', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button data-testid="before">Before</button>
        <WalletAddressInput
          id="wallet-address"
          label="Wallet address"
          value=""
          onChange={jest.fn()}
          required
        />
      </div>
    );

    await user.tab();
    expect(screen.getByTestId('before')).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/wallet address/i)).toHaveFocus();
  });

  it('input carries visible focus-ring classes', () => {
    render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value=""
        onChange={jest.fn()}
      />
    );

    const input = screen.getByLabelText(/wallet address/i);
    expect(input.className).toMatch(/focus:outline-none/);
    expect(input.className).toMatch(/focus:ring-2/);
  });
});

// ---------------------------------------------------------------------------
// 10. Accessibility — jest-axe audits
// ---------------------------------------------------------------------------

describe('WalletAddressInput – jest-axe audits', () => {
  it('has no axe violations in default state', async () => {
    const { container } = render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value=""
        onChange={jest.fn()}
        helperText="Must be a valid Stellar public key starting with G"
        required
      />
    );
    await assertNoA11yViolations(container);
  });

  it('has no axe violations with an error shown', async () => {
    const { container } = render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={INVALID_TOO_SHORT}
        onChange={jest.fn()}
        error="Wallet address must be a valid Stellar G... address"
        required
      />
    );
    await assertNoA11yViolations(container);
  });

  it('has no axe violations with a valid address', async () => {
    const { container } = render(
      <WalletAddressInput
        id="wallet-address"
        label="Wallet address"
        value={VALID_ADDRESS}
        onChange={jest.fn()}
        helperText="56 characters starting with G"
        required
      />
    );
    await assertNoA11yViolations(container);
  });
});
