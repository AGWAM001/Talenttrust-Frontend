/**
 * Contracts API client.
 *
 * This module owns the HTTP boundary for contract resources. It is
 * deterministic and idempotent: duplicate concurrent requests for the same
 * resource are coalesced through the shared request deduper, and failures are
 * surfaced as typed errors with sanitized messages.
 */

import {
  RequestAbortedError,
  RequestTimeoutError,
  requestDeduper,
} from './requestDedup';

export interface Contract {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  amount?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ContractsApiErrorBody {
  message?: string;
  code?: string;
}

export class ContractsApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'ContractsApiError';
    this.code = code;
    this.status = status;
  }
}

export interface FetchContractOptions {
  /** Force a fresh network request even if one is in-flight. */
  force?: boolean;
  /** Caller-scoped abort signal. */
  signal?: AbortSignal;
  /** Optional timeout in milliseconds. */
  timeoutMs?: number;
  /** Override the base URL (mainly for tests). */
  baseUrl?: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;

const isValidId = (id: unknown): boolean =>
  typeof id === 'string' && id.trim().length > 0 && /^[A-Za-z0-9_.:-]+$/.test(id);

function resolveBaseUrl(override?: string): string {
  if (override) return override.replace(/\/+$/, '');
  const env = typeof process !== 'undefined' ? process.env : undefined;
  const fromEnv = env?.NEXT_PUBLIC_CONTRACTS_API_URL || env?.NEXT_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\+$/, '');
  return '/api';
}

function sanitizeMessage(raw: unknown, fallback: string): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length > 0 && trimmed.length <= 200) return trimmed;
  }
  return fallback;
}

async function parseErrorResponse(res: Response): Promise<ContractsApiErrorBody> {
  try {
    const data = (await res.json()) as ContractsApiErrorBody;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function toApiError(error: unknown, status: number | undefined, body?: ContractsApiErrorBody): ContractsApiError {
  if (error instanceof ContractsApiError) return error;
  if (error instanceof RequestAbortedError) {
    return new ContractsApiError('Request was aborted.', 'ER_ABORTED', status);
  }
  if (error instanceof RequestTimeoutError) {
    return new ContractsApiError('Request timed out.', 'ER_TIMEOUT', status);
  }
  const message = sanitizeMessage(body?.message, 'Unable to load contract.');
  const code = typeof body?.code === 'string' ? body.code : 'ER_CONTRACTS_FETCH';
  return new ContractsApiError(message, code, status);
}

/**
 * Fetch a single contract by id.
 *
 * Concurrent calls for the same id coalesce into a single network request.
 * Results are not cached beyond the in-flight window, so a later call always
 * observes fresh server state.
 */
export async function fetchContract(id: string, options: FetchContractOptions = {}): Promise<Contract> {
  if (!isValidId(id)) {
    throw new ContractsApiError('Invalid contract id.', 'ER_INVALID_ID');
  }

  const normalizedId = id.trim();
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const dedupKey = `contracts:get:${baseUrl}:${normalizedId}`;

  if (options.force) {
    requestDeduper.abort(dedupKey);
  }

  return requestDeduper.run<Contract>(
    dedupKey,
    async (signal) => {
      const response = await fetch(`${baseUrl}/contracts/${encodeURIComponent(normalizedId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
        signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const body = await parseErrorResponse(response);
        throw toApiError(null, response.status, body);
      }

      const data = (await response.json()) as Contract | null;
      if (!data || typeof data !== 'object') {
        throw new ContractsApiError(
          'Received an invalid contract response.',
          'ER_INVALID_RESPONSE',
          response.status,
        );
      }

      return data;
    },
    { signal: options.signal, timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS },
  ).catch((error) => {
    throw toApiError(error, undefined);
  });
}
