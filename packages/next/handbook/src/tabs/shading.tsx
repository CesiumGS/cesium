import { data, libraryEntry, size } from "../data.ts";
import { ShaderRoutes } from "../flows.tsx";
import {
  C,
  DataTable,
  Figure,
  Flow,
  Generated,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

export function Shading() {
  const files = data.runtime.flatMap((g) => g.files);
  const compiler = files.find((f) => f.name === "slang-wasm.wasm");
  const compilerGlue = files.find((f) => f.name === "slang-wasm.js");
  const slangChunk = libraryEntry("core")?.lazy.find((c) => c.name === "slang");
  const slangWorker = data.bundles.library.assets.find(
    (a) => a.name === "slangWorker",
  );
  const routes = [
    {
      route: "WGSL, written directly",
      how: (
        <>
          The <C>wgsl</C> option of <C>CustomShader</C>
        </>
      ),
      cost: "Nothing extra to download. The shader is a string in your code.",
    },
    {
      route: "Slang, compiled at build time",
      how: (
        <>
          <C>scripts/slangShader.mjs</C> (<C>npm run slang</C>), with its output
          passed as <C>wgsl</C>. The recommended route.
        </>
      ),
      cost: "Nothing extra to download: it ships as WGSL. The cost is having slangc on the build machine.",
    },
    {
      route: "Slang, compiled at run time",
      how: <C>CustomShader.fromSlang</C>,
      cost: (
        <>
          The first compile downloads a chunk of {size(slangChunk?.kb)}, a
          worker of {size(slangWorker?.kb)}, {size(compilerGlue?.kb)} of glue
          and the compiler's WebAssembly: {size(compiler?.kb)}, or{" "}
          {size(compiler?.gzipKb)} gzipped. A shader compiled before comes from
          IndexedDB, and then the compiler doesn't load at all.
        </>
      ),
    },
  ];
  return (
    <Page
      title="Shading and linker"
      status="sketch"
      lede={
        <>
          Slang is the one source of engine shaders, and WGSL is generated from
          it. User shaders join through a linker against a named boundary, so a
          mismatch is a diagnostic that names the unit and line, not a string
          that happened to concatenate. 3D Tiles styling joins the same way,
          without loading Slang at all.
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

      <Section title="Three routes for a user shader">
        <p>
          All three end the same way: WGSL that joins through the linker. They
          differ in when Slang runs, and so in what a page pays when it loads.
        </p>
        <Figure caption="Every route ends in the same linker, and each source's card says where its compile runs, and so who pays for it. A style's route never reaches the worker.">
          <ShaderRoutes />
        </Figure>
        <DataTable
          label="Routes for a user shader and what each costs at load"
          columns={[
            { head: "Route", cell: (r) => <strong>{r.route}</strong> },
            { head: "How", cell: (r) => r.how },
            { head: "Cost at load", cell: (r) => r.cost },
          ]}
          rows={routes}
        />
        <Generated
          from={
            <>
              a library build and the setup store on the machine that built this
              page
            </>
          }
        />
        <p>
          With Brotli at its highest setting, the compiler's WebAssembly comes
          to about 7.4 MB, measured once. What a reader actually downloads
          depends on what the host serves, and the host has to serve these files
          itself. The default path is <C>/slang-wasm/</C>.
        </p>
        <p>
          On any route, content draws with its default material until its
          pipelines have compiled, in the background. If they fail, it stays
          that way, and the error is reported with its line.
        </p>
      </Section>

      <Section title="3D Tiles styling">
        <p>
          Styling is a common use, so it doesn't pay for the compiler. The 1.x
          style language compiles straight to WGSL in TypeScript, and never
          loads Slang. The only way to reach the compiler is the dynamic import
          inside <C>CustomShader.fromSlang</C>.
        </p>
        <Flow
          label="How a 3D Tiles style compiles"
          steps={[
            {
              title: "Compile the expressions",
              body: (
                <>
                  <C>compileStyleExpression</C> parses each expression, types it
                  as number, boolean, vector or color, and writes WGSL.
                </>
              ),
            },
            {
              title: "Write the stages",
              body: (
                <>
                  <C>FeatureStyle</C> writes a <C>vertexMain</C> that hides
                  features and a <C>fragmentMain</C> that applies color.
                </>
              ),
            },
            {
              title: "Hand it over",
              body: (
                <>
                  It passes that WGSL to <C>CustomShader</C>'s <C>wgsl</C>{" "}
                  option, the same as a shader written by hand.
                </>
              ),
            },
            {
              title: "Link",
              body: "The stages join through the linker, and pipelines are made from the link.",
            },
          ]}
        />
        <p>
          A feature with <C>show</C> false, or a color with alpha 0, is hidden
          by collapsing its triangles in the vertex stage. So it's gone from
          every pass: depth, shadows and picking.
        </p>
        <h3>Limits today</h3>
        <ul>
          <li>
            <strong>Refused, with an error naming them:</strong> comparing
            string properties, regular expressions, and <C>undefined</C> or{" "}
            <C>null</C> checks. Strings aren't on the GPU, and a missing
            property reads 0.
          </li>
          <li>
            <strong>Properties:</strong> what a shader reads shares four
            four-component slots: 4 vectors, or up to 16 plain numbers. Beyond
            that, the style is refused when it compiles.
          </li>
          <li>
            <strong>Translucency:</strong> a color's alpha scales the
            material's, but blended translucency comes from the material, not
            yet from the style.
          </li>
          <li>
            <strong>Pipelines:</strong> each distinct style source compiles its
            own. Identical sources share them, because pipelines are cached by
            the linked code.
          </li>
          <li>
            <strong>Property textures:</strong> hiding reads properties per
            vertex, so a property stored in a texture reads 0 there.
          </li>
        </ul>
        <p className="provenance">
          The 16 comes from the check made when a style compiles. A style with
          more than 4 properties hasn't yet been run on a GPU for this page.
        </p>
        <Note title="In progress, not in this build">
          <p>
            Work is under way on string properties, the property limit, and a
            build check that keeps Slang out of the main chunk. Today nothing
            but the code's structure keeps it out.
          </p>
        </Note>
        <Written
          from={
            <>
              <C>src/scene/styleExpression.ts</C>, <C>FeatureStyle.ts</C>,{" "}
              <C>CustomShader.ts</C> and <C>slang.ts</C>
            </>
          }
          on="2026-11-08"
        />
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
          from="the overall plan, section 3.4, and AGENTS.md"
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
