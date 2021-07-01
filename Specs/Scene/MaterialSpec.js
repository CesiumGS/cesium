import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeometryInstance } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { RectangleGeometry } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Material } from "../../Source/Cesium.js";
import { MaterialAppearance } from "../../Source/Cesium.js";
import { PolylineCollection } from "../../Source/Cesium.js";
import { FeatureDetection } from "../../Source/Cesium.js";
import { Primitive } from "../../Source/Cesium.js";
import { TextureMagnificationFilter } from "../../Source/Cesium.js";
import { TextureMinificationFilter } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/Material",
  function () {
    var scene;

    var rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);
    var polygon;
    var backgroundColor = [0, 0, 128, 255];
    var polylines;
    var polyline;

    beforeAll(function () {
      scene = createScene();
      Color.fromBytes(
        backgroundColor[0],
        backgroundColor[1],
        backgroundColor[2],
        backgroundColor[3],
        scene.backgroundColor
      );
      scene.primitives.destroyPrimitives = false;
      scene.camera.setView({ destination: rectangle });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      var vertexFormat = MaterialAppearance.MaterialSupport.ALL.vertexFormat;

      polygon = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            vertexFormat: vertexFormat,
            rectangle: rectangle,
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
          Ellipsoid.WGS84
        ),
        width: 5.0,
      });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      polygon = polygon && polygon.destroy();
      polylines = polylines && polylines.destroy();
    });

    function renderMaterial(material, ignoreBackground, callback) {
      ignoreBackground = defaultValue(ignoreBackground, false);
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

    function renderPolylineMaterial(material) {
      polyline.material = material;
      expect(scene).toRender(backgroundColor);

      scene.primitives.removeAll();
      scene.primitives.add(polylines);

      var result;
      expect(scene).toRenderAndCall(function (rgba) {
        result = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });
      return result;
    }

    function verifyMaterial(type) {
      var material = new Material({
        strict: true,
        fabric: {
          type: type,
        },
      });
      renderMaterial(material);
    }

    function verifyPolylineMaterial(type) {
      var material = new Material({
        strict: true,
        fabric: {
          type: type,
        },
      });
      renderPolylineMaterial(material);
    }

    it("draws Color built-in material", function () {
      verifyMaterial("Color");
    });

    it("draws Image built-in material", function () {
      verifyMaterial("Image");
    });

    it("draws DiffuseMap built-in material", function () {
      verifyMaterial("DiffuseMap");
    });

    it("draws AlphaMap built-in material", function () {
      verifyMaterial("AlphaMap");
    });

    it("draws SpecularMap built-in material", function () {
      verifyMaterial("SpecularMap");
    });

    it("draws EmissionMap built-in material", function () {
      verifyMaterial("EmissionMap");
    });

    it("draws BumpMap built-in material", function () {
      verifyMaterial("BumpMap");
    });

    it("draws NormalMap built-in material", function () {
      verifyMaterial("NormalMap");
    });

    it("draws Grid built-in material", function () {
      verifyMaterial("Grid");
    });

    it("draws Stripe built-in material", function () {
      verifyMaterial("Stripe");
    });

    it("draws Checkerboard built-in material", function () {
      verifyMaterial("Checkerboard");
    });

    it("draws Dot built-in material", function () {
      verifyMaterial("Dot");
    });

    it("draws Water built-in material", function () {
      verifyMaterial("Water");
    });

    it("draws RimLighting built-in material", function () {
      verifyMaterial("RimLighting");
    });

    it("draws Fade built-in material", function () {
      verifyMaterial("Fade");
    });

    it("draws PolylineArrow built-in material", function () {
      verifyPolylineMaterial("PolylineArrow");
    });

    it("draws PolylineDash built-in material", function () {
      verifyPolylineMaterial("PolylineDash");
    });

    it("draws PolylineGlow built-in material", function () {
      verifyPolylineMaterial("PolylineGlow");
    });

    it("draws PolylineOutline built-in material", function () {
      verifyPolylineMaterial("PolylineOutline");
    });

    it("gets the material type", function () {
      var material = new Material({
        strict: true,
        fabric: {
          type: "Color",
        },
      });
      expect(material.type).toEqual("Color");
    });

    it("creates opaque/translucent materials", function () {
      var material = new Material({
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
      var material1 = new Material({
        strict: true,
        fabric: {
          type: "New",
          components: {
            diffuse: "vec3(0.0, 0.0, 0.0)",
          },
        },
      });

      var material2 = new Material({
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
      var material = new Material({
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
      var material = new Material({
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
      var material = new Material({
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
      var material = new Material({
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
      var canvas = document.createElement("canvas");
      var context2D = canvas.getContext("2d");
      context2D.width = 1;
      context2D.height = 1;
      context2D.fillStyle = "rgb(0,0,255)";
      context2D.fillRect(0, 0, 1, 1);

      var material = new Material({
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

    it("creates a material with an KTX2 compressed image uniform", function () {
      var compressedUrl;
      if (FeatureDetection.supportsBasis(scene)) {
        compressedUrl = "./Data/Images/Green4x4.ktx2";
      } else {
        return;
      }

      var material = new Material({
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
      var material = new Material({
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
            "    material.diffuse = textureCube(cubeMap, vec3(1.0)).xyz;\n" +
            "    return material;\n" +
            "}\n",
        },
      });
      renderMaterial(material);
    });

    it("does not crash if source uniform is formatted differently", function () {
      var material = new Material({
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
            "    material.diffuse = textureCube(cubeMap, vec3(1.0)).xyz;\r\n" +
            "    return material;\r\n" +
            "}",
        },
      });
      renderMaterial(material);
    });

    it("creates a material with a boolean uniform", function () {
      var material = new Material({
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
      var material1 = new Material({
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

      var material2 = new Material({
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

      var material3 = new Material({
        strict: true,
        fabric: {
          uniforms: {
            value: [
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
              0.5,
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
      var material = new Material({
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
      var material = Material.fromType("Color");
      renderMaterial(material);
    });

    it("create material using fromType and overide default uniforms", function () {
      var material1 = Material.fromType("Color", {
        color: new Color(0.0, 1.0, 0.0, 1.0),
      });

      renderMaterial(material1, false, function (rgba) {
        expect(rgba).toEqual([0, 255, 0, 255]);
      });
    });

    it("create multiple materials from the same type", function () {
      var material1 = Material.fromType("Color", {
        color: new Color(0.0, 1.0, 0.0, 1.0),
      });

      var material2 = Material.fromType("Color", {
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
      var material = new Material({
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

    it("creates material with custom texture filter", function () {
      var materialLinear = new Material({
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: "./Data/Images/BlueOverRed.png",
          },
        },
        minificationFilter: TextureMinificationFilter.LINEAR,
        magnificationFilter: TextureMagnificationFilter.LINEAR,
      });

      var materialNearest = new Material({
        fabric: {
          type: "DiffuseMap",
          uniforms: {
            image: "./Data/Images/BlueOverRed.png",
          },
        },
        minificationFilter: TextureMinificationFilter.NEAREST,
        magnificationFilter: TextureMagnificationFilter.NEAREST,
      });

      var purple = [127, 0, 127, 255];

      var ignoreBackground = true;
      renderMaterial(materialLinear, ignoreBackground); // Populate the scene with the primitive prior to updating
      return pollToPromise(function () {
        var imageLoaded = materialLinear._loadedImages.length !== 0;
        scene.renderForSpecs();
        return imageLoaded;
      })
        .then(function () {
          renderMaterial(materialLinear, ignoreBackground, function (rgba) {
            expect(rgba).toEqualEpsilon(purple, 1);
          });
        })
        .then(function () {
          renderMaterial(materialNearest, ignoreBackground); // Populate the scene with the primitive prior to updating
          return pollToPromise(function () {
            var imageLoaded = materialNearest._loadedImages.length !== 0;
            scene.renderForSpecs();
            return imageLoaded;
          }).then(function () {
            renderMaterial(materialNearest, ignoreBackground, function (rgba) {
              expect(rgba).not.toEqualEpsilon(purple, 1);
            });
          });
        });
    });

    it("handles when material image is undefined", function () {
      var material = Material.fromType(Material.ImageType, {
        image: undefined,
        color: Color.RED,
      });
      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 0, 0, 255]);
      });
    });

    it("handles when material image is set to default image", function () {
      var material = Material.fromType(Material.ImageType, {
        image: Material.DefaultImageId,
        color: Color.RED,
      });
      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 0, 0, 255]);
      });
    });

    it("handles when material image is changed from undefined to some image", function () {
      var material = Material.fromType(Material.ImageType, {
        image: undefined,
        color: Color.WHITE,
      });

      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 255, 255, 255]);
      });

      material.uniforms.image = "./Data/Images/Green.png";
      return pollToPromise(
        function () {
          renderMaterial(material, true);
          return material._textures["image"] !== material._defaultTexture;
        },
        { timeout: 10000 }
      ).then(function () {
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
      });
    });

    it("handles when material image is changed from default to some image", function () {
      var material = Material.fromType(Material.ImageType, {
        image: Material.DefaultImageId,
        color: Color.WHITE,
      });

      renderMaterial(material, false, function (rgba) {
        expect(rgba).toEqual([255, 255, 255, 255]);
      });

      material.uniforms.image = "./Data/Images/Green.png";
      return pollToPromise(
        function () {
          renderMaterial(material, true);
          return material._textures["image"] !== material._defaultTexture;
        },
        { timeout: 10000 }
      ).then(function () {
        renderMaterial(material, true, function (rgba) {
          expect(rgba).toEqual([0, 255, 0, 255]);
        });
      });
    });

    it("handles when material image is changed from some image to undefined", function () {
      var material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });

      return pollToPromise(
        function () {
          renderMaterial(material, true);
          return material._textures["image"] !== material._defaultTexture;
        },
        { timeout: 10000 }
      )
        .then(function () {
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([0, 255, 0, 255]);
          });
        })
        .then(function () {
          material.uniforms.image = undefined;
        })
        .then(function () {
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([255, 255, 255, 255]);
          });
        });
    });

    it("handles when material image is changed from some image to default", function () {
      var material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });

      return pollToPromise(
        function () {
          renderMaterial(material, true);
          return material._textures["image"] !== material._defaultTexture;
        },
        { timeout: 10000 }
      )
        .then(function () {
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([0, 255, 0, 255]);
          });
        })
        .then(function () {
          material.uniforms.image = Material.DefaultImageId;
        })
        .then(function () {
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([255, 255, 255, 255]);
          });
        });
    });

    it("handles when material image is changed from some image to another", function () {
      var material = Material.fromType(Material.ImageType, {
        image: "./Data/Images/Green.png",
        color: Color.WHITE,
      });
      var greenTextureId;

      return pollToPromise(
        function () {
          renderMaterial(material, true);
          return material._textures["image"] !== material._defaultTexture;
        },
        { timeout: 10000 }
      )
        .then(function () {
          greenTextureId = material._textures["image"].id;
          renderMaterial(material, true, function (rgba) {
            expect(rgba).toEqual([0, 255, 0, 255]);
          });
        })
        .then(function () {
          material.uniforms.image = "./Data/Images/Blue.png";
        })
        .then(function () {
          return pollToPromise(
            function () {
              renderMaterial(material, true);
              return material._textures["image"].id !== greenTextureId;
            },
            { timeout: 10000 }
          ).then(function () {
            renderMaterial(material, true, function (rgba) {
              expect(rgba).toEqual([0, 0, 255, 255]);
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
      var material = new Material({
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
      var material = new Material({
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
      var material = new Material({
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
      var material = Material.fromType(Material.DiffuseMapType);
      material.uniforms.image = "./Data/Images/Green.png";

      renderMaterial(material);

      return pollToPromise(function () {
        var result = material._loadedImages.length !== 0;
        scene.renderForSpecs();
        return result;
      }).then(function () {
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
      });
    });

    it("destroys sub-materials", function () {
      var material = new Material({
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
        var result = material.materials.diffuseMap._loadedImages.length !== 0;
        scene.renderForSpecs();
        return result;
      }).then(function () {
        var diffuseMap = material.materials.diffuseMap;
        material.destroy();
        expect(material.isDestroyed()).toEqual(true);
        expect(diffuseMap.isDestroyed()).toEqual(true);
      });
    });

    it("does not destroy default material", function () {
      var material = Material.fromType(Material.DiffuseMapType);
      renderMaterial(material);
      material.destroy();
    });
  },
  "WebGL"
);
