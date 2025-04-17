import { defineConfig, UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const config: UserConfig = {
    plugins: [react()],
    build: {
      outDir: "../../Apps/Sandcastle2",
      // "the outDir is not inside project root and will not be emptied" without this setting
      emptyOutDir: true,
      sourcemap: command === "serve",
    },
    server: {
      // Given the nature of loading and constructing a CesiumJS Viewer on startup HMR can get memory intensive
      // The state of the editor could also be lost when developing if the page refreshes unexpectedly
      hmr: false,
      fs: {
        strict: true,
        // allow: ["./", "../../Apps", "../../Build"],
      },
    },
  };

  if (command === "serve") {
    const cesiumSource = "../../Build/CesiumUnminified";
    const cesiumBaseUrl = "Build/CesiumUnminified";
    config.plugins?.push(
      viteStaticCopy({
        targets: [
          { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
          { src: `${cesiumSource}/Cesium.js`, dest: cesiumBaseUrl },
          { src: "../../Apps/SampleData", dest: "Apps" },
        ],
      }),
    );
  } else if (command === "build") {
    // This will make the built files point to routes in the correct nested path
    // for the normal local server.js to work correctly
    config.base = "/Apps/Sandcastle2";
  }

  return config;
});
