// Prints the Metal Shading Language Chrome's WebGPU (Dawn, its WGSL
// compiler Tint) makes from a WGSL module's compute entry points: what
// Metal actually compiles, for performance questions the WGSL can't answer
// (plan §3.4: Tint guards every loop it can't prove finite with a 64-bit
// counter, which is how Slang's `loop {}` loops paid 5% in the atmosphere's
// path tracer).
//
//   node scripts/dumpMsl.mjs module.wgsl entry [entry …]
//
// macOS (Metal) only. Launches Playwright's Chromium with Dawn's
// `dump_shaders` (and readable names), on a page it serves itself.
import { readFileSync } from "node:fs";
import process from "node:process";
import { chromium } from "playwright";

const [file, ...entries] = process.argv.slice(2);
if (!file || entries.length === 0) {
  console.error("Usage: node scripts/dumpMsl.mjs module.wgsl entry [entry …]");
  process.exit(2);
}
const code = readFileSync(file, "utf8");
const browser = await chromium.launch({
  headless: false,
  args: [
    "--enable-unsafe-webgpu",
    "--enable-dawn-features=dump_shaders,disable_symbol_renaming",
  ],
});
try {
  const page = await browser.newPage();
  const dumped = [];
  page.on("console", (m) => {
    if (m.text().startsWith("/* Dumped generated MSL */")) {
      dumped.push(m.text());
    }
  });
  // WebGPU needs a secure context: an https page answered here.
  const origin = "https://msl.dump.invalid/";
  await page.route(`${origin}**`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html>" }),
  );
  await page.goto(origin);
  const errors = await page.evaluate(
    async ([code, entries]) => {
      const adapter = await navigator.gpu.requestAdapter();
      const device = await adapter.requestDevice();
      const module = device.createShaderModule({ code });
      const failed = [];
      for (const entryPoint of entries) {
        device.pushErrorScope("validation");
        await device
          .createComputePipelineAsync({ layout: "auto", compute: { module, entryPoint } })
          .catch((e) => failed.push(`${entryPoint}: ${e.message}`));
        const error = await device.popErrorScope();
        if (error) {
          failed.push(`${entryPoint}: ${error.message}`);
        }
      }
      return failed;
    },
    [code, entries],
  );
  // Dawn logs asynchronously.
  await new Promise((r) => setTimeout(r, 1000));
  for (const e of errors) {
    console.error(e);
  }
  console.log(dumped.join("\n\n"));
  if (dumped.length === 0) {
    console.error("No MSL dumped (not on Metal, or the pipelines failed).");
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
