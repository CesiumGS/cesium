// Specs drive a wasm MeshEditor with synthetic meshes from Mesh.fromBuffers,
// and pass its overlay views to the renderer.
describe(
  "Editor/OverlayRenderer",
  function () {
    describe("update", function () {
      it("adds no commands before the first upload");

      it("adds one command each for points, edges and faces");

      it("skips component kinds that aren't shown");

      it("draws points and edges as instanced triangle strips");

      it("draws faces as instanced triangles");

      it("draws one instance per component");

      it("uses the model matrix");

      it("renders points, edges and faces");

      it("draws points over edges and edges over faces");

      it("draws changed positions after a partial update");

      it("draws the new topology after a full refresh");

      it("updates instance counts when the overlay grows or shrinks");

      it("draws selected components in the selected color");
    });

    describe("picking", function () {
      it("picks a vertex");

      it("picks an edge");

      it("picks a face");

      it("picks a face by its face index, not its triangle index");

      it("picks transparent faces");

      it("returns pick objects with its mesh as primitive");
    });

    describe("destroy", function () {
      it("isDestroyed is false before destroy");

      it("isDestroyed is true after destroy");
    });
  },
  "WebGL",
);
