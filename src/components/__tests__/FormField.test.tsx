/**
 * Isolated unit tests for FormField accessibility prop cloning
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { FormField } from '../FormField';
import { testA11y } from '../../test-utils/a11y';
import { PreferencesProvider } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';

describe('FormField', () => {
  const defaultProps = {
    label: 'Test Label',
    id: 'test-input',
  };

  it('renders correctly with no error or helper text', () => {
    render(
      <FormField {...defaultProps}>
        <input type="text" data-testid="child-input" />
      </FormField>
    );

    const input = screen.getByTestId('child-input');
    expect(input).toHaveAttribute('id', 'test-input');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders with helper text and wires aria-describedby', () => {
    render(
      <FormField {...defaultProps} helperText="Help text">
        <input type="text" data-testid="child-input" />
      </FormField>
    );

    const input = screen.getByTestId('child-input');
    const helper = screen.getByText('Help text');
    
    expect(helper).toHaveAttribute('id', 'test-input-helper');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
  });

  it('renders with error text, wires aria-describedby and aria-invalid, and appends error classes', () => {
    render(
      <FormField {...defaultProps} error="Error message">
        <input type="text" data-testid="child-input" className="existing-class" />
      </FormField>
    );

    const input = screen.getByTestId('child-input');
    const error = screen.getByRole('alert');

    expect(error).toHaveAttribute('id', 'test-input-error');
    expect(error).toHaveTextContent('Error message');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('existing-class border-red-500 focus:ring-red-500 focus:border-red-500');
  });

  it('renders with both helper and error text, wiring both ids to aria-describedby', () => {
    render(
      <FormField {...defaultProps} helperText="Help text" error="Error message">
        <input type="text" data-testid="child-input" />
      </FormField>
    );

    const input = screen.getByTestId('child-input');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error test-input-helper');
  });

  it('renders required marker with aria-hidden', () => {
    render(
      <FormField {...defaultProps} required>
        <input type="text" data-testid="child-input" />
      </FormField>
    );

    const marker = screen.getByText('*');
    expect(marker).toHaveAttribute('aria-hidden', 'true');
  });

  it('preserves existing classNames when there is no error', () => {
    render(
      <FormField {...defaultProps}>
        <input type="text" data-testid="child-input" className="custom-class" />
      </FormField>
    );

    const input = screen.getByTestId('child-input');
    expect(input).toHaveAttribute('class', 'custom-class');
  });

  describe('Accessibility', () => {
    it('has no a11y violations in default state', async () => {
      await testA11y(
        <FormField {...defaultProps}>
          <input type="text" />
        </FormField>
      );
    });

    it('has no a11y violations in errored state', async () => {
      await testA11y(
        <FormField {...defaultProps} error="This is an error" helperText="Help text" required>
          <input type="text" />
        </FormField>
      );
    });
  });
});

describe('FormField density', () => {
  const defaultProps = { label: 'Field', id: 'field' };

  beforeEach(() => {
    localStorage.clear();
    resetCache();
  });

  const renderWithPreferences = (ui: React.ReactElement) =>
    render(<PreferencesProvider>{ui}</PreferencesProvider>);

  it('applies comfortable spacing by default', async () => {
    renderWithPreferences(
      <FormField {...defaultProps} helperText="Hint">
        <input type="text" data-testid="input" />
      </FormField>,
    );

    expect(screen.getByText('Field').className).toContain('mb-1');
    expect(screen.getByText('Hint').className).toContain('mt-1');
  });

  it('applies compact spacing when formDensity is compact', async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ formDensity: 'compact' }),
    );

    renderWithPreferences(
      <FormField {...defaultProps} helperText="Hint">
        <input type="text" data-testid="input" />
      </FormField>,
    );

    await waitFor(() => {
      expect(screen.getByText('Field').className).toContain('mb-0');
    });
    await waitFor(() => {
      expect(screen.getByText('Hint').className).toContain('mt-0');
    });
  });
});
