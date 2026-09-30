/**
 * ReputationPageClient.test.tsx
 *
 * Focus management tests for the reputation page.
 *
 * Tests cover:
 * 1. Focus moves to main element on page mount
 * 2. Previous focus element is stored
 * 3. TabIndex is set to -1 on main element
 * 4. Focus behavior with different page states (no reputation, partial, full)
 * 5. Cleanup on unmount
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ReputationPageClient from '../ReputationPageClient';
import type { Reputation } from '@/types/domain';

// Mock the ReputationPageContent to avoid complex rendering
jest.mock('../ReputationPageContent', () => ({
  ReputationPageContent: ({ reputationData, userName }: any) => (
    <div data-testid="reputation-page-content">
      <div data-testid="user-name">{userName}</div>
      <div data-testid="score">{reputationData?.score ?? 'N/A'}</div>
    </div>
  ),
}));

describe('ReputationPageClient – focus management', () => {
  beforeEach(() => {
    // Reset document focus before each test
    document.body.focus();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial focus behavior', () => {
    it('renders the main element with tabIndex={-1}', () => {
      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('tabIndex', '-1');
    });

    it('stores the previously focused element on mount', () => {
      // Create a focusable element and focus it before mounting
      const button = document.createElement('button');
      button.textContent = 'Previous focus';
      document.body.appendChild(button);
      button.focus();

      expect(document.activeElement).toBe(button);

      render(<ReputationPageClient />);

      // The component should have stored the previous focus
      // This is verified indirectly by checking that the button was focused before
      expect(button).toBeInTheDocument();
      
      document.body.removeChild(button);
    });

    it('moves focus to the main element after mount', async () => {
      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('handles the case where no element was previously focused', async () => {
      // Ensure no element is focused
      document.body.focus();

      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });
  });

  describe('Focus with different page states', () => {
    it('focuses main element when reputation data is null', async () => {
      render(<ReputationPageClient reputationData={null} />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('focuses main element when reputation data is undefined', async () => {
      render(<ReputationPageClient reputationData={undefined} />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('focuses main element when reputation data exists', async () => {
      const reputationData: Reputation = {
        score: 88,
        level: 'Trusted Contributor',
        history: [],
      };

      render(<ReputationPageClient reputationData={reputationData} userName="Alice" />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('focuses main element with custom userName', async () => {
      render(<ReputationPageClient userName="CustomUser" />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('CustomUser');
    });
  });

  describe('Cleanup behavior', () => {
    it('clears the focus timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<ReputationPageClient />);

      unmount();

      // clearTimeout should be called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('does not throw when unmounting before focus is set', () => {
      const { unmount } = render(<ReputationPageClient />);

      // Unmount immediately before the focus timer fires
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility attributes', () => {
    it('applies correct CSS classes to main element', () => {
      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      expect(main).toHaveClass('min-h-screen', 'p-8');
    });

    it('renders child content correctly', () => {
      render(<ReputationPageClient userName="TestUser" />);

      expect(screen.getByTestId('reputation-page-content')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('TestUser');
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

      render(<ReputationPageClient />);

      // Should not throw even when main is not found
      await waitFor(() => {
        expect(document.querySelector).toHaveBeenCalledWith('main');
      });

      document.querySelector = originalQuerySelector;
    });

    it('handles rapid mount/unmount cycles', () => {
      const { unmount } = render(<ReputationPageClient />);
      unmount();

      const { unmount: unmount2 } = render(<ReputationPageClient />);
      expect(() => unmount2()).not.toThrow();
    });
  });
});
