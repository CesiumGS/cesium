import {
  Cartesian3,
  Color,
  defined,
  Ellipsoid,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  Resource,
  Material,
  MaterialAppearance,
  PolylineCollection,
  FeatureDetection,
  Primitive,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  DeveloperError,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/Material",
  function () {
    let scene;

    let polygon;
    const backgroundColor = [0, 0, 128, 255];
    let polylines;
    let polyline;

    beforeAll(function () {
      scene = createScene();
      Color.fromBytes(
        backgroundColor[0],
        backgroundColor[1],
        backgroundColor[2],
        backgroundColor[3],
        scene.backgroundColor,
      );
      scene.primitives.destroyPrimitives = false;
      scene.camera.setView({
        destination: Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0),
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      const vertexFormat = MaterialAppearance.MaterialSupport.ALL.vertexFormat;

      polygon = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            vertexFormat: vertexFormat,
            rectangle: Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0),
          }),
        }),
        asynchronous: false,
      });

      polygon.appearance = new MaterialAppearance({
        materialSupport: MaterialAppearance.MaterialSupport.ALL,
        translucent: false,
        closed: true,
      });

      polylines = new PolylineCollection();
      polyline = polylines.add({
        positions: Cartesian3.fromDegreesArray(
          [-50.0, 0.0, 50.0, 0.0],
          Ellipsoid.WGS84,
        ),
        width: 5.0,
      });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      polygon = polygon && polygon.destroy();
      polylines = polylines && polylines.destroy();
    });

    function itRenders(initialColor = backgroundColor) {
      it("renders", function () {
        expect(scene).toRender(initialColor);

        scene.primitives.removeAll();
        scene.primitives.add(polygon);

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(backgroundColor);
        });
      });
    }

    function renderMaterial(material, ignoreBackground, callback) {
      ignoreBackground = ignoreBackground ?? false;
      polygon.appearance.material = material;
      if (!ignoreBackground) {
        expect(scene).toRender(backgroundColor);
      }

      scene.primitives.removeAll();
      scene.primitives.add(polygon);

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        if (defined(callback)) {
          callback(rgba);
        }
      });
    }

    function verifyMaterial(type) {
      describe(`${type} built-in material`, function () {
        beforeEach(function () {
          const material = new Material({
            strict: true,
            fabric: {
              type: type,
            },
          });
          polygon.appearance.material = material;
        });

        itRenders();
      });
    }

    function verifyPolylineMaterial(type) {
      describe(`${type} built-in material`, function () {
        it("renders", function () {
          const material = new Material({
            strict: true,
            fabric: {
              type: type,
            },
          });

          polyline.material = material;
          expect(scene).toRender(backgroundColor);

          scene.primitives.removeAll();
          scene.primitives.add(polylines);

          expect(scene).notToRender(backgroundColor);
        });
      });
    }

    verifyMaterial("Color");
    verifyMaterial("Image");
    verifyMaterial("DiffuseMap");
    verifyMaterial("AlphaMap");
    verifyMaterial("SpecularMap");
    verifyMaterial("EmissionMap");
    verifyMaterial("BumpMap");
    verifyMaterial("NormalMap");
    verifyMaterial("Grid");
    verifyMaterial("Stripe");
    verifyMaterial("Checkerboard");
    verifyMaterial("Dot");
    verifyMaterial("Water");
    verifyMaterial("RimLighting");
    verifyMaterial("Fade");

    verifyPolylineMaterial("PolylineArrow");
    verifyPolylineMaterial("PolylineDash");
    verifyPolylineMaterial("PolylineGlow");
    verifyPolylineMaterial("PolylineOutline");

    it("gets the material type", function () {
      const material = new Material({
        strict: true,
        fabric: {
          type: "Color",
        },
      });
      expect(material.type).toEqual("Color");
    });

    it("creates opaque/translucent materials", function () {
      let material = new Material({
        translucent: true,
        strict: true,
        fabric: {
          type: "Color",
        },
      });
      expect(material.isTranslucent()).toEqual(true);

      material = new Material({
        translucent: false,
        strict: true,
        fabric: {
          type: "Color",
        },
      });
      expect(material.isTranslucent()).toEqual(false);
    });

    it("creates a new material type and builds off of it", function () {
      const material1 = new Material({
        strict: true,
        fabric: {
          type: "New",
          components: {
            diffuse: "vec3(0.0, 0.0, 0.0)",
          },
        },
      });

      const material2 = new Material({
        strict: true,
        fabric: {
          materials: {
            first: {
              type: "New",
            },
          },
          components: {
            diffuse: "first.diffuse",
          },
        },
      });

      renderMaterial(material1);
      renderMaterial(material2, true);
    });

    it("accesses material properties after construction", function () {
      const material = new Material({
        strict: true,
        fabric: {
          materials: {
            first: {
              type: "DiffuseMap",
            },
          },
          uniforms: {
            value: {
              x: 0.0,
              y: 0.0,
              z: 0.0,
            },
          },
          components: {
            diffuse: "value + first.diffuse",
          },
        },
      });
      material.uniforms.value.x = 1.0;
      material.materials.first.uniforms.repeat.x = 2.0;

      renderMaterial(material);
    });

    it("creates a material inside a material inside a material", function () {
      const material = new Material({
        strict: true,
        fabric: {
          materials: {
            first: {
              materials: {
                second: {
                  components: {
                    diffuse: "vec3(0.0, 0.0, 0.0)",
                  },
                },
              },
              components: {
                diffuse: "second.diffuse",
              },
            },
          },
          components: {
            diffuse: "first.diffuse",
          },
        },
      });
      renderMaterial(material);
    });

    it("creates a material with an image uniform", function () {
      const material = new Material({
        strict: true,
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: "./Data/Images/Blue.png",
          },
        },
      });
      renderMaterial(material);
    });

    it("creates a material with an image resource uniform", function () {
      const material = new Material({
        strict: true,
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: new Resource("./Data/Images/Blue.png"),
          },
        },
      });
      renderMaterial(material);
    });

    it("creates a material with an image canvas uniform", function () {
      const canvas = document.createElement("canvas");
      const context2D = canvas.getContext("2d");
      context2D.width = 1;
      context2D.height = 1;
      context2D.fillStyle = "rgb(0,0,255)";
      context2D.fillRect(0, 0, 1, 1);

      const material = new Material({
        strict: true,
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: canvas,
          },
        },
      });

      renderMaterial(material);
    });

    it("creates a material with an image offscreen canvas uniform", function () {
      const canvas = new OffscreenCanvas(1, 1);
      const context2D = canvas.getContext("2d");
      context2D.fillStyle = "rgb(0,0,255)";
      context2D.fillRect(0, 0, 1, 1);

      const material = new Material({
        strict: true,
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: canvas,
          },
        },
      });

      renderMaterial(material);
    });

    it("creates a material with an image bitmap", function () {
      const canvas = new OffscreenCanvas(1, 1);
      const context2D = canvas.getContext("2d");
      context2D.fillStyle = "rgb(0,0,255)";
      context2D.fillRect(0, 0, 1, 1);

      const material = new Material({
        strict: true,
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: canvas.transferToImageBitmap(),
          },
        },
      });

      renderMaterial(material);
    });

    it("creates a material with an KTX2 compressed image uniform", function () {
      let compressedUrl;
      if (FeatureDetection.supportsBasis(scene)) {
        compressedUrl = "./Data/Images/Green4x4.ktx2";
      } else {
        return;
      }

      const material = new Material({
        strict: true,
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: compressedUrl,
          },
        },
      });
      renderMaterial(material);
    });

    it("creates a material with a cube map uniform", function () {
      const material = new Material({
        strict: true,
        fabric: {
          uniforms: {
            cubeMap: {
              positiveX: "./Data/Images/Blue.png",
              negativeX: "./Data/Images/Blue.png",
              positiveY: "./Data/Images/Blue.png",
              negativeY: "./Data/Images/Blue.png",
              positiveZ: "./Data/Images/Blue.png",
              negativeZ: "./Data/Images/Blue.png",
            },
          },
          source:
            "uniform samplerCube cubeMap;\n" +
            "czm_material czm_getMaterial(czm_materialInput materialInput)\n" +
            "{\n" +
            "    czm_material material = czm_getDefaultMaterial(materialInput);\n" +
            "    material.diffuse = czm_textureCube(cubeMap, vec3(1.0)).xyz;\n" +
            "    return material;\n" +
            "}\n",
        },
      });
      renderMaterial(material);
    });

    it("does not crash if source uniform is formatted differently", function () {
      const material = new Material({
        strict: true,
        fabric: {
          uniforms: {
            cubeMap: {
              positiveX: "./Data/Images/Blue.png",
              negativeX: "./Data/Images/Blue.png",
              positiveY: "./Data/Images/Blue.png",
              negativeY: "./Data/Images/Blue.png",
              positiveZ: "./Data/Images/Blue.png",
              negativeZ: "./Data/Images/Blue.png",
            },
          },
          source:
            "uniform   samplerCube   cubeMap  ;\r\n" +
            "czm_material czm_getMaterial(czm_materialInput materialInput)\r\n" +
            "{\r\n" +
            "    czm_material material = czm_getDefaultMaterial(materialInput);\r\n" +
            "    material.diffuse = czm_textureCube(cubeMap, vec3(1.0)).xyz;\r\n" +
            "    return material;\r\n" +
            "}",
        },
      });
      renderMaterial(material);
    });

    it("creates a material with a boolean uniform", function () {
      const material = new Material({
        strict: true,
        fabric: {
          uniforms: {
            value: true,
          },
          components: {
            diffuse: "float(value) * vec3(1.0)",
          },
        },
      });
      renderMaterial(material);
    });

    it("create a material with a matrix uniform", function () {
      const material1 = new Material({
        strict: true,
        fabric: {
          uniforms: {
            value: [0.5, 0.5, 0.5, 0.5],
          },
          components: {
            diffuse: "vec3(value[0][0], value[0][1], value[1][0])",
            alpha: "value[1][1]",
          },
        },
      });
      renderMaterial(material1);

      const material2 = new Material({
        strict: true,
        fabric: {
          uniforms: {
            value: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
          },
          components: {
            diffuse: "vec3(value[0][0], value[0][1], value[1][0])",
            alpha: "value[2][2]",
          },
        },
      });
      renderMaterial(material2, true);

      const material3 = new Material({
        strict: true,
        fabric: {
          uniforms: {
            value: [
              0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
              0.5, 0.5, 0.5,
            ],
          },
          components: {
            diffuse: "vec3(value[0][0], value[0][1], value[1][0])",
            alpha: "value[3][3]",
          },
        },
      });
      renderMaterial(material3, true);
    });

    it("creates a material using unusual uniform and material names", function () {
      const material = new Material({
        strict: true,
        fabric: {
          uniforms: {
            i: 0.5,
          },
          materials: {
            d: {
              type: "Color",
            },
            diffuse: {
              type: "Color",
            },
          },
          components: {
            diffuse: "(d.diffuse + diffuse.diffuse)*i",
            specular: "i",
          },
        },
      });
      renderMaterial(material);
    });

    it("create a material using fromType", function () {
      const material = Material.fromType("Color");
      renderMaterial(material);
    });

    it("create material using fromType and overide default uniforms", function () {
      const material1 = Material.fromType("Color", {
        color: new Color(0.0, 1.0, 0.0, 1.0),
      });

      renderMaterial(material1, false, function (rgba) {
        expect(rgba).toEqual([0, 255, 0, 255]);
      });
    });

    it("create multiple materials from the same type", function () {
      const material1 = Material.fromType("Color", {
        color: new Color(0.0, 1.0, 0.0, 1.0),
      });

      const material2 = Material.fromType("Color", {
        color: new Color(1.0, 0.0, 0.0, 1.0),
      });

      expect(material1.shaderSource).toEqual(material2.shaderSource);

      renderMaterial(material2, false, function (rgba) {
        expect(rgba).toEqual([255, 0, 0, 255]);
      });
      renderMaterial(material1, true, function (rgba) {
        expect(rgba).toEqual([0, 255, 0, 255]);
      });
    });

    it("create material with sub-materials of the same type", function () {
      const material = new Material({
        fabric: {
          materials: {
            color1: {
              type: "Color",
              uniforms: {
                color: new Color(0.0, 1.0, 0.0, 1.0),
              },
            },
            color2: {
              type: "Color",
              uniforms: {
                color: new Color(0.0, 0.0, 1.0, 1.0),
              },
            },
          },
          components: {
            diffuse: "color1.diffuse + color2.diffuse",
          },
        },
      });

      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([0, 255, 255, 255]);
      });
    });

    it("creates a material using fromTypeAsync", async function () {
      const material = await Material.fromTypeAsync("Color");
      renderMaterial(material);
    });

    it("loads a 2D texture image synchronously when awaiting fromTypeAsync", async function () {
      const imageMaterial = await Material.fromTypeAsync("Image", {
        image: "./Data/Images/Blue.png",
      });
      renderMaterial(imageMaterial, false, function (rgba) {
        expect(rgba).toEqual([0, 0, 255, 255]);
      });
    });

    it("loads cubemap images synchronously when awaiting fromTypeAsync", async function () {
      // First make a material with a cubemap, then use its type to make a second cubemap material asynchronously.
      const material = new Material({
        strict: true,
        fabric: {
          uniforms: {
            cubeMap: {
              positiveX: "./Data/Images/Blue.png",
              negativeX: "./Data/Images/Blue.png",
              positiveY: "./Data/Images/Blue.png",
              negativeY: "./Data/Images/Blue.png",
              positiveZ: "./Data/Images/Blue.png",
              negativeZ: "./Data/Images/Blue.png",
            },
          },
          source:
            "uniform samplerCube cubeMap;\n" +
            "czm_material czm_getMaterial(czm_materialInput materialInput)\n" +
            "{\n" +
            "    czm_material material = czm_getDefaultMaterial(materialInput);\n" +
            "    material.diffuse = czm_textureCube(cubeMap, vec3(1.0)).xyz;\n" +
            "    return material;\n" +
            "}\n",
        },
      });

      const materialFromTypeAsync = await Material.fromTypeAsync(
        material.type,
        {
          cubeMap: {
            positiveX: "./Data/Images/Green.png",
            negativeX: "./Data/Images/Green.png",
            positiveY: "./Data/Images/Green.png",
            negativeY: "./Data/Images/Green.png",
            positiveZ: "./Data/Images/Green.png",
            negativeZ: "./Data/Images/Green.png",
          },
        },
      );

      renderMaterial(materialFromTypeAsync);
    });

    it("loads sub-materials synchronously when awaiting fromTypeAsync", async function () {
      // First make a material with submaterials, then use its type to make a second material asynchronously.
      const material = new Material({
        strict: true,
        fabric: {
          materials: {
            greenMaterial: {
              type: "Image",
              uniforms: {
                image: "./Data/Images/Green.png", // Green image
              },
            },
            blueMaterial: {
              type: "Image",
              uniforms: {
                image: "./Data/Images/Blue.png", // Blue image
              },
            },
          },
          components: {
            diffuse:
              "clamp(greenMaterial.diffuse + blueMaterial.diffuse, 0.0, 1.0)",
          },
        },
      });

      const materialFromTypeAsync = await Material.fromTypeAsync(material.type);
      renderMaterial(materialFromTypeAsync, false, function (rgba) {
        expect(rgba).toEqual([0, 255, 255, 255]); // Expect cyan from green + blue
      });
    });

    it("creates material with custom texture filter", async function () {
      const materialLinear = await Material.fromTypeAsync("DiffuseMap", {
        image: "./Data/Images/BlueOverRed.png",
      });
      materialLinear.minificationFilter = TextureMinificationFilter.LINEAR;
      materialLinear.magnificationFilter = TextureMagnificationFilter.LINEAR;

      const materialNearest = await Material.fromTypeAsync("DiffuseMap", {
        image: "./Data/Images/BlueOverRed.png",
      });
      materialNearest.minificationFilter = TextureMinificationFilter.NEAREST;
      materialNearest.magnificationFilter = TextureMagnificationFilter.NEAREST;

      const purple = [127, 0, 127, 255];

      const ignoreBackground = true;
      renderMaterial(materialLinear, ignoreBackground, function (rgba) {
        expect(rgba).toEqualEpsilon(purple, 1);
      });
      renderMaterial(materialNearest, ignoreBackground, function (rgba) {
        expect(rgba).not.toEqualEpsilon(purple, 1);
      });
    });

    it("handles when material image is undefined", function () {
      const material = Material.fromType(Material.ImageType, {
        image: undefined,
        color: Color.RED,
      });
      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 0, 0, 255]);
      });
    });

    it("handles when material image is set to default image", function () {
      const material = Material.fromType(Material.ImageType, {
        image: Material.DefaultImageId,
        color: Color.RED,
      });
      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 0, 0, 255]);
      });
    });

    it("handles when material image is changed from undefined to some image", function () {
      const material = Material.fromType(Material.ImageType, {
        image: undefined,
        color: Color.WHITE,
      });

      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 255, 255, 255]);
      });

      material.uniforms.image = "./Data/Images/Green.png";
      return pollToPromise(function () {
        renderMaterial(material, true);
        return material._textures["image"] !== material._defaultTexture;
      }).then(function () {
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
      });
    });

    it("handles when material image is changed from default to some image", function () {
      const material = Material.fromType(Material.ImageType, {
        image: Material.DefaultImageId,
        color: Color.WHITE,
      });

      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 255, 255, 255]);
      });

      material.uniforms.image = "./Data/Images/Green.png";
      return pollToPromise(function () {
        renderMaterial(material, true);
        return material._textures["image"] !== material._defaultTexture;
      }).then(function () {
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
      });
    });

    it("handles when material image is changed from some image to undefined", function () {
      const material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });

      return pollToPromise(function () {
        renderMaterial(material, true);
        return material._textures["image"] !== material._defaultTexture;
      }).then(function () {
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
        material.uniforms.image = undefined;
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([255, 255, 255, 255]);
        });
      });
    });

    it("handles when material image is changed from some image to default", function () {
      const material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });

      return pollToPromise(function () {
        renderMaterial(material, true);
        return material._textures["image"] !== material._defaultTexture;
      }).then(function () {
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
        material.uniforms.image = Material.DefaultImageId;
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([255, 255, 255, 255]);
        });
      });
    });

    it("handles when material image is changed from some image to another", function () {
      const material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });
      let greenTextureId;

      return pollToPromise(function () {
        renderMaterial(material, true);
        return material._textures["image"] !== material._defaultTexture;
      }).then(function () {
        greenTextureId = material._textures["image"].id;
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
        material.uniforms.image = "./Data/Images/Blue.png";
        return pollToPromise(function () {
          renderMaterial(material, true);
          return material._textures["image"].id !== greenTextureId;
        }).then(function () {
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([0, 0, 255, 255]);
          });
        });
      });
    });

    it("handles when material image is changed from some image to invalid image", function () {
      const material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });
      let greenTextureId;

      return pollToPromise(function () {
        renderMaterial(material, true);
        return material._textures["image"] !== material._defaultTexture;
      }).then(function () {
        greenTextureId = material._textures["image"].id;
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
        material.uniforms.image = "i_dont_exist.png";
        return pollToPromise(function () {
          renderMaterial(material, true);
          return material._textures["image"].id !== greenTextureId;
        }).then(function () {
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([255, 255, 255, 255]);
          });
        });
      });
    });

    it("throws with source and components in same template", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            components: {
              diffuse: "vec3(0.0, 0.0, 0.0)",
            },
            source:
              "czm_material czm_getMaterial(czm_materialInput materialInput)\n{\n" +
              "czm_material material = czm_getDefaultMaterial(materialInput);\n" +
              "return material;\n}\n",
          },
        });
      }).toThrowDeveloperError();

      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            type: "DiffuseMap",
            components: {
              diffuse: "vec3(0.0, 0.0, 0.0)",
            },
          },
        });
      }).toThrowDeveloperError();
    });

    it("throws with duplicate names in materials and uniforms", function () {
      expect(function () {
        return new Material({
          strict: false,
          fabric: {
            uniforms: {
              first: 0.0,
              second: 0.0,
            },
            materials: {
              second: {},
            },
          },
        });
      }).toThrowDeveloperError();
    });

    it("throws with invalid template type", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            invalid: 3.0,
          },
        });
      }).toThrowDeveloperError();
    });

    it("throws with invalid component type", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            components: {
              difuse: "vec3(0.0, 0.0, 0.0)",
            },
          },
        });
      }).toThrowDeveloperError();
    });

    it("throws with invalid uniform type", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            uniforms: {
              value: {
                x: 0.0,
                y: 0.0,
                z: 0.0,
                w: 0.0,
                t: 0.0,
              },
            },
          },
        });
      }).toThrowDeveloperError();

      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            uniforms: {
              value: [0.0, 0.0, 0.0, 0.0, 0.0],
            },
          },
        });
      }).toThrowDeveloperError();
    });

    it("throws with unused channels", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            uniforms: {
              nonexistant: "rgb",
            },
          },
        });
      }).toThrowDeveloperError();

      // If strict is false, unused uniform strings are ignored.
      const material = new Material({
        strict: false,
        fabric: {
          uniforms: {
            nonexistant: "rgb",
          },
        },
      });
      renderMaterial(material);
    });

    it("throws with unused uniform", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            uniforms: {
              first: {
                x: 0.0,
                y: 0.0,
                z: 0.0,
              },
            },
          },
        });
      }).toThrowDeveloperError();

      // If strict is false, unused uniforms are ignored.
      const material = new Material({
        strict: false,
        fabric: {
          uniforms: {
            first: {
              x: 0.0,
              y: 0.0,
              z: 0.0,
            },
          },
        },
      });
      renderMaterial(material);
    });

    it("throws with unused material", function () {
      expect(function () {
        return new Material({
          strict: true,
          fabric: {
            materials: {
              first: {
                type: "DiffuseMap",
              },
            },
          },
        });
      }).toThrowDeveloperError();

      // If strict is false, unused materials are ignored.
      const material = new Material({
        strict: false,
        fabric: {
          materials: {
            first: {
              type: "DiffuseMap",
            },
          },
        },
      });
      renderMaterial(material);
    });

    it("throws with invalid type sent to fromType", function () {
      expect(function () {
        return Material.fromType("Nothing");
      }).toThrowDeveloperError();
    });

    it("destroys material with texture", function () {
      const material = Material.fromType(Material.DiffuseMapType);
      material.uniforms.image = "./Data/Images/Green.png";

      renderMaterial(material);

      return pollToPromise(function () {
        const result = material._loadedImages.length !== 0;
        scene.renderForSpecs();
        return result;
      }).then(function () {
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
      });
    });

    it("destroys sub-materials", function () {
      const material = new Material({
        strict: true,
        fabric: {
          materials: {
            diffuseMap: {
              type: "DiffuseMap",
            },
          },
          uniforms: {
            value: {
              x: 0.0,
              y: 0.0,
              z: 0.0,
            },
          },
          components: {
            diffuse: "value + diffuseMap.diffuse",
          },
        },
      });
      material.materials.diffuseMap.uniforms.image = "./Data/Images/Green.png";

      renderMaterial(material);

      return pollToPromise(function () {
        const result = material.materials.diffuseMap._loadedImages.length !== 0;
        scene.renderForSpecs();
        return result;
      }).then(function () {
        const diffuseMap = material.materials.diffuseMap;
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
        expect(diffuseMap.isDestroyed()).toEqual(true);
      });
    });

    it("does not destroy default material", function () {
      const material = Material.fromType(Material.DiffuseMapType);
      renderMaterial(material);
      material.destroy();
    });

    it("throws when loaded async and image loading fails", async function () {
      spyOn(Resource.prototype, "fetchImage").and.callFake(function () {
        return Promise.reject(new DeveloperError("Image loading failed"));
      });

      await expectAsync(
        Material.fromTypeAsync("DiffuseMap", {
          image: "i_dont_exist.png",
        }),
      ).toBeRejectedWithDeveloperError("Image loading failed");
    });
  },
  "WebGL",
);
