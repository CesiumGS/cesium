import { DepthPlane } from "../../index.js";
import createCamera from "../createCamera.js";
import createContext from "../../../../Specs/createContext.js";;
import createFrameState from "../createFrameState.js";

describe("Scene/DepthPlane", function () {
  let context;

  beforeAll(function () {
    context = createContext();
  });

  afterAll(function () {
    context.destroyForSpecs();
  });

  it("should use the default depthPlaneEllipsoidOffset", function () {
    const frameState = createFrameState(context, createCamera());

    const depthPlane = new DepthPlane();
    depthPlane.update(frameState);

    expect(depthPlane._command.boundingVolume.radius).toEqual(6378137);
  });

  it("should use a provided depthPlaneEllipsoidOffset", function () {
    const frameState = createFrameState(context, createCamera());

    const depthPlane = new DepthPlane(-8137);
    depthPlane.update(frameState);

    expect(depthPlane._command.boundingVolume.radius).toEqual(6370000);
  });
});
