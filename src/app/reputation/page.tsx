'use client';

import { useEffect, useState } from 'react';
import { listReputationEvents } from '@/lib/repository';
import { reportError } from '@/lib/errorReporter';
import type { Reputation } from '@/types/domain';
import { ReputationPageContent } from './ReputationPageContent';

export { ReputationPageContent };
export type { ReputationPageContentProps } from './ReputationPageContent';

const ReputationPage = () => {
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
