/*global defineSuite*/
defineSuite([
        'DataSources/SampledProperty',
        'Core/Cartesian3',
        'Core/defined',
        'Core/ExtrapolationType',
        'Core/HermitePolynomialApproximation',
        'Core/JulianDate',
        'Core/LagrangePolynomialApproximation',
        'Core/LinearApproximation',
        'Core/Math',
        'Core/Quaternion'
    ], function(
        SampledProperty,
        Cartesian3,
        defined,
        ExtrapolationType,
        HermitePolynomialApproximation,
        JulianDate,
        LagrangePolynomialApproximation,
        LinearApproximation,
        CesiumMath,
        Quaternion) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected defaults', function() {
        var property = new SampledProperty(Cartesian3);
        expect(property.interpolationDegree).toEqual(1);
        expect(property.interpolationAlgorithm).toEqual(LinearApproximation);
        expect(property.isConstant).toEqual(true);
        expect(property.type).toBe(Cartesian3);
        expect(property.derivativeTypes).toBeUndefined();
        expect(property.forwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.forwardExtrapolationDuration).toEqual(0);
        expect(property.backwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.backwardExtrapolationDuration).toEqual(0);

        var derivatives = [Cartesian3, Cartesian3];
        property = new SampledProperty(Quaternion, derivatives);
        expect(property.interpolationDegree).toEqual(1);
        expect(property.interpolationAlgorithm).toEqual(LinearApproximation);
        expect(property.isConstant).toEqual(true);
        expect(property.type).toBe(Quaternion);
        expect(property.derivativeTypes).toBe(derivatives);
        expect(property.forwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.forwardExtrapolationDuration).toEqual(0);
        expect(property.backwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.backwardExtrapolationDuration).toEqual(0);
    });

    it('isConstant works', function() {
        var property = new SampledProperty(Number);
        expect(property.isConstant).toEqual(true);
        property.addSample(new JulianDate(0, 0), 1);
        expect(property.isConstant).toEqual(false);
    });

    it('addSamplesPackedArray works', function() {
        var data = [0, 7, 1, 8, 2, 9];
        var epoch = new JulianDate(0, 0);

        var property = new SampledProperty(Number);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.addSamplesPackedArray(data, epoch);

        expect(listener).toHaveBeenCalledWith(property);
        expect(property.getValue(epoch)).toEqual(7);
        expect(property.getValue(new JulianDate(0, 0.5))).toEqual(7.5);
    });

    it('addSample works', function() {
        var values = [7, 8, 9];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty(Number);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.addSample(times[0], values[0]);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.addSample(times[1], values[1]);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.addSample(times[2], values[2]);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(7.5);
    });

    it('addSamples works', function() {
        var values = [7, 8, 9];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty(Number);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.addSamples(times, values);

        expect(listener).toHaveBeenCalledWith(property);
        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(7.5);
    });

    it('works with PackableForInterpolation', function() {
        var CustomType = function(value) {
            this.x = value;
        };

        CustomType.packedLength = 1;

        CustomType.packedInterpolationLength = 2;

        CustomType.pack = function(value, array, startingIndex) {
            array[startingIndex] = value.x;
        };

        CustomType.unpack = function(array, startingIndex, result) {
            return array[startingIndex];
        };

        CustomType.convertPackedArrayForInterpolation = function(packedArray, startingIndex, lastIndex, result) {
            for ( var i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
                var offset = i * 2;
                result[offset] = packedArray[i] * 0.5;
                result[offset + 1] = packedArray[i] * 0.5;
            }
        };

        CustomType.unpackInterpolationResult = function(array, sourceArray, firstIndex, lastIndex, result) {
            if (!defined(result)) {
                result = new CustomType();
            }
            result.x = array[0] + array[1];
            return result;
        };

        var values = [new CustomType(0), new CustomType(2), new CustomType(4)];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty(CustomType);
        property.addSample(times[0], values[0]);
        property.addSample(times[1], values[1]);
        property.addSample(times[2], values[2]);

        expect(property.getValue(new JulianDate(0.5, 0)).x).toEqual(1);
    });

    it('can set interpolationAlgorithm and degree', function() {
        var data = [0, 7, 2, 9, 4, 11];
        var epoch = new JulianDate(0, 0);

        var timesCalled = 0;
        var MockInterpolation = {
            type : 'Mock',
            getRequiredDataPoints : function(degree) {
                return 3;
            },

            interpolateOrderZero : function(x, xTable, yTable, yStride, result) {
                expect(x).toEqual(-1);

                expect(xTable.length).toEqual(3);
                expect(xTable[0]).toBe(-4);
                expect(xTable[1]).toBe(-2);
                expect(xTable[2]).toBe(0);

                expect(yTable.length).toEqual(3);
                expect(yTable[0]).toBe(7);
                expect(yTable[1]).toBe(9);
                expect(yTable[2]).toBe(11);

                expect(yStride).toEqual(1);

                expect(result.length).toEqual(1);

                result[0] = 2;
                timesCalled++;
                return result;
            }
        };

        var property = new SampledProperty(Number);
        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        property.addSamplesPackedArray(data, epoch);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        expect(property.getValue(epoch)).toEqual(7);
        expect(property.getValue(new JulianDate(0, 1))).toEqual(8);

        property.setInterpolationOptions({
            interpolationAlgorithm : MockInterpolation,
            interpolationDegree : 2
        });

        expect(listener).toHaveBeenCalledWith(property);
        expect(property.getValue(epoch)).toEqual(7);
        expect(property.getValue(new JulianDate(0, 3))).toEqual(2);

        expect(timesCalled).toEqual(1);
    });

    it('Returns undefined if trying to interpolate with less than enough samples.', function() {
        var value = 7;
        var time = new JulianDate(0, 0);

        var property = new SampledProperty(Number);
        property.addSample(time, value);

        expect(property.getValue(time)).toEqual(value);
        expect(property.getValue(JulianDate.addSeconds(time, 4, new JulianDate()))).toBeUndefined();
    });

    it('mergeNewSamples works with huge data sets.', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.now();

        var data = [];
        var expectedTimes = [];
        var expectedValues = [];

        for ( var i = 0; i < 200000; i++) {
            data.push(i);
            data.push(i);
            expectedTimes.push(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expectedValues.push(i);
        }

        SampledProperty._mergeNewSamples(epoch, times, values, data, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('mergeNewSamples works for sorted non-intersecting data.', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.now();

        var newData = [0, 'a', 1, 'b', 2, 'c'];
        var newData2 = [3, 'd', 4, 'e', 5, 'f'];

        var expectedTimes = [JulianDate.addSeconds(epoch, 0, new JulianDate()),
                             JulianDate.addSeconds(epoch, 1, new JulianDate()),
                             JulianDate.addSeconds(epoch, 2, new JulianDate()),
                             JulianDate.addSeconds(epoch, 3, new JulianDate()),
                             JulianDate.addSeconds(epoch, 4, new JulianDate()),
                             JulianDate.addSeconds(epoch, 5, new JulianDate())];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        SampledProperty._mergeNewSamples(epoch, times, values, newData, 1);
        SampledProperty._mergeNewSamples(epoch, times, values, newData2, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('mergeNewSamples works for ISO8601 dates', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.fromIso8601('2010-01-01T12:00:00');

        var newData = ['2010-01-01T12:00:00', 'a', '2010-01-01T12:00:01', 'b', '2010-01-01T12:00:02', 'c'];
        var newData2 = ['2010-01-01T12:00:03', 'd', '2010-01-01T12:00:04', 'e', '2010-01-01T12:00:05', 'f'];

        var expectedTimes = [JulianDate.addSeconds(epoch, 0, new JulianDate()),
                             JulianDate.addSeconds(epoch, 1, new JulianDate()),
                             JulianDate.addSeconds(epoch, 2, new JulianDate()),
                             JulianDate.addSeconds(epoch, 3, new JulianDate()),
                             JulianDate.addSeconds(epoch, 4, new JulianDate()),
                             JulianDate.addSeconds(epoch, 5, new JulianDate())];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        SampledProperty._mergeNewSamples(undefined, times, values, newData, 1);
        SampledProperty._mergeNewSamples(undefined, times, values, newData2, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('mergeNewSamples works for elements of size 2.', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.now();

        var newData = [1, 'b', 'b', 4, 'e', 'e', 0, 'a', 'a'];
        var newData2 = [2, 'c', 'c', 3, 'd', 'd'];

        var expectedTimes = [JulianDate.addSeconds(epoch, 0, new JulianDate()),
                             JulianDate.addSeconds(epoch, 1, new JulianDate()),
                             JulianDate.addSeconds(epoch, 2, new JulianDate()),
                             JulianDate.addSeconds(epoch, 3, new JulianDate()),
                             JulianDate.addSeconds(epoch, 4, new JulianDate())];
        var expectedValues = ['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e'];

        SampledProperty._mergeNewSamples(epoch, times, values, newData, 2);
        SampledProperty._mergeNewSamples(epoch, times, values, newData2, 2);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('mergeNewSamples works for unsorted intersecting data.', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.now();

        var newData = [1, 'b', 4, 'e', 0, 'a'];
        var newData2 = [5, 'f', 2, 'c', 3, 'd'];

        var expectedTimes = [JulianDate.addSeconds(epoch, 0, new JulianDate()),
                             JulianDate.addSeconds(epoch, 1, new JulianDate()),
                             JulianDate.addSeconds(epoch, 2, new JulianDate()),
                             JulianDate.addSeconds(epoch, 3, new JulianDate()),
                             JulianDate.addSeconds(epoch, 4, new JulianDate()),
                             JulianDate.addSeconds(epoch, 5, new JulianDate())];
        var expectedValues = ['a', 'b', 'c', 'd', 'e', 'f'];

        SampledProperty._mergeNewSamples(epoch, times, values, newData, 1);
        SampledProperty._mergeNewSamples(epoch, times, values, newData2, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    it('mergeNewSamples works for data with repeated values.', function() {
        var times = [];
        var values = [];
        var epoch = JulianDate.now();

        var newData = [0, 'a', 1, 'b', 1, 'c', 0, 'd', 4, 'e', 5, 'f'];
        var expectedTimes = [JulianDate.addSeconds(epoch, 0, new JulianDate()),
                             JulianDate.addSeconds(epoch, 1, new JulianDate()),
                             JulianDate.addSeconds(epoch, 4, new JulianDate()),
                             JulianDate.addSeconds(epoch, 5, new JulianDate())];
        var expectedValues = ['d', 'c', 'e', 'f'];
        SampledProperty._mergeNewSamples(epoch, times, values, newData, 1);

        expect(times).toEqual(expectedTimes, JulianDate.compare);
        expect(values).toEqual(expectedValues);
    });

    var interwovenData = [{
        epoch : JulianDate.fromIso8601("20130205T150405.704999999999927Z"),
        values : [0.0, 1, 120.0, 2, 240.0, 3, 360.0, 4, 480.0, 6, 600.0, 8, 720.0, 10, 840.0, 12, 960.0, 14, 1080.0, 16]
    }, {
        epoch : JulianDate.fromIso8601("20130205T151151.60499999999956Z"),
        values : [0.0, 5, 120.0, 7, 240.0, 9, 360.0, 11, 480.0, 13, 600.0, 15, 720.0, 17, 840.0, 18, 960.0, 19, 1080.0, 20]
    }];

    it('mergeNewSamples works with interwoven data', function() {
        var times = [];
        var values = [];
        SampledProperty._mergeNewSamples(interwovenData[0].epoch, times, values, interwovenData[0].values, 1);
        SampledProperty._mergeNewSamples(interwovenData[1].epoch, times, values, interwovenData[1].values, 1);
        for ( var i = 0; i < values.length; i++) {
            expect(values[i]).toBe(i + 1);
        }
    });

    it('constructor throws without type parameter.', function() {
        expect(function() {
            return new SampledProperty(undefined);
        }).toThrowDeveloperError();
    });

    it('equals works when interpolators differ', function() {
        var left = new SampledProperty(Number);
        var right = new SampledProperty(Number);

        expect(left.equals(right)).toEqual(true);
        right.setInterpolationOptions({
            interpolationAlgorithm : LagrangePolynomialApproximation
        });
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works when interpolator degree differ', function() {
        var left = new SampledProperty(Number);

        left.setInterpolationOptions({
            interpolationDegree : 2,
            interpolationAlgorithm : LagrangePolynomialApproximation
        });

        var right = new SampledProperty(Number);
        right.setInterpolationOptions({
            interpolationDegree : 2,
            interpolationAlgorithm : LagrangePolynomialApproximation
        });

        expect(left.equals(right)).toEqual(true);
        right.setInterpolationOptions({
            interpolationDegree : 3,
            interpolationAlgorithm : LagrangePolynomialApproximation
        });

        expect(left.equals(right)).toEqual(false);
    });

    it('equals works when samples differ', function() {
        var left = new SampledProperty(Number);
        var right = new SampledProperty(Number);
        expect(left.equals(right)).toEqual(true);

        var time = JulianDate.now();
        left.addSample(time, 5);
        expect(left.equals(right)).toEqual(false);

        right.addSample(time, 5);
        expect(left.equals(right)).toEqual(true);
    });

    it('equals works when derivatives differ', function() {
        var left = new SampledProperty(Number, [Number]);
        var right = new SampledProperty(Number);
        expect(left.equals(right)).toEqual(false);

        left = new SampledProperty(Number, [Number]);
        right = new SampledProperty(Number, [Number]);
        expect(left.equals(right)).toEqual(true);

        left = new SampledProperty(Number, [Number]);
        right = new SampledProperty(Number, [Number, Number]);
        expect(left.equals(right)).toEqual(false);

        left = new SampledProperty(Cartesian3, [Cartesian3, Number]);
        right = new SampledProperty(Cartesian3, [Number, Number]);
        expect(left.equals(right)).toEqual(false);
    });

    //The remaining tests were verified with STK Components available from http://www.agi.com.
    it('addSample works with multiple derivatives', function() {
        var results = [0, -3.39969163485071, 0.912945250727628, -6.17439797860995, 0.745113160479349, -1.63963048028446, -0.304810621102217, 4.83619040459681, -0.993888653923375, 169.448966391543];

        var property = new SampledProperty(Number, [Number, Number]);
        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        for (var x = 0; x < 100; x += 20) {
            property.addSample(JulianDate.addSeconds(epoch, x, new JulianDate()), Math.sin(x), [Math.cos(x), -Math.sin(x)]);
        }
        var resultIndex = 0;
        for (var i = 0; i < 100; i += 10) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(results[resultIndex++], CesiumMath.EPSILON12);
        }
    });

    var epoch = JulianDate.fromIso8601('2014-01-01T00:00:00');
    var times = [JulianDate.addSeconds(epoch, 0, new JulianDate()),
                 JulianDate.addSeconds(epoch, 60, new JulianDate()),
                 JulianDate.addSeconds(epoch, 120, new JulianDate()),
                 JulianDate.addSeconds(epoch, 180, new JulianDate()),
                 JulianDate.addSeconds(epoch, 240, new JulianDate()),
                 JulianDate.addSeconds(epoch, 300, new JulianDate()),
                 JulianDate.addSeconds(epoch, 360, new JulianDate()),
                 JulianDate.addSeconds(epoch, 420, new JulianDate())];

    var positions = [new Cartesian3(13378137.0000000, 0.000000000, 1),
                     new Cartesian3(13374128.3576279, 327475.593690065, 2),
                     new Cartesian3(13362104.8328212, 654754.936954423, 3),
                     new Cartesian3(13342073.6310691, 981641.896976832, 4),
                     new Cartesian3(13314046.7567223, 1307940.576089510, 5),
                     new Cartesian3(13278041.0057990, 1633455.429171170, 6),
                     new Cartesian3(13234077.9559193, 1957991.380833850, 7),
                     new Cartesian3(13182183.9533740, 2281353.942328160, 8)];

    var derivatives = [[new Cartesian3(0.000000000000, 5458.47176691947, 0)],
                       [new Cartesian3(-133.614738921601, 5456.83618333919, 0)],
                       [new Cartesian3(-267.149404854867, 5451.93041277513, 0)],
                       [new Cartesian3(-400.523972797808, 5443.75739517027, 0)],
                       [new Cartesian3(-533.658513692378, 5432.32202847183, 0)],
                       [new Cartesian3(-666.473242324565, 5417.63116569613, 0)],
                       [new Cartesian3(-798.888565138278, 5399.69361082164, 0)],
                       [new Cartesian3(-930.825127934390, 5378.52011351288, 0)]];

    var order0Results = [new Cartesian3(13378137, 0, 1),
                  new Cartesian3(13376800.785876, 109158.531230022, 1.33333333333333),
                  new Cartesian3(13375464.5717519, 218317.062460043, 1.66666666666667),
                  new Cartesian3(13374128.3576279, 327475.593690065, 2),
                  new Cartesian3(13370120.5160257, 436568.708111518, 2.33333333333333),
                  new Cartesian3(13366112.6744234, 545661.82253297, 2.66666666666667),
                  new Cartesian3(13362104.8328212, 654754.936954423, 3),
                  new Cartesian3(13355427.7655705, 763717.256961893, 3.33333333333333),
                  new Cartesian3(13348750.6983198, 872679.576969362, 3.66666666666667),
                  new Cartesian3(13342073.6310691, 981641.896976832, 4),
                  new Cartesian3(13332731.3396202, 1090408.12334772, 4.33333333333333),
                  new Cartesian3(13323389.0481712, 1199174.34971862, 4.66666666666667),
                  new Cartesian3(13314046.7567223, 1307940.57608951, 5),
                  new Cartesian3(13302044.8397479, 1416445.52711673, 5.33333333333333),
                  new Cartesian3(13290042.9227734, 1524950.47814395, 5.66666666666667),
                  new Cartesian3(13278041.005799, 1633455.42917117, 6),
                  new Cartesian3(13263386.6558391, 1741634.0797254, 6.33333333333333),
                  new Cartesian3(13248732.3058792, 1849812.73027962, 6.66666666666667),
                  new Cartesian3(13234077.9559193, 1957991.38083385, 7),
                  new Cartesian3(13216779.9550709, 2065778.90133195, 7.33333333333333),
                  new Cartesian3(13199481.9542224, 2173566.42183006, 7.66666666666667),
                  new Cartesian3(13182183.953374, 2281353.94232816, 8)];

    var order1Results = [new Cartesian3(13378137, 0, 1),
                  new Cartesian3(13377691.5656321, 109168.223625571, 1.25925925925926),
                  new Cartesian3(13376355.3218481, 218329.177845564, 1.74074074074074),
                  new Cartesian3(13374128.3576279, 327475.593690065, 2),
                  new Cartesian3(13371010.7916129, 436600.202479654, 2.25925925925926),
                  new Cartesian3(13367002.8610487, 545695.738439022, 2.74074074074074),
                  new Cartesian3(13362104.8328212, 654754.936954423, 3),
                  new Cartesian3(13356317.0034622, 763770.534428588, 3.25925925925926),
                  new Cartesian3(13349639.7880007, 872735.273070732, 3.74074074074074),
                  new Cartesian3(13342073.6310691, 981641.896976832, 4),
                  new Cartesian3(13333619.0069115, 1090483.15198472, 4.25925925925926),
                  new Cartesian3(13324276.5080919, 1199251.7926376, 4.74074074074074),
                  new Cartesian3(13314046.7567223, 1307940.57608951, 5),
                  new Cartesian3(13302930.4044753, 1416542.26196067, 5.25925925925926),
                  new Cartesian3(13290928.2210945, 1525049.62147035, 5.74074074074074),
                  new Cartesian3(13278041.005799, 1633455.42917117, 6),
                  new Cartesian3(13264269.587299, 1741752.46280477, 6.25925925925926),
                  new Cartesian3(13249614.9120568, 1849933.51459858, 6.74074074074074),
                  new Cartesian3(13234077.9559193, 1957991.38083385, 7),
                  new Cartesian3(13217659.7241379, 2065918.86170184, 7.25925925925926),
                  new Cartesian3(13200361.339326, 2173708.77475762, 7.74074074074074),
                  new Cartesian3(13182183.953374, 2281353.94232816, 8)];

    it('addSample works with derivatives', function() {
        var property = new SampledProperty(Cartesian3, [Cartesian3]);
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        for (var x = 0; x < times.length; x++) {
            property.addSample(times[x], positions[x], derivatives[x]);
        }
        var resultIndex = 0;
        for (var i = 0; i < 420; i += 20) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(order1Results[resultIndex++], CesiumMath.EPSILON7);
        }
    });

    it('addSample works without derivatives', function() {
        var property = new SampledProperty(Cartesian3);
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        for (var x = 0; x < times.length; x++) {
            property.addSample(times[x], positions[x]);
        }

        var resultIndex = 0;
        for (var i = 0; i < 420; i += 20) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(order0Results[resultIndex++], CesiumMath.EPSILON7);
        }
    });

    it('addSamples works with derivatives', function() {
        var property = new SampledProperty(Cartesian3, [Cartesian3]);
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        property.addSamples(times, positions, derivatives);
        var resultIndex = 0;
        for (var i = 0; i < 420; i += 20) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(order1Results[resultIndex++], CesiumMath.EPSILON7);
        }
    });

    it('addSamples works without derivatives', function() {
        var property = new SampledProperty(Cartesian3);
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        property.addSamples(times, positions);
        var resultIndex = 0;
        for (var i = 0; i < 420; i += 20) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(order0Results[resultIndex++], CesiumMath.EPSILON7);
        }
    });

    it('addSamplesPackedArray works with derivatives', function() {
        var property = new SampledProperty(Cartesian3, [Cartesian3]);
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        var data = [];
        for (var x = 0; x < times.length; x++) {
            data.push(times[x]);
            Cartesian3.pack(positions[x], data, data.length);
            Cartesian3.pack(derivatives[x][0], data, data.length);
        }
        property.addSamplesPackedArray(data);

        var resultIndex = 0;
        for (var i = 0; i < 420; i += 20) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(order1Results[resultIndex++], CesiumMath.EPSILON7);
        }
    });

    it('addSamplesPackedArray works without derivatives', function() {
        var property = new SampledProperty(Cartesian3);
        property.setInterpolationOptions({
            interpolationAlgorithm : HermitePolynomialApproximation,
            interpolationDegree : 1
        });

        var data = [];
        for (var x = 0; x < times.length; x++) {
            data.push(times[x]);
            Cartesian3.pack(positions[x], data, data.length);
        }
        property.addSamplesPackedArray(data);

        var resultIndex = 0;
        for (var i = 0; i < 420; i += 20) {
            var result = property.getValue(JulianDate.addSeconds(epoch, i, new JulianDate()));
            expect(result).toEqualEpsilon(order0Results[resultIndex++], CesiumMath.EPSILON7);
        }
    });

    it('obeys extrapolation options', function() {
        var property = new SampledProperty(Number);

        var time0 = new JulianDate(0, 0.99);
        var time1 = new JulianDate(0, 1);
        var time2 = new JulianDate(0, 2);
        var time3 = new JulianDate(0, 3);
        var time4 = new JulianDate(0, 4);
        var time5 = new JulianDate(0, 4.01);

        property.addSample(time2, 1);
        property.addSample(time3, 2);

        //Default is no extrapolation
        expect(property.getValue(time0)).toBeUndefined();
        expect(property.getValue(time1)).toBeUndefined();
        expect(property.getValue(time2)).toBe(1);
        expect(property.getValue(time3)).toBe(2);
        expect(property.getValue(time4)).toBeUndefined();
        expect(property.getValue(time5)).toBeUndefined();

        //No backward, hold forward for up to 1 second
        property.forwardExtrapolationType = ExtrapolationType.HOLD;
        property.forwardExtrapolationDuration = 1.0;
        property.backwardExtrapolationType = ExtrapolationType.NONE;
        property.backwardExtrapolationDuration = 1.0;

        expect(property.getValue(time1)).toBeUndefined();
        expect(property.getValue(time2)).toBe(1);
        expect(property.getValue(time3)).toBe(2);
        expect(property.getValue(time4)).toBe(2);
        expect(property.getValue(time5)).toBeUndefined();

        //No backward, extrapolate forward for up to 1 second
        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        property.forwardExtrapolationDuration = 1.0;
        property.backwardExtrapolationType = ExtrapolationType.NONE;
        property.backwardExtrapolationDuration = 1.0;

        expect(property.getValue(time1)).toBeUndefined();
        expect(property.getValue(time2)).toBe(1);
        expect(property.getValue(time3)).toBe(2);
        expect(property.getValue(time4)).toBe(3);
        expect(property.getValue(time5)).toBeUndefined();

        //No forward, hold backward for up to 1 second
        property.forwardExtrapolationType = ExtrapolationType.NONE;
        property.forwardExtrapolationDuration = 1.0;
        property.backwardExtrapolationType = ExtrapolationType.HOLD;
        property.backwardExtrapolationDuration = 1.0;

        expect(property.getValue(time0)).toBeUndefined();
        expect(property.getValue(time1)).toBe(1);
        expect(property.getValue(time2)).toBe(1);
        expect(property.getValue(time3)).toBe(2);
        expect(property.getValue(time4)).toBeUndefined();

        //No forward, extrapolate backward for up to 1 second
        property.forwardExtrapolationType = ExtrapolationType.NONE;
        property.forwardExtrapolationDuration = 1.0;
        property.backwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        property.backwardExtrapolationDuration = 1.0;

        expect(property.getValue(time0)).toBeUndefined();
        expect(property.getValue(time1)).toBe(0);
        expect(property.getValue(time2)).toBe(1);
        expect(property.getValue(time3)).toBe(2);
        expect(property.getValue(time4)).toBeUndefined();
    });

    it('raises definitionChanged when extrapolation options change', function() {
        var property = new SampledProperty(Number);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.forwardExtrapolationDuration = 1.0;
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.backwardExtrapolationType = ExtrapolationType.HOLD;
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.backwardExtrapolationDuration = 1.0;
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        //No events when reassigning to the same value.
        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        expect(listener).not.toHaveBeenCalled();

        property.forwardExtrapolationDuration = 1.0;
        expect(listener).not.toHaveBeenCalled();

        property.backwardExtrapolationType = ExtrapolationType.HOLD;
        expect(listener).not.toHaveBeenCalled();

        property.backwardExtrapolationDuration = 1.0;
        expect(listener).not.toHaveBeenCalled();
    });
});