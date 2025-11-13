import { basename } from "path";

/** @import {PluginOption} from 'vite' */

/**
 * Replace path values in
 * @param {string} cesiumBaseUrl Path to use for replacement
 * @returns {PluginOption}
 */
export const cesiumPathReplace = (cesiumBaseUrl) => {
  return {
    name: "custom-cesium-path-plugin",
    config(config) {
      config.define = {
        ...config.define,
        __CESIUM_BASE_URL__: JSON.stringify(cesiumBaseUrl),
      };
    },
    transformIndexHtml(html) {
      return html.replaceAll("__CESIUM_BASE_URL__", `${cesiumBaseUrl}`);
    },
  };
};

/**
 * Specify an import map for the built html files
 * @param {Object<string, string>} imports map of imports
 * @param {string[]} [filenames]
 * @returns {PluginOption}
 */
export const insertImportMap = (
  imports,
  filenames = ["bucket.html", "standalone.html"],
) => {
  return {
    name: "custom-import-map",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (
          filenames.length > 0 &&
          !filenames.includes(basename(ctx.filename))
        ) {
          return;
        }
        return {
          html,
          tags: [
            {
              tag: "script",
              attrs: {
                type: "importmap",
              },
              children: JSON.stringify({ imports }, null, 2),
              injectTo: "head-prepend",
            },
          ],
        };
      },
    },
  };
};
