import { readdir } from "node:fs/promises";
import { basename, dirname, join, extname } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Convert a single .slang file to .wgsl using slangc
 * @param {string} slangFilePath - Full path to the .slang file
 * @returns {Promise<string>} Path to the generated .wgsl file
 */
export async function convertSlangToWgsl(slangFilePath) {
  const dir = dirname(slangFilePath);
  const baseName = basename(slangFilePath, ".slang");
  const wgslFilePath = join(dir, `${baseName}.wgsl`);

  try {
    // Run slangc to convert slang to WGSL
    // Using -target wgsl to output WebGPU shading language directly
    const command = `slangc "${slangFilePath}" -target wgsl -o "${wgslFilePath}"`;

    const { stderr } = await execAsync(command);

    if (stderr) {
      console.warn(`slangc warning for ${slangFilePath}: ${stderr}`);
    }

    console.log(
      `✓ Converted ${basename(slangFilePath)} to ${basename(wgslFilePath)}`,
    );
    return wgslFilePath;
  } catch (error) {
    console.error(`Failed to convert ${slangFilePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Find all .slang files in a directory and convert them to .wgsl
 * @param {string} directory - Directory to search for .slang files
 * @returns {Promise<string[]>} Array of generated .wgsl file paths
 */
export async function convertAllSlangFilesInDirectory(directory) {
  try {
    const files = await readdir(directory);
    const slangFiles = files.filter((file) => extname(file) === ".slang");

    if (slangFiles.length === 0) {
      return [];
    }

    console.log(`Found ${slangFiles.length} .slang file(s) in ${directory}`);

    const wgslPaths = [];
    for (const slangFile of slangFiles) {
      const slangPath = join(directory, slangFile);
      const wgslPath = await convertSlangToWgsl(slangPath);
      wgslPaths.push(wgslPath);
    }

    return wgslPaths;
  } catch (error) {
    // If directory doesn't exist or can't be read, just return empty array
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Check if slangc is available on the system
 * @returns {Promise<boolean>}
 */
export async function isSlangcAvailable() {
  try {
    // Try to run slangc --version to check if it's available
    const { stdout } = await execAsync("which slangc || where slangc", {
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash",
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
