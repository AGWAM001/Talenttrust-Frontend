import type { ValidationError } from './validateLogin';

const ALLOWED_THEMES: ReadonlySet<string> = new Set(['light', 'dark', 'system']);
const ALLOWED_AMOUNT_FORMATS: ReadonlySet<string> = new Set(['usd', 'ngn', 'compact']);
const ALLOWED_TOAST_DENSITIES: ReadonlySet<string> = new Set(['relaxed', 'compact']);
const ALLOWED_FORM_DENSITIES: ReadonlySet<string> = new Set(['comfortable', 'compact']);
const ALLOWED_LIST_DENSITIES: ReadonlySet<string> = new Set(['comfortable', 'compact']);
const ALLOWED_CONTRACTS_DENSITIES: ReadonlySet<string> = new Set(['comfortable', 'compact']);
const ALLOWED_TOAST_DURATIONS: ReadonlySet<string> = new Set(['short', 'normal', 'long', 'persistent']);

export const MIN_IDLE_DISCONNECT_MS = 5000;
export const MAX_IDLE_DISCONNECT_MS = 30000;

export interface PreferencesFormValues {
  theme: string;
  amountFormat: string;
  toastDensity: string;
  formDensity: string;
  milestonesDensity: string;
  walletDensity: string;
  contractsDensity: string;
  quietMode: boolean;
  toastDuration: string;
  idleDisconnectMs: string;
}

export function validatePreferences(values: PreferencesFormValues): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!ALLOWED_THEMES.has(values.theme)) {
    errors.push({ fieldId: 'pref-theme', message: 'Theme must be one of: light, dark, or system' });
  }

  if (!ALLOWED_AMOUNT_FORMATS.has(values.amountFormat)) {
    errors.push({ fieldId: 'pref-amountFormat', message: 'Currency display must be one of: usd, ngn, or compact' });
  }

  if (!ALLOWED_TOAST_DENSITIES.has(values.toastDensity)) {
    errors.push({ fieldId: 'pref-toastDensity', message: 'Toast density must be relaxed or compact' });
  }

  if (!ALLOWED_FORM_DENSITIES.has(values.formDensity)) {
    errors.push({ fieldId: 'pref-formDensity', message: 'Form density must be comfortable or compact' });
  }

  if (!ALLOWED_LIST_DENSITIES.has(values.milestonesDensity)) {
    errors.push({ fieldId: 'pref-milestonesDensity', message: 'Milestones density must be comfortable or compact' });
  }

  if (!ALLOWED_LIST_DENSITIES.has(values.walletDensity)) {
    errors.push({ fieldId: 'pref-walletDensity', message: 'Wallet density must be comfortable or compact' });
  }

  if (!ALLOWED_CONTRACTS_DENSITIES.has(values.contractsDensity)) {
    errors.push({ fieldId: 'pref-contractsDensity', message: 'Contracts density must be comfortable or compact' });
  }

  if (!ALLOWED_TOAST_DURATIONS.has(values.toastDuration)) {
    errors.push({ fieldId: 'pref-toastDuration', message: 'Toast duration must be short, normal, long, or persistent' });
  }

  const idleTrimmed = values.idleDisconnectMs.trim();
  if (idleTrimmed !== '') {
    const parsed = Number(idleTrimmed);
    if (!Number.isInteger(parsed) || idleTrimmed.includes('.') || idleTrimmed.includes('e') || idleTrimmed.includes('E')) {
      errors.push({ fieldId: 'pref-idleDisconnectMs', message: 'Idle disconnect must be a whole number' });
    } else if (parsed !== 0 && (parsed < MIN_IDLE_DISCONNECT_MS || parsed > MAX_IDLE_DISCONNECT_MS)) {
      errors.push({
        fieldId: 'pref-idleDisconnectMs',
        message: `Idle disconnect must be 0 (disabled) or between ${MIN_IDLE_DISCONNECT_MS} and ${MAX_IDLE_DISCONNECT_MS} ms`,
      });
    }
  }

  return errors;
}
