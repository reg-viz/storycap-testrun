/* eslint-disable @typescript-eslint/no-require-imports */
const { getJestConfig } = require('@storybook/test-runner');

// The default Jest configuration comes from @storybook/test-runner
const testRunnerConfig = getJestConfig();

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  ...testRunnerConfig,
  // Override rootDir to limit scanning to current directory only
  rootDir: process.cwd(),
  roots: [process.cwd()],
  watchman: false,
};
