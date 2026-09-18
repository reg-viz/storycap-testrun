import { getJestConfig } from '@storybook/test-runner';

// The default Jest configuration comes from @storybook/test-runner
const testRunnerConfig = getJestConfig();

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
export default {
  ...testRunnerConfig,
  // Override rootDir to limit scanning to current directory only
  rootDir: process.cwd(),
  roots: [process.cwd()],
  watchman: false,
};
