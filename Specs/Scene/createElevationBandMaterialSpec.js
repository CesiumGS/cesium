import { Cartesian4 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { createElevationBandMaterial } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { TextureMinificationFilter } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe("Scene/createElevationBandMaterial", function () {
  var scene;
  var isHeightDataPacked;
  var heightData;
  var colorData;

  beforeAll(function () {
    scene = createScene();

    // Color and height textures are differentiated by the sampler filter.
    spyOn(Texture, "create").and.callFake(function (options) {
      var data = options.source.arrayBufferView;
      if (
        options.sampler.minificationFilter === TextureMinificationFilter.NEAREST
      ) {
        heightData = data;
        isHeightDataPacked = options.pixelFormat === PixelFormat.RGBA;
      } else if (
        options.sampler.minificationFilter === TextureMinificationFilter.LINEAR
      ) {
        colorData = data;
      }
    });
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  function checkTextureDimensions(expectedDimension) {
    var colorDimension = colorData.length / 4;
    expect(colorDimension).toEqual(expectedDimension);

    var heightDimension = isHeightDataPacked
      ? heightData.length / 4
      : heightData.length;
    expect(heightDimension).toEqual(expectedDimension);
  }
  function checkTexel(texel, expectedColor, expectedHeight) {
    var r = colorData[texel * 4 + 0];
    var g = colorData[texel * 4 + 1];
    var b = colorData[texel * 4 + 2];
    var a = colorData[texel * 4 + 3];
    var color = [r, g, b, a];

    // The texture stores colors as premultiplied alpha, so we need to convert
    // the expected color to premultiplied alpha before comparing.
    var premulipliedColor = Color.clone(expectedColor, new Color());
    premulipliedColor.red *= premulipliedColor.alpha;
    premulipliedColor.green *= premulipliedColor.alpha;
    premulipliedColor.blue *= premulipliedColor.alpha;

    expect(color).toEqualEpsilon(premulipliedColor.toBytes(), 1);

    var height = isHeightDataPacked
      ? Cartesian4.unpackFloat(Cartesian4.unpack(heightData, texel * 4))
      : heightData[texel];
    expect(height).toEqualEpsilon(expectedHeight, CesiumMath.EPSILON5);
  }

  it("throws without scene", function () {
    expect(function () {
      createElevationBandMaterial();
    }).toThrowDeveloperError();
  });

  it("throws without layers", function () {
    expect(function () {
      createElevationBandMaterial({
        scene: scene,
      });
    }).toThrowDeveloperError();

    var layers = [];
    expect(function () {
      createElevationBandMaterial({
        scene: scene,
        layers: layers,
      });
    }).toThrowDeveloperError();
  });

  it("throws with no entries", function () {
    var layers = [
      {
        entries: [],
      },
    ];

    expect(function () {
      createElevationBandMaterial({
        scene: scene,
        layers: layers,
      });
    }).toThrowDeveloperError();
  });

  it("throws with no height", function () {
    var layers = [
      {
        entries: [
          {
            color: Color.RED,
          },
        ],
      },
    ];

    expect(function () {
      createElevationBandMaterial({
        scene: scene,
        layers: layers,
      });
    }).toThrowDeveloperError();
  });

  it("throws with no color", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
          },
        ],
      },
    ];

    expect(function () {
      createElevationBandMaterial({
        scene: scene,
        layers: layers,
      });
    }).toThrowDeveloperError();
  });

  it("creates material with one entry", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
            color: Color.RED,
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, Color.RED, createElevationBandMaterial._maximumHeight);
    checkTexel(0, Color.RED, createElevationBandMaterial._minimumHeight);
  });

  it("creates material with one entry that extends upwards", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
            color: Color.RED,
          },
        ],
        extendUpwards: true,
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, Color.RED, createElevationBandMaterial._maximumHeight);
    checkTexel(0, Color.RED, 0.0);
  });

  it("creates material with one entry that extends downwards", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
            color: Color.RED,
          },
        ],
        extendDownwards: true,
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, Color.RED, 0.0);
    checkTexel(0, Color.RED, createElevationBandMaterial._minimumHeight);
  });

  it("creates material with one entry that extends upwards and downwards", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
            color: Color.RED,
          },
        ],
        extendUpwards: true,
        extendDownwards: true,
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, Color.RED, createElevationBandMaterial._maximumHeight);
    checkTexel(0, Color.RED, createElevationBandMaterial._minimumHeight);
  });

  it("removes unused entries", function () {
    var layers = [
      {
        entries: [
          {
            height: 3.0,
            color: new Color(1, 0, 0, 1),
          },
          {
            height: 3.0,
            color: new Color(0, 1, 0, 1),
          },
          {
            height: 2.0,
            color: new Color(0, 1, 0, 1),
          },
          {
            height: 1.0,
            color: new Color(0, 1, 0, 1),
          },
          {
            height: 0.0,
            color: new Color(0, 1, 0, 1),
          },
          {
            height: 0.0,
            color: new Color(1, 0, 0, 1),
          },
          {
            height: 0.0,
            color: new Color(0, 1, 0, 1),
          },
          {
            height: 0.0,
            color: new Color(1, 0, 0, 1),
          },
          {
            height: 0.0,
            color: new Color(1, 0, 0, 1),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, new Color(0, 1, 0, 1), 3.0);
    checkTexel(0, new Color(0, 1, 0, 1), 0.0);
  });

  it("sorts entries", function () {
    var layers = [
      {
        entries: [
          {
            height: 1.0,
            color: new Color(0, 1, 0, 1),
          },
          {
            height: 2.0,
            color: new Color(0, 0, 1, 1),
          },
          {
            height: 0.0,
            color: new Color(1, 0, 0, 1),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(3);
    checkTexel(2, new Color(0, 0, 1, 1), 2.0);
    checkTexel(1, new Color(0, 1, 0, 1), 1.0);
    checkTexel(0, new Color(1, 0, 0, 1), 0.0);
  });

  it("creates material with antialiased band", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1, 0, 0, 0),
          },
          {
            height: +0.9,
            color: new Color(1, 0, 0, 1),
          },
          {
            height: -0.9,
            color: new Color(1, 0, 0, 1),
          },
          {
            height: -1.0,
            color: new Color(1, 0, 0, 0),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(4);
    checkTexel(3, new Color(1, 0, 0, 0), +1.0);
    checkTexel(2, new Color(1, 0, 0, 1), +0.9);
    checkTexel(1, new Color(1, 0, 0, 1), -0.9);
    checkTexel(0, new Color(1, 0, 0, 0), -1.0);
  });

  it("creates material with one layer completely before another", function () {
    var layers = [
      {
        entries: [
          {
            height: 1.0,
            color: Color.RED,
          },
          {
            height: 2.0,
            color: Color.RED,
          },
        ],
      },
      {
        entries: [
          {
            height: -1.0,
            color: Color.BLUE,
          },
          {
            height: -2.0,
            color: Color.BLUE,
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(6);
    checkTexel(5, Color.RED, +2.0);
    checkTexel(4, Color.RED, +1.0);
    checkTexel(3, createElevationBandMaterial._emptyColor, +1.0);
    checkTexel(2, createElevationBandMaterial._emptyColor, -1.0);
    checkTexel(1, Color.BLUE, -1.0);
    checkTexel(0, Color.BLUE, -2.0);
  });

  it("creates material with one layer completely after another", function () {
    var layers = [
      {
        entries: [
          {
            height: -1.0,
            color: Color.BLUE,
          },
          {
            height: -2.0,
            color: Color.BLUE,
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: Color.RED,
          },
          {
            height: +2.0,
            color: Color.RED,
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(6);
    checkTexel(5, Color.RED, +2.0);
    checkTexel(4, Color.RED, +1.0);
    checkTexel(3, createElevationBandMaterial._emptyColor, +1.0);
    checkTexel(2, createElevationBandMaterial._emptyColor, -1.0);
    checkTexel(1, Color.BLUE, -1.0);
    checkTexel(0, Color.BLUE, -2.0);
  });

  it("creates material with larger transparent layer on top of solid color layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +2.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: -2.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(6);
    checkTexel(5, new Color(1.0, 0.0, 0.0, 0.5), +2.0);
    checkTexel(4, new Color(1.0, 0.0, 0.0, 0.5), +1.0);
    checkTexel(3, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), -1.0);
    checkTexel(1, new Color(1.0, 0.0, 0.0, 0.5), -1.0);
    checkTexel(0, new Color(1.0, 0.0, 0.0, 0.5), -2.0);
  });

  it("creates material with smaller transparent layer on top of solid color layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +2.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: -2.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(6);
    checkTexel(5, new Color(1.0, 1.0, 1.0, 1.0), +2.0);
    checkTexel(4, new Color(1.0, 1.0, 1.0, 1.0), +1.0);
    checkTexel(3, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), -1.0);
    checkTexel(1, new Color(1.0, 1.0, 1.0, 1.0), -1.0);
    checkTexel(0, new Color(1.0, 1.0, 1.0, 1.0), -2.0);
  });

  it("creates material with transparent bi-color layer on top of bi-color layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(4);
    checkTexel(3, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), 0.0);
    checkTexel(1, new Color(0.0, 0.5, 0.0, 1.0), 0.0);
    checkTexel(0, new Color(0.0, 0.5, 0.0, 1.0), -1.0);
  });

  it("creates material with transparent bi-color layer on top of gradient layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(4);
    checkTexel(3, new Color(0.5, 0.0, 0.0, 1.0), +1.0);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), 0.0);
    checkTexel(1, new Color(0.5, 1.0, 0.5, 1.0), 0.0);
    checkTexel(0, new Color(0.0, 0.5, 0.0, 1.0), -1.0);
  });

  it("creates material with transparent gradient layer on top of bi-color layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(4);
    checkTexel(3, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(2, new Color(0.5, 1.0, 0.5, 1.0), 0.0);
    checkTexel(1, new Color(0.0, 0.5, 0.0, 1.0), 0.0);
    checkTexel(0, new Color(0.5, 0.0, 0.0, 1.0), -1.0);
  });

  it("creates material with transparent gradient layer on top of gradient layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(3);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(1, new Color(0.0, 0.5, 0.0, 1.0), 0.0);
    checkTexel(0, new Color(1.0, 0.5, 0.5, 1.0), -1.0);
  });

  it("creates material with transparent gradient layer on top of solid color layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(3);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(1, new Color(0.5, 1.0, 0.5, 1.0), 0.0);
    checkTexel(0, new Color(1.0, 0.5, 0.5, 1.0), -1.0);
  });

  it("creates material with transparent layer on top of gradient layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(1.0, 1.0, 1.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(3);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), +1.0);
    checkTexel(1, new Color(0.5, 1.0, 0.5, 1.0), 0.0);
    checkTexel(0, new Color(1.0, 0.5, 0.5, 1.0), -1.0);
  });

  it("creates material with higher layer starting and ending on middle of lower layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: +0.5,
            color: new Color(1.0, 1.0, 1.0, 1.0),
          },
          {
            height: -0.5,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
          {
            height: -1.0,
            color: new Color(0.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +0.5,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: -0.5,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(6);
    checkTexel(5, new Color(1.0, 1.0, 1.0, 1.0), +1.0);
    checkTexel(4, new Color(1.0, 1.0, 1.0, 1.0), +0.5);
    checkTexel(3, new Color(1.0, 0.5, 0.5, 1.0), +0.5);
    checkTexel(2, new Color(0.0, 0.5, 0.0, 1.0), -0.5);
    checkTexel(1, new Color(0.0, 0.0, 0.0, 1.0), -0.5);
    checkTexel(0, new Color(0.0, 0.0, 0.0, 1.0), -1.0);
  });

  it("creates material with lower layer starting and ending on middle of higher layer", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: Color.WHITE,
          },
          {
            height: -1.0,
            color: Color.WHITE,
          },
        ],
      },
      {
        entries: [
          {
            height: +2.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: +1.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -2.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(6);
    checkTexel(5, new Color(1.0, 0.0, 0.0, 0.5), +2.0);
    checkTexel(4, new Color(0.0, 1.0, 0.0, 0.5), +1.0);
    checkTexel(3, new Color(0.5, 1.0, 0.5, 1.0), +1.0);
    checkTexel(2, new Color(0.5, 1.0, 0.5, 1.0), -1.0);
    checkTexel(1, new Color(0.0, 1.0, 0.0, 0.5), -1.0);
    checkTexel(0, new Color(1.0, 0.0, 0.0, 0.5), -2.0);
  });

  it("creates multi-layered material", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: Color.BLACK,
          },
          {
            height: 0.0,
            color: Color.WHITE,
          },
          {
            height: -1.0,
            color: Color.BLACK,
          },
        ],
      },
      {
        entries: [
          {
            height: +2.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
          {
            height: -2.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +0.5,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: 0.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
        ],
      },
      {
        entries: [
          {
            height: 0.0,
            color: new Color(0.0, 0.0, 1.0, 0.5),
          },
          {
            height: -0.5,
            color: new Color(0.0, 0.0, 1.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(12);
    checkTexel(11, new Color(1.0, 0.0, 0.0, 1.0), +2.0);
    checkTexel(10, new Color(1.0, 0.0, 0.0, 1.0), +1.0);
    checkTexel(9, new Color(0.0, 0.0, 0.0, 1.0), +1.0);
    checkTexel(8, new Color(0.5, 0.5, 0.5, 1.0), +0.5);
    checkTexel(7, new Color(0.25, 0.75, 0.25, 1.0), +0.5);
    checkTexel(6, new Color(0.5, 1.0, 0.5, 1.0), 0.0);
    checkTexel(5, new Color(0.5, 0.5, 1.0, 1.0), 0.0);
    checkTexel(4, new Color(0.25, 0.25, 0.75, 1.0), -0.5);
    checkTexel(3, new Color(0.5, 0.5, 0.5, 1.0), -0.5);
    checkTexel(2, new Color(0.0, 0.0, 0.0, 1.0), -1.0);
    checkTexel(1, new Color(1.0, 0.0, 0.0, 1.0), -1.0);
    checkTexel(0, new Color(1.0, 0.0, 0.0, 1.0), -2.0);
  });

  it("creates another multi-layered material", function () {
    var layers = [
      {
        entries: [
          {
            height: +1.0,
            color: Color.BLACK,
          },
          {
            height: 0.0,
            color: Color.BLACK,
          },
          {
            height: 0.0,
            color: Color.WHITE,
          },
          {
            height: -1.0,
            color: Color.WHITE,
          },
        ],
      },
      {
        entries: [
          {
            height: 0.5,
            color: new Color(0.0, 0.0, 1.0, 1.0),
          },
          {
            height: 0.0,
            color: new Color(0.0, 0.0, 1.0, 1.0),
          },
        ],
      },
      {
        entries: [
          {
            height: +1.1,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: +1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: +1.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: +0.9,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
        ],
      },
      {
        entries: [
          {
            height: -0.9,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
          {
            height: -1.0,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
          {
            height: -1.1,
            color: new Color(0.0, 1.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(14);
    checkTexel(13, new Color(1.0, 0.0, 0.0, 0.5), +1.1);
    checkTexel(12, new Color(1.0, 0.0, 0.0, 0.5), +1.0);
    checkTexel(11, new Color(0.0, 0.5, 0.0, 1.0), +1.0);
    checkTexel(10, new Color(0.0, 0.5, 0.0, 1.0), +0.9);
    checkTexel(9, new Color(0.0, 0.0, 0.0, 1.0), +0.9);
    checkTexel(8, new Color(0.0, 0.0, 0.0, 1.0), 0.5);
    checkTexel(7, new Color(0.0, 0.0, 1.0, 1.0), 0.5);
    checkTexel(6, new Color(0.0, 0.0, 1.0, 1.0), 0.0);
    checkTexel(5, new Color(1.0, 1.0, 1.0, 1.0), 0.0);
    checkTexel(4, new Color(1.0, 1.0, 1.0, 1.0), -0.9);
    checkTexel(3, new Color(1.0, 0.5, 0.5, 1.0), -0.9);
    checkTexel(2, new Color(1.0, 0.5, 0.5, 1.0), -1.0);
    checkTexel(1, new Color(0.0, 1.0, 0.0, 0.5), -1.0);
    checkTexel(0, new Color(0.0, 1.0, 0.0, 0.5), -1.1);
  });

  it("creates material with complex layers", function () {
    var layers = [
      {
        entries: [
          {
            height: +1000.0,
            color: Color.WHITE,
          },
          {
            height: -1000.0,
            color: Color.BLACK,
          },
        ],
        extendDownwards: true,
      },
      {
        entries: [
          {
            height: +500.0,
            color: new Color(1.0, 0.0, 0.0, 1.0),
          },
          {
            height: -500.0,
            color: new Color(1.0, 0.0, 0.0, 0.5),
          },
        ],
      },
    ];

    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(7);
    checkTexel(6, new Color(1, 1, 1, 1), +1000.0);
    checkTexel(5, new Color(0.75, 0.75, 0.75, 1), +500.0);
    checkTexel(4, new Color(1, 0, 0, 1), +500.0);
    checkTexel(3, new Color(0.625, 0.125, 0.125, 1), -500.0);
    checkTexel(2, new Color(0.25, 0.25, 0.25, 1), -500.0);
    checkTexel(1, new Color(0, 0, 0, 1), -1000.0);
    checkTexel(
      0,
      new Color(0, 0, 0, 1),
      createElevationBandMaterial._minimumHeight
    );
  });

  it("creates material with unpacked height", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
            color: Color.RED,
          },
          {
            height: 1.0,
            color: Color.RED,
          },
        ],
      },
    ];

    spyOn(createElevationBandMaterial, "_useFloatTexture").and.returnValue(
      false
    );
    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, Color.RED, 1.0);
    checkTexel(0, Color.RED, 0.0);
  });

  it("creates material with packed height", function () {
    var layers = [
      {
        entries: [
          {
            height: 0.0,
            color: Color.RED,
          },
          {
            height: 1.0,
            color: Color.RED,
          },
        ],
      },
    ];

    spyOn(createElevationBandMaterial, "_useFloatTexture").and.returnValue(
      true
    );
    createElevationBandMaterial({
      scene: scene,
      layers: layers,
    });

    checkTextureDimensions(2);
    checkTexel(1, Color.RED, 1.0);
    checkTexel(0, Color.RED, 0.0);
  });
});
