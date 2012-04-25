(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("TimeIntervalSpec", function() {
        it("Construction", function() {
            var start = new Cesium.JulianDate(), stop = start.addDays(1), isStartIncluded = false, isStopIncluded = true, data = {};

            var interval = new Cesium.TimeInterval(start, stop, isStartIncluded, isStopIncluded, data);
            expect(interval.start === start).toBeTruthy();
            expect(interval.stop === stop).toBeTruthy();
            expect(interval.isStartIncluded === isStartIncluded).toBeTruthy();
            expect(interval.isStopIncluded === isStopIncluded).toBeTruthy();
            expect(interval.data === data).toBeTruthy();

            interval = new Cesium.TimeInterval(start, stop);
            expect(interval.start === start).toBeTruthy();
            expect(interval.stop === stop).toBeTruthy();
            expect(interval.isStartIncluded).toBeTruthy();
            expect(interval.isStopIncluded).toBeTruthy();
            expect(interval.data === undefined).toBeTruthy();
        });

        it("Fail with undefined start", function() {
            expect(function() {
                return new Cesium.TimeInterval(undefined, new Cesium.JulianDate());
            }).toThrow();
        });

        it("Fail with undefined stop", function() {
            expect(function() {
                return new Cesium.TimeInterval(new Cesium.JulianDate());
            }).toThrow();
        });

        it("IsEmpty", function() {
            var interval = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(1));
            expect(interval.isEmpty).toBeFalsy();

            interval = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(1), false, false);
            expect(interval.isEmpty).toBeTruthy();

            interval = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(5), Cesium.JulianDate.createFromTotalDays(4));
            expect(interval.isEmpty).toBeTruthy();
        });

        it("Contains", function() {
            var interval1 = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2451545), Cesium.JulianDate.createFromTotalDays(2451546));
            expect(interval1.contains(Cesium.JulianDate.createFromTotalDays(2451545))).toBeTruthy();
            expect(interval1.contains(Cesium.JulianDate.createFromTotalDays(2451545.5))).toBeTruthy();
            expect(interval1.contains(Cesium.JulianDate.createFromTotalDays(2451546))).toBeTruthy();
            expect(interval1.contains(Cesium.JulianDate.createFromTotalDays(2451546.5))).toBeFalsy();

            var interval2 = new Cesium.TimeInterval(interval1.start, interval1.stop, false, false);
            expect(interval2.contains(Cesium.JulianDate.createFromTotalDays(2451545))).toBeFalsy();
            expect(interval2.contains(Cesium.JulianDate.createFromTotalDays(2451545.5))).toBeTruthy();
            expect(interval2.contains(Cesium.JulianDate.createFromTotalDays(2451546))).toBeFalsy();
            expect(interval2.contains(Cesium.JulianDate.createFromTotalDays(2451546.5))).toBeFalsy();
        });

        it("Equality", function() {
            var interval1 = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2));
            var interval2 = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2));
            expect(interval1.equals(interval2)).toBeTruthy();
            expect(interval2.equals(interval1)).toBeTruthy();
            expect(interval1.equalsEpsilon(interval2, 0)).toBeTruthy();
            expect(interval2.equalsEpsilon(interval1, 0)).toBeTruthy();

            interval2 = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(3));
            expect(interval1.equals(interval2)).toBeFalsy();
            expect(interval2.equals(interval1)).toBeFalsy();
            expect(interval1.equalsEpsilon(interval2, 0)).toBeFalsy();
            expect(interval2.equalsEpsilon(interval1, 0)).toBeFalsy();
            expect(interval1.equalsEpsilon(interval2, 86400)).toBeTruthy();
            expect(interval2.equalsEpsilon(interval1, 86400)).toBeTruthy();

            interval1 = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(1), true, true);
            interval2 = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), new Cesium.JulianDate(1, 1), true, false);
            expect(interval1.equals(interval2)).toBeFalsy();
            expect(interval2.equals(interval1)).toBeFalsy();
            expect(interval1.equalsEpsilon(interval2, 1.1)).toBeFalsy();
            expect(interval2.equalsEpsilon(interval1, 1.1)).toBeFalsy();

            expect(interval1.equals(undefined)).toBeFalsy();
            expect(interval1.equalsEpsilon(undefined, 1.0)).toBeFalsy();
        });

        it("Intersect", function() {
            var testParameters = [new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2.5), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1.5), Cesium.JulianDate.createFromTotalDays(2), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1.5), Cesium.JulianDate.createFromTotalDays(2), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2.5), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(3), Cesium.JulianDate.createFromTotalDays(4), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(0), Cesium.JulianDate.createFromTotalDays(0), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2.5), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(3), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(2.5), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), true, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), false, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), true, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), true, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), true, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(3), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(4), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(3), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(3), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(4), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(3), true, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(1), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(0), Cesium.JulianDate.createFromTotalDays(0), false, false),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(3), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(3), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(2), Cesium.JulianDate.createFromTotalDays(3), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(3), Cesium.JulianDate.createFromTotalDays(2), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(3), Cesium.JulianDate.createFromTotalDays(3), true, true),
                    new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(0), Cesium.JulianDate.createFromTotalDays(0), false, false)];

            for ( var i = 0; i < testParameters.length - 2; i = i + 3) {
                var first = testParameters[i];
                var second = testParameters[i + 1];
                var expectedResult = testParameters[i + 2];
                var intersect1 = first.intersect(second);
                var intersect2 = second.intersect(first);
                expect(intersect1.equals(intersect2)).toBeTruthy();
                expect(intersect2.equals(intersect1)).toBeTruthy();
                expect(expectedResult.equals(intersect1)).toBeTruthy();
            }

            var interval = new Cesium.TimeInterval(Cesium.JulianDate.createFromTotalDays(1), Cesium.JulianDate.createFromTotalDays(2));
            expect(interval.intersect(undefined) === Cesium.TimeInterval.empty).toBeTruthy();
        });

    });
}());