# RTX baselines

The place for baseline runs of the scene catalog, from the RTX machine. The
Benchmarks tab lists each `*.json` here by name, date and note, and shows the
engine suites' latest results from `bench/results` beside them.

On the RTX machine:

```sh
node bench/run.mjs baseline alloc hitch instances lod selection
node bench/suite/cli.mjs run --tier full --note "RTX baseline"
```

Copy the catalog run's results file here, then run `npm run handbook`.

The first baseline should also settle what the tab summarizes from these files
(per-scene verdicts, say), because their schema (`bench/suite/schema.ts`) is
richer than a list of names. Commit only files with no private content: the
catalog can hold private scenes, whose names and manifests stay out of this
repository.
