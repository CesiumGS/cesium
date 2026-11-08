import { C, DataTable, Flow, Page, Section, Written } from "../parts.tsx";

const ASSETS = [
  { use: "Default imagery", how: "BingImagery.fromIon(2) in the Viewer" },
  { use: "Terrain", how: "Cesium World Terrain, quantized-mesh" },
  {
    use: "Night imagery",
    how: "IonTmsImagery.fromIon(3812), NASA's Black Marble",
  },
  { use: "The Moon", how: "CESIUM_MOON_TERRAIN" },
  {
    use: "Photorealistic tiles",
    how: "An external 3DTILES asset, proxied by ion. The URL carries that service's key, and requests send no ion token",
  },
];

const ASKS = [
  {
    ask: "Add Timing-Allow-Origin to assets.ion.cesium.com",
    why: "Browsers hide per-request timing from clients without it, and protocol-aware request scheduling wants that timing. Google's tile host already sends it.",
    state: "To ask",
  },
  {
    ask: "The distribution of real users' bandwidth and latency",
    why: "To choose the default budgets for slow and fast links.",
    state: "To ask",
  },
];

export function Ion() {
  return (
    <Page
      title="Cesium ion"
      status="stub"
      lede={
        <>
          ion is the default source of terrain, imagery and tilesets, but it's
          optional: nothing in the engine needs it to draw. Unlike 1.x, no token
          is built in, so the application brings one.
        </>
      }
    >
      <Section title="How an asset resolves">
        <Flow
          label="ion asset resolution"
          steps={[
            {
              title: "Ask for the endpoint",
              body: (
                <>
                  <C>resolveIonAsset</C> requests <C>v1/assets/id/endpoint</C>{" "}
                  with the application's token.
                </>
              ),
            },
            {
              title: "Keep it for 45 minutes",
              body: "Asset tokens last about an hour and an endpoint costs a round trip of 300 ms or more, so resolved endpoints are reused. Failures aren't kept.",
            },
            {
              title: "Carry its headers",
              body: "Every request under the asset, through the shared request scheduler, sends the returned asset token. URLs keep ion's version parameter.",
            },
            {
              title: "Show attributions",
              body: "The asset's required credits come with the endpoint. Those not marked collapsible stay on screen.",
            },
          ]}
        />
        <p>
          <C>ionDefaults</C> holds the token and server, and a call's options
          override them. A self-hosted server is one setting away.
        </p>
      </Section>

      <Section title="What uses it">
        <DataTable
          label="ion assets in use"
          columns={[
            { head: "Use", cell: (r) => r.use },
            { head: "How", cell: (r) => r.how },
          ]}
          rows={ASSETS}
        />
      </Section>

      <Section title="Handling tokens">
        <p>
          A token goes to ion requests and nothing else. It is never written
          into code, logs, URLs, test output, screenshots or builds. Examples
          take theirs from Dyno's token setting, or from <C>.env.local</C> in
          development only, and production builds never contain it.
        </p>
      </Section>

      <Section title="What we'd ask of ion">
        <DataTable
          label="Asks of ion"
          columns={[
            { head: "Ask", cell: (r) => r.ask },
            { head: "Why", cell: (r) => r.why },
            { head: "State", cell: (r) => r.state },
          ]}
          rows={ASKS}
        />
        <Written
          from="src/io/ion.ts and the overall plan, section 14"
          on="2026-11-08"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>
            Fetch failures: today there's no timeout or retry, and a failed tile
            stays failed for the session. Planned: a timeout from observed
            latency, retries with backoff, and a token refresh on 401.
          </li>
          <li>
            How ion's archive and tiling pipelines fit with design content.
          </li>
          <li>Session semantics for Photorealistic 3D Tiles.</li>
        </ul>
      </Section>
    </Page>
  );
}
