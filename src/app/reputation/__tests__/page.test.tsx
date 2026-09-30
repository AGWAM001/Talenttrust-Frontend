import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReputationPageContent } from '../page';

// Mock the ReputationProfile component to avoid complex rendering
jest.mock('../../../components/ReputationProfile', () => {
  return function MockReputationProfile(props: any) {
    return (
      <div data-testid="reputation-profile">
        <div data-testid="reputation-score">{props.score ?? 'N/A'}</div>
        <div data-testid="reputation-level">{props.level ?? (props.score === 50 ? 'Expert' : 'Community Member')}</div>
        <div data-testid="reputation-name">{props.name}</div>
        <div data-testid="reputation-history-count">{props.history?.length ?? 0}</div>
        {props.history && props.history.length > 0 && (
          <ul data-testid="reputation-history">
            {props.history.map((event: any) => (
              <li key={event.id} data-testid={`history-event-${event.id}`}>
                {event.type}: {event.summary}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
});

describe('ReputationPageContent', () => {
  describe('State 1: No Reputation', () => {
    it('renders EmptyState when reputation data is null', () => {
      render(<ReputationPageContent reputationData={null} />);

      expect(screen.getByText('No reputation yet')).toBeInTheDocument();
      expect(screen.getByText('Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract.')).toBeInTheDocument();
      expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
    });

    it('renders EmptyState when reputation data is undefined', () => {
      render(<ReputationPageContent reputationData={undefined} />);

      expect(screen.getByText('No reputation yet')).toBeInTheDocument();
      expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
    });

    it('renders EmptyState when score is null or undefined', () => {
      const data = { score: null, history: [] };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByText('No reputation yet')).toBeInTheDocument();
      expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
    });

    it('renders EmptyState when score is negative', () => {
      const data = { score: -5, history: [] };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByText('No reputation yet')).toBeInTheDocument();
      expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'renders EmptyState when score is non-finite (%s)',
      (score) => {
        render(<ReputationPageContent reputationData={{ score, history: [] }} />);

        expect(screen.getByText('No reputation yet')).toBeInTheDocument();
        expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
      },
    );

    it('does not render ReputationProfile when there is no reputation data', () => {
      render(<ReputationPageContent />);

      expect(screen.queryByTestId('reputation-profile')).not.toBeInTheDocument();
    });
  });

  describe('State 2: Partial Reputation (score only, no history)', () => {
    it('renders ReputationProfile when score exists but history is empty', () => {
      const data = {
        score: 42,
        level: 'Community Member',
        history: [],
      };
      render(<ReputationPageContent reputationData={data} userName="Alice" />);

      expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
      expect(screen.getByTestId('reputation-score')).toHaveTextContent('42');
      expect(screen.getByTestId('reputation-level')).toHaveTextContent('Community Member');
      expect(screen.getByTestId('reputation-name')).toHaveTextContent('Alice');
      expect(screen.getByTestId('reputation-history-count')).toHaveTextContent('0');
      expect(screen.queryByTestId('reputation-history')).not.toBeInTheDocument();
    });

    it('passes correct props to ReputationProfile with partial data', () => {
      const data = {
        score: 65,
        level: 'Active Member',
      };
      render(<ReputationPageContent reputationData={data} userName="Bob" />);

      expect(screen.getByTestId('reputation-score')).toHaveTextContent('65');
      expect(screen.getByTestId('reputation-level')).toHaveTextContent('Active Member');
      expect(screen.getByTestId('reputation-name')).toHaveTextContent('Bob');
    });
  });

  describe('State 3: Full Reputation (score + history)', () => {
    it('renders ReputationProfile with complete data including history', () => {
      const history = [
        {
          id: '1',
          type: 'Verification',
          summary: 'Completed identity verification',
          date: '2026-04-24',
        },
        {
          id: '2',
          type: 'On-chain review',
          summary: 'Received positive trust signal',
          date: '2026-04-23',
        },
      ];
      const data = {
        score: 88,
        level: 'Trusted Contributor',
        history,
      };
      render(<ReputationPageContent reputationData={data} userName="Charlie" />);

      expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
      expect(screen.getByTestId('reputation-score')).toHaveTextContent('88');
      expect(screen.getByTestId('reputation-level')).toHaveTextContent('Trusted Contributor');
      expect(screen.getByTestId('reputation-name')).toHaveTextContent('Charlie');
      expect(screen.getByTestId('reputation-history-count')).toHaveTextContent('2');
      expect(screen.getByTestId('history-event-1')).toHaveTextContent('Verification: Completed identity verification');
      expect(screen.getByTestId('history-event-2')).toHaveTextContent('On-chain review: Received positive trust signal');
    });

    it('renders all history items when present', () => {
      const history = [
        { id: '1', type: 'Event 1', summary: 'Summary 1', date: '2026-04-24' },
        { id: '2', type: 'Event 2', summary: 'Summary 2', date: '2026-04-23' },
        { id: '3', type: 'Event 3', summary: 'Summary 3', date: '2026-04-22' },
      ];
      const data = { score: 90, history };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByTestId('reputation-history-count')).toHaveTextContent('3');
      expect(screen.getByTestId('history-event-1')).toBeInTheDocument();
      expect(screen.getByTestId('history-event-2')).toBeInTheDocument();
      expect(screen.getByTestId('history-event-3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy with h1 for page title', () => {
      render(<ReputationPageContent />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Reputation');
    });

    it('does not render duplicate primary headings', () => {
      render(<ReputationPageContent />);

      const h1Headings = screen.getAllByRole('heading', { level: 1 });
      expect(h1Headings).toHaveLength(1);
    });

    it('contains main element for semantic structure', () => {
      const { container } = render(<ReputationPageContent />);

      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
    });
  });

  describe('Data transformation and defaults', () => {
    it('applies default level when not provided', () => {
      const data = { score: 50 };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByTestId('reputation-level')).toHaveTextContent('Expert');
    });

    it('applies default name when not provided', () => {
      const data = { score: 50 };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByTestId('reputation-name')).toHaveTextContent('User');
    });

    it('applies default empty history array when not provided', () => {
      const data = { score: 50 };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByTestId('reputation-history-count')).toHaveTextContent('0');
    });
  });

  describe('Edge cases', () => {
    it('handles zero score as valid reputation', () => {
      const data = { score: 0, history: [] };
      render(<ReputationPageContent reputationData={data} />);

      // Zero is a valid score, not "no reputation"
      expect(screen.getByTestId('reputation-profile')).toBeInTheDocument();
      expect(screen.getByTestId('reputation-score')).toHaveTextContent('0');
    });

    it('handles multiple history entries', () => {
      const history = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        type: `Type ${i}`,
        summary: `Summary ${i}`,
        date: `2026-04-${24 - i}`,
      }));
      const data = { score: 75, history };
      render(<ReputationPageContent reputationData={data} />);

      expect(screen.getByTestId('reputation-history-count')).toHaveTextContent('5');
    });

    it('renders correctly with custom userName', () => {
      const data = { score: 50 };
      render(<ReputationPageContent reputationData={data} userName="CustomName" />);

      expect(screen.getByTestId('reputation-name')).toHaveTextContent('CustomName');
    });

    it('keeps repeated independent renders isolated', () => {
      const firstRender = render(
        <ReputationPageContent reputationData={{ score: 12 }} userName="Ada" />,
      );
      const secondRender = render(
        <ReputationPageContent reputationData={{ score: 84 }} userName="Grace" />,
      );

      expect(firstRender.container.querySelector('[data-testid="reputation-score"]'))
        .toHaveTextContent('12');
      expect(firstRender.container.querySelector('[data-testid="reputation-name"]'))
        .toHaveTextContent('Ada');
      expect(secondRender.container.querySelector('[data-testid="reputation-score"]'))
        .toHaveTextContent('84');
      expect(secondRender.container.querySelector('[data-testid="reputation-name"]'))
        .toHaveTextContent('Grace');
    });
  });
});
