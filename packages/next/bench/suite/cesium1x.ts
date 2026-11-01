/**
 * CesiumJS 1.x in Dyno: a page global, so a page holds one build. The
 * explorer may want a released build ("1.146.0"), Lab pages this
 * repository's ("repo"); asking for another than the one loaded means
 * loading the page again.
 */

/** The 1.x build in this page, if any (a global: one per page). */
let cesiumBuild: { build: string; loaded: Promise<void> } | undefined;

/** Loads a 1.x build once; false when another build is already loaded. */
export async function ensureCesium(build: string): Promise<boolean> {
  if (!cesiumBuild) {
    const base =
      build === "repo"
        ? "/cesium1x/"
        : `/cesium-release/${build}/package/Build/Cesium/`;
    (globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = base;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${base}Widgets/widgets.css`;
    document.head.append(css);
    const loaded = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${base}Cesium.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`CesiumJS ${build}: not found`));
      document.head.append(script);
    });
    cesiumBuild = { build, loaded };
  }
  await cesiumBuild.loaded;
  return cesiumBuild.build === build;
}
