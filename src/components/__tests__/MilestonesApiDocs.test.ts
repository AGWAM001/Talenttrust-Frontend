import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOC_PATH = path.resolve(REPO_ROOT, 'docs', 'components', 'MilestonesApi.md');
const USAGE_GUIDE_PATH = path.resolve(REPO_ROOT, 'docs', 'components', 'MilestonesUsageGuide.md');
const README_PATH = path.resolve(REPO_ROOT, 'docs', 'README.md');

const COMPONENTS = [
  'MilestonesList',
  'MilestoneRow',
  'MilestoneFilter',
  'MilestoneCreationForm',
] as const;

const SOURCE_PATHS: Record<(typeof COMPONENTS)[number], string> = {
  MilestonesList: 'src/components/MilestonesList.tsx',
  MilestoneRow: 'src/components/milestones/MilestoneRow.tsx',
  MilestoneFilter: 'src/components/milestones/MilestoneFilter.tsx',
  MilestoneCreationForm: 'src/components/milestones/MilestoneCreationForm.tsx',
};

describe('Milestones API reference docs', () => {
  const markdown = readFileSync(DOC_PATH, 'utf8');

  it('exists', () => {
    expect(existsSync(DOC_PATH)).toBe(true);
  });

  it('opens with the Milestones Component API Reference title', () => {
    expect(markdown.startsWith('# Milestones Component API Reference')).toBe(true);
  });

  it.each(COMPONENTS)('has a prop-table section for %s', (component) => {
    const section = new RegExp('#{2,3}[^\\n]*`' + component + '`[\\s\\S]{0,500}?\\|\\s*---');
    expect(markdown).toMatch(section);
  });

  it.each(COMPONENTS)('references the %s source path and that file exists', (component) => {
    const sourcePath = SOURCE_PATHS[component];
    expect(markdown).toContain(sourcePath);
    expect(existsSync(path.resolve(REPO_ROOT, sourcePath))).toBe(true);
  });

  it('includes a minimal usage example for the milestone components', () => {
    expect(markdown).toContain('<MilestonesList');
    expect(markdown).toContain('<MilestoneFilter');
    expect(markdown).toContain('<MilestoneCreationForm');
  });
});

describe('Milestones Usage Guide docs', () => {
  const markdown = readFileSync(USAGE_GUIDE_PATH, 'utf8');

  it('exists', () => {
    expect(existsSync(USAGE_GUIDE_PATH)).toBe(true);
  });

  it('opens with the Milestones Components Usage Guide title', () => {
    expect(markdown.startsWith('# Milestones Components — Usage Guide')).toBe(true);
  });

  it('includes overview and when-to-use sections', () => {
    expect(markdown).toContain('## Overview');
    expect(markdown).toContain('## When to use');
  });

  it('has import examples for all milestones components', () => {
    expect(markdown).toContain("import MilestonesList from '@/components/MilestonesList'");
    expect(markdown).toContain("import MilestoneRow from '@/components/milestones/MilestoneRow'");
    expect(markdown).toContain("MilestoneFilter");
    expect(markdown).toContain("MilestoneCreationForm");
    expect(markdown).toContain("MilestonesErrorBoundary");
    expect(markdown).toContain("MilestoneTimestamp");
    expect(markdown).toContain("MilestonesListSkeleton");
    expect(markdown).toContain("BulkActionToolbar");
  });

  it('has a complete example with MilestonesErrorBoundary wrapper', () => {
    expect(markdown).toContain('<MilestonesErrorBoundary>');
    expect(markdown).toContain('<MilestoneFilter');
    expect(markdown).toContain('<MilestonesList');
    expect(markdown).toContain('<MilestoneCreationForm');
  });

  it('documents props for MilestonesList and MilestoneRow', () => {
    expect(markdown).toContain('### `MilestonesList`');
    expect(markdown).toContain('### `MilestoneRow`');
  });

  it('includes accessibility considerations', () => {
    expect(markdown).toContain('## Accessibility considerations');
  });

  it('includes best practices', () => {
    expect(markdown).toContain('## Best practices');
  });

  it('includes common mistakes to avoid', () => {
    expect(markdown).toContain('## Common mistakes to avoid');
  });

  it('includes limitations and implementation details', () => {
    expect(markdown).toContain('## Limitations and implementation details');
  });

  it('includes troubleshooting section', () => {
    expect(markdown).toContain('## Troubleshooting');
  });

  it('references the correct source paths that exist', () => {
    Object.values(SOURCE_PATHS).forEach((sourcePath) => {
      expect(existsSync(path.resolve(REPO_ROOT, sourcePath))).toBe(true);
    });
  });
});

describe('docs index links to the Milestones API reference and Usage Guide', () => {
  const readme = readFileSync(README_PATH, 'utf8');

  it('lists docs/components/MilestonesApi.md', () => {
    expect(readme).toContain('./components/MilestonesApi.md');
  });

  it('lists docs/components/MilestonesUsageGuide.md', () => {
    expect(readme).toContain('./components/MilestonesUsageGuide.md');
  });
});
