// The route spelled out under the tree (the owner's tree design, fix 1):
// numbered steps, from the data as delivered (or the answer's start)
// through each edge the route lights, what it does physically and its
// accuracy, to what you see in the drawn-in frame. A route in two legs
// (stand-on-moon's two clocks, each taken up to ICRF: Task 4c item 1) shows
// each leg under its heading, both lit, the numbering running on.
import type { RouteStep } from "./routeSteps.ts";

function Step({ s, n }: { s: RouteStep; n: number }) {
  return (
    <li className={`fx-route-${s.kind}`}>
      <span className="fx-route-n fx-num" aria-hidden>
        {n}
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
  );
}

const key = (s: RouteStep, i: number) => `${s.kind}:${s.edge ?? i}`;

export function RouteSteps({
  steps,
  legs,
}: {
  steps: readonly RouteStep[];
  legs?: { start: string; end: string } | undefined;
}) {
  if (legs && steps.some((s) => s.leg !== undefined)) {
    const first = steps.filter((s) => s.leg === "start");
    const second = steps.filter((s) => s.leg === "end");
    return (
      <div className="fx-route-legs">
        {(
          [
            [legs.start, first, 0],
            [legs.end, second, first.length],
          ] as const
        ).map(([heading, part, offset]) => (
          <div key={heading} className="fx-route-leg">
            <p className="fx-route-leg-head">
              <span className="fx-key-line" aria-hidden />
              {heading}
            </p>
            <ol className="fx-route fx-route-lit" aria-label={heading}>
              {part.map((s, i) => (
                <Step key={key(s, i)} s={s} n={offset + i + 1} />
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ol className="fx-route" aria-label="The route through the tree">
      {steps.map((s, i) => (
        <Step key={key(s, i)} s={s} n={i + 1} />
      ))}
    </ol>
  );
}
