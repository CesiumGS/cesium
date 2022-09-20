import { Cartesian4, Color } from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/Color", function () {
  it("Constructing without arguments produces expected defaults", function () {
    const v = new Color();
    expect(v.red).toEqual(1.0);
    expect(v.green).toEqual(1.0);
    expect(v.blue).toEqual(1.0);
    expect(v.alpha).toEqual(1.0);
  });

  it("Constructing with arguments sets property values", function () {
    const v = new Color(0.1, 0.2, 0.3, 0.4);
    expect(v.red).toEqual(0.1);
    expect(v.green).toEqual(0.2);
    expect(v.blue).toEqual(0.3);
    expect(v.alpha).toEqual(0.4);
  });

  it("fromBytes without arguments produces expected defaults", function () {
    const v = new Color();
    expect(v.red).toEqual(1.0);
    expect(v.green).toEqual(1.0);
    expect(v.blue).toEqual(1.0);
    expect(v.alpha).toEqual(1.0);
  });

  it("fromBytes with arguments sets property values", function () {
    const v = Color.fromBytes(0, 255, 51, 102);
    expect(v.red).toEqual(0.0);
    expect(v.green).toEqual(1.0);
    expect(v.blue).toEqual(0.2);
    expect(v.alpha).toEqual(0.4);
  });

  it("fromBytes works with result parameter", function () {
    const result = new Color();
    const v = Color.fromBytes(0, 255, 51, 102, result);
    expect(v).toBe(result);
    expect(v.red).toEqual(0.0);
    expect(v.green).toEqual(1.0);
    expect(v.blue).toEqual(0.2);
    expect(v.alpha).toEqual(0.4);
  });

  it("toBytes returns the same values that fromBytes took", function () {
    const r = 5;
    const g = 87;
    const b = 23;
    const a = 88;
    const c = Color.fromBytes(r, g, b, a);
    const bytes = c.toBytes();
    expect(bytes).toEqual([r, g, b, a]);
  });

  it("toBytes works with a result parameter", function () {
    const color = new Color(0.1, 0.2, 0.3, 0.4);
    const result = [];
    const expectedResult = [25, 51, 76, 102];
    const returnedResult = color.toBytes(result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expectedResult);
  });

  it("byteToFloat works in all cases", function () {
    expect(Color.byteToFloat(0)).toEqual(0);
    expect(Color.byteToFloat(255)).toEqual(1.0);
    expect(Color.byteToFloat(127)).toEqual(127 / 255);
  });

  it("floatToByte works in all cases", function () {
    expect(Color.floatToByte(0)).toEqual(0);
    expect(Color.floatToByte(1.0)).toEqual(255);
    expect(Color.floatToByte(127 / 255)).toEqual(127);
  });

  it("fromCartesian4 returns a color with corrrect values", function () {
    const color = Color.fromCartesian4(new Cartesian4(1.0, 2.0, 3.0, 4.0));
    expect(color).toEqual(new Color(1.0, 2.0, 3.0, 4.0));
  });

  it("fromCartesian4 result param returns color with correct values", function () {
    const color = new Color();
    const result = Color.fromCartesian4(
      new Cartesian4(1.0, 2.0, 3.0, 4.0),
      color
    );
    expect(color).toBe(result);
    expect(color).toEqual(new Color(1.0, 2.0, 3.0, 4.0));
  });

  it("fromCartesian4 throws without a Cartesian4", function () {
    expect(function () {
      Color.fromCartesian4();
    }).toThrowDeveloperError();
  });

  it("clone with no parameters returns a new identical copy.", function () {
    const v = new Color(0.1, 0.2, 0.3, 0.4);
    const clone = v.clone();
    expect(clone).toEqual(v);
    expect(clone).not.toBe(v);
  });

  it("clone with a parameter modifies the parameter.", function () {
    const v = new Color(0.1, 0.2, 0.3, 0.4);
    const v2 = new Color();
    const clone = v.clone(v2);
    expect(clone).toEqual(v2);
    expect(clone).toBe(v2);
  });

  it("equals works", function () {
    const v = new Color(0.1, 0.2, 0.3, 0.4);
    const v2 = new Color(0.1, 0.2, 0.3, 0.4);
    const v3 = new Color(0.1, 0.2, 0.3, 0.5);
    const v4 = new Color(0.1, 0.2, 0.5, 0.4);
    const v5 = new Color(0.1, 0.5, 0.3, 0.4);
    const v6 = new Color(0.5, 0.2, 0.3, 0.4);
    expect(v.equals(v2)).toEqual(true);
    expect(v.equals(v3)).toEqual(false);
    expect(v.equals(v4)).toEqual(false);
    expect(v.equals(v5)).toEqual(false);
    expect(v.equals(v6)).toEqual(false);
  });

  it("equalsEpsilon works", function () {
    const v = new Color(0.1, 0.2, 0.3, 0.4);
    const v2 = new Color(0.1, 0.2, 0.3, 0.4);
    const v3 = new Color(0.1, 0.2, 0.3, 0.5);
    const v4 = new Color(0.1, 0.2, 0.5, 0.4);
    const v5 = new Color(0.1, 0.5, 0.3, 0.4);
    const v6 = new Color(0.5, 0.2, 0.3, 0.4);
    expect(v.equalsEpsilon(v2, 0.0)).toEqual(true);
    expect(v.equalsEpsilon(v3, 0.0)).toEqual(false);
    expect(v.equalsEpsilon(v4, 0.0)).toEqual(false);
    expect(v.equalsEpsilon(v5, 0.0)).toEqual(false);
    expect(v.equalsEpsilon(v6, 0.0)).toEqual(false);

    expect(v.equalsEpsilon(v2, 0.1)).toEqual(true);
    expect(v.equalsEpsilon(v3, 0.1)).toEqual(true);
    expect(v.equalsEpsilon(v4, 0.2)).toEqual(true);
    expect(v.equalsEpsilon(v5, 0.3)).toEqual(true);
    expect(v.equalsEpsilon(v6, 0.4)).toEqual(true);
  });

  it("toCssColorString produces expected output", function () {
    expect(Color.WHITE.toCssColorString()).toEqual("rgb(255,255,255)");
    expect(Color.RED.toCssColorString()).toEqual("rgb(255,0,0)");
    expect(Color.BLUE.toCssColorString()).toEqual("rgb(0,0,255)");
    expect(Color.LIME.toCssColorString()).toEqual("rgb(0,255,0)");
    expect(new Color(0.0, 0.0, 0.0, 1.0).toCssColorString()).toEqual(
      "rgb(0,0,0)"
    );
    expect(new Color(0.1, 0.2, 0.3, 0.4).toCssColorString()).toEqual(
      "rgba(25,51,76,0.4)"
    );
  });

  it("toCssHexString produces expected output", function () {
    expect(Color.WHITE.toCssHexString()).toEqual("#ffffff");
    expect(Color.RED.toCssHexString()).toEqual("#ff0000");
    expect(Color.BLUE.toCssHexString()).toEqual("#0000ff");
    expect(Color.LIME.toCssHexString()).toEqual("#00ff00");
    expect(new Color(0.0, 0.0, 0.0, 1.0).toCssHexString()).toEqual("#000000");
    expect(new Color(0.1, 0.2, 0.3, 0.4).toCssHexString()).toEqual("#19334c66");
  });

  it("fromCssColorString supports transparent", function () {
    expect(Color.fromCssColorString("transparent")).toEqual(
      new Color(0.0, 0.0, 0.0, 0.0)
    );
  });

  it("fromCssColorString supports the #rgb format", function () {
    expect(Color.fromCssColorString("#369")).toEqual(
      new Color(0.2, 0.4, 0.6, 1.0)
    );
  });

  it("fromCssColorString supports the #rgb format with lowercase", function () {
    expect(Color.fromCssColorString("#f00")).toEqual(Color.RED);
    expect(Color.fromCssColorString("#0f0")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("#00f")).toEqual(Color.BLUE);
  });

  it("fromCssColorString supports the #rgb format with uppercase", function () {
    expect(Color.fromCssColorString("#F00")).toEqual(Color.RED);
    expect(Color.fromCssColorString("#0F0")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("#00F")).toEqual(Color.BLUE);
  });

  it("fromCssColorString supports the #rgba format", function () {
    expect(Color.fromCssColorString("#369c")).toEqual(
      new Color(0.2, 0.4, 0.6, 0.8)
    );
  });

  it("fromCssColorString supports the #rgba format with uppercase", function () {
    expect(Color.fromCssColorString("#369C")).toEqual(
      new Color(0.2, 0.4, 0.6, 0.8)
    );
  });

  it("fromCssColorString supports the #rrggbb format", function () {
    expect(Color.fromCssColorString("#336699")).toEqual(
      new Color(0.2, 0.4, 0.6, 1.0)
    );
  });

  it("fromCssColorString supports the #rrggbb format with lowercase", function () {
    expect(Color.fromCssColorString("#ff0000")).toEqual(Color.RED);
    expect(Color.fromCssColorString("#00ff00")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("#0000ff")).toEqual(Color.BLUE);
  });

  it("fromCssColorString supports the #rrggbb format with uppercase", function () {
    expect(Color.fromCssColorString("#FF0000")).toEqual(Color.RED);
    expect(Color.fromCssColorString("#00FF00")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("#0000FF")).toEqual(Color.BLUE);
  });

  it("fromCssColorString supports the #rrggbbaa format", function () {
    expect(Color.fromCssColorString("#336699cc")).toEqual(
      new Color(0.2, 0.4, 0.6, 0.8)
    );
  });

  it("fromCssColorString supports the #rrggbbaa format with uppercase", function () {
    expect(Color.fromCssColorString("#336699CC")).toEqual(
      new Color(0.2, 0.4, 0.6, 0.8)
    );
  });

  it("fromCssColorString supports the rgb() format with absolute values", function () {
    expect(Color.fromCssColorString("rgb(255, 0, 0)")).toEqual(Color.RED);
    expect(Color.fromCssColorString("rgb(0, 255, 0)")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("rgb(0, 0, 255)")).toEqual(Color.BLUE);
    expect(Color.fromCssColorString("rgb(51, 102, 204)")).toEqual(
      new Color(0.2, 0.4, 0.8, 1.0)
    );
  });

  it("fromCssColorString supports the rgb() format with percentages", function () {
    expect(Color.fromCssColorString("rgb(100%, 0, 0)")).toEqual(Color.RED);
    expect(Color.fromCssColorString("rgb(0, 100%, 0)")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("rgb(0, 0, 100%)")).toEqual(Color.BLUE);
    expect(Color.fromCssColorString("rgb(20%, 40%, 80%)")).toEqual(
      new Color(0.2, 0.4, 0.8, 1.0)
    );
  });

  it("fromCssColorString supports the rgba() format with absolute values", function () {
    expect(Color.fromCssColorString("rgba(255, 0, 0, 1.0)")).toEqual(Color.RED);
    expect(Color.fromCssColorString("rgba(0, 255, 0, 1.0)")).toEqual(
      Color.LIME
    );
    expect(Color.fromCssColorString("rgba(0, 0, 255, 1.0)")).toEqual(
      Color.BLUE
    );
    expect(Color.fromCssColorString("rgba(51, 102, 204, 0.6)")).toEqual(
      new Color(0.2, 0.4, 0.8, 0.6)
    );
  });

  it("fromCssColorString supports the rgba() format with percentages", function () {
    expect(Color.fromCssColorString("rgba(100%, 0, 0, 1.0)")).toEqual(
      Color.RED
    );
    expect(Color.fromCssColorString("rgba(0, 100%, 0, 1.0)")).toEqual(
      Color.LIME
    );
    expect(Color.fromCssColorString("rgba(0, 0, 100%, 1.0)")).toEqual(
      Color.BLUE
    );
    expect(Color.fromCssColorString("rgba(20%, 40%, 80%, 0.6)")).toEqual(
      new Color(0.2, 0.4, 0.8, 0.6)
    );
  });

  it("fromCssColorString supports named colors regardless of case", function () {
    expect(Color.fromCssColorString("red")).toEqual(Color.RED);
    expect(Color.fromCssColorString("GREEN")).toEqual(Color.GREEN);
    expect(Color.fromCssColorString("BLue")).toEqual(Color.BLUE);
  });

  it("fromCssColorString supports the hsl() format", function () {
    expect(Color.fromCssColorString("hsl(0, 100%, 50%)")).toEqual(Color.RED);
    expect(Color.fromCssColorString("hsl(120, 100%, 50%)")).toEqual(Color.LIME);
    expect(Color.fromCssColorString("hsl(240, 100%, 50%)")).toEqual(Color.BLUE);
    expect(Color.fromCssColorString("hsl(220, 60%, 50%)")).toEqualEpsilon(
      new Color(0.2, 0.4, 0.8),
      CesiumMath.EPSILON15
    );
  });

  it("fromCssColorString supports the hsla() format", function () {
    expect(Color.fromCssColorString("hsla(0, 100%, 50%, 1.0)")).toEqual(
      Color.RED
    );
    expect(Color.fromCssColorString("hsla(120, 100%, 50%, 1.0)")).toEqual(
      Color.LIME
    );
    expect(Color.fromCssColorString("hsla(240, 100%, 50%, 1.0)")).toEqual(
      Color.BLUE
    );
    expect(Color.fromCssColorString("hsla(220, 60%, 50%, 0.6)")).toEqualEpsilon(
      new Color(0.2, 0.4, 0.8, 0.6),
      CesiumMath.EPSILON15
    );
  });

  it("fromCssColorString wraps hue into valid range for hsl() format", function () {
    expect(Color.fromCssColorString("hsl(720, 100%, 50%)")).toEqual(Color.RED);
    expect(Color.fromCssColorString("hsla(720, 100%, 50%, 1.0)")).toEqual(
      Color.RED
    );
  });

  it("fromCssColorString returns undefined for unknown colors", function () {
    expect(Color.fromCssColorString("not a color")).toBeUndefined();
  });

  it("fromCssColorString throws with undefined", function () {
    expect(function () {
      Color.fromCssColorString(undefined);
    }).toThrowDeveloperError();
  });

  it("fromCssColorString works with a result parameter.", function () {
    const c = new Color();
    let c2 = Color.fromCssColorString("yellow", c);
    expect(c).toBe(c2);
    expect(c).toEqual(Color.YELLOW);

    c2 = Color.fromCssColorString("#f00", c);
    expect(c).toBe(c2);
    expect(c).toEqual(Color.RED);

    c.alpha = 0.5;
    c2 = Color.fromCssColorString("#f00", c); // resets alpha to 1.0
    expect(c).toBe(c2);
    expect(c).toEqual(Color.RED);

    c2 = Color.fromCssColorString("#0000ff", c);
    expect(c).toBe(c2);
    expect(c).toEqual(Color.BLUE);

    c2 = Color.fromCssColorString("rgb(0, 255, 255)", c);
    expect(c).toBe(c2);
    expect(c).toEqual(Color.CYAN);

    c2 = Color.fromCssColorString("hsl(120, 100%, 50%)", c);
    expect(c).toBe(c2);
    expect(c).toEqual(Color.LIME);
  });

  it("fromCssColorString understands the color string even with any number of unnecessary leading, trailing or middle spaces", function () {
    expect(Color.fromCssColorString(" rgb( 0, 0, 255)")).toEqual(Color.BLUE);
    expect(Color.fromCssColorString("rgb( 255, 255, 255) ")).toEqual(
      Color.WHITE
    );
    expect(Color.fromCssColorString("  #FF0000")).toEqual(Color.RED);
    expect(Color.fromCssColorString("#FF0  ")).toEqual(Color.YELLOW);
    expect(Color.fromCssColorString(" hsla(720,   100%, 50%, 1.0)  ")).toEqual(
      Color.RED
    );
    expect(Color.fromCssColorString("hsl (720, 100%, 50%)")).toEqual(Color.RED);
  });

  it("fromHsl produces expected output", function () {
    expect(Color.fromHsl(0.0, 1.0, 0.5, 1.0)).toEqual(Color.RED);
    expect(Color.fromHsl(120.0 / 360.0, 1.0, 0.5, 1.0)).toEqual(Color.LIME);
    expect(Color.fromHsl(240.0 / 360.0, 1.0, 0.5, 1.0)).toEqual(Color.BLUE);
    expect(Color.fromHsl(220.0 / 360.0, 0.6, 0.5, 0.7)).toEqualEpsilon(
      new Color(0.2, 0.4, 0.8, 0.7),
      CesiumMath.EPSILON15
    );
  });

  it("fromHsl properly wraps hue into valid range", function () {
    expect(Color.fromHsl(5, 1.0, 0.5, 1.0)).toEqual(Color.RED);
  });

  it("fromHsl works with result parameter", function () {
    const c1 = new Color();
    const c2 = Color.fromHsl(5, 1.0, 0.5, 1.0, c1);
    expect(c1).toEqual(Color.RED);
    expect(c1).toBe(c2);
  });

  it("fromRandom generates a random color with no options", function () {
    const color = Color.fromRandom();
    expect(color.red).toBeBetween(0.0, 1.0);
    expect(color.green).toBeBetween(0.0, 1.0);
    expect(color.blue).toBeBetween(0.0, 1.0);
    expect(color.alpha).toBeBetween(0.0, 1.0);
  });

  it("fromRandom generates a random color with no options", function () {
    const result = new Color();
    const color = Color.fromRandom({}, result);
    expect(result).toBe(color);
    expect(color.red).toBeBetween(0.0, 1.0);
    expect(color.green).toBeBetween(0.0, 1.0);
    expect(color.blue).toBeBetween(0.0, 1.0);
    expect(color.alpha).toBeBetween(0.0, 1.0);
  });

  it("fromRandom uses specified exact values", function () {
    const options = {
      red: 0.1,
      green: 0.2,
      blue: 0.3,
      alpha: 0.4,
    };
    const color = Color.fromRandom(options);
    expect(color.red).toEqual(options.red);
    expect(color.green).toEqual(options.green);
    expect(color.blue).toEqual(options.blue);
    expect(color.alpha).toEqual(options.alpha);
  });

  it("fromRandom generates a random kind of Red color within intervals", function () {
    const options = {
      red: undefined,
      minimumRed: 0.1,
      maximumRed: 0.2,
      minimumGreen: 0.3,
      maximumGreen: 0.4,
      minimumBlue: 0.5,
      maximumBlue: 0.6,
      minimumAlpha: 0.7,
      maximumAlpha: 0.8,
    };

    for (let i = 0; i < 100; i++) {
      const color = Color.fromRandom(options);
      expect(color.red).toBeBetween(options.minimumRed, options.maximumRed);
      expect(color.green).toBeBetween(
        options.minimumGreen,
        options.maximumGreen
      );
      expect(color.blue).toBeBetween(options.minimumBlue, options.maximumBlue);
      expect(color.alpha).toBeBetween(
        options.minimumAlpha,
        options.maximumAlpha
      );
    }
  });

  it("fromRandom throws with invalid minimum-maximum red values", function () {
    expect(function () {
      Color.fromRandom({
        minimumRed: 1,
        maximumRed: 0,
      });
    }).toThrowDeveloperError();
  });

  it("fromRandom throws with invalid minimum-maximum green values", function () {
    expect(function () {
      Color.fromRandom({
        minimumGreen: 1,
        maximumGreen: 0,
      });
    }).toThrowDeveloperError();
  });

  it("fromRandom throws with invalid minimum-maximum blue values", function () {
    expect(function () {
      Color.fromRandom({
        minimumBlue: 1,
        maximumBlue: 0,
      });
    }).toThrowDeveloperError();
  });

  it("fromRandom throws with invalid minimum-maximum alpha values", function () {
    expect(function () {
      Color.fromRandom({
        minimumAlpha: 1,
        maximumAlpha: 0,
      });
    }).toThrowDeveloperError();
  });

  it("fromAlpha works", function () {
    const result = Color.fromAlpha(Color.RED, 0.5);
    expect(result).toEqual(new Color(1, 0, 0, 0.5));
  });

  it("fromAlpha works with result parameter", function () {
    const resultParam = new Color();
    const result = Color.fromAlpha(Color.RED, 0.5, resultParam);
    expect(resultParam).toBe(result);
    expect(result).toEqual(new Color(1, 0, 0, 0.5));
  });

  it("fromAlpha throws with undefined color", function () {
    const result = new Color();
    expect(function () {
      Color.fromAlpha(undefined, 0.5, result);
    }).toThrowDeveloperError();
  });

  it("fromAlpha throws with undefined color", function () {
    const result = new Color();
    expect(function () {
      Color.fromAlpha(undefined, 0.5, result);
    }).toThrowDeveloperError();
  });

  it("fromAlpha throws with undefined alpha", function () {
    const result = new Color();
    const color = new Color();
    expect(function () {
      Color.fromAlpha(color, undefined, result);
    }).toThrowDeveloperError();
  });

  it("withAlpha works", function () {
    const resultParam = new Color();
    const result = Color.RED.withAlpha(0.5, resultParam);
    expect(resultParam).toBe(result);
    expect(result).toEqual(new Color(1, 0, 0, 0.5));
  });

  it("toString produces correct results", function () {
    expect(new Color(0.1, 0.2, 0.3, 0.4).toString()).toEqual(
      "(0.1, 0.2, 0.3, 0.4)"
    );
  });

  it("can convert to and from RGBA", function () {
    // exact values will depend on endianness, but it should round-trip.
    const color = Color.fromBytes(0xff, 0xcc, 0x00, 0xee);

    const rgba = color.toRgba();
    expect(rgba).toBeGreaterThan(0);

    const result = new Color();
    const newColor = Color.fromRgba(rgba, result);
    expect(result).toBe(newColor);
    expect(color).toEqual(newColor);
  });

  it("fromRgba works with result parameter", function () {
    const color = Color.fromBytes(0xff, 0xcc, 0x00, 0xee);
    const rgba = color.toRgba();

    const newColor = Color.fromRgba(rgba);
    expect(color).toEqual(newColor);
  });

  it("Can brighten", function () {
    const dark = new Color(0.2, 0.4, 0.6, 0.8);
    const brighter = dark.brighten(0.5, new Color());
    expect(brighter.red).toEqual(0.6);
    expect(brighter.green).toEqual(0.7);
    expect(brighter.blue).toEqual(0.8);
    expect(brighter.alpha).toEqual(0.8);
  });

  it("Can darken", function () {
    const dark = new Color(0.1, 0.6, 0.8, 0.8);
    const darker = dark.darken(0.2, new Color());
    expect(darker.red).toEqualEpsilon(0.08, CesiumMath.EPSILON15);
    expect(darker.green).toEqualEpsilon(0.48, CesiumMath.EPSILON15);
    expect(darker.blue).toEqualEpsilon(0.64, CesiumMath.EPSILON15);
    expect(darker.alpha).toEqualEpsilon(0.8, CesiumMath.EPSILON15);
  });

  it("brighten throws without result", function () {
    expect(function () {
      Color.RED.brighten(0.5, undefined);
    }).toThrowDeveloperError();
  });

  it("darken throws without result", function () {
    expect(function () {
      Color.RED.darken(0.5, undefined);
    }).toThrowDeveloperError();
  });

  it("brighten throws negative magnitude", function () {
    expect(function () {
      Color.RED.brighten(-0.5, new Color());
    }).toThrowDeveloperError();
  });

  it("darken throws negative magnitude", function () {
    expect(function () {
      Color.RED.darken(-0.5, new Color());
    }).toThrowDeveloperError();
  });

  it("brighten throws undefined magnitude", function () {
    expect(function () {
      Color.RED.brighten(undefined, new Color());
    }).toThrowDeveloperError();
  });

  it("darken throws undefined magnitude", function () {
    expect(function () {
      Color.RED.darken(undefined, new Color());
    }).toThrowDeveloperError();
  });

  it("Can add", function () {
    const left = new Color(0.1, 0.2, 0.3, 0.4);
    const right = new Color(0.3, 0.3, 0.3, 0.3);
    const result = Color.add(left, right, new Color());
    expect(result.red).toEqual(0.4);
    expect(result.green).toEqual(0.5);
    expect(result.blue).toEqual(0.6);
    expect(result.alpha).toEqual(0.7);
  });

  it("add throws with undefined parameters", function () {
    expect(function () {
      Color.add(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.add(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.add(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("can add with a result parameter that is an input parameter", function () {
    const left = new Color(0.1, 0.2, 0.3, 0.4);
    const right = new Color(0.3, 0.3, 0.3, 0.3);
    const result = Color.add(left, right, left);
    expect(result.red).toEqual(0.4);
    expect(result.green).toEqual(0.5);
    expect(result.blue).toEqual(0.6);
    expect(result.alpha).toEqual(0.7);
  });

  it("Can subtract", function () {
    const left = new Color(1.0, 1.0, 1.0, 1.0);
    const right = new Color(0.1, 0.2, 0.3, 0.4);
    const result = Color.subtract(left, right, new Color());
    expect(result.red).toEqual(0.9);
    expect(result.green).toEqual(0.8);
    expect(result.blue).toEqual(0.7);
    expect(result.alpha).toEqual(0.6);
  });

  it("subtract throws with undefined parameters", function () {
    expect(function () {
      Color.subtract(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.subtract(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.subtract(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("subtract multiply with a result parameter that is an input parameter", function () {
    const left = new Color(1.0, 1.0, 1.0, 1.0);
    const right = new Color(0.1, 0.2, 0.3, 0.4);
    const result = Color.subtract(left, right, left);
    expect(result.red).toEqual(0.9);
    expect(result.green).toEqual(0.8);
    expect(result.blue).toEqual(0.7);
    expect(result.alpha).toEqual(0.6);
  });

  it("Can multiply", function () {
    const left = new Color(0.1, 0.2, 0.3, 0.4);
    const right = new Color(0.2, 0.2, 0.2, 0.2);
    const result = Color.multiply(left, right, new Color());
    expect(result.red).toEqualEpsilon(0.02, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.04, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.06, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.08, CesiumMath.EPSILON15);
  });

  it("multiply throws with undefined parameters", function () {
    expect(function () {
      Color.multiply(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.multiply(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.multiply(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("can multiply with a result parameter that is an input parameter", function () {
    const left = new Color(0.1, 0.2, 0.3, 0.4);
    const right = new Color(0.2, 0.2, 0.2, 0.2);
    const result = Color.multiply(left, right, left);
    expect(result.red).toEqualEpsilon(0.02, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.04, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.06, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.08, CesiumMath.EPSILON15);
  });

  it("Can divide", function () {
    const left = new Color(0.1, 0.2, 0.1, 0.2);
    const right = new Color(0.2, 0.2, 0.4, 0.4);
    const result = Color.divide(left, right, new Color());
    expect(result.red).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.25, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
  });

  it("divide throws with undefined parameters", function () {
    expect(function () {
      Color.divide(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.divide(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.divide(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("can divide with a result parameter that is an input parameter", function () {
    const left = new Color(0.1, 0.2, 0.1, 0.2);
    const right = new Color(0.2, 0.2, 0.4, 0.4);
    const result = Color.divide(left, right, left);
    expect(result.red).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.25, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
  });

  it("Can mod", function () {
    const left = new Color(0.1, 0.2, 0.3, 0.2);
    const right = new Color(0.2, 0.2, 0.2, 0.4);
    const result = Color.mod(left, right, new Color());
    expect(result.red).toEqualEpsilon(0.1, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.0, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.1, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.2, CesiumMath.EPSILON15);
  });

  it("mod throws with undefined parameters", function () {
    expect(function () {
      Color.mod(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.mod(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.mod(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("can mod with a result parameter that is an input parameter", function () {
    const left = new Color(0.1, 0.2, 0.3, 0.2);
    const right = new Color(0.2, 0.2, 0.2, 0.4);
    const result = Color.mod(left, right, left);
    expect(result.red).toEqualEpsilon(0.1, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.0, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.1, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.2, CesiumMath.EPSILON15);
  });

  it("Can multiply by scalar", function () {
    const color = new Color(0.1, 0.2, 0.3, 0.4);
    const result = Color.multiplyByScalar(color, 2.0, new Color());
    expect(result.red).toEqualEpsilon(0.2, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.4, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.6, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.8, CesiumMath.EPSILON15);
  });

  it("multiply by scalar throws with undefined parameters", function () {
    expect(function () {
      Color.multiplyByScalar(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.multiplyByScalar(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.multiplyByScalar(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("can multiply by scalar with a result parameter that is an input parameter", function () {
    const color = new Color(0.1, 0.2, 0.3, 0.4);
    const result = Color.multiplyByScalar(color, 2.0, color);
    expect(result.red).toEqualEpsilon(0.2, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.4, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.6, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.8, CesiumMath.EPSILON15);
  });

  it("Can divide by scalar", function () {
    const color = new Color(0.1, 0.2, 0.3, 0.4);
    const result = Color.divideByScalar(color, 2.0, new Color());
    expect(result.red).toEqualEpsilon(0.05, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.1, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.15, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.2, CesiumMath.EPSILON15);
  });

  it("divide by scalar throws with undefined parameters", function () {
    expect(function () {
      Color.divideByScalar(undefined, new Color(), new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.divideByScalar(new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.divideByScalar(new Color(), new Color(), undefined);
    }).toThrowDeveloperError();
  });

  it("can divide by scalar with a result parameter that is an input parameter", function () {
    const color = new Color(0.1, 0.2, 0.3, 0.4);
    const result = Color.divideByScalar(color, 2.0, color);
    expect(result.red).toEqualEpsilon(0.05, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.1, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.15, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.2, CesiumMath.EPSILON15);
  });

  it("lerp throws with undefined parameters", function () {
    expect(function () {
      Color.lerp(undefined, new Color(), 0.0, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.lerp(new Color(), undefined, 0.0, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.lerp(new Color(), new Color(), undefined, new Color());
    }).toThrowDeveloperError();

    expect(function () {
      Color.lerp(new Color(), new Color(), 0.0, undefined);
    }).toThrowDeveloperError();
  });

  it("can lerp between two colors", function () {
    const colorA = new Color(0.0, 0.0, 0.0, 0.0);
    const colorB = new Color(1.0, 1.0, 1.0, 1.0);
    const result = Color.lerp(colorA, colorB, 0.5, new Color());

    expect(result.red).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
    expect(result.green).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
    expect(result.blue).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
    expect(result.alpha).toEqualEpsilon(0.5, CesiumMath.EPSILON15);
  });

  createPackableSpecs(Color, new Color(0.1, 0.2, 0.3, 0.4), [
    0.1,
    0.2,
    0.3,
    0.4,
  ]);
});
