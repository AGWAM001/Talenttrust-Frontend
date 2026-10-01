import React from 'react';
import { render } from '@testing-library/react';
import ToastCommand from '../ToastCommand';
import { useToast } from '@/components/toast/toast-provider';
import { useRegisterCommandAction } from '@/components/CommandPalette';

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/components/CommandPalette', () => ({
  useRegisterCommandAction: jest.fn(),
}));

describe('ToastCommand', () => {
  const showSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useToast as jest.Mock).mockReturnValue({
      showSuccess,
    });
  });

  it('registers the toast command with the command palette', () => {
    render(<ToastCommand />);

    expect(useRegisterCommandAction).toHaveBeenCalledTimes(1);

    const action = (useRegisterCommandAction as jest.Mock).mock.calls[0][0];

    expect(action.id).toBe('show-toast');
    expect(action.label).toBe('Show Toast');
    expect(action.keywords).toEqual(
      expect.arrayContaining([
        'toast',
        'notification',
        'alert',
        'message',
        'success',
      ]),
    );
  });

  it('shows a toast when the command is activated', () => {
    render(<ToastCommand />);

    const action = (useRegisterCommandAction as jest.Mock).mock.calls[0][0];

    action.onSelect();

    expect(showSuccess).toHaveBeenCalledWith({
      title: 'Toast preview',
      description: 'Command palette action executed.',
    });
  });
});