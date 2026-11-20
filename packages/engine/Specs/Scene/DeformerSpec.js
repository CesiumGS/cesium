import { AxisAlignedBoundingBox, Cartesian3 } from "@cesium/core";
import {
  Deformable,
  Deformer,
  GeometryAttributeDescriptor,
  GeometryReader,
  GeometryWriter,
  VertexAttributeSemantic,
} from "../../index.js";

describe("Scene/Deformer", function () {
  const frameState = {};

  class TestDeformer extends Deformer {
    constructor() {
      super();
      this.createBinding = jasmine
        .createSpy("createBinding")
        .and.callFake(() => createBinding());
    }

    _createBinding(frameState, deformable) {
      return this.createBinding(frameState, deformable);
    }

    // Stretches x by 2 and moves y by 1.
    _deformPositions(binding, positions, jacobians) {
      for (let i = 0; i < positions.length / 3; ++i) {
        positions[i * 3] *= 2.0;
        positions[i * 3 + 1] += 1.0;
        jacobians.set([2, 0, 0, 0, 1, 0, 0, 0, 1], i * 9);
      }
    }
  }

  function createBinding() {
    const binding = {
      destroyed: false,
      addRestDisplacement: jasmine.createSpy("addRestDisplacement"),
      destroy: () => {
        binding.destroyed = true;
      },
    };
    return binding;
  }

  // A deformable that records the bindings added to it.
  function createDeformable() {
    const bindings = new Set();
    return {
      [Deformable.symbol]: true,
      bindings,
      deformerBindings: bindings,
      addDeformerBinding: (binding) => bindings.add(binding),
      removeDeformerBinding: (binding) => bindings.delete(binding),
    };
  }

  const position = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.POSITION,
  });
  const normal = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.NORMAL,
  });
  const tangent = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.TANGENT,
  });

  // A deformable whose vertex attributes are arrays of values, by semantic,
  // that sessions read and write directly.
  function createBakeableDeformable(values, writable = Object.keys(values)) {
    const createSession = () => ({
      vertexCount: () => values.POSITION.length / 3,
      vertexAttributeReader:
        ({ semantic, componentCount: n }) =>
        (i, result, offset = 0) => {
          result.set(values[semantic].slice(i * n, (i + 1) * n), offset);
          return result;
        },
      vertexAttributeWriter:
        ({ semantic, componentCount: n }) =>
        (i, source, offset = 0) => {
          values[semantic].splice(
            i * n,
            n,
            ...source.slice(offset, offset + n),
          );
        },
      commit: () => {},
      destroy: () => {},
    });
    const getDescriptors = (semantics) =>
      [position, normal, tangent].filter((descriptor) =>
        semantics.includes(descriptor.semantic),
      );

    const deformable = createDeformable();
    deformable.geometryReader = new GeometryReader({
      availableAttributes: getDescriptors(Object.keys(values)),
      createReadSession: createSession,
    });
    deformable.geometryWriter = new GeometryWriter({
      availableAttributes: getDescriptors(writable),
      createWriteSession: createSession,
    });
    return deformable;
  }

  function getBinding(deformable) {
    expect(deformable.bindings.size).toBe(1);
    return deformable.bindings.values().next().value;
  }

  it("binds on the next update", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();

    deformer.bind(deformable);
    expect(deformable.bindings.size).toBe(0);

    deformer._update(frameState);
    expect(deformer.createBinding).toHaveBeenCalledOnceWith(
      frameState,
      deformable,
    );
    expect(getBinding(deformable)).toBe(
      deformer.createBinding.calls.mostRecent().returnValue,
    );
  });

  it("replaces the binding when binding again", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.bind(deformable);
    deformer._update(frameState);
    const first = getBinding(deformable);

    deformer.bind(deformable);
    deformer._update(frameState);

    expect(first.destroyed).toBe(true);
    expect(getBinding(deformable)).not.toBe(first);
  });

  it("unbinds, destroying the binding", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.bind(deformable);
    deformer._update(frameState);
    const binding = getBinding(deformable);

    expect(deformer.unbind(deformable)).toBe(true);
    expect(deformable.bindings.size).toBe(0);
    expect(binding.destroyed).toBe(true);
    expect(deformer.unbind(deformable)).toBe(false);
  });

  it("doesn't bind a deformable unbound before the next update", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.bind(deformable);

    expect(deformer.unbind(deformable)).toBe(true);
    deformer._update(frameState);
    expect(deformable.bindings.size).toBe(0);
  });

  it("doesn't retry a deformable that fails to bind", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.createBinding.and.throwError("Can't bind.");
    deformer.bind(deformable);

    expect(() => deformer._update(frameState)).toThrowError("Can't bind.");
    deformer._update(frameState);
    expect(deformer.createBinding).toHaveBeenCalledTimes(1);
  });

  it("unbinds every deformable when its bindings are invalidated, until rebound", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.bind(deformable);
    deformer._update(frameState);
    const binding = getBinding(deformable);
    expect(deformer.needsRebind).toBe(false);

    deformer._invalidateBindings();
    expect(deformable.bindings.size).toBe(0);
    expect(binding.destroyed).toBe(true);
    expect(deformer.needsRebind).toBe(true);

    deformer._update(frameState);
    expect(deformable.bindings.size).toBe(0);

    deformer.rebind();
    expect(deformer.needsRebind).toBe(false);
    deformer._update(frameState);
    expect(deformable.bindings.size).toBe(1);
  });

  it("binds deformables bound after its bindings are invalidated", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.bind(deformable);

    deformer._invalidateBindings();
    deformer._update(frameState);
    expect(deformable.bindings.size).toBe(1);
    expect(deformer.needsRebind).toBe(false);
  });

  it("raises _boundsChanged when its bounds are set", function () {
    const deformer = new TestDeformer();
    const listener = jasmine.createSpy("listener");
    deformer._boundsChanged.addEventListener(listener);

    const bounds = {};
    deformer._setBounds(bounds);
    expect(deformer._bounds).toBe(bounds);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unbinds every deformable when destroyed", function () {
    const deformer = new TestDeformer();
    const deformable = createDeformable();
    deformer.bind(deformable);
    deformer._update(frameState);
    const binding = getBinding(deformable);

    deformer.destroy();
    expect(deformer.isDestroyed()).toBe(true);
    expect(deformable.bindings.size).toBe(0);
    expect(binding.destroyed).toBe(true);
  });

  describe("bake", function () {
    // Two vertices, which TestDeformer stretches along x and moves along y.
    function createValues() {
      return {
        POSITION: [1, 0, 0, 0, 1, 0],
        NORMAL: [1, 1, 0, 0, 0, 1],
        TANGENT: [1, 1, 0, -1, 0, 0, 1, 1],
      };
    }

    function bind(deformer, deformable) {
      deformer.bind(deformable);
      deformer._update(frameState);
      return deformer.createBinding.calls.mostRecent().returnValue;
    }

    // Bakes a deformable with the values, returning it and its binding.
    function bake(values, writable) {
      const deformable = createBakeableDeformable(values, writable);
      const deformer = new TestDeformer();
      const binding = bind(deformer, deformable);
      deformer.bake(deformable);
      return { deformable, binding };
    }

    it("writes the deformed positions", function () {
      const values = createValues();
      bake(values);
      expect(values.POSITION).toEqual([2, 1, 0, 0, 2, 0]);
    });

    it("transforms normals by the jacobian's cofactor", function () {
      const values = createValues();
      bake(values);
      // The cofactor of diag(2, 1, 1) is diag(1, 2, 2).
      expect(values.NORMAL).toEqualEpsilon(
        [1 / Math.sqrt(5), 2 / Math.sqrt(5), 0, 0, 0, 1],
        1e-12,
      );
    });

    it("transforms tangents by the jacobian, keeping their w", function () {
      const values = createValues();
      bake(values);
      expect(values.TANGENT).toEqualEpsilon(
        [2 / Math.sqrt(5), 1 / Math.sqrt(5), 0, -1, 0, 0, 1, 1],
        1e-12,
      );
    });

    it("unbinds the deformable", function () {
      const { deformable, binding } = bake(createValues());
      expect(deformable.bindings.size).toBe(0);
      expect(binding.destroyed).toBe(true);
    });

    it("widens the deformable's other bindings by the displacements", function () {
      const deformable = createBakeableDeformable(createValues());
      const otherBinding = bind(new TestDeformer(), deformable);
      const deformer = new TestDeformer();
      bind(deformer, deformable);

      deformer.bake(deformable);

      expect(otherBinding.addRestDisplacement).toHaveBeenCalledOnceWith(
        AxisAlignedBoundingBox.fromCorners(
          new Cartesian3(0, 1, 0),
          new Cartesian3(1, 1, 0),
        ),
      );
    });

    it("warns about and skips attributes that can't be written", function () {
      spyOn(console, "warn");
      const values = createValues();
      bake(values, ["POSITION"]);

      expect(console.warn).toHaveBeenCalled();
      expect(values.NORMAL).toEqual(createValues().NORMAL);
      expect(values.TANGENT).toEqual(createValues().TANGENT);
    });

    it("throws when the deformable isn't bound", function () {
      const deformable = createBakeableDeformable(createValues());
      const deformer = new TestDeformer();
      deformer.bind(deformable);

      expect(function () {
        deformer.bake(deformable);
      }).toThrowDeveloperError();
    });
  });

  it("throws when binding something that isn't a Deformable", function () {
    const deformer = new TestDeformer();
    expect(function () {
      deformer.bind({});
    }).toThrowDeveloperError();
  });
});
