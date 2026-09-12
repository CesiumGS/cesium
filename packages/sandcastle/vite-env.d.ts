// <reference types="vite/client" />

const __COMMIT_SHA__: string;
const __SHOW_COMMIT_SHA__: boolean;
const __BRANCH_NAME__: string;
const __CESIUM_VERSION__: string;
const __VITE_TYPE_IMPORT_PATHS__: Record<string, string> | undefined;
const __OUTER_ORIGIN__: string;
const __INNER_ORIGIN__: string;

interface ImportMetaEnv {
  /** Amplitude project API key; analytics are disabled when unset */
  readonly VITE_AMPLITUDE_API_KEY?: string;
  /**
   * Label for the deployment sending analytics, e.g. "main" or
   * "ci-branch"; events report "local" when unset
   */
  readonly VITE_ANALYTICS_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
