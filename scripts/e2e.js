import path from 'node:path';
import { $, glob, cd } from 'zx';

const pwd = process.cwd();

const examples = await glob(['examples/*'], {
  onlyDirectories: true,
});

for (const example of examples) {
  cd(path.join(pwd, example));

  await $`pnpm clean`;
  await $`pnpm test`;

  const images = await glob(['**/*.png']);
  if (images.length === 0) {
    throw new Error(`[${example}] Screenshot images does not exist!`);
  }
}
