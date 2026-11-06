// The panel's small shared parts: the one status vocabulary (R14), glossary
// terms (R16), copy buttons and the accuracy readout (R8).
import { Badge, CircularProgress, IconButton, Typography } from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { svgInfo } from "@stratakit/icons/info";
import { svgStatusError } from "@stratakit/icons/status-error";
import { svgStatusPending } from "@stratakit/icons/status-pending";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { svgStatusWarning } from "@stratakit/icons/status-warning";
import { Icon } from "@stratakit/mui";
import { unstable_Popover as Popover } from "@stratakit/structures";
import { type ReactNode, useState } from "react";
import type { AccuracyStatement } from "../../../src/measure/accuracy.ts";
import type { DataItem } from "../protocol.ts";
import type { StressResult } from "../tests.ts";
import { cautionOf } from "../warnings.ts";
import { length } from "./format.ts";
import { GLOSSARY, type GlossaryKey } from "./glossary.ts";

/** Each data item's name, as the strip and "waiting for …" say it. */
export const ITEM_LABEL: Record<DataItem, string> = {
  frames: "Frame data",
  proj: "PROJ",
  geoid: "GEOID18",
  orion: "Orion OEM",
};

/** What each item is, for its pill's detail. */
export const ITEM_DETAIL: Record<DataItem, string> = {
  frames: "DE440 ephemeris, Earth orientation and leap seconds",
  proj: "PROJ's WebAssembly and proj.db",
  geoid: "NOAA's GEOID18 grid, for NAVD88 heights",
  orion: "Artemis II's trajectory (CCSDS OEM)",
};

export type Status =
  "pass" | "fail" | "waiting" | "missing" | "unbounded" | "shown" | "user";

const LOOK: Record<
  Status,
  {
    color: "success" | "error" | "info" | "secondary" | "warning";
    icon?: string;
    word: string;
    type?: "outlined" | "muted";
  }
> = {
  pass: { color: "success", icon: svgStatusSuccess, word: "Pass" },
  fail: { color: "error", icon: svgStatusError, word: "Fail" },
  waiting: { color: "info", word: "Waiting" },
  missing: { color: "secondary", icon: svgStatusPending, word: "Missing data" },
  unbounded: { color: "warning", icon: svgStatusWarning, word: "Not bounded" },
  shown: { color: "secondary", icon: svgInfo, word: "Shown", type: "outlined" },
  user: { color: "info", icon: svgInfo, word: "Your input", type: "outlined" },
};

/**
 * A status as R14's vocabulary: a color, an icon (a spinner while waiting)
 * and always a word, never color alone. `word` replaces the default word
 * ("Waiting for PROJ").
 */
export function StatusBadge({
  status,
  word,
  quiet = false,
}: {
  status: Status;
  word?: string;
  /** Muted, for a state that needs no attention (an item that's ready). */
  quiet?: boolean;
}) {
  const look = LOOK[status];
  const type = quiet ? "muted" : look.type;
  return (
    <Badge
      variant="inline"
      size="small"
      color={look.color}
      {...(type && { type })}
      className="fx-badge"
      badgeContent={
        <span className="fx-badge-content">
          {status === "waiting" ? (
            <CircularProgress size={10} aria-hidden />
          ) : (
            look.icon && <Icon href={look.icon} aria-hidden />
          )}
          {word ?? look.word}
        </span>
      }
    />
  );
}

/** A result's status, and the item it waits for. */
export function resultStatus(
  r: StressResult,
  waitingFor?: DataItem,
): { status: Status; word?: string } {
  if (waitingFor !== undefined) {
    return { status: "waiting", word: `Waiting for ${ITEM_LABEL[waitingFor]}` };
  }
  if (r.userInput) {
    return {
      status: r.pass ? "user" : "fail",
      word: r.pass ? "Your input" : "Your input fails",
    };
  }
  if (r.missing !== undefined && r.missing.length > 0) {
    return { status: "missing" };
  }
  if (r.displayOnly) {
    return { status: "shown" };
  }
  return { status: r.pass ? "pass" : "fail" };
}

/**
 * A glossary term: the word as a button (dotted underline) that opens its
 * definition. Children replace the term's own spelling.
 */
export function Term({
  k,
  children,
}: {
  k: GlossaryKey;
  children?: ReactNode;
}) {
  const entry = GLOSSARY[k];
  return (
    <Popover
      content={
        <div className="fx-term-popover">
          <Typography variant="subtitle-sm" render={<p />}>
            {entry.term}
          </Typography>
          <Typography variant="body-sm" render={<p />}>
            {entry.definition}
          </Typography>
        </div>
      }
    >
      <button type="button" className="fx-term">
        {children ?? entry.term}
      </button>
    </Popover>
  );
}

/** Copies `text`; says "Copied" in its label for a moment. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      size="small"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Icon href={svgCopy} />
    </IconButton>
  );
}

/** The unknown terms of a statement, by their notes. */
export function unknownTerms(a: AccuracyStatement): string[] {
  const terms = a.terms
    .filter((t) => t.meters === undefined)
    .map((t) => t.note);
  // A statement that couldn't be composed has no terms, only why.
  return terms.length === 0 && a.meters === undefined ? a.warnings : terms;
}

/**
 * An accuracy as R8 states it, one way everywhere (C3): a position
 * statement's total, "±2.8 m (1σ)" (`relative` adds "placement" in rows,
 * where the check itself is relative); "Not bounded" naming the unknown term;
 * else the case's accuracy note (F27: "exact arithmetic", "published value
 * ± half its last digit"); never a blank. With neither, "accuracy not
 * stated", in the warning color.
 */
export function AccuracyText({
  accuracy,
  note,
  compact = false,
  placement = false,
}: {
  accuracy: AccuracyStatement | undefined;
  note?: string | undefined;
  compact?: boolean;
  /** The figure is an absolute placement beside a relative check. */
  placement?: boolean;
}) {
  if (accuracy === undefined) {
    return note !== undefined ? (
      <span className="fx-accuracy fx-accuracy-note">{note}</span>
    ) : (
      <span className="fx-accuracy fx-unbounded">accuracy not stated</span>
    );
  }
  if (accuracy.meters === undefined) {
    const unknown = unknownTerms(accuracy)[0] ?? "a term";
    return (
      <span className="fx-accuracy fx-unbounded">
        <Icon href={svgStatusWarning} aria-hidden />
        <span>
          Not bounded
          {!compact && <span className="fx-muted">: {unknown}</span>}
        </span>
      </span>
    );
  }
  const caution = cautionOf(accuracy);
  return (
    <span className={`fx-accuracy${caution ? " fx-unbounded" : ""}`}>
      ±{length(accuracy.meters)}
      {placement && <span className="fx-muted"> placement</span>}
      {!compact && <span className="fx-muted"> (1σ)</span>}
    </span>
  );
}
