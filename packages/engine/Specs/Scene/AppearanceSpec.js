import {
  WebGLConstants,
  Appearance,
  BlendingState,
  Material,
} from "../../index.js";;

describe("Scene/Appearance", function () {
  it("constructor", function () {
    const material = Material.fromType("Color");
    const vs =
      "attribute vec3 position3DHigh;\n" +
      "attribute vec3 position3DLow;\n" +
      "attribute vec4 color;\n" +
      "varying vec4 v_color;\n" +
      "void main() {\n" +
      "    gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();\n" +
      "    v_color = color;\n" +
      "}\n";
    const fs =
      "varying vec4 v_color;\n" +
      "void main() {\n" +
      "    gl_FragColor = v_color;\n" +
      "}\n";
    const renderState = {
      depthTest: {
        enabled: true,
      },
    };
    const appearance = new Appearance({
      material: material,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      renderState: renderState,
      translucent: false,
      closed: true,
    });

    expect(appearance.material).toBe(material);
    expect(appearance.vertexShaderSource).toBe(vs);
    expect(appearance.fragmentShaderSource).toBe(fs);
    expect(appearance.renderState).toBe(renderState);
    expect(appearance.translucent).toEqual(false);
    expect(appearance.closed).toEqual(true);
  });

  it("getFragmentShaderSource", function () {
    const fs =
      "varying vec4 v_color;\n" +
      "void main() {\n" +
      "    gl_FragColor = v_color;\n" +
      "}\n";
    const appearance = new Appearance({
      fragmentShaderSource: fs,
    });

    expect(appearance.getFragmentShaderSource().indexOf(fs)).toBeGreaterThan(
      -1
    );
  });

  it("getFragmentShaderSource with material", function () {
    const material = Material.fromType("Color");
    const fs =
      "varying vec4 v_color;\n" +
      "void main() {\n" +
      "    gl_FragColor = v_color;\n" +
      "}\n";
    const appearance = new Appearance({
      material: material,
      fragmentShaderSource: fs,
    });

    const fragmentSource = appearance.getFragmentShaderSource();
    expect(fragmentSource.indexOf(material.shaderSource)).toBeGreaterThan(-1);
    expect(fragmentSource.indexOf(fs)).toBeGreaterThan(-1);
  });

  it("getDefaultRenderState", function () {
    const renderState = Appearance.getDefaultRenderState(true, true);

    expect(renderState.depthTest).toBeDefined();
    expect(renderState.depthTest.enabled).toEqual(true);
    expect(renderState.depthMask).toEqual(false);
    expect(renderState.blending).toEqual(BlendingState.ALPHA_BLEND);
    expect(renderState.cull).toBeDefined();
    expect(renderState.cull.enabled).toEqual(true);
    expect(renderState.cull.face).toEqual(WebGLConstants.BACK);
  });

  it("isTranslucent", function () {
    const appearance = new Appearance({
      translucent: false,
    });

    expect(appearance.isTranslucent()).toEqual(false);
    appearance.translucent = true;
    expect(appearance.isTranslucent()).toEqual(true);

    appearance.material = Material.fromType("Color");
    appearance.material.translucent = false;
    expect(appearance.isTranslucent()).toEqual(false);
    appearance.material.translucent = true;
    expect(appearance.isTranslucent()).toEqual(true);
  });

  it("getRenderState", function () {
    const appearance = new Appearance({
      translucent: false,
      closed: true,
      renderState: Appearance.getDefaultRenderState(false, true),
    });

    let rs = appearance.getRenderState();
    expect(rs.depthMask).toEqual(true);
    expect(rs.blending).not.toBeDefined();

    appearance.translucent = true;
    rs = appearance.getRenderState();
    expect(rs.depthMask).toEqual(false);
    expect(rs.blending).toBe(BlendingState.ALPHA_BLEND);
  });
});
