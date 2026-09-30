import { render, RenderOptions } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';

export { axe };

export async function assertNoA11yViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results.violations).toHaveLength(0);
}

export function renderWithA11y(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, options);
}

export async function testA11y(ui: React.ReactElement, options?: RenderOptions) {
  const view = renderWithA11y(ui, options);
  await assertNoA11yViolations(view.container);
  return view;
}
