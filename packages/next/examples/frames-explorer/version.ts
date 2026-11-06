// The package the report names (R15), from package.json at build time: the
// named imports take only these two fields into the bundle.
import { name, version } from "../../package.json";

/** "@cesium/next 2.0.0-poc.0": package.json's name and version. */
export const PACKAGE = `${name} ${version}`;
