import { queryToObject, RuntimeError } from "@cesium/engine";

function BadGeometry() {
  this._workerName = "../../Build/Specs/TestWorkers/createBadGeometry";

  // Make this worker loadable when testing against the built version of Cesium.
  if (
    typeof window !== "undefined" &&
    typeof window.location !== "undefined" &&
    typeof window.location.search !== "undefined"
  ) {
    const parameters = queryToObject(window.location.search.substring(1));
    if (parameters.built) {
      this._workerName = `../${this._workerName}`;
    }
  }
}

BadGeometry.createGeometry = function () {
  //This function is only called when synchronous, see Specs/TestWorks/createBadGeometry for asynchronous.
  throw new RuntimeError("BadGeometry.createGeometry");
};

BadGeometry.packedLength = 0;

BadGeometry.pack = function () {};

BadGeometry.unpack = function () {
  return new BadGeometry();
};
export default BadGeometry;
