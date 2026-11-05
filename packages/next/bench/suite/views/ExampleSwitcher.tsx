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
                <Thumbnail example={x} />
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

/** The example as it last looked here, or its initials until it has run. */
function Thumbnail({ example }: { example: ExampleInfo }) {
  const url = readThumbnail(example.id);
  return url ? (
    <img className="examples-switcher-thumb" src={url} alt="" />
  ) : (
    <span className="examples-switcher-thumb placeholder" aria-hidden="true">
      {example.title
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join("")}
    </span>
  );
}

const THUMBNAILS = "dyno.examples.thumbnail.";
/** Thumbnail size, 16:9 CSS pixels at 2× (menu cards are 120×68). */
const THUMB_WIDTH = 240;
const THUMB_HEIGHT = 135;

/** Only what `captureThumbnail` writes: a base64 JPEG data URL. */
const THUMBNAIL_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

function readThumbnail(id: string): string | undefined {
  try {
    // Storage is shared with the origin: anything else in it is ignored.
    const url = localStorage.getItem(THUMBNAILS + id);
    return url && THUMBNAIL_URL.test(url) ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A picture of the example for the menu: `render` draws a frame, read in
 * the same task (a WebGPU canvas's image is valid until the task ends),
 * cropped to 16:9 and kept as a small JPEG.
 */
export function captureThumbnail(
  id: string,
  canvas: HTMLCanvasElement,
  render: () => void,
): void {
  if (canvas.width === 0 || canvas.height === 0) {
    return;
  }
  try {
    render();
    const out = document.createElement("canvas");
    out.width = THUMB_WIDTH;
    out.height = THUMB_HEIGHT;
    const ctx = out.getContext("2d");
    if (!ctx) {
      return;
    }
    // Cover: the largest centered 16:9 rectangle of the view.
    const aspect = THUMB_WIDTH / THUMB_HEIGHT;
    let w = canvas.width;
    let h = w / aspect;
    if (h > canvas.height) {
      h = canvas.height;
      w = h * aspect;
    }
    ctx.drawImage(
      canvas,
      (canvas.width - w) / 2,
      (canvas.height - h) / 2,
      w,
      h,
      0,
      0,
      THUMB_WIDTH,
      THUMB_HEIGHT,
    );
    localStorage.setItem(THUMBNAILS + id, out.toDataURL("image/jpeg", 0.8));
  } catch {
    // No picture (storage full or blocked): the menu shows initials.
  }
}
