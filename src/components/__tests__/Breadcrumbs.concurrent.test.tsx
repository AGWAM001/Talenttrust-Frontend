import React, { useState, useEffect } from 'react';
import { render, screen, act, within } from '@testing-library/react';
import Breadcrumbs, {
  createBreadcrumbsFromPath,
  normalizeBreadcrumbItems,
  BreadcrumbItem,
} from '../Breadcrumbs';

describe('Breadcrumbs — Concurrency & Boundary Hardening', () => {
  describe('createBreadcrumbsFromPath', () => {
    it('returns empty array on null, undefined, or empty path', () => {
      expect(createBreadcrumbsFromPath(null)).toEqual([]);
      expect(createBreadcrumbsFromPath(undefined)).toEqual([]);
      expect(createBreadcrumbsFromPath('')).toEqual([]);
      expect(createBreadcrumbsFromPath('   ')).toEqual([]);
    });

    it('returns Home crumb for root path "/"', () => {
      expect(createBreadcrumbsFromPath('/')).toEqual([{ label: 'Home', href: '/' }]);
    });

    it('handles nested route segments correctly', () => {
      const crumbs = createBreadcrumbsFromPath('/contracts/42');
      expect(crumbs).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: '#42' },
      ]);
    });

    it('strips query strings and hash anchors deterministically', () => {
      const crumbs = createBreadcrumbsFromPath('/contracts/milestones?tab=active#details');
      expect(crumbs).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: 'Milestones' },
      ]);
    });

    it('handles URI-encoded segments and special characters safely', () => {
      const crumbs = createBreadcrumbsFromPath('/projects/web3%20development');
      expect(crumbs).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Projects', href: '/projects' },
        { label: 'Web3 Development' },
      ]);
    });

    it('handles multiple consecutive and trailing slashes idempotently', () => {
      const crumbs = createBreadcrumbsFromPath('///contracts///active///');
      expect(crumbs).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: 'Active' },
      ]);
    });
  });

  describe('normalizeBreadcrumbItems', () => {
    it('filters out nullish, non-object, and empty entries', () => {
      const raw = [
        null,
        undefined,
        'invalid' as unknown as BreadcrumbItem,
        { label: ' ' },
        { label: 'Valid Crumb', href: '/valid' },
        { label: '', href: '/empty' },
      ];
      const normalized = normalizeBreadcrumbItems(raw);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].label).toBe('Valid Crumb');
      expect(normalized[0].href).toBe('/valid');
    });

    it('strips unsafe javascript: and data: href protocols', () => {
      const raw: BreadcrumbItem[] = [
        { label: 'Malicious Crumb', href: 'javascript:alert(1)' },
        { label: 'Data Crumb', href: 'data:text/html,hack' },
        { label: 'Safe Crumb', href: '/safe' },
      ];
      const normalized = normalizeBreadcrumbItems(raw);
      expect(normalized[0].href).toBeUndefined();
      expect(normalized[1].href).toBeUndefined();
      expect(normalized[2].href).toBe('/safe');
    });

    it('falls back to path when items array is empty or undefined', () => {
      const normalized = normalizeBreadcrumbItems(undefined, '/contracts/99');
      expect(normalized).toEqual([
        { label: 'Home', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: '#99' },
      ]);
    });
  });

  describe('Concurrent Execution & Race Condition Handling', () => {
    function RacingRouteComponent({
      paths,
      delays,
    }: {
      paths: string[];
      delays: number[];
    }) {
      const [currentPath, setCurrentPath] = useState('/');

      useEffect(() => {
        paths.forEach((p, idx) => {
          setTimeout(() => {
            act(() => {
              setCurrentPath(p);
            });
          }, delays[idx]);
        });
      }, []);

      return <Breadcrumbs path={currentPath} data-testid="racing-crumbs" />;
    }

    it('settles on the latest path under out-of-order resolved updates', async () => {
      jest.useFakeTimers();

      render(
        <RacingRouteComponent
          paths={['/contracts/slow-1', '/contracts/fast-2', '/contracts/final-3']}
          delays={[150, 50, 200]}
        />,
      );

      // Fast update at 50ms
      act(() => {
        jest.advanceTimersByTime(60);
      });
      expect(screen.getByText('Fast 2')).toBeInTheDocument();

      // Slow update at 150ms
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(screen.getByText('Slow 1')).toBeInTheDocument();

      // Final update at 200ms
      act(() => {
        jest.advanceTimersByTime(60);
      });
      expect(screen.getByText('Final 3')).toBeInTheDocument();

      jest.useRealTimers();
    });

    it('renders multiple concurrent instances in parallel without collision', () => {
      render(
        <div>
          <Breadcrumbs
            items={[
              { label: 'Root 1', href: '/' },
              { label: 'Sub 1' },
            ]}
            data-testid="instance-1"
          />
          <Breadcrumbs
            items={[
              { label: 'Root 2', href: '/' },
              { label: 'Sub 2' },
            ]}
            data-testid="instance-2"
          />
        </div>,
      );

      const nav1 = screen.getByTestId('instance-1');
      const nav2 = screen.getByTestId('instance-2');

      expect(within(nav1).getByText('Sub 1')).toBeInTheDocument();
      expect(within(nav2).getByText('Sub 2')).toBeInTheDocument();
    });

    it('survives rapid unmount and remount stress cycles without errors', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/' },
        { label: 'Contracts', href: '/contracts' },
        { label: 'Active' },
      ];

      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<Breadcrumbs items={items} />);
        unmount();
      }

      const { container } = render(<Breadcrumbs items={items} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('supports custom separators and custom aria-labels', () => {
      render(
        <Breadcrumbs
          path="/contracts/review"
          separator=">"
          aria-label="Contract Directory"
        />,
      );

      const nav = screen.getByRole('navigation', { name: 'Contract Directory' });
      expect(nav).toBeInTheDocument();

      const separators = nav.querySelectorAll('[aria-hidden="true"]');
      expect(separators.length).toBeGreaterThan(0);
      expect(separators[0].textContent).toBe('>');
    });
  });
});
