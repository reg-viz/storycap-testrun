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
const runE2ETest = async (example) => {
  const startTime = Date.now();
  const examplePath = path.join(pwd, example);
  const exampleName = path.basename(examplePath);
  const isV9ReactVite = exampleName === 'v9-react-vite';

  try {
    echo`Starting e2e test for ${example}`;

    await within(async () => {
      $.cwd = examplePath;

      // Use Node.js standard fs.rm for cross-platform compatibility
      await fs.rm(path.join(examplePath, 'node_modules'), {
        recursive: true,
        force: true,
      });

      // All commands run within the example directory
      await $`pnpm install`;

      // Install Playwright browsers for each example
      // CI: install without system deps (already installed via ci.yaml)
      // Local: install with system deps
      if (process.env.CI) {
        await $`pnpm exec playwright install chromium`;
      } else {
        await $`pnpm exec playwright install --with-deps chromium`;
      }

      await $`pnpm clean`;
      await $`pnpm test`;
    });
    // If the target is v9-react-vite, skip screenshot directory validation
    if (isV9ReactVite) {
      const duration = Date.now() - startTime;
      echo`✅ Completed e2e test for ${example} (screenshot check skipped) - ${duration}ms`;
      return {
        example,
        status: 'success',
        screenshotCount: 0,
        screenshotCheckSkipped: true,
        duration,
        error: null,
      };
    }

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
      screenshotCheckSkipped: false,
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
      screenshotCheckSkipped: false,
      duration,
      error: error.message,
    };
  }
};

// Copy screenshots from examples to root __screenshots__ directory
const copyScreenshotsToRoot = async (successfulResults) => {
  const rootScreenshotsDir = path.join(pwd, '__screenshots__');

  // Create root __screenshots__ directory and clear existing content
  await fs.rm(rootScreenshotsDir, { recursive: true, force: true });
  await fs.mkdir(rootScreenshotsDir, { recursive: true });

  const copyTasks = successfulResults
    .filter(
      (result) =>
        result.status === 'success' &&
        !result.screenshotCheckSkipped &&
        result.screenshotCount > 0,
    )
    .map(async (result) => {
      const exampleName = path.basename(result.example);
      const sourceDir = path.join(pwd, result.example, '__screenshots__');
      const targetDir = path.join(rootScreenshotsDir, exampleName);

      try {
        // Check if source directory exists
        await fs.access(sourceDir);

        // Copy entire __screenshots__ directory content to target
        await fs.cp(sourceDir, targetDir, { recursive: true });

        echo`📸 Copied screenshots from ${result.example} to __screenshots__/${exampleName}`;
        return { example: exampleName, status: 'success' };
      } catch (error) {
        echo`⚠️  Failed to copy screenshots from ${result.example}: ${error.message}`;
        return { example: exampleName, status: 'failed', error: error.message };
      }
    });

  if (copyTasks.length === 0) {
    echo`📸 No screenshots to copy (all tests skipped screenshot validation or failed)`;
    return [];
  }

  echo`📸 Copying screenshots from ${copyTasks.length} successful examples to root __screenshots__ directory...`;
  const copyResults = await Promise.allSettled(copyTasks);

  const successfulCopies = copyResults.filter(
    (result) => result.value?.status === 'success',
  ).length;
  const failedCopies = copyResults.filter(
    (result) => result.value?.status === 'failed',
  ).length;

  if (failedCopies > 0) {
    echo`⚠️  Screenshot copy completed with ${failedCopies} failures`;
  } else {
    echo`✅ Successfully copied screenshots from ${successfulCopies} examples`;
  }

  return copyResults.map((result) => result.value);
};

// Run tests with limited concurrency using independent subprocesses
const runWithConcurrencyLimit = async (tasks, limit) => {
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

// Copy screenshots to root directory after all tests complete
echo`\nCopying screenshots to root directory...`;
await copyScreenshotsToRoot(testResults);

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
if (failedCount > 0) {
  echo`${failedCount} test(s) failed!`;
  process.exit(1);
} else {
  echo`All tests passed!`;
}
