import { defineConfig, UserConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { env } from "process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import baseConfig, { cesiumPathReplace } from "./vite.config.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  const cesiumBaseUrl = `${process.env.BASE_URL}Build/CesiumUnminified`;

  console.log("Building Sandcastle with base url:", cesiumBaseUrl);

  const config: UserConfig = baseConfig;
  // This will make the built files point to routes in the correct nested path
  // based on the ci branch path
  config.base = `${process.env.BASE_URL}Apps/Sandcastle2`;

  config.build = {
    ...config.build,
    outDir: join(__dirname, "../../Apps/Sandcastle2"),
  };

  config.define = {
    ...config.define,
    __PAGE_BASE_URL__: JSON.stringify(process.env.BASE_URL),
    __COMMIT_SHA__: JSON.stringify(env.GITHUB_SHA),
  };

  const copyPlugin = viteStaticCopy({
    targets: [{ src: "templates/Sandcastle.(d.ts|js)", dest: "templates" }],
  });

  const plugins = config.plugins ?? [];
  config.plugins = [...plugins, copyPlugin, cesiumPathReplace(cesiumBaseUrl)];

  return config;
});
