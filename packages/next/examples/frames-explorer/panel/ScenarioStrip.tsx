// The scenario strip (spec "How the page works"): across the panel's top,
// one entry per scenario, in the strip's order (scenarios/specs.ts: it opens
// on one-path). Each says its title and, in a quieter line, its question; the
// one showing carries StrataKit's accent bar. Choosing one builds its tree
// and its scene at its checked setup.
import type { ScenarioId } from "../scenarios/spec.ts";
import type { ScenarioPanelView } from "./model.ts";

export function ScenarioStrip({
  scenario,
  onSelect,
}: {
  scenario: ScenarioPanelView;
  onSelect: (id: ScenarioId) => void;
}) {
  return (
    <nav className="fx-strip" aria-label="Scenarios">
      <ul>
        {scenario.strip.map((s) => {
          const current = s.id === scenario.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                className="fx-strip-item"
                aria-current={current ? "true" : undefined}
                title={s.question}
                onClick={() => {
                  if (!current) {
                    onSelect(s.id);
                  }
                }}
              >
                <span className="fx-strip-title">{s.title}</span>
                <span className="fx-strip-question">{s.question}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
