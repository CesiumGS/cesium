import { demodernizeShader } from "../../index.js";

describe("Renderer/demodernizeShader", () => {
  it("replaces version", () => {
    const input = `#version 300 es
    void main() {}
    `;

    const output = demodernizeShader(input, false);
    const expectedVersion = "#version 100";

    expect(output.startsWith(expectedVersion)).toEqual(true);
  });

  it("replaces out_FragData with gl_FragData", () => {
    const input = `#version 300 es
    layout (location = 0) vec4 out_FragData_0;
    layout (location = 1) vec4 out_FragData_1;
    layout (location = 10) vec4 out_FragData_10;
    layout (location = 11) vec4 out_FragData_11;
    
    void main() {
      out_FragData_0 = vec4(0.0);
      out_FragData_1 = vec4(1.0);
      out_FragData_10 = vec4(0.0, 0.0, 0.0, 0.0);
      out_FragData_11 = vec4(1.0, 2.0, 3.0, 4.0);
    }
    `;

    const output = demodernizeShader(input, true);

    const expectedVersion = "#version 100";
    expect(output.startsWith(expectedVersion)).toEqual(true);
    expect(output).not.toContain("layout (location = 0) vec4 out_FragData_0");
    expect(output).not.toContain("layout (location = 1) vec4 out_FragData_1");
    expect(output).not.toContain("layout (location = 10) vec4 out_FragData_10");
    expect(output).not.toContain("layout (location = 11) vec4 out_FragData_11");
    expect(output).toContain("gl_FragData[0] = vec4(0.0);");
    expect(output).toContain("gl_FragData[1] = vec4(1.0);");
    expect(output).toContain("gl_FragData[10] = vec4(0.0, 0.0, 0.0, 0.0);");
    expect(output).toContain("gl_FragData[11] = vec4(1.0, 2.0, 3.0, 4.0);");
  });

  it("replaces out_FragColor with gl_FragData", () => {
    const input = `#version 300 es
    layout (location = 0) vec4 out_FragColor;
    
    void main() {
      out_FragColor = vec4(1.0);
      out_FragColor[0] = 0.0;
      out_FragColor[2] = 2.0;
    }
    `;
    const output = demodernizeShader(input, true);

    const expectedVersion = "#version 100";

    expect(output.startsWith(expectedVersion)).toEqual(true);
    expect(output).not.toContain("layout (location = 0) vec4 out_FragColor");
    expect(output).toContain("gl_FragColor = vec4(1.0);");
    expect(output).toContain("gl_FragColor[0] = 0.0;");
    expect(output).toContain("gl_FragColor[2] = 2.0;");
  });

  it("replaces texture with texture2D", () => {
    const input = `#version 300 es
    uniform sampler2D u_texture;
    void main() {
      vec4 tex = texture(u_texture, vec2(0.0));
    }
    `;
    const output = demodernizeShader(input, false);

    const expectedVersion = "#version 100";
    expect(output.startsWith(expectedVersion)).toEqual(true);

    expect(output).toContain("vec4 tex = texture2D(u_texture, vec2(0.0));");
  });

  it("replaces czm_textureCube with textureCube", () => {
    const input = `#version 300 es
    uniform samplerCube u_texture;
    void main() {
      vec4 tex = czm_textureCube(u_texture, vec3(0.0)); // textureCube
    }
    `;
    const output = demodernizeShader(input, false);

    const expectedVersion = "#version 100";
    expect(output.startsWith(expectedVersion)).toEqual(true);

    expect(output).toContain("vec4 tex = textureCube(u_texture, vec2(0.0));");
  });
});
