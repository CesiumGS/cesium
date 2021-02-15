import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Matrix4 from "./Matrix4.js";
import Ray from "./Ray.js";

function Rect() {
  this.min = new Cartesian2(0, 0);
  this.max = new Cartesian2(0, 0);
}

function QuadtreeNode() {
  // by nature of the height map structure - we just know which
  //  height map points (and therefore triangles) belong in each quadtree node
  //  because a height map is a fixed grid.
  this.rect = new Rect();
  this.heightMax = 0;
  this.heightMin = 0;
}

function HeightmapQuadtree(heightmapIndicies, transform) {
  //
}

export default HeightmapQuadtree;
