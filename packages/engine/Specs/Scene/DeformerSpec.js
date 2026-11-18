import { Deformable, Deformer } from "../../index.js";

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
  }

  function createBinding() {
    const binding = {
      destroyed: false,
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
      addDeformerBinding: (binding) => bindings.add(binding),
      removeDeformerBinding: (binding) => bindings.delete(binding),
    };
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

  it("throws when binding something that isn't a Deformable", function () {
    const deformer = new TestDeformer();
    expect(function () {
      deformer.bind({});
    }).toThrowDeveloperError();
  });
});
