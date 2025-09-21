# Migration Guide

## v1 to v2

### Overview

storycap-testrun v2 introduces significant improvements with a focus on simplicity, better maintenance, and clearer package structure. This version drops legacy features and reorganizes the package architecture to better serve the two primary Storybook testing workflows.

**Key improvements in v2:**

- Simplified package structure with clear separation for different testing environments
- Streamlined hook API for better developer experience
- Improved maintainability by removing complex, rarely-used features
- Better alignment with modern Storybook testing practices

### Breaking Changes Summary

1. **Package restructuring**: The legacy `storycap-testrun` package is deprecated in favor of framework-specific packages
2. **Storybook v7 support dropped**: Only Storybook v8+ is supported
3. **Hook API changes**: `postCapture` signature simplified from `ScreenshotImage` to `filepath`
4. **Feature removal**: `output.dry` option removed due to limited usage and implementation complexity

### Migration Steps

#### 1. Package Migration

The monolithic `storycap-testrun` package has been split into two focused packages. Choose the appropriate package based on your testing setup:

##### For @storybook/test-runner Users

**Before (v1):**

```bash
npm install --save-dev storycap-testrun
```

**After (v2):**

```bash
npm uninstall storycap-testrun
npm install --save-dev @storycap-testrun/node
```

**Update your test-runner setup:**

```javascript
// Before (v1)
import { screenshot } from 'storycap-testrun';

// After (v2)
import { screenshot } from '@storycap-testrun/node';
```

#### 2. Storybook Version Requirement

##### Upgrading from Storybook v7

Storybook v7 support has been dropped. Ensure you're using Storybook v8 or later.

#### 3. Hook API Changes

##### postCapture Signature Change

The `postCapture` hook no longer receives the `ScreenshotImage` object as the third argument. Instead, it receives the `filepath` string.

###### Before (v1)

```javascript
const myHook = {
  postCapture: async (page, context, image) => {
    // Access image data
    const buffer = image.buffer;
    const filepath = image.path;

    // Custom processing...
  },
};
```

###### After (v2)

```javascript
const myHook = {
  postCapture: async (page, context, filepath) => {
    // Only filepath is provided
    // Access image data by reading the file if needed
    const fs = require('fs');
    const buffer = fs.readFileSync(filepath);

    // Custom processing...
  },
};
```

#### 4. Removed Features

##### output.dry Option Removal

The `output.dry` option has been removed. If you were using this feature, you'll need to implement similar functionality manually:

**Before (v1):**

```javascript
const config = {
  output: {
    dry: true, // This option is no longer available
  },
};
```
