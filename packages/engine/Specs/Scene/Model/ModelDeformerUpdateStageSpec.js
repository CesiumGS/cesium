import {
  AxisAlignedBoundingBox,
  BoundingSphere,
  Cartesian3,
} from "@cesium/core";
import { ModelDeformerUpdateStage } from "../../../index.js";

describe("Scene/Model/ModelDeformerUpdateStage", function () {
  const rest = {
    min: new Cartesian3(0.0, 0.0, 0.0),
    max: new Cartesian3(1.0, 1.0, 1.0),
  };

  function createBinding(minimum, maximum) {
    return {
      computeDeformedBoundingBox: (result) =>
        AxisAlignedBoundingBox.fromCorners(
          Cartesian3.fromArray(minimum),
          Cartesian3.fromArray(maximum),
          result,
        ),
    };
  }

  function createRuntimePrimitive(bindings) {
    return {
      deformedBoundsDirty: true,
      deformerBindings: new Set(bindings),
      primitive: {
        attributes: [{ semantic: "POSITION", min: rest.min, max: rest.max }],
      },
      node: { index: 0 },
      boundingSphere: new BoundingSphere(),
      drawCommand: jasmine.createSpyObj("drawCommand", [
        "updateBoundingVolume",
      ]),
    };
  }

  function update(runtimePrimitive, runtimeNode = {}) {
    const sceneGraph = {
      _runtimeNodes: [runtimeNode],
      expandBoundingSphere: jasmine.createSpy("expandBoundingSphere"),
    };
    ModelDeformerUpdateStage.update(runtimePrimitive, sceneGraph);
    return sceneGraph;
  }

  function expectBounds(runtimePrimitive, minimum, maximum) {
    expect(runtimePrimitive.boundingSphere).toEqual(
      BoundingSphere.fromCornerPoints(
        Cartesian3.fromArray(minimum),
        Cartesian3.fromArray(maximum),
      ),
    );
    expect(
      runtimePrimitive.drawCommand.updateBoundingVolume,
    ).toHaveBeenCalled();
  }

  it("bounds a primitive by its binding's box", function () {
    const runtimePrimitive = createRuntimePrimitive([
      createBinding([-1.0, 0.0, 0.0], [1.0, 2.0, 3.0]),
    ]);
    const runtimeNode = {};
    const sceneGraph = update(runtimePrimitive, runtimeNode);

    expectBounds(runtimePrimitive, [-1.0, 0.0, 0.0], [1.0, 2.0, 3.0]);
    expect(runtimePrimitive.deformedBoundsDirty).toBe(false);
    expect(sceneGraph.expandBoundingSphere).toHaveBeenCalledOnceWith(
      runtimePrimitive.boundingSphere,
      runtimeNode,
    );
  });

  it("adds the offsets of several bindings from the rest bounds", function () {
    const runtimePrimitive = createRuntimePrimitive([
      createBinding([0.0, 0.0, 0.0], [2.0, 1.0, 1.0]),
      createBinding([5.0, 0.0, 0.0], [6.0, 1.0, 1.0]),
    ]);
    update(runtimePrimitive);

    expectBounds(runtimePrimitive, [4.0, -1.0, -1.0], [8.0, 2.0, 2.0]);
  });

  it("includes instance translations", function () {
    const runtimePrimitive = createRuntimePrimitive([
      createBinding([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
    ]);
    update(runtimePrimitive, {
      instancingTranslationMin: new Cartesian3(-10.0, 0.0, 0.0),
      instancingTranslationMax: new Cartesian3(10.0, 0.0, 0.0),
    });

    expectBounds(runtimePrimitive, [-10.0, 0.0, 0.0], [11.0, 1.0, 1.0]);
  });

  it("keeps the rest bounds while a binding has no box", function () {
    const runtimePrimitive = createRuntimePrimitive([
      { computeDeformedBoundingBox: () => undefined },
    ]);
    const restSphere = runtimePrimitive.boundingSphere.clone();
    update(runtimePrimitive);

    expect(runtimePrimitive.boundingSphere).toEqual(restSphere);
    expect(runtimePrimitive.deformedBoundsDirty).toBe(false);
  });

  it("does nothing unless dirty", function () {
    const binding = createBinding([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]);
    spyOn(binding, "computeDeformedBoundingBox");
    const runtimePrimitive = createRuntimePrimitive([binding]);
    runtimePrimitive.deformedBoundsDirty = false;
    update(runtimePrimitive);

    expect(binding.computeDeformedBoundingBox).not.toHaveBeenCalled();
  });
});
