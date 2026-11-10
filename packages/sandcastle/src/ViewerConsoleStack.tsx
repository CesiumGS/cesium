import { Allotment, AllotmentHandle } from "allotment";
import {
  ReactElement,
  RefObject,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type ViewerConsoleStackRef = {
  toggleExpanded: () => void;
};

/**
 * This component is meant to wrap the Viewer Bucket and Console Mirror.
 * This handles the automatic "snapping" of the console Allotment area to the collapsed height.
 * It also includes logic for returning to the same expanded height when toggled directly.
 *
 * Allotment does have a built-in snap feature but it's "snap to zero" which completely closes
 * the panel. We specifically want it to snap to a set height to continue to display the console header
 */
export function ViewerConsoleStack({
  ref,
  children,
  consoleCollapsedHeight,
  consoleExpanded,
  setConsoleExpanded,
}: {
  ref: RefObject<ViewerConsoleStackRef | null>;
  children: ReactElement<typeof Allotment.Pane>[];
  consoleCollapsedHeight: number;
  consoleExpanded: boolean;
  setConsoleExpanded: (expanded: boolean) => void;
}) {
  const rightSideRef = useRef<AllotmentHandle>(null);
  const rightSideSizes = useRef<number[]>([0, 0]);

  const [previousConsoleHeight, setPreviousConsoleHeight] = useState<
    number | undefined
  >(undefined);
  const toggleExpanded = useCallback(() => {
    const [top, bottom] = rightSideSizes.current;
    const totalHeight = top + bottom;
    if (!consoleExpanded) {
      const targetHeight = previousConsoleHeight ?? 200;
      rightSideRef.current?.resize([totalHeight - targetHeight, targetHeight]);
    } else {
      setPreviousConsoleHeight(bottom);
      rightSideRef.current?.resize([
        totalHeight - consoleCollapsedHeight,
        consoleCollapsedHeight,
      ]);
    }
    setConsoleExpanded(!consoleExpanded);
  }, [
    consoleExpanded,
    previousConsoleHeight,
    consoleCollapsedHeight,
    setConsoleExpanded,
  ]);

  useImperativeHandle(ref, () => {
    return {
      toggleExpanded: () => toggleExpanded(),
    };
  });

  return (
    <Allotment
      vertical
      ref={rightSideRef}
      defaultSizes={[100, 0]}
      onChange={(sizes) => {
        if (previousConsoleHeight) {
          // Unset this because we just dragged
          setPreviousConsoleHeight(undefined);
        }
        rightSideSizes.current = sizes;
      }}
      onDragEnd={(sizes) => {
        const [, consoleSize] = sizes;
        if (consoleSize <= consoleCollapsedHeight && consoleExpanded) {
          setConsoleExpanded(false);
        } else if (consoleSize > consoleCollapsedHeight && !consoleExpanded) {
          setConsoleExpanded(true);
        }
      }}
      onReset={() => {
        const [top, bottom] = rightSideSizes.current;
        const totalHeight = top + bottom;
        rightSideRef.current?.resize([
          totalHeight - consoleCollapsedHeight,
          consoleCollapsedHeight,
        ]);
        setConsoleExpanded(false);
      }}
    >
      {children}
    </Allotment>
  );
}
