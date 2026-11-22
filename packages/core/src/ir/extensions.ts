// The `cesium/` extension ops this build knows. The normative list is the
// registry file (`extensions.json`); this table gives each entry the type
// rule the checking reader re-derives from. An op's meaning never changes
// after release: a change is a new op under a new name.
//
// 0.1 has no extension ops. CS-56 adds the first ones (`cesium/search`,
// `cesium/tableGet`) here and in the registry file, in a later version.

import type { Type } from "./types.ts";

export interface ExtensionOp {
  /** The format version that introduced the op, as `<major>.<minor>`. */
  readonly since: string;
  /** The result type of the op on operand types, or an error naming what's wrong. */
  readonly typeOf: (args: readonly Type[], index?: number) => Type;
}

/** The extension ops by name, each starting `cesium/`. */
export type ExtensionTable = Readonly<Record<string, ExtensionOp>>;

/** What this build knows. Empty in 0.1. */
export const EXTENSIONS: ExtensionTable = {};
