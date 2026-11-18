/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import {logger} from './logger.js';

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err !== null && typeof err === 'object' && 'message' in err) {
    const message = err.message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return String(err);
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(getErrorMessage(err));
}

export function setupUnhandledRejectionHandler(onCrash: () => void): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger?.('Unhandled promise rejection:', promise, reason);
    console.error('Unhandled promise rejection:', reason);

    if (process.env['CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'] === 'true') {
      onCrash();
    }
  });
}
