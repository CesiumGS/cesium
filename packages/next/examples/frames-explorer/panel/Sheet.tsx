// Level 4 in both tabs (R14, UX I4, I7): a list that scrolls above, and a
// sheet under it for the one selected thing (Verify's inspector, Explore's
// walk). On a short tab the sheet fills it by default, with a way back to
// the list; on a tall one both show. Focus goes to the sheet's heading when
// it opens and back to what opened it when it closes (M17).
import { IconButton } from "@mui/material";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgWindowCollapse } from "@stratakit/icons/window-collapse";
import { svgWindowExpand } from "@stratakit/icons/window-expand";
import { Icon } from "@stratakit/mui";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** Below this tab height the sheet fills the tab by default, px. */
const SHORT = 640;

export interface SheetControls {
  full: boolean;
  setFull: (full: boolean) => void;
}

export function Split({
  list,
  sheet,
  sheetKey,
  className = "",
}: {
  list: ReactNode;
  /** The sheet's content, given its fill state; none, no sheet. */
  sheet?: ((controls: SheetControls) => ReactNode) | undefined;
  /** Changes when the sheet shows another thing (focus moves to it again). */
  sheetKey?: string | undefined;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [short, setShort] = useState(false);
  const [userFull, setUserFull] = useState<boolean>();
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) {
      return;
    }
    const measure = () => setShort(el.clientHeight < SHORT);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const full = sheet !== undefined && (userFull ?? short);
  // Back to the split: bring the selected row into view (it couldn't scroll
  // while the list was hidden).
  useEffect(() => {
    if (full) {
      return;
    }
    // After the card's collapse has laid out (it opened while hidden).
    const timer = setTimeout(
      () =>
        box.current
          ?.querySelector('.fx-split-list .fx-row-button[aria-pressed="true"]')
          ?.scrollIntoView({ block: "center" }),
      250,
    );
    return () => clearTimeout(timer);
  }, [full]);
  return (
    <div
      ref={box}
      className={`fx-split${sheet ? " fx-has-sheet" : ""}${full ? " fx-sheet-full" : ""} ${className}`}
    >
      <div className="fx-split-list" hidden={full}>
        {list}
      </div>
      {sheet && (
        <div className="fx-sheet" key={sheetKey}>
          {sheet({ full, setFull: setUserFull })}
        </div>
      )}
    </div>
  );
}

/**
 * The sheet's header row: `children` (a breadcrumb or status), then fill
 * and close. It takes focus on open, and gives it back on close.
 */
export function SheetHead({
  children,
  controls,
  onClose,
  closeLabel,
  focusRef,
}: {
  children: ReactNode;
  controls: SheetControls;
  onClose: () => void;
  closeLabel: string;
  /** The element to focus on open (the sheet's heading); the header itself by default. */
  focusRef?: RefObject<HTMLElement | null>;
}) {
  const head = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    opener.current = document.activeElement;
    // A target, not a control: no focus ring (StrataKit's ring can't be
    // overridden from outside its layer), but screen readers move to it.
    (focusRef?.current ?? head.current)?.focus({
      preventScroll: true,
      focusVisible: false,
    });
    return () => {
      const back = opener.current;
      // Back to what opened it, if it's still there (a row's button).
      if (back instanceof HTMLElement && back.isConnected) {
        back.focus({ preventScroll: true });
      }
    };
  }, [focusRef]);
  const { full, setFull } = controls;
  return (
    <div className="fx-sheet-head" ref={head} tabIndex={-1}>
      <div className="fx-sheet-title">{children}</div>
      <span className="fx-sheet-tools">
        <IconButton
          size="small"
          aria-label={full ? "Show the list too" : "Fill the tab"}
          title={full ? "Show the list too" : "Fill the tab"}
          onClick={() => setFull(!full)}
        >
          <Icon href={full ? svgWindowCollapse : svgWindowExpand} />
        </IconButton>
        <IconButton
          size="small"
          aria-label={closeLabel}
          title={closeLabel}
          onClick={onClose}
        >
          <Icon href={svgDismiss} />
        </IconButton>
      </span>
    </div>
  );
}
