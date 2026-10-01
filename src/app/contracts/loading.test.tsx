import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContractsLoading, {
  DEFAULT_SKELETON_ROWS,
  MAX_SKELETON_ROWS,
  resolveSkeletonCount,
} from "./loading";

describe("resolveSkeletonCount", () => {
  it("returns the default when no candidate is provided", () => {
    expect(resolveSkeletonCount()).toBe(DEFAULT_SKELETON_ROWS);
    expect(resolveSkeletonCount(undefined)).toBe(DEFAULT_SKELETON_ROWS);
  });

  it("accepts valid integer values within range", () => {
    expect(resolveSkeletonCount(0)).toBe(0);
    expect(resolveSkeletonCount(1)).toBe(1);
    expect(resolveSkeletonCount(3)).toBe(3);
    expect(resolveSkeletonCount(MAX_SKELETON_ROWS)).toBe(MAX_SKELETON_ROWS);
  });

  it("truncates fractional values towards zero", () => {
    expect(resolveSkeletonCount(0.9)).toBe(0);
    expect(resolveSkeletonCount(1.99)).toBe(1);
    expect(resolveSkeletonCount(3.5)).toBe(3);
  });

  it("clamps negative values to zero", () => {
    expect(resolveSkeletonCount(-1)).toBe(0);
    expect(resolveSkeletonCount(-100)).toBe(0);
  });

  it("clamps out-of-range high values to the maximum", () => {
    expect(resolveSkeletonCount(MAX_SKELETON_ROWS + 1)).toBe(
      MAX_SKELETON_ROWS,
    );
    expect(resolveSkeletonCount(10_000)).toBe(MAX_SKELETON_ROWS);
  });

  it("rejects non-finite numeric values", () => {
    expect(resolveSkeletonCount(Number.NaN)).toBe(DEFAULT_SKELETON_ROWS);
    expect(resolveSkeletonCount(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_SKELETON_ROWS,
    );
    expect(resolveSkeletonCount(Number.NEGATIVE_INFINITY)).toBe(
      DEFAULT_SKELETON_ROWS,
    );
  });

  it("rejects non-numeric inputs via the type boundary", () => {
    expect(resolveSkeletonCount("abc" as unknown as number)).toBe(
      DEFAULT_SKELETON_ROWS,
    );
    expect(resolveSkeletonCount(null as unknown as number)).toBe(
      DEFAULT_SKELETON_ROWS,
    );
  });

  it("is idempotent for duplicate invocations", () => {
    const inputs = [1, 2, 3, 5, 10];
    for (const value of inputs) {
      expect(resolveSkeletonCount(value)).toBe(value);
      expect(resolveSkeletonCount(value)).toBe(value);
    }
  });
});

describe("ContractsLoading", () => {
  it("renders the default number of skeleton rows", () => {
    render(<ContractsLoading />);
    expect(screen).getAllByTestId("contract-skeleton-row")).toHaveLength(
      DEFAULT_SKELETON_ROWS,
    );
  });

  it("announces loading state to assistive technology", () => {
    render(<ContractsLoading />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading contracts…");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("marks the region as busy", () => {
    render(<ContractsLoading />);
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });

  it("respects a valid custom row count", () => {
    render(<ContractsLoading rows={3} />);
    expect(screen.getAllByTestId("contract-skeleton-row")).toHaveLength(3);
  });

  it("clamps an out-of-range row count to the maximum", () => {
    render(<ContractsLoading rows={10_000} />);
    expect(screen.getAllByTestId("contract-skeleton-row")).toHaveLength(
      MAX_SKELETON_ROWS,
    );
  });

  it("renders zero rows for a negative row count without crashing", () => {
    render(<ContractsLoading rows={-1} />);
    expect(screen.queryAllByTestId("contract-skeleton-row")).toHaveLength(0);
  });

  it("falls back to the default for a non-finite row count", () => {
    render(<ContractsLoading rows={Number.NaN} />);
    expect(screen.getAllByTestId("contract-skeleton-row")).toHaveLength(
      DEFAULT_SKELETON_ROWS,
    );
  });

  it("is idempotent across repeated renders with the same input", () => {
    const { unmount } = render(<ContractsLoading rows={4} />);
    expect(screen.getAllByTestId("contract-skeleton-row")).toHaveLength(4);
    unmount();

    render(<ContractsLoading rows={4} />);
    expect(screen.getAllByTestId("contract-skeleton-row")).toHaveLength(4);
  });
});
