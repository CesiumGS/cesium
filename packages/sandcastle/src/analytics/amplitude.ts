import * as amplitude from "@amplitude/analytics-browser";

/**
 * Catalog of event names sent to Amplitude. Add new events here so every
 * tracking call shares a single, searchable list.
 */
export type AnalyticsEventName =
  | "Sandcastle Shared"
  | "Shared Sandcastle Opened"
  | "Gallery Item Opened"
  | "Gallery Searched"
  | "Filter Label Clicked"
  | "Code Edited"
  | "Sandcastle Run"
  | "Runtime Error Occurred"
  | "New Sandcastle Created"
  | "Standalone Opened"
  | "Copilot Panel Opened"
  | "Copilot Panel Closed"
  | "Copilot Settings Opened"
  | "Copilot API Key Dialog Opened"
  | "Copilot API Key Saved"
  | "Copilot API Key Validation Failed"
  | "Copilot Message Sent"
  | "Copilot Code Applied";

let initialized = false;

/**
 * Build metadata attached to every event so builds reporting to a shared
 * Amplitude project (production, CI branches, local development) can be
 * told apart. All values are baked in at build time. The CesiumJS version
 * is not included here because it is already sent as the appVersion below.
 */
function analyticsBuildContext(): Record<string, string> {
  const context: Record<string, string> = {
    environment: import.meta.env.VITE_ANALYTICS_ENVIRONMENT || "local",
  };
  if (__COMMIT_SHA__) {
    // The sha may arrive pre-stringified with embedded quotes (see App.tsx)
    context.commit_sha = __COMMIT_SHA__.replaceAll(/['"]/g, "");
  }
  if (__BRANCH_NAME__) {
    context.branch_name = __BRANCH_NAME__;
  }
  return context;
}

/**
 * Initialize Amplitude for this session. Reads the API key from the
 * VITE_AMPLITUDE_API_KEY environment variable; when it is not set (the
 * default for local development) analytics stay disabled and every
 * tracking call is a no-op.
 */
export function initAnalytics() {
  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!apiKey || initialized) {
    return;
  }

  const buildContext = analyticsBuildContext();
  amplitude.add({
    name: "build-context",
    type: "enrichment",
    execute: async (event) => {
      // Applies to every tracked event, including the automatic session
      // events; event-specific properties win on a name collision
      event.event_properties = {
        ...buildContext,
        ...event.event_properties,
      };
      return event;
    },
  });

  amplitude.init(apiKey, {
    appVersion: __CESIUM_VERSION__ || undefined,
    // Only session tracking is automatic; everything else must be an
    // explicit trackEvent call so the data stays intentional
    autocapture: {
      sessions: true,
      attribution: false,
      pageViews: false,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
    },
  });
  initialized = true;
}

/**
 * Record a single analytics event. Safe to call unconditionally; does
 * nothing when analytics are disabled.
 */
export function trackEvent(
  name: AnalyticsEventName,
  properties?: Record<string, unknown>,
) {
  if (!initialized) {
    return;
  }
  amplitude.track(name, properties);
}

/**
 * Derive a stable share id from a share URL payload (the base64 string in
 * the #c= fragment or the legacy code query parameter). The same code
 * produces the same id on the sharing side and every opening side, which
 * lets opens be counted per share without recording any code. FNV-1a 64-bit.
 */
export function shareIdForPayload(payload: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < payload.length; i++) {
    hash ^= BigInt(payload.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
