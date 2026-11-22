import { Popover, Typography } from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronLeft } from "@stratakit/icons/chevron-left";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { Icon } from "@stratakit/mui";
import { Link as RouterLink, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { EXAMPLES } from "../../../examples/index.ts";
import type { ExampleInfo } from "../../../examples/types.ts";
import { readThumbnail } from "./thumbnails.ts";

/**
 * The example page's way between examples, in the space the back link
 * already took: "Examples / <this one> ▾" (the menu: every example, with a
 * picture of each as it last looked) and ‹ › for the previous and next,
 * also on the `[` and `]` keys. Each example runs in a viewer of its own on
 * the page's engine, so switching costs only the example's own setup.
 */
export function ExampleSwitcher({ current }: { current: ExampleInfo }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const index = EXAMPLES.findIndex((x) => x.id === current.id);
  const step = (by: number) =>
    EXAMPLES[(index + by + EXAMPLES.length) % EXAMPLES.length]!;
  const previous = step(-1);
  const next = step(1);
  const go = (to: ExampleInfo) =>
    void navigate({ to: "/examples/$id", params: { id: to.id } });

  // `[` and `]`, unless typing (the playground's editor, a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.key !== "[" && e.key !== "]")
      ) {
        return;
      }
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, [contenteditable=''], [contenteditable='true'], .cm-editor",
        )
      ) {
        return;
      }
      e.preventDefault();
      go(e.key === "[" ? previous : next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const several = EXAMPLES.length > 1;
  return (
    <nav className="examples-switcher" aria-label="Examples">
      <RouterLink to="/examples" className="examples-switcher-home">
        <Icon href={svgArrowLeft} />
        Examples
      </RouterLink>
      <span className="examples-switcher-sep" aria-hidden="true">
        /
      </span>
      <button
        type="button"
        className="examples-switcher-current"
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-controls={anchor ? menuId : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {current.title}
        <Icon href={svgChevronDown} />
      </button>
      {several && (
        <span className="examples-switcher-steps">
          <button
            type="button"
            className="examples-switcher-step"
            title={`Previous: ${previous.title} ([)`}
            aria-label={`Previous example: ${previous.title}`}
            onClick={() => go(previous)}
          >
            <Icon href={svgChevronLeft} />
          </button>
          <button
            type="button"
            className="examples-switcher-step"
            title={`Next: ${next.title} (])`}
            aria-label={`Next example: ${next.title}`}
            onClick={() => go(next)}
          >
            <Icon href={svgChevronRight} />
          </button>
        </span>
      )}
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ul id={menuId} className="examples-switcher-menu" role="menu">
          {EXAMPLES.map((x) => (
            <li key={x.id} role="none">
              <RouterLink
                to="/examples/$id"
                params={{ id: x.id }}
                role="menuitem"
                className="examples-switcher-item"
                aria-current={x.id === current.id ? "page" : undefined}
                onClick={() => setAnchor(null)}
              >
                <ExampleThumbnail example={x} />
                <span className="examples-switcher-text">
                  <Typography variant="body-sm" render={<strong />}>
                    {x.title}
                  </Typography>
                  <Typography variant="body-sm" color="textSecondary">
                    {x.description}
                  </Typography>
                </span>
              </RouterLink>
            </li>
          ))}
        </ul>
      </Popover>
    </nav>
  );
}

/**
 * The example as it last looked here, or until it has run a placeholder:
 * its initials on a gradient of its own (a hue from its id).
 */
export function ExampleThumbnail({
  example,
  className = "examples-switcher-thumb",
  hint,
}: {
  example: ExampleInfo;
  className?: string;
  /** Shown on the placeholder (the gallery: how to get a picture). */
  hint?: string;
}) {
  const url = readThumbnail(example.id);
  if (url) {
    return <img className={className} src={url} alt="" />;
  }
  let hue = 0;
  for (const c of example.id) {
    hue = (hue * 31 + c.charCodeAt(0)) % 360;
  }
  return (
    <span
      className={`${className} placeholder`}
      aria-hidden="true"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 45% 22%), hsl(${(hue + 60) % 360} 40% 14%))`,
      }}
    >
      <span className="placeholder-initials">
        {example.title
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]!.toUpperCase())
          .join("")}
      </span>
      {hint && <span className="placeholder-hint">{hint}</span>}
    </span>
  );
}
