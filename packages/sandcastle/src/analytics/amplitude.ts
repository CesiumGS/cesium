import * as amplitude from "@amplitude/analytics-browser";

/**
 * Catalog of event names sent to Amplitude. Add new events here so every
 * tracking call shares a single, searchable list.
 */
export type AnalyticsEventName =
  | "Sandcastle Shared"
  | "Gallery Item Opened"
  | "Gallery Searched"
  | "Code Edited"
  | "New Sandcastle Created"
  | "Standalone Opened"
  | "Copilot Panel Opened"
  | "Copilot Panel Closed"
  | "Copilot Settings Opened"
  | "Copilot API Key Dialog Opened"
  | "Copilot API Key Saved"
  | "Copilot Message Sent"
  | "Copilot Code Applied";

let initialized = false;

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
