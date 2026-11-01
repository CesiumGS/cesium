import { Button, Callout, Flex, Select, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { getRouteApi } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { bindChartsIn } from "../charts.mjs";
import { type Runs, store } from "../data.ts";

/**
 * What Dyno's views share: the runs (the router's root loader), the
 * theme, chart hosting and a few Radix-based controls with Dyno's
 * conventions. Views are React components under views/, one per route
 * (routes.tsx); their state lives in the route's typed search params.
 */

const rootApi = getRouteApi("__root__");

/** Every run's summary and the results index (loaded before any view). */
export function useRuns(): Runs {
  return rootApi.useLoaderData() as Runs;
}

/** Dark charts when the shell's theme is dark. */
export const DarkContext = createContext(false);
export const useDark = () => useContext(DarkContext);

/**
 * A chart (or any HTML) from charts.mjs, which the CLI's reports share:
 * inserted as HTML, then given its tooltips and click handling. `onPick`
 * gets the x of a click on a plot (a run index, a path percentage).
 */
export function Chart({
  html,
  onPick,
  className,
}: {
  html: string;
  onPick?: (x: number, target: Element) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  useLayoutEffect(() => {
    const el = ref.current!;
    el.innerHTML = html;
    bindChartsIn(el);
  }, [html]);
  useLayoutEffect(() => {
    const el = ref.current!;
    const on = (e: Event) =>
      pick.current?.((e as CustomEvent).detail.x, e.target as Element);
    el.addEventListener("chart-click", on);
    return () => el.removeEventListener("chart-click", on);
  }, []);
  return <div ref={ref} className={className ?? "chart-host"} />;
}

/** A labeled control in a toolbar row. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Flex asChild align="center" gap="2">
      <label>
        <Text size="2" color="gray">
          {label}
        </Text>
        {children}
      </label>
    </Flex>
  );
}

/** A toolbar row of fields and buttons. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <Flex align="center" gap="3" wrap="wrap" mb="3" className="toolbar">
      {children}
    </Flex>
  );
}

// Radix Select reserves the empty value (it clears the selection).
const NONE = "␀none";

/**
 * One choice from a list (Radix Select). Options are values, or
 * [value, label] pairs; an empty value is allowed ("none").
 */
export function Choice({
  value,
  options,
  onChange,
  label,
  placeholder = "—",
  disabled,
}: {
  value: string | undefined;
  options: ReadonlyArray<string | readonly [string, string]>;
  onChange: (value: string) => void;
  /** Accessible name when no visible label names it. */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const pairs = options.map((o) =>
    typeof o === "string" ? ([o, o] as const) : o,
  );
  const known = value !== undefined && pairs.some(([v]) => v === value);
  return (
    <Select.Root
      value={known ? value || NONE : undefined}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      disabled={disabled}
    >
      <Select.Trigger aria-label={label} placeholder={placeholder} />
      <Select.Content position="popper" sideOffset={4}>
        {pairs.map(([v, text]) => (
          <Select.Item key={v || NONE} value={v || NONE}>
            {text}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

/** Toggle chips: any number of options on (metrics, states). */
export function Chips({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<readonly [string, string]>;
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
}) {
  return (
    <Flex gap="1" wrap="wrap" role="group" aria-label={label}>
      {options.map(([v, text]) => {
        const on = value.includes(v);
        return (
          <Button
            key={v}
            size="1"
            radius="full"
            variant={on ? "solid" : "outline"}
            color={on ? undefined : "gray"}
            aria-pressed={on}
            onClick={() =>
              onChange(on ? value.filter((x) => x !== v) : [...value, v])
            }
          >
            {text}
          </Button>
        );
      })}
    </Flex>
  );
}

/** Explanatory text under a view's header. */
export function Lede({ children }: { children: ReactNode }) {
  return (
    <Text as="p" size="2" color="gray" mb="3" className="lede">
      {children}
    </Text>
  );
}

/** What a view shows when it has nothing to show yet, and what to do. */
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <Callout.Root variant="surface" color="gray" className="empty">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        <Text weight="medium">{title}</Text>
        {children ? <> {children}</> : null}
      </Callout.Text>
    </Callout.Root>
  );
}

/** State remembered per viewer in localStorage (never shared). */
export function useStored<T>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => store.get(key, fallback));
  const set = useCallback(
    (next: T) => {
      store.set(key, next);
      setValue(next);
    },
    [key],
  );
  return [value, set];
}

export { toast } from "../toast.ts";
