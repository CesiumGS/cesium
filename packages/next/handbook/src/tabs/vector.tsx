import { C, DataTable, Flow, Page, Section, Written } from "../parts.tsx";

const MEASURED = [
  {
    points: "100,000",
    gpu: "3.7 ms",
    cpu: "1.0 ms",
    rate: "60 fps",
    feed: "0.5 ms for 100,000 at 10 Hz",
  },
  {
    points: "1,000,000",
    gpu: "13.1 ms",
    cpu: "1.5 ms",
    rate: "60 fps",
    feed: "2.3 ms for 250,000 at 10 Hz",
  },
  {
    points: "10,000,000",
    gpu: "60 ms",
    cpu: "3.2 ms",
    rate: "12 to 16 fps",
    feed: "2.4 ms for 250,000 at 10 Hz",
  },
];

export function Vector() {
  return (
    <Page
      title="Vector rendering"
      status="stub"
      lede={
        <>
          So far this means live points: tracks, vehicles and symbols, styled
          and clamped on the GPU. A point isn't a JavaScript object on the hot
          path, which is what lets the count reach millions. Polylines, polygons
          and vector tiles are later work.
        </>
      }
    >
      <Section title="How a point gets drawn">
        <Flow
          label="Point rendering steps"
          steps={[
            {
              title: "Update",
              body: (
                <>
                  A feed writes typed-array slices through{" "}
                  <C>PointSource.update</C>. Decoding can run in a worker.
                </>
              ),
            },
            {
              title: "Style",
              body: (
                <>
                  <C>VectorStyle</C> compiles a style document to shader code,
                  and the linker joins it through a boundary.
                </>
              ),
            },
            {
              title: "Cull and clamp",
              body: "Compute culls points and gives each its ground height from terrain and tilesets, and interpolates in time between feed samples.",
            },
            {
              title: "Draw",
              body: (
                <>
                  Symbols draw as quads, or as compute splats at 6 pixels and
                  below. <C>ModelPool</C> gives a few thousand model slots to
                  the nearest points, so memory follows the slots rather than
                  the points.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Measured">
        <DataTable
          label="Live points, measured"
          columns={[
            { head: "Points", numeric: true, cell: (r) => r.points },
            { head: "GPU per tick", numeric: true, cell: (r) => r.gpu },
            { head: "CPU per tick", numeric: true, cell: (r) => r.cpu },
            { head: "Rate", numeric: true, cell: (r) => r.rate },
            { head: "Feed, CPU per slice", cell: (r) => r.feed },
          ]}
          rows={MEASURED}
        />
        <p>
          In Dyno's full viewer, with terrain, imagery, atmosphere, shadows and
          ambient occlusion, at a 20 km overview, on an NVIDIA RTX laptop GPU.
          Ten million points are bound by their 60 million vertex invocations
          per tick. These predate plan 5a. The <C>tracks</C> suite checks
          correctness in <C>bench/results</C>. On its last Apple M2 run, a clamp
          on hills agreed with ray casts within 5 mm, against a limit of 0.25 m.
          That's agreement between two methods, not accuracy against surveyed
          ground.
        </p>
        <Written
          from="the overall plan, Real-time tracks and section 13.11"
          on="2026-11-08"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>The style language, and how it relates to 3D Tiles styling.</li>
          <li>Labels and decluttering, and picking per point.</li>
          <li>The plan for polylines, polygons and vector tile content.</li>
          <li>A comparison against 1.x entities and billboard collections.</li>
        </ul>
      </Section>
    </Page>
  );
}
