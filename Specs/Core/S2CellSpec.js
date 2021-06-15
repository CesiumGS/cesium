/* eslint-disable new-cap */
/* eslint-disable no-undef */
import { Cartesian3 } from "../../Source/Cesium.js";
import { FeatureDetection } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { S2Cell } from "../../Source/Cesium.js";

describe("Core/S2Cell", function () {
  if (!FeatureDetection.supportsBigInt()) {
    return;
  }

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

  it("creates cell from valid face, position, level", function () {
    var cell = S2Cell.fromFacePositionLevel(0, BigInt(0), 1);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("04");
    cell = S2Cell.fromFacePositionLevel(BigInt(0), BigInt(1), 1);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("0c");
    cell = S2Cell.fromFacePositionLevel(BigInt(0), BigInt(2), 1);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("14");
    cell = S2Cell.fromFacePositionLevel(BigInt(0), BigInt(3), 1);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("1c");
    cell = S2Cell.fromFacePositionLevel(2, BigInt("0"), 1);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("44");
    cell = S2Cell.fromFacePositionLevel(4, BigInt("0"), 1);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("84");
    cell = S2Cell.fromFacePositionLevel(1, BigInt("538969508876688737"), 30);
    expect(S2Cell.getTokenFromId(cell._cellId)).toEqual("2ef59bd352b93ac3");
  });

  it("throws for creating cell from invalid face, position, level", function () {
    expect(function () {
      S2Cell.fromFacePositionLevel(-1, BigInt(0), 1);
    }).toThrowDeveloperError();

    expect(function () {
      S2Cell.fromFacePositionLevel(6, BigInt(0), 1);
    }).toThrowDeveloperError();

    expect(function () {
      S2Cell.fromFacePositionLevel(0, BigInt(-1), 1);
    }).toThrowDeveloperError();

    expect(function () {
      S2Cell.fromFacePositionLevel(0, BigInt(4), 1);
    }).toThrowDeveloperError();

    expect(function () {
      S2Cell.fromFacePositionLevel(0, BigInt(0), -1);
    }).toThrowDeveloperError();

    expect(function () {
      S2Cell.fromFacePositionLevel(0, BigInt(0), 31);
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
    expect(S2Cell.getIdFromToken("04")).toEqual(BigInt("288230376151711744"));
    expect(S2Cell.getIdFromToken("3")).toEqual(BigInt("3458764513820540928"));
    expect(S2Cell.getIdFromToken("2ef59bd352b93ac3")).toEqual(
      BigInt("3383782026967071427")
    );
  });

  it("correctly converts token to cell ID", function () {
    expect(S2Cell.getTokenFromId(BigInt("288230376151711744"))).toEqual("04");
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

  it("gets correct parent of cell at given level", function () {
    var cell = new S2Cell(BigInt("3383782026967056384"));
    var parent = cell.getParentAtLevel(21);
    expect(parent._cellId).toEqual(BigInt("3383782026967252992"));
    parent = cell.getParentAtLevel(7);
    expect(parent._cellId).toEqual(BigInt("3383821801271328768"));
    parent = cell.getParentAtLevel(0);
    expect(parent._cellId).toEqual(BigInt("3458764513820540928"));
  });

  it("throws on getting parent of cell at invalid level", function () {
    var cell = new S2Cell(BigInt("3458764513820540928"));
    expect(function () {
      cell.getParentAtLevel(0);
    }).toThrowDeveloperError();

    cell = new S2Cell(BigInt("3383782026967072768"));
    expect(function () {
      cell.getParentAtLevel(-1);
    }).toThrowDeveloperError();

    expect(function () {
      cell.getParentAtLevel(30);
    }).toThrowDeveloperError();
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
    var i;
    for (i = 0; i < 4; i++) {
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
    expect(S2Cell.fromToken("1").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(0.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(S2Cell.fromToken("3").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(90.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(S2Cell.fromToken("5").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(-180.0, 90.0),
      CesiumMath.EPSILON15
    );
    expect(S2Cell.fromToken("7").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(-180.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(S2Cell.fromToken("9").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(-90.0, 0.0),
      CesiumMath.EPSILON15
    );
    expect(S2Cell.fromToken("b").getCenter()).toEqualEpsilon(
      Cartesian3.fromDegrees(0.0, -90.0),
      CesiumMath.EPSILON15
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

  it("throws on invalid vertex index", function () {
    var cell = new S2Cell(BigInt("3383782026971709440"));
    expect(function () {
      cell.getVertex(-1);
    }).toThrowDeveloperError();

    expect(function () {
      cell.getVertex(4);
    }).toThrowDeveloperError();
  });

  it("gets correct vertices of cell", function () {
    var cell = S2Cell.fromToken("2ef59bd352b93ac3");
    expect(cell.getVertex(0)).toEqualEpsilon(
      Cartesian3.fromDegrees(105.64131799299665, -10.490091077431977),
      CesiumMath.EPSILON15
    );
    expect(cell.getVertex(1)).toEqualEpsilon(
      Cartesian3.fromDegrees(105.64131808248949, -10.490091072946313),
      CesiumMath.EPSILON15
    );
    expect(cell.getVertex(2)).toEqualEpsilon(
      Cartesian3.fromDegrees(105.64131808248948, -10.490090989764633),
      CesiumMath.EPSILON15
    );
    expect(cell.getVertex(3)).toEqualEpsilon(
      Cartesian3.fromDegrees(105.64131799299665, -10.4900909942503),
      CesiumMath.EPSILON15
    );
  });
});
