import { loadEnv, type Plugin } from "vite";

/**
 * Builds: keeps .env.local secrets out of what a build writes. Vite loads
 * .env.local for `vite build` too and inlines every `import.meta.env.VITE_*`
 * it reads, so a deployed gallery would ship the token. Here the names read
 * as `undefined` in builds (Dyno's code reads them only under
 * `import.meta.env.DEV` anyway, bench/suite/ionToken.ts), and a build whose
 * output still holds a value fails, naming the file but never the value.
 */
export function keepEnvSecretsOut(
  names: readonly string[] = ["VITE_ION_TOKEN"],
): Plugin {
  let secrets: Array<[name: string, value: string]> = [];
  return {
    name: "keep-env-secrets-out",
    apply: "build",
    config: () => ({
      define: Object.fromEntries(
        names.map((name) => [`import.meta.env.${name}`, "undefined"]),
      ),
    }),
    configResolved(config) {
      const env =
        config.envDir === false
          ? {}
          : loadEnv(config.mode, config.envDir ?? config.root, [...names]);
      // Short values (a placeholder, "x") would match by chance.
      secrets = names
        .map((name) => [name, env[name]?.trim() ?? ""] as [string, string])
        .filter(([, value]) => value.length >= 16);
    },
    generateBundle(_options, bundle) {
      const found = findSecrets(
        Object.values(bundle).map((file) => ({
          name: file.fileName,
          text:
            file.type === "chunk"
              ? file.code
              : typeof file.source === "string"
                ? file.source
                : Buffer.from(file.source).toString("latin1"),
        })),
        secrets,
      );
      if (found.length > 0) {
        this.error(
          `.env.local secrets in the build: ${found
            .map(({ name, file }) => `${name} in ${file}`)
            .join(", ")}. Read them only under import.meta.env.DEV.`,
        );
      }
    },
  };
}

/** Which secrets appear in which files (names only, never values). */
export function findSecrets(
  files: ReadonlyArray<{ name: string; text: string }>,
  secrets: ReadonlyArray<readonly [name: string, value: string]>,
): Array<{ name: string; file: string }> {
  const found: Array<{ name: string; file: string }> = [];
  for (const file of files) {
    for (const [name, value] of secrets) {
      if (value && file.text.includes(value)) {
        found.push({ name, file: file.name });
      }
    }
  }
  return found;
}
