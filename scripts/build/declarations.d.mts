import type ts from "typescript";

/** The folders under packages/ that hold a package. */
export function packageDirs(): string[];

/** The declaration program's options and files, over every package's sources. */
export function declarationConfig(dirs?: string[]): {
  options: ts.CompilerOptions;
  fileNames: string[];
};

/**
 * Emits every package's declarations, each to `write` with its package's
 * folder name and its path under that package's dist/types. Throws on a
 * type error.
 */
export function emitDeclarations(options: {
  write: (packageFolder: string, path: string, text: string) => void;
  dirs?: string[];
}): { files: number; kept: string[] };
