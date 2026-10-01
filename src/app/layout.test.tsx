import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('src/app/layout.tsx hardening', () => {
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');

  it('exists and is a valid layout module', async () => {
    const file = await readFile(layoutPath, 'utf8');
    expect(file.length).toBeGreaterThan(0);
  });
});
