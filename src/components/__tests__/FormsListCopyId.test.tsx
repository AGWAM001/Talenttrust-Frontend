/**
 * FormsListCopyId.test.tsx
 *
 * Tests for the copy-to-clipboard feature added to FormsList (issue #52).
 * Covers: success path (Clipboard API), fallback (execCommand), toast feedback,
 * accessibility attributes, and keyboard operability.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormsList, Form, execCommandFallback } from '../FormsList';

// ---------------------------------------------------------------------------
// Toast mock
// ---------------------------------------------------------------------------

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const forms: Form[] = [
  { id: 'form-abc', title: 'Contract Form', status: 'Published' },
  { id: 'form-xyz', title: 'Milestone Form', status: 'Draft' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderFormsList(props: Partial<React.ComponentProps<typeof FormsList>> = {}) {
  return render(<FormsList forms={forms} {...props} />);
}

// ---------------------------------------------------------------------------
// Copy button renders
// ---------------------------------------------------------------------------

describe('FormsList — copy button renders', () => {
  it('renders a Copy button for each form id', () => {
    renderFormsList();
    forms.forEach((f) => {
      expect(screen.getByTestId(`copy-id-${f.id}`)).toBeInTheDocument();
    });
  });

  it('button has an accessible label referencing the form id', () => {
    renderFormsList();
    expect(screen.getByLabelText(`Copy id ${forms[0].id}`)).toBeInTheDocument();
  });

  it('button has aria-pressed="false" in the initial (not-yet-copied) state', () => {
    renderFormsList();
    const btn = screen.getByTestId(`copy-id-${forms[0].id}`);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('button text reads "Copy" before any click', () => {
    renderFormsList();
    const btn = screen.getByTestId(`copy-id-${forms[0].id}`);
    expect(btn).toHaveTextContent('Copy');
  });

  it('form id is displayed inline next to its copy button', () => {
    renderFormsList();
    expect(screen.getByTestId(`form-id-${forms[0].id}`)).toHaveTextContent(forms[0].id);
  });
});

// ---------------------------------------------------------------------------
// Clipboard API — success path
// ---------------------------------------------------------------------------

describe('FormsList — copy success (Clipboard API)', () => {
  beforeEach(() => {
    mockShowSuccess.mockClear();
    mockShowError.mockClear();

    // Provide a working navigator.clipboard stub
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('calls navigator.clipboard.writeText with the correct form id', async () => {
    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(forms[0].id);
  });

  it('shows a success toast after copying', async () => {
    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining(forms[0].id) }),
      );
    });
  });

  it('button aria-pressed becomes "true" after a successful copy', async () => {
    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });
    await waitFor(() => {
      expect(screen.getByTestId(`copy-id-${forms[0].id}`)).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('button text changes to "Copied" after a successful copy', async () => {
    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });
    await waitFor(() => {
      expect(screen.getByTestId(`copy-id-${forms[0].id}`)).toHaveTextContent('Copied');
    });
  });

  it('copying the second form id copies the correct value', async () => {
    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[1].id}`));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(forms[1].id);
  });
});

// ---------------------------------------------------------------------------
// Clipboard API — failure / fallback path
// ---------------------------------------------------------------------------

describe('FormsList — copy fallback (Clipboard API unavailable)', () => {
  beforeEach(() => {
    mockShowSuccess.mockClear();
    mockShowError.mockClear();
  });

  it('calls execCommand fallback when clipboard.writeText rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: jest.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });

    // Mock execCommand to return true (success)
    const execCommandMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: execCommandMock,
    });

    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });

    await waitFor(() => {
      expect(execCommandMock).toHaveBeenCalledWith('copy');
    });
  });

  it('shows a success toast when the execCommand fallback succeeds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: jest.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });

    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    });

    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining(forms[0].id) }),
      );
    });
  });

  it('shows an error toast when both clipboard and execCommand fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: {
        writeText: jest.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });

    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockReturnValue(false),
    });

    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('Failed') }),
      );
    });
  });

  it('shows an error toast when navigator.clipboard is undefined', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: undefined,
    });

    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockReturnValue(false),
    });

    renderFormsList();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`copy-id-${forms[0].id}`));
    });

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// execCommandFallback unit tests
// ---------------------------------------------------------------------------

describe('execCommandFallback', () => {
  it('returns true when execCommand("copy") returns true', () => {
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    });
    expect(execCommandFallback('hello')).toBe(true);
  });

  it('returns false when execCommand("copy") returns false', () => {
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockReturnValue(false),
    });
    expect(execCommandFallback('hello')).toBe(false);
  });

  it('returns false when execCommand throws', () => {
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockImplementation(() => { throw new Error('not supported'); }),
    });
    expect(execCommandFallback('hello')).toBe(false);
  });

  it('cleans up the temporary textarea from the DOM', () => {
    Object.defineProperty(document, 'execCommand', {
      writable: true,
      value: jest.fn().mockReturnValue(true),
    });
    const before = document.body.children.length;
    execCommandFallback('test-id');
    expect(document.body.children.length).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Keyboard operability
// ---------------------------------------------------------------------------

describe('FormsList — copy button keyboard operability', () => {
  beforeEach(() => {
    mockShowSuccess.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  it('copy button is focusable (not disabled or tabindex=-1)', () => {
    renderFormsList();
    const btn = screen.getByTestId(`copy-id-${forms[0].id}`);
    expect(btn).not.toBeDisabled();
    expect(btn).not.toHaveAttribute('tabindex', '-1');
  });

  it('pressing Enter on the button triggers copy (via click event)', async () => {
    renderFormsList();
    const btn = screen.getByTestId(`copy-id-${forms[0].id}`);
    btn.focus();
    await act(async () => {
      fireEvent.keyDown(btn, { key: 'Enter', code: 'Enter' });
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(forms[0].id);
    });
  });
});
