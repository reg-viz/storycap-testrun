/* oxlint-disable no-unused-expressions */
import path from 'node:path';
import { $, glob, fs, argv, echo, within } from 'zx';

const pwd = process.cwd();
const maxConcurrency = 2;

// Get target package from command line arguments
const targetPackage = argv._[0];
const verbose = argv.verbose || false;

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
const run = async (example) => {
  const start = Date.now();
  const dir = path.join(pwd, example);

  try {
    echo`Starting e2e test for ${example}`;

    await within(async () => {
      $.cwd = dir;
      $.verbose = verbose;
      $.env = { ...process.env, CI: 'true' };

      // Install dependencies for this example workspace
      await $`pnpm install`;

      await $`pnpm clean`;
      await $`pnpm test`;
    });

    // Check for generated screenshots in __screenshots__ directory (using absolute path)
    const images = await glob([`${dir}/__screenshots__/**/*.png`]);
    if (images.length === 0) {
      throw new Error(
        `Screenshot images does not exist in __screenshots__ directory!`,
      );
    }

    const duration = Date.now() - start;
    echo`✅ Completed e2e test for ${example} (found ${images.length} screenshot images) - ${duration}ms`;

    return {
      example,
      status: 'success',
      screenshotCount: images.length,
      screenshotCheckSkipped: false,
      duration,
      error: null,
    };
  } catch (error) {
    const duration = Date.now() - start;
    echo`❌ Failed e2e test for ${example} - ${duration}ms`;
    echo`Error: ${error.message}`;

    if (verbose && error.stack) {
      echo`Stack trace: ${error.stack}`;
    }

    return {
      example,
      status: 'failed',
      screenshotCount: 0,
      screenshotCheckSkipped: false,
      duration,
      error: error.message,
    };
  }
};

// Copy screenshots from examples to root `__screenshots__` directory
const collect = async (successfulResults) => {
  const rootScreenshotsDir = path.join(pwd, '__screenshots__');

  // Create root __screenshots__ directory and clear existing content
  await fs.rm(rootScreenshotsDir, { recursive: true, force: true });
  await fs.mkdir(rootScreenshotsDir, { recursive: true });

  const tasks = successfulResults
    .filter(
      (result) =>
        result.status === 'success' &&
        !result.screenshotCheckSkipped &&
        result.screenshotCount > 0,
    )
    .map(async (result) => {
      const basename = path.basename(result.example);
      const source = path.join(pwd, result.example, '__screenshots__');
      const target = path.join(rootScreenshotsDir, basename);

      try {
        // Check if source directory exists
        await fs.access(source);

        // Copy entire __screenshots__ directory content to target
        fs.cp(source, target, { recursive: true });

        echo`📸 Copied screenshots from ${result.example} to __screenshots__/${basename}`;
        return { example: basename, status: 'success' };
      } catch (e) {
        echo`⚠️  Failed to copy screenshots from ${result.example}: ${e.message}`;
        return { example: basename, status: 'failed', error: e.message };
      }
    });

  if (tasks.length === 0) {
    echo`📸 No screenshots to copy (all tests skipped screenshot validation or failed)`;
    return [];
  }

  echo`📸 Copying screenshots from ${tasks.length} successful examples to root __screenshots__ directory...`;
  const results = await Promise.allSettled(tasks);

  const success = results.filter(
    (result) => result.value?.status === 'success',
  ).length;
  const failed = results.filter(
    (result) => result.value?.status === 'failed',
  ).length;

  if (failed > 0) {
    echo`⚠️  Screenshot copy completed with ${failed} failures`;
  } else {
    echo`✅ Successfully copied screenshots from ${success} examples`;
  }

  return results.map((result) => result.value);
};

// Run tests with limited concurrency using independent subprocesses
const concurrency = async (tasks, limit) => {
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
};

const startTime = Date.now();
echo`Running e2e tests for ${examples.length} examples in parallel (max ${maxConcurrency} concurrent) using independent subprocesses${verbose ? ' (verbose mode)' : ''}...\n`;

const results = await concurrency(
  examples.map((example) => () => run(example)),
  maxConcurrency,
);

// Process and display results
const values = results.map((result) => result.value);
const total = Date.now() - startTime;
const success = values.filter((r) => r.status === 'success').length;
const failed = values.filter((r) => r.status === 'failed').length;

// Copy screenshots to root directory after all tests complete
echo`\nCopying screenshots to root directory...`;
await collect(values);

echo`\nTest Results Summary`;
echo`${'='.repeat(50)}`;
echo`Total Examples: ${examples.length}`;
echo`Total Duration: ${total}ms`;
echo`Success       : ${success}`;
echo`Failed        : ${failed}`;
echo``;

// Display detailed results
values.forEach((result) => {
  const icon = result.status === 'success' ? '✅' : '❌';
  echo`${icon} ${result.example}:`;
  echo`   Duration: ${result.duration}ms`;
  if (result.status === 'success') {
    if (result.screenshotCheckSkipped) {
      echo`   Screenshot Check: skipped`;
    } else {
      echo`   Screenshots: ${result.screenshotCount}`;
    }
  } else {
    echo`   Error: ${result.error}`;
  }
  echo``;
});

// Exit with error code if any test failed
if (failed > 0) {
  echo`${failed} test(s) failed!`;
  process.exit(1);
} else {
  echo`All tests passed!`;
}
