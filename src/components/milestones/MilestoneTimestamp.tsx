'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/relativeTime';

interface MilestoneTimestampProps {
  date: Date | string | null | undefined;
  className?: string;
  updateInterval?: number;
  labelPrefix?: string;
}

export function MilestoneTimestamp({
  date,
  className = 'text-sm text-slate-500',
  updateInterval = 60000,
  labelPrefix = 'Last updated:',
}: MilestoneTimestampProps) {
  const [relativeTime, setRelativeTime] = useState<string>(() => {
    if (!date) return '—';
    return formatRelativeTime(date);
  });

  const [absoluteTime, setAbsoluteTime] = useState<string>(() => {
    if (!date) return 'Unknown date';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (!date) {
        setRelativeTime('—');
        return;
      }
      setRelativeTime(formatRelativeTime(date));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [date, updateInterval]);

  useEffect(() => {
    if (!date) {
      setRelativeTime('—');
      setAbsoluteTime('Unknown date');
      return;
    }
    setRelativeTime(formatRelativeTime(date));
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    setAbsoluteTime(dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }));
  }, [date]);

  if (!date) {
    return <span className={className} aria-label="No date available">—</span>;
  }

  const dateTime = typeof date === 'string' ? date : date.toISOString();

  return (
    <time
      dateTime={dateTime}
      className={className}
      aria-label={`${labelPrefix} ${absoluteTime}`}
    >
      {relativeTime}
    </time>
  );
}
