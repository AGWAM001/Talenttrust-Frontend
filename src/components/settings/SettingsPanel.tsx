'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { usePreferences, type UserPreferences } from '@/lib/preferences';
import { useToast } from '@/components/toast/toast-provider';
import { reportError } from '@/lib/errorReporter';
import { validatePreferences } from '@/lib/validatePreferences';

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
const CURRENCY_OPTIONS = ['usd', 'ngn', 'compact'] as const;
const TOAST_DENSITY_OPTIONS = ['relaxed', 'compact'] as const;
const FORM_DENSITY_OPTIONS = ['comfortable', 'compact'] as const;
const CONTRACTS_DENSITY_OPTIONS = ['comfortable', 'compact'] as const;

interface RadioGroupProps<T extends string = string> {
  options: readonly T[];
  value: T;
  onChange: (val: T) => void;
  labelId: string;
  ariaLabel: string;
  containerClassName: string;
  textClassName: string;
}

function RadioGroupInner<T extends string>({
  options,
  value,
  onChange,
  labelId,
  ariaLabel,
  containerClassName,
  textClassName,
}: RadioGroupProps<T>) {
  const renderCount = React.useRef(0);
  renderCount.current += 1;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const radios = Array.from(e.currentTarget.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
      const currentIndex = (options as readonly string[]).indexOf(value);
      const nextIndex =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? (currentIndex + 1) % options.length
          : (currentIndex - 1 + options.length) % options.length;

      onChange(options[nextIndex]);
      radios[nextIndex]?.focus();
    }
  };

  return (
    <div
      data-testid={`${ariaLabel.toLowerCase().replace(/\s+/g, '-')}-group`}
      data-render-count={renderCount.current}
      className={containerClassName}
      role="radiogroup"
      aria-labelledby={labelId}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(option);
            }
          }}
          role="radio"
          aria-checked={value === option}
          tabIndex={value === option ? 0 : -1}
          className={`px-3 py-2 text-sm rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${textClassName} ${
            value === option
              ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--muted-foreground)]'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const RadioGroup = memo(RadioGroupInner) as <T extends string>(props: RadioGroupProps<T>) => React.ReactElement;

interface AppearanceSectionProps {
  theme: UserPreferences['theme'];
  amountFormat: UserPreferences['amountFormat'];
  onThemeChange: (value: UserPreferences['theme']) => void;
  onAmountFormatChange: (value: UserPreferences['amountFormat']) => void;
}

const AppearanceSection = memo(function AppearanceSection({
  theme,
  amountFormat,
  onThemeChange,
  onAmountFormatChange,
}: AppearanceSectionProps) {
  const renderCount = React.useRef(0);
  renderCount.current += 1;

  return (
    <section data-testid="appearance-section" data-render-count={renderCount.current} className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Appearance</h3>

      <div className="space-y-4">
        <ThemeErrorBoundary>
          <div>
            <label id="theme-label" className="block text-sm font-medium mb-2 text-[var(--foreground)]">Theme</label>
            <RadioGroup
              options={THEME_OPTIONS}
              value={theme}
              onChange={onThemeChange}
              labelId="theme-label"
              ariaLabel="Theme"
              containerClassName="grid grid-cols-3 gap-2"
              textClassName="capitalize"
            />
          </div>
        </ThemeErrorBoundary>

        <div>
          <label id="currency-label" className="block text-sm font-medium mb-2 text-[var(--foreground)]">Currency Display</label>
          <RadioGroup
            options={CURRENCY_OPTIONS}
            value={amountFormat}
            onChange={onAmountFormatChange}
            labelId="currency-label"
            ariaLabel="Currency Display"
            containerClassName="grid grid-cols-3 gap-2"
            textClassName="uppercase"
          />
        </div>
      </div>
    </section>
  );
});

AppearanceSection.displayName = 'AppearanceSection';

interface PreferenceControlsProps {
  toastDensity: UserPreferences['toastDensity'];
  formDensity: UserPreferences['formDensity'];
  contractsDensity: UserPreferences['contractsDensity'];
  quietMode: boolean;
  onToastDensityChange: (value: UserPreferences['toastDensity']) => void;
  onFormDensityChange: (value: UserPreferences['formDensity']) => void;
  onContractsDensityChange: (value: UserPreferences['contractsDensity']) => void;
  onQuietModeToggle: () => void;
}

const PreferenceControls = memo(function PreferenceControls({
  toastDensity,
  formDensity,
  contractsDensity,
  quietMode,
  onToastDensityChange,
  onFormDensityChange,
  onContractsDensityChange,
  onQuietModeToggle,
}: PreferenceControlsProps) {
  const renderCount = React.useRef(0);
  renderCount.current += 1;

  return (
    <section data-testid="preference-controls" data-render-count={renderCount.current} className="space-y-4">
      <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Notifications</h3>

      <div className="space-y-4">
        <div>
          <label id="density-label" className="block text-sm font-medium mb-2 text-[var(--foreground)]">Toast Density</label>
          <RadioGroup
            options={TOAST_DENSITY_OPTIONS}
            value={toastDensity}
            onChange={onToastDensityChange}
            labelId="density-label"
            ariaLabel="Toast Density"
            containerClassName="grid grid-cols-2 gap-2"
            textClassName="capitalize"
          />
        </div>

        <div>
          <label id="form-density-label" className="block text-sm font-medium mb-2 text-[var(--foreground)]">Form Density</label>
          <RadioGroup
            options={FORM_DENSITY_OPTIONS}
            value={formDensity}
            onChange={onFormDensityChange}
            labelId="form-density-label"
            ariaLabel="Form Density"
            containerClassName="grid grid-cols-2 gap-2"
            textClassName="capitalize"
          />
        </div>

        <div>
          <label id="contracts-density-label" className="block text-sm font-medium mb-2 text-[var(--foreground)]">Contracts Density</label>
          <RadioGroup
            options={CONTRACTS_DENSITY_OPTIONS}
            value={contractsDensity}
            onChange={onContractsDensityChange}
            labelId="contracts-density-label"
            ariaLabel="Contracts Density"
            containerClassName="grid grid-cols-2 gap-2"
            textClassName="capitalize"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label id="quiet-mode-label" className="text-sm font-medium text-[var(--foreground)]">Quiet Mode</label>
            <p className="text-xs text-[var(--muted-foreground)]">Suppress success notifications</p>
          </div>
          <button
            onClick={onQuietModeToggle}
            role="switch"
            aria-checked={quietMode}
            aria-labelledby="quiet-mode-label"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${
              quietMode ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                quietMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
});

PreferenceControls.displayName = 'PreferenceControls';

export class ThemeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    reportError(error, 'ThemeErrorBoundary');
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 border border-[var(--destructive)] rounded-md bg-[var(--destructive)]/10 text-sm space-y-3 my-4">
          <p className="text-[var(--destructive)] font-medium">Theme section failed to load.</p>
          <button 
            onClick={this.reset}
            className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--destructive)] text-[var(--destructive)] rounded-md hover:opacity-80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] focus-visible:ring-offset-2 font-medium"
            aria-label="Retry loading theme section"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { preferences, updatePreference } = usePreferences();
  const { showError } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const [idleInput, setIdleInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setIdleInput(String(preferences.idleDisconnectMs));
      setErrors({});
    }
  }, [isOpen, preferences.idleDisconnectMs]);

  const clearError = (fieldId: string) => {
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const runValidation = useCallback(() => {
    const result = validatePreferences({
      theme: preferences.theme,
      amountFormat: preferences.amountFormat,
      toastDensity: preferences.toastDensity,
      formDensity: preferences.formDensity,
      milestonesDensity: preferences.milestonesDensity,
      walletDensity: preferences.walletDensity,
      contractsDensity: preferences.contractsDensity,
      quietMode: preferences.quietMode,
      toastDuration: preferences.toastDuration,
      idleDisconnectMs: idleInput,
    });

    const errorMap: Record<string, string> = {};
    for (const err of result) {
      errorMap[err.fieldId] = err.message;
    }

    setErrors(errorMap);
    return result.length === 0;
  }, [preferences, idleInput]);

  const handleUpdate = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      try {
        await updatePreference(key, value);
      } catch {
        showError({ title: 'Failed to update settings. Please try again.' });
      }
    },
    [showError, updatePreference],
  );

  const setTheme = useCallback(
    (theme: UserPreferences['theme']) => {
      void handleUpdate('theme', theme);
    },
    [handleUpdate],
  );

  const setAmountFormat = useCallback(
    (amountFormat: UserPreferences['amountFormat']) => {
      void handleUpdate('amountFormat', amountFormat);
    },
    [handleUpdate],
  );

  const setToastDensity = useCallback(
    (toastDensity: UserPreferences['toastDensity']) => {
      void handleUpdate('toastDensity', toastDensity);
    },
    [handleUpdate],
  );

  const setFormDensity = useCallback(
    (formDensity: UserPreferences['formDensity']) => {
      void handleUpdate('formDensity', formDensity);
    },
    [handleUpdate],
  );

  const setContractsDensity = useCallback(
    (contractsDensity: UserPreferences['contractsDensity']) => {
      void handleUpdate('contractsDensity', contractsDensity);
    },
    [handleUpdate],
  );

  const toggleQuietMode = useCallback(() => {
    void handleUpdate('quietMode', !preferences.quietMode);
  }, [handleUpdate, preferences.quietMode]);

  const _handleRadioChange = (key: keyof UserPreferences, value: string) => {
    clearError(`pref-${key}`);
    handleUpdate(key as any, value as any);
  };

  const _handleIdleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIdleInput(val);
    if (errors['pref-idleDisconnectMs']) {
      const testErrors = validatePreferences({
        theme: preferences.theme,
        amountFormat: preferences.amountFormat,
        toastDensity: preferences.toastDensity,
        formDensity: preferences.formDensity,
        milestonesDensity: preferences.milestonesDensity,
        walletDensity: preferences.walletDensity,
        contractsDensity: preferences.contractsDensity,
        quietMode: preferences.quietMode,
        toastDuration: preferences.toastDuration,
        idleDisconnectMs: val,
      });
      const idleErr = testErrors.find((e) => e.fieldId === 'pref-idleDisconnectMs');
      if (idleErr) {
        setErrors((prev) => ({ ...prev, 'pref-idleDisconnectMs': idleErr.message }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next['pref-idleDisconnectMs'];
          return next;
        });
      }
    }
  };

  const _handleIdleBlur = () => {
    if (idleInput === String(preferences.idleDisconnectMs)) return;
    const testErrors = validatePreferences({
      theme: preferences.theme,
      amountFormat: preferences.amountFormat,
      toastDensity: preferences.toastDensity,
      formDensity: preferences.formDensity,
      milestonesDensity: preferences.milestonesDensity,
      walletDensity: preferences.walletDensity,
      contractsDensity: preferences.contractsDensity,
      quietMode: preferences.quietMode,
      toastDuration: preferences.toastDuration,
      idleDisconnectMs: idleInput,
    });
    const idleErr = testErrors.find((e) => e.fieldId === 'pref-idleDisconnectMs');
    if (idleErr) {
      setErrors((prev) => ({ ...prev, 'pref-idleDisconnectMs': idleErr.message }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next['pref-idleDisconnectMs'];
        return next;
      });
      const parsed = parseInt(idleInput, 10);
      if (!isNaN(parsed) && idleInput.trim() !== '') {
        handleUpdate('idleDisconnectMs', parsed);
      }
    }
  };

  const _errorList = Object.entries(errors).map(([fieldId, message]) => ({ fieldId, message }));

  /**
   * Focus management effect for modal dialog accessibility.
   * - Sets initial focus to the close button when dialog opens
   * - Implements focus trapping to prevent focus from leaving the dialog
   * - Handles Tab key wrapping from last to first element
   * - Handles Shift+Tab wrapping from first to last element
   * - Closes dialog on Escape key press
   */
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Save whatever held focus before the panel opened so it can be
    // restored on close (WCAG 2.1 SC 3.2.2), mirroring the restoreFocus
    // behaviour of useDialogFocusTrap without depending on the hook itself.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Set initial focus to the close button
    const closeBtn = panel.querySelector<HTMLElement>('[aria-label="Close settings"]');
    closeBtn?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const els = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const handleDone = () => {
    if (runValidation()) {
      onClose();
    } else {
      // Focus the error summary so screen readers announce the errors
      requestAnimationFrame(() => {
        errorSummaryRef.current?.focus();
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-[var(--background)] shadow-xl flex flex-col h-full border-l border-[var(--border)]"
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 id="settings-panel-title" className="text-xl font-bold text-[var(--foreground)]">Settings</h2>
          <button 
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--accent)] text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            aria-label="Close settings"
          >
            <svg aria-hidden="true" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <AppearanceSection
            theme={preferences.theme}
            amountFormat={preferences.amountFormat}
            onThemeChange={setTheme}
            onAmountFormatChange={setAmountFormat}
          />

          <PreferenceControls
            toastDensity={preferences.toastDensity}
            formDensity={preferences.formDensity}
            contractsDensity={preferences.contractsDensity}
            quietMode={preferences.quietMode}
            onToastDensityChange={setToastDensity}
            onFormDensityChange={setFormDensity}
            onContractsDensityChange={setContractsDensity}
            onQuietModeToggle={toggleQuietMode}
          />
        </div>

        <div className="p-6 border-t border-[var(--border)] bg-[var(--surface)]">
          <button 
            onClick={handleDone}
            className="w-full py-2 px-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
