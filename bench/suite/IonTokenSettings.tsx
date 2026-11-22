import {
  Alert,
  AlertTitle,
  Badge,
  Button,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Popover,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgKeyLarge } from "@stratakit/icons/key";
import { svgVisibilityHide } from "@stratakit/icons/visibility-hide";
import { svgVisibilityShow } from "@stratakit/icons/visibility-show";
import { Icon } from "@stratakit/mui";
import { unstable_NavigationRail as NavigationRail } from "@stratakit/structures";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  onOpenTokenSettings,
  openTokenSettings,
  readToken,
  saveToken,
  type TokenSource,
} from "./ionToken.ts";
import { toast } from "./toast.ts";
import { useIonToken } from "./useIonToken.ts";

/**
 * Dyno's ion token, for every view, example and Lab page: an item in the
 * rail's footer (with what's in use) opening a popover to paste, remember
 * or clear a token. The token is never shown once saved, and never goes
 * into a URL, a report or the console.
 */

const STATUS: Record<
  TokenSource,
  {
    badge: string;
    short: string;
    color: "success" | "info" | "secondary" | "warning";
  }
> = {
  pasted: { badge: "Your token", short: "Yours", color: "success" },
  env: { badge: "From .env.local", short: ".env.local", color: "info" },
  evaluation: {
    badge: "Evaluation token",
    short: "Evaluation",
    color: "secondary",
  },
  none: { badge: "No token", short: "None", color: "warning" },
};

const RAIL_BUTTON = "dyno-ion-token";

/** The rail item and its popover; views open it with `openTokenSettings`. */
export function IonTokenRailItem({ expanded }: { expanded: boolean }) {
  const { source } = useIonToken();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(
    () =>
      onOpenTokenSettings(() =>
        setAnchor(document.getElementById(RAIL_BUTTON)),
      ),
    [],
  );
  const status = STATUS[source];
  return (
    <NavigationRail.ListItem>
      <NavigationRail.Button
        id={RAIL_BUTTON}
        icon={
          source === "none" && !expanded ? (
            <Badge variant="dot" color="warning">
              <Icon href={svgKeyLarge} size="large" />
            </Badge>
          ) : (
            svgKeyLarge
          )
        }
        label="ion token"
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        suffix={
          <Badge
            badgeContent={status.short}
            variant="inline"
            color={status.color}
            size="small"
          />
        }
      />
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { className: "token-popover-paper" } }}
      >
        <TokenSettings onDone={() => setAnchor(null)} />
      </Popover>
    </NavigationRail.ListItem>
  );
}

function TokenSettings({ onDone }: { onDone: () => void }) {
  const { source, remembered } = useIonToken();
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState(false);
  const [remember, setRemember] = useState(remembered);
  const titleId = useId();
  // The field, once the popover is open: Modal's focus trap takes focus
  // to the paper first, so `autoFocus` alone doesn't hold.
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => field.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const status = STATUS[source];
  const pasted = source === "pasted";
  const where = (keep: boolean) =>
    keep ? "remembered on this device" : "kept for this session";
  const use = () => {
    if (!draft.trim()) {
      return;
    }
    saveToken(draft, remember);
    setDraft("");
    toast(`ion token saved: ${where(remember)}`);
    onDone();
  };
  return (
    <section className="token-popover" role="dialog" aria-labelledby={titleId}>
      <header className="token-popover-header">
        <Typography variant="subtitle-md" render={<h2 id={titleId} />}>
          Cesium ion token
        </Typography>
        <IconButton label="Close" size="small" onClick={onDone}>
          <Icon href={svgDismiss} />
        </IconButton>
      </header>
      <div className="token-popover-status" aria-live="polite">
        <Badge
          badgeContent={status.badge}
          variant="inline"
          color={status.color}
        />
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          {source === "pasted" && (
            <>
              Every view and example uses it.{" "}
              {where(remembered)[0]!.toUpperCase()}
              {where(remembered).slice(1)}.
            </>
          )}
          {source === "env" && (
            <>
              <code>VITE_ION_TOKEN</code>, on the dev server only: builds never
              include it. A token pasted here comes first.
            </>
          )}
          {source === "evaluation" && (
            <>
              CesiumJS&rsquo;s public token, for public assets (Bing imagery,
              World Terrain). Paste yours to open your own assets and Google
              Photorealistic 3D Tiles.
            </>
          )}
          {source === "none" && (
            <>Nothing from Cesium ion loads until you paste a token.</>
          )}
        </Typography>
      </div>
      <TextField
        size="small"
        fullWidth
        inputRef={field}
        type={shown ? "text" : "password"}
        label={pasted ? "Replace the token" : "Paste a token"}
        placeholder={pasted ? "Saved. Paste another to replace it" : ""}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            use();
          }
        }}
        slotProps={{
          htmlInput: {
            autoComplete: "off",
            spellCheck: false,
            autoCapitalize: "off",
          },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  label={shown ? "Hide the token" : "Show the token"}
                  size="small"
                  onClick={() => setShown((v) => !v)}
                >
                  <Icon href={shown ? svgVisibilityHide : svgVisibilityShow} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <FormControlLabel
        className="token-popover-remember"
        control={
          <Switch
            size="small"
            checked={remember}
            onChange={(e) => {
              const keep = e.target.checked;
              setRemember(keep);
              // A saved token moves to where it's now kept.
              const saved = readToken();
              if (pasted && saved) {
                saveToken(saved, keep);
                toast(`ion token ${where(keep)}`);
              }
            }}
          />
        }
        label={
          <span>
            Remember on this device
            <Typography
              variant="caption-lg"
              color="textSecondary"
              render={<span />}
              className="token-popover-hint"
            >
              Otherwise it&rsquo;s forgotten when this tab closes.
            </Typography>
          </span>
        }
      />
      <div className="token-popover-actions">
        {pasted ? (
          <Button
            variant="text"
            onClick={() => {
              saveToken(undefined, false);
              toast("ion token cleared");
              onDone();
            }}
          >
            Clear token
          </Button>
        ) : (
          <span />
        )}
        <Button color="primary" disabled={!draft.trim()} onClick={use}>
          Use token
        </Button>
      </div>
      <Typography
        variant="caption-lg"
        color="textSecondary"
        render={<p />}
        className="token-popover-fine"
      >
        Make one under{" "}
        <Link
          href="https://ion.cesium.com/tokens"
          target="_blank"
          rel="noreferrer"
        >
          Access Tokens in your ion account
        </Link>
        . It stays in this browser and goes only to Cesium ion.
      </Typography>
    </section>
  );
}

/**
 * Where ion content needs a token Dyno doesn't have (or ion refused the one
 * it has): what can't load, and the button that opens the token settings.
 */
export function TokenPrompt({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { source } = useIonToken();
  return (
    <Alert
      severity="warning"
      className={`token-prompt${className ? ` ${className}` : ""}`}
      action={
        <Button variant="outlined" onClick={openTokenSettings}>
          {source === "pasted" ? "Change token" : "Paste a token"}
        </Button>
      }
    >
      <AlertTitle>
        {source === "pasted"
          ? "Cesium ion refused your token"
          : "Paste an ion token"}
      </AlertTitle>
      {children}
    </Alert>
  );
}
