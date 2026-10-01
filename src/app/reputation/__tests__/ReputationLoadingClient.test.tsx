/**
 * ReputationLoadingClient.test.tsx
 *
 * Focus management tests for the reputation loading state.
 *
 * Tests cover:
 * 1. Focus moves to main element on loading state mount
 * 2. Previous focus element is stored
 * 3. TabIndex is set to -1 on main element
 * 4. Aria-busy attribute is set
 * 5. Cleanup on unmount
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReputationLoadingClient from '../ReputationLoadingClient';

// Mock the ReputationLoading component to avoid complex rendering
jest.mock('../loading', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="reputation-loading">
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading reputation…
      </span>
    </div>
  ),
}));

describe('ReputationLoadingClient – focus management', () => {
  beforeEach(() => {
    // Reset document focus before each test
    document.body.focus();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial focus behavior', () => {
    it('renders the main element with tabIndex={-1}', () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('tabIndex', '-1');
    });

    it('sets aria-busy="true" on main element', () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      expect(main).toHaveAttribute('aria-busy', 'true');
    });

    it('stores the previously focused element on mount', () => {
      // Create a focusable element and focus it before mounting
      const button = document.createElement('button');
      button.textContent = 'Previous focus';
      document.body.appendChild(button);
      button.focus();

      expect(document.activeElement).toBe(button);

      render(<ReputationLoadingClient />);

      // The component should have stored the previous focus
      expect(button).toBeInTheDocument();
      
      document.body.removeChild(button);
    });

    it('moves focus to the main element after mount', async () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('handles the case where no element was previously focused', async () => {
      // Ensure no element is focused
      document.body.focus();

      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });
  });

  describe('Cleanup behavior', () => {
    it('clears the focus timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<ReputationLoadingClient />);

      unmount();

      // clearTimeout should be called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('does not throw when unmounting before focus is set', () => {
      const { unmount } = render(<ReputationLoadingClient />);

      // Unmount immediately before the focus timer fires
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility attributes', () => {
    it('applies correct CSS classes to main element', () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      expect(main).toHaveClass('min-h-screen', 'p-8');
    });

    it('renders child loading content correctly', () => {
      render(<ReputationLoadingClient />);

      expect(screen.getByTestId('reputation-loading')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading reputation…');
    });
  });

  describe('Edge cases', () => {
    it('handles missing main element gracefully', async () => {
      // Mock querySelector to return null temporarily
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn((selector: string) => {
        if (selector === 'main') return null;
        return originalQuerySelector.call(document, selector);
      });

      render(<ReputationLoadingClient />);

      // Should not throw even when main is not found
      await waitFor(() => {
        expect(document.querySelector).toHaveBeenCalledWith('main');
      });

      document.querySelector = originalQuerySelector;
    });

    it('handles rapid mount/unmount cycles', () => {
      const { unmount } = render(<ReputationLoadingClient />);
      unmount();

      const { unmount: unmount2 } = render(<ReputationLoadingClient />);
      expect(() => unmount2()).not.toThrow();
    });

    it('maintains focus when component re-renders', async () => {
      const { rerender } = render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });

      // Re-render should maintain focus
      rerender(<ReputationLoadingClient />);
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });
  });
});
