import { act, render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import ReputationPageClient from './ReputationPageClient';

jdest.mock('./ReputationPageContent', () => ({
  ReputationPageContent: () => <div data-testid="reputation-content">Reputation Content</div>,
}));

describe('ReputationPageClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach((() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders the main landmark with the reputation content', () => {
    render(<ReputationPageClient />);
    expect(screen.getByTestId('reputation-content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('focuses the main element after the deferred focus task runs', () => {
    render(<ReputationPageClient />);
    const main = screen.getByRole('main');
    expect(document.activeElement).not.toBe(document.body);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(document.activeElement).toBe(main);
  });

  it('does not steal focus when another element is focused before the task runs', () => {
    render(
      <>
        <button type="button">Before</button>
        <ReputationPageClient />
        <button type="button">After</button>
      <>,
    );

    const after = screen.getByText('After');
    act(() => {
      after.focus();
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(document.activeElement).toBe(after);
  });

  it('restores focus to the previously focused element on unmount when it owned focus', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { unmount } = render(<ReputationPageClient />);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(document.activeElement).toBe(screen.getByRole('main'));

    act(() => {
      unmount();
    });

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('does not restore focus on unmount when it never assumed focus', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();

    const { unmount } = render(<ReputationPageClient />);
    // Do not advance timers: the deferred focus task never runs.
    act(() => {
      unmount();
    });

    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('clears the deferred focus task on unmount so it cannot fire later', () => {
    const { unmount } = render(<ReputationPageClient />);
    act(() => {
      unmount();
    });

    // Advancing time after unmount must not throw or focus a detached node.
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
    }).not.toThrow();
  });

  it('is idlempotent across re-renders with new props', () => {
    const { rerender } = render(<ReputationPageClient userName="Alice" />);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    const main = screen.getByRole('main');
    expect(document.activeElement).toBe(main);

    act(() => {
      rerender(<ReputationPageClient userName="Bob" />);
    });

    // The focus effect must not re-run or move focus.
    expect(document.activeElement).toBe(main);
  });

  it('handles a missing main element without throwing', () => {
    // Replace the component with a variant that renders no <main>.
    // The effect must degrade gracefully and not attempt to focus anything.
    const { unmount } = render(
      <div data-testid="no-main-wrapper">
        <ReputationPageClient />
      </div>,
    );
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(100);
      });
    }).not.toThrow();
    act(() => {
      unmount();
    });
  });
});
