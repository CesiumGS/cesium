/* eslint-disable new-cap */
/* eslint-disable no-undef */
import { Cartesian3 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import S2Cell from "../../Source/Core/S2Cell.js";

fdescribe("Core/S2Cell", function () {
  it("constructor", function () {
    var cell = new S2Cell(BigInt("3458764513820540928"));
    expect(cell._cellId).toEqual(BigInt("3458764513820540928"));
  });

  it("throws for invalid cell ID in constructor", function () {
    // eslint-disable-next-line new-cap
    expect(function () {
      S2Cell(BigInt(-1));
    }).toThrowDeveloperError();
  });

  it("throws for missing cell ID in constructor", function () {
    // eslint-disable-next-line new-cap
    expect(function () {
      S2Cell();
    }).toThrowDeveloperError();
  });

  it("creates cell from valid token", function () {
    var cell = S2Cell.fromToken("3");
    expect(cell._cellId).toEqual(BigInt("3458764513820540928"));
  });

  it("throws for creating cell from invalid token", function () {
    expect(function () {
      S2Cell.fromToken("XX");
    }).toThrowDeveloperError();
  });

  it("accepts valid token", function () {
    var tokenValidity = S2Cell.isValidToken("1");
    expect(tokenValidity).toBe(true);

    tokenValidity = S2Cell.isValidToken("2ef59bd34");
    expect(tokenValidity).toBe(true);

    tokenValidity = S2Cell.isValidToken("2ef59bd352b93ac3");
    expect(tokenValidity).toBe(true);
  });

  it("rejects token of invalid value", function () {
    var tokenValidity = S2Cell.isValidToken("LOL");
    expect(tokenValidity).toBe(false);

    tokenValidity = S2Cell.isValidToken("----");
    expect(tokenValidity).toBe(false);

    tokenValidity = S2Cell.isValidToken("9".repeat(17));
    expect(tokenValidity).toBe(false);

    tokenValidity = S2Cell.isValidToken("0");
    expect(tokenValidity).toBe(false);

    tokenValidity = S2Cell.isValidToken("🤡");
    expect(tokenValidity).toBe(false);
  });

  it("throws for token of invalid type", function () {
    expect(function () {
      S2Cell.isValidToken(420);
    }).toThrowDeveloperError();
    expect(function () {
      S2Cell.isValidToken({});
    }).toThrowDeveloperError();
  });

  it("accepts valid cell ID", function () {
    var cellIdValidity = S2Cell.isValidId(BigInt("3383782026967071428"));
    expect(cellIdValidity).toBe(true);

    cellIdValidity = S2Cell.isValidId(BigInt("3458764513820540928"));
    expect(cellIdValidity).toBe(true);
  });

  it("rejects cell ID of invalid value", function () {
    var cellIdValidity = S2Cell.isValidId(BigInt("0"));
    expect(cellIdValidity).toBe(false);

    cellIdValidity = S2Cell.isValidId(BigInt("-1"));
    expect(cellIdValidity).toBe(false);

    cellIdValidity = S2Cell.isValidId(BigInt("18446744073709551619995"));
    expect(cellIdValidity).toBe(false);

    cellIdValidity = S2Cell.isValidId(BigInt("222446744073709551619995"));
    expect(cellIdValidity).toBe(false);

    cellIdValidity = S2Cell.isValidId(
      BigInt(
        "0b0010101000000000000000000000000000000000000000000000000000000000"
      )
    );
    expect(cellIdValidity).toBe(false);
  });

  it("throws for cell ID of invalid type", function () {
    expect(function () {
      S2Cell.isValidId(420);
    }).toThrowDeveloperError();
    expect(function () {
      S2Cell.isValidId("2ef");
    }).toThrowDeveloperError();
  });

  it("correctly converts cell ID to token", function () {
    expect(S2Cell.getIdFromToken("X")).toEqual(BigInt("0"));
    expect(S2Cell.getIdFromToken("3")).toEqual(BigInt("3458764513820540928"));
    expect(S2Cell.getIdFromToken("2ef59bd352b93ac3")).toEqual(
      BigInt("3383782026967071427")
    );
  });

  it("correctly converts token to cell ID", function () {
    expect(S2Cell.getTokenFromId(BigInt("0"))).toEqual("X");
    expect(S2Cell.getTokenFromId(BigInt("3458764513820540928"))).toEqual("3");
    expect(S2Cell.getTokenFromId(BigInt("3383782026967071427"))).toEqual(
      "2ef59bd352b93ac3"
    );
  });

  it("gets correct level of cell", function () {
    expect(S2Cell.getLevel(BigInt("3170534137668829184"))).toEqual(1);
    expect(S2Cell.getLevel(BigInt("3383782026921377792"))).toEqual(16);
    expect(S2Cell.getLevel(BigInt("3383782026967071427"))).toEqual(30);
  });

  it("throws on missing/invalid cell ID in getting level of cell", function () {
    expect(function () {
      S2Cell.getLevel(BigInt("-1"));
    }).toThrowDeveloperError();
    expect(function () {
      S2Cell.getLevel();
    }).toThrowDeveloperError();
    expect(function () {
      S2Cell.getLevel(BigInt("3170534137668829184444"));
    }).toThrowDeveloperError();
    expect(function () {
      S2Cell.getLevel(BigInt(0));
    }).toThrowDeveloperError();
  });

  it("gets correct parent of cell", function () {
    var cell = new S2Cell(BigInt("3383782026967515136"));
    var parent = cell.getParent();
    expect(parent._cellId).toEqual(BigInt("3383782026971709440"));
  });

  it("throws on getting parent of level 0 cells", function () {
    var cell = S2Cell.fromToken("3");
    expect(function () {
      cell.getParent();
    }).toThrowDeveloperError();
  });

  it("gets correct children of cell", function () {
    var cell = new S2Cell(BigInt("3383782026971709440"));
    var expectedChildCellIds = [
      BigInt(3383782026959126528),
      BigInt(3383782026967515136),
      BigInt(3383782026975903744),
      BigInt(3383782026984292352),
    ];
    for (var i = 0; i < 4; i++) {
      expect(cell.getChild(i)._cellId).toEqual(expectedChildCellIds[i]);
    }
  });

  it("throws on invalid child index in getting children of cell", function () {
    var cell = new S2Cell(BigInt("3383782026971709440"));
    expect(function () {
      cell.getChild(4);
    }).toThrowDeveloperError();
    expect(function () {
      cell.getChild(-1);
    }).toThrowDeveloperError();
  });

  it("throws on getting children of level 30 cell", function () {
    var cell = new S2Cell(BigInt("3383782026967071427"));
    expect(cell._level).toEqual(30);
    expect(function () {
      cell.getChild(0);
    }).toThrowDeveloperError();
  });

  it("gets correct center of cell", function () {
    expect(S2Cell.fromToken("1").getCenter()).toEqual(
      Cartesian3.fromDegrees(0, 0)
    );
    expect(S2Cell.fromToken("3").getCenter()).toEqual(
      Cartesian3.fromDegrees(90, 0)
    );
    expect(S2Cell.fromToken("5").getCenter()).toEqual(
      Cartesian3.fromDegrees(-180, 90)
    );
    expect(S2Cell.fromToken("7").getCenter()).toEqual(
      Cartesian3.fromDegrees(-180, 0)
    );
    expect(S2Cell.fromToken("9").getCenter()).toEqual(
      Cartesian3.fromDegrees(-90, 0)
    );
    expect(S2Cell.fromToken("b").getCenter()).toEqual(
      Cartesian3.fromDegrees(0, -90)
    );
    expect(S2Cell.fromToken("2ef59bd352b93ac3").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(105.64131803774308, -10.490091033598308),
      CesiumMath.EPSILON15
    );
    expect(S2Cell.fromToken("1234567").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(9.868307318504081, 27.468392925827605),
      CesiumMath.EPSILON15
    );
  });
  /*
  it("gets correct vertices of cell", function () {
    var cell = new S2Cell("1234567");
    expect(cell.getVertex(0)).toEqual(
      new Cartesian3(
        0.8742531917210528,
        0.15190781746622256,
        0.46109150041851876
      )
    );
    expect(cell.getVertex(1)).toEqual(
      new Cartesian3(
        0.8742065161648566,
        0.15225076792133416,
        0.46106688317669087
      )
    );
    expect(cell.getVertex(2)).toEqual(
      new Cartesian3(
        0.8740221366625959,
        0.15221865660634273,
        0.46142690125816327
      )
    );
    expect(cell.getVertex(3)).toEqual(
      new Cartesian3(0.8740687826903232, 0.1518757750628954, 0.4614515273301211)
    );
  });
  */
});
