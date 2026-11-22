// "Try your own" (R18), in the Bound CRSs card: paste a WKT2, the path that
// always works, and show an ion asset on the globe for context (ruling F33).
// ion exposes no CRS for an asset (DESIGN.md, "Cesium ion and an iModel's
// CRS"), so the area says so plainly: the checks run on the pasted WKT2. The
// token is never shown, stored or put in a URL.
import {
  Alert,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { svgCloudDownload } from "@stratakit/icons/cloud-download";
import { svgPlay } from "@stratakit/icons/play";
import { Icon } from "@stratakit/mui";
import { useId, useState } from "react";
import type { TokenSource, UserCrsView } from "./model.ts";
import { Term } from "./parts.tsx";

/** F28: where the token came from isn't known to the example, so the text is generic. */
const TOKEN_TEXT =
  "Uses the gallery's ion token. To read your own assets, set your token in Dyno's settings or .env.local.";

/** An iModel id is a GUID; an ion asset id is a number. */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TryYourOwn({
  token,
  state,
  exampleWkt2,
  onFetch,
  onRun,
}: {
  token: TokenSource;
  state: UserCrsView;
  exampleWkt2: string;
  onFetch: (id: string) => void;
  onRun: (wkt2: string) => void;
}) {
  const id = useId();
  const [wkt, setWkt] = useState("");
  const [asset, setAsset] = useState(state.id ?? "");
  const trimmed = asset.trim();
  const isGuid = GUID.test(trimmed);
  const busy = state.state === "fetching" || state.state === "running";
  return (
    <section className="fx-try" aria-labelledby={id} id="fx-try-your-own">
      <Typography
        variant="body-md"
        render={<h4 id={id} />}
        className="fx-strong"
      >
        Try your own CRS
      </Typography>
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        Paste a <Term k="boundCrs">bound CRS</Term> as WKT2, as an iModel or CAD
        export gives it. Its checks run here, marked &ldquo;Your input&rdquo;,
        and stay out of the pass counts.
      </Typography>
      <TextField
        multiline
        minRows={3}
        maxRows={10}
        size="small"
        label="WKT2 of the CRS"
        helperText={
          wkt.trim() === "" ? "Paste a WKT2 to run its checks." : undefined
        }
        value={wkt}
        onChange={(e) => setWkt(e.target.value)}
        slotProps={{ htmlInput: { spellCheck: false, className: "fx-wkt" } }}
        fullWidth
      />
      <div className="fx-try-buttons">
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Icon href={svgPlay} />}
          disabled={wkt.trim() === "" || busy}
          onClick={() => onRun(wkt)}
        >
          Run the checks
        </Button>
        <Button variant="text" size="small" onClick={() => setWkt(exampleWkt2)}>
          Use an example (Tokyo, JPRCS IX)
        </Button>
      </div>

      <div className="fx-try-ion">
        <Typography variant="body-sm" render={<p />} className="fx-strong">
          Show its ion asset on the globe
        </Typography>
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          Cesium ion doesn&rsquo;t carry an asset&rsquo;s CRS: its tiler uses
          the CRS and keeps none. The asset loads here for context; the checks
          run on the WKT2 you paste above.
        </Typography>
        {token === undefined ? (
          <Alert severity="info">
            No ion token. Set one in Dyno&rsquo;s settings, or add{" "}
            <code className="fx-code">VITE_ION_TOKEN</code> to
            packages/next/.env.local, then reload. Pasting WKT2 works without
            one.
          </Alert>
        ) : (
          <>
            <div className="fx-try-row">
              <TextField
                size="small"
                label="ion asset ID"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                slotProps={{
                  htmlInput: { inputMode: "numeric", spellCheck: false },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  state.state === "fetching" ? (
                    <CircularProgress size={12} aria-hidden />
                  ) : (
                    <Icon href={svgCloudDownload} />
                  )
                }
                disabled={trimmed === "" || isGuid || busy}
                onClick={() => onFetch(trimmed)}
              >
                {state.state === "fetching" ? "Loading…" : "Show on globe"}
              </Button>
            </div>
            <Typography
              variant="caption-lg"
              color="textSecondary"
              render={<p />}
            >
              {TOKEN_TEXT}
            </Typography>
            {isGuid && (
              <Alert severity="info">
                That&rsquo;s an iModel ID. ion can&rsquo;t look up an iModel by
                its ID; enter the ion asset ID it was imported as, or paste the
                iModel&rsquo;s WKT2 above.
              </Alert>
            )}
            {state.state === "noCrs" && (
              <Alert severity="info">
                {state.message} Paste its WKT2 above to check its CRS.
              </Alert>
            )}
            {state.state === "error" && (
              <Alert severity="error">{state.message}</Alert>
            )}
            {state.state === "found" && (
              <Alert severity="success">
                {state.crsName}: read from the tileset&rsquo;s
                EXT_geospatial_crs. Its checks are below.
              </Alert>
            )}
          </>
        )}
      </div>
    </section>
  );
}
