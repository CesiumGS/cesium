// CesiumJS 1.x modules imported as an untyped test oracle (see vite.config.ts).
declare module "cesium-oracle/*" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 1.x modules are untyped here
  const value: any;
  export default value;
}

declare module "cesium-engine-oracle/*" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x modules
  const value: any;
  export default value;
}
