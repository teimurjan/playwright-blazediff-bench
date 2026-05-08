'use strict';

const Module = require('module');
const path = require('node:path');

const PLAYWRIGHT_PIXELMATCH_SUFFIX = path.join(
  'playwright-core',
  'lib',
  'third_party',
  'pixelmatch.js',
);

const shimPath = path.resolve(__dirname, 'pixelmatch-shim.cjs');

let intercepted = false;
const origResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, ...rest) {
  if (request === 'pixelmatch') {
    if (!intercepted) {
      intercepted = true;
      console.log('[patch] pixelmatch -> @blazediff/core');
    }
    return shimPath;
  }
  const resolved = origResolve.call(this, request, parent, ...rest);
  if (typeof resolved === 'string' && resolved.endsWith(PLAYWRIGHT_PIXELMATCH_SUFFIX)) {
    if (!intercepted) {
      intercepted = true;
      console.log('[patch] Playwright bundled pixelmatch -> @blazediff/core');
    }
    return shimPath;
  }
  return resolved;
};
