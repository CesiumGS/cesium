defineSuite([
        'DataSources/SampledPositionProperty',
        'Core/Cartesian3',
        'Core/ExtrapolationType',
        'Core/JulianDate',
        'Core/LagrangePolynomialApproximation',
        'Core/LinearApproximation',
        'Core/ReferenceFrame',
        'DataSources/PositionProperty'
    ], function(
        SampledPositionProperty,
        Cartesian3,
        ExtrapolationType,
        JulianDate,
        LagrangePolynomialApproximation,
        LinearApproximation,
        ReferenceFrame,
        PositionProperty) {
    'use strict';

    it('constructor sets expected defaults', function() {
        var property = new SampledPositionProperty();
        expect(property.referenceFrame).toEqual(ReferenceFrame.FIXED);
        expect(property.interpolationDegree).toEqual(1);
        expect(property.interpolationAlgorithm).toEqual(LinearApproximation);
        expect(property.numberOfDerivatives).toEqual(0);
        expect(property.forwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.forwardExtrapolationDuration).toEqual(0);
        expect(property.backwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.backwardExtrapolationDuration).toEqual(0);
    });

    it('constructor sets expected values', function() {
        var property = new SampledPositionProperty(ReferenceFrame.INERTIAL, 1);
        expect(property.referenceFrame).toEqual(ReferenceFrame.INERTIAL);
        expect(property.interpolationDegree).toEqual(1);
        expect(property.interpolationAlgorithm).toEqual(LinearApproximation);
        expect(property.numberOfDerivatives).toEqual(1);
        expect(property.forwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.forwardExtrapolationDuration).toEqual(0);
        expect(property.backwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(property.backwardExtrapolationDuration).toEqual(0);
    });

    it('getValue works without a result parameter', function() {
        var time = JulianDate.now();
        var value = new Cartesian3(1, 2, 3);
        var property = new SampledPositionProperty();
        property.addSample(time, value);

        var result = property.getValue(time);
        expect(result).not.toBe(value);
        expect(result).toEqual(value);
    });

    it('getValue works with a result parameter', function() {
        var time = JulianDate.now();
        var value = new Cartesian3(1, 2, 3);
        var property = new SampledPositionProperty();
        property.addSample(time, value);

        var expected = new Cartesian3();
        var result = property.getValue(time, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(value);
    });

    it('getValue returns in fixed frame', function() {
        var time = JulianDate.now();
        var valueInertial = new Cartesian3(1, 2, 3);
        var valueFixed = PositionProperty.convertToReferenceFrame(time, valueInertial, ReferenceFrame.INERTIAL, ReferenceFrame.FIXED);
        var property = new SampledPositionProperty(ReferenceFrame.INERTIAL);
        property.addSample(time, valueInertial);

        var result = property.getValue(time);
        expect(result).toEqual(valueFixed);
    });

    it('getValueInReferenceFrame works without a result parameter', function() {
        var time = JulianDate.now();
        var value = new Cartesian3(1, 2, 3);
        var property = new SampledPositionProperty();
        property.addSample(time, value);

        var result = property.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL);
        expect(result).not.toBe(value);
        expect(result).toEqual(PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, ReferenceFrame.INERTIAL));
    });

    it('getValueInReferenceFrame works with a result parameter', function() {
        var time = JulianDate.now();
        var value = new Cartesian3(1, 2, 3);
        var property = new SampledPositionProperty(ReferenceFrame.INERTIAL);
        property.addSample(time, value);

        var expected = new Cartesian3();
        var result = property.getValueInReferenceFrame(time, ReferenceFrame.FIXED, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.INERTIAL, ReferenceFrame.FIXED));
    });

    it('addSamplesPackedArray works', function() {
        var data = [0, 7, 8, 9, 1, 8, 9, 10, 2, 9, 10, 11];
        var epoch = new JulianDate(0, 0);

        var property = new SampledPositionProperty();
        property.addSamplesPackedArray(data, epoch);
        expect(property.getValue(epoch)).toEqual(new Cartesian3(7, 8, 9));
        expect(property.getValue(new JulianDate(0, 0.5))).toEqual(new Cartesian3(7.5, 8.5, 9.5));
    });

    it('addSample works', function() {
        var values = [new Cartesian3(7, 8, 9), new Cartesian3(8, 9, 10), new Cartesian3(9, 10, 11)];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledPositionProperty();
        property.addSample(times[0], values[0]);
        property.addSample(times[1], values[1]);
        property.addSample(times[2], values[2]);

        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(new Cartesian3(7.5, 8.5, 9.5));
    });

    it('addSamples works', function() {
        var values = [new Cartesian3(7, 8, 9), new Cartesian3(8, 9, 10), new Cartesian3(9, 10, 11)];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledPositionProperty();
        property.addSamples(times, values);
        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(new Cartesian3(7.5, 8.5, 9.5));
    });

    it('addSamplesPackedArray works with derivatives', function() {
        var data = [0, 7, 8, 9, 1, 0, 0, 1, 8, 9, 10, 0, 1, 0, 2, 9, 10, 11, 0, 0, 1];
        var epoch = new JulianDate(0, 0);

        var property = new SampledPositionProperty(ReferenceFrame.FIXED, 1);
        property.addSamplesPackedArray(data, epoch);
        expect(property.getValue(epoch)).toEqual(new Cartesian3(7, 8, 9));
        expect(property.getValue(new JulianDate(0, 0.5))).toEqual(new Cartesian3(7.5, 8.5, 9.5));
    });

    it('addSample works with derivatives', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];
        var positions = [new Cartesian3(7, 8, 9), new Cartesian3(8, 9, 10), new Cartesian3(9, 10, 11)];
        var velocities = [[new Cartesian3(0, 0, 1)], [new Cartesian3(0, 1, 0)], [new Cartesian3(1, 0, 0)]];

        var property = new SampledPositionProperty(ReferenceFrame.FIXED, 1);
        property.addSample(times[0], positions[0], velocities[0]);
        property.addSample(times[1], positions[1], velocities[1]);
        property.addSample(times[2], positions[2], velocities[2]);

        expect(property.getValue(times[0])).toEqual(positions[0]);
        expect(property.getValue(times[1])).toEqual(positions[1]);
        expect(property.getValue(times[2])).toEqual(positions[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(new Cartesian3(7.5, 8.5, 9.5));
    });

    it('addSamples works with derivatives', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];
        var positions = [new Cartesian3(7, 8, 9), new Cartesian3(8, 9, 10), new Cartesian3(9, 10, 11)];
        var velocities = [[new Cartesian3(0, 0, 1)], [new Cartesian3(0, 1, 0)], [new Cartesian3(1, 0, 0)]];

        var property = new SampledPositionProperty(ReferenceFrame.FIXED, 1);
        property.addSamples(times, positions, velocities);
        expect(property.getValue(times[0])).toEqual(positions[0]);
        expect(property.getValue(times[1])).toEqual(positions[1]);
        expect(property.getValue(times[2])).toEqual(positions[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(new Cartesian3(7.5, 8.5, 9.5));
    });

    it('addSample throws when derivative is undefined but expected', function() {
        var property = new SampledPositionProperty(ReferenceFrame.FIXED, 1);
        expect(function() {
            property.addSample(new JulianDate(0, 0), new Cartesian3(7, 8, 9), undefined);
        }).toThrowDeveloperError();
    });

    it('addSamples throws when derivative is undefined but expected', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];
        var positions = [new Cartesian3(7, 8, 9), new Cartesian3(8, 9, 10), new Cartesian3(9, 10, 11)];

        var property = new SampledPositionProperty(ReferenceFrame.FIXED, 1);
        expect(function() {
            property.addSamples(times, positions, undefined);
        }).toThrowDeveloperError();
    });

    it('addSamples throws when derivative is not the correct length', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];
        var positions = [new Cartesian3(7, 8, 9), new Cartesian3(8, 9, 10), new Cartesian3(9, 10, 11)];
        var velocities = [[new Cartesian3(7, 8, 9)], [new Cartesian3(8, 9, 10)]];

        var property = new SampledPositionProperty(ReferenceFrame.FIXED, 1);
        expect(function() {
            property.addSamples(times, positions, velocities);
        }).toThrowDeveloperError();
    });

    it('can set interpolationAlgorithm and degree', function() {
        var data = [0, 7, 8, 9, 1, 8, 9, 10, 2, 9, 10, 11];
        var epoch = new JulianDate(0, 0);

        var timesCalled = 0;
        var MockInterpolation = {
            type : 'Mock',
            getRequiredDataPoints : function(degree) {
                return 3;
            },

            interpolateOrderZero : function(x, xTable, yTable, yStride, result) {
                expect(x).toEqual(1);

                expect(xTable.length).toEqual(3);
                expect(xTable[0]).toBe(-2);
                expect(xTable[1]).toBe(-1);
                expect(xTable[2]).toBe(0);

                expect(yTable.length).toEqual(9);
                expect(yTable[0]).toBe(7);
                expect(yTable[1]).toBe(8);
                expect(yTable[2]).toBe(9);
                expect(yTable[3]).toBe(8);
                expect(yTable[4]).toBe(9);
                expect(yTable[5]).toBe(10);
                expect(yTable[6]).toBe(9);
                expect(yTable[7]).toBe(10);
                expect(yTable[8]).toBe(11);

                expect(yStride).toEqual(3);

                expect(result.length).toEqual(3);

                result[0] = 2;
                result[1] = 3;
                result[2] = 4;
                timesCalled++;
                return result;
            }
        };

        var property = new SampledPositionProperty();
        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        property.addSamplesPackedArray(data, epoch);
        property.setInterpolationOptions({
            interpolationDegree : 2,
            interpolationAlgorithm : MockInterpolation
        });
        expect(property.getValue(epoch)).toEqual(new Cartesian3(7, 8, 9));
        expect(property.getValue(new JulianDate(0, 3))).toEqual(new Cartesian3(2, 3, 4));

        expect(timesCalled).toEqual(1);
    });

    it('Returns undefined if trying to interpolate with less than enough samples.', function() {
        var value = new Cartesian3(1, 2, 3);
        var time = new JulianDate(0, 0);

        var property = new SampledPositionProperty();
        property.addSample(time, value);

        expect(property.getValue(time)).toEqual(value);
        expect(property.getValue(JulianDate.addSeconds(time, 4, new JulianDate()))).toBeUndefined();
    });

    it('throws with no time parameter', function() {
        var property = new SampledPositionProperty();
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('throws with no reference frame parameter', function() {
        var property = new SampledPositionProperty();
        var time = JulianDate.now();
        expect(function() {
            property.getValueInReferenceFrame(time, undefined);
        }).toThrowDeveloperError();
    });

    it('equals works when interpolators differ', function() {
        var left = new SampledPositionProperty();
        var right = new SampledPositionProperty();

        expect(left.equals(right)).toEqual(true);
        right.setInterpolationOptions({
            interpolationAlgorithm : LagrangePolynomialApproximation
        });
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works when interpolator degree differ', function() {
        var left = new SampledPositionProperty();

        left.setInterpolationOptions({
            interpolationDegree : 2,
            interpolationAlgorithm : LagrangePolynomialApproximation
        });

        var right = new SampledPositionProperty();
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

    it('equals works when reference frames differ', function() {
        var left = new SampledPositionProperty(ReferenceFrame.FIXED);
        var right = new SampledPositionProperty(ReferenceFrame.INERTIAL);
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works when samples differ', function() {
        var left = new SampledPositionProperty();
        var right = new SampledPositionProperty();
        expect(left.equals(right)).toEqual(true);

        var time = JulianDate.now();
        var value = new Cartesian3(1, 2, 3);
        left.addSample(time, value);
        expect(left.equals(right)).toEqual(false);

        right.addSample(time, value);
        expect(left.equals(right)).toEqual(true);
    });

    it('raises definitionChanged when extrapolation options change', function() {
        var property = new SampledPositionProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.forwardExtrapolationType = ExtrapolationType.EXTRAPOLATE;
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        property.forwardExtrapolationDuration = 1.0;
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        property.backwardExtrapolationType = ExtrapolationType.HOLD;
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        property.backwardExtrapolationDuration = 1.0;
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

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
