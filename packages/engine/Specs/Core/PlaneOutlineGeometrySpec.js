import { PlaneOutlineGeometry } from "../../index.js";
import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;

describe("Core/PlaneOutlineGeometry", function () {
  it("constructor creates positions", function () {
    const m = PlaneOutlineGeometry.createGeometry(new PlaneOutlineGeometry());

    expect(m.attributes.position.values.length).toEqual(4 * 3);
    expect(m.indices.length).toEqual(4 * 2);
  });

  createPackableSpecs(PlaneOutlineGeometry, new PlaneOutlineGeometry(), []);
});
