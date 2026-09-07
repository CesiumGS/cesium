# Sandcastle Analytics Events

Sandcastle uses [Amplitude](https://amplitude.com/) for usage analytics.
Analytics are active only when the `VITE_AMPLITUDE_API_KEY` environment
variable is set at build time; builds without a key send no data. The
official CesiumJS deployment provides its own key. Local builds may supply
a key through `.env.local` (see `.env.example`).

The events below are the complete set the application can send. Event names
are defined by the `AnalyticsEventName` type in `amplitude.ts` and are
case-sensitive. `tracking-plan.csv` contains the same definitions in
Amplitude's CSV import format; this document, the CSV, and the TypeScript
type describe one shared catalog.

## Global properties

Non-production builds (local development, CI/PR builds, staging) all report
to a shared QA Amplitude project, so an enrichment plugin in `amplitude.ts`
stamps every event, including the automatic session events, with build
metadata that tells those deployments apart. The tracking plan lists these
properties on every event; they are omitted from the per-event tables below.

| Property      | Type   | Required | Description                                                                                                                                  |
| ------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `environment` | string | yes      | Deployment that sent the event. Set at build time through `VITE_ANALYTICS_ENVIRONMENT` (for example `main`, `ci-branch`); `local` when unset |
| `commit_sha`  | string | no       | Git commit of the Sandcastle build; provided by CI builds through `GITHUB_SHA`                                                               |
| `branch_name` | string | no       | Git branch of the Sandcastle build; provided by CI builds through `GITHUB_HEAD_REF`/`GITHUB_REF_NAME`                                        |

The CesiumJS version is intentionally not duplicated here: it is already
sent with every event as Amplitude's built-in app version field
(`appVersion` in `amplitude.ts`), which can be filtered and grouped in
charts directly.

## Events

### Sandcastle Shared

Sent when the share popover is opened, which generates a share link for
the current code (`SharePopover.tsx`). Closing the popover does not send
the event.

| Property   | Type   | Required | Description                                                                                              |
| ---------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `share_id` | string | yes      | Stable hash of the shared code payload; matches the `share_id` on `Shared Sandcastle Opened`             |
| `demo_id`  | string | no       | Gallery demo the shared code started from (the `id` URL parameter); absent for blank or modified content |

`share_id` is derived from the code content, so the same code produces the
same id for the sharer and for everyone who opens the link. Because Amplitude
funnels are user-scoped and sharing is a cross-user loop, opens-per-share
should be analyzed as an event-level ratio keyed on `share_id`, not a funnel.

### Shared Sandcastle Opened

Sent when a share link is opened and its code loads into the editor
(`Gallery/loadFromUrl.ts`): the `#c=` hash format, the legacy `code` query
parameter, or a legacy gist link.

| Property   | Type                                | Required | Description                                                                 |
| ---------- | ----------------------------------- | -------- | --------------------------------------------------------------------------- |
| `share_id` | string                              | yes      | Stable id of the opened share: hash of the URL code payload, or the gist id |
| `source`   | enum: `hash`, `legacy_code`, `gist` | yes      | Kind of share link opened                                                   |

### Gallery Item Opened

Sent when a gallery demo is loaded into the editor, from browsing, search
results, or a direct URL (`Gallery/`, `loadFromUrl.ts`).

| Property  | Type                            | Required | Description                           |
| --------- | ------------------------------- | -------- | ------------------------------------- |
| `demo_id` | string                          | yes      | Gallery item id                       |
| `labels`  | string[]                        | no       | Labels/categories of the gallery item |
| `method`  | enum: `browse`, `search`, `url` | no       | How the item was opened               |

### Gallery Searched

Sent when typing in the gallery search box settles, after a 2 second
debounce rather than per keystroke (`Gallery/GalleryItemSearchInput.tsx`).
The search text itself is recorded.

| Property       | Type   | Required | Description                              |
| -------------- | ------ | -------- | ---------------------------------------- |
| `term`         | string | yes      | The settled search text                  |
| `result_count` | number | no       | Number of results displayed for the term |

### Filter Label Clicked

Sent when a gallery filter label is selected
(`Gallery/GalleryItemSearchFilter.tsx`). Deselecting a label does not send
the event.

| Property | Type   | Required | Description                    |
| -------- | ------ | -------- | ------------------------------ |
| `label`  | string | yes      | Filter label that was selected |

### Code Edited

Sent the first time code is manually edited after a sandcastle is loaded or
reset (`App.tsx` editor change handlers). Code applied by the copilot does
not send this event; a manual edit after a copilot apply does.

| Property  | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| `demo_id` | string | no       | Gallery demo loaded when the edit was made, if any |

### Sandcastle Run

Sent when sandcastle code is compiled and run in the viewer (`App.tsx`):
the Run button, a keyboard shortcut (F8, Ctrl+S, Alt+Enter), or an
automatic run after the copilot applies code. The initial run when a
sandcastle loads from the gallery or a URL is not sent, since those loads
already send their own events.

| Property  | Type                                  | Required | Description             |
| --------- | ------------------------------------- | -------- | ----------------------- |
| `trigger` | enum: `button`, `keyboard`, `copilot` | yes      | How the run was invoked |

### Runtime Error Occurred

Sent when the running sandcastle reports an error to the console, forwarded
from the viewer iframe over the bridge (`App.tsx`). Sent at most once per
run, so run error rates can be computed against `Sandcastle Run`. Only the
error's class name is recorded, never the message text, which could contain
tokens or code.

| Property     | Type    | Required | Description                                                                                       |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| `error_type` | string  | yes      | Error class name of the first error, e.g. `DeveloperError`; `unknown` when no class name is found |
| `edited`     | boolean | yes      | Whether the code had been manually edited when the error occurred                                 |
| `demo_id`    | string  | no       | Gallery demo that was running, if any                                                             |

### New Sandcastle Created

Sent when a new blank sandcastle is created from the application bar
(`App.tsx`). No properties.

### Standalone Opened

Sent when the standalone viewer is opened from the header (`App.tsx`).

| Property  | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `demo_id` | string | no       | Gallery demo loaded when standalone was opened, if any |

### Copilot Panel Opened

Sent when the copilot chat panel transitions from closed to open
(`App.tsx`).

| Property | Type                                 | Required | Description                      |
| -------- | ------------------------------------ | -------- | -------------------------------- |
| `source` | enum: `nav_button`, `console_action` | yes      | UI control that opened the panel |

### Copilot Panel Closed

Sent when the copilot chat panel transitions from open to closed, from the
nav bar toggle or the panel's close button (`App.tsx`).

| Property | Type                               | Required | Description                      |
| -------- | ---------------------------------- | -------- | -------------------------------- |
| `source` | enum: `nav_button`, `close_button` | yes      | UI control that closed the panel |

### Copilot Settings Opened

Sent when the copilot settings panel is opened from the chat panel header
(`copilot/settings/SettingsPanel.tsx`). No properties.

### Copilot API Key Dialog Opened

Sent when the API key configuration dialog opens, from any trigger
(`copilot/ApiKeyDialog.tsx`). No properties.

### Copilot API Key Saved

Sent when provider credentials pass validation and are saved
(`copilot/ApiKeyDialog.tsx`). Credential values are never recorded.

| Property   | Type                                  | Required | Description                        |
| ---------- | ------------------------------------- | -------- | ---------------------------------- |
| `provider` | enum: `anthropic`, `gemini`, `vertex` | yes      | Credential provider that was saved |

### Copilot API Key Validation Failed

Sent when a save attempt in the API key dialog fails validation
(`copilot/ApiKeyDialog.tsx`). Together with `Copilot API Key Dialog Opened`
and `Copilot API Key Saved` this measures setup drop-off. Entered values
are never recorded.

| Property   | Type                                                               | Required | Description                                |
| ---------- | ------------------------------------------------------------------ | -------- | ------------------------------------------ |
| `provider` | enum: `anthropic`, `gemini`, `vertex`                              | yes      | Credential provider that failed validation |
| `reason`   | enum: `empty`, `invalid_format`, `invalid_region`, `storage_error` | yes      | Coarse validation failure reason           |

### Copilot Message Sent

Sent when a chat message is submitted to the copilot
(`copilot/ChatPanel.tsx`). Retry messages generated by the copilot's
automatic error-fixing loop do not send this event.

| Property         | Type                                  | Required | Description                         |
| ---------------- | ------------------------------------- | -------- | ----------------------------------- |
| `model`          | string                                | yes      | Selected model id                   |
| `provider`       | enum: `anthropic`, `gemini`, `vertex` | no       | AI client route serving the model   |
| `message_length` | number                                | no       | Character count of the user message |

### Copilot Code Applied

Sent each time code produced by the copilot is applied to the editor
(`copilot/hooks/useToolChainExecution.ts`). A multi-step tool chain sends
this event once per applied edit. Because `Copilot Message Sent` excludes
automatic error-fix retries, funnels comparing sent to applied should
filter to `source` = `chat`.

| Property   | Type                                  | Required | Description                                                                     |
| ---------- | ------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `model`    | string                                | no       | Model id that produced the applied code                                         |
| `provider` | enum: `anthropic`, `gemini`, `vertex` | no       | AI client route that produced the applied code                                  |
| `source`   | enum: `chat`, `auto_fix`              | yes      | Whether the apply came from a user chat request or the automatic error-fix loop |

## Automatic events

Session autocapture is enabled in `amplitude.ts`. Amplitude generates the
built-in `[Amplitude] Start Session` and `[Amplitude] End Session` events
automatically; they are managed by Amplitude and are not part of
`tracking-plan.csv`.

## Adding a new event

This directory is the source of truth: change the code and tracking plan
here first, then push the definitions into Amplitude. Event names are
permanent once imported, so pick them carefully.

### In the codebase

1. Add the event name to the `AnalyticsEventName` type in `amplitude.ts`.
2. Call `trackEvent("<Event Name>", { ... })` where the interaction
   happens.
3. Add the event and its properties to `tracking-plan.csv`, copying the
   rows of an existing event as a template. Include the three
   [global properties](#global-properties) on the new event like every
   other event.
4. Document the event in this README with the same property table, in
   the same order as the CSV.

### In Amplitude (QA)

Import the updated `tracking-plan.csv` into the QA project. Always import
the full file rather than a fragment; Amplitude matches events by name, so
existing events are updated in place and new ones are added.

All non-production data (local development, CI/PR builds,
dev-sandcastle.cesium.com) lands in the QA project, so new events can be
verified there end to end before they reach production.

### Promoting to production (PRD)

The PRD project is never imported into directly. Definitions flow from QA
to PRD through Amplitude's branch workflow:

1. In the QA project, open "Events".
2. In the branch dropdown, click "Create New Branch" and name it with the
   `Month_Day_Year` convention (for example `Aug_28_2026`).
3. Still in the new branch, open "Activity" and click "Copy Branch",
   selecting the PRD project as the destination.
4. In the PRD project, open the copied branch and go to "Activity".
5. Manually inspect and review the changes.
6. Click "Approve", then click "Merge".
