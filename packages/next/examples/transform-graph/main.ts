import "./transform-graph.css";
import type { AnchorHandle, CorePick, View } from "@cesium/next";
import type { Frame, FrameCatalog } from "@cesium/next/frames";
import type { Dispose, ExampleContext } from "../types.ts";
import { createGraphPanel, type GraphSpec } from "./graphPanel.ts";
import { createQueries } from "./queries.ts";
import { SCENES } from "./scenes.ts";
import type { Scene, SceneHost, ScenePick } from "./scene.ts";
import { el, messageOf } from "./ui.ts";

/**
 * The transform graph, on real data: eight scenes, each a small graph of
 * nodes (affine, smooth, switch) with content and the camera placed at some of
 * them. Where something sits decides what is warped; the panel lists the
 * nodes, lights the route of the last pick, and reads true values beside the
 * drawn ones through the graph. See DESIGN.md.
 */
export async function run({
  viewer,
  panel,
  signal,
  scope: pageScope,
  accessToken,
  params,
  setParams,
}: ExampleContext): Promise<Dispose> {
  const { engine, world } = viewer;
  const catalog: FrameCatalog = viewer.frames;
  const itrf: Frame = catalog.get("ITRF");
  const resolver = engine.cameras.resolver(world);
  if (!resolver.bindAnchor) {
    throw new Error("the viewer's frame resolver binds no anchors");
  }
  const queries = createQueries(
    catalog,
    resolver as unknown as Parameters<typeof createQueries>[1],
  );

  // ------------------------------------------------------------- layout
  const overlay = el("div", { className: "tgx-overlay" });
  if (viewer.canvas.parentElement === viewer.container) {
    viewer.canvas.after(overlay);
  } else {
    viewer.container.prepend(overlay);
  }
  pageScope.defer(() => overlay.remove());

  const loadingText = el("span");
  const loadingCard = el(
    "div",
    { className: "tgx-loading", role: "status", hidden: true },
    el(
      "div",
      {},
      el("span", { className: "tgx-spinner", ariaHidden: "true" }),
      loadingText,
    ),
  );
  overlay.append(loadingCard);

  const picker = el("div", {
    className: "tgx-picker",
    role: "radiogroup",
    ariaLabel: "Scene",
  });
  const title = el("h3");
  const caption = el("p", { className: "tgx-caption" });
  const point = el("p", { className: "tgx-point" });
  const controls = el("div", { className: "tgx-controls" });
  const readouts = el("div", { className: "tgx-readouts" });
  const notes = el("div", { className: "tgx-notes" });
  const graph = createGraphPanel();
  const sources = el("details", { className: "tgx-sources" });
  const credits = el("ul");
  sources.append(el("summary", {}, "Sources and credits"), credits);
  panel.append(
    picker,
    title,
    caption,
    point,
    controls,
    el("h3", {}, "Readouts"),
    readouts,
    notes,
    el("h3", {}, "Graph"),
    graph.root,
    sources,
  );
  pageScope.defer(() => panel.replaceChildren());

  // --------------------------------------------------------------- picks
  const pickCallbacks = new Set<(pick: ScenePick) => void>();
  let down: { x: number; y: number } | undefined;
  const onDown = (e: PointerEvent) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : undefined;
  };
  const onUp = (e: PointerEvent) => {
    const from = down;
    down = undefined;
    if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > 4) {
      return;
    }
    const rect = viewer.canvas.getBoundingClientRect();
    const ratio = viewer.canvas.width / Math.max(1, rect.width);
    const x = (e.clientX - rect.left) * ratio;
    const y = (e.clientY - rect.top) * ratio;
    const views: View[] = viewer.views;
    const target = views.find((v) => v.contains(x, y)) ?? viewer.view;
    const rect2 = target.pixelRect();
    void target
      .pickPoint(x - rect2.x, y - rect2.y)
      .then((pick: CorePick | undefined) => {
        if (!pick || signal.aborted) {
          return;
        }
        const frame = frameOf(pick.anchor);
        graph.route(
          frame,
          frame
            ? `Pick on "${frame.name}"`
            : "The last pick (content under no node)",
        );
        for (const callback of [...pickCallbacks]) {
          callback({ pick, view: target, frame });
        }
      });
  };
  viewer.canvas.addEventListener("pointerdown", onDown);
  viewer.canvas.addEventListener("pointerup", onUp);
  pageScope.defer(() => {
    viewer.canvas.removeEventListener("pointerdown", onDown);
    viewer.canvas.removeEventListener("pointerup", onUp);
  });

  const frameOf = (anchor: AnchorHandle | undefined): Frame | undefined =>
    anchor ? (resolver.binding?.(anchor) as Frame | undefined) : undefined;

  // -------------------------------------------------------------- scenes
  let current: { scene: Scene; scope: DisposableStack; abort: AbortController };
  let generation = 0;
  const buttons = new Map<string, HTMLButtonElement>();

  function leave() {
    if (!current) {
      return;
    }
    current.abort.abort();
    current.scope.dispose();
    pickCallbacks.clear();
    graph.set(undefined);
    controls.replaceChildren();
    readouts.replaceChildren();
    notes.replaceChildren();
    loadingCard.hidden = true;
    for (const child of [...overlay.children]) {
      if (child !== loadingCard) {
        child.remove();
      }
    }
  }

  async function enter(scene: Scene) {
    const mine = ++generation;
    leave();
    for (const [id, b] of buttons) {
      b.setAttribute("aria-checked", String(id === scene.id));
    }
    title.textContent = `${scene.number} · ${scene.title}`;
    caption.textContent = scene.caption;
    point.textContent = scene.point;
    credits.replaceChildren(
      ...scene.sources.map((s) =>
        el(
          "li",
          {},
          s.href
            ? el(
                "a",
                { href: s.href, target: "_blank", rel: "noreferrer" },
                s.what,
              )
            : s.what,
          ` ${s.who}. ${s.terms}`,
        ),
      ),
    );
    setParams({ scene: scene.id });
    const abort = new AbortController();
    const scope = new DisposableStack();
    current = { scene, scope, abort };
    viewer.showGlobe = scene.globe;
    const sceneSignal = AbortSignal.any([signal, abort.signal]);
    const host: SceneHost = {
      viewer,
      catalog,
      itrf,
      queries,
      scope,
      signal: sceneSignal,
      accessToken,
      controls,
      readouts,
      overlay,
      graph,
      bind(anchor, frame) {
        const previous = resolver.binding?.(anchor) as Frame | undefined;
        resolver.bindAnchor!(anchor, frame);
        scope.defer(() => {
          if (previous && !world.destroyed) {
            resolver.bindAnchor?.(anchor, previous);
          }
        });
      },
      frameOf,
      describe(spec: GraphSpec) {
        graph.set(spec);
      },
      loading(text) {
        if (mine !== generation) {
          return;
        }
        loadingCard.hidden = text === undefined;
        loadingText.textContent = text ?? "";
      },
      note(text) {
        if (mine === generation) {
          notes.append(el("p", { className: "tgx-note" }, text));
        }
      },
      onPick(callback) {
        pickCallbacks.add(callback);
        return () => pickCallbacks.delete(callback);
      },
      scrub: (error) => messageOf(error, accessToken),
    };
    host.loading(`Building “${scene.title}”…`);
    try {
      await scene.start(host);
    } catch (error) {
      if (!sceneSignal.aborted) {
        host.note(`The scene did not start: ${host.scrub(error)}`);
      }
    }
    if (mine === generation) {
      engine.requestRender();
    }
  }

  for (const scene of SCENES) {
    const button = el(
      "button",
      {
        type: "button",
        role: "radio",
        ariaChecked: "false",
        title: scene.title,
        onclick: () => void enter(scene),
      },
      el("span", { className: "tgx-num" }, String(scene.number)),
      scene.title,
    );
    buttons.set(scene.id, button);
    picker.append(button);
  }
  pageScope.defer(() => {
    generation++;
    leave();
  });

  const wanted = params.scene;
  const first =
    SCENES.find((s) => s.id === wanted || String(s.number) === wanted) ??
    SCENES[0]!;
  void enter(first);

  return () => undefined;
}
