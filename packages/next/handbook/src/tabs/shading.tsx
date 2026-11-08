import { data, size } from "../data.ts";
import {
  C,
  DataTable,
  Flow,
  Generated,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const FRONT_ENDS = [
  { source: "WGSL custom shader", when: "As written", how: "Links directly" },
  {
    source: "Slang custom shader, build time",
    when: "npm run slang (recommended)",
    how: "Native slangc to WGSL",
  },
  {
    source: "Slang custom shader, run time",
    when: "CustomShader.fromSlang",
    how: "The WebAssembly compiler in a worker, cached",
  },
  {
    source: "A style",
    when: "When the style compiles",
    how: "Its expression compiler writes the helpers",
  },
];

export function Shading() {
  const compiler = data.runtime
    .flatMap((g) => g.files)
    .find((f) => f.name === "slang-wasm.wasm");
  return (
    <Page
      title="Shading and linker"
      status="sketch"
      lede={
        <>
          Slang is the one source of engine shaders, and WGSL is generated from
          it. User shaders join through a linker against a named boundary, so a
          mismatch is a diagnostic that names the unit and line, not a string
          that happened to concatenate.
        </>
      }
    >
      <Section title="Why one source">
        <p>
          The engine's shaders grew as hand-written WGSL: 26 files and about
          7,800 lines, with one file at 1,451. A Slang port made early on became
          a second copy nobody kept in sync, and it eventually rendered garbage.
          Two copies of a shader drift. The fix was one source, not a
          better-kept copy.
        </p>
        <p>
          The repository now has {data.counts.slangFiles} Slang modules,
          compiled by <C>npm run shaders</C>. <C>npm run shaders:check</C> fails
          if the generated WGSL is out of date.
        </p>
      </Section>

      <Section title="From source to pipeline">
        <Flow
          label="Shader compilation and linking"
          steps={[
            {
              title: "Compile",
              body: (
                <>
                  <C>slangc</C> turns <C>src/**/*.slang</C> into WGSL and
                  reflection JSON, checked in under <C>generated/</C>.
                </>
              ),
            },
            {
              title: "Make units",
              body: "A unit is WGSL with a name and a symbol table: what it defines, what it uses. Front ends make more units at run time.",
            },
            {
              title: "Link across a boundary",
              body: "A boundary names what one side exports and what the other must define, with signatures. Each required symbol is defined exactly once.",
            },
            {
              title: "Make the pipeline",
              body: "Pipelines come from links and are cached by the linked code, compiled asynchronously. A draw whose pipeline isn't ready is skipped, not stalled.",
            },
          ]}
        />
        <p>
          Compiler errors map back to a unit and its own line. Today's linker
          joins checked units in order. Others can sit behind the same
          interface: Slang module linking, WESL-style imports, or WGSL linking
          if the language gets it.
        </p>
      </Section>

      <Section title="Front ends">
        <DataTable
          label="Shader front ends"
          columns={[
            { head: "Source", cell: (r) => r.source },
            { head: "When", cell: (r) => r.when },
            { head: "How", cell: (r) => r.how },
          ]}
          rows={FRONT_ENDS}
        />
        <p>
          Run-time Slang is optional because of its weight: the compiler's
          WebAssembly is {size(compiler?.kb)}, and it loads only when something
          asks for it. A compile that fails leaves the draws on the engine's
          shader and reports the error with its line.
        </p>
        <Generated from="the setup store on the machine that built this page" />
      </Section>

      <Section title="The user contract">
        <p>
          The contract is specified at the WGSL level: struct layouts and
          entry-point signatures, versioned. Slang is the first-class way to
          write against it, and raw WGSL or a node system can target the same
          contract. The boundary's structs come from Slang reflection, and{" "}
          <C>test/linker.test.ts</C> checks the generated WGSL against the
          declared functions.
        </p>
        <p>
          Open question: how stable exported names are across Slang releases.
          Slang suffixes names, such as <C>records_0</C>.
        </p>
      </Section>

      <Section title="Keeping the GPU safe">
        <p>
          The GPU is shared with every other app on the machine, and a hung
          shader resets it for all of them. So every shader loop is bound by a
          constant, never by a count read from a buffer, with an early{" "}
          <C>break</C>, and every buffer index is clamped.
        </p>
        <p>
          On Metal, Chrome adds a loop guard to Slang's loops, which the Spec
          extensions tab covers. <C>scripts/dumpMsl.mjs</C> shows the Metal a
          kernel becomes, and it's read before a changed kernel's first browser
          run.
        </p>
        <Written
          from="the master plan, section 3.4, and AGENTS.md"
          on="2026-11-08"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>The contract's stages and helpers, with an example.</li>
          <li>Measured cost of Slang against hand-written WGSL, per kernel.</li>
          <li>Slang's WGSL backend gaps, and which kernels stay in WGSL.</li>
        </ul>
      </Section>
    </Page>
  );
}
