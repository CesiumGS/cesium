"use strict";
const Cesium = require("cesium");
const { moveTechniquesToExtension } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;
describe("moveTechniquesToExtension", () => {
  it("moves techniques, shaders, and programs to extension", () => {
    const gltf = {
      programs: {
        program_0: {
          attributes: ["a_normal", "a_position", "a_texcoord0"],
          fragmentShader: "BoxTextured0FS",
          vertexShader: "BoxTextured0VS",
        },
        program_1: {
          attributes: ["a_normal", "a_position", "a_texcoord0"],
          fragmentShader: "BoxTextured1FS",
          vertexShader: "BoxTextured0VS",
        },
      },
      shaders: {
        BoxTextured0FS: {
          type: WebGLConstants.FRAGMENT_SHADER,
          uri: "BoxTextured0FS.glsl",
        },
        BoxTextured0VS: {
          type: WebGLConstants.VERTEX_SHADER,
          uri: "BoxTextured0VS.glsl",
        },
        BoxTextured1FS: {
          type: WebGLConstants.FRAGMENT_SHADER,
          uri: "BoxTextured1FS.glsl",
        },
      },
      techniques: {
        technique0: {
          attributes: {
            a_normal: "normal",
            a_position: "position",
            a_texcoord0: "texcoord0",
          },
          parameters: {
            diffuse: {
              type: WebGLConstants.SAMPLER_2D,
            },
            modelViewMatrix: {
              semantic: "MODELVIEW",
              type: WebGLConstants.FLOAT_MAT4,
            },
            normal: {
              semantic: "NORMAL",
              type: WebGLConstants.FLOAT_VEC3,
            },
            normalMatrix: {
              semantic: "MODELVIEWINVERSETRANSPOSE",
              type: WebGLConstants.FLOAT_MAT3,
            },
            position: {
              semantic: "POSITION",
              type: WebGLConstants.FLOAT_VEC3,
            },
            projectionMatrix: {
              semantic: "PROJECTION",
              type: WebGLConstants.FLOAT_MAT4,
            },
            shininess: {
              type: WebGLConstants.FLOAT,
            },
            specular: {
              type: WebGLConstants.FLOAT_VEC4,
            },
            texcoord0: {
              semantic: "TEXCOORD_0",
              type: WebGLConstants.FLOAT_VEC2,
            },
          },
          program: "program_0",
          states: {
            enable: [WebGLConstants.DEPTH_TEST, WebGLConstants.CULL_FACE],
          },
          uniforms: {
            u_diffuse: "diffuse",
            u_modelViewMatrix: "modelViewMatrix",
            u_normalMatrix: "normalMatrix",
            u_projectionMatrix: "projectionMatrix",
            u_shininess: "shininess",
            u_specular: "specular",
          },
        },
        technique1: {
          program: "program_1",
        },
        technique2: {
          parameters: {
            diffuse: {
              type: WebGLConstants.FLOAT_VEC4,
            },
          },
          program: "program_0",
          uniforms: {
            u_diffuse: "diffuse",
          },
        },
      },
      materials: [
        {
          name: "Texture",
          technique: "technique0",
          values: {
            diffuse: "texture_Image0001",
            shininess: 256,
            specular: [0.2, 0.2, 0.2, 1],
          },
        },
        {
          name: "Color",
          technique: "technique2",
          values: {
            diffuse: [0.2, 0.2, 0.2, 1],
          },
        },
      ],
    };

    const gltfWithTechniquesWebgl = moveTechniquesToExtension(gltf);
    expect(gltfWithTechniquesWebgl.extensions).toBeDefined();
    const techniques = gltfWithTechniquesWebgl.extensions.KHR_techniques_webgl;
    expect(techniques).toBeDefined();
    expect(techniques.techniques.length).toBe(3);

    const technique = techniques.techniques[0];
    const attributes = technique.attributes;
    expect(attributes).toBeDefined();
    expect(attributes.a_position.semantic).toBe("POSITION");

    const uniforms = technique.uniforms;
    expect(uniforms).toBeDefined();
    expect(uniforms.u_modelViewMatrix.semantic).toBe("MODELVIEW");
    expect(uniforms.u_modelViewMatrix.type).toBe(WebGLConstants.FLOAT_MAT4);

    expect(technique.program).toBe(0);
    expect(technique.parameters).toBeUndefined();
    expect(technique.states).toBeUndefined();

    expect(techniques.programs.length).toBe(2);
    const program = techniques.programs[technique.program];
    expect(program).toBeDefined();

    expect(techniques.shaders.length).toBe(3);
    expect(techniques.shaders[program.fragmentShader].type).toBe(
      WebGLConstants.FRAGMENT_SHADER,
    );
    expect(techniques.shaders[program.vertexShader].type).toBe(
      WebGLConstants.VERTEX_SHADER,
    );

    expect(gltfWithTechniquesWebgl.techniques).toBeUndefined();
    expect(gltfWithTechniquesWebgl.programs).toBeUndefined();
    expect(gltfWithTechniquesWebgl.shaders).toBeUndefined();

    const material = gltf.materials[0];
    expect(material.extensions).toBeDefined();
    const materialTechniques = material.extensions.KHR_techniques_webgl;
    expect(materialTechniques).toBeDefined();
    expect(materialTechniques.technique).toBe(0);
    expect(materialTechniques.values.u_shininess).toBe(256);
    expect(materialTechniques.values.u_diffuse).toBe("texture_Image0001");

    expect(material.technique).toBeUndefined();
    expect(material.values).toBeUndefined();

    const technique2 = techniques.techniques[1];
    const program2 = techniques.programs[technique2.program];
    expect(program2.vertexShader).toBe(program.vertexShader);
    expect(program2.fragmentShader).not.toBe(program.fragmentShader);

    const technique3 = techniques.techniques[2];
    expect(technique3.program).toBe(0);
    expect(technique3.uniforms.u_diffuse.type).toBe(WebGLConstants.FLOAT_VEC4);
    expect(
      gltf.materials[1].extensions.KHR_techniques_webgl.values.u_diffuse,
    ).toEqual([0.2, 0.2, 0.2, 1.0]);
  });
});
