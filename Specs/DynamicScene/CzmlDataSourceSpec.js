/*global defineSuite*/
defineSuite(['DynamicScene/CzmlDataSource',
             'DynamicScene/DynamicObjectCollection',
             'Core/ClockRange',
             'Core/ClockStep',
             'Core/Event',
             'Core/loadJson',
             'Core/JulianDate',
             'Core/TimeInterval'
            ], function(
                    CzmlDataSource,
                    DynamicObjectCollection,
                    ClockRange,
                    ClockStep,
                    Event,
                    loadJson,
                    JulianDate,
                    TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var staticCzml = {
        'id' : 'test',
        'billboard' : {
            'show' : true
        }
    };

    var dynamicCzml = {
        id : 'test',
        availability : '2000-01-01/2001-01-01',
        billboard : {
            show : true
        }
    };

    var clockCzml = {
        id : 'document',
        clock : {
            interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
            currentTime : '2012-03-15T10:00:00Z',
            multiplier : 60.0,
            range : 'LOOP_STOP',
            step : 'SYSTEM_CLOCK_MULTIPLIER'
        }
    };

    var simple;
    var simpleUrl = 'Data/CZML/simple.czml';
    var vehicle;
    var vehicleUrl = 'Data/CZML/Vehicle.czml';

    beforeAll(function() {
        loadJson(simpleUrl).then(function(result) {
            simple = result;
        });
        loadJson(vehicleUrl).then(function(result) {
            vehicle = result;
        });
    });

    var parsedClock = {
        interval : TimeInterval.fromIso8601(clockCzml.clock.interval),
        currentTime : JulianDate.fromIso8601(clockCzml.clock.currentTime),
        multiplier : clockCzml.clock.multiplier,
        range : ClockRange[clockCzml.clock.range],
        step : ClockStep[clockCzml.clock.step]
    };

    var errorCounter;
    function errorEventCounter() {
        errorCounter++;
    }

    it('default constructor has expected values', function() {
        var dataSource = new CzmlDataSource();
        expect(dataSource.getChangedEvent()).toBeInstanceOf(Event);
        expect(dataSource.getErrorEvent()).toBeInstanceOf(Event);
        expect(dataSource.getClock()).toBeUndefined();
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(0);
        expect(dataSource.getIsTimeVarying()).toEqual(true);
    });

    it('getClock returns undefined for static CZML', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(staticCzml);
        expect(dataSource.getClock()).toBeUndefined();
    });

    it('getClock returns CZML defined clock', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(clockCzml);
        var clock = dataSource.getClock();
        expect(clock).toBeDefined();
        expect(clock.startTime).toEqual(parsedClock.interval.start);
        expect(clock.stopTime).toEqual(parsedClock.interval.stop);
        expect(clock.currentTime).toEqual(parsedClock.currentTime);
        expect(clock.clockRange).toEqual(parsedClock.range);
        expect(clock.clockStep).toEqual(parsedClock.step);
        expect(clock.multiplier).toEqual(parsedClock.multiplier);
    });

    it('getClock returns data interval if no clock defined', function() {
        var interval = TimeInterval.fromIso8601(dynamicCzml.availability);

        var dataSource = new CzmlDataSource();
        dataSource.load(dynamicCzml);
        var clock = dataSource.getClock();
        expect(clock).toBeDefined();
        expect(clock.startTime).toEqual(interval.start);
        expect(clock.stopTime).toEqual(interval.stop);
        expect(clock.currentTime).toEqual(interval.start);
        expect(clock.clockRange).toEqual(ClockRange.LOOP_STOP);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        expect(clock.multiplier).toEqual(interval.start.getSecondsDifference(interval.stop) / 120.0);
    });

    it('processUrl loads expected data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 12;
        });
    });

    it('processUrl loads data on top of existing', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 12;
        });

        runs(function() {
            dataSource.processUrl(vehicleUrl);
        });

        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 13;
        });
    });

    it('loadUrl replaces data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 12;
        });

        runs(function() {
            dataSource.loadUrl(vehicleUrl);
        });

        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 1;
        });
    });

    it('process loads expected data', function() {
        waitsFor(function() {
            return typeof simple !== 'undefined';
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, simpleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(12);
        });
    });

    it('process loads data on top of existing', function() {
        waitsFor(function() {
            return typeof simple !== 'undefined' && typeof vehicle !== 'undefined';
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, simpleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length === 12);

            dataSource.process(vehicle, vehicleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length === 13);
        });
    });

    it('load replaces data', function() {
        waitsFor(function() {
            return typeof simple !== 'undefined' && typeof vehicle !== 'undefined';
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, simpleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(12);

            dataSource.load(vehicle, vehicleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        });
    });

    it('process throws with undefined CZML', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.process(undefined);
        }).toThrow();
    });

    it('load throws with undefined CZML', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrow();
    });

    it('processUrl throws with undefined Url', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.processUrl(undefined);
        }).toThrow();
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrow();
    });
});
