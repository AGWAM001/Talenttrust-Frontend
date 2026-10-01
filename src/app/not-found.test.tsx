import { render, screen } from '@testing-library/react';
import NotFound from './not-found';
import {
  DEFAULT_NOT_FOUND_QUICK_LINKS,
  getNotFoundQuickLinks,
  NOT_FOUND_HOME_HREF,
  NOT_FOUND_SUPPORT_HREF,
} from '@/lib/notFoundContent';
import { assertNoA11yViolations } from '@/test-utils/a11y';

describe('NotFound page', () => {
  beforeEach(() => {
    render(<NotFound />);
  });

  it('renders the h1 heading', () => {
    expect(
      screen.getByRole('heading', { level: 1, name: /page not found/i }),
    ).toBeInTheDocument();
  });

  it('renders the descriptive paragraph', () => {
    expect(
      screen.getByText(/this page doesn't exist or the link may have expired/i),
    ).toBeInTheDocument();
  });

  it('renders 404 as decorative and hidden from assistive technology', () => {
    const decorative = screen.getByText('404');
    expect(decorative).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the quick links nav with an accessible label', () => {
    expect(screen.getByRole('navigation', { name: /quick links/i })).toBeInTheDocument();
  });

  it('renders a link to /contracts', () => {
    expect(
      screen.getByRole('link', { name: /view contracts/i }),
    ).toHaveAttribute('href', '/contracts');
  });

  it('renders a link to /milestones', () => {
    expect(
      screen.getByRole('link', { name: /track milestones/i }),
    ).toHaveAttribute('href', '/milestones');
  });

  it('renders a link to /reputation', () => {
    expect(
      screen.getByRole('link', { name: /my reputation/i }),
    ).toHaveAttribute('href', '/reputation');
  });

  it('renders the Go Home link pointing to /', () => {
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders the Contact Support link', () => {
    expect(
      screen.getByRole('link', { name: /contact support/i }),
    ).toHaveAttribute('href', 'mailto:support@talenttrust.io');
  });

  it('all links are keyboard reachable (rendered as anchor elements)', () => {
    const links = screen.getAllByRole('link');
    // Go Home, Contact Support + 3 quick links = 5
    expect(links.length).toBe(5);
    links.forEach((link) => {
      expect(link.tagName).toBe('A');
    });
  });

  it('matches snapshot', () => {
    const { container } = render(<NotFound />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

/**
 * Compatibility-contract wiring.
 *
 * These tests pin the 404 page to the validated contract module so an upgrade
 * or a malformed/empty upstream list cannot silently change (or drop) the
 * public recovery navigation.
 */
describe('NotFound page compatibility contract', () => {
  it('renders exactly the contract quick links in declaration order', () => {
    render(<NotFound />);

    const rendered = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/'));
    const contract = getNotFoundQuickLinks();

    const quickLinkHrefs = rendered
      .map((link) => link.getAttribute('href'))
      .filter((href) => href !== NOT_FOUND_HOME_HREF);

    expect(quickLinkHrefs).toEqual(contract.map((link) => link.href));
    contract.forEach((link) => {
      expect(
        screen.getByRole('link', { name: new RegExp(link.label, 'i') }),
      ).toHaveAttribute('href', link.href);
    });
  });

  it('renders the documented default links (regression guard)', () => {
    render(<NotFound />);
    DEFAULT_NOT_FOUND_QUICK_LINKS.forEach((link) => {
      expect(screen.getByText(link.label)).toBeInTheDocument();
      expect(screen.getByText(link.description)).toBeInTheDocument();
    });
  });

  it('uses the contract home and support hrefs', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute(
      'href',
      NOT_FOUND_HOME_HREF,
    );
    expect(
      screen.getByRole('link', { name: /contact support/i }),
    ).toHaveAttribute('href', NOT_FOUND_SUPPORT_HREF);
  });

  it('never renders an off-site or protocol-relative anchor', () => {
    render(<NotFound />);
    screen.getAllByRole('link').forEach((link) => {
      const href = link.getAttribute('href') ?? '';
      expect(href.startsWith('//')).toBe(false);
      expect(href.startsWith('http')).toBe(false);
    });
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<NotFound />);
    await assertNoA11yViolations(container);
  });
});
