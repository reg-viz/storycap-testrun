import type { TestRunnerConfig } from '@storybook/test-runner';
import { screenshot } from '@storycap-testrun/node';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    await screenshot(page, context, {
      // ...
    });
  },
};

export default config;
