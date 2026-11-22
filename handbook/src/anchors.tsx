import { useEffect, type ReactNode } from "react";
import "./anchors.css";

/**
 * A long tab's sections can be linked to: `#/transform-graph/compiler` opens
 * the tab and scrolls to the section named `compiler`. The part after the
 * tab's id is the tab's own, so a tab that uses it for something else (the
 * transform graph's scenes) keeps its names apart from its sections'.
 */
export function Sec({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section" id={`sec-${id}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** Scrolls to the section the hash names, now and whenever the hash changes. */
export function useSectionLinks(tab: string, ids: readonly string[]): void {
  useEffect(() => {
    const go = () => {
      const [, , name] = location.hash.split("/");
      if (name && ids.includes(name)) {
        document
          .getElementById(`sec-${name}`)
          ?.scrollIntoView({ block: "start" });
      }
    };
    go();
    addEventListener("hashchange", go);
    return () => removeEventListener("hashchange", go);
    // The ids are fixed for a tab, so only the tab is a dependency.
  }, [tab]);
}

/** The tab's sections, as links at its top. */
export function OnThisPage({
  tab,
  items,
}: {
  tab: string;
  items: readonly { id: string; title: string }[];
}) {
  return (
    <nav className="on-page" aria-label="On this page">
      <p>On this page</p>
      <ol>
        {items.map((s) => (
          <li key={s.id}>
            <a href={`#/${tab}/${s.id}`}>{s.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
