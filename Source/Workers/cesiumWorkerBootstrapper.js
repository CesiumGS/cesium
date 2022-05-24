if (typeof self === "undefined") {
  self = {}; //define self so that the Dojo build can evaluate this file without crashing.
}

self.onmessage = function (event) {
  var data = event.data;
  importScripts(data.workerModule);
  self.onmessage = CesiumWorker.default;
  CESIUM_BASE_URL = data.baseUrl;
};

// replace setTimeout with a function that executes immediately synchronously, which
// will make the above require synchronous like it used to be, to ensure that we we
// have the real worker module loaded and installed before receiving any more messages.
function setTimeout(fn) {
  fn();
}
