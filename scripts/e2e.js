import path from 'node:path';
import { $, glob, cd, fs, argv } from 'zx';

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

for (const example of examples) {
  console.log(`Starting e2e test for ${example}`);
  cd(path.join(pwd, example));

  // Remove node_modules to ensure clean install (especially for local runs)
  await fs.rm('node_modules', { recursive: true, force: true });

  // Install dependencies first since examples are now independent
  await $`pnpm install --ignore-workspace`;

  await $`pnpm clean`;

  await $`pnpm test`;

  // Check for generated screenshots in __screenshots__ directory
  const images = await glob(['__screenshots__/**/*.png']);
  if (images.length === 0) {
    throw new Error(
      `[${example}] Screenshot images does not exist in __screenshots__ directory!`,
    );
  }

  console.log(
    `Completed e2e test for ${example} (found ${images.length} screenshot images)`,
  );
}
