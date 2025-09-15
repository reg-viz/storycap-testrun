import path from 'node:path';
import { $, glob, fs, argv, echo, within } from 'zx';

const pwd = process.cwd();

// Get target package from command line arguments
const targetPackage = argv._[0];

// Get all examples or filter by target package
let examples;
if (targetPackage) {
  const targetPath = `examples/${targetPackage}`;
  // Check if target directory exists
  try {
    await fs.access(targetPath);
    examples = [targetPath];
  } catch {
    throw new Error(
      `Package '${targetPackage}' not found in examples directory`,
    );
  }
} else {
  examples = await glob(['examples/*'], {
    onlyDirectories: true,
  });
}

if (examples.length === 0) {
  throw new Error('No examples found');
}

// Run E2E test for a single example using within() for cross-platform compatibility
async function runE2ETest(example) {
  const startTime = Date.now();
  const examplePath = path.join(pwd, example);

  try {
    echo`Starting e2e test for ${example}`;

    await within(async () => {
      $.cwd = examplePath;

      // Use Node.js standard fs.rm for cross-platform compatibility
      await fs.rm('node_modules', { recursive: true, force: true });

      // All commands run within the example directory
      await $`pnpm install --ignore-workspace`;

      // Skip Playwright install in CI environment to avoid apt-get lock conflicts
      if (!process.env.CI) {
        await $`pnpm exec playwright install --with-deps chromium`;
      } else {
        echo`Installing Playwright browser binary only in CI environment`;
        await $`pnpm exec playwright install chromium`;
      }

      await $`pnpm clean`;
      await $`pnpm test`;
    });

    // Check for generated screenshots in __screenshots__ directory (using absolute path)
    const images = await glob([`${examplePath}/__screenshots__/**/*.png`]);
    if (images.length === 0) {
      throw new Error(
        `Screenshot images does not exist in __screenshots__ directory!`,
      );
    }

    const duration = Date.now() - startTime;
    echo`✅ Completed e2e test for ${example} (found ${images.length} screenshot images) - ${duration}ms`;

    return {
      example,
      status: 'success',
      screenshotCount: images.length,
      duration,
      error: null,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    echo`❌ Failed e2e test for ${example} - ${duration}ms`;
    echo`Error: ${error.message}`;

    return {
      example,
      status: 'failed',
      screenshotCount: 0,
      duration,
      error: error.message,
    };
  }
}

// Run tests with limited concurrency using independent subprocesses
async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
}

const startTime = Date.now();
const maxConcurrency = 2;
echo`Running e2e tests for ${examples.length} examples in parallel (max ${maxConcurrency} concurrent) using independent subprocesses...\n`;

const results = await runWithConcurrencyLimit(
  examples.map((example) => () => runE2ETest(example)),
  maxConcurrency,
);

// Process and display results
const testResults = results.map((result) => result.value);
const totalDuration = Date.now() - startTime;
const successCount = testResults.filter((r) => r.status === 'success').length;
const failedCount = testResults.filter((r) => r.status === 'failed').length;

echo`\nTest Results Summary`;
echo`${'='.repeat(50)}`;
echo`Total Examples: ${examples.length}`;
echo`Total Duration: ${totalDuration}ms`;
echo`Success       : ${successCount}`;
echo`Failed        : ${failedCount}`;
echo``;

// Display detailed results
testResults.forEach((result) => {
  const statusIcon = result.status === 'success' ? '✅' : '❌';
  echo`${statusIcon} ${result.example}:`;
  echo`   Duration: ${result.duration}ms`;
  if (result.status === 'success') {
    echo`   Screenshots: ${result.screenshotCount}`;
  } else {
    echo`   Error: ${result.error}`;
  }
  echo``;
});

// Exit with error code if any test failed
if (failedCount > 0) {
  echo`${failedCount} test(s) failed!`;
  process.exit(1);
} else {
  echo`All tests passed!`;
}
