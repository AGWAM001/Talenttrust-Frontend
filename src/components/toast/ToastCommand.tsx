'use client';

import { useMemo } from 'react';
import { useToast } from '@/components/toast/toast-provider';
import { useRegisterCommandAction } from '@/components/CommandPalette';

export default function ToastCommand() {
  console.log('ToastCommand mounted');

  const { showSuccess } = useToast();

  const toastAction = useMemo(
    () => ({
      id: 'show-toast',
      label: 'Show Toast',
      keywords: [
        'toast',
        'notification',
        'alert',
        'message',
        'success',
      ],
      section: 'Dialogs',
      onSelect: () =>
        showSuccess({
          title: 'Toast preview',
          description: 'Command palette action executed.',
        }),
    }),
    [showSuccess],
  );

  useRegisterCommandAction(toastAction);

  return null;
}