import { useEffect, useRef, useState } from "react";
import type { Reel as ReelHandle, ReelState } from "../viewer/main.ts";
import shot1 from "../shots/reel-1.webp?inline";
import shot2 from "../shots/reel-2.webp?inline";
import shot3 from "../shots/reel-3.webp?inline";
import shot4 from "../shots/reel-4.webp?inline";
import shot5 from "../shots/reel-5.webp?inline";

/**
 * The reel: the real engine in the page, in five short chapters. Engine and
 * data are inert text in the built file until a reader starts it, so reading
 * the handbook uses no GPU and parses none of it. It draws nothing out of view,
 * and ends on leaving the tab.
 */
const CHAPTERS = [
  {
    title: "Earth with a true sky",
    short: "Earth",
    still: shot1,
    alt: "The Earth from space with the terminator crossing it, and city lights on the night side.",
    credit:
      "Imagery: NASA Earth Observatory, Blue Marble: Next Generation, and NASA VIIRS Black Marble, both through NASA GIBS. Stars: CesiumJS's Tycho star map. Sun: a copy of JPL's DE440 kernels reduced to 2000 to 2050 by this project, so not JPL's or NAIF's. Earth orientation: CelesTrak. None of this implies endorsement by NASA.",
  },
  {
    title: "Vehicles at scale",
    short: "Vehicles",
    still: shot2,
    alt: "Thousands of small vehicle symbols across a valley seen from above.",
    credit:
      "A simulated feed, from the real-time tracks example. Imagery: USDA, USGS The National Map. Elevation: U.S. Geological Survey, National Geospatial Program.",
  },
  {
    title: "The built and natural worlds",
    short: "The corridor",
    still: shot3,
    alt: "A highway corridor over hills, with the ground faded over a tunnel so the road shows inside the hill.",
    credit:
      "The road is made up, written by this project's generator. Imagery: USDA, USGS The National Map. Elevation: U.S. Geological Survey, National Geospatial Program.",
  },
  {
    title: "Two views, one device",
    short: "Two views",
    still: shot4,
    alt: "The canvas split in two, showing the whole road on the left and a close-up on the right.",
    credit:
      "Imagery: USDA, USGS The National Map. Elevation: U.S. Geological Survey, National Geospatial Program.",
  },
  {
    title: "A shader you can switch",
    short: "Shaders",
    still: shot5,
    alt: "A toy car model on a hillside with a custom shader.",
    credit:
      "Toy car: Guido Odendahl and Eric Chadwick, CC0, from Khronos's glTF Sample Assets. Shaders from the Slang playground.",
  },
];

type Status =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "running" }
  | { kind: "unavailable"; why: string }
  | { kind: "lost"; why: string }
  | { kind: "failed"; why: string };

type StartReel = (
  container: HTMLElement,
  options: { motion: boolean; onLost(message: string): void },
) => Promise<ReelHandle>;

async function loadEngine(): Promise<StartReel> {
  if (import.meta.env.DEV) {
    throw new Error("The reel runs in the built file: npm run handbook.");
  }
  const code = document.getElementById("live-engine")?.textContent;
  if (!code) {
    throw new Error("This copy of the page has no reel in it.");
  }
  const url = URL.createObjectURL(
    new Blob([code], { type: "text/javascript" }),
  );
  try {
    const module = (await import(/* @vite-ignore */ url)) as {
      startReel: StartReel;
    };
    return module.startReel;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Whether this browser can run it, before anything loads. */
async function webgpuProblem(): Promise<string | undefined> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (!gpu) {
    return "This browser doesn't offer WebGPU here.";
  }
  const adapter = await gpu.requestAdapter().catch(() => null);
  return adapter
    ? undefined
    : "This browser offers WebGPU, but no GPU adapter.";
}

const ms = (v: number) => (v < 10 ? v.toFixed(1) : v.toFixed(0));

/** The time of day on the Earth chapter, as UTC. */
const clockText = (hours: number) => {
  const h = ((Math.floor(hours) % 24) + 24) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} UTC`;
};

export function Reel() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [state, setState] = useState<ReelState | undefined>(undefined);
  const [picture, setPicture] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const reel = useRef<ReelHandle | undefined>(undefined);

  const start = async () => {
    setStatus({ kind: "starting" });
    const problem = await webgpuProblem();
    if (problem) {
      setStatus({ kind: "unavailable", why: problem });
      return;
    }
    try {
      const startReel = await loadEngine();
      const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      reel.current = await startReel(host.current!, {
        motion,
        onLost(message) {
          reel.current = undefined;
          setStatus({ kind: "lost", why: message });
        },
      });
      (globalThis as { __handbookReel?: ReelHandle }).__handbookReel =
        reel.current;
      setStatus({ kind: "running" });
    } catch (error) {
      setStatus({ kind: "failed", why: (error as Error).message });
    }
  };

  const stop = () => {
    reel.current?.dispose();
    reel.current = undefined;
    setState(undefined);
    setStatus({ kind: "idle" });
  };

  // Out of view, on another tab of the browser included, it draws nothing.
  // Leaving this tab of the handbook ends it.
  useEffect(() => {
    const element = box.current;
    if (!element) {
      return undefined;
    }
    const seen = new IntersectionObserver(([entry]) => {
      if (entry) {
        reel.current?.setActive(entry.isIntersecting && !document.hidden);
      }
    });
    seen.observe(element);
    const visibility = () => {
      const rect = element.getBoundingClientRect();
      reel.current?.setActive(
        !document.hidden && rect.bottom > 0 && rect.top < innerHeight,
      );
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      seen.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reel.current?.dispose();
      reel.current = undefined;
    };
  }, []);

  const running = status.kind === "running";

  // What's on screen, a few times a second.
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = setInterval(() => {
      if (reel.current) {
        setState(reel.current.state());
      }
    }, 250);
    return () => clearInterval(timer);
  }, [running]);

  const shown = running || status.kind === "starting";
  const chapter = CHAPTERS[state?.chapter ?? picture]!;
  const message =
    status.kind === "unavailable"
      ? `${status.why} These pictures show each chapter as it ran on another machine.`
      : status.kind === "lost"
        ? `The GPU device was lost, so the reel has stopped: ${status.why} It doesn't retry. Reload the page to try again.`
        : status.kind === "failed"
          ? `The reel couldn't start${status.why ? `: ${status.why}` : "."} These pictures show each chapter as it ran on another machine.`
          : undefined;
  const atEnd =
    state !== undefined &&
    !state.playing &&
    state.t >= state.duration &&
    state.chapter === CHAPTERS.length - 1;

  return (
    <div className="reel" ref={box}>
      <div className="reel-stage">
        {!shown ? (
          <img className="reel-still" src={chapter.still} alt={chapter.alt} />
        ) : null}
        <div
          className={shown ? "reel-host" : "reel-host live-hidden"}
          ref={host}
        />
        {status.kind === "idle" ? (
          <button
            type="button"
            className="reel-start"
            onClick={() => void start()}
          >
            Start the reel
          </button>
        ) : null}
        {status.kind === "starting" ? (
          <p className="reel-note" role="status">
            Starting: reading the data in this file…
          </p>
        ) : null}
        {running && state ? (
          <>
            <div className="reel-meter">
              <dl>
                <div>
                  <dt>CPU</dt>
                  <dd>{ms(state.cpuMs)} ms</dd>
                </div>
                <div>
                  <dt>GPU</dt>
                  <dd>
                    {Number.isNaN(state.gpuMs)
                      ? "no timer"
                      : `${ms(state.gpuMs)} ms`}
                  </dd>
                </div>
                <div>
                  <dt>Tick</dt>
                  <dd>{ms(state.frameMs)} ms</dd>
                </div>
              </dl>
              <p>This machine, right now</p>
            </div>
            <div className="reel-caption">
              <h3>{chapter.title}</h3>
              <p>{state.caption}</p>
            </div>
          </>
        ) : null}
      </div>
      {message ? (
        <p className="live-message" role="alert">
          {message}
        </p>
      ) : null}
      <div className="reel-bar">
        {running && state ? (
          <button
            type="button"
            onClick={() => {
              if (state.free) {
                reel.current?.resume();
              } else if (atEnd) {
                reel.current?.chapter(0);
                reel.current?.play(true);
              } else {
                reel.current?.play(!state.playing);
              }
            }}
          >
            {state.free
              ? "Resume the tour"
              : state.playing
                ? "Pause"
                : atEnd
                  ? "Play again"
                  : "Play"}
          </button>
        ) : null}
        <ol className="reel-chapters">
          {CHAPTERS.map((c, i) => {
            const current = (state?.chapter ?? picture) === i;
            return (
              <li key={c.short}>
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => {
                    if (reel.current) {
                      reel.current.chapter(i);
                    } else {
                      setPicture(i);
                    }
                  }}
                >
                  <span aria-hidden="true">{i + 1}</span> {c.short}
                  {current && running && state ? (
                    <span
                      className="reel-progress"
                      style={{
                        inlineSize: `${(state.t / state.duration) * 100}%`,
                      }}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
        {running ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : null}
      </div>
      {running && state ? <Controls state={state} reel={reel} /> : null}
      <p className="provenance">{chapter.credit}</p>
    </div>
  );
}

function Controls({
  state,
  reel,
}: {
  state: ReelState;
  reel: { current: ReelHandle | undefined };
}) {
  const r = reel.current;
  if (!r) {
    return null;
  }
  return (
    <div className="reel-controls">
      {state.chapter === 0 ? (
        <label>
          Time, 20 March 2026
          <input
            type="range"
            min={0}
            max={48}
            step={0.25}
            value={state.hours}
            onChange={(e) => r.setHours(Number(e.target.value))}
          />
          <output>{clockText(state.hours)}</output>
        </label>
      ) : null}
      {state.chapter === 1 ? (
        <>
          <label>
            Vehicles
            <input
              type="range"
              min={0}
              max={state.steps.length - 1}
              step={1}
              value={Math.max(
                0,
                state.steps.indexOf(
                  state.countManual ? state.target : state.count,
                ),
              )}
              aria-valuetext={
                state.countManual
                  ? `${state.target.toLocaleString()} asked for`
                  : `${state.count.toLocaleString()} shown`
              }
              onChange={(e) => r.setCount(state.steps[Number(e.target.value)]!)}
            />
            <output>
              {state.count === 0 ? "building" : state.count.toLocaleString()}
            </output>
          </label>
          <p className="reel-honest">
            {state.ceiling !== undefined
              ? `It stopped at ${state.ceiling.toLocaleString()} here, after ${state.ceilingWhy} on the next step up.`
              : state.count < state.target
                ? `Stepping up toward ${state.target.toLocaleString()}, one step at a time.`
                : `Holding at ${state.count.toLocaleString()} here.`}{" "}
            This is what this page saw on this machine now, while it also draws
            the globe: not a benchmark.
          </p>
        </>
      ) : null}
      {state.chapter === 2 ? (
        <>
          <label>
            Rigid to reprojected
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.morph}
              onChange={(e) => r.setMorph(Number(e.target.value))}
            />
          </label>
          <label>
            Ground over the tunnel
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.ground}
              onChange={(e) => r.setGround(Number(e.target.value))}
            />
          </label>
        </>
      ) : null}
      {state.chapter === 3 ? (
        <p className="reel-honest">
          {state.views} views, 1 GPU device, one tile cache holding{" "}
          {(state.tileBytes / (1 << 20)).toFixed(0)} MiB.
        </p>
      ) : null}
      {state.chapter === 4 ? (
        <label>
          Shader
          <select
            value={state.shader}
            onChange={(e) => r.setShader(e.target.value)}
          >
            {state.shaders.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      ) : null}
      {state.poses.length > 1 ? (
        <div className="reel-poses" role="group" aria-label="Viewpoints">
          {state.poses.map((name, i) => (
            <button type="button" key={name} onClick={() => r.pose(i)}>
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
