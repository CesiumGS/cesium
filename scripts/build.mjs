// `npm run build` (CS-612): every package under packages/ built for
// publishing, then checked as it packs.
//
//   node scripts/build.mjs [--no-checks] [--keep-packed]
//
// 1. Declarations: one TypeScript program over every package's sources,
//    each file's `.d.ts` into its package's dist/types/, `@internal`
//    members stripped (scripts/build/declarations.mjs).
// 2. JavaScript: one Vite library build per package, from one shared
//    function (scripts/build/library.mjs): ES modules, one file per module,
//    dependencies external, into dist/.
// 3. The umbrella's browser build: every package bundled, into
//    packages/cesium/dist/browser/ (scripts/build/browser.mjs).
// 4. The packed result: `npm pack` per package, then
//    scripts/checkDeclarations.mjs over every package, and publint and attw
//    on each tarball (scripts/build/pack.mjs). `--no-checks` skips them;
//    `--keep-packed` leaves the scratch folder and prints where.
//
// Development, the tests and Dyno don't need it: they run from source
// through the `@cesium/source` export condition. The bundle check
// (`npm run check:bundle`) builds its pages against this output.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { buildBrowser } from "./build/browser.mjs";
import { emitDeclarations, packageDirs } from "./build/declarations.mjs";
import { buildLibrary, readManifest } from "./build/library.mjs";
import { checkPacked } from "./build/pack.mjs";

const args = process.argv.slice(2);
const checks = !args.includes("--no-checks");
const keep = args.includes("--keep-packed");

const started = performance.now();
const step = (what) => {
  const t = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`build: ${what} (${t} s)`);
};

try {
  const dirs = packageDirs();
  for (const dir of dirs) {
    rmSync(join(dir, "dist"), { recursive: true, force: true });
  }
  step(`${dirs.length} packages: ${dirs.map((d) => readManifest(d).name).join(", ")}`);

  const byFolder = new Map(dirs.map((dir) => [basename(dir), dir]));
  const { files, kept } = emitDeclarations({
    dirs,
    write(folder, path, text) {
      const dir = byFolder.get(folder);
      if (!dir) {
        throw new Error(`build: declarations for an unknown package ${folder}`);
      }
      const file = join(dir, "dist", "types", path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    },
  });
  step(
    `declarations: ${files} files${kept.length > 0 ? `; @internal names kept for ./internal entries in ${kept.join(", ")}` : ""}`,
  );

  for (const dir of dirs) {
    const { modules, assets } = await buildLibrary(dir);
    step(
      `${readManifest(dir).name}: ${modules.length} modules, ${assets.length} assets`,
    );
  }

  await buildBrowser();
  step("browser build: packages/cesium/dist/browser");

  if (checks) {
    await checkPacked(dirs, { keep });
    step("packed checks: checkDeclarations, publint and attw pass");
  }
} catch (error) {
  console.error(`build: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
