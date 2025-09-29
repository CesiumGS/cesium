import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Compile a typescript project from it's config file using the tsc CLI
 *
 * @param {string} configPath Absolute path to the config file to build
 * @returns {number} exit code from the tsc command
 */
export default async function typescriptCompile(configPath) {
  const tsPath = import.meta.resolve("typescript");
  const binPath = fileURLToPath(join(tsPath, "../../bin/tsc"));
  console.log(tsPath);
  console.log(binPath);
  return new Promise((resolve, reject) => {
    const ls = spawn(binPath, ["-p", configPath]);

    ls.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    ls.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    ls.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(code);
      }
    });
  });
}
