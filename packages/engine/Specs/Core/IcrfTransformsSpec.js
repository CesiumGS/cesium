import {
  Cartesian3,
  defined,
  EarthOrientationParameters,
  IcrfTransforms,
  Iau2006XysData,
  JulianDate,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Quaternion,
  Resource,
  RuntimeError,
  TimeInterval,
} from "../../index.js";

describe("Core/IcrfTransforms", function () {
  describe("computeIcrfToFixedMatrix", function () {
    async function preloadTransformationData(start, stop, eopUrl) {
      if (defined(eopUrl)) {
        IcrfTransforms.earthOrientationParameters =
          await EarthOrientationParameters.fromUrl(eopUrl);
      }

      IcrfTransforms.iau2006XysData = new Iau2006XysData();
      const preloadInterval = new TimeInterval({
        start: start,
        stop: stop,
      });

      await IcrfTransforms.preloadIcrfFixed(preloadInterval);
    }

    it("throws if the date parameter is not specified", function () {
      expect(function () {
        IcrfTransforms.computeIcrfToFixedMatrix(undefined);
      }).toThrowDeveloperError();

      expect(function () {
        IcrfTransforms.computeFixedToIcrfMatrix(undefined);
      }).toThrowDeveloperError();
    });

    it("works with data from STK Components", async function () {
      // This data set represents a set of data encompassing the corresponding EOP data below.
      // The rotation data from Components span before and after the EOP data so as to test
      // what happens when we try evaluating at times when we don't have EOP as well as at
      // times where we do.  The samples are not at exact EOP times, in order to test interpolation.
      const componentsData = await Resource.fetchJson(
        "Data/EarthOrientationParameters/IcrfToFixedStkComponentsRotationData.json",
      );
      const start = JulianDate.fromIso8601(componentsData[0].date);
      const stop = JulianDate.fromIso8601(
        componentsData[componentsData.length - 1].date,
      );

      await preloadTransformationData(
        start,
        stop,
        "Data/EarthOrientationParameters/EOP-2011-July.json",
      );
      for (let i = 0; i < componentsData.length; ++i) {
        const time = JulianDate.fromIso8601(componentsData[i].date);
        const resultT = new Matrix3();
        const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);
        expect(t).toBe(resultT);

        // rotation matrix determinants are 1.0
        const det =
          t[0] * t[4] * t[8] +
          t[3] * t[7] * t[2] +
          t[6] * t[1] * t[5] -
          t[6] * t[4] * t[2] -
          t[3] * t[1] * t[8] -
          t[0] * t[7] * t[5];
        expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        // rotation matrix inverses are equal to its transpose
        const t4 = Matrix4.fromRotationTranslation(t);
        expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
          Matrix4.inverseTransformation(t4, new Matrix4()),
          CesiumMath.EPSILON14,
        );

        const expectedMtx = Matrix3.fromQuaternion(
          Quaternion.conjugate(
            componentsData[i].icrfToFixedQuaternion,
            new Quaternion(),
          ),
        );
        const testInverse = Matrix3.multiply(
          Matrix3.transpose(t, new Matrix3()),
          expectedMtx,
          new Matrix3(),
        );
        const testDiff = new Matrix3();
        for (let k = 0; k < 9; k++) {
          testDiff[k] = t[k] - expectedMtx[k];
        }
        expect(testInverse).toEqualEpsilon(
          Matrix3.IDENTITY,
          CesiumMath.EPSILON14,
        );
        expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
      }
    });

    it("works with hard-coded data", async function () {
      // 2011-07-03 00:00:00 UTC
      let time = new JulianDate(2455745, 43200);

      await preloadTransformationData(
        time,
        time,
        "Data/EarthOrientationParameters/EOP-2011-July.json",
      );
      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);
      expect(t).toBe(resultT);

      // rotation matrix determinants are 1.0
      const det =
        t[0] * t[4] * t[8] +
        t[3] * t[7] * t[2] +
        t[6] * t[1] * t[5] -
        t[6] * t[4] * t[2] -
        t[3] * t[1] * t[8] -
        t[0] * t[7] * t[5];
      expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

      // rotation matrix inverses are equal to its transpose
      const t4 = Matrix4.fromRotationTranslation(t);
      expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
        Matrix4.inverseTransformation(t4, new Matrix4()),
        CesiumMath.EPSILON14,
      );

      time = JulianDate.addHours(time, 23.93447, new JulianDate()); // add one sidereal day
      const resultU = new Matrix3();
      const u = IcrfTransforms.computeIcrfToFixedMatrix(time, resultU);
      expect(u).toBe(resultU);
      const tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
      const uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
      expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON6);

      // The rotation matrix from STK Components corresponding to the time and data inputs above
      const expectedMtx = new Matrix3(
        0.18264414843630006,
        -0.98317906144315947,
        -0.00021950336420248503,
        0.98317840915224974,
        0.18264428011734501,
        -0.0011325710874539787,
        0.0011536112127187594,
        -0.0000089534866085598909,
        0.99999933455028112,
      );

      const testInverse = Matrix3.multiply(
        Matrix3.transpose(t, new Matrix3()),
        expectedMtx,
        new Matrix3(),
      );
      const testDiff = new Matrix3();
      for (let i = 0; i < 9; i++) {
        testDiff[i] = t[i] - expectedMtx[i];
      }
      expect(testInverse).toEqualEpsilon(
        Matrix3.IDENTITY,
        CesiumMath.EPSILON14,
      );
      expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
    });

    it("works over day boundary", async function () {
      const time = new JulianDate(2455745, 86395);

      await preloadTransformationData(
        time,
        time,
        "Data/EarthOrientationParameters/EOP-2011-July.json",
      );
      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);

      // The rotation matrix from STK Components corresponding to the time and data inputs above
      const expectedMtx = new Matrix3(
        -0.19073578935932833,
        0.98164138366748721,
        0.00022919174269963536,
        -0.98164073712836186,
        -0.19073592679333939,
        0.0011266944449015753,
        0.0011497249933208494,
        -0.000010082996932331842,
        0.99999933901516791,
      );

      const testInverse = Matrix3.multiply(
        Matrix3.transpose(t, new Matrix3()),
        expectedMtx,
        new Matrix3(),
      );
      const testDiff = new Matrix3();
      for (let i = 0; i < 9; i++) {
        testDiff[i] = t[i] - expectedMtx[i];
      }
      expect(testInverse).toEqualEpsilon(
        Matrix3.IDENTITY,
        CesiumMath.EPSILON14,
      );
      expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
    });

    it("works over day boundary backwards", async function () {
      const time = new JulianDate(2455745, 10);

      await preloadTransformationData(
        time,
        time,
        "Data/EarthOrientationParameters/EOP-2011-July.json",
      );
      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);

      //The rotation matrix from STK Components corresponding to the time and data inputs above
      const expectedMtx = new Matrix3(
        -0.17489910479510423,
        0.984586338811966,
        0.00021110831245616662,
        -0.98458569065286827,
        -0.17489923190143036,
        0.0011297972845023996,
        0.0011493056536445096,
        -0.00001025368996280683,
        0.99999933949547,
      );

      const testInverse = Matrix3.multiply(
        Matrix3.transpose(t, new Matrix3()),
        expectedMtx,
        new Matrix3(),
      );
      const testDiff = new Matrix3();
      for (let i = 0; i < 9; i++) {
        testDiff[i] = t[i] - expectedMtx[i];
      }
      expect(testInverse).toEqualEpsilon(
        Matrix3.IDENTITY,
        CesiumMath.EPSILON14,
      );
      expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
    });

    it("works with position rotation", async function () {
      // GEO Satellite position
      const inertialPos = new Cartesian3(
        -7322101.15395708,
        -41525699.1558387,
        0,
      );
      // The following is the value computed by STK Components for the date specified below
      const expectedFixedPos = new Cartesian3(
        39489858.9917795,
        -14783363.192887,
        -8075.05820056297,
      );

      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      await preloadTransformationData(
        time,
        time,
        "Data/EarthOrientationParameters/EOP-2011-July.json",
      );
      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);

      const result = Matrix3.multiplyByVector(t, inertialPos, new Cartesian3());
      const error = Cartesian3.subtract(
        result,
        expectedFixedPos,
        new Cartesian3(),
      );

      // Given the magnitude of the positions involved (1e8)
      // this tolerance represents machine precision
      expect(error).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON7);
    });

    it("undefined prior to 1974", async function () {
      // 1970 jan 1 0h UTC
      const time = new JulianDate(2440587, 43200);
      // Purposefully do not load EOP!  EOP doesn't make a lot of sense before 1972.
      // Even though we are trying to load the data for 1970,
      // we don't have the data in Cesium to load.
      await preloadTransformationData(
        time,
        JulianDate.addDays(time, 1, new JulianDate()),
      );

      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);
      // Check that we get undefined, since we don't have ICRF data
      expect(t).toEqual(undefined);
    });

    it("works after 2028", async function () {
      // 2030 jan 1 0h UTC
      const time = new JulianDate(2462502, 43200);
      // Purposefully do not load EOP!  EOP doesn't exist yet that far into the future
      // Even though we are trying to load the data for 2030,
      // we don't have the data in Cesium to load.
      await preloadTransformationData(
        time,
        JulianDate.addDays(time, 1, new JulianDate()),
      );
      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);
      expect(t).toBeDefined();
    });

    it("works without EOP data loaded", async function () {
      // GEO Satellite position
      const inertialPos = new Cartesian3(
        -7322101.15395708,
        -41525699.1558387,
        0,
      );
      // The following is the value computed by STK Components for the date specified below
      const expectedFixedPos = new Cartesian3(
        39489545.7583001,
        -14784199.9085371,
        -8034.77037239318,
      );

      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      IcrfTransforms.earthOrientationParameters =
        new EarthOrientationParameters();
      await preloadTransformationData(time, time);
      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToFixedMatrix(time, resultT);

      const result = Matrix3.multiplyByVector(t, inertialPos, new Cartesian3());
      const error = Cartesian3.subtract(
        result,
        expectedFixedPos,
        new Cartesian3(),
      );

      // Given the magnitude of the positions involved (1e8)
      // this tolerance represents machine precision
      expect(error).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON7);
    });

    it("throws a RuntimeError when asked to compute with invalid EOP data", async function () {
      // 2011-07-03 00:00:00 UTC
      const time = new JulianDate(2455745, 43200);

      await expectAsync(
        (async function () {
          await preloadTransformationData(
            time,
            time,
            "Data/EarthOrientationParameters/EOP-Invalid.json",
          );
          return IcrfTransforms.computeIcrfToFixedMatrix(time);
        })(),
      ).toBeRejectedWithError(
        RuntimeError,
        "Error in loaded EOP data: The columnNames property is required.",
      );
    });

    it("returns undefined before XYS data is loaded.", function () {
      IcrfTransforms.earthOrientationParameters =
        new EarthOrientationParameters();
      IcrfTransforms.iau2006XysData = new Iau2006XysData();

      const time = new JulianDate(2455745, 43200);
      expect(IcrfTransforms.computeIcrfToFixedMatrix(time)).toBeUndefined();
    });
  });

  describe("computeIcrfToMoonFixedMatrix", function () {
    it("throws if the date parameter is not specified", function () {
      expect(function () {
        IcrfTransforms.computeIcrfToMoonFixedMatrix(undefined);
      }).toThrowDeveloperError();
    });

    it("works", function () {
      // 2011-07-03 00:00:00 UTC
      let time = new JulianDate(2455745, 43200);

      const resultT = new Matrix3();
      const t = IcrfTransforms.computeIcrfToMoonFixedMatrix(time, resultT);
      expect(t).toBe(resultT);

      // rotation matrix determinants are 1.0
      const det =
        t[0] * t[4] * t[8] +
        t[3] * t[7] * t[2] +
        t[6] * t[1] * t[5] -
        t[6] * t[4] * t[2] -
        t[3] * t[1] * t[8] -
        t[0] * t[7] * t[5];
      expect(det).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

      // rotation matrix inverses are equal to its transpose
      const t4 = Matrix4.fromRotationTranslation(t);
      expect(Matrix4.inverse(t4, new Matrix4())).toEqualEpsilon(
        Matrix4.inverseTransformation(t4, new Matrix4()),
        CesiumMath.EPSILON14,
      );

      time = JulianDate.addHours(time, 27.321661 * 24, new JulianDate()); // add one sidereal month
      const resultU = new Matrix3();
      const u = IcrfTransforms.computeIcrfToMoonFixedMatrix(time, resultU);
      expect(u).toBe(resultU);
      const tAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(t));
      const uAngle = Quaternion.computeAngle(Quaternion.fromRotationMatrix(u));
      expect(tAngle).toEqualEpsilon(uAngle, CesiumMath.EPSILON3);

      const expectedMtx = new Matrix3(
        -0.44796811269393627,
        0.8934634849604557,
        0.03236620230657612,
        0.8184479558129512,
        0.3952490953922868,
        0.4170384828971786,
        0.3598159441089767,
        0.2133099942194372,
        -0.9083123541662688,
      );

      const testInverse = Matrix3.multiply(
        Matrix3.transpose(t, new Matrix3()),
        expectedMtx,
        new Matrix3(),
      );
      const testDiff = new Matrix3();
      for (let i = 0; i < 9; i++) {
        testDiff[i] = t[i] - expectedMtx[i];
      }
      expect(testInverse).toEqualEpsilon(
        Matrix3.IDENTITY,
        CesiumMath.EPSILON14,
      );
      expect(testDiff).toEqualEpsilon(new Matrix3(), CesiumMath.EPSILON14);
    });
  });
});
