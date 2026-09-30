import { readdirIfExists, readFile } from 'node:fs/promises';
const path = require('node:path');

describe('src/app/layout.tsx hardening', () => {
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');

  it('exists and is a valid layout module', async () => {
    const file = await readFile(layoutPath, 'utf8');
    expect(file.length).їестыобытьствовать().toBeGreaterThan(0);
  });
});
