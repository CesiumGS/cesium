import { escape } from "./charts.mjs";
import { toast } from "./toast.ts";

/**
 * Dyno's Images tab (plan §16.10), after Chromatic and Skia Gold: the
 * latest image-check run's changed and new checks first, each with its
 * baseline and new image side by side, a swipe, a flicker toggle and the
 * FLIP heatmap (and 1.x when the run checked parity), approved or
 * rejected here. Approving copies the image into the baselines.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- results are JSON */
type Json = any;

const ORDER = ["changed", "new", "timeout", "error", "pass", "unsupported"];

export async function mountImages(
  root: HTMLElement,
  actions: { openExplorer: (scene: string, t: number) => void },
): Promise<void> {
  const index = (await (
    await fetch("/bench-results/images/index.json")
  ).json()) as {
    runs: string[];
  };
  if (!index.runs.length) {
    root.innerHTML = `<div class="empty">No image checks yet. Run <code>node packages/next/bench/suite/cli.mjs images</code> (add <code>--parity</code> to compare with 1.x, <code>--update</code> to approve the first baselines).</div>`;
    return;
  }
  let runName = index.runs[0]!;
  const shown = new Set(["changed", "new", "timeout", "error"]);

  root.innerHTML = `<div class="images">
  <div class="controls">
    <label>Run <select data-id="run">${index.runs.map((r) => `<option>${escape(r)}</option>`).join("")}</select></label>
    <span class="chips" data-id="filters"></span>
    <span class="muted" data-id="summary"></span>
  </div>
  <div data-id="list"></div>
</div>`;
  const $ = <T extends Element>(id: string) =>
    root.querySelector<T>(`[data-id="${id}"]`)!;
  $<HTMLSelectElement>("run").addEventListener("change", (e) => {
    runName = (e.target as HTMLSelectElement).value;
    void draw();
  });
  for (const status of ORDER) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = status;
    chip.setAttribute("aria-pressed", String(shown.has(status)));
    chip.addEventListener("click", () => {
      if (shown.has(status)) {
        shown.delete(status);
      } else {
        shown.add(status);
      }
      chip.setAttribute("aria-pressed", String(shown.has(status)));
      void draw();
    });
    $("filters").append(chip);
  }

  async function draw(): Promise<void> {
    const run: Json = await (
      await fetch(`/bench-results/images/${runName}`)
    ).json();
    const rows: Json[] = run.checks;
    const count = (s: string) => rows.filter((r) => r.status === s).length;
    $("summary").textContent =
      `${run.rendererClass} · ${new Date(run.date).toLocaleString()} · ${run.commit.slice(0, 7)}${run.dirty ? "*" : ""} · ${count("pass")} unchanged, ${count("changed")} changed, ${count("new")} new, ${count("unsupported")} unsupported`;
    const list = $<HTMLElement>("list");
    list.replaceChildren();
    const visible = rows
      .filter((r) => shown.has(r.status))
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
    if (!visible.length) {
      list.innerHTML = `<div class="empty">Nothing in this view${count("pass") ? `: ${count("pass")} checks unchanged` : ""}.</div>`;
      return;
    }
    for (const row of visible) {
      list.append(card(run, row));
    }
  }

  function card(run: Json, row: Json): HTMLElement {
    const el = document.createElement("article");
    el.className = `check ${row.status}`;
    const now = row.image ? run.assets + row.image : "";
    const before = row.baseline ? run.baselines + row.baseline.file : "";
    const heat = row.heatmap ? run.assets + row.heatmap : "";
    const parity = row.parity ? run.assets + row.parity.image : "";
    const parityHeat = row.parity ? run.assets + row.parity.heatmap : "";
    const modes = [
      ...(before
        ? [
            ["side", "Side by side"],
            ["swipe", "Swipe"],
            ["flicker", "Flicker"],
            ["diff", "Difference"],
          ]
        : [["side", "New image"]]),
      ...(parity ? [["parity", `vs ${row.parity.config}`]] : []),
    ];
    const reviewed = row.review
      ? `<span class="muted">${escape(row.review.decision)}d by ${escape(row.review.by)} ${escape(new Date(row.review.at).toLocaleString())}${row.review.note ? `: ${escape(row.review.note)}` : ""}</span>`
      : row.approved
        ? `<span class="muted">approved</span>`
        : "";
    el.innerHTML = `<header>
  <span class="status-badge ${escape(row.status)}">${escape(row.status)}</span>
  <b>${escape(row.title)}</b> <span class="muted">${escape(row.id)} · ${escape(row.config)}</span>
  ${row.flip ? `<span>FLIP ${row.flip.mean.toFixed(4)} mean · ${row.flip.p95.toFixed(4)} p95</span>` : ""}
  ${row.parity ? `<span class="muted">parity vs ${escape(row.parity.config)}: ${row.parity.mean.toFixed(3)} mean ${row.parity.within ? "✓ within §4 L2" : "✕ outside §4 L2"}</span>` : ""}
  ${row.message ? `<span class="muted">${escape(row.message)}</span>` : ""}
</header>
${
  now
    ? `<div class="segmented" role="radiogroup" aria-label="View">${modes.map(([m, l], i) => `<button role="radio" data-mode="${m}" aria-checked="${i === 0}">${escape(l!)}</button>`).join("")}</div>
<div class="viewer" data-mode="side">
  <div class="side">${before ? `<figure><img src="${escape(before)}" alt="Baseline"><figcaption>Baseline${row.baseline?.approvedAt ? ` · ${escape(new Date(row.baseline.approvedAt).toLocaleDateString())}` : ""}</figcaption></figure>` : ""}<figure><img src="${escape(now)}" alt="New image"><figcaption>New</figcaption></figure></div>
  <div class="swipe" hidden><div class="stack"><img src="${escape(before)}" alt="Baseline"><div class="top"><img src="${escape(now)}" alt="New image"></div></div><input type="range" min="0" max="100" value="50" aria-label="Swipe between baseline and new"></div>
  <div class="flicker" hidden><img src="${escape(before)}" alt="Flicker between baseline and new"><div class="muted">Alternating baseline and new; hover to hold the new image.</div></div>
  <div class="diff" hidden><img src="${escape(heat)}" alt="FLIP heatmap"><div class="muted">FLIP error per pixel (black none, yellow large).</div></div>
  <div class="parity" hidden>${parity ? `<div class="side"><figure><img src="${escape(parity)}" alt="1.x"><figcaption>${escape(row.parity.config)}</figcaption></figure><figure><img src="${escape(parityHeat)}" alt="Parity heatmap"><figcaption>FLIP against it</figcaption></figure></div>` : ""}</div>
</div>`
    : ""
}
<form class="review">
  ${
    row.image && row.status !== "pass"
      ? `<input name="note" placeholder="Why (optional)" aria-label="Reason">
  <button type="submit" name="decision" value="approve">${row.status === "new" ? "Approve as baseline" : "Approve change"}</button>
  <button type="submit" name="decision" value="reject">Reject</button>`
      : ""
  }
  <button type="button" data-act="explore">Open in the explorer</button>
  <span class="result" aria-live="polite">${reviewed}</span>
</form>`;
    // View modes.
    const viewer = el.querySelector<HTMLElement>(".viewer");
    let flicker = 0;
    const setMode = (mode: string) => {
      if (!viewer) {
        return;
      }
      for (const b of el.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
        b.setAttribute("aria-checked", String(b.dataset.mode === mode));
      }
      for (const part of ["side", "swipe", "flicker", "diff", "parity"]) {
        viewer.querySelector<HTMLElement>(`.${part}`)!.hidden = part !== mode;
      }
      clearInterval(flicker);
      if (mode === "flicker") {
        const img = viewer.querySelector<HTMLImageElement>(".flicker img")!;
        let on = false;
        flicker = window.setInterval(() => {
          if (!el.isConnected) {
            clearInterval(flicker);
            return;
          }
          if (!img.matches(":hover")) {
            on = !on;
            img.src = on ? now : before;
          } else {
            img.src = now;
          }
        }, 500);
      }
    };
    for (const b of el.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
      b.addEventListener("click", () => setMode(b.dataset.mode!));
    }
    const range = el.querySelector<HTMLInputElement>(".swipe input");
    range?.addEventListener("input", () => {
      el.querySelector<HTMLElement>(".swipe .top")!.style.clipPath =
        `inset(0 0 0 ${range.value}%)`;
    });
    // Review.
    const form = el.querySelector("form")!;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const decision = ((e as SubmitEvent).submitter as HTMLButtonElement)
        .value;
      const note =
        (form.elements.namedItem("note") as HTMLInputElement | null)?.value ??
        "";
      const res = await fetch("/bench-results/images/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run: runName, key: row.key, decision, note }),
      });
      const message = res.ok
        ? decision === "approve"
          ? "Approved: the new image is the baseline."
          : "Rejected: the change needs a fix."
        : "Could not save: is the dev server running?";
      form.querySelector(".result")!.textContent = message;
      toast(`${row.id}: ${message}`, res.ok ? "good" : "bad");
    });
    el.querySelector('[data-act="explore"]')!.addEventListener("click", () =>
      actions.openExplorer(row.scene, row.progress),
    );
    return el;
  }

  await draw();
}
