import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { GROUPS_DIR } from './config.js';
import { cleanupOldAttachments } from './attachment-cleanup.js';

vi.mock('./logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from './logger.js';

describe('cleanupOldAttachments', () => {
  const testDir = path.join(GROUPS_DIR, 'test-cleanup');
  const attachDir = path.join(testDir, 'attachments');

  beforeEach(() => {
    fs.mkdirSync(attachDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('removes files older than 7 days', () => {
    const oldFile = path.join(attachDir, 'old.jpg');
    fs.writeFileSync(oldFile, 'old');
    // Set mtime to 8 days ago
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, eightDaysAgo / 1000, eightDaysAgo / 1000);

    cleanupOldAttachments();

    expect(fs.existsSync(oldFile)).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      { count: 1 },
      'Cleaned up old attachments',
    );
  });

  it('keeps files newer than 7 days', () => {
    const newFile = path.join(attachDir, 'new.jpg');
    fs.writeFileSync(newFile, 'new');

    cleanupOldAttachments();

    expect(fs.existsSync(newFile)).toBe(true);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('handles groups without attachments directory', () => {
    fs.rmSync(attachDir, { recursive: true, force: true });

    // Should not throw
    cleanupOldAttachments();

    expect(logger.info).not.toHaveBeenCalled();
  });
});
