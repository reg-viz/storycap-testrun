export type ScreenshotMaskConfig = {
  selector: string;
  color: string;
};

export type ScreenshotParameters = {
  skip?: boolean;
  delay?: number;
  mask?: string | Partial<ScreenshotMaskConfig>;
  remove?: string;
};

export const defaultScreenshotMaskConfig = {
  selector: '',
  color: '#ff00ff',
} satisfies ScreenshotMaskConfig;

export const defaultScreenshotParameters = {
  skip: false,
} satisfies ScreenshotParameters;
