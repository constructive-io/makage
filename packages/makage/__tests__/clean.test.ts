import fs from 'node:fs/promises';
import { runClean } from '../src/commands/clean';

jest.mock('node:fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('runClean', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.rm.mockResolvedValue(undefined);
  });

  it('should remove a single path', async () => {
    await runClean(['dist']);

    expect(mockedFs.rm).toHaveBeenCalledWith('dist', { recursive: true, force: true });
  });

  it('should remove multiple paths', async () => {
    await runClean(['dist', 'build', 'temp']);

    expect(mockedFs.rm).toHaveBeenCalledWith('dist', { recursive: true, force: true });
    expect(mockedFs.rm).toHaveBeenCalledWith('build', { recursive: true, force: true });
    expect(mockedFs.rm).toHaveBeenCalledWith('temp', { recursive: true, force: true });
  });

  it('should default to "dist" if no paths provided', async () => {
    await runClean([]);

    expect(mockedFs.rm).toHaveBeenCalledWith('dist', { recursive: true, force: true });
  });
});
