// The route spelled out under the tree (the owner's tree design, fix 1):
// numbered steps, from the data as delivered (or the answer's start)
// through each edge the route lights, what it does physically and its
// accuracy, to what you see in the drawn-in frame.
import type { RouteStep } from "./routeSteps.ts";

export function RouteSteps({ steps }: { steps: readonly RouteStep[] }) {
  return (
    <ol className="fx-route" aria-label="The route through the tree">
      {steps.map((s, i) => (
        <li key={`${s.kind}:${s.edge ?? i}`} className={`fx-route-${s.kind}`}>
          <span className="fx-route-n fx-num" aria-hidden>
            {i + 1}
          </span>
          <span className="fx-route-text">
            <span className="fx-route-title">{s.title}</span>
            {s.does && <span className="fx-route-does">{s.does}</span>}
          </span>
          {s.accuracy && (
            <span
              className={`fx-route-acc fx-num${s.accuracy.unknown ? " fx-unbounded" : ""}`}
            >
              {s.accuracy.text}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
