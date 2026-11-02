// Hardware conditions during benchmark runs (plan §16.3): clocks,
// temperatures, power and throttling, sampled while the suite runs, so 1.x
// and 2.0 are compared under the same conditions or the report says they
// were not. Timings are not "corrected" by clock (the relation isn't
// linear); conditions are controlled (cooldown before each run) and
// recorded (per run), and runs under different conditions are flagged.
//
// GPU: nvidia-smi where present (other vendors: unavailable for now).
// CPU: Windows "% Processor Performance" (effective speed relative to
// nominal; above 100 is turbo). No machine names are recorded.
import { execFileSync, spawn } from "node:child_process";
import { platform } from "node:os";
import process from "node:process";

/** nvidia-smi `clocks_event_reasons` bits that mean slowed down. */
const SLOWDOWN = {
  0x4: "software power cap",
  0x8: "hardware slowdown",
  0x20: "software thermal slowdown",
  0x40: "hardware thermal slowdown",
  0x80: "hardware power brake",
};

function tryExec(file, args) {
  try {
    return execFileSync(file, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    }).trim();
  } catch {
    return undefined;
  }
}

/** Static conditions: power source, power plan, GPU driver and clocks. */
export function conditions() {
  const out = {};
  const gpu = tryExec("nvidia-smi", [
    "--query-gpu=driver_version,clocks.max.graphics,clocks.max.memory,power.limit",
    "--format=csv,noheader,nounits",
  ]);
  if (gpu) {
    const [driver, maxGraphics, maxMemory, powerLimit] = gpu
      .split("\n")[0]
      .split(",")
      .map((s) => s.trim());
    Object.assign(out, {
      gpuDriver: driver,
      gpuMaxClockMHz: Number(maxGraphics),
      gpuMaxMemoryClockMHz: Number(maxMemory),
      ...(Number.isFinite(Number(powerLimit))
        ? { gpuPowerLimitW: Number(powerLimit) }
        : {}),
    });
    // The GPU's own thermal limits: its target temperature and how far
    // below the throttle limit slowdown starts (T.Limit offsets, °C).
    const q = tryExec("nvidia-smi", ["-q", "-d", "TEMPERATURE"]) ?? "";
    const field = (name) => {
      const v = Number(q.match(new RegExp(`${name}\\s*:\\s*(-?\\d+)`))?.[1]);
      return Number.isFinite(v) ? v : undefined;
    };
    const target = field("GPU Target Temperature");
    const slowdown = field("GPU Slowdown T.Limit Temp");
    if (target !== undefined) {
      out.gpuTargetTemperatureC = target;
    }
    if (slowdown !== undefined) {
      out.gpuSlowdownTLimitC = slowdown;
    }
  }
  if (platform() === "win32") {
    const plan = tryExec("powercfg", ["/getactivescheme"]);
    out.powerPlan = plan?.match(/\(([^)]+)\)/)?.[1];
    const battery = tryExec("powershell", [
      "-NoProfile",
      "-Command",
      "(Get-CimInstance Win32_Battery | Select-Object -First 1).BatteryStatus",
    ]);
    // Win32_Battery.BatteryStatus 2: on AC power; no battery: a desktop.
    out.power = !battery
      ? "AC (no battery)"
      : battery === "2"
        ? "AC"
        : "battery";
  }
  return out;
}

/**
 * Starts sampling (GPU every 250 ms, CPU every second) until `stop()`.
 * `window(start, end)` summarizes the samples between two Date.now() times.
 */
export function startSampler() {
  const gpu = [];
  const cpu = [];
  const children = [];
  // Thermal headroom (T.Limit: °C below the throttle limit) where the
  // driver reports it; an unknown field would fail the whole query.
  const headroom = /^\s*-?\d+/.test(
    tryExec("nvidia-smi", [
      "--query-gpu=temperature.gpu.tlimit",
      "--format=csv,noheader,nounits",
    ]) ?? "",
  );
  const gpuChild = spawn(
    "nvidia-smi",
    [
      `--query-gpu=clocks.gr,clocks.mem,temperature.gpu,power.draw,utilization.gpu,clocks_event_reasons.active,pstate${headroom ? ",temperature.gpu.tlimit" : ""}`,
      "--format=csv,noheader,nounits",
      "-lms",
      "250",
    ],
    { windowsHide: true },
  );
  gpuChild.on("error", () => {}); // no NVIDIA GPU: GPU telemetry unavailable
  let gpuBuffer = "";
  gpuChild.stdout?.on("data", (chunk) => {
    gpuBuffer += chunk;
    const lines = gpuBuffer.split("\n");
    gpuBuffer = lines.pop();
    for (const line of lines) {
      const [
        clock,
        memory,
        temperature,
        power,
        utilization,
        reasons,
        pstate,
        tlimit,
      ] = line.split(",").map((s) => s.trim());
      if (!clock || Number.isNaN(Number(clock))) {
        continue;
      }
      gpu.push({
        t: Date.now(),
        clock: Number(clock),
        memory: Number(memory),
        temperature: Number(temperature),
        power: Number(power),
        utilization: Number(utilization),
        reasons: parseInt(reasons, 16) || 0,
        pstate,
        ...(tlimit !== undefined && Number.isFinite(Number(tlimit))
          ? { headroom: Number(tlimit) }
          : {}),
      });
    }
  });
  children.push(gpuChild);
  if (platform() === "win32") {
    // Effective CPU speed, and how busy the whole machine is (background
    // work such as indexing or scans shows up here).
    const cpuChild = spawn(
      "typeperf",
      [
        "\\Processor Information(_Total)\\% Processor Performance",
        "\\Processor Information(_Total)\\% Processor Utility",
        "-si",
        "1",
      ],
      { windowsHide: true },
    );
    cpuChild.on("error", () => {});
    let cpuBuffer = "";
    cpuChild.stdout?.on("data", (chunk) => {
      cpuBuffer += chunk;
      const lines = cpuBuffer.split("\n");
      cpuBuffer = lines.pop();
      for (const line of lines) {
        // "time","performance","utility": the header row names the
        // machine; it isn't numeric and is skipped.
        const [, performance, utility] = line
          .split(",")
          .map((v) => Number(v.replace(/"/g, "")));
        if (Number.isFinite(performance)) {
          cpu.push({ t: Date.now(), performance, utility });
        }
      }
    });
    children.push(cpuChild);
  }

  const mean = (list) =>
    list.length ? list.reduce((a, b) => a + b, 0) / list.length : undefined;
  return {
    available: () => ({ gpu: gpu.length > 0, cpu: cpu.length > 0 }),
    /** All samples so far (for the run's timeline). */
    samples: () => ({ gpu, cpu }),
    /** The latest GPU temperature, °C. */
    gpuTemperature: () => gpu.at(-1)?.temperature,
    /** Mean CPU utility over the last `seconds`, % (undefined: no data). */
    cpuUtility(seconds = 3) {
      const recent = cpu.filter((s) => s.t >= Date.now() - seconds * 1000);
      return mean(recent.map((s) => s.utility).filter(Number.isFinite));
    },
    window(start, end) {
      const g = gpu.filter((s) => s.t >= start && s.t <= end);
      const c = cpu.filter((s) => s.t >= start && s.t <= end);
      let reasons = 0;
      let slowed = 0;
      let thermal = 0;
      for (const s of g) {
        reasons |= s.reasons;
        if (Object.keys(SLOWDOWN).some((bit) => s.reasons & Number(bit))) {
          slowed++;
        }
        // Thermal slowdowns (software, hardware) and hardware slowdown:
        // conditions, unlike clocks, which follow the workload.
        if (s.reasons & (0x20 | 0x40 | 0x8)) {
          thermal++;
        }
      }
      return {
        gpuSamples: g.length,
        gpuClockMeanMHz: mean(g.map((s) => s.clock)),
        gpuClockMinMHz: g.length
          ? Math.min(...g.map((s) => s.clock))
          : undefined,
        gpuMemoryClockMeanMHz: mean(g.map((s) => s.memory)),
        gpuTemperatureMaxC: g.length
          ? Math.max(...g.map((s) => s.temperature))
          : undefined,
        gpuTemperatureStartC: g[0]?.temperature,
        /** Least thermal headroom (°C below the throttle limit). */
        gpuHeadroomMinC: g.some((s) => s.headroom !== undefined)
          ? Math.min(
              ...g
                .filter((s) => s.headroom !== undefined)
                .map((s) => s.headroom),
            )
          : undefined,
        gpuPowerMeanW: mean(g.map((s) => s.power)),
        gpuUtilizationMean: mean(g.map((s) => s.utilization)),
        /** Fraction of samples with a power or thermal slowdown reason. */
        gpuSlowedFraction: g.length ? slowed / g.length : undefined,
        gpuThermalFraction: g.length ? thermal / g.length : undefined,
        gpuSlowdownReasons: Object.entries(SLOWDOWN)
          .filter(([bit]) => reasons & Number(bit))
          .map(([, name]) => name),
        cpuSamples: c.length,
        cpuPerformanceMean: mean(c.map((s) => s.performance)),
        cpuPerformanceMin: c.length
          ? Math.min(...c.map((s) => s.performance))
          : undefined,
        cpuUtilityMean: mean(c.map((s) => s.utility).filter(Number.isFinite)),
      };
    },
    stop() {
      for (const child of children) {
        child.kill();
      }
    },
  };
}

/**
 * Waits until the GPU is within `marginC` of its idle temperature (or
 * `maxMs` passes), so each run starts from the same thermal state.
 * Returns the time waited, ms.
 */
export async function cooldown(sampler, idleC, marginC = 3, maxMs = 60000) {
  const start = Date.now();
  if (idleC === undefined) {
    return 0;
  }
  while (Date.now() - start < maxMs) {
    const t = sampler.gpuTemperature();
    if (t !== undefined && t <= idleC + marginC) {
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return Date.now() - start;
}

/**
 * Waits until the machine is quiet (CPU utility under `maxPercent` over
 * the last 3 s) or `maxMs` passes: background work (indexing, scans,
 * updates) starts when a machine sits without input. The CLI sets the
 * limit from the idle level it measured (a development machine is never
 * fully idle). Returns the wait and the utility when the run started.
 */
export async function quiet(sampler, maxPercent = 15, maxMs = 30000) {
  const start = Date.now();
  let utility = sampler.cpuUtility();
  while (Date.now() - start < maxMs) {
    utility = sampler.cpuUtility();
    if (utility === undefined || utility < maxPercent) {
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return { quietMs: Date.now() - start, backgroundCpuUtility: utility };
}

/**
 * Keeps the machine and display awake while the suite runs (Windows:
 * SetThreadExecutionState from a helper process, as video players do; no
 * power settings change). Released when `release()` is called or the
 * runner exits.
 */
export function keepAwake() {
  if (platform() !== "win32") {
    return { held: false, release() {} };
  }
  const script = [
    "Add-Type -Name P -Namespace W -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint f);'",
    // ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED (0x80000003,
    // as an unsigned decimal: PowerShell reads the hex as a negative int).
    "[void][W.P]::SetThreadExecutionState([uint32]2147483651)",
    "while ($true) { Start-Sleep -Seconds 30 }",
  ].join("; ");
  const child = spawn("powershell", ["-NoProfile", "-Command", script], {
    windowsHide: true,
    stdio: "ignore",
  });
  child.on("error", () => {});
  const release = () => child.kill();
  process.once("exit", release);
  return { held: true, release };
}
