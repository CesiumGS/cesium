import { globSync } from "node:fs";
import path from "node:path";

/**
 * Wraps `node:fs` globSync() in a globby-compatible API.
 *
 * @param {string[]} patterns
 * @returns {Promise<string[]>}
 */
export async function globCompat(patterns) {
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

  return next;
}
