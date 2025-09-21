import type { OmitKeyof } from './utility';

/**
 * Configuration for masking elements during screenshot capture
 */
export type ScreenshotMaskConfig = {
  selector: string;
  color: string;
};

/**
 * Optional parameters for controlling screenshot behavior
 */
export type ScreenshotParameters = {
  skip?: boolean | null;
  delay?: number | null;
  mask?: string | Partial<ScreenshotMaskConfig> | null;
  remove?: string | null;
};

/**
 * Resolved parameters with defaults applied and mask configuration normalized
 */
export type ResolvedScreenshotParameters = OmitKeyof<
  Required<ScreenshotParameters>,
  'mask'
> & {
  mask: ScreenshotMaskConfig | null;
};

const defaultScreenshotMaskConfig = {
  selector: '',
  color: '#ff00ff',
} satisfies ScreenshotMaskConfig;

const defaultScreenshotParameters = {
  skip: false,
  delay: null,
  mask: null,
  remove: null,
} satisfies ScreenshotParameters;

/**
 * Resolves screenshot parameters by applying defaults and normalizing mask configuration
 * TODO: unit test
 */
export const resolveScreenshotParameters = (
  parameters: ScreenshotParameters = {},
): ResolvedScreenshotParameters => {
  return {
    ...defaultScreenshotParameters,
    ...parameters,
    mask:
      parameters.mask != null
        ? typeof parameters.mask === 'string'
          ? {
              ...defaultScreenshotMaskConfig,
              selector: parameters.mask,
            }
          : {
              ...defaultScreenshotMaskConfig,
              ...parameters.mask,
            }
        : null,
  };
};
