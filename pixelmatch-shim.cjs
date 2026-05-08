'use strict';

const core = require('@blazediff/core');
const fn = core.default || core.diff || core;

module.exports = fn;
