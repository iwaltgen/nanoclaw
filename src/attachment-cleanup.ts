import fs from 'fs';
import path from 'path';

import { GROUPS_DIR } from './config.js';
import { logger } from './logger.js';

const ATTACHMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Remove attachment files older than ATTACHMENT_TTL_MS from all group folders.
 */
export function cleanupOldAttachments(): void {
  const cutoff = Date.now() - ATTACHMENT_TTL_MS;

  let groupDirs: string[];
  try {
    groupDirs = fs.readdirSync(GROUPS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return;
  }

  let totalRemoved = 0;

  for (const groupName of groupDirs) {
    const attachDir = path.join(GROUPS_DIR, groupName, 'attachments');
    let files: string[];
    try {
      files = fs.readdirSync(attachDir);
    } catch {
      continue; // no attachments dir for this group
    }

    for (const file of files) {
      const filePath = path.join(attachDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile() && stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          totalRemoved++;
        }
      } catch {
        // file already deleted or inaccessible
      }
    }
  }

  if (totalRemoved > 0) {
    logger.info({ count: totalRemoved }, 'Cleaned up old attachments');
  }
}

/**
 * Start a periodic cleanup loop for attachments.
 */
export function startAttachmentCleanup(): void {
  // Run once at startup
  cleanupOldAttachments();
  // Then every hour
  setInterval(cleanupOldAttachments, CLEANUP_INTERVAL_MS);
}
