import { Event, EntityCluster, EntityCollection } from "../packages/engine/index.js";

function MockDataSource() {
  //Values to be fiddled with by the test
  this.changedEvent = new Event();
  this.errorEvent = new Event();
  this.entities = new EntityCollection();
  this.name = "Mock Data";
  this.clock = undefined;
  this.isTimeVarying = false;
  this.isLoading = false;
  this.loadingEvent = new Event();
  this.destroyed = false;
  this.clustering = new EntityCluster();
}
MockDataSource.prototype.update = function () {
  return true;
};

MockDataSource.prototype.destroy = function () {
  this.destroyed = true;
};
export default MockDataSource;
