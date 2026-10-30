describe(
  "Editor/MeshEditorInputHandler",
  function () {
    describe("press", function () {
      it("sends the ray and the active meshes' world matrices", function () {});

      it("doesn't pick", function () {});

      it("stops the camera reacting to the pointer when a tool starts a drag", function () {});

      it("leaves the camera alone when no tool handles the press", function () {});
    });

    describe("move", function () {
      it("sends the ray", function () {});

      it("doesn't pick", function () {});
    });

    describe("release", function () {
      it("sends the ray", function () {});

      it("lets the camera react to the pointer again after a drag", function () {});

      it("keeps the camera's previous enableInputs setting", function () {});

      it("leaves no camera inertia after a short drag", function () {});
    });

    describe("click", function () {
      it("sends a pick of a mesh component", function () {});

      it("sends a miss for empty space", function () {});

      it("sends a miss for a primitive that isn't in the editor", function () {});

      it("sends a miss for a component the mode can't select", function () {});

      it("doesn't send clicks to wasm in EditMode.NONE", function () {});
    });

    describe("modifiers", function () {
      it("sends no modifiers when none are held", function () {});

      it("sends each combination of shift, control and alt", function () {});
    });

    describe("EditMode.NONE", function () {
      it("makes a clicked mesh the only active mesh", function () {});

      it("toggles a shift-clicked mesh, so several can be active", function () {});

      it("makes every mesh inactive when clicking empty space", function () {});

      it("changes nothing when shift-clicking empty space", function () {});
    });

    describe("destroy", function () {
      it("stops listening to pointer input", function () {});

      it("lets the camera react to the pointer again", function () {});
    });
  },
  "WebGL",
);
