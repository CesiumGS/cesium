// @ts-check

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import prettier from "prettier";

/** @typedef {"FixedFrameTransforms" | "CelestialFrameTransforms"} TransformsNamespace */

export const TRANSFORMS_NAMESPACES = /** @type {const} */ ([
  "FixedFrameTransforms",
  "CelestialFrameTransforms",
]);

/**
 * Shared helper for the Transforms migration scripts. Scans FixedFrameTransforms.js and
 * CelestialFrameTransforms.js directly (rather than a hardcoded list) so the mapping always
 * matches the real source, including members that aren't part of the public `Transforms` API.
 *
 * @param {string} coreDir Absolute path to packages/engine/Source/Core.
 * @returns {Promise<Map<string, TransformsNamespace>>} Map from member name (e.g. "eastNorthUpToFixedFrame") to the namespace that defines it.
 */
export async function buildTransformsMemberOwners(coreDir) {
  /** @type {Map<string, TransformsNamespace>} */
  const owners = new Map();

  for (const namespace of TRANSFORMS_NAMESPACES) {
    const source = await readFile(join(coreDir, `${namespace}.js`), "utf-8");
    const memberRegex = new RegExp(`^${namespace}\\.(\\w+)\\s*=`, "gm");
    let match;
    while ((match = memberRegex.exec(source)) !== null) {
      owners.set(match[1], namespace);
    }
  }

  return owners;
}

/**
 * Given a source file's text, finds every `Transforms.<member>` access and resolves it to the
 * namespace that owns it.
 *
 * @param {string} source
 * @param {Map<string, TransformsNamespace>} owners
 * @returns {{ neededNamespaces: TransformsNamespace[], unknownMembers: string[] }}
 */
export function findNeededNamespaces(source, owners) {
  const memberAccessRegex = /\bTransforms\.(\w+)/g;
  /** @type {Set<TransformsNamespace>} */
  const neededNamespaces = new Set();
  /** @type {Set<string>} */
  const unknownMembers = new Set();

  let match;
  while ((match = memberAccessRegex.exec(source)) !== null) {
    const owner = owners.get(match[1]);
    if (!owner) {
      unknownMembers.add(match[1]);
      continue;
    }
    neededNamespaces.add(owner);
  }

  return {
    neededNamespaces: TRANSFORMS_NAMESPACES.filter((namespace) =>
      neededNamespaces.has(namespace),
    ),
    unknownMembers: [...unknownMembers],
  };
}

/**
 * Replaces every `Transforms.<member>` access in the given source with `<Owner>.<member>`.
 *
 * @param {string} source
 * @param {Map<string, TransformsNamespace>} owners
 * @returns {string}
 */
export function replaceNamespacedAccess(source, owners) {
  return source.replace(/\bTransforms\.(\w+)/g, (fullMatch, member) => {
    const owner = owners.get(member);
    return owner ? `${owner}.${member}` : fullMatch;
  });
}

/**
 * Reformats source with prettier before writing - renaming `Transforms` to the
 * longer `FixedFrameTransforms`/`CelestialFrameTransforms` can push lines past
 * the configured print width, which would otherwise fail lint-staged/CI checks.
 *
 * @param {string} filePath Absolute path, used to resolve any applicable prettier config/overrides.
 * @param {string} source
 * @returns {Promise<string>}
 */
export async function formatWithPrettier(filePath, source) {
  const config = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(source, { ...config, filepath: filePath });
}
