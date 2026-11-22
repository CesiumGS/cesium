/** The packages ordered so each follows the siblings it depends on. */
export function publishOrder<
  T extends {
    manifest: {
      name: string;
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
  },
>(packages: readonly T[]): T[];
