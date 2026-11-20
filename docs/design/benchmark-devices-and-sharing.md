# Benchmark devices and sharing (design)

**What this holds:** How Dyno names the device, configuration and state of every run; how results from every machine land in one store that dyno owns; how Trends, charts, alerts and studies become multi-device aware; and the causal model behind it, with transportability (when a result on one hardware class carries to another). It closes with the owner's decisions, the build items and the proposed "Done when" of milestone CS-722. Written for CS-717, 2026-11-19.

**Reads with:** [benchmark-suite.md](benchmark-suite.md) (the environment fingerprint, controlled and recorded conditions), [benchmark-analysis-and-experience.md](benchmark-analysis-and-experience.md) (Detect, Trust, the workspace), [performance-methodology.md](performance-methodology.md), [image-regression-in-dyno.md](image-regression-in-dyno.md) (baselines per renderer class), and the Dyno harness plan (`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, sections 5 and 8). Items: CS-390 (run identity), CS-721 (the `dyno` command), CS-404 (studies), CS-406 and CS-407 (the hub and remote runs), CS-408 (the device lab), CS-323 (dedicated runners), CS-718 (hitld's side).

**Private things by role.** This page is in the public repository. It names devices, accounts and the store by role only ("the owner's main machine", "a device", "the bucket"). Every fingerprint, alias and value below is made up.

## The choices in short

| Question | Choice | Why |
| --- | --- | --- |
| What identifies a run's machine? | Three parts: the **device** (a random ID, an alias and a hardware fingerprint), its **configuration** (software and settings) and its **state** during the run (power, heat, load). | Today one hash mixes all three, so a switch between battery and AC starts a new machine (137 switches on 2026-11-19). |
| What makes two runs comparable? | Same device and configuration family for a Trends series; the same strict configuration, method and power source for reused repetitions; never two devices in one series or one pair. | Version updates become marked changes on one line, not new lines. Pairing stays within a device. |
| Where do results live? | In storage dyno owns: an S3-compatible bucket (owner decision D1), sealed on the client, one immutable object per record, each device writing only its own prefix. | hitld's answer on arobison/human-in-the-lead#363; git history and encryption make a git store grow without bound. |
| What syncs? | Records, summaries and judgments (pins, labels, triage) always; screenshots and traces when opened; inspector recordings only when pinned or shared. | Records are small (about 34 KB compressed); recordings are about 1 GB a week. |
| How do views handle several devices? | A series per device. Cross-device views compare each device's own ratios side by side; nothing is averaged across devices except by the study model, and then it says so. | Absolute timings from two GPUs share no axis; ratios measured within one device do. |
| When does a result carry to another hardware class? | When the change does the same work there (checked on one run), the target class has a measured cost model for that work, and both classes are bound by the same resource. Otherwise the verdict says "can't tell". | The work a change does is hardware-invariant; what that work costs isn't. |

## 1. Identity in three parts

### The device

A device is one computer (or phone) that runs measurements. It has:

- **`id`**: 128 random bits, base32, made once by `dyno device enroll` and kept in `~/.cesium-bench/device.json`, outside the repository. It is never derived from a serial number, a host name or a network address, so it says nothing about the machine and can't be recomputed from it.
- **`alias`**: a short name the owner picks at enrollment (`laptop-a`, `desktop-b`). It's what every view, run ID and study shows. It is fixed once enrolled and never reused, so run IDs stay valid; a display `label` can change freely. `enroll` refuses an alias equal to the host name or the user name.
- **`hardware`**: the fingerprint, read from the OS where it can be (Node's `os` module, `system_profiler`, `nvidia-smi`, WMI) and from the browser's adapter where it can't (phones):

  ```json
  {
    "platform": "examplos-arm64",
    "cpu": "Example 10-core CPU",
    "cores": 10,
    "memoryGiB": 32,
    "gpus": [
      {
        "vendor": "examplevendor",
        "architecture": "gen-3",
        "description": "Example GPU 16-core"
      }
    ],
    "form": "laptop",
    "source": "os"
  }
  ```

  It holds no serial number, GPU UUID, display serial, MAC or IP address, host name or user name. `platform` is the OS family and architecture, not its version.
- **`hardwareKey`**: a hash of `hardware`. Two identical machines share it and stay two devices.
- **`class`**: the hardware class CS-408 uses, `<gpu vendor>-<gpu architecture>-<form>` (`examplevendor-gen-3-laptop`), set at enrollment and editable. It is the stratum for studies and the facet for charts. Image baselines per renderer class ([image-regression-in-dyno.md](image-regression-in-dyno.md)) use the same value.

Each run checks the live fingerprint against the enrolled one. A difference (a memory upgrade, a new GPU) is not silently absorbed: the run records it, Trends marks a hardware change, and `dyno device show` says the device's hardware changed on that date.

**Display** is recorded with the device but keyed with the configuration (below). The item listed it under the device; it moves because a laptop docked to an external monitor is still the same hardware, but its refresh rate and pixel ratio change what a frame costs. That is a configuration change, drawn as one.

### The configuration

What the software and settings were, all recorded per run:

- OS name and version; browser name, version and mode (headed or headless); its flags (`browserArgs`, `uncappedArgs`);
- GPU driver version, the clock lock state and maximum clocks;
- viewport, device scale factor, the display's refresh rate;
- power plan (Windows plan, macOS low-power setting), the driver's "prefer maximum performance";
- `servedFrom` for remote runs (CS-407: "served remotely" is part of a machine's identity);
- tools (Node, Playwright, Vite): recorded only.

Two keys come from it:

- **`configKey`**: a hash of every field except the tools. Baseline reuse matches on it.
- **`seriesKey`**: the same without version numbers (OS, browser and driver versions). A Trends series follows it, and a version change is drawn on the line as an automatic annotation ("browser 142 → 143"), so the change-point detector can attribute a step to it.

The engine build and its settings are not configuration: they are the change under test, keyed by `engineKey` as today. The measuring harness is keyed by `methodKey` as today. The item's "engine build" under configuration reads as the build the run served; it is recorded in the run's lineage (`frozen`, `served`), not in a machine key.

### The state

What the machine was doing, recorded and never part of a key:

- **before the run** (taken during the idle window that already precedes each run): power source (AC, battery or none), battery level, load average (macOS, Linux) or CPU utility (Windows), idle GPU temperature and thermal headroom, macOS thermal pressure, memory pressure, other processes using the GPU where the OS says (`nvidia-smi`; "unknown" elsewhere), the link to a runner (CS-407);
- **during the run**: the existing telemetry timeline (clocks, temperature, power draw, utilization, slowdown reasons).

The two are kept apart because they play different causal roles (section 6): the state before the run is a covariate the design adjusts for; the state during it is partly caused by the change under test and is never adjusted for.

### What makes two runs comparable

| Use | Must match | Recorded, not matched |
| --- | --- | --- |
| Paired comparison (baseline against candidate) | Same run: device, configuration and state window are shared by construction, configurations interleaved | everything |
| One Trends series | `device.id`, `seriesKey`, scene, scenario, engine setup | versions (as change markers), state (as filters) |
| Reused repetitions (`reuse.mjs`) | `device.id`, `configKey`, `methodKey`, `engineKey`, `sceneKey`, the same power source before the run, within the reuse window | the rest of the state |
| A study's stratum | `device.class` (and the device within it) | configuration and state, as covariates and health checks |
| Across devices | never in one series or one pair | each device's own effect, side by side |

Identical hardware on two devices (one `hardwareKey`) stays two series. The class facet groups them when a view wants that.

### How `machineKey` migrates

- `machineKey(environment)` in `bench/suite/reuse.mjs` is replaced by `reuseKey({ device, configuration })`: the device ID and `configKey`. `power` leaves the key and becomes a filter on stored runs (the same power source before the run); `powerPlan`, the driver and clocks move into `configKey`, where they already belong.
- Stored runs keep their old `results.reuse.machine`. They are not rewritten, and reuse doesn't read them: its window is 14 days (`--reuse-days`), so after the change each baseline engine runs all its repetitions once per scene, and reuse resumes. No compatibility shim: the cost is one full baseline per scene, and adding a shim later is cheap.
- **Old runs read** through `legacyIdentity(environment)`: their `environment` already holds the OS, CPU, cores, memory, browser, flags, viewport, driver, power and plan, so configuration and state derive from it. The device comes from enrollment: `dyno device enroll` on a machine whose store has legacy runs claims every legacy run whose CPU, cores, memory and GPU adapter description (the hardware fields old runs hold) match the device's, in one record (`legacy.json`: the device ID and the fields it matched on). No run file changes.
- With power moved to state, the series that split on every battery and AC switch join again.
- Legacy run IDs (`<stamp>`) stay valid. They resolve through the claim; a stamp claimed by two devices is refused at sync and listed for the owner.

### How CS-390's `machine` field takes this shape

CS-390 lands as planned: `machine` is a string, the device's alias, and the run ID ends with it (`<stamp>-<alias>`). One constraint for CS-390: the default alias it derives "from the platform and GPU" must never use the host name. The build item B1 then adds the `device`, `configuration` and `state` objects beside `machine` and keeps writing `environment` unchanged, so every reader of today's files keeps working. `BENCH_MACHINE` becomes the alias `enroll` suggests.

## 2. Storage that dyno owns

### What hitld's answer settles, and what this design changes in it

hitld answered on arobison/human-in-the-lead#363 (2026-11-20): dyno owns benchmark storage, hitld's private store is not changed for it, and hitld keeps references and reads through dyno's commands (CS-721). That answer is taken. Its proposals were checked one by one:

| Proposal on #363 | Here |
| --- | --- |
| Credentials and the bucket address in dyno's configuration and secret store, never in output | Taken (section 2, "Credentials"). |
| Separate read and write keys, per device or role; rotation and removal written down | Taken, with a third role: a maintenance key for deletion, held on one machine. |
| Encrypt confidential results on the client | **Changed:** every object is sealed, whatever its label. Sealing by label would mean re-uploading when a label changes, and a mislabeled result would leak. |
| Say what a content hash covers | **A keyed hash** of the plaintext (below): deduplicates within the store and shows nothing to anyone without the key. |
| A session on another machine reads through a harness secret | Taken, read-only, and off until the owner enables it per environment (decision D2). |
| `result pin`, `unpin`, no silent deletion | Taken; deletion leaves a tombstone. |
| A size budget per namespace (`storage status`) | Taken, with four namespaces. |
| A label on every result, confidential by default, from an open set | Taken; the default is decision D3. |
| hitld's reference: a result ID, the dyno instance, a label, a headline where allowed | Taken. "The dyno instance" is the store's namespace ID (random, below). A headline carries no raw values and may go into hitld's private store for any label, and into a public place only for `public`. |

CS-718 doesn't gate any of this. It stays external, on hitld's side.

### Records and blobs

Two kinds of object, because they differ in size and in how often they are read:

- **Records**: small, structured, always synced. A run's full result (`<id>.json`), its summary, and judgment events (pins, labels, triage, annotations, image approvals). One object per record, written once.
- **Blobs**: large, opaque, fetched when opened. Filmstrip screenshots, FLIP heatmaps, Chrome traces, inspector recordings (PNG frames and CSV rows). Named by content hash; a record lists the blobs it uses, with size and media type.
- **Never stored**: the HTML report (regenerated from the record), anything derived.

### Sizes

Counted on one machine's store, 2026-11-19 (file sizes, not timings):

| What | Size | Note |
| --- | --- | --- |
| Run summary | 6 KB mean over 24 runs; about 9 KB in the item's count | what Dyno's lists read |
| Full run record | 227 KB mean, 841 KB largest, over 24 runs | per-frame series; gzip shrinks 24 records from 5.6 MB to 0.84 MB, so about 34 KB each |
| HTML report | about 25 KB | regenerable; not synced |
| Inspector recordings | 985 MB in a week: 1,106 PNG frames and 118 CSV files | blobs, the dominant cost |

So a run costs the bucket about 40 KB in records. Ten thousand runs are about 400 MB. Blobs are what needs a budget.

### Namespaces and budgets

`dyno storage status` reports use against a budget for each namespace, warns at 80% and refuses new uploads past 100% (runs still record locally and queue):

| Namespace | Holds | Proposed budget | Syncs |
| --- | --- | --- | --- |
| `runs` | run records and summaries | 2 GB | always, after each run |
| `events` | pins, labels, triage, annotations, approvals, device registry, tombstones | 100 MB | always |
| `assets` | bench and image runs' screenshots, heatmaps, traces | 20 GB | uploaded with their run; downloaded when opened |
| `recordings` | inspector recordings | 30 GB | uploaded only when pinned or shared (decision D5); downloaded when opened |

The budgets are part of decision D1's spend, and settings, not code.

### Layout

Remote (in the bucket):

```text
<namespace>/                         a random ID made by `dyno storage init`
  devices/<device id>.json.sealed    the registry: alias, class, hardware, enrolled, removed
  runs/<device id>/<run id>.json.sealed
  runs/<device id>/<run id>.summary.json.sealed
  events/<device id>/<stamp>-<kind>-<random>.json.sealed
  assets/<keyed hash>.sealed
  recordings/<keyed hash>.sealed
  tombstones/<object name>.json.sealed
```

Local (outside the repository, as today):

```text
~/.cesium-bench/
  device.json                 this device: id, alias, class, hardware at enrollment
  results/                    legacy files: read, claimed, never moved or rewritten
  store/runs/<device id>/     this device's runs, and pulled copies of the others'
  store/events/<device id>/
  store/blobs/                content-addressed cache and outbox, with an LRU cap
  store/outbox.json           what is written locally and not yet uploaded
  inspector/                  as today; recordings become blobs when pinned or shared
```

Local copies are plain: the device's disk is trusted as it is today. Only what leaves the device is sealed.

Run IDs begin with an ISO stamp, so a device's prefix lists in time order. A pull asks each device's prefix for keys after the last one it saw (`StartAfter`), so syncing costs one listing per device, not a scan.

### Writing and reading without conflicts

- **Each device writes only its own prefixes** (`runs/<its id>/`, `events/<its id>/`) and the shared blob namespaces, where a name is a hash and two writers of one name write the same content. No object is ever rewritten: the client checks before each write and never overwrites, and device keys hold no delete right (below).
- **Mutable state becomes events.** Triage, annotations, labels, pins and image approvals are today mutable files. Each change becomes an event record from the device that made it; the state is the fold of every device's events, the newer edit winning with the others kept in its history. That is CS-400's merge rule for archives, made continuous.
- **Dyno reads the union**: its loader lists every device's runs from the local store, which holds this device's own and the pulled copies of the others'.
- **Uploads never run during a measurement.** A run's upload waits in the outbox until `dyno status` is `quiet` (CS-721), and a sync in progress pauses when a measurement starts, so a network transfer never shares the machine with a timed run.
- **Pulls** happen on `dyno storage sync`, when Dyno's dev server starts, and every few minutes while it runs and the machine is quiet.

### Sealing and naming

- **Sealed objects**: gzip (records only; PNG and JPEG are stored as they are), then AES-256-GCM with a random 96-bit nonce, from Node's own `crypto`. A short header carries the format version, the key version and the nonce; the header and the object's name are bound as additional data, so an object can't be swapped for another or moved. No new dependency.
- **Blob names: a keyed hash.** The name is HMAC-SHA256 of the plaintext under a naming key held with the content key. Three options were weighed:
  - a plain hash of the plaintext deduplicates, but anyone who can list the bucket can confirm a guessed file is there and see which runs share a file;
  - a hash of the ciphertext shows nothing and deduplicates nothing (each seal has a fresh nonce);
  - **the keyed hash deduplicates within the store and shows nothing without the key.** After opening a blob, the reader recomputes the HMAC, so integrity doesn't rest on the provider.
- **What the provider sees**: object names (random IDs, run IDs with their stamp and alias, hashes), sizes and times. Not contents, labels, values, fingerprints or configurations.

### Before the bucket exists, and moving over

The layout above is also the local-only mode: a store with no remote configured is complete, and everything works as today on one machine. CS-400's archives (planned, not in this milestone) become a copy of the same objects to a file, for offline moves. When a remote is first configured, `dyno storage sync` uploads everything in the outbox, legacy runs included (as records under the claiming device's prefix, their original bytes inside), and from then on keeps up. Nothing waits on CS-718 or on hitld's data area (HITLD-622).

### Retention and pinning

CS-404's rule holds and extends to the bucket: keep bench and image runs; prune test runs and recordings by count; never drop a run that is pinned or that a study cites.

- **Records are kept.** At about 40 KB a run, the `runs` budget lasts tens of thousands of runs. Pruning records is out of scope for this milestone.
- **Blobs of runs nobody pins or cites** become candidates for deletion 180 days after their run (a setting). Deletion is never automatic: `dyno storage prune` lists what it would delete and why, deletes only with `--apply`, runs only where the maintenance key is (the owner's main machine), and writes a tombstone per object (what, when, why, by which command). Dyno shows a pruned screenshot as "removed on (date): (reason)", never as missing.
- **Pins**: `dyno result pin <id> --reason <reference>` (a study ID, a `CS-<n>` decision, a hitld reference) writes a pin event; `unpin` writes another. A run's pins are visible on every device after the next sync. A verdict pins the runs it cites (the harness plan). hitld calls `result pin` when a study or decision it tracks cites a result, because only hitld knows those citations.
- **Cited by a study**: CS-404's clean-up reads study files on every local branch. Branches on other machines are invisible to it, which is why pins exist and why `prune` refuses to run on a machine whose store is behind (its last pull older than a day).

### Classification

- Every run record carries `classification`, a string from an open set, set at the run from the store's default (decision D3) or `--classification`. Changing it later is a label event, never an edit.
- The initial set: `confidential` (the default: values never leave the private store or the owner's devices, and no raw value is printed to a caller that didn't ask with `--values`), `internal` (may be shared inside the organization), `public` (may appear in the repository or the handbook, after the owner's agreement). hitld's taxonomy, which separates who may read from where data may go, maps onto these through a table in dyno's settings when it lands.
- `dyno result show` prints the headline, verdict and label; values only with `--values`. `dyno result fetch` refuses a blob whose label forbids the destination (a path inside a git working tree for `confidential`).
- Labels don't change sealing: everything in the bucket is sealed.

### Credentials and the trust boundary

The boundary: the owner's enrolled devices hold the keys and see everything; the provider holds sealed objects and sees names and sizes; a cloud or remote session holds a read-only key only where the owner enables it (decision D2). The threat model is one owner and a few devices; the design guards against a provider breach or a public bucket (sealing), a lost or retired device (per-device keys, rotation), and a key reaching a log or a repository (no output path ever carries one). It does not guard against a compromised enrolled device that is still trusted.

- **Roles and keys at the provider**:
  - **writer**, one per device: put objects under that device's prefixes and the blob namespaces; no delete, no overwrite where the provider can refuse one, scoped to its prefix where the provider supports prefix-scoped keys (a D1 criterion);
  - **reader**, one per device: get and list the namespace;
  - **maintenance**, one only, on the owner's main machine: list and delete, for `storage prune`;
  - **remote reader**, one per enabled environment: get and list, nothing else.
- **The content keyring**: the content key and the naming key, each versioned. Every enrolled device holds every version; a remote reader holds them only if enabled.
- **Where they live**: the OS keychain (macOS `security`; Windows DPAPI-protected file under the user profile; Linux `secret-tool`). `~/.config/dyno/storage.json` holds the namespace ID and which keychain items to use, nothing secret. Environment variables (`DYNO_STORE_*`) override, for harness secrets. Secrets are read from the keychain, the environment or standard input, never from arguments (which other processes can see).
- **Never in output**: no command prints a key, the endpoint or the bucket's name; output says "the bucket" and the namespace ID. The logger redacts every loaded secret value, and the tests plant canary secrets and grep every output, log and written file for them.
- **Joining a device**: `dyno storage join` reads the keyring from a file the owner carries through their password manager (`--key-file`, then offers to delete it) and the device's own provider keys from standard input, then enrolls the device in the registry.
- **Rotating**: provider keys are replaced at the provider, set with `dyno storage credentials set --role <role>` (standard input), checked with `storage status`, and the old ones revoked at the provider. `dyno storage rotate-key` makes a new content and naming key version for all new writes; old objects keep theirs and stay readable.
- **Removing a device**: `dyno device remove <alias>` prints the checklist and does its part: (1) the owner revokes the device's writer and reader keys at the provider (dyno holds no admin key, by design); (2) dyno writes a removal event to the registry and rotates the content key; (3) readers ignore and flag anything under the removed device's prefix stamped after its removal. Its past runs stay valid.
- **Reading from another machine or a cloud session**: it needs a checkout with `npm ci` (for `npx dyno`) and the harness's secrets: the endpoint, bucket and namespace, a remote reader's key, and the keyring. It can list, show and fetch; it can't write, pin or delete, and it never measures. `result show` without `--values` is what such sessions use. The CS-721 skill says so.

## 3. Multi-device views

- **Trends.** A series is one device and configuration family (`device.id`, `seriesKey`) for one scene, scenario and setup. The sidebar gains a device picker, defaulting to the device Dyno runs on, or the store's "home device" setting. Version changes and hardware changes are drawn as annotations on the line. Runs whose state before the run fails the timing health bar (on battery, load above the limit) are hidden by default, as invalid runs are, with a toggle.
- **Facets and filters** everywhere a chart takes them (Trends, Compare, Scenes, the run list): device, hardware class, and configuration fields (OS family, browser, flags, power plan). Split by device gives small multiples with one y-axis each for absolute values; a ratio view shares one axis, since ratios are dimensionless.
- **Baselines, control bands and alerts are per series.** Change points (E-Divisive means) and control bands run per device and configuration family. An alert's key includes the device. Alerts on one commit range across devices group into one summary, as alerts across scenes do today: "settle time +8% on 2 of 3 devices (laptop-a, desktop-b; not on laptop-c)".
- **Normalization across hardware classes is by ratio within a device, never by scaling.** The cross-device quantity is each device's own candidate-over-baseline ratio, measured within one run. Absolute timings are never scaled by clocks or a device "score" ([benchmark-suite.md](benchmark-suite.md) already refuses clock scaling: the relation isn't linear). For drift, a series can be indexed to its own value at a reference commit.
- **Overview when devices disagree.** It shows the home device's verdict first and a line per other device with a recent comparison. When they agree, one sentence: "1.3× faster on all 3 devices (×1.2 to ×1.4)". When they don't, it says so and never averages: "Mixed: faster on laptop-a and desktop-b, slower on laptop-c". A pooled figure appears only from a study's hierarchical model, labeled with the devices it pools.
- **Compare** already warns when machines differ; it now refuses a timing verdict between two devices and offers each device's own comparison instead.
- **Machines becomes Devices**: alias, class, enrolled, last run, last sync, configuration in use, budget share, and whether it's removed.
- **Privacy in views**: the alias and class are shown; the fingerprint only on the device's own page, and only in Dyno (which runs on the owner's devices).

## 4. Experiments across devices

CS-404 already makes the device a stratum and asks each verdict to name the hardware it holds for. This design fills in how:

- **Pairing stays within a device.** Baseline and candidate are paired by device and scene and interleaved in one run; a study's unit of analysis stays the run.
- **Noise floors are per hardware class.** An instrument's A/A calibration is taken per class, since one GPU's spread says nothing of another's. A sample plan's power analysis uses the noise floor of each class the study names. This changes CS-404's instrument catalog from one noise floor per instrument to one per instrument and class.
- **The health bar reads the state before the run**, never the state during it (section 6, why). It also compares exclusion rates between arms: if one arm loses far more runs to the health bar than the other, the study warns, because the exclusions may be caused by the change.
- **Pooling.** Each device's effect is a log ratio with its interval. The hierarchical model pools devices within a class and classes within the study, estimates the spread between them, and flags any device or class whose effect sits apart.
- **A verdict names its scope**, per class: `measured` (supported, refuted or inconclusive on runs from that class), `carried` (predicted from another class under the conditions of section 6, with the assumptions listed), or `can't tell` (with the condition that failed). A class with no runs is never covered by pooling alone: the model's spread describes the classes measured, not the ones that weren't.

## 5. Privacy

- Fingerprints, configurations and run data live in the local store and the sealed bucket. They never go in the repository, the handbook, a public pull request or an issue.
- The repository gets summaries by hardware class only, and only from results labeled `public`. The handbook's figures already come from `bench/results` (ignored by git); the handbook build gains a check that refuses a device ID, a `hardware` object or a configuration in what it embeds.
- The alias is what's shown, and it's the owner's choice of a role-like name; `enroll` refuses the host or user name.
- Studies hold no machine details and cite runs by ID, which carries only the alias (the harness plan).

## 6. The causal piece

### What moves a measurement

```text
  order O ─────┐                        change under test T
  background U ┤                        (engine build, settings)
               ▼                                 │
  S0 state before the run                        ▼
  (power source, idle temperature,      K work done
   load, other GPU users)               (draws, dispatches, bytes, tiles, allocations)
               │                                 │
               ▼                                 │
  S1 state during the run ◄──────────────────────┤
  (clocks, temperature, power draw)              │
               │                                 │
               └───────────► Y measurement ◄─────┘
                             (frame time, CPU and GPU per frame, settle time)
                               ▲
                               ┆ modifies what work costs
                               ┆
  device D (class H) and configuration C ──► S0, S1 and K
```

Solid arrows are causes; the dotted one is effect modification: the device changes how much a given amount of work costs, not whether the change is made. The table lists every edge, including the two the drawing leaves out for legibility (S0 → Y, and the configuration's direct effect on Y).

The edges, in words:

| From | To | Meaning |
| --- | --- | --- |
| T | K | The change alters the work done: draws, dispatches, bytes, tiles, allocations. |
| K | Y | Work costs time. |
| K | S1 | Work heats the GPU and moves its clocks: the engine's own load sets part of the state during the run. |
| S1 | Y | Clocks and thermal slowdowns change what the same work costs. |
| D, C | S0, S1 | A laptop and a desktop sit and heat differently; the power plan sets clocks. |
| C | K | Viewport, pixel ratio and the limits tier change the work itself. |
| D | Y, on the K → Y edge | The device converts work to time: the same work costs different time on different hardware. This is effect modification, not confounding. |
| O, U | S0 | Time of day, the order of runs, and other work on the machine change the starting state. |
| S0 | S1, Y | A warm or busy machine measures slower. |

### What the design blocks, records and stratifies

| Factor | Role | Treatment |
| --- | --- | --- |
| Order and drift O | would confound T if one arm always ran later | **Blocked**: configurations interleaved and alternated within a run; cooldown to within 3 °C of idle before each run. |
| Device D and configuration C | would confound T if arms ran on different machines | **Blocked** for a comparison: both arms on one device in one run. **Stratified** across devices: a series, a noise floor and an effect per device and class. |
| Method (the harness) | would confound if it changed between arms | **Blocked**: one frozen tree serves both arms; `methodKey` recorded; runs from devices on different methods are flagged in cross-device views. |
| Workload (scene, data) | would confound if it differed | **Blocked**: `sceneKey`, verified datasets. |
| Background work U and state before the run S0 | noise, and confounding if it differs by arm | **Gated and recorded**: the quiet rule (and CS-721's self-gating) before each run; S0 recorded; used as a covariate (CUPED-style adjustment where it demonstrably narrows intervals, both reported) and in the health bar. |
| State during the run S1 | **a mediator**: partly caused by T through K | **Recorded only, never adjusted for.** Adjusting for it would remove part of the real effect (a change that does more work heats the GPU more, and that heat is part of its cost). Throttling during a run makes it valid with a warning, as today; it never rescales a timing. This is why [benchmark-suite.md](benchmark-suite.md) shows GPU clocks and power but doesn't compare them. |
| Validity filter (the health bar) | **a selection**: conditioning on it can bias if T affects it | Based on S0 only; exclusion rates compared between arms (section 4). |
| Hardware class H | **an effect modifier** | The effect is estimated per class; pooled only by the hierarchical model; carried to another class only as below. |

### Transportability: when a result carries to another hardware class

A result measured on class A carries to class B when the mechanism differs between them only in ways that can be measured on B. In the diagram, what differs between classes is how work becomes time (the D × K edge) and how the machine heats and clocks (D → S). The work itself (K) is set by T and C, not by the hardware. So a timing result carries from A to B when three things hold, and each is checked on B:

1. **Same work.** The change alters K on B as it did on A. Checked with one run on B: the work counters (draws, dispatches, bytes, tiles, allocations) match A's within their own run-to-run spread. They differ when B takes another path: another limits tier, a missing feature, a fallback (indirect draws on one vendor, for example).
2. **A cost model for that work on B.** B's class has calibration runs that vary the relevant work (a draw-count sweep, a byte-rate sweep) and measure what it costs there, with its noise floor. Without them, B's response to a change in K is unknown.
3. **The same bottleneck.** A and B are bound by the same resource for this scene: GPU time, main-thread time or vsync, read from their A/A runs. A change that saves GPU work helps nothing on a device bound by its main thread.

When all three hold, the verdict on B is `carried`: a predicted effect from A's change in work and B's cost model, with the interval that both contribute, and the three checks it rests on. When one fails, B's verdict is `can't tell`, naming the failed check and what to measure ("run the study's scenes on B" or "calibrate draw cost on B"). Counter-only results (bytes, draws, allocations) carry when check 1 holds alone.

The rule for verdicts: a timing claim is `measured` only on the classes that ran; `carried` only through the three checks; `can't tell` everywhere else. "Can't tell" is an honest answer.

### What gets recorded so this works

- The work counters in every run's record, per scene (most exist: requests, bytes, draws, tiles; the development metrics of CS-394 add more).
- The bottleneck per scene and device, from GPU time against CPU time against frame time.
- Calibration runs per class, as studies of kind `calibration` (CS-687), cited by the verdicts that carry.

## 7. Where this changes other designs

- **The harness plan, question 5** ("no results repository for now; the laptop lends a browser endpoint"): superseded for storage by a bucket dyno owns, once the owner answers D1. Remote runs (CS-407) still drive from one machine, which keeps one copy of the method; local runs on each device now share through the store, with `methodKey` differences flagged.
- **CS-404**: noise floors per instrument and hardware class; the health bar on the state before the run; exclusion rates compared between arms; verdict scope per class (`measured`, `carried`, `can't tell`).
- **CS-400**: archives become a file copy of the same objects; not needed for sharing once a remote exists.
- **CS-407**: its `reuse.mjs` change ("the machine key") is `reuseKey` with `servedFrom` in the configuration.
- **CS-408**: hardware classes are `<gpu vendor>-<gpu architecture>-<form>`; device aliases come from enrollment.
- **[benchmark-analysis-and-experience.md](benchmark-analysis-and-experience.md), "Hardware scaling (normalized by hardware class)"**: normalization is each device's own ratio, side by side, never a scaling factor.
- **[benchmark-suite.md](benchmark-suite.md), "Privacy of results"**: unchanged in principle, made concrete by section 5.

### Rejected

- **A data area in hitld's private store** (the item's first idea): hitld declined it for now (HITLD-623), and a git store grows without bound with sealed files.
- **Records in a private git repository, blobs in a bucket**: two backends, two credential systems, and git history that never shrinks, for no gain over immutable objects in one bucket.
- **Plain hashes for blob names**: they let anyone who lists the bucket confirm a guessed file.
- **Sealing only confidential results**: relabeling would re-upload, and a mislabeled result would leak.
- **One shared key for every device**: removing a device would mean replacing every device's key at once.
- **Normalizing timings across devices by clocks or a score**: the relation isn't linear, and it hides the regime change that section 6 checks for.
- **Display in the device fingerprint**: docking a laptop would make it a new device.

## 8. Owner decisions

Each is a decision item for the chief of staff to file (`decider: owner`). Build items that depend on one name it in `needs`.

### D1. Where does dyno store shared results, and what may it spend?

- **A. A hosted S3-compatible bucket** (recommended). The owner opens one account and one private bucket at a provider whose keys can be limited to a bucket and a name prefix, with write keys that can't delete. Everything in section 2 works as designed, from every device and from enabled remote sessions. **Cost**: at the budgets above (about 50 GB in all), storage list prices the author last saw ran from about 0.6 to 2.3 US cents per GB-month, so under about a dollar a month, and outbound transfer is free at some providers and about 9 cents per GB at others; to be confirmed on the provider's page before choosing. A provider with free or cheap egress suits fetch-on-open. One more account, and a new trust boundary (the provider holds sealed objects).
- **B. A self-hosted S3-compatible server** on a machine the owner runs. No spend and no third party, but the owner keeps it up and backed up, and remote or cloud sessions need it reachable from outside, which widens the boundary in another way.
- **C. Device-held blobs fetched through the hub** (CS-406). No spend; a blob is available only while the device that made it is on and on the same network; cloud sessions can't reach it; it pulls CS-406 (in CS-481) into alpha. Records still need somewhere shared, so this is only half an answer.
- **D. Git LFS on the hosted git service.** Free up to 10 GiB of storage and of bandwidth; but LFS objects can't be deleted without deleting the repository, so retention and budgets don't work, and every fetch counts against bandwidth.

**Recommendation: A**, with the budgets of section 2 as the spend appetite. **Door: two-way**: the layout is backend-neutral, so moving to B later is a copy; the account and spend are easy to stop.

### D2. Who holds keys, and may remote and cloud sessions read?

- **A. Per-device writer and reader keys, one maintenance key on the owner's main machine, client-side sealing; remote and cloud reading built but off, enabled per environment by the owner with a read-only key** (recommended). Revoking one device or one environment touches nothing else.
- **B. As A, with cloud sessions enabled by default.** Agents in the cloud can check results without asking; the keyring then sits in every enabled environment's secrets.
- **C. One shared key pair for every device.** Simplest to set up; removing a device means rotating every device's keys at once, and any device can delete.
- **D. No client-side sealing; rely on the bucket's access policy.** No key distribution; a misconfigured bucket exposes every result in the clear.

**Recommendation: A.** **Door: the mechanism is two-way** (keys rotate, environments enable and disable); **a leak is one-way**: a confidential result that reaches a cloud environment or a public bucket can't be recalled.

### D3. What classification does a result get by default?

- **A. `confidential` by default, from an open set (`confidential`, `internal`, `public`)** (recommended). Matches hitld's proposal and [benchmark-suite.md](benchmark-suite.md)'s rule that results stay internal until publishing is cleared. Sharing anything takes a deliberate relabel.
- **B. `internal` by default.** Fewer relabels when sharing inside the organization; a result shared too widely by default can't be recalled.
- **C. No labels yet.** Less to build now; hitld's references need a label, and adding one to every stored result later is a migration.

**Recommendation: A.** **Door: two-way** for the default (a setting) and for labels (events); **one-way** for anything already published.

### D4. How does dyno talk to the bucket?

- **A. A small hand-written client on Node's `fetch` and `crypto`** (AWS Signature Version 4, put, get, head, list, delete) (recommended). No new dependency; tested against the signature examples the S3 documentation publishes and an in-process fake server.
- **B. A small pinned dependency for request signing.** Less code to own; a new dependency to review and keep pinned.
- **C. The provider's full SDK.** Most complete; a large dependency tree for five calls.

**Recommendation: A.** **Door: two-way.**

### D5. Do inspector recordings upload?

- **A. Only when pinned or shared** (recommended). A recording stays on its device unless a study, an issue or the owner needs it elsewhere. Spend stays near the `assets` budget.
- **B. All, pruned after 180 days.** Every recording available everywhere; at about 1 GB a week that is about 26 GB held at a time, and the most spend.
- **C. Never.** No spend; a recording a study cites is unreadable from another device.

**Recommendation: A.** **Door: two-way.**

### D6. Do the study-side items join alpha.1?

Releases need whole milestones. The build items B7 and B8 (studies across devices, and transport) need CS-404, which is in CS-480. Nothing else here needs CS-404, CS-406 or CS-407.

- **A. Keep B7 and B8 out of alpha.1** (recommended): they join CS-480 with CS-404. Alpha.1's studies clause is limited to Compare refusing cross-device timing verdicts and Trends keeping devices apart.
- **B. Move CS-404 (and B7, B8) into alpha.1.** Alpha.1 gets device-aware verdicts and transport, and carries CS-404's whole scope, with CS-687 already answered.

**Recommendation: A.** **Door: two-way** (milestone membership).

## 9. Build items

For milestone CS-722 unless marked. Touches are from the repository root. Every item's tests use temporary stores and an in-process fake bucket; none needs the real bucket except where its "Done when" says the owner checks once.

### B1. Each run records its device, configuration and state

- **Kind**: work. **Size**: medium.
- **Done when**:
  - A run records `device` (id, alias, hardware, hardware key, class), `configuration` (fields, `configKey`, `seriesKey`) and `state` (before the run, and the timeline) beside CS-390's `machine`; `dyno device enroll`, `show` and `list` work, and `enroll` refuses the host or user name as an alias (tested).
  - On fixture environments, switching the power source changes only `state`: the device, `configKey` and `seriesKey` stay the same, and reuse matches on `reuseKey` with the same power source (tested).
  - A denylist test over every identity field finds no host name, user name, serial, GPU UUID, MAC or IP address.
  - An existing store loads in Dyno unchanged; after `enroll`, its legacy runs read under the device, and no file changes (tested on a fixture store).
- **Needs**: CS-390, CS-721.
- **Touches**: `packages/next/bench/suite/identity.mjs`, `packages/next/bench/suite/telemetry.mjs`, `packages/next/bench/suite/reuse.mjs`, `packages/next/bench/suite/commands/device.mjs`, `packages/next/bench/suite/cli.mjs`, `packages/next/bench/suite/report.mjs`, `packages/next/bench/suite/data.ts`, `packages/next/bench/suite/schema.ts`, `packages/next/bench/run.mjs`, `packages/next/scripts/setup.mjs`, `packages/next/test/bench*.test.ts`.

### B2. A sealed, content-addressed store layout, local first

- **Kind**: work. **Size**: medium.
- **Done when**:
  - New runs write records under `store/runs/<device id>/` and blobs by keyed hash; Dyno reads the union of legacy files and the new layout.
  - Sealing round-trips; a changed byte, a swapped name or a wrong key version is refused; a blob's HMAC is checked after opening (tested).
  - Judgments (pins, labels, triage, annotations, approvals) are events; two devices' events on one alert fold to the newer with the other in its history (tested).
  - With no remote configured, everything works as today.
- **Needs**: B1, CS-721.
- **Touches**: `packages/next/bench/suite/storage/**`, `packages/next/bench/suite/commands/storage.mjs`, `packages/next/bench/suite/cli.mjs`, `packages/next/bench/suite/data.ts`, `packages/next/bench/suite/images.mjs`, `packages/next/bench/suite/report.mjs`, `packages/next/test/bench*.test.ts`.

### B3. Sync with the bucket, with keys per device and role

- **Kind**: work. **Size**: large.
- **Done when**:
  - Runs made on two temporary devices appear in each other's Dyno after `dyno storage sync`, and a screenshot downloads when opened (tested against the fake bucket; the owner checks once with two real devices).
  - No object is ever overwritten; uploads wait while `dyno status` isn't `quiet` (tested).
  - Canary secrets planted in the keychain and environment appear in no output, log, result or written file (tested); no command takes a secret as an argument.
  - `storage join`, `credentials set`, `rotate-key` and `device remove` behave as section 2 says; after removal, an object stamped later under the removed prefix is ignored and flagged (tested); a remote reader can list, show and fetch, and can't write, pin or delete.
- **Needs**: B2, D1, D2, D4.
- **Touches**: `packages/next/bench/suite/storage/**`, `packages/next/bench/suite/commands/storage.mjs`, `packages/next/bench/suite/commands/device.mjs`, `packages/next/bench/suite/commands/result.mjs`, `packages/next/test/bench*.test.ts`, the CS-721 skill (`packages/next/.claude/skills/measuring-with-dyno/SKILL.md`).

### B4. Retention, pins and the size budget

- **Kind**: work. **Size**: medium.
- **Done when**:
  - `dyno result pin <id> --reason <reference>` and `unpin` write events that every device sees after a sync (tested).
  - `dyno storage status` reports use against budget per namespace, warns at 80% and stops uploads past 100% while runs still record locally (tested).
  - `dyno storage prune` lists and deletes only with `--apply`, never touches a pinned or cited run, refuses on a stale store, and writes a tombstone per object; Dyno shows a pruned blob as removed with its reason (tested).
- **Needs**: B2, CS-721. (Studies' citations come from CS-404's clean-up when it lands; pins cover them until then.)
- **Touches**: `packages/next/bench/suite/storage/**`, `packages/next/bench/suite/commands/storage.mjs`, `packages/next/bench/suite/commands/result.mjs`, `packages/next/bench/suite/views/Report.tsx`, `packages/next/bench/suite/views/Images.tsx`, `packages/next/test/bench*.test.ts`.

### B5. A classification label on every result

- **Kind**: work. **Size**: small.
- **Done when**:
  - Every new run records `classification` from the store's default or `--classification`; legacy runs read with the default (tested).
  - `dyno result show` prints no raw values without `--values`; `result fetch` refuses a `confidential` blob into a git working tree (tested).
  - A relabel is an event, and the run's file doesn't change.
- **Needs**: B2, D3, CS-721.
- **Touches**: `packages/next/bench/suite/storage/**`, `packages/next/bench/suite/commands/result.mjs`, `packages/next/bench/suite/cli.mjs`, `packages/next/bench/suite/schema.ts`, `packages/next/test/bench*.test.ts`.

### B6. Trends, charts, baselines and alerts take devices

- **Kind**: work. **Size**: large.
- **Done when**:
  - On a fixture store holding three devices, Trends draws one series per device and configuration family, marks version and hardware changes, and hides runs failing the timing health bar by default.
  - Trends, Compare, Scenes and the run list filter and facet by device, hardware class and configuration fields; Compare refuses a timing verdict between two devices.
  - Control bands, change points and alerts run per series; one commit range moving two devices groups into one alert naming both (tested).
  - Overview says "on all N devices" or "Mixed: …" and never averages; Machines becomes Devices. The handbook build refuses a device ID, hardware object or configuration in what it embeds (tested). Owner review by clicking around.
- **Needs**: B1, B2.
- **Touches**: `packages/next/bench/suite/data.ts`, `packages/next/bench/suite/views/trendsModel.ts`, `packages/next/bench/suite/views/Trends.tsx`, `packages/next/bench/suite/views/Compare.tsx`, `packages/next/bench/suite/views/Scenes.tsx`, `packages/next/bench/suite/views/Runs.tsx`, `packages/next/bench/suite/views/Alerts.tsx`, `packages/next/bench/suite/views/Overview.tsx`, `packages/next/bench/suite/views/Machines.tsx`, `packages/next/bench/suite/changepoints.mjs`, `packages/next/bench/suite/annotations.json`, `packages/next/bench/suite/DESIGN.md`, `packages/next/handbook/vite.config.ts`, `packages/next/test/bench*.test.ts`.

### B7. Studies across devices (CS-480, not alpha.1, per D6)

- **Kind**: work. **Size**: large.
- **Done when**:
  - An instrument's noise floor is stored per hardware class, and the power analysis uses the class's own.
  - The health bar reads the state before the run; a study whose arms lose runs to it at clearly different rates warns (tested on a fixture).
  - The hierarchical model pools devices within classes and recovers a planted one-device difference on a fixture; each verdict lists per class `measured`, `carried` or `can't tell`, and a class without runs is never `measured`.
- **Needs**: CS-404, B1, B6.
- **Touches**: `packages/next/bench/suite/studies.mjs`, `packages/next/bench/suite/commands/studies.mjs`, `packages/next/bench/suite/schema.ts`, `packages/next/work/studies/README.md`, `packages/next/test/bench*.test.ts`.

### B8. A verdict says where it carries (CS-480, not alpha.1, per D6)

- **Kind**: work. **Size**: medium.
- **Done when**:
  - Each run records its work counters and its bottleneck per scene.
  - A verdict on class A is `carried` to class B only when B's counters match within their spread, B has a calibration study for that work, and both have one bottleneck; otherwise `can't tell`, naming the failed check and what to measure (tested on three fixtures, one per failed check, and one that carries).
- **Needs**: B7, CS-394.
- **Touches**: `packages/next/bench/suite/studies.mjs`, `packages/next/bench/suite/report.mjs`, `packages/next/bench/suite/schema.ts`, `packages/next/test/bench*.test.ts`.

## 10. Proposed "Done when" for CS-722

Each clause is checkable; the item that meets it is in brackets.

- **c1** [CS-390]: a dev run from a worktree records purpose, item, study, worktree, base, machine, servedFrom and id; `--purpose baseline` is refused from a dirty tree or a feature branch; two runs started together run one after the other.
- **c2** [CS-721]: `npx dyno` covers what `cli.mjs` and `bench/run.mjs` do, every command prints JSON with `api_version` under `--json`, `dyno status --json` reports `busy`, `waiting-for-quiet` or `quiet`, and the old entry points still work.
- **c3** [B1]: a run on any device records its device, configuration and state; a power-source switch changes neither the device nor its Trends series (tested); no identity field holds a host name, user name, serial or network address (tested).
- **c4** [B2, B3]: runs made on two devices appear in each other's Dyno after one sync, with screenshots fetched when opened; no object is ever rewritten; uploads never run during a measurement (tested; the owner checks once on two real devices).
- **c5** [B3]: no credential, endpoint or bucket name appears in any output, log, result or repository file (canary test); a removed device's later objects are ignored, and its keys are revoked by the checklist.
- **c6** [B4, B5]: every result carries a label, `confidential` by default; `storage status` reports use against budget per namespace; nothing is deleted without `--apply`, nothing pinned is deleted, and every deletion leaves a tombstone.
- **c7** [B6]: Trends, Compare, Alerts and Overview keep devices apart and facet by device and hardware class; Overview names the devices when they disagree; Compare refuses a timing verdict across devices.
- **Independent check**: a fresh reviewer reads this design against the filed items and the milestone's clauses; the owner makes a baseline run on two devices, syncs, and reads both in Trends and Overview by clicking around.
