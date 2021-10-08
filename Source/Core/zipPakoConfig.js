import buildModuleUrl from "./buildModuleUrl.js";
import zip from "../ThirdParty/zip.js";

var zWorkerUrl = buildModuleUrl("ThirdParty/Workers/z-worker-pako.js");
zip.configure({
  workerScripts: {
    deflate: [zWorkerUrl, "./pako_deflate.min.js"],
    inflate: [zWorkerUrl, "./pako_inflate.min.js"],
  },
});

var zipPakoConfig = zip;
export default zipPakoConfig;
