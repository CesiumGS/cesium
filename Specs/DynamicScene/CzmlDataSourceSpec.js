/*global defineSuite*/
defineSuite([
        'DynamicScene/CzmlDataSource',
        'DynamicScene/DynamicBillboard',
        'DynamicScene/DynamicObjectCollection',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/defined',
        'Core/Event',
        'Core/loadJson',
        'Core/JulianDate',
        'Core/TimeInterval',
        'ThirdParty/when'
    ], function(
        CzmlDataSource,
        DynamicBillboard,
        DynamicObjectCollection,
        ClockRange,
        ClockStep,
        defined,
        Event,
        loadJson,
        JulianDate,
        TimeInterval,
        when) {
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
            return defined(simple);
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, simpleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(12);
        });
    });

    it('process loads data on top of existing', function() {
        waitsFor(function() {
            return defined(simple) && defined(vehicle);
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
            return defined(simple) && defined(vehicle);
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

    it('raises error when an error occurs in loadUrl', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('errorEvent');
        dataSource.getErrorEvent().addEventListener(spy);

        var promise = dataSource.loadUrl('Data/Images/Blue.png'); //not JSON

        var resolveSpy = jasmine.createSpy('resolve');
        var rejectSpy = jasmine.createSpy('reject');
        when(promise, resolveSpy, rejectSpy);

        waitsFor(function() {
            return rejectSpy.wasCalled;
        });

        runs(function() {
            expect(spy).toHaveBeenCalledWith(dataSource, jasmine.any(Error));
            expect(rejectSpy).toHaveBeenCalledWith(jasmine.any(Error));
            expect(resolveSpy).not.toHaveBeenCalled();
        });
    });

    it('raises error when an error occurs in processUrl', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('errorEvent');
        dataSource.getErrorEvent().addEventListener(spy);

        var promise = dataSource.processUrl('Data/Images/Blue.png'); //not JSON

        var resolveSpy = jasmine.createSpy('resolve');
        var rejectSpy = jasmine.createSpy('reject');
        when(promise, resolveSpy, rejectSpy);

        waitsFor(function() {
            return rejectSpy.wasCalled;
        });

        runs(function() {
            expect(spy).toHaveBeenCalledWith(dataSource, jasmine.any(Error));
            expect(rejectSpy).toHaveBeenCalledWith(jasmine.any(Error));
            expect(resolveSpy).not.toHaveBeenCalled();
        });
    });

    var czml = {
        'id' : 'test',
        'billboard' : {
            'show' : true
        },
        'label' : {
            'show' : false
        }
    };

    var czmlDelete = {
        'id' : 'test',
        'delete' : true
    };

    var czmlArray = [{
        'id' : 'test',
        'billboard' : {
            'show' : true
        }
    }, {
        'id' : 'test',
        'label' : {
            'show' : false
        }
    }];

    var czmlNoId = {
        'billboard' : {
            'show' : true
        }
    };

    it('processCzml throws if czml is undefined', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            CzmlDataSource.processCzml(undefined, dynamicObjectCollection);
        }).toThrow();
    });

    it('processCzml throws if dynamicObjectCollection is undefined', function() {
        expect(function() {
            CzmlDataSource.processCzml(czml, undefined);
        }).toThrow();
    });

    it('processCzml populates dynamicObjectCollection with expected data for an array of packets', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        CzmlDataSource.processCzml(czmlArray, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getObject('test');
        expect(testObject).toBeDefined();
        expect(testObject.billboard).toBeDefined();
        expect(testObject.billboard.show).toBeDefined();
        expect(testObject.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(testObject.label).toBeDefined();
        expect(testObject.label.show).toBeDefined();
        expect(testObject.label.show.getValue(new JulianDate())).toEqual(false);
    });

    it('processCzml deletes an existing object.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        CzmlDataSource.processCzml(czml, dynamicObjectCollection);

        var objects = dynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);

        CzmlDataSource.processCzml(czmlDelete, dynamicObjectCollection);
        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
        expect(dynamicObjectCollection.getObject('test')).toBeUndefined();
    });

    it('processCzml populates dynamicObjectCollection with expected data for a single packet', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        CzmlDataSource.processCzml(czml, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getObject('test');
        expect(testObject).toBeDefined();
        expect(testObject.billboard).toBeDefined();
        expect(testObject.billboard.show).toBeDefined();
        expect(testObject.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(testObject.label).toBeDefined();
        expect(testObject.label.show).toBeDefined();
        expect(testObject.label.show.getValue(new JulianDate())).toEqual(false);
    });

    it('processCzml uses user-supplied updater functions', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        CzmlDataSource.processCzml(czml, dynamicObjectCollection, undefined, [DynamicBillboard.processCzmlPacket]);

        var testObject = dynamicObjectCollection.getObject('test');
        expect(testObject).toBeDefined();
        expect(testObject.billboard).toBeDefined();
        expect(testObject.billboard.show).toBeDefined();
        expect(testObject.billboard.show.getValue(new JulianDate())).toEqual(true);
        expect(testObject.label).toBeUndefined();
    });

    it('processCzml raises dynamicObjectCollection event', function() {
        var eventTriggered = false;
        var dynamicObjectCollection = new DynamicObjectCollection();
        dynamicObjectCollection.objectPropertiesChanged.addEventListener(function(dynamicObjectCollectionParam, updatedObjects) {
            expect(dynamicObjectCollectionParam).toEqual(dynamicObjectCollection);
            expect(updatedObjects.length).toEqual(1);
            expect(updatedObjects[0]).toEqual(dynamicObjectCollection.getObject('test'));
            expect(eventTriggered).toEqual(false);
            eventTriggered = true;
        });
        CzmlDataSource.processCzml(czml, dynamicObjectCollection);
        waitsFor(function() {
            return eventTriggered;
        });
    });

    it('processCzml creates a new object for packets with no id.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        CzmlDataSource.processCzml(czmlNoId, dynamicObjectCollection);

        var objects = dynamicObjectCollection.getObjects();
        expect(objects.length).toEqual(1);
        var testObject = objects[0];
        expect(testObject).toBeDefined();
        expect(testObject.id).toBeDefined();
        expect(testObject.billboard).toBeDefined();
        expect(testObject.billboard.show).toBeDefined();
        expect(testObject.billboard.show.getValue(new JulianDate())).toEqual(true);
    });
});
