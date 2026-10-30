describe(
  "Editor/MeshEditor",
  function () {
    describe("addToScene", function () {
      it("resolves to an editor in the scene's primitives", function () {});

      it("starts in EditMode.NONE", function () {});
    });

    describe("addMesh", function () {
      it("returns a mesh with the source", function () {});

      it("hides the source", function () {});

      it("returns a shown mesh", function () {});

      it("throws if the source was already added", function () {});
    });

    describe("removeMesh", function () {
      it("returns true and removes the mesh", function () {});

      it("destroys the mesh", function () {});

      it("shows the source", function () {});

      it("returns false for a mesh that isn't in the editor", function () {});

      it("stops drawing the mesh's overlay", function () {});
    });

    describe("mode", function () {
      it("draws only the components the mode renders", function () {});

      it("draws only faces in EditMode.NONE", function () {});

      it("applies the mode to meshes added later", function () {});

      it("accepts combinations of components", function () {});
    });

    describe("update", function () {
      it("draws the overlay", function () {});

      it("draws the overlay at the source's world transform", function () {});

      it("follows changes to the source's world transform", function () {});

      it("doesn't draw or pick a mesh whose show is false", function () {});

      it("draws nothing outside 3D", function () {});

      it("makes overlay components pickable as the mesh", function () {});

      it("supports drillPick across meshes", function () {});
    });

    describe("destroy", function () {
      it("destroys every mesh and shows its source", function () {});

      it("is called when the editor is removed from the scene", function () {});

      it("is called when the scene is destroyed", function () {});

      it("isDestroyed returns true afterwards", function () {});
    });
  },
  "WebGL",
);
