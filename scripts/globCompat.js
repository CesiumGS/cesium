import { globSync } from "node:fs";
import path from "node:path";
// import { globby } from "globby";

/**
 * Wraps `node:fs` globSync() in a globby-compatible API.
 *
 * @param {string[]} patterns
 * @returns {Promise<string[]>}
 */
export async function globCompat(patterns) {
  // const prev = await globby(patterns);

  const cwd = process.cwd();
  const next = globSync(
    patterns.filter((p) => !p.startsWith("!")),
    {
      cwd,
      withFileTypes: true,
      exclude: (dirent) => {
        const filePath = path.join(dirent.parentPath, dirent.name);
        const filePathRelative = path.relative(cwd, filePath);

        let exclude = false;
        for (const pattern of patterns) {
          if (path.matchesGlob(filePathRelative, pattern.replace(/^\!/, ""))) {
            exclude = pattern.startsWith("!");
          }
        }

        return exclude;
      },
    },
  ).map((dirent) =>
    path.relative(cwd, path.join(dirent.parentPath, dirent.name)),
  );

  // prev.sort();
  // next.sort();
  // const diff = shallowDiffArray(prev, next);
  // if (diff) {
  //   console.error(`glob results do not match: `, patterns, prev, next, diff);
  //   throw new Error("glob results do not match");
  // }

  return next;
}

// /**
//  * @param {string[]} a
//  * @param {string[]} b
//  * @returns {{a: string[], b: string[]} | null}
//  */
// function shallowDiffArray(a, b) {
//   const setA = new Set(a);
//   const setB = new Set(b);

//   const result = {
//     a: a.filter((value) => !setB.has(value)),
//     b: b.filter((value) => !setA.has(value)),
//   };

//   if (result.a.length || result.b.length) {
//     return result;
//   }

//   return null;
// }
