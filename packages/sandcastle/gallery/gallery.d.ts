// Ambient module declarations for gallery examples. These declarations are
// referenced by `packages/sandcastle/gallery/tsconfig.json`, and can (a)
// extend existing modules with missing types, and (b) define types for
// modules that aren't otherwise accessible.
//
// See: https://www.typescriptlang.org/docs/handbook/modules/reference.html#ambient-modules

declare module "cesium" {
  // Cesium.knockout has no types, but is used extensively in the gallery.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const knockout: any;
}

declare module "Sandcastle" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _: any;
  export default _;
}
