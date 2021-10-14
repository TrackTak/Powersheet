export type NestedPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer R>
    ? Array<NestedPartial<R>>
    : T[K] extends unknown
    ? unknown
    : NestedPartial<T[K]>;
};
