import { BoundingSphere, Cartesian3, CullingVolume } from "@cesium/core";
import { DrawCommand, Pass, SceneMode, View } from "../../index.js";

describe("Scene/View", function () {
  let view;
  let scene;

  beforeEach(function () {
    view = Object.create(View.prototype);
    view.frustumCommandsList = [];
    view._commandExtents = [];
    scene = {
      frameState: {
        camera: {
          positionWC: Cartesian3.ZERO,
          directionWC: new Cartesian3(0, 0, -1),
          frustum: { near: 1, far: 100000 },
        },
        commandList: [],
        shadowState: { shadowsEnabled: false },
        cullingVolume: new CullingVolume(),
        frustumSplits: [],
        mode: SceneMode.SCENE3D,
      },
      mode: SceneMode.SCENE3D,
      farToNearRatio: 10,
      _computeCommandList: [],
      _overlayCommandList: [],
      isVisible: () => true,
      updateDerivedCommands: () => {},
    };
  });

  function createCommand(pass, distance = 10) {
    return new DrawCommand({
      pass: pass,
      owner: {},
      boundingVolume: new BoundingSphere(new Cartesian3(0, 0, -distance), 1),
    });
  }

  [Pass.OPAQUE, Pass.CESIUM_3D_TILE, Pass.TRANSLUCENT].forEach(function (pass) {
    it(`releases previous commands when pass ${pass} shrinks`, function () {
      scene.frameState.commandList = [
        createCommand(pass),
        createCommand(pass),
        createCommand(pass),
      ];
      view.createPotentiallyVisibleSet(scene);
      const command = createCommand(pass);
      scene.frameState.commandList = [command];
      view.createPotentiallyVisibleSet(scene);

      const frustumCommands = view.frustumCommandsList[0];
      expect(frustumCommands.indices[pass]).toBe(1);
      expect(frustumCommands.commands[pass]).toEqual([command]);
    });

    it(`releases previous commands when pass ${pass} becomes empty`, function () {
      scene.frameState.commandList = [createCommand(pass), createCommand(pass)];
      view.createPotentiallyVisibleSet(scene);
      const otherPass =
        pass === Pass.OPAQUE ? Pass.CESIUM_3D_TILE : Pass.OPAQUE;
      scene.frameState.commandList = [createCommand(otherPass)];
      view.createPotentiallyVisibleSet(scene);

      const frustumCommands = view.frustumCommandsList[0];
      expect(frustumCommands.indices[pass]).toBe(0);
      expect(frustumCommands.commands[pass]).toEqual([]);
    });
  });

  it("releases previous commands in every retained frustum", function () {
    scene.frameState.commandList = [
      createCommand(Pass.CESIUM_3D_TILE),
      createCommand(Pass.CESIUM_3D_TILE, 10000),
    ];
    view.createPotentiallyVisibleSet(scene);
    expect(view.frustumCommandsList.length).toBeGreaterThan(1);

    const nearCommand = createCommand(Pass.OPAQUE);
    const farCommand = createCommand(Pass.OPAQUE, 10000);
    scene.frameState.commandList = [nearCommand, farCommand];
    view.createPotentiallyVisibleSet(scene);
    expect(view.frustumCommandsList.length).toBeGreaterThan(1);
    for (const frustumCommands of view.frustumCommandsList) {
      expect(frustumCommands.commands[Pass.CESIUM_3D_TILE]).toEqual([]);
      expect(frustumCommands.commands[Pass.OPAQUE].length).toBe(
        frustumCommands.indices[Pass.OPAQUE],
      );
    }
  });

  it("discards frustums when the scene has no commands", function () {
    scene.frameState.commandList = [createCommand(Pass.OPAQUE)];
    view.createPotentiallyVisibleSet(scene);
    scene.frameState.commandList = [];
    view.createPotentiallyVisibleSet(scene);
    expect(view.frustumCommandsList.length).toBe(0);
  });
});
