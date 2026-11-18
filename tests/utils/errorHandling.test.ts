/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import process from 'node:process';
import {afterEach, beforeEach, describe, it, mock} from 'node:test';

import {
  getErrorMessage,
  setupUnhandledRejectionHandler,
  toError,
} from '../../src/utils/errorHandling.js';

describe('getErrorMessage', () => {
  it('returns the message for Error instances', () => {
    assert.strictEqual(getErrorMessage(new Error('boom')), 'boom');
  });

  it('converts non-Error values to strings', () => {
    assert.strictEqual(getErrorMessage('string error'), 'string error');
  });
});

describe('toError and object messages', () => {
  it('preserves messages from thrown objects', () => {
    assert.strictEqual(
      getErrorMessage({message: 'Browser connection rejected'}),
      'Browser connection rejected',
    );
    const error = toError({message: 'Selector no longer exists'});
    assert.strictEqual(error.message, 'Selector no longer exists');
  });

  it('preserves existing Error objects and fallback conversion', () => {
    const error = new Error('already an error');
    assert.strictEqual(toError(error), error);
    assert.strictEqual(getErrorMessage(null), 'null');
    assert.strictEqual(getErrorMessage({message: 12}), '[object Object]');
  });
});

describe('setupUnhandledRejectionHandler', () => {
  let originalEnvValue: string | undefined;

  beforeEach(() => {
    originalEnvValue = process.env['CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'];
    delete process.env['CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'];
  });

  afterEach(() => {
    mock.restoreAll();
    if (originalEnvValue === undefined) {
      delete process.env['CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'];
    } else {
      process.env['CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'] = originalEnvValue;
    }
  });

  it('crashes and logs if CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT is true', () => {
    process.env['CHROME_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'] = 'true';
    const onCrash = mock.fn();
    const consoleError = mock.method(console, 'error', () => undefined);

    // Stub process.on to capture the handler
    const processOn = mock.method(process, 'on', () => process);

    setupUnhandledRejectionHandler(onCrash);

    assert.strictEqual(processOn.mock.calls.length, 1);
    assert.strictEqual(
      processOn.mock.calls[0].arguments[0],
      'unhandledRejection',
    );

    const handler = processOn.mock.calls[0].arguments[1] as (
      reason: unknown,
      promise: Promise<unknown>,
    ) => void;

    const reason = new Error('Test error');
    handler(reason, Promise.resolve());

    assert.strictEqual(consoleError.mock.calls.length, 1);
    assert.strictEqual(
      consoleError.mock.calls[0].arguments[0],
      'Unhandled promise rejection:',
    );
    assert.strictEqual(consoleError.mock.calls[0].arguments[1], reason);

    assert.strictEqual(onCrash.mock.calls.length, 1);
  });

  it('logs and swallows other errors', () => {
    const onCrash = mock.fn();
    const consoleError = mock.method(console, 'error', () => undefined);
    const processOn = mock.method(process, 'on', () => process);

    setupUnhandledRejectionHandler(onCrash);

    const handler = processOn.mock.calls[0].arguments[1] as (
      reason: unknown,
      promise: Promise<unknown>,
    ) => void;

    const reason = new TypeError('Test type error');
    handler(reason, Promise.resolve());

    assert.strictEqual(consoleError.mock.calls.length, 1);
    assert.strictEqual(
      consoleError.mock.calls[0].arguments[0],
      'Unhandled promise rejection:',
    );
    assert.strictEqual(consoleError.mock.calls[0].arguments[1], reason);

    assert.strictEqual(onCrash.mock.calls.length, 0);
  });
});
