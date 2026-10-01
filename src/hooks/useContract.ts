"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ContractsApiError,
  fetchContract,
  type Contract,
} from "../lib/contractsApi";
import { reportError } from "../lib/errorReporting";

export type ContractLoadStatus = "idle" | "loading" | "success" | "error" | "not-found";

export interface UseContractResult {
  status: ContractLoadStatus;
  contract: Contract | null;
  error: ContractsApiError | null;
  /** True while a retry is in flight after a failure. */
  isRetrying: boolean;
  /** Number of completed attempts for the current id. */
  attempts: number;
  /** Manual retry. No-op if not in an error state. */
  retry: () => void;
  /** Refetch from scratch. */
  refresh: () => void;
}

export interface UseContractOptions {
  /** Number of automatic retries for retryable failures. */
  retries?: number;
  /** Base retry delay in ms. */
  retryDelayMs?: number;
  /** Disable automatic fetching (useful for tests). */
  enabled?: boolean;
  /** Injectable fetch for testing. */
  fetchImpl?: typeof fetch;
  /** Injectable sleep for testing. */
  sleep?: (ms: number) => Promise<void>;
  /** Correlation id for observability. */
  correlationId?: string;
  /** Optional callback invoked on every failure (including auto-retries). */
  onError?: (error: ContractsApiError, attempt: number) => void;
}

interface InternalState {
  status: ContractLoadStatus;
  contract: Contract | null;
  error: ContractsApiError | null;
  attempts: number;
  isRetrying: boolean;
  /** Monotonically increasing token that identifies the current load. */
  requestId: number;
}

const INITIAL_STATE: InternalState = {
  status: "idle",
  contract: null,
  error: null,
  attempts: 0,
  isRetrying: false,
  requestId: 0,
};

function toApiError(error: unknown): ContractsApiError {
  if (error instanceof ContractsApiError) return error;
  if (error instanceof Error) {
    return new ContractsApiError(error.message, "network", {
      retryable: true,
      cause: error,
    });
  }
  return new ContractsApiError("Unknown contract load failure", "network", {
    retryable: true,
  });
}

/**
 * Loads a contract by id with deterministic failure recovery.
 *
 * Invariants:
 *  - At most one in-flight request per id; stale responses are dropped.
 *  - A successful load clears any prior error and resets attempts.
 *  - A failure keeps the last known good contract in memory (no silent data loss).
  *  - Manual retry is a no-op while a request is in flight.
 *  - Unmount aborts the in-flight request and ignores its result.
 */
export function useContract(
  id: string | undefined | null,
  options: UseContractOptions = {},
): UseContractResult {
  const {
    retries,
    retryDelayMs,
    enabled = true,
    fetchImpl,
    sleep,
    correlationId,
    onError,
  } = options;

  const [state, setState] = useState<InternalState>(INITIAL_STATE);

  // Track the latest request token and active controller outside of React state
  // so that async callbacks can compare against the current value without stale closures.
  const requestIdRef = useRef(0);
  const controllerRef = useRef({
    current: null as AbortController | null,
  });
  const mountedRef = useRef(true);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const normalizedId = typeof id === "string" ? id.trim() : "";

  const load = useCallback(() => {
    if (!enabled) {
      return;
    }

    // Invalid id: fail fast without hitting the network.
    if (!normalizedId) {
      const error = new ContractsApiError(
        "Contract id is required",
        "http",
        { status: 400, retryable: false },
      );
      setState({
        status: "error",
        contract: null,
        error: error,
        attempts: 0,
        isRetrying: false,
        requestId: ++requestIdRef.current,
      });
      reportError(error, {
        operation: "useContract.load",
        correlationId,
        metadata: { reason: "invalid-id" },
      }, "warning");
      return;
    }

    // Abort any previous in-flight request before starting a new one.
    controllerRef.current?.abort();
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    controllerRef.current = controller;

    const requestId = ++requestIdRef.current;
    const isCurrent = () =>
      mountedRef.current && requestIdRef.current === requestId;

    setState((prev) => ({
      // Preserve the last known good contract so the UI can keep showing it
      // while a refresh is in flight or fails.
      contract: prev.contract,
      status: "loading",
      error: null,
      attempts: 0,
      isRetrying: false,
      requestId: requestId,
    }));

    void (buildLoader());

    async function buildLoader(): Promise<void> {
      try {
        const contract = await fetchContract(normalizedId, {
          signal: controller?.signal,
          retries,
          retryDelayMs,
          fetchImpl,
          sleep,
          correlationId,
        });

        if (!isCurrent()) return;

        setState((prev) => ({
          contract,
          status: "success",
          error: null,
          attempts: prev.attempts + 1,
          isRetrying: false,
          requestId,
        }));
      } catch (cause) {
        if (!isCurrent()) return;

        const error = toApiError(cause);

        // Aborted requests are expected during unmount or id switches and must
        // not be surfaced as a failure to the user.
        if (error.kind === "aborted") return;

        const nextStatus: ContractLoadStatus =
          error.kind === "not-found" ? "not-found" : "error";

        setState((prev) => ({
          // Keep the last known good contract on failure to avoid silent data
          // loss in the UI.
          contract: prev.contract,
          status: nextStatus,
          error,
          attempts: prev.attempts + 1,
          isRetrying: false,
          requestId,
        }));

        onErrorRef.current?.(error, state.attempts + 1);
      }
    }
  }, [
    enabled,
    normalizedId,
    retries,
    retryDelayMs,
    fetchImpl,
    sleep,
    correlationId,
  ]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  const retry = useCallback(() => {
    if (state.status !== "error" && state.status !== "not-found") return;
    if (state.isRetrying) return;
    setState((prev) => ({ ...prev, isRetrying: true }));
    load();
  }, [load, state.status, state.isRetrying]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return useMemo<UseContractResult>(
    () => ({
      status: state.status,
      contract: state.contract,
      error: state.error,
      isRetrying: state.isRetrying,
      attempts: state.attempts,
      retry,
      refresh,
    }),
    [state, retry, refresh],
  );
}
