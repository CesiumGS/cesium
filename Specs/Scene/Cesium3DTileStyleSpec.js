import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Cesium3DTileStyle } from "../../Source/Cesium.js";
import { ConditionsExpression } from "../../Source/Cesium.js";
import { Expression } from "../../Source/Cesium.js";

describe("Scene/Cesium3DTileStyle", function () {
  function MockFeature() {
    this._properties = {};
  }

  MockFeature.prototype.addProperty = function (name, value) {
    this._properties[name] = value;
  };

  MockFeature.prototype.getPropertyInherited = function (name) {
    return this._properties[name];
  };

  const feature1 = new MockFeature();
  feature1.addProperty("ZipCode", "19341");
  feature1.addProperty("County", "Chester");
  feature1.addProperty("YearBuilt", 1979);
  feature1.addProperty("Temperature", 78);
  feature1.addProperty("red", 38);
  feature1.addProperty("green", 255);
  feature1.addProperty("blue", 82);
  feature1.addProperty("volume", 128);
  feature1.addProperty("Height", 100);
  feature1.addProperty("Width", 20);
  feature1.addProperty("Depth", 20);
  feature1.addProperty("id", 11);
  feature1.addProperty("name", "Hello");

  const feature2 = new MockFeature();
  feature2.addProperty("ZipCode", "19342");
  feature2.addProperty("County", "Delaware");
  feature2.addProperty("YearBuilt", 1979);
  feature2.addProperty("Temperature", 92);
  feature2.addProperty("red", 255);
  feature2.addProperty("green", 30);
  feature2.addProperty("blue", 30);
  feature2.addProperty("volume", 50);
  feature2.addProperty("Height", 38);
  feature2.addProperty("id", 12);

  const styleUrl = "./Data/Cesium3DTiles/Style/style.json";

  it("rejects readyPromise with undefined url", function () {
    const tileStyle = new Cesium3DTileStyle("invalid.json");

    return tileStyle.readyPromise
      .then(function (style) {
        fail("should not resolve");
      })
      .otherwise(function (error) {
        expect(tileStyle.ready).toEqual(false);
        expect(error.statusCode).toEqual(404);
      });
  });

  it("loads style from uri", function () {
    const tileStyle = new Cesium3DTileStyle(styleUrl);

    return tileStyle.readyPromise
      .then(function (style) {
        expect(style.style).toEqual({
          color: "color('red')",
          show: "${id} < 100.0",
          pointSize: "${id} / 100.0",
          pointOutlineColor: "color('blue')",
          pointOutlineWidth: "5.0",
          labelColor: "color('yellow')",
          labelOutlineColor: "color('orange')",
          labelOutlineWidth: "6.0",
          font: "'24px Helvetica'",
          labelStyle: "1",
          labelText: "'label text'",
          backgroundColor: "color('coral')",
          backgroundPadding: "vec2(1.0, 2.0)",
          backgroundEnabled: "true",
          scaleByDistance: "vec4(1.0, 2.0, 3.0, 4.0)",
          translucencyByDistance: "vec4(5.0, 6.0, 7.0, 8.0)",
          distanceDisplayCondition: "vec2(3.0, 4.0)",
          heightOffset: "10.0",
          anchorLineEnabled: "true",
          anchorLineColor: "color('fuchsia')",
          image: "'url/to/invalid/image'",
          disableDepthTestDistance: "1000.0",
          horizontalOrigin: "0",
          verticalOrigin: "0",
          labelHorizontalOrigin: "0",
          labelVerticalOrigin: "0",
        });
        expect(style.color).toEqual(new Expression("color('red')"));
        expect(style.show).toEqual(new Expression("${id} < 100.0"));
        expect(style.pointSize).toEqual(new Expression("${id} / 100.0"));
        expect(style.pointOutlineColor).toEqual(
          new Expression("color('blue')")
        );
        expect(style.pointOutlineWidth).toEqual(new Expression("5.0"));
        expect(style.labelColor).toEqual(new Expression("color('yellow')"));
        expect(style.labelOutlineColor).toEqual(
          new Expression("color('orange')")
        );
        expect(style.labelOutlineWidth).toEqual(new Expression("6.0"));
        expect(style.font).toEqual(new Expression("'24px Helvetica'"));
        expect(style.labelStyle).toEqual(new Expression("1"));
        expect(style.labelText).toEqual(new Expression("'label text'"));
        expect(style.backgroundColor).toEqual(new Expression("color('coral')"));
        expect(style.backgroundPadding).toEqual(
          new Expression("vec2(1.0, 2.0)")
        );
        expect(style.backgroundEnabled).toEqual(new Expression("true"));
        expect(style.scaleByDistance).toEqual(
          new Expression("vec4(1.0, 2.0, 3.0, 4.0)")
        );
        expect(style.translucencyByDistance).toEqual(
          new Expression("vec4(5.0, 6.0, 7.0, 8.0)")
        );
        expect(style.distanceDisplayCondition).toEqual(
          new Expression("vec2(3.0, 4.0)")
        );
        expect(style.heightOffset).toEqual(new Expression("10.0"));
        expect(style.anchorLineEnabled).toEqual(new Expression("true"));
        expect(style.anchorLineColor).toEqual(
          new Expression("color('fuchsia')")
        );
        expect(style.image).toEqual(new Expression("'url/to/invalid/image'"));
        expect(style.disableDepthTestDistance).toEqual(
          new Expression("1000.0")
        );
        expect(style.horizontalOrigin).toEqual(new Expression("0"));
        expect(style.verticalOrigin).toEqual(new Expression("0"));
        expect(style.labelHorizontalOrigin).toEqual(new Expression("0"));
        expect(style.labelVerticalOrigin).toEqual(new Expression("0"));
        expect(tileStyle.ready).toEqual(true);
      })
      .otherwise(function () {
        fail("should load style.json");
      });
  });

  it("loads style from Resource", function () {
    const tileStyle = new Cesium3DTileStyle(
      new Resource({
        url: styleUrl,
      })
    );

    return tileStyle.readyPromise
      .then(function (style) {
        expect(style.style).toEqual({
          color: "color('red')",
          show: "${id} < 100.0",
          pointSize: "${id} / 100.0",
          pointOutlineColor: "color('blue')",
          pointOutlineWidth: "5.0",
          labelColor: "color('yellow')",
          labelOutlineColor: "color('orange')",
          labelOutlineWidth: "6.0",
          font: "'24px Helvetica'",
          labelStyle: "1",
          labelText: "'label text'",
          backgroundColor: "color('coral')",
          backgroundPadding: "vec2(1.0, 2.0)",
          backgroundEnabled: "true",
          scaleByDistance: "vec4(1.0, 2.0, 3.0, 4.0)",
          translucencyByDistance: "vec4(5.0, 6.0, 7.0, 8.0)",
          distanceDisplayCondition: "vec2(3.0, 4.0)",
          heightOffset: "10.0",
          anchorLineEnabled: "true",
          anchorLineColor: "color('fuchsia')",
          image: "'url/to/invalid/image'",
          disableDepthTestDistance: "1000.0",
          horizontalOrigin: "0",
          verticalOrigin: "0",
          labelHorizontalOrigin: "0",
          labelVerticalOrigin: "0",
        });
        expect(style.color).toEqual(new Expression("color('red')"));
        expect(style.show).toEqual(new Expression("${id} < 100.0"));
        expect(style.pointSize).toEqual(new Expression("${id} / 100.0"));
        expect(style.pointOutlineColor).toEqual(
          new Expression("color('blue')")
        );
        expect(style.pointOutlineWidth).toEqual(new Expression("5.0"));
        expect(style.labelColor).toEqual(new Expression("color('yellow')"));
        expect(style.labelOutlineColor).toEqual(
          new Expression("color('orange')")
        );
        expect(style.labelOutlineWidth).toEqual(new Expression("6.0"));
        expect(style.font).toEqual(new Expression("'24px Helvetica'"));
        expect(style.labelStyle).toEqual(new Expression("1"));
        expect(style.labelText).toEqual(new Expression("'label text'"));
        expect(style.backgroundColor).toEqual(new Expression("color('coral')"));
        expect(style.backgroundPadding).toEqual(
          new Expression("vec2(1.0, 2.0)")
        );
        expect(style.backgroundEnabled).toEqual(new Expression("true"));
        expect(style.scaleByDistance).toEqual(
          new Expression("vec4(1.0, 2.0, 3.0, 4.0)")
        );
        expect(style.translucencyByDistance).toEqual(
          new Expression("vec4(5.0, 6.0, 7.0, 8.0)")
        );
        expect(style.distanceDisplayCondition).toEqual(
          new Expression("vec2(3.0, 4.0)")
        );
        expect(style.heightOffset).toEqual(new Expression("10.0"));
        expect(style.anchorLineEnabled).toEqual(new Expression("true"));
        expect(style.anchorLineColor).toEqual(
          new Expression("color('fuchsia')")
        );
        expect(style.image).toEqual(new Expression("'url/to/invalid/image'"));
        expect(style.disableDepthTestDistance).toEqual(
          new Expression("1000.0")
        );
        expect(style.horizontalOrigin).toEqual(new Expression("0"));
        expect(style.verticalOrigin).toEqual(new Expression("0"));
        expect(style.labelHorizontalOrigin).toEqual(new Expression("0"));
        expect(style.labelVerticalOrigin).toEqual(new Expression("0"));
        expect(tileStyle.ready).toEqual(true);
      })
      .otherwise(function () {
        fail("should load style.json");
      });
  });

  it("sets show value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.show).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.show).toBeUndefined();
  });

  it("sets show value to expression", function () {
    let style = new Cesium3DTileStyle({
      show: "true",
    });
    expect(style.show).toEqual(new Expression("true"));

    style = new Cesium3DTileStyle({
      show: "false",
    });
    expect(style.show).toEqual(new Expression("false"));

    style = new Cesium3DTileStyle({
      show: "${height} * 10 >= 1000",
    });
    expect(style.show).toEqual(new Expression("${height} * 10 >= 1000"));

    style = new Cesium3DTileStyle({
      show: true,
    });
    expect(style.show).toEqual(new Expression("true"));

    style = new Cesium3DTileStyle({
      show: false,
    });
    expect(style.show).toEqual(new Expression("false"));
  });

  it("sets show value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    };

    const style = new Cesium3DTileStyle({
      show: jsonExp,
    });
    expect(style.show).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets show expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    });

    style.show = condExp;
    expect(style.show).toEqual(condExp);

    const exp = new Expression("false");
    style.show = exp;
    expect(style.show).toEqual(exp);
  });

  it("sets show values in setter", function () {
    const defines = {
      showFactor: 10,
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.show = "${height} * ${showFactor} >= 1000";
    expect(style.show).toEqual(
      new Expression("${height} * ${showFactor} >= 1000", defines)
    );

    style.show = false;
    expect(style.show).toEqual(new Expression("false"));

    const jsonExp = {
      conditions: [
        ["${height} > ${showFactor}", "false"],
        ["true", "true"],
      ],
    };

    style.show = jsonExp;
    expect(style.show).toEqual(new ConditionsExpression(jsonExp, defines));

    style.show = undefined;
    expect(style.show).toBeUndefined();
  });

  it("sets style.show values in setter", function () {
    const style = new Cesium3DTileStyle({});
    style.show = "${height} * ${showFactor} >= 1000";
    expect(style.style.show).toEqual("${height} * ${showFactor} >= 1000");

    style.show = false;
    expect(style.style.show).toEqual("false");

    const jsonExp = {
      conditions: [
        ["${height} > ${showFactor}", "false"],
        ["true", "true"],
      ],
    };

    style.show = jsonExp;
    expect(style.style.show).toEqual(jsonExp);

    style.show = undefined;
    expect(style.style.show).toBeUndefined();
  });

  it("sets color value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.color).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.color).toBeUndefined();
  });

  it("sets color value to expression", function () {
    let style = new Cesium3DTileStyle({
      color: 'color("red")',
    });
    expect(style.color).toEqual(new Expression('color("red")'));

    style = new Cesium3DTileStyle({
      color: "rgba(30, 30, 30, 0.5)",
    });
    expect(style.color).toEqual(new Expression("rgba(30, 30, 30, 0.5)"));

    style = new Cesium3DTileStyle({
      color:
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")',
    });
    expect(style.color).toEqual(
      new Expression(
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
      )
    );
  });

  it("sets color value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    const style = new Cesium3DTileStyle({
      color: jsonExp,
    });
    expect(style.color).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets color expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression('color("red")');
    style.color = exp;
    expect(style.color).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    });

    style.color = condExp;
    expect(style.color).toEqual(condExp);

    style.color = undefined;
    expect(style.color).toBeUndefined();
  });

  it("sets style.color expression in setter", function () {
    const style = new Cesium3DTileStyle();

    const stringExp = 'color("red")';
    style.color = new Expression(stringExp);
    expect(style.style.color).toEqual(stringExp);

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    style.color = new ConditionsExpression(jsonExp);
    expect(style.style.color).toEqual(jsonExp);

    style.color = undefined;
    expect(style.style.color).toBeUndefined();
  });

  it("sets color values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.color = 'color("${targetColor}")';
    expect(style.color).toEqual(
      new Expression('color("${targetColor}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.color = jsonExp;
    expect(style.color).toEqual(new ConditionsExpression(jsonExp, defines));
  });

  it("sets style.color values in setter", function () {
    const style = new Cesium3DTileStyle();

    style.color = 'color("${targetColor}")';
    expect(style.style.color).toEqual('color("${targetColor}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.color = jsonExp;
    expect(style.style.color).toEqual(jsonExp);
  });

  it("sets pointSize value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.pointSize).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.pointSize).toBeUndefined();
  });

  it("sets pointSize value to expression", function () {
    let style = new Cesium3DTileStyle({
      pointSize: "2",
    });
    expect(style.pointSize).toEqual(new Expression("2"));

    style = new Cesium3DTileStyle({
      pointSize: "${height} / 10",
    });
    expect(style.pointSize).toEqual(new Expression("${height} / 10"));

    style = new Cesium3DTileStyle({
      pointSize: 2,
    });
    expect(style.pointSize).toEqual(new Expression("2"));
  });

  it("sets pointSize value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    const style = new Cesium3DTileStyle({
      pointSize: jsonExp,
    });
    expect(style.pointSize).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets pointSize expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.pointSize = 2;
    expect(style.pointSize).toEqual(new Expression("2"));

    const exp = new Expression("2");
    style.pointSize = exp;
    expect(style.pointSize).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    });

    style.pointSize = condExp;
    expect(style.pointSize).toEqual(condExp);

    style.pointSize = undefined;
    expect(style.pointSize).toBeUndefined();
  });

  it("sets style.pointSize expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.pointSize = new Expression("2");
    expect(style.style.pointSize).toEqual("2");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };
    style.pointSize = new ConditionsExpression(jsonExp);
    expect(style.style.pointSize).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.pointSize = customExpression;
    expect(style.style.pointSize).toEqual(customExpression);

    style.pointSize = undefined;
    expect(style.style.pointSize).toBeUndefined();
  });

  it("sets pointSize values in setter", function () {
    const defines = {
      targetPointSize: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.pointSize = 2;
    expect(style.pointSize).toEqual(new Expression("2"));

    style.pointSize = "${targetPointSize} + 1.0";
    expect(style.pointSize).toEqual(
      new Expression("${targetPointSize} + 1.0", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetPointSize}"],
      ],
    };

    style.pointSize = jsonExp;
    expect(style.pointSize).toEqual(new ConditionsExpression(jsonExp, defines));
  });

  it("sets style.pointSize values in setter", function () {
    const defines = {
      targetPointSize: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.pointSize = 2;
    expect(style.style.pointSize).toEqual("2");

    style.pointSize = "${targetPointSize} + 1.0";
    expect(style.style.pointSize).toEqual("${targetPointSize} + 1.0");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetPointSize}"],
      ],
    };

    style.pointSize = jsonExp;
    expect(style.style.pointSize).toEqual(jsonExp);
  });

  it("sets pointOutlineColor value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.pointOutlineColor).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.pointOutlineColor).toBeUndefined();
  });

  it("sets pointOutlineColor value to expression", function () {
    let style = new Cesium3DTileStyle({
      pointOutlineColor: 'color("red")',
    });
    expect(style.pointOutlineColor).toEqual(new Expression('color("red")'));

    style = new Cesium3DTileStyle({
      pointOutlineColor: "rgba(30, 30, 30, 0.5)",
    });
    expect(style.pointOutlineColor).toEqual(
      new Expression("rgba(30, 30, 30, 0.5)")
    );

    style = new Cesium3DTileStyle({
      pointOutlineColor:
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")',
    });
    expect(style.pointOutlineColor).toEqual(
      new Expression(
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
      )
    );
  });

  it("sets pointOutlineColor value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    const style = new Cesium3DTileStyle({
      pointOutlineColor: jsonExp,
    });
    expect(style.pointOutlineColor).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets pointOutlineColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression('color("red")');
    style.pointOutlineColor = exp;
    expect(style.pointOutlineColor).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    });

    style.pointOutlineColor = condExp;
    expect(style.pointOutlineColor).toEqual(condExp);

    style.pointOutlineColor = undefined;
    expect(style.pointOutlineColor).toBeUndefined();
  });

  it("sets style.pointOutlineColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.pointOutlineColor = new Expression('color("red")');
    expect(style.style.pointOutlineColor).toEqual('color("red")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    style.pointOutlineColor = new ConditionsExpression(jsonExp);
    expect(style.style.pointOutlineColor).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return Color.RED;
      },
      evaluateColor: function () {
        return Color.RED;
      },
    };
    style.pointOutlineColor = customExpression;
    expect(style.style.pointOutlineColor).toEqual(customExpression);

    style.pointOutlineColor = undefined;
    expect(style.style.pointOutlineColor).toBeUndefined();
  });

  it("sets pointOutlineColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.pointOutlineColor = 'color("${targetColor}")';
    expect(style.pointOutlineColor).toEqual(
      new Expression('color("${targetColor}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.pointOutlineColor = jsonExp;
    expect(style.pointOutlineColor).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.pointOutlineColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.pointOutlineColor = 'color("${targetColor}")';
    expect(style.style.pointOutlineColor).toEqual('color("${targetColor}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.pointOutlineColor = jsonExp;
    expect(style.style.pointOutlineColor).toEqual(jsonExp);
  });

  it("sets pointOutlineWidth value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.pointOutlineWidth).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.pointOutlineWidth).toBeUndefined();
  });

  it("sets pointOutlineWidth value to expression", function () {
    let style = new Cesium3DTileStyle({
      pointOutlineWidth: "2",
    });
    expect(style.pointOutlineWidth).toEqual(new Expression("2"));

    style = new Cesium3DTileStyle({
      pointOutlineWidth: "${height} / 10",
    });
    expect(style.pointOutlineWidth).toEqual(new Expression("${height} / 10"));

    style = new Cesium3DTileStyle({
      pointOutlineWidth: 2,
    });
    expect(style.pointOutlineWidth).toEqual(new Expression("2"));
  });

  it("sets pointOutlineWidth value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    const style = new Cesium3DTileStyle({
      pointOutlineWidth: jsonExp,
    });
    expect(style.pointOutlineWidth).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets pointOutlineWidth expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.pointOutlineWidth = 2;
    expect(style.pointOutlineWidth).toEqual(new Expression("2"));

    const exp = new Expression("2");
    style.pointOutlineWidth = exp;
    expect(style.pointOutlineWidth).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    });

    style.pointOutlineWidth = condExp;
    expect(style.pointOutlineWidth).toEqual(condExp);

    style.pointOutlineWidth = undefined;
    expect(style.pointOutlineWidth).toBeUndefined();
  });

  it("sets style.pointOutlineWidth expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.pointOutlineWidth = new Expression("2");
    expect(style.style.pointOutlineWidth).toEqual("2");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };
    style.pointOutlineWidth = new ConditionsExpression(jsonExp);
    expect(style.style.pointOutlineWidth).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.pointOutlineWidth = customExpression;
    expect(style.style.pointOutlineWidth).toEqual(customExpression);

    style.pointOutlineWidth = undefined;
    expect(style.style.pointOutlineWidth).toBeUndefined();
  });

  it("sets pointOutlineWidth values in setter", function () {
    const defines = {
      targetPointSize: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.pointOutlineWidth = 2;
    expect(style.pointOutlineWidth).toEqual(new Expression("2"));

    style.pointOutlineWidth = "${targetPointSize} + 1.0";
    expect(style.pointOutlineWidth).toEqual(
      new Expression("${targetPointSize} + 1.0", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetPointSize}"],
      ],
    };

    style.pointOutlineWidth = jsonExp;
    expect(style.pointOutlineWidth).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.pointOutlineWidth values in setter", function () {
    const defines = {
      targetPointSize: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.pointOutlineWidth = 2;
    expect(style.style.pointOutlineWidth).toEqual("2");

    style.pointOutlineWidth = "${targetPointSize} + 1.0";
    expect(style.style.pointOutlineWidth).toEqual("${targetPointSize} + 1.0");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetPointSize}"],
      ],
    };

    style.pointOutlineWidth = jsonExp;
    expect(style.style.pointOutlineWidth).toEqual(jsonExp);
  });

  it("sets labelColor value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelColor).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelColor).toBeUndefined();
  });

  it("sets labelColor value to expression", function () {
    let style = new Cesium3DTileStyle({
      labelColor: 'color("red")',
    });
    expect(style.labelColor).toEqual(new Expression('color("red")'));

    style = new Cesium3DTileStyle({
      labelColor: "rgba(30, 30, 30, 0.5)",
    });
    expect(style.labelColor).toEqual(new Expression("rgba(30, 30, 30, 0.5)"));

    style = new Cesium3DTileStyle({
      labelColor:
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")',
    });
    expect(style.labelColor).toEqual(
      new Expression(
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
      )
    );
  });

  it("sets labelColor value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelColor: jsonExp,
    });
    expect(style.labelColor).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets labelColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression('color("red")');
    style.labelColor = exp;
    expect(style.labelColor).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    });

    style.labelColor = condExp;
    expect(style.labelColor).toEqual(condExp);

    style.labelColor = undefined;
    expect(style.labelColor).toBeUndefined();
  });

  it("sets style.labelColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelColor = new Expression('color("red")');
    expect(style.style.labelColor).toEqual('color("red")');
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    style.labelColor = new ConditionsExpression(jsonExp);
    expect(style.style.labelColor).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return Color.RED;
      },
      evaluateColor: function () {
        return Color.RED;
      },
    };
    style.labelColor = customExpression;
    expect(style.style.labelColor).toEqual(customExpression);

    style.labelColor = undefined;
    expect(style.style.labelColor).toBeUndefined();
  });

  it("sets labelColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelColor = 'color("${targetColor}")';
    expect(style.labelColor).toEqual(
      new Expression('color("${targetColor}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.labelColor = jsonExp;
    expect(style.labelColor).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.labelColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelColor = 'color("${targetColor}")';
    expect(style.style.labelColor).toEqual('color("${targetColor}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.labelColor = jsonExp;
    expect(style.style.labelColor).toEqual(jsonExp);
  });

  it("sets labelOutlineColor value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelOutlineColor).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelOutlineColor).toBeUndefined();
  });

  it("sets labelOutlineColor value to expression", function () {
    let style = new Cesium3DTileStyle({
      labelOutlineColor: 'color("red")',
    });
    expect(style.labelOutlineColor).toEqual(new Expression('color("red")'));

    style = new Cesium3DTileStyle({
      labelOutlineColor: "rgba(30, 30, 30, 0.5)",
    });
    expect(style.labelOutlineColor).toEqual(
      new Expression("rgba(30, 30, 30, 0.5)")
    );

    style = new Cesium3DTileStyle({
      labelOutlineColor:
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")',
    });
    expect(style.labelOutlineColor).toEqual(
      new Expression(
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
      )
    );
  });

  it("sets labelOutlineColor value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelOutlineColor: jsonExp,
    });
    expect(style.labelOutlineColor).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets labelOutlineColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression('color("red")');
    style.labelOutlineColor = exp;
    expect(style.labelOutlineColor).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    });

    style.labelOutlineColor = condExp;
    expect(style.labelOutlineColor).toEqual(condExp);

    style.labelOutlineColor = undefined;
    expect(style.labelOutlineColor).toBeUndefined();
  });

  it("sets style.labelOutlineColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelOutlineColor = new Expression('color("red")');
    expect(style.style.labelOutlineColor).toEqual('color("red")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    style.labelOutlineColor = new ConditionsExpression(jsonExp);
    expect(style.style.labelOutlineColor).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return Color.RED;
      },
      evaluateColor: function () {
        return Color.RED;
      },
    };
    style.labelOutlineColor = customExpression;
    expect(style.style.labelOutlineColor).toEqual(customExpression);

    style.labelOutlineColor = undefined;
    expect(style.style.labelOutlineColor).toBeUndefined();
  });

  it("sets labelOutlineColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelOutlineColor = 'color("${targetColor}")';
    expect(style.labelOutlineColor).toEqual(
      new Expression('color("${targetColor}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.labelOutlineColor = jsonExp;
    expect(style.labelOutlineColor).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.labelOutlineColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelOutlineColor = 'color("${targetColor}")';
    expect(style.style.labelOutlineColor).toEqual('color("${targetColor}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.labelOutlineColor = jsonExp;
    expect(style.style.labelOutlineColor).toEqual(jsonExp);
  });

  it("sets labelOutlineWidth value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelOutlineWidth).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelOutlineWidth).toBeUndefined();
  });

  it("sets labelOutlineWidth value to expression", function () {
    let style = new Cesium3DTileStyle({
      labelOutlineWidth: "2",
    });
    expect(style.labelOutlineWidth).toEqual(new Expression("2"));

    style = new Cesium3DTileStyle({
      labelOutlineWidth: "${height} / 10",
    });
    expect(style.labelOutlineWidth).toEqual(new Expression("${height} / 10"));

    style = new Cesium3DTileStyle({
      labelOutlineWidth: 2,
    });
    expect(style.labelOutlineWidth).toEqual(new Expression("2"));
  });

  it("sets labelOutlineWidth value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelOutlineWidth: jsonExp,
    });
    expect(style.labelOutlineWidth).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets labelOutlineWidth expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelOutlineWidth = 2;
    expect(style.labelOutlineWidth).toEqual(new Expression("2"));

    const exp = new Expression("2");
    style.labelOutlineWidth = exp;
    expect(style.labelOutlineWidth).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    });

    style.labelOutlineWidth = condExp;
    expect(style.labelOutlineWidth).toEqual(condExp);

    style.labelOutlineWidth = undefined;
    expect(style.labelOutlineWidth).toBeUndefined();
  });

  it("sets style.labelOutlineWidth expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelOutlineWidth = new Expression("2");
    expect(style.style.labelOutlineWidth).toEqual("2");
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };
    style.labelOutlineWidth = new ConditionsExpression(jsonExp);
    expect(style.style.labelOutlineWidth).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.labelOutlineWidth = customExpression;
    expect(style.style.labelOutlineWidth).toEqual(customExpression);

    style.labelOutlineWidth = undefined;
    expect(style.style.labelOutlineWidth).toBeUndefined();
  });

  it("sets labelOutlineWidth values in setter", function () {
    const defines = {
      targetLabelSize: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelOutlineWidth = 2;
    expect(style.labelOutlineWidth).toEqual(new Expression("2"));

    style.labelOutlineWidth = "${targetLabelSize} + 1.0";
    expect(style.labelOutlineWidth).toEqual(
      new Expression("${targetLabelSize} + 1.0", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetLabelSize}"],
      ],
    };

    style.labelOutlineWidth = jsonExp;
    expect(style.labelOutlineWidth).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.labelOutlineWidth values in setter", function () {
    const defines = {
      targetLabelSize: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelOutlineWidth = 2;
    expect(style.style.labelOutlineWidth).toEqual("2");

    style.labelOutlineWidth = "${targetLabelSize} + 1.0";
    expect(style.style.labelOutlineWidth).toEqual("${targetLabelSize} + 1.0");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetLabelSize}"],
      ],
    };

    style.labelOutlineWidth = jsonExp;
    expect(style.style.labelOutlineWidth).toEqual(jsonExp);
  });

  it("sets font value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.font).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.font).toBeUndefined();
  });

  it("sets font value to expression", function () {
    let style = new Cesium3DTileStyle({
      font: "'24px Helvetica'",
    });
    expect(style.font).toEqual(new Expression("'24px Helvetica'"));

    style = new Cesium3DTileStyle({
      font: "${font}",
    });
    expect(style.font).toEqual(new Expression("${font}"));

    style = new Cesium3DTileStyle({
      font: "'24px Helvetica'",
    });
    expect(style.font).toEqual(new Expression("'24px Helvetica'"));
  });

  it("sets font value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "'30px Helvetica'"],
        ["true", "'24px Helvetica'"],
      ],
    };

    const style = new Cesium3DTileStyle({
      font: jsonExp,
    });
    expect(style.font).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets font expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.font = "'24px Helvetica'";
    expect(style.font).toEqual(new Expression("'24px Helvetica'"));

    const exp = new Expression("'24px Helvetica'");
    style.font = exp;
    expect(style.font).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "'30px Helvetica'"],
        ["true", "'24px Helvetica'"],
      ],
    });

    style.font = condExp;
    expect(style.font).toEqual(condExp);

    style.font = undefined;
    expect(style.font).toBeUndefined();
  });

  it("sets style.font expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.font = new Expression("'24px Helvetica'");
    expect(style.style.font).toEqual("'24px Helvetica'");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'30px Helvetica'"],
        ["true", "'24px Helvetica'"],
      ],
    };

    style.font = new ConditionsExpression(jsonExp);
    expect(style.style.font).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return "'24px Helvetica'";
      },
    };
    style.font = customExpression;
    expect(style.style.font).toEqual(customExpression);

    style.font = undefined;
    expect(style.style.font).toBeUndefined();
  });

  it("sets font values in setter", function () {
    const defines = {
      targetFont: "'30px Helvetica'",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.font = "'24px Helvetica'";
    expect(style.font).toEqual(new Expression("'24px Helvetica'"));

    style.font = "${targetFont}";
    expect(style.font).toEqual(new Expression("${targetFont}", defines));

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'24px Helvetica'"],
        ["true", "${targetFont}"],
      ],
    };

    style.font = jsonExp;
    expect(style.font).toEqual(new ConditionsExpression(jsonExp, defines));
  });

  it("sets style.font values in setter", function () {
    const defines = {
      targetFont: "'30px Helvetica'",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.font = "'24px Helvetica'";
    expect(style.style.font).toEqual("'24px Helvetica'");

    style.font = "${targetFont}";
    expect(style.style.font).toEqual("${targetFont}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'24px Helvetica'"],
        ["true", "${targetFont}"],
      ],
    };

    style.font = jsonExp;
    expect(style.style.font).toEqual(jsonExp);
  });

  it("sets labelStyle value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelStyle).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelStyle).toBeUndefined();
  });

  it("sets labelStyle value to expression", function () {
    const style = new Cesium3DTileStyle({
      labelStyle: "2",
    });
    expect(style.labelStyle).toEqual(new Expression("2"));
  });

  it("sets labelStyle value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "2"],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelStyle: jsonExp,
    });
    expect(style.labelStyle).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets labelStyle expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelStyle = 2;
    expect(style.labelStyle).toEqual(new Expression("2"));

    const exp = new Expression("2");
    style.labelStyle = exp;
    expect(style.labelStyle).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1"],
        ["true", "2"],
      ],
    });

    style.labelStyle = condExp;
    expect(style.labelStyle).toEqual(condExp);

    style.labelStyle = undefined;
    expect(style.labelStyle).toBeUndefined();
  });

  it("sets style.labelStyle expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelStyle = new Expression("2");
    expect(style.style.labelStyle).toEqual("2");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "2"],
      ],
    };
    style.labelStyle = new ConditionsExpression(jsonExp);
    expect(style.style.labelStyle).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 0;
      },
    };
    style.labelStyle = customExpression;
    expect(style.style.labelStyle).toEqual(customExpression);

    style.labelStyle = undefined;
    expect(style.style.labelStyle).toBeUndefined();
  });

  it("sets labelStyle values in setter", function () {
    const defines = {
      targetLabelStyle: "2",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelStyle = 2;
    expect(style.labelStyle).toEqual(new Expression("2"));

    style.labelStyle = "${targetLabelStyle}";
    expect(style.labelStyle).toEqual(
      new Expression("${targetLabelStyle}", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetLabelStyle}"],
      ],
    };

    style.labelStyle = jsonExp;
    expect(style.labelStyle).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.labelStyle values in setter", function () {
    const defines = {
      targetLabelStyle: "2",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelStyle = 2;
    expect(style.style.labelStyle).toEqual("2");

    style.labelStyle = "${targetLabelStyle}";
    expect(style.style.labelStyle).toEqual("${targetLabelStyle}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetLabelStyle}"],
      ],
    };

    style.labelStyle = jsonExp;
    expect(style.style.labelStyle).toEqual(jsonExp);
  });

  it("sets labelText value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelText).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelText).toBeUndefined();
  });

  it("sets labelText value to expression", function () {
    let style = new Cesium3DTileStyle({
      labelText: "'test text'",
    });
    expect(style.labelText).toEqual(new Expression("'test text'"));

    style = new Cesium3DTileStyle({
      labelText: "${text}",
    });
    expect(style.labelText).toEqual(new Expression("${text}"));

    style = new Cesium3DTileStyle({
      labelText: "'test text'",
    });
    expect(style.labelText).toEqual(new Expression("'test text'"));
  });

  it("sets labelText value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "'test text 1'"],
        ["true", "'test text 2'"],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelText: jsonExp,
    });
    expect(style.labelText).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets labelText expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelText = "'test text'";
    expect(style.labelText).toEqual(new Expression("'test text'"));

    const exp = new Expression("'test text'");
    style.labelText = exp;
    expect(style.labelText).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "'test text 1'"],
        ["true", "'test text 2'"],
      ],
    });

    style.labelText = condExp;
    expect(style.labelText).toEqual(condExp);

    style.labelText = undefined;
    expect(style.labelText).toBeUndefined();
  });

  it("sets style.labelText expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelText = new Expression("'test text'");
    expect(style.style.labelText).toEqual("'test text'");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'test text 1'"],
        ["true", "'test text 2'"],
      ],
    };

    style.labelText = new ConditionsExpression(jsonExp);
    expect(style.style.labelText).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return "'test text 1'";
      },
    };
    style.labelText = customExpression;
    expect(style.style.labelText).toEqual(customExpression);

    style.labelText = undefined;
    expect(style.style.labelText).toBeUndefined();
  });

  it("sets labelText values in setter", function () {
    const defines = {
      targetText: "'test text 1'",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelText = "'test text'";
    expect(style.labelText).toEqual(new Expression("'test text'"));

    style.labelText = "${targetText}";
    expect(style.labelText).toEqual(new Expression("${targetText}", defines));

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'test text 2'"],
        ["true", "${targetText}"],
      ],
    };

    style.labelText = jsonExp;
    expect(style.labelText).toEqual(new ConditionsExpression(jsonExp, defines));
  });

  it("sets style.labelText values in setter", function () {
    const defines = {
      targetText: "'test text 1'",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelText = "'test text'";
    expect(style.style.labelText).toEqual("'test text'");

    style.labelText = "${targetText}";
    expect(style.style.labelText).toEqual("${targetText}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'test text 2'"],
        ["true", "${targetText}"],
      ],
    };

    style.labelText = jsonExp;
    expect(style.style.labelText).toEqual(jsonExp);
  });

  it("sets backgroundColor value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.backgroundColor).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.backgroundColor).toBeUndefined();
  });

  it("sets backgroundColor value to expression", function () {
    let style = new Cesium3DTileStyle({
      backgroundColor: 'color("red")',
    });
    expect(style.backgroundColor).toEqual(new Expression('color("red")'));

    style = new Cesium3DTileStyle({
      backgroundColor: "rgba(30, 30, 30, 0.5)",
    });
    expect(style.backgroundColor).toEqual(
      new Expression("rgba(30, 30, 30, 0.5)")
    );

    style = new Cesium3DTileStyle({
      backgroundColor:
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")',
    });
    expect(style.backgroundColor).toEqual(
      new Expression(
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
      )
    );
  });

  it("sets backgroundColor value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    const style = new Cesium3DTileStyle({
      backgroundColor: jsonExp,
    });
    expect(style.backgroundColor).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets backgroundColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression('color("red")');
    style.backgroundColor = exp;
    expect(style.backgroundColor).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    });

    style.backgroundColor = condExp;
    expect(style.backgroundColor).toEqual(condExp);

    style.backgroundColor = undefined;
    expect(style.backgroundColor).toBeUndefined();
  });

  it("sets style.backgroundColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.backgroundColor = new Expression('color("red")');
    expect(style.style.backgroundColor).toEqual('color("red")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    style.backgroundColor = new ConditionsExpression(jsonExp);
    expect(style.style.backgroundColor).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return Color.RED;
      },
      evaluateColor: function () {
        return Color.RED;
      },
    };
    style.backgroundColor = customExpression;
    expect(style.style.backgroundColor).toEqual(customExpression);

    style.backgroundColor = undefined;
    expect(style.style.backgroundColor).toBeUndefined();
  });

  it("sets backgroundColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.backgroundColor = 'color("${targetColor}")';
    expect(style.backgroundColor).toEqual(
      new Expression('color("${targetColor}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.backgroundColor = jsonExp;
    expect(style.backgroundColor).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.backgroundColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.backgroundColor = 'color("${targetColor}")';
    expect(style.style.backgroundColor).toEqual('color("${targetColor}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.backgroundColor = jsonExp;
    expect(style.style.backgroundColor).toEqual(jsonExp);
  });

  it("sets backgroundPadding value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.backgroundPadding).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.backgroundPadding).toBeUndefined();
  });

  it("sets backgroundPadding value to expression", function () {
    let style = new Cesium3DTileStyle({
      backgroundPadding: "vec2(1.0, 2.0)",
    });
    expect(style.backgroundPadding).toEqual(new Expression("vec2(1.0, 2.0)"));

    style = new Cesium3DTileStyle({
      backgroundPadding: "vec2(3.0, 4.0)",
    });
    expect(style.backgroundPadding).toEqual(new Expression("vec2(3.0, 4.0)"));

    style = new Cesium3DTileStyle({
      backgroundPadding:
        "(${height} * 10 >= 1000) ? vec2(1.0, 2.0) : vec2(3.0, 4.0)",
    });
    expect(style.backgroundPadding).toEqual(
      new Expression(
        "(${height} * 10 >= 1000) ? vec2(1.0, 2.0) : vec2(3.0, 4.0)"
      )
    );
  });

  it("sets backgroundPadding value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec2(1.0, 2.0)"],
        ["true", "vec2(3.0, 4.0)"],
      ],
    };

    const style = new Cesium3DTileStyle({
      backgroundPadding: jsonExp,
    });
    expect(style.backgroundPadding).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets backgroundPadding expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression("vec2(1.0, 2.0)");
    style.backgroundPadding = exp;
    expect(style.backgroundPadding).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "vec2(1.0, 2.0)"],
        ["true", "vec2(3.0, 4.0)"],
      ],
    });

    style.backgroundPadding = condExp;
    expect(style.backgroundPadding).toEqual(condExp);

    style.backgroundPadding = undefined;
    expect(style.backgroundPadding).toBeUndefined();
  });

  it("sets style.backgroundPadding expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.backgroundPadding = new Expression("vec2(1.0, 2.0)");
    expect(style.style.backgroundPadding).toEqual("vec2(1.0, 2.0)");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec2(1.0, 2.0)"],
        ["true", "vec2(3.0, 4.0)"],
      ],
    };

    const customExpression = {
      evaluate: function () {
        return new Cartesian2(1.0, 2.0);
      },
    };
    style.labelText = customExpression;
    expect(style.style.labelText).toEqual(customExpression);

    style.backgroundPadding = new ConditionsExpression(jsonExp);
    expect(style.style.backgroundPadding).toEqual(jsonExp);

    style.backgroundPadding = undefined;
    expect(style.style.backgroundPadding).toBeUndefined();
  });

  it("sets backgroundPadding values in setter", function () {
    const defines = {
      targetPadding: "3.0, 4.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.backgroundPadding = 'vec2("${targetPadding}")';
    expect(style.backgroundPadding).toEqual(
      new Expression('vec2("${targetPadding}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec2(1.0, 2.0)"],
        ["true", 'vec2("${targetPadding}")'],
      ],
    };

    style.backgroundPadding = jsonExp;
    expect(style.backgroundPadding).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.backgroundPadding values in setter", function () {
    const defines = {
      targetPadding: "3.0, 4.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.backgroundPadding = 'vec2("${targetPadding}")';
    expect(style.style.backgroundPadding).toEqual('vec2("${targetPadding}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec2(1.0, 2.0)"],
        ["true", 'vec2("${targetPadding}")'],
      ],
    };

    style.backgroundPadding = jsonExp;
    expect(style.style.backgroundPadding).toEqual(jsonExp);
  });

  it("sets backgroundEnabled value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.backgroundEnabled).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.backgroundEnabled).toBeUndefined();
  });

  it("sets backgroundEnabled value to expression", function () {
    let style = new Cesium3DTileStyle({
      backgroundEnabled: "true",
    });
    expect(style.backgroundEnabled).toEqual(new Expression("true"));

    style = new Cesium3DTileStyle({
      backgroundEnabled: "false",
    });
    expect(style.backgroundEnabled).toEqual(new Expression("false"));

    style = new Cesium3DTileStyle({
      backgroundEnabled: "${height} * 10 >= 1000",
    });
    expect(style.backgroundEnabled).toEqual(
      new Expression("${height} * 10 >= 1000")
    );

    style = new Cesium3DTileStyle({
      backgroundEnabled: true,
    });
    expect(style.backgroundEnabled).toEqual(new Expression("true"));

    style = new Cesium3DTileStyle({
      backgroundEnabled: false,
    });
    expect(style.backgroundEnabled).toEqual(new Expression("false"));
  });

  it("sets backgroundEnabled value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    };

    const style = new Cesium3DTileStyle({
      backgroundEnabled: jsonExp,
    });
    expect(style.backgroundEnabled).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets backgroundEnabled expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    });

    style.backgroundEnabled = condExp;
    expect(style.backgroundEnabled).toEqual(condExp);

    const exp = new Expression("false");
    style.backgroundEnabled = exp;
    expect(style.backgroundEnabled).toEqual(exp);
  });

  it("sets style.backgroundEnabled expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.backgroundEnabled = new Expression("false");
    expect(style.style.backgroundEnabled).toEqual("false");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    };

    style.backgroundEnabled = new ConditionsExpression(jsonExp);
    expect(style.style.backgroundEnabled).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return true;
      },
    };
    style.backgroundEnabled = customExpression;
    expect(style.style.backgroundEnabled).toEqual(customExpression);
  });

  it("sets backgroundEnabled values in setter", function () {
    const defines = {
      backgroundFactor: 10,
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.backgroundEnabled = "${height} * ${backgroundFactor} >= 1000";
    expect(style.backgroundEnabled).toEqual(
      new Expression("${height} * ${backgroundFactor} >= 1000", defines)
    );

    style.backgroundEnabled = false;
    expect(style.backgroundEnabled).toEqual(new Expression("false"));

    const jsonExp = {
      conditions: [
        ["${height} > ${backgroundFactor}", "false"],
        ["true", "true"],
      ],
    };

    style.backgroundEnabled = jsonExp;
    expect(style.backgroundEnabled).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );

    style.backgroundEnabled = undefined;
    expect(style.backgroundEnabled).toBeUndefined();
  });

  it("sets style.backgroundEnabled values in setter", function () {
    const defines = {
      backgroundFactor: 10,
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.backgroundEnabled = "${height} * ${backgroundFactor} >= 1000";
    expect(style.style.backgroundEnabled).toEqual(
      "${height} * ${backgroundFactor} >= 1000"
    );

    style.backgroundEnabled = false;
    expect(style.style.backgroundEnabled).toEqual("false");

    const jsonExp = {
      conditions: [
        ["${height} > ${backgroundFactor}", "false"],
        ["true", "true"],
      ],
    };

    style.backgroundEnabled = jsonExp;
    expect(style.style.backgroundEnabled).toEqual(jsonExp);

    style.backgroundEnabled = undefined;
    expect(style.style.backgroundEnabled).toBeUndefined();
  });

  it("sets scaleByDistance value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.scaleByDistance).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.scaleByDistance).toBeUndefined();
  });

  it("sets scaleByDistance value to expression", function () {
    let style = new Cesium3DTileStyle({
      scaleByDistance: "vec4(1.0, 2.0, 3.0, 4.0)",
    });
    expect(style.scaleByDistance).toEqual(
      new Expression("vec4(1.0, 2.0, 3.0, 4.0)")
    );

    style = new Cesium3DTileStyle({
      scaleByDistance: "vec4(5.0, 6.0, 7.0, 8.0)",
    });
    expect(style.scaleByDistance).toEqual(
      new Expression("vec4(5.0, 6.0, 7.0, 8.0)")
    );

    style = new Cesium3DTileStyle({
      scaleByDistance:
        "(${height} * 10 >= 1000) ? vec4(1.0, 2.0, 3.0, 4.0) : vec4(5.0, 6.0, 7.0, 8.0)",
    });
    expect(style.scaleByDistance).toEqual(
      new Expression(
        "(${height} * 10 >= 1000) ? vec4(1.0, 2.0, 3.0, 4.0) : vec4(5.0, 6.0, 7.0, 8.0)"
      )
    );
  });

  it("sets scaleByDistance value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(1.0, 2.0, 3.0, 4.0)"],
        ["true", "vec4(5.0, 6.0, 7.0, 8.0)"],
      ],
    };

    const style = new Cesium3DTileStyle({
      scaleByDistance: jsonExp,
    });
    expect(style.scaleByDistance).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets scaleByDistance expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression("vec4(5.0, 6.0, 7.0, 8.0)");
    style.scaleByDistance = exp;
    expect(style.scaleByDistance).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "vec4(1.0, 2.0, 3.0, 4.0)"],
        ["true", "vec4(5.0, 6.0, 7.0, 8.0)"],
      ],
    });

    style.scaleByDistance = condExp;
    expect(style.scaleByDistance).toEqual(condExp);

    style.scaleByDistance = undefined;
    expect(style.scaleByDistance).toBeUndefined();
  });

  it("sets style.scaleByDistance expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.scaleByDistance = new Expression("vec4(5.0, 6.0, 7.0, 8.0)");
    expect(style.style.scaleByDistance).toEqual("vec4(5.0, 6.0, 7.0, 8.0)");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(1.0, 2.0, 3.0, 4.0)"],
        ["true", "vec4(5.0, 6.0, 7.0, 8.0)"],
      ],
    };

    style.scaleByDistance = new ConditionsExpression(jsonExp);
    expect(style.style.scaleByDistance).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return new Cartesian4(1.0, 2.0, 3.0, 4.0);
      },
    };
    style.scaleByDistance = customExpression;
    expect(style.style.scaleByDistance).toEqual(customExpression);

    style.scaleByDistance = undefined;
    expect(style.style.scaleByDistance).toBeUndefined();
  });

  it("sets scaleByDistance values in setter", function () {
    const defines = {
      targetScale: "1.0, 2.0, 3.0, 4.",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.scaleByDistance = 'vec4("${targetScale}")';
    expect(style.scaleByDistance).toEqual(
      new Expression('vec4("${targetScale}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(5.0, 6.0, 7.0, 8.0)"],
        ["true", 'vec4("${targetScale}")'],
      ],
    };

    style.scaleByDistance = jsonExp;
    expect(style.scaleByDistance).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.scaleByDistance values in setter", function () {
    const defines = {
      targetScale: "1.0, 2.0, 3.0, 4.",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.scaleByDistance = 'vec4("${targetScale}")';
    expect(style.style.scaleByDistance).toEqual('vec4("${targetScale}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(5.0, 6.0, 7.0, 8.0)"],
        ["true", 'vec4("${targetScale}")'],
      ],
    };

    style.scaleByDistance = jsonExp;
    expect(style.style.scaleByDistance).toEqual(jsonExp);
  });

  it("sets distanceDisplayCondition value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.distanceDisplayCondition).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.distanceDisplayCondition).toBeUndefined();
  });

  it("sets distanceDisplayCondition value to expression", function () {
    let style = new Cesium3DTileStyle({
      distanceDisplayCondition: "vec4(1.0, 2.0, 3.0, 4.0)",
    });
    expect(style.distanceDisplayCondition).toEqual(
      new Expression("vec4(1.0, 2.0, 3.0, 4.0)")
    );

    style = new Cesium3DTileStyle({
      distanceDisplayCondition: "vec4(5.0, 6.0, 7.0, 8.0)",
    });
    expect(style.distanceDisplayCondition).toEqual(
      new Expression("vec4(5.0, 6.0, 7.0, 8.0)")
    );

    style = new Cesium3DTileStyle({
      distanceDisplayCondition:
        "(${height} * 10 >= 1000) ? vec4(1.0, 2.0, 3.0, 4.0) : vec4(5.0, 6.0, 7.0, 8.0)",
    });
    expect(style.distanceDisplayCondition).toEqual(
      new Expression(
        "(${height} * 10 >= 1000) ? vec4(1.0, 2.0, 3.0, 4.0) : vec4(5.0, 6.0, 7.0, 8.0)"
      )
    );
  });

  it("sets distanceDisplayCondition value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(1.0, 2.0, 3.0, 4.0)"],
        ["true", "vec4(5.0, 6.0, 7.0, 8.0)"],
      ],
    };

    const style = new Cesium3DTileStyle({
      distanceDisplayCondition: jsonExp,
    });
    expect(style.distanceDisplayCondition).toEqual(
      new ConditionsExpression(jsonExp)
    );
  });

  it("sets distanceDisplayCondition expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression("vec4(5.0, 6.0, 7.0, 8.0)");
    style.distanceDisplayCondition = exp;
    expect(style.distanceDisplayCondition).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "vec4(1.0, 2.0, 3.0, 4.0)"],
        ["true", "vec4(5.0, 6.0, 7.0, 8.0)"],
      ],
    });

    style.distanceDisplayCondition = condExp;
    expect(style.distanceDisplayCondition).toEqual(condExp);

    style.distanceDisplayCondition = undefined;
    expect(style.distanceDisplayCondition).toBeUndefined();
  });

  it("sets style.distanceDisplayCondition expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.distanceDisplayCondition = new Expression("vec4(5.0, 6.0, 7.0, 8.0)");
    expect(style.style.distanceDisplayCondition).toEqual(
      "vec4(5.0, 6.0, 7.0, 8.0)"
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(1.0, 2.0, 3.0, 4.0)"],
        ["true", "vec4(5.0, 6.0, 7.0, 8.0)"],
      ],
    };

    style.distanceDisplayCondition = new ConditionsExpression(jsonExp);
    expect(style.style.distanceDisplayCondition).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return new Cartesian4(1.0, 2.0, 3.0, 4.0);
      },
    };
    style.distanceDisplayCondition = customExpression;
    expect(style.style.distanceDisplayCondition).toEqual(customExpression);

    style.distanceDisplayCondition = undefined;
    expect(style.style.distanceDisplayCondition).toBeUndefined();
  });

  it("sets distanceDisplayCondition values in setter", function () {
    const defines = {
      targetTranslucency: "1.0, 2.0, 3.0, 4.",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.distanceDisplayCondition = 'vec4("${targetTranslucency}")';
    expect(style.distanceDisplayCondition).toEqual(
      new Expression('vec4("${targetTranslucency}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(5.0, 6.0, 7.0, 8.0)"],
        ["true", 'vec4("${targetTranslucency}")'],
      ],
    };

    style.distanceDisplayCondition = jsonExp;
    expect(style.distanceDisplayCondition).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.distanceDisplayCondition values in setter", function () {
    const defines = {
      targetTranslucency: "1.0, 2.0, 3.0, 4.",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.distanceDisplayCondition = 'vec4("${targetTranslucency}")';
    expect(style.style.distanceDisplayCondition).toEqual(
      'vec4("${targetTranslucency}")'
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "vec4(5.0, 6.0, 7.0, 8.0)"],
        ["true", 'vec4("${targetTranslucency}")'],
      ],
    };

    style.distanceDisplayCondition = jsonExp;
    expect(style.style.distanceDisplayCondition).toEqual(jsonExp);
  });

  it("sets heightOffset value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.heightOffset).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.heightOffset).toBeUndefined();
  });

  it("sets heightOffset value to expression", function () {
    let style = new Cesium3DTileStyle({
      heightOffset: "2",
    });
    expect(style.heightOffset).toEqual(new Expression("2"));

    style = new Cesium3DTileStyle({
      heightOffset: "${height} / 10",
    });
    expect(style.heightOffset).toEqual(new Expression("${height} / 10"));

    style = new Cesium3DTileStyle({
      heightOffset: 2,
    });
    expect(style.heightOffset).toEqual(new Expression("2"));
  });

  it("sets heightOffset value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    const style = new Cesium3DTileStyle({
      heightOffset: jsonExp,
    });
    expect(style.heightOffset).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets heightOffset expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.heightOffset = 2;
    expect(style.heightOffset).toEqual(new Expression("2"));

    const exp = new Expression("2");
    style.heightOffset = exp;
    expect(style.heightOffset).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    });

    style.heightOffset = condExp;
    expect(style.heightOffset).toEqual(condExp);

    style.heightOffset = undefined;
    expect(style.heightOffset).toBeUndefined();
  });

  it("sets style.heightOffset expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.heightOffset = new Expression("2");
    expect(style.style.heightOffset).toEqual("2");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    style.heightOffset = new ConditionsExpression(jsonExp);
    expect(style.style.heightOffset).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 2;
      },
    };
    style.heightOffset = customExpression;
    expect(style.style.heightOffset).toEqual(customExpression);

    style.heightOffset = undefined;
    expect(style.style.heightOffset).toBeUndefined();
  });

  it("sets heightOffset values in setter", function () {
    const defines = {
      targetHeight: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.heightOffset = 2;
    expect(style.heightOffset).toEqual(new Expression("2"));

    style.heightOffset = "${targetHeight} + 1.0";
    expect(style.heightOffset).toEqual(
      new Expression("${targetHeight} + 1.0", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetHeight}"],
      ],
    };

    style.heightOffset = jsonExp;
    expect(style.heightOffset).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.heightOffset values in setter", function () {
    const defines = {
      targetHeight: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.heightOffset = "${targetHeight} + 1.0";
    expect(style.style.heightOffset).toEqual("${targetHeight} + 1.0");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetHeight}"],
      ],
    };

    style.heightOffset = jsonExp;
    expect(style.style.heightOffset).toEqual(jsonExp);
  });

  it("sets anchorLineEnabled value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.anchorLineEnabled).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.anchorLineEnabled).toBeUndefined();
  });

  it("sets anchorLineEnabled value to expression", function () {
    let style = new Cesium3DTileStyle({
      anchorLineEnabled: "true",
    });
    expect(style.anchorLineEnabled).toEqual(new Expression("true"));

    style = new Cesium3DTileStyle({
      anchorLineEnabled: "false",
    });
    expect(style.anchorLineEnabled).toEqual(new Expression("false"));

    style = new Cesium3DTileStyle({
      anchorLineEnabled: "${height} * 10 >= 1000",
    });
    expect(style.anchorLineEnabled).toEqual(
      new Expression("${height} * 10 >= 1000")
    );

    style = new Cesium3DTileStyle({
      anchorLineEnabled: true,
    });
    expect(style.anchorLineEnabled).toEqual(new Expression("true"));

    style = new Cesium3DTileStyle({
      anchorLineEnabled: false,
    });
    expect(style.anchorLineEnabled).toEqual(new Expression("false"));
  });

  it("sets anchorLineEnabled value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    };

    const style = new Cesium3DTileStyle({
      anchorLineEnabled: jsonExp,
    });
    expect(style.anchorLineEnabled).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets anchorLineEnabled expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    });

    style.anchorLineEnabled = condExp;
    expect(style.anchorLineEnabled).toEqual(condExp);

    const exp = new Expression("false");
    style.anchorLineEnabled = exp;
    expect(style.anchorLineEnabled).toEqual(exp);
  });

  it("sets style.anchorLineEnabled expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.anchorLineEnabled = new Expression("false");
    expect(style.style.anchorLineEnabled).toEqual("false");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "false"],
        ["true", "true"],
      ],
    };

    style.anchorLineEnabled = new ConditionsExpression(jsonExp);
    expect(style.style.anchorLineEnabled).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return true;
      },
    };
    style.anchorLineEnabled = customExpression;
    expect(style.style.anchorLineEnabled).toEqual(customExpression);
  });

  it("sets anchorLineEnabled values in setter", function () {
    const defines = {
      anchorFactor: 10,
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.anchorLineEnabled = "${height} * ${anchorFactor} >= 1000";
    expect(style.anchorLineEnabled).toEqual(
      new Expression("${height} * ${anchorFactor} >= 1000", defines)
    );

    style.anchorLineEnabled = false;
    expect(style.anchorLineEnabled).toEqual(new Expression("false"));

    const jsonExp = {
      conditions: [
        ["${height} > ${anchorFactor}", "false"],
        ["true", "true"],
      ],
    };

    style.anchorLineEnabled = jsonExp;
    expect(style.anchorLineEnabled).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );

    style.anchorLineEnabled = undefined;
    expect(style.anchorLineEnabled).toBeUndefined();
  });

  it("sets style.anchorLineEnabled values in setter", function () {
    const defines = {
      anchorFactor: 10,
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.anchorLineEnabled = "${height} * ${anchorFactor} >= 1000";
    expect(style.style.anchorLineEnabled).toEqual(
      "${height} * ${anchorFactor} >= 1000"
    );

    style.anchorLineEnabled = false;
    expect(style.style.anchorLineEnabled).toEqual("false");

    const jsonExp = {
      conditions: [
        ["${height} > ${anchorFactor}", "false"],
        ["true", "true"],
      ],
    };

    style.anchorLineEnabled = jsonExp;
    expect(style.style.anchorLineEnabled).toEqual(jsonExp);

    style.anchorLineEnabled = undefined;
    expect(style.style.anchorLineEnabled).toBeUndefined();
  });

  it("sets anchorLineColor value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.anchorLineColor).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.anchorLineColor).toBeUndefined();
  });

  it("sets anchorLineColor value to expression", function () {
    let style = new Cesium3DTileStyle({
      anchorLineColor: 'color("red")',
    });
    expect(style.anchorLineColor).toEqual(new Expression('color("red")'));

    style = new Cesium3DTileStyle({
      anchorLineColor: "rgba(30, 30, 30, 0.5)",
    });
    expect(style.anchorLineColor).toEqual(
      new Expression("rgba(30, 30, 30, 0.5)")
    );

    style = new Cesium3DTileStyle({
      anchorLineColor:
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")',
    });
    expect(style.anchorLineColor).toEqual(
      new Expression(
        '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
      )
    );
  });

  it("sets anchorLineColor value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    const style = new Cesium3DTileStyle({
      anchorLineColor: jsonExp,
    });
    expect(style.anchorLineColor).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets anchorLineColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    const exp = new Expression('color("red")');
    style.anchorLineColor = exp;
    expect(style.anchorLineColor).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    });

    style.anchorLineColor = condExp;
    expect(style.anchorLineColor).toEqual(condExp);

    style.anchorLineColor = undefined;
    expect(style.anchorLineColor).toBeUndefined();
  });

  it("sets style.anchorLineColor expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.anchorLineColor = new Expression('color("red")');
    expect(style.style.anchorLineColor).toEqual('color("red")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("blue")'],
      ],
    };

    style.anchorLineColor = new ConditionsExpression(jsonExp);
    expect(style.style.anchorLineColor).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return Color.RED;
      },
      evaluateColor: function () {
        return Color.RED;
      },
    };
    style.anchorLineColor = customExpression;
    expect(style.style.anchorLineColor).toEqual(customExpression);

    style.anchorLineColor = undefined;
    expect(style.style.anchorLineColor).toBeUndefined();
  });

  it("sets anchorLineColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.anchorLineColor = 'color("${targetColor}")';
    expect(style.anchorLineColor).toEqual(
      new Expression('color("${targetColor}")', defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.anchorLineColor = jsonExp;
    expect(style.anchorLineColor).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.anchorLineColor values in setter", function () {
    const defines = {
      targetColor: "red",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.anchorLineColor = 'color("${targetColor}")';
    expect(style.style.anchorLineColor).toEqual('color("${targetColor}")');

    const jsonExp = {
      conditions: [
        ["${height} > 2", 'color("cyan")'],
        ["true", 'color("${targetColor}")'],
      ],
    };

    style.anchorLineColor = jsonExp;
    expect(style.style.anchorLineColor).toEqual(jsonExp);
  });

  it("sets image value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.image).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.image).toBeUndefined();
  });

  it("sets image value to expression", function () {
    let style = new Cesium3DTileStyle({
      image: "'url/to/image'",
    });
    expect(style.image).toEqual(new Expression("'url/to/image'"));

    style = new Cesium3DTileStyle({
      image: "${url}",
    });
    expect(style.image).toEqual(new Expression("${url}"));

    style = new Cesium3DTileStyle({
      image: "'url/to/image'",
    });
    expect(style.image).toEqual(new Expression("'url/to/image'"));
  });

  it("sets image value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "'url/to/image1'"],
        ["true", "'url/to/image2'"],
      ],
    };

    const style = new Cesium3DTileStyle({
      image: jsonExp,
    });
    expect(style.image).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets image expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.image = "'url/to/image'";
    expect(style.image).toEqual(new Expression("'url/to/image'"));

    const exp = new Expression("'url/to/image'");
    style.image = exp;
    expect(style.image).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "'url/to/image1'"],
        ["true", "'url/to/image2'"],
      ],
    });

    style.image = condExp;
    expect(style.image).toEqual(condExp);

    style.image = undefined;
    expect(style.image).toBeUndefined();
  });

  it("sets style.image expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.image = new Expression("'url/to/image'");
    expect(style.style.image).toEqual("'url/to/image'");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'url/to/image1'"],
        ["true", "'url/to/image2'"],
      ],
    };

    style.image = new ConditionsExpression(jsonExp);
    expect(style.style.image).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return "'url/to/image1'";
      },
    };
    style.image = customExpression;
    expect(style.style.image).toEqual(customExpression);

    style.image = undefined;
    expect(style.style.image).toBeUndefined();
  });

  it("sets image values in setter", function () {
    const defines = {
      targetUrl: "'url/to/image1'",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.image = "'url/to/image'";
    expect(style.image).toEqual(new Expression("'url/to/image'"));

    style.image = "${targetUrl}";
    expect(style.image).toEqual(new Expression("${targetUrl}", defines));

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'url/to/image2'"],
        ["true", "${targetUrl}"],
      ],
    };

    style.image = jsonExp;
    expect(style.image).toEqual(new ConditionsExpression(jsonExp, defines));
  });

  it("sets style.image values in setter", function () {
    const defines = {
      targetUrl: "'url/to/image1'",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.image = "'url/to/image'";
    expect(style.style.image).toEqual("'url/to/image'");

    style.image = "${targetUrl}";
    expect(style.style.image).toEqual("${targetUrl}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "'url/to/image2'"],
        ["true", "${targetUrl}"],
      ],
    };

    style.image = jsonExp;
    expect(style.style.image).toEqual(jsonExp);
  });

  it("sets disableDepthTestDistance value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.disableDepthTestDistance).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.disableDepthTestDistance).toBeUndefined();
  });

  it("sets disableDepthTestDistance value to expression", function () {
    let style = new Cesium3DTileStyle({
      disableDepthTestDistance: "2",
    });
    expect(style.disableDepthTestDistance).toEqual(new Expression("2"));

    style = new Cesium3DTileStyle({
      disableDepthTestDistance: "${height} / 10",
    });
    expect(style.disableDepthTestDistance).toEqual(
      new Expression("${height} / 10")
    );

    style = new Cesium3DTileStyle({
      disableDepthTestDistance: 2,
    });
    expect(style.disableDepthTestDistance).toEqual(new Expression("2"));
  });

  it("sets disableDepthTestDistance value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    const style = new Cesium3DTileStyle({
      disableDepthTestDistance: jsonExp,
    });
    expect(style.disableDepthTestDistance).toEqual(
      new ConditionsExpression(jsonExp)
    );
  });

  it("sets disableDepthTestDistance expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.disableDepthTestDistance = 2;
    expect(style.disableDepthTestDistance).toEqual(new Expression("2"));

    const exp = new Expression("2");
    style.disableDepthTestDistance = exp;
    expect(style.disableDepthTestDistance).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    });

    style.disableDepthTestDistance = condExp;
    expect(style.disableDepthTestDistance).toEqual(condExp);

    style.disableDepthTestDistance = undefined;
    expect(style.disableDepthTestDistance).toBeUndefined();
  });

  it("sets style.disableDepthTestDistance expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.disableDepthTestDistance = new Expression("2");
    expect(style.style.disableDepthTestDistance).toEqual("2");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "2.0"],
      ],
    };

    style.disableDepthTestDistance = new ConditionsExpression(jsonExp);
    expect(style.style.disableDepthTestDistance).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1.0;
      },
    };
    style.disableDepthTestDistance = customExpression;
    expect(style.style.disableDepthTestDistance).toEqual(customExpression);

    style.disableDepthTestDistance = undefined;
    expect(style.style.disableDepthTestDistance).toBeUndefined();
  });

  it("sets disableDepthTestDistance values in setter", function () {
    const defines = {
      targetDistance: "2.0",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.disableDepthTestDistance = 2;
    expect(style.disableDepthTestDistance).toEqual(new Expression("2"));

    style.disableDepthTestDistance = "${targetDistance} + 1.0";
    expect(style.disableDepthTestDistance).toEqual(
      new Expression("${targetDistance} + 1.0", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1.0"],
        ["true", "${targetDistance}"],
      ],
    };

    style.disableDepthTestDistance = jsonExp;
    expect(style.disableDepthTestDistance).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets horizontalOrigin value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.horizontalOrigin).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.horizontalOrigin).toBeUndefined();
  });

  it("sets horizontalOrigin value to expression", function () {
    const style = new Cesium3DTileStyle({
      horizontalOrigin: "1",
    });
    expect(style.horizontalOrigin).toEqual(new Expression("1"));
  });

  it("sets horizontalOrigin value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    const style = new Cesium3DTileStyle({
      horizontalOrigin: jsonExp,
    });
    expect(style.horizontalOrigin).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets horizontalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.horizontalOrigin = 1;
    expect(style.horizontalOrigin).toEqual(new Expression("1"));

    const exp = new Expression("1");
    style.horizontalOrigin = exp;
    expect(style.horizontalOrigin).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    });

    style.horizontalOrigin = condExp;
    expect(style.horizontalOrigin).toEqual(condExp);

    style.horizontalOrigin = undefined;
    expect(style.horizontalOrigin).toBeUndefined();
  });

  it("sets style.horizontalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.horizontalOrigin = new Expression("1");
    expect(style.style.horizontalOrigin).toEqual("1");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    style.horizontalOrigin = new ConditionsExpression(jsonExp);
    expect(style.style.horizontalOrigin).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.horizontalOrigin = customExpression;
    expect(style.style.horizontalOrigin).toEqual(customExpression);

    style.horizontalOrigin = undefined;
    expect(style.style.horizontalOrigin).toBeUndefined();
  });

  it("sets horizontalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.horizontalOrigin = -1;
    expect(style.horizontalOrigin).toEqual(new Expression("-1"));

    style.horizontalOrigin = "${targetOrigin}";
    expect(style.horizontalOrigin).toEqual(
      new Expression("${targetOrigin}", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.horizontalOrigin = jsonExp;
    expect(style.horizontalOrigin).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.horizontalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.horizontalOrigin = -1;
    expect(style.style.horizontalOrigin).toEqual("-1");

    style.horizontalOrigin = "${targetOrigin}";
    expect(style.style.horizontalOrigin).toEqual("${targetOrigin}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.horizontalOrigin = jsonExp;
    expect(style.style.horizontalOrigin).toEqual(jsonExp);
  });

  it("sets verticalOrigin value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.verticalOrigin).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.verticalOrigin).toBeUndefined();
  });

  it("sets verticalOrigin value to expression", function () {
    const style = new Cesium3DTileStyle({
      verticalOrigin: "1",
    });
    expect(style.verticalOrigin).toEqual(new Expression("1"));
  });

  it("sets verticalOrigin value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    const style = new Cesium3DTileStyle({
      verticalOrigin: jsonExp,
    });
    expect(style.verticalOrigin).toEqual(new ConditionsExpression(jsonExp));
  });

  it("sets verticalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.verticalOrigin = 1;
    expect(style.verticalOrigin).toEqual(new Expression("1"));

    const exp = new Expression("1");
    style.verticalOrigin = exp;
    expect(style.verticalOrigin).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    });

    style.verticalOrigin = condExp;
    expect(style.verticalOrigin).toEqual(condExp);

    style.verticalOrigin = undefined;
    expect(style.verticalOrigin).toBeUndefined();
  });

  it("sets style.styleverticalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.verticalOrigin = new Expression("1");
    expect(style.style.verticalOrigin).toEqual("1");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    style.verticalOrigin = new ConditionsExpression(jsonExp);
    expect(style.style.verticalOrigin).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.verticalOrigin = customExpression;
    expect(style.style.verticalOrigin).toEqual(customExpression);

    style.verticalOrigin = undefined;
    expect(style.style.verticalOrigin).toBeUndefined();
  });

  it("sets verticalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.verticalOrigin = -1;
    expect(style.verticalOrigin).toEqual(new Expression("-1"));

    style.verticalOrigin = "${targetOrigin}";
    expect(style.verticalOrigin).toEqual(
      new Expression("${targetOrigin}", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.verticalOrigin = jsonExp;
    expect(style.verticalOrigin).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.verticalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.verticalOrigin = -1;
    expect(style.style.verticalOrigin).toEqual("-1");

    style.verticalOrigin = "${targetOrigin}";
    expect(style.style.verticalOrigin).toEqual("${targetOrigin}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.verticalOrigin = jsonExp;
    expect(style.style.verticalOrigin).toEqual(jsonExp);
  });

  it("sets labelHorizontalOrigin value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelHorizontalOrigin).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelHorizontalOrigin).toBeUndefined();
  });

  it("sets labelHorizontalOrigin value to expression", function () {
    const style = new Cesium3DTileStyle({
      labelHorizontalOrigin: "1",
    });
    expect(style.labelHorizontalOrigin).toEqual(new Expression("1"));
  });

  it("sets labelHorizontalOrigin value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelHorizontalOrigin: jsonExp,
    });
    expect(style.labelHorizontalOrigin).toEqual(
      new ConditionsExpression(jsonExp)
    );
  });

  it("sets labelHorizontalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelHorizontalOrigin = 1;
    expect(style.labelHorizontalOrigin).toEqual(new Expression("1"));

    const exp = new Expression("1");
    style.labelHorizontalOrigin = exp;
    expect(style.labelHorizontalOrigin).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    });

    style.labelHorizontalOrigin = condExp;
    expect(style.labelHorizontalOrigin).toEqual(condExp);

    style.labelHorizontalOrigin = undefined;
    expect(style.labelHorizontalOrigin).toBeUndefined();
  });

  it("sets style.labelHorizontalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelHorizontalOrigin = new Expression("1");
    expect(style.style.labelHorizontalOrigin).toEqual("1");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    style.labelHorizontalOrigin = new ConditionsExpression(jsonExp);
    expect(style.style.labelHorizontalOrigin).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.labelHorizontalOrigin = customExpression;
    expect(style.style.labelHorizontalOrigin).toEqual(customExpression);

    style.labelHorizontalOrigin = undefined;
    expect(style.style.labelHorizontalOrigin).toBeUndefined();
  });

  it("sets labelHorizontalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelHorizontalOrigin = -1;
    expect(style.labelHorizontalOrigin).toEqual(new Expression("-1"));

    style.labelHorizontalOrigin = "${targetOrigin}";
    expect(style.labelHorizontalOrigin).toEqual(
      new Expression("${targetOrigin}", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.labelHorizontalOrigin = jsonExp;
    expect(style.labelHorizontalOrigin).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.labelHorizontalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelHorizontalOrigin = -1;
    expect(style.style.labelHorizontalOrigin).toEqual("-1");

    style.labelHorizontalOrigin = "${targetOrigin}";
    expect(style.style.labelHorizontalOrigin).toEqual("${targetOrigin}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.labelHorizontalOrigin = jsonExp;
    expect(style.style.labelHorizontalOrigin).toEqual(jsonExp);
  });

  it("sets labelVerticalOrigin value to undefined if value not present", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.labelVerticalOrigin).toBeUndefined();

    style = new Cesium3DTileStyle();
    expect(style.labelVerticalOrigin).toBeUndefined();
  });

  it("sets labelVerticalOrigin value to expression", function () {
    const style = new Cesium3DTileStyle({
      labelVerticalOrigin: "1",
    });
    expect(style.labelVerticalOrigin).toEqual(new Expression("1"));
  });

  it("sets labelVerticalOrigin value to conditional", function () {
    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    const style = new Cesium3DTileStyle({
      labelVerticalOrigin: jsonExp,
    });
    expect(style.labelVerticalOrigin).toEqual(
      new ConditionsExpression(jsonExp)
    );
  });

  it("sets labelVerticalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelVerticalOrigin = 1;
    expect(style.labelVerticalOrigin).toEqual(new Expression("1"));

    const exp = new Expression("1");
    style.labelVerticalOrigin = exp;
    expect(style.labelVerticalOrigin).toEqual(exp);

    const condExp = new ConditionsExpression({
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    });

    style.labelVerticalOrigin = condExp;
    expect(style.labelVerticalOrigin).toEqual(condExp);

    style.labelVerticalOrigin = undefined;
    expect(style.labelVerticalOrigin).toBeUndefined();
  });

  it("sets style.labelVerticalOrigin expressions in setter", function () {
    const style = new Cesium3DTileStyle();

    style.labelVerticalOrigin = new Expression("1");
    expect(style.style.labelVerticalOrigin).toEqual("1");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "-1"],
      ],
    };

    style.labelVerticalOrigin = new ConditionsExpression(jsonExp);
    expect(style.style.labelVerticalOrigin).toEqual(jsonExp);

    const customExpression = {
      evaluate: function () {
        return 1;
      },
    };
    style.labelVerticalOrigin = customExpression;
    expect(style.style.labelVerticalOrigin).toEqual(customExpression);

    style.labelVerticalOrigin = undefined;
    expect(style.style.labelVerticalOrigin).toBeUndefined();
  });

  it("sets labelVerticalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelVerticalOrigin = -1;
    expect(style.labelVerticalOrigin).toEqual(new Expression("-1"));

    style.labelVerticalOrigin = "${targetOrigin}";
    expect(style.labelVerticalOrigin).toEqual(
      new Expression("${targetOrigin}", defines)
    );

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.labelVerticalOrigin = jsonExp;
    expect(style.labelVerticalOrigin).toEqual(
      new ConditionsExpression(jsonExp, defines)
    );
  });

  it("sets style.labelVerticalOrigin values in setter", function () {
    const defines = {
      targetOrigin: "-1",
    };
    const style = new Cesium3DTileStyle({ defines: defines });

    style.labelVerticalOrigin = -1;
    expect(style.style.labelVerticalOrigin).toEqual("-1");

    style.labelVerticalOrigin = "${targetOrigin}";
    expect(style.style.labelVerticalOrigin).toEqual("${targetOrigin}");

    const jsonExp = {
      conditions: [
        ["${height} > 2", "1"],
        ["true", "${targetOrigin}"],
      ],
    };

    style.labelVerticalOrigin = jsonExp;
    expect(style.style.labelVerticalOrigin).toEqual(jsonExp);
  });

  it("throws on accessing style if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.style;
    }).toThrowDeveloperError();
  });

  it("throws on accessing color if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.color;
    }).toThrowDeveloperError();
  });

  it("throws on accessing show if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.show;
    }).toThrowDeveloperError();
  });

  it("throws on accessing pointSize if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.pointSize;
    }).toThrowDeveloperError();
  });

  it("throws on accessing pointOutlineColor if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.pointOutlineColor;
    }).toThrowDeveloperError();
  });

  it("throws on accessing pointOutlineWidth if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.pointOutlineWidth;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelColor if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelColor;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelOutlineColor if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelOutlineColor;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelOutlineWidth if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelOutlineWidth;
    }).toThrowDeveloperError();
  });

  it("throws on accessing font if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.font;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelStyle if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelStyle;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelText if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelText;
    }).toThrowDeveloperError();
  });

  it("throws on accessing backgroundColor if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.backgroundColor;
    }).toThrowDeveloperError();
  });

  it("throws on accessing backgroundPadding if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.backgroundPadding;
    }).toThrowDeveloperError();
  });

  it("throws on accessing backgroundEnabled if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.backgroundEnabled;
    }).toThrowDeveloperError();
  });

  it("throws on accessing scaleByDistance if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.scaleByDistance;
    }).toThrowDeveloperError();
  });

  it("throws on accessing translucencyByDistance if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.translucencyByDistance;
    }).toThrowDeveloperError();
  });

  it("throws on accessing distanceDisplayCondition if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.distanceDisplayCondition;
    }).toThrowDeveloperError();
  });

  it("throws on accessing heightOffset if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.heightOffset;
    }).toThrowDeveloperError();
  });

  it("throws on accessing anchorLineEnabled if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.anchorLineEnabled;
    }).toThrowDeveloperError();
  });

  it("throws on accessing anchorLineColor if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.anchorLineColor;
    }).toThrowDeveloperError();
  });

  it("throws on accessing image if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.image;
    }).toThrowDeveloperError();
  });

  it("throws on accessing disableDepthTestDistance if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.disableDepthTestDistance;
    }).toThrowDeveloperError();
  });

  it("throws on accessing horizontalOrigin if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.horizontalOrigin;
    }).toThrowDeveloperError();
  });

  it("throws on accessing verticalOrigin if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.verticalOrigin;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelHorizontalOrigin if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelHorizontalOrigin;
    }).toThrowDeveloperError();
  });

  it("throws on accessing labelVerticalOrigin if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.labelVerticalOrigin;
    }).toThrowDeveloperError();
  });

  it("sets meta properties", function () {
    let style = new Cesium3DTileStyle({
      meta: {
        description: '"Hello, ${name}"',
      },
    });
    expect(style.meta.description.evaluate(feature1)).toEqual("Hello, Hello");

    style = new Cesium3DTileStyle({
      meta: {
        featureColor: "rgb(${red}, ${green}, ${blue})",
        volume: "${Height} * ${Width} * ${Depth}",
      },
    });
    expect(style.meta.featureColor.evaluateColor(feature1)).toEqual(
      Color.fromBytes(38, 255, 82)
    );
    expect(style.meta.volume.evaluate(feature1)).toEqual(20 * 20 * 100);
  });

  it("default meta has no properties", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.meta).toEqual({});

    style = new Cesium3DTileStyle({
      meta: {},
    });
    expect(style.meta).toEqual({});
  });

  it("default meta has no properties", function () {
    let style = new Cesium3DTileStyle({});
    expect(style.meta).toEqual({});

    style = new Cesium3DTileStyle({
      meta: {},
    });
    expect(style.meta).toEqual({});
  });

  it("throws on accessing meta if not ready", function () {
    const style = new Cesium3DTileStyle({});
    style._ready = false;

    expect(function () {
      return style.meta;
    }).toThrowDeveloperError();
  });

  // Tests for examples from the style spec

  it("applies default style", function () {
    const style = new Cesium3DTileStyle({
      show: "true",
      color: "color('#ffffff')",
      pointSize: "1.0",
    });

    expect(style.show.evaluate(undefined)).toEqual(true);
    expect(style.color.evaluateColor(undefined)).toEqual(Color.WHITE);
    expect(style.pointSize.evaluate(undefined)).toEqual(1.0);
  });

  it("applies show style with variable", function () {
    const style = new Cesium3DTileStyle({
      show: "${ZipCode} === '19341'",
    });

    expect(style.show.evaluate(feature1)).toEqual(true);
    expect(style.show.evaluate(feature2)).toEqual(false);
  });

  it("applies show style with regexp and variables", function () {
    const style = new Cesium3DTileStyle({
      show: "(regExp('^Chest').test(${County})) && (${YearBuilt} >= 1970)",
    });

    expect(style.show.evaluate(feature1)).toEqual(true);
    expect(style.show.evaluate(feature2)).toEqual(false);
  });

  it("applies show style with conditional", function () {
    const style = new Cesium3DTileStyle({
      show: {
        conditions: [
          ["(${Height} >= 100.0)", "false"],
          ["(${Height} >= 70.0)", "true"],
          ["(${Height} >= 50.0)", "false"],
          ["(${Height} >= 30.0)", "true"],
          ["(${Height} >= 10.0)", "false"],
          ["(${Height} >= 1.0)", "true"],
        ],
      },
    });
    expect(style.show.evaluate(feature1)).toEqual(false);
    expect(style.show.evaluate(feature2)).toEqual(true);
  });

  it("applies color style variables", function () {
    const style = new Cesium3DTileStyle({
      color: "(${Temperature} > 90) ? color('red') : color('white')",
    });
    expect(style.color.evaluateColor(feature1)).toEqual(Color.WHITE);
    expect(style.color.evaluateColor(feature2)).toEqual(Color.RED);
  });

  it("applies color style with new color", function () {
    const style = new Cesium3DTileStyle({
      color: "rgba(${red}, ${green}, ${blue}, (${volume} > 100 ? 0.5 : 1.0))",
    });
    expect(style.color.evaluateColor(feature1)).toEqual(
      new Color(38 / 255, 255 / 255, 82 / 255, 0.5)
    );
    expect(style.color.evaluateColor(feature2)).toEqual(
      new Color(255 / 255, 30 / 255, 30 / 255, 1.0)
    );
  });

  it("applies color style that maps id to color", function () {
    const style = new Cesium3DTileStyle({
      defines: {
        id: "regExp('^1(\\d)').exec(String(${id}))",
      },
      color: {
        conditions: [
          ["${id} === '1'", "color('#FF0000')"],
          ["${id} === '2'", "color('#00FF00')"],
          ["true", "color('#FFFFFF')"],
        ],
      },
    });
    expect(style.color.evaluateColor(feature1)).toEqual(Color.RED);
    expect(style.color.evaluateColor(feature2)).toEqual(Color.LIME);
  });

  it("applies color style with conditional", function () {
    const style = new Cesium3DTileStyle({
      color: {
        conditions: [
          ["(${Height} >= 100.0)", "color('#0000FF')"],
          ["(${Height} >= 70.0)", "color('#00FFFF')"],
          ["(${Height} >= 50.0)", "color('#00FF00')"],
          ["(${Height} >= 30.0)", "color('#FFFF00')"],
          ["(${Height} >= 10.0)", "color('#FF0000')"],
          ["(${Height} >= 1.0)", "color('#FF00FF')"],
        ],
      },
    });
    expect(style.color.evaluateColor(feature1)).toEqual(Color.BLUE);
    expect(style.color.evaluateColor(feature2)).toEqual(Color.YELLOW);
  });

  it("applies pointSize style with variable", function () {
    const style = new Cesium3DTileStyle({
      pointSize: "${Temperature} / 10.0",
    });

    expect(style.pointSize.evaluate(feature1)).toEqual(7.8);
    expect(style.pointSize.evaluate(feature2)).toEqual(9.2);
  });

  it("applies pointSize style with regexp and variables", function () {
    const style = new Cesium3DTileStyle({
      pointSize: "(regExp('^Chest').test(${County})) ? 2.0 : 1.0",
    });

    expect(style.pointSize.evaluate(feature1)).toEqual(2.0);
    expect(style.pointSize.evaluate(feature2)).toEqual(1.0);
  });

  it("applies pointSize style with conditional", function () {
    const style = new Cesium3DTileStyle({
      pointSize: {
        conditions: [
          ["(${Height} >= 100.0)", "6"],
          ["(${Height} >= 70.0)", "5"],
          ["(${Height} >= 50.0)", "4"],
          ["(${Height} >= 30.0)", "3"],
          ["(${Height} >= 10.0)", "2"],
          ["(${Height} >= 1.0)", "1"],
        ],
      },
    });
    expect(style.pointSize.evaluate(feature1)).toEqual(6);
    expect(style.pointSize.evaluate(feature2)).toEqual(3);
  });

  it("applies with defines", function () {
    const style = new Cesium3DTileStyle({
      defines: {
        halfHeight: "${Height} / 2",
        quarterHeight: "${Height} / 4",
        halfVolume: "${volume} / 2",
      },
      color: {
        conditions: [
          ["(${halfHeight} >= 25.0)", "color('red')"],
          ["(${Height} >= 1.0)", "color('blue')"],
        ],
      },
      show: "(${quarterHeight} >= 20.0)",
      pointSize: "${halfVolume} + ${halfHeight}",
      meta: {
        description: "'Half height is ' + ${halfHeight}",
      },
    });

    expect(style.color.evaluateColor(feature1)).toEqual(Color.RED);
    expect(style.color.evaluateColor(feature2)).toEqual(Color.BLUE);
    expect(style.show.evaluate(feature1)).toEqual(true);
    expect(style.show.evaluate(feature2)).toEqual(false);
    expect(style.pointSize.evaluate(feature1)).toEqual(114);
    expect(style.pointSize.evaluate(feature2)).toEqual(44);
    expect(style.meta.description.evaluate(feature1)).toEqual(
      "Half height is 50"
    );
    expect(style.meta.description.evaluate(feature2)).toEqual(
      "Half height is 19"
    );
  });

  it("return undefined shader functions when the style is empty", function () {
    // The default color style is white, the default show style is true, and the default pointSize is 1.0,
    // but the generated generated shader functions should just be undefined. We don't want all the points to be white.
    const style = new Cesium3DTileStyle({});
    const colorFunction = style.getColorShaderFunction("getColor", {}, {});
    const showFunction = style.getShowShaderFunction("getShow", {}, {});
    const pointSizeFunction = style.getPointSizeShaderFunction(
      "getPointSize",
      {},
      {}
    );
    expect(colorFunction).toBeUndefined();
    expect(showFunction).toBeUndefined();
    expect(pointSizeFunction).toBeUndefined();
  });

  it("gets variables", function () {
    const style = new Cesium3DTileStyle({
      pointSize: {
        conditions: [
          ["(${Height} >= 100.0)", "6"],
          ["true", "${PointSize}"],
        ],
      },
      color: "${Height} * color('red')",
      show: "${Floors} > 10",
    });

    const variables = style.getVariables();
    expect(variables.sort()).toEqual(["Floors", "Height", "PointSize"]);
  });
});
