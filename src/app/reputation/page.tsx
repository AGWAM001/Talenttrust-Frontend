'use client';

import React, { useEffect, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ReputationProfile from '@/components/ReputationProfile';
import ReputationSummaryCard from '@/components/ReputationSummaryCard';
import { listReputationEvents } from '@/lib/repository';
import type { Reputation } from '@/types/domain';

export type ReputationPageContentProps = {
  reputationData?: Reputation | null;
  userName?: string;
};

export function ReputationPageContent({
  reputationData,
  userName = 'User',
}: ReputationPageContentProps) {
  const score = reputationData?.score;
  const hasReputation = typeof score === 'number' && score >= 0;

  if (!reputationData || !hasReputation) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-6">Reputation</h1>
        <EmptyState
          illustration="reputation"
          title="No reputation yet"
          description="Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Reputation</h1>
      <ReputationSummaryCard
        name={userName}
        score={score}
        level={reputationData.level}
        history={reputationData.history}
      />
      <ReputationProfile
        name={userName}
        score={score}
        level={reputationData.level}
        history={reputationData.history}
        lastUpdated={reputationData.lastUpdated}
      />
    </main>
  );
}

const ReputationPage: React.FC = () => {
  const [reputationData, setReputationData] = useState<Reputation | null>(null);

  useEffect(() => {
    const history = listReputationEvents();
    // Provide a default profile if we have history or just to show the UI
    setReputationData({
      score: 4.5,
      level: 'Expert',
      history,
    });
  }, []);

  return (
    <ReputationPageContent
      reputationData={reputationData}
    />
  );
};

export default ReputationPage;
