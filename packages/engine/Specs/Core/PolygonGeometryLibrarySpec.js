import {
  ArcType,
  Cartesian3,
  Ellipsoid,
  Math as CesiumMath,
  PolygonGeometryLibrary,
} from "../../index.js";

describe("Core/PolygonGeometryLibrary", function () {
  describe("splitPolygonByPlane", function () {
    it("splits a simple polygon at the equator", function () {
      const positions = Cartesian3.unpackArray([
        3813220.0,
        -5085291.0,
        527179.0,
        3701301.0,
        -5097773.0,
        -993503.0,
        5037375.0,
        -3776794.0,
        -1017021.0,
        5049166.0,
        -3865306.0,
        494270.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection1 = new Cartesian3(
        3799258.6687873346,
        -5123110.886796548,
        0.0
      );
      const expectedIntersection2 = new Cartesian3(
        5077099.353935631,
        -3860530.240917096,
        0.0
      );
      expect(polygons.length).toBe(2);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][3]).toEqual(positions[3]);
      expect(polygons[1].length).toBe(4);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[1][3]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
    });

    it("does not split a simple polygon with one position touching the equator", function () {
      const positions = Cartesian3.unpackArray([
        3813220.0,
        -5085291.0,
        527179.0,
        3701301.0,
        -5097773.0,
        0.0,
        5049166.0,
        -3865306.0,
        494270.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      expect(polygons.length).toBe(1);
      expect(polygons[0].length).toBe(3);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqual(positions[1]);
      expect(polygons[0][2]).toEqual(positions[2]);
    });

    it("does not split a simple polygon with one edge on the equator, starting above the equator", function () {
      const positions = Cartesian3.unpackArray([
        -3219367.0,
        -5491259.0,
        401098.0,
        -3217795.0,
        -5506913.0,
        0.0,
        -2713036.0,
        -5772334.0,
        0.0,
        -2713766.0,
        -5757498.0,
        406910.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );
      expect(polygons.length).toBe(1);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqual(positions[1]);
      expect(polygons[0][2]).toEqual(positions[2]);
      expect(polygons[0][3]).toEqual(positions[3]);
    });

    it("does not split a simple polygon with one edge on the equator, starting below the equator", function () {
      const positions = Cartesian3.unpackArray([
        -3180138.0,
        -5441382.0,
        -974441.0,
        -3186540.0,
        -5525048.0,
        0.0,
        -2198716.0,
        -5986569.0,
        0.0,
        -2135113.0,
        -5925878.0,
        -996868.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );
      expect(polygons.length).toBe(1);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqual(positions[1]);
      expect(polygons[0][2]).toEqual(positions[2]);
      expect(polygons[0][3]).toEqual(positions[3]);
    });

    it("splits a positively concave polygon at the equator", function () {
      const positions = Cartesian3.unpackArray([
        -3723536.687096985,
        -5140643.423654287,
        622159.6094790212,
        -3706443.9124709764,
        -5089398.802336418,
        -1016836.564118223,
        -1818346.3577937474,
        -5988204.417556031,
        -1226992.0906221648,
        -1949728.2308330906,
        -6022778.780648997,
        775419.1678640501,
        -2891108.934831509,
        -5659936.656854747,
        -534148.7427656263,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection1 = new Cartesian3(
        -3746523.7934060274,
        -5161801.144582336,
        0
      );
      const expectedIntersection2 = new Cartesian3(
        -3298992.8935172106,
        -5458688.2562839165,
        0
      );
      const expectedIntersection3 = new Cartesian3(
        -2527814.313071595,
        -5855833.534980258,
        0
      );
      const expectedIntersection4 = new Cartesian3(
        -1921714.863778476,
        -6081746.753450187,
        0
      );
      expect(polygons.length).toBe(3);
      expect(polygons[0].length).toBe(3);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[1].length).toBe(7);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[1][3]).toEqualEpsilon(
        expectedIntersection4,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][4]).toEqualEpsilon(
        expectedIntersection3,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][5]).toEqual(positions[4]);
      expect(polygons[1][6]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[2].length).toBe(3);
      expect(polygons[2][0]).toEqualEpsilon(
        expectedIntersection4,
        CesiumMath.EPSILON7
      );
      expect(polygons[2][1]).toEqual(positions[3]);
      expect(polygons[2][2]).toEqualEpsilon(
        expectedIntersection3,
        CesiumMath.EPSILON7
      );
    });

    it("splits a negatively concave polygon at the equator", function () {
      const positions = Cartesian3.unpackArray([
        -4164072.7435535816,
        -4791571.5503237555,
        605958.8290040599,
        -4167507.7232260685,
        -4800497.02674794,
        -508272.2109012767,
        -3712172.6000501625,
        -5184159.589216706,
        116723.13202563708,
        -3259646.0020361557,
        -5455158.378873343,
        -532227.4715966922,
        -3283717.3855494126,
        -5434359.545068984,
        592819.1229613343,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],

        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection1 = new Cartesian3(
        -4182416.3757553473,
        -4815394.568525253,
        0
      );
      const expectedIntersection2 = new Cartesian3(
        -3803015.1382151386,
        -5120322.982906009,
        0
      );
      const expectedIntersection3 = new Cartesian3(
        -3635913.2183307745,
        -5240302.153458,
        0
      );
      const expectedIntersection4 = new Cartesian3(
        -3284360.5276909056,
        -5467504.688147503,
        0
      );
      expect(polygons.length).toBe(3);
      expect(polygons[0].length).toBe(7);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][3]).toEqual(positions[2]);
      expect(polygons[0][4]).toEqualEpsilon(
        expectedIntersection3,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][5]).toEqualEpsilon(
        expectedIntersection4,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][6]).toEqual(positions[4]);
      expect(polygons[1].length).toBe(3);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[2].length).toBe(3);
      expect(polygons[2][0]).toEqualEpsilon(
        expectedIntersection3,
        CesiumMath.EPSILON7
      );
      expect(polygons[2][1]).toEqual(positions[3]);
      expect(polygons[2][2]).toEqualEpsilon(
        expectedIntersection4,
        CesiumMath.EPSILON7
      );
    });

    it("splits a positively concave polygon with a point on the equator", function () {
      const positions = Cartesian3.unpackArray([
        -3592289.0,
        -5251493.0,
        433532.0,
        -3568746.0,
        -5245699.0,
        -646544.0,
        -2273628.0,
        -5915229.0,
        -715098.0,
        -2410175.0,
        -5885323.0,
        475855.0,
        -3012338.0,
        -5621469.0,
        0.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection1 = new Cartesian3(
        -3595684.3882232937,
        -5267986.8423389485,
        0
      );
      const expectedIntersection2 = new Cartesian3(
        -2365929.6862513637,
        -5923091.111107741,
        0
      );
      expect(polygons.length).toBe(3);
      expect(polygons[0].length).toBe(3);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqual(positions[4]);
      expect(polygons[1].length).toBe(5);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[1][3]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][4]).toEqual(positions[4]);
      expect(polygons[2].length).toBe(3);
      expect(polygons[2][0]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[2][1]).toEqual(positions[3]);
      expect(polygons[2][2]).toEqual(positions[4]);
    });

    it("splits a negatively concave polygon with a point on the equator", function () {
      const positions = Cartesian3.unpackArray([
        -3774632.0,
        -5136123.0,
        222459.0,
        -3714187.0,
        -5173580.0,
        -341046.0,
        -3516544.0,
        -5320967.0,
        0.0,
        -3304860.0,
        -5444086.0,
        -342567.0,
        -3277484.0,
        -5466977.0,
        218213.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection1 = new Cartesian3(
        -3754485.468265927,
        -5156013.039098039,
        0
      );
      const expectedIntersection2 = new Cartesian3(
        -3291304.258941832,
        -5463327.545172482,
        0
      );
      expect(polygons.length).toBe(3);
      expect(polygons[0].length).toBe(5);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqual(positions[2]);
      expect(polygons[0][3]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][4]).toEqual(positions[4]);
      expect(polygons[1].length).toBe(3);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[2].length).toBe(3);
      expect(polygons[2][0]).toEqual(positions[2]);
      expect(polygons[2][1]).toEqual(positions[3]);
      expect(polygons[2][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
    });

    it("splits a polygon with an edge equator", function () {
      const positions = Cartesian3.unpackArray([
        -3227931.0,
        -5469496.0,
        584508.0,
        -3150093.0,
        -5488360.0,
        -792747.0,
        -1700622.0,
        -6089685.0,
        -835364.0,
        -1786389.0,
        -6122714.0,
        0.0,
        -2593600.0,
        -5826977.0,
        0.0,
        -2609132.0,
        -5790155.0,
        584508.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection = new Cartesian3(
        -3213523.577073882,
        -5509437.159126084,
        0
      );
      expect(polygons.length).toBe(2);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqual(positions[4]);
      expect(polygons[0][3]).toEqual(positions[5]);
      expect(polygons[1].length).toBe(5);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[1][3]).toEqual(positions[3]);
      expect(polygons[1][4]).toEqual(positions[4]);
    });

    it("splits a polygon with a backtracking edge on the equator", function () {
      const positions = Cartesian3.unpackArray([
        -3491307.0,
        -5296123.0,
        650596.0,
        -3495031.0,
        -5334507.0,
        0.0,
        -4333607.0,
        -4677312.0,
        0.0,
        -4275491.0,
        -4629182.0,
        -968553.0,
        -2403691.0,
        -5827997.0,
        -943662.0,
        -2484409.0,
        -5837281.0,
        631344.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      const expectedIntersection = new Cartesian3(
        -2471499.3842933537,
        -5879823.32933623,
        0
      );
      expect(polygons.length).toBe(2);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqual(positions[1]);
      expect(polygons[0][2]).toEqualEpsilon(
        expectedIntersection,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][3]).toEqual(positions[5]);
      expect(polygons[1].length).toBe(5);
      expect(polygons[1][0]).toEqual(positions[1]);
      expect(polygons[1][1]).toEqual(positions[2]);
      expect(polygons[1][2]).toEqual(positions[3]);
      expect(polygons[1][3]).toEqual(positions[4]);
      expect(polygons[1][4]).toEqualEpsilon(
        expectedIntersection,
        CesiumMath.EPSILON7
      );
    });

    it("splits a simple rhumb polygon at the equator", function () {
      const positions = Cartesian3.unpackArray([
        3813220.0,
        -5085291.0,
        527179.0,
        3701301.0,
        -5097773.0,
        -993503.0,
        5037375.0,
        -3776794.0,
        -1017021.0,
        5049166.0,
        -3865306.0,
        494270.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.RHUMB
      );

      const expectedIntersection1 = new Cartesian3(
        3799205.595277112,
        -5123150.245267465,
        0.0
      );
      const expectedIntersection2 = new Cartesian3(
        5077127.456540122,
        -3860493.2820580625,
        0.0
      );
      expect(polygons.length).toBe(2);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][3]).toEqual(positions[3]);
      expect(polygons[1].length).toBe(4);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[1][3]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
    });

    it("splits a simple rhumb polygon at the equator across the IDL", function () {
      const positions = Cartesian3.fromDegreesArray([
        30,
        -30,
        20,
        30,
        -20,
        30,
        -30,
        -30,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions],
        Ellipsoid.WGS84,
        ArcType.RHUMB
      );

      const expectedIntersection1 = new Cartesian3(
        5780555.229886577,
        2695517.1720840395,
        0.0
      );
      const expectedIntersection2 = new Cartesian3(
        5780555.229886577,
        -2695517.1720840395,
        0.0
      );
      expect(polygons.length).toBe(2);
      expect(polygons[0].length).toBe(4);
      expect(polygons[0][0]).toEqual(positions[0]);
      expect(polygons[0][1]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][2]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
      expect(polygons[0][3]).toEqual(positions[3]);
      expect(polygons[1].length).toBe(4);
      expect(polygons[1][0]).toEqualEpsilon(
        expectedIntersection1,
        CesiumMath.EPSILON7
      );
      expect(polygons[1][1]).toEqual(positions[1]);
      expect(polygons[1][2]).toEqual(positions[2]);
      expect(polygons[1][3]).toEqualEpsilon(
        expectedIntersection2,
        CesiumMath.EPSILON7
      );
    });

    it("splits an array of polygons", function () {
      const positions = Cartesian3.unpackArray([
        3813220.0,
        -5085291.0,
        527179.0,
        3701301.0,
        -5097773.0,
        -993503.0,
        5037375.0,
        -3776794.0,
        -1017021.0,
        5049166.0,
        -3865306.0,
        494270.0,
      ]);

      const polygons = PolygonGeometryLibrary.splitPolygonsOnEquator(
        [positions, positions],
        Ellipsoid.WGS84,
        ArcType.GEODESIC
      );

      expect(polygons.length).toBe(4);
    });
  });
});
