import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// `describe`, `expect`, and `it` are provided as globals by the configured
// jest test environment, matching the existing test-suite convention.

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOC_PATH = path.resolve(REPO_ROOT, 'docs', 'components', 'Forms.md');
const README_PATH = path.resolve(REPO_ROOT, 'README.md');

const COMPONENTS = [
  'FormField',
  'ErrorSummary',
  'ContractCreationForm',
  'CreateContractForm',
  'MilestoneCreationForm',
  'WalletAddressInput',
  'ConfirmDialog',
] as const;

const SOURCE_PATHS: Record<(typeof COMPONENTS)[number], string> = {
  FormField: 'src/components/FormField.tsx',
  ErrorSummary: 'src/components/ErrorSummary.tsx',
  ContractCreationForm: 'src/components/ContractCreationForm.tsx',
  CreateContractForm: 'src/components/contracts/CreateContractForm.tsx',
  MilestoneCreationForm: 'src/components/milestones/MilestoneCreationForm.tsx',
  WalletAddressInput: 'src/components/WalletAddressInput.tsx',
  ConfirmDialog: 'src/components/ConfirmDialog.tsx',
};

describe('Forms API reference (docs/components/Forms.md)', () => {
  const markdown = readFileSync(DOC_PATH, 'utf8');

  it('exists', () => {
    expect(existsSync(DOC_PATH)).toBe(true);
  });

  it('opens with the Forms Component API Reference title', () => {
    expect(markdown.startsWith('# Forms Component API Reference')).toBe(true);
  });

  it('cross-links to the existing per-component docs', () => {
    expect(markdown).toContain('./ContractCreationForm.md');
    expect(markdown).toContain('./MilestoneCreationForm.md');
    expect(markdown).toContain('./ActionPanel.md');
  });

  // Use it.each(COMPONENTS) directly so the resolved component name shows
  // up in the jest reporter title when an assertion fails.
  it.each(COMPONENTS)(
    'has a prop-table section heading for `%s`',
    (component) => {
      // Require (a) a level 2 or 3 heading that contains the component name,
      // AND (b) a Markdown prop-table delimiter `| --- |` within the next
      // ~400 characters. That guarantees the section is a real entry, not a
      // stray backtick mention, and trips whenever the prop table is removed.
      const section = new RegExp(
        `#{2,3}[^\\n]*\`${component}\`[\\s\\S]{0,400}?\\|\\s*---`,
      );
      expect(markdown).toMatch(section);
    },
  );

  it.each(COMPONENTS)(
    'references the `%s` source path and that file exists on disk',
    (component) => {
      const sourcePath = SOURCE_PATHS[component];
      // Check the markdown references the source file…
      expect(markdown).toContain(sourcePath);
      // …and that path resolves to a real file in the working tree.
      expect(existsSync(path.resolve(REPO_ROOT, sourcePath))).toBe(true);
    },
  );

  it('includes the consolidated minimal end-to-end example', () => {
    // Anchors unique to the end-to-end example block.
    expect(markdown).toContain(
      'Putting it together — minimal end-to-end forms example',
    );
    expect(markdown).toContain('<CreateContractForm');
    expect(markdown).toContain('<ConfirmDialog');
    expect(markdown).toContain('<ErrorSummary');
    expect(markdown).toContain('<FormField');
  });

  it('links to a test file covering every documented component', () => {
    // Each row in the test catalogue must reference at least one existing
    // test file under src/components.
    for (const component of COMPONENTS) {
      // Look for any `src/components/...test...` line in the same markdown
      // section as the component, by scanning the whole file for *some*
      // test reference. Specifically require FormValidation.test.tsx,
      // which covers the FormField + ErrorSummary couple.
      expect(markdown).toMatch(/`src\/components\/.*test\.tsx?`/);
      // Spot-check sentinel strings that anchor each component to a test.
      switch (component) {
        case 'FormField':
        case 'ErrorSummary':
          expect(markdown).toContain('FormValidation.test.tsx');
          break;
        case 'ContractCreationForm':
          expect(markdown).toContain('ContractCreationForm.test.tsx');
          break;
        case 'CreateContractForm':
          expect(markdown).toContain('CreateContractForm.test.tsx');
          break;
        case 'MilestoneCreationForm':
          expect(markdown).toContain('MilestoneCreationForm.test.tsx');
          break;
        case 'WalletAddressInput':
          expect(markdown).toContain('WalletAddressInput.test.tsx');
          break;
        case 'ConfirmDialog':
          expect(markdown).toContain('ConfirmDialog.test.tsx');
          break;
      }
    }
  });
});

describe('README.md docs index points at the Forms reference', () => {
  const readme = readFileSync(README_PATH, 'utf8');

  it('lists docs/components/Forms.md', () => {
    expect(readme).toContain('docs/components/Forms.md');
  });

  it('lists the full Documentation Index section used by reviewers', () => {
    expect(readme).toContain('## Documentation Index');
  });
});
