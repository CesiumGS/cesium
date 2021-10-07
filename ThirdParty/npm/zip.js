import * as zip from "@zip.js/zip.js/lib/zip-no-worker.js";
// zip.configure({
//   workerScripts: {
//       deflate: ["../../Source/ThirdParty/Workers/z-worker-pako.js", "./pako_deflate.min.js"],
//       inflate: ["../../Source/ThirdParty/Workers/z-worker-pako.js", "./pako_inflate.min.js"]
//   }
// });
// zip.configure({
//   useWebWorkers: false
// });
export { zip as default };