import fs from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_MARKERS = ['pnpm-workspace.yaml', 'lerna.json'];

export async function findWorkspaceRoot(from: string): Promise<string | null> {
  let dir = path.resolve(from);

  while (true) {
    for (const marker of WORKSPACE_MARKERS) {
      try {
        await fs.access(path.join(dir, marker));
        return dir;
      } catch {}
    }

    try {
      const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf8');
      const pkg = JSON.parse(raw);
      if (pkg.workspaces) return dir;
    } catch {}

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function findRootFile(
  filename: string,
  from: string
): Promise<string | null> {
  const root = await findWorkspaceRoot(from);
  if (!root) return null;

  const filePath = path.join(root, filename);
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}
