export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type OmitKeyof<T, K extends keyof T> = Omit<T, K>;

export type RequiredDeep<T> = Simplify<
  Required<{
    [K in keyof T]: T[K] extends Required<T[K]> ? T[K] : RequiredDeep<T[K]>;
  }>
>;

export const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
