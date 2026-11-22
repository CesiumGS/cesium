import { Root } from "@stratakit/mui";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { store } from "./data.ts";

/**
 * Dyno's color scheme: the viewer's choice (system, light or dark,
 * remembered per browser) resolved against the system preference, and
 * StrataKit's Root, which themes everything under it.
 */

export type Choice = "system" | "light" | "dark";
export type Scheme = "light" | "dark";

const ThemeContext = createContext<{
  choice: Choice;
  scheme: Scheme;
  setChoice: (choice: Choice) => void;
}>({ choice: "system", scheme: "dark", setChoice: () => {} });

export const useTheme = () => useContext(ThemeContext);

const query = () => matchMedia("(prefers-color-scheme: dark)");

export function ThemeRoot({ children }: { children: ReactNode }) {
  const [choice, setStoredChoice] = useState<Choice>(() =>
    store.get("dyno.theme", "system"),
  );
  const [systemDark, setSystemDark] = useState(() => query().matches);
  useEffect(() => {
    const m = query();
    const on = () => setSystemDark(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const scheme: Scheme =
    choice === "system" ? (systemDark ? "dark" : "light") : choice;
  // Standalone report styles (in a shadow root) read the page's theme.
  useEffect(() => {
    document.documentElement.dataset.theme = scheme;
  }, [scheme]);
  const setChoice = (next: Choice) => {
    store.set("dyno.theme", next);
    setStoredChoice(next);
  };
  return (
    <ThemeContext.Provider value={{ choice, scheme, setChoice }}>
      <Root colorScheme={scheme} className="dyno-root">
        {children}
      </Root>
    </ThemeContext.Provider>
  );
}
