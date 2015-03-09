/*global defineSuite*/
defineSuite([
        'DataSources/CzmlDataSource',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/Color',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/ExtrapolationType',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/loadJson',
        'Core/Quaternion',
        'Core/Rectangle',
        'Core/ReferenceFrame',
        'Core/TimeInterval',
        'DataSources/EntityCollection',
        'DataSources/ReferenceProperty',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/VerticalOrigin',
        'Specs/waitsForPromise',
        'ThirdParty/when'
    ], function(
        CzmlDataSource,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Color,
        defined,
        Ellipsoid,
        Event,
        ExtrapolationType,
        Iso8601,
        JulianDate,
        loadJson,
        Quaternion,
        Rectangle,
        ReferenceFrame,
        TimeInterval,
        EntityCollection,
        ReferenceProperty,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin,
        waitsForPromise,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function makePacket(packet) {
        return [{
            id : 'document',
            version : '1.0'
        }, packet];
    }

    var staticCzml = {
        'id' : 'test',
        'billboard' : {
            'show' : true
        }
    };

    var czmlDelete = {
        'id' : 'test',
        'delete' : true
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
            version : '1.0',
            clock : {
                interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
                currentTime : '2012-03-15T10:00:00Z',
                multiplier : 60.0,
                range : 'LOOP_STOP',
                step : 'SYSTEM_CLOCK_MULTIPLIER'
            }
        };

    var clockCzml2 = {
            id : 'document',
            version : '1.0',
            clock : {
                interval : '2013-03-15T10:00:00Z/2013-03-16T10:00:00Z',
                currentTime : '2013-03-15T10:00:00Z',
                multiplier : 30.0,
                range : 'UNBOUNDED',
                step : 'TICK_DEPENDENT'
            }
        };

    var parsedClock = {
            interval : TimeInterval.fromIso8601({
                iso8601 : clockCzml.clock.interval
            }),
            currentTime : JulianDate.fromIso8601(clockCzml.clock.currentTime),
            multiplier : clockCzml.clock.multiplier,
            range : ClockRange[clockCzml.clock.range],
            step : ClockStep[clockCzml.clock.step]
        };

    var parsedClock2 = {
            interval : TimeInterval.fromIso8601({
                iso8601 : clockCzml2.clock.interval
            }),
            currentTime : JulianDate.fromIso8601(clockCzml2.clock.currentTime),
            multiplier : clockCzml2.clock.multiplier,
            range : ClockRange[clockCzml2.clock.range],
            step : ClockStep[clockCzml2.clock.step]
        };

    var nameCzml = {
        id : 'document',
        version : '1.0',
        name : 'czmlName'
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

    it('default constructor has expected values', function() {
        var dataSource = new CzmlDataSource();
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.entities.values.length).toEqual(0);
    });

    it('name returns CZML defined name', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(nameCzml);
        expect(dataSource.name).toEqual('czmlName');
    });

    it('name uses source name if CZML name is undefined', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(clockCzml, {
            sourceUri : 'Gallery/simple.czml?asd=true'
        });
        expect(dataSource.name).toEqual('simple.czml');
    });

    it('does not overwrite existing name if CZML name is undefined', function() {
        var dataSource = new CzmlDataSource('myName');
        dataSource.load(clockCzml, {
            sourceUri : 'Gallery/simple.czml'
        });
        expect(dataSource.name).toEqual('myName');
    });

    it('clock returns undefined for static CZML', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(staticCzml));
        expect(dataSource.clock).toBeUndefined();
    });

    it('clock returns CZML defined clock', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(clockCzml);

        var clock = dataSource.clock;
        expect(clock).toBeDefined();
        expect(clock.startTime).toEqual(parsedClock.interval.start);
        expect(clock.stopTime).toEqual(parsedClock.interval.stop);
        expect(clock.currentTime).toEqual(parsedClock.currentTime);
        expect(clock.clockRange).toEqual(parsedClock.range);
        expect(clock.clockStep).toEqual(parsedClock.step);
        expect(clock.multiplier).toEqual(parsedClock.multiplier);

        dataSource.process(clockCzml2);
        expect(clock).toBeDefined();
        expect(clock.startTime).toEqual(parsedClock2.interval.start);
        expect(clock.stopTime).toEqual(parsedClock2.interval.stop);
        expect(clock.currentTime).toEqual(parsedClock2.currentTime);
        expect(clock.clockRange).toEqual(parsedClock2.range);
        expect(clock.clockStep).toEqual(parsedClock2.step);
        expect(clock.multiplier).toEqual(parsedClock2.multiplier);
    });

    it('clock returns data interval if no clock defined', function() {
        var interval = TimeInterval.fromIso8601({
            iso8601 : dynamicCzml.availability
        });

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(dynamicCzml));
        var clock = dataSource.clock;
        expect(clock).toBeDefined();
        expect(clock.startTime).toEqual(interval.start);
        expect(clock.stopTime).toEqual(interval.stop);
        expect(clock.currentTime).toEqual(interval.start);
        expect(clock.clockRange).toEqual(ClockRange.LOOP_STOP);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        expect(clock.multiplier).toEqual(JulianDate.secondsDifference(interval.stop, interval.start) / 120.0);
    });

    it('processUrl loads expected data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.entities.values.length === 10;
        });
    });

    it('processUrl loads data on top of existing', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.entities.values.length === 10;
        });

        runs(function() {
            dataSource.processUrl(vehicleUrl);
        });

        waitsFor(function() {
            return dataSource.entities.values.length === 10;
        });
    });

    it('loadUrl replaces data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.entities.values.length === 10;
        });

        runs(function() {
            dataSource.loadUrl(vehicleUrl);
        });

        waitsFor(function() {
            return dataSource.entities.values.length === 1;
        });
    });

    it('process loads expected data', function() {
        waitsFor(function() {
            return defined(simple);
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, {
                sourceUri : simpleUrl
            });
            expect(dataSource.entities.values.length).toEqual(10);
        });
    });

    it('process loads data on top of existing', function() {
        waitsFor(function() {
            return defined(simple) && defined(vehicle);
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, {
                sourceUri : simpleUrl
            });
            expect(dataSource.entities.values.length === 10);

            dataSource.process(vehicle, {
                sourceUri : vehicleUrl
            });
            expect(dataSource.entities.values.length === 11);
        });
    });

    it('load replaces data', function() {
        waitsFor(function() {
            return defined(simple) && defined(vehicle);
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, {
                sourceUri : simpleUrl
            });
            expect(dataSource.entities.values.length).toEqual(10);

            dataSource.load(vehicle, {
                sourceUri : vehicleUrl
            });
            expect(dataSource.entities.values.length).toEqual(1);
        });
    });

    it('process throws with undefined CZML', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.process(undefined);
        }).toThrowDeveloperError();
    });

    it('load throws with undefined CZML', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrowDeveloperError();
    });

    it('raises changed event when loading CZML', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        dataSource.load(clockCzml);

        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('raises changed event when name changes in CZML', function() {
        var dataSource = new CzmlDataSource();

        var originalCzml = {
            id : 'document',
            version : '1.0',
            name : 'czmlName'
        };
        dataSource.load(originalCzml);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        var newCzml = {
            id : 'document',
            name : 'newCzmlName'
        };
        dataSource.process(newCzml);

        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('does not raise changed event when name does not change in CZML', function() {
        var dataSource = new CzmlDataSource();

        dataSource.load(nameCzml);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        dataSource.load(nameCzml);

        expect(spy).not.toHaveBeenCalled();
    });

    it('raises changed event when clock changes in CZML', function() {
        var dataSource = new CzmlDataSource();

        var originalCzml = {
            id : 'document',
            version : '1.0',
            clock : {
                interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
                currentTime : '2012-03-15T10:00:00Z',
                multiplier : 60.0,
                range : 'LOOP_STOP',
                step : 'SYSTEM_CLOCK_MULTIPLIER'
            }
        };
        dataSource.load(originalCzml);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        var newCzml = {
            id : 'document',
            version : '1.0',
            clock : {
                interval : '2013-03-15T10:00:00Z/2013-03-16T10:00:00Z',
                currentTime : '2012-03-15T10:00:00Z',
                multiplier : 60.0,
                range : 'LOOP_STOP',
                step : 'SYSTEM_CLOCK_MULTIPLIER'
            }
        };
        dataSource.load(newCzml);

        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('does not raise changed event when clock does not change in CZML', function() {
        var dataSource = new CzmlDataSource();

        dataSource.load(clockCzml);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        dataSource.load(clockCzml);

        expect(spy).not.toHaveBeenCalled();
    });

    it('raises error when an error occurs in load', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('errorEvent');
        dataSource.errorEvent.addEventListener(spy);

        var promise = dataSource.load('Data/Images/Blue.png'); //not JSON

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

    it('raises error when an error occurs in process', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('errorEvent');
        dataSource.errorEvent.addEventListener(spy);

        var promise = dataSource.process('Data/Images/Blue.png'); //not JSON

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

    it('CZML adds data for infinite billboard.', function() {
        var sourceUri = 'http://someImage.invalid/';
        var billboardPacket = {
            billboard : {
                image : 'image.png',
                scale : 1.0,
                horizontalOrigin : 'CENTER',
                verticalOrigin : 'CENTER',
                color : {
                    rgbaf : [1.0, 1.0, 1.0, 1.0]
                },
                eyeOffset : {
                    cartesian : [3.0, 4.0, 5.0]
                },
                pixelOffset : {
                    cartesian2 : [1.0, 2.0]
                },
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket), {
            sourceUri : sourceUri
        });
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image.getValue(Iso8601.MINIMUM_VALUE)).toEqual(sourceUri + 'image.png');
        expect(entity.billboard.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(billboardPacket.billboard.scale);
        expect(entity.billboard.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.CENTER);
        expect(entity.billboard.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(entity.billboard.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(entity.billboard.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(entity.billboard.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(1.0, 2.0));
        expect(entity.billboard.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('can handle image intervals both of type uri and image', function() {
        var source = 'http://some.url.invalid/';
        var packet = {
            billboard : {
                image : [{
                    interval : '2013-01-01T00:00:00Z/2013-01-01T01:00:00Z',
                    uri : 'image.png'
                }, {
                    interval : '2013-01-01T01:00:00Z/2013-01-01T02:00:00Z',
                    uri : 'image2.png'
                }]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet), {
            sourceUri : source
        });
        var entity = dataSource.entities.values[0];
        var imageProperty = entity.billboard.image;
        expect(imageProperty.getValue(JulianDate.fromIso8601('2013-01-01T00:00:00Z'))).toEqual(source + 'image.png');
        expect(imageProperty.getValue(JulianDate.fromIso8601('2013-01-01T01:00:00Z'))).toEqual(source + 'image2.png');
    });

    it('CZML adds data for constrained billboard.', function() {
        var billboardPacket = {
            billboard : {
                interval : '2000-01-01/2001-01-01',
                image : 'http://someImage.invalid/image',
                scale : 1.0,
                horizontalOrigin : 'CENTER',
                verticalOrigin : 'CENTER',
                color : {
                    rgbaf : [1.0, 1.0, 1.0, 1.0]
                },
                eyeOffset : {
                    cartesian : [3.0, 4.0, 5.0]
                },
                pixelOffset : {
                    cartesian2 : [1.0, 2.0]
                },
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : billboardPacket.billboard.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image.getValue(validTime)).toEqual(billboardPacket.billboard.image);
        expect(entity.billboard.scale.getValue(validTime)).toEqual(billboardPacket.billboard.scale);
        expect(entity.billboard.horizontalOrigin.getValue(validTime)).toEqual(HorizontalOrigin.CENTER);
        expect(entity.billboard.verticalOrigin.getValue(validTime)).toEqual(VerticalOrigin.CENTER);
        expect(entity.billboard.color.getValue(validTime)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(entity.billboard.eyeOffset.getValue(validTime)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(entity.billboard.pixelOffset.getValue(validTime)).toEqual(new Cartesian2(1.0, 2.0));

        expect(entity.billboard.show.getValue(validTime)).toEqual(true);

        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.scale.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.horizontalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.verticalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.color.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.eyeOffset.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.pixelOffset.getValue(invalidTime)).toBeUndefined();
        expect(entity.billboard.show.getValue(invalidTime)).toBeUndefined();
    });

    it('can handle sampled billboard pixelOffset.', function() {
        var epoch = JulianDate.now();

        var billboardPacket = {
            billboard : {
                pixelOffset : {
                    epoch : JulianDate.toIso8601(epoch),
                    cartesian2 : [0, 1, 2, 1, 3, 4]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        expect(entity.billboard.pixelOffset.getValue(date1)).toEqual(new Cartesian2(1.0, 2.0));
        expect(entity.billboard.pixelOffset.getValue(date2)).toEqual(new Cartesian2(3.0, 4.0));
    });

    it('CZML adds clock data.', function() {
        var clockPacket = {
            id : 'document',
            version : '1.0',
            clock : {
                interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
                currentTime : '2012-03-15T10:00:00Z',
                multiplier : 60.0,
                range : 'LOOP_STOP',
                step : 'SYSTEM_CLOCK_MULTIPLIER'
            }
        };

        var interval = TimeInterval.fromIso8601({
            iso8601 : clockPacket.clock.interval
        });
        var currentTime = JulianDate.fromIso8601(clockPacket.clock.currentTime);
        var multiplier = clockPacket.clock.multiplier;
        var range = ClockRange[clockPacket.clock.range];
        var step = ClockStep[clockPacket.clock.step];

        var dataSource = new CzmlDataSource();
        dataSource.load(clockPacket);
        var entity = dataSource.entities.values[0];

        expect(dataSource.clock).toBeDefined();
        expect(dataSource.clock.startTime).toEqual(interval.start);
        expect(dataSource.clock.stopTime).toEqual(interval.stop);
        expect(dataSource.clock.currentTime).toEqual(currentTime);
        expect(dataSource.clock.clockRange).toEqual(range);
        expect(dataSource.clock.clockStep).toEqual(step);
        expect(dataSource.clock.multiplier).toEqual(multiplier);
    });

    it('CZML constant cartographicsDegrees positions work.', function() {
        var czml = {
            position : {
                cartographicDegrees : [34, 117, 10000]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.position.getValue(JulianDate.now());
        expect(resultCartesian).toEqual(Cartesian3.fromDegrees(34, 117, 10000));
    });

    it('CZML sampled cartographicsDegrees positions work.', function() {
        var epoch = JulianDate.now();

        var czml = {
            position : {
                epoch : JulianDate.toIso8601(epoch),
                cartographicDegrees : [0, 34, 117, 10000, 1, 34, 117, 20000]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.position.getValue(epoch);
        expect(resultCartesian).toEqual(Cartesian3.fromDegrees(34, 117, 10000));

        resultCartesian = entity.position.getValue(JulianDate.addSeconds(epoch, 1, new JulianDate()));
        expect(resultCartesian).toEqual(Cartesian3.fromDegrees(34, 117, 20000));
    });

    it('CZML sampled positions work without epoch.', function() {
        var lastDate = JulianDate.now();
        var firstDate = new JulianDate(lastDate.dayNumber - 1, 0);

        var czml = {
            position : {
                cartographicDegrees : [JulianDate.toIso8601(firstDate), 34, 117, 10000, JulianDate.toIso8601(lastDate), 34, 117, 20000]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.position.getValue(firstDate);
        expect(resultCartesian).toEqual(Cartesian3.fromDegrees(34, 117, 10000));

        resultCartesian = entity.position.getValue(lastDate);
        expect(resultCartesian).toEqual(Cartesian3.fromDegrees(34, 117, 20000));
    });

    it('CZML constant cartographicRadians positions work.', function() {
        var czml = {
            position : {
                cartographicRadians : [1, 2, 10000]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.position.getValue(JulianDate.now());
        expect(resultCartesian).toEqual(Cartesian3.fromRadians(1, 2, 10000));
    });

    it('Can set reference frame', function() {
        var epoch = JulianDate.now();
        var dataSource = new CzmlDataSource();

        var czml = {
            position : {
                referenceFrame : 'INERTIAL',
                epoch : JulianDate.toIso8601(epoch),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.load(makePacket(czml));
        var entity = dataSource.entities.values[0];
        expect(entity.position.referenceFrame).toBe(ReferenceFrame.INERTIAL);

        czml = {
            position : {
                referenceFrame : 'FIXED',
                epoch : JulianDate.toIso8601(epoch),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.load(makePacket(czml));
        entity = dataSource.entities.values[0];
        expect(entity.position.referenceFrame).toBe(ReferenceFrame.FIXED);
    });

    it('Default reference frame on existing interval does not reset value to FIXED.', function() {
        var epoch = JulianDate.now();
        var dataSource = new CzmlDataSource();

        var czml = {
            position : {
                referenceFrame : 'INERTIAL',
                epoch : JulianDate.toIso8601(epoch),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.process(makePacket(czml));
        var entity = dataSource.entities.values[0];
        expect(entity.position.referenceFrame).toBe(ReferenceFrame.INERTIAL);

        var czml2 = {
            position : {
                epoch : JulianDate.toIso8601(epoch),
                cartesian : [1.0, 2.0, 3.0]
            }
        };
        dataSource.process(czml2);

        expect(entity.position.referenceFrame).toBe(ReferenceFrame.INERTIAL);
    });

    it('CZML sampled cartographicRadians positions work.', function() {
        var epoch = JulianDate.now();

        var czml = {
            position : {
                epoch : JulianDate.toIso8601(epoch),
                cartographicRadians : [0, 2, 0.3, 10000, 1, 0.2, 0.5, 20000]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.position.getValue(epoch);
        expect(resultCartesian).toEqual(Cartesian3.fromRadians(2, 0.3, 10000));

        resultCartesian = entity.position.getValue(JulianDate.addSeconds(epoch, 1, new JulianDate()));
        expect(resultCartesian).toEqual(Cartesian3.fromRadians(0.2, 0.5, 20000));
    });

    it('CZML sampled numbers work without epoch.', function() {
        var firstDate = Iso8601.MINIMUM_VALUE;
        var midDate = JulianDate.addDays(firstDate, 1, new JulianDate());
        var lastDate = JulianDate.addDays(firstDate, 2, new JulianDate());

        var ellipsePacket = {
            ellipse : {
                semiMajorAxis : {
                    number : [JulianDate.toIso8601(firstDate), 0, JulianDate.toIso8601(lastDate), 10]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(ellipsePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.ellipse).toBeDefined();
        expect(entity.ellipse.semiMajorAxis.getValue(firstDate)).toEqual(0);
        expect(entity.ellipse.semiMajorAxis.getValue(midDate)).toEqual(5);
        expect(entity.ellipse.semiMajorAxis.getValue(lastDate)).toEqual(10);
    });

    it('CZML adds data for infinite ellipse.', function() {
        var ellipsePacket = {
            ellipse : {
                semiMajorAxis : 10,
                semiMinorAxis : 20,
                rotation : 1.0,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(ellipsePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.ellipse).toBeDefined();
        expect(entity.ellipse.semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMajorAxis);
        expect(entity.ellipse.semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMinorAxis);
        expect(entity.ellipse.rotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.rotation);
        expect(entity.ellipse.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.ellipse.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.ellipse.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('CZML adds data for constrained ellipse.', function() {
        var ellipsePacketInterval = {
            ellipse : {
                interval : '2000-01-01/2001-01-01',
                semiMajorAxis : 10,
                semiMinorAxis : 20,
                rotation : 1.0
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(ellipsePacketInterval));
        var entity = dataSource.entities.values[0];

        var validTime = TimeInterval.fromIso8601({
            iso8601 : ellipsePacketInterval.ellipse.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        expect(entity.ellipse).toBeDefined();
        expect(entity.ellipse.semiMajorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMajorAxis);
        expect(entity.ellipse.semiMinorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMinorAxis);
        expect(entity.ellipse.rotation.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.rotation);

        expect(entity.ellipse.semiMajorAxis.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipse.semiMinorAxis.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipse.rotation.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite ellipsoid.', function() {
        var expectedRadii = new Cartesian3(1.0, 2.0, 3.0);

        var ellipsoidPacket = {
            ellipsoid : {
                radii : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                show : true,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(ellipsoidPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.ellipsoid).toBeDefined();
        expect(entity.ellipsoid.radii.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedRadii);
        expect(entity.ellipsoid.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsoidPacket.ellipsoid.show);
        expect(entity.ellipsoid.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.ellipsoid.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.ellipsoid.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.ellipsoid.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('CZML adds data for constrained ellipsoid.', function() {
        var expectedRadii = new Cartesian3(1.0, 2.0, 3.0);

        var ellipsoidPacketInterval = {
            ellipsoid : {
                interval : '2000-01-01/2001-01-01',
                radii : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                show : true,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                }
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : ellipsoidPacketInterval.ellipsoid.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(ellipsoidPacketInterval));
        var entity = dataSource.entities.values[0];

        expect(entity.ellipsoid).toBeDefined();
        expect(entity.ellipsoid.radii.getValue(validTime)).toEqual(expectedRadii);
        expect(entity.ellipsoid.show.getValue(validTime)).toEqual(ellipsoidPacketInterval.ellipsoid.show);
        expect(entity.ellipsoid.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));

        expect(entity.ellipsoid.radii.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipsoid.show.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipsoid.material.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite label.', function() {
        var labelPacket = {
            label : {
                text : 'TestFacility',
                font : '10pt "Open Sans"',
                style : 'FILL',
                fillColor : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 3.14,
                horizontalOrigin : 'LEFT',
                verticalOrigin : 'CENTER',
                eyeOffset : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                pixelOffset : {
                    cartesian2 : [4.0, 5.0]
                },
                scale : 1.0,
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(labelPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.label).toBeDefined();
        expect(entity.label.text.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.text);
        expect(entity.label.font.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.font);
        expect(entity.label.style.getValue(Iso8601.MINIMUM_VALUE)).toEqual(LabelStyle.FILL);
        expect(entity.label.fillColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.label.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.label.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.outlineWidth);
        expect(entity.label.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.LEFT);
        expect(entity.label.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(entity.label.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(entity.label.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(4.0, 5.0));
        expect(entity.label.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.scale);
        expect(entity.label.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.show);
    });

    it('CZML adds data for constrained label.', function() {
        var labelPacket = {
            label : {
                interval : '2000-01-01/2001-01-01',
                text : 'TestFacility',
                font : '10pt "Open Sans"',
                style : 'FILL',
                fillColor : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 2.78,
                horizontalOrigin : 'LEFT',
                verticalOrigin : 'CENTER',
                eyeOffset : {
                    cartesian : [1.0, 2.0, 3.0]
                },
                pixelOffset : {
                    cartesian2 : [4.0, 5.0]
                },
                scale : 1.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : labelPacket.label.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(labelPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.label).toBeDefined();
        expect(entity.label.text.getValue(validTime)).toEqual(labelPacket.label.text);
        expect(entity.label.font.getValue(validTime)).toEqual(labelPacket.label.font);
        expect(entity.label.style.getValue(validTime)).toEqual(LabelStyle.FILL);
        expect(entity.label.fillColor.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.label.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.label.outlineWidth.getValue(validTime)).toEqual(labelPacket.label.outlineWidth);
        expect(entity.label.horizontalOrigin.getValue(validTime)).toEqual(HorizontalOrigin.LEFT);
        expect(entity.label.verticalOrigin.getValue(validTime)).toEqual(VerticalOrigin.CENTER);
        expect(entity.label.eyeOffset.getValue(validTime)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(entity.label.pixelOffset.getValue(validTime)).toEqual(new Cartesian2(4.0, 5.0));
        expect(entity.label.scale.getValue(validTime)).toEqual(labelPacket.label.scale);
        expect(entity.label.show.getValue(validTime)).toEqual(labelPacket.label.show);
        expect(entity.label.text.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.font.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.style.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.fillColor.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.outlineWidth.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.horizontalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.verticalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.eyeOffset.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.pixelOffset.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.scale.getValue(invalidTime)).toBeUndefined();
        expect(entity.label.show.getValue(invalidTime)).toBeUndefined();
    });

    it('can handle sampled label pixelOffset.', function() {
        var epoch = JulianDate.now();

        var labelPacket = {
            label : {
                pixelOffset : {
                    epoch : JulianDate.toIso8601(epoch),
                    cartesian2 : [0, 1, 2, 1, 3, 4]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(labelPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.label).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        expect(entity.label.pixelOffset.getValue(date1)).toEqual(new Cartesian2(1.0, 2.0));
        expect(entity.label.pixelOffset.getValue(date2)).toEqual(new Cartesian2(3.0, 4.0));
    });

    it('CZML Position works.', function() {
        var packet = {
            position : {
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    });

    it('CZML Orientation works.', function() {
        var packet = {
            orientation : {
                unitQuaternion : [0.0, 0.0, 0.0, 1.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.orientation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Quaternion(0.0, 0.0, 0.0, 1.0));
    });

    it('CZML Orientation is normalized on load.', function() {
        var packet = {
            orientation : {
                unitQuaternion : [0.0, 0.0, 0.7071067, 0.7071067]
            }
        };

        var expected = new Quaternion(0.0, 0.0, 0.7071067, 0.7071067);
        Quaternion.normalize(expected, expected);

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.orientation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expected);
    });

    it('CZML Orientation is normalized on load.', function() {
        var time1 = '2000-01-01T00:00:00Z';
        var time2 = '2000-01-01T00:00:01Z';
        var packet = {
            orientation : {
                unitQuaternion : [time1, 0.0, 0.0, 0.7071067, 0.7071067, time2, 0.7071067, 0.7071067, 0.0, 0.0]
            }
        };

        var expected1 = new Quaternion(0.0, 0.0, 0.7071067, 0.7071067);
        Quaternion.normalize(expected1, expected1);

        var expected2 = new Quaternion(0.7071067, 0.7071067, 0.0, 0.0);
        Quaternion.normalize(expected2, expected2);

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.orientation.getValue(JulianDate.fromIso8601(time1))).toEqual(expected1);
        expect(entity.orientation.getValue(JulianDate.fromIso8601(time2))).toEqual(expected2);
    });

    it('positions work with cartesians.', function() {
        var expectedResult = [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(5.0, 6.0, 7.0)];

        var packet = {
            polyline : {
                positions : {
                    cartesian : [expectedResult[0].x, expectedResult[0].y, expectedResult[0].z, expectedResult[1].x, expectedResult[1].y, expectedResult[1].z]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.polyline.positions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedResult);
    });

    it('positions work with cartographicRadians.', function() {
        var input = [new Cartographic(1.0, 2.0, 4.0), new Cartographic(5.0, 6.0, 7.0)];
        var expectedResult = Ellipsoid.WGS84.cartographicArrayToCartesianArray(input);

        var packet = {
            polyline : {
                positions : {
                    cartographicRadians : [input[0].longitude, input[0].latitude, input[0].height, input[1].longitude, input[1].latitude, input[1].height]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.polyline.positions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedResult);
    });

    it('positions work with cartographicDegrees.', function() {
        var expectedResult = Cartesian3.fromDegreesArrayHeights([
            1.0, 2.0, 3.0,
            5.0, 6.0, 7.0
        ]);

        var packet = {
            polyline : {
                positions : {
                    cartographicDegrees : [1.0, 2.0, 3.0, 5.0, 6.0, 7.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.polyline.positions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedResult);
    });

    it('CZML ViewFrom works.', function() {
        var packet = {
            viewFrom : {
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.viewFrom.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    });

    it('CZML description works.', function() {
        var packet = {
            description : 'this is a description'
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.description.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet.description);
    });

    it('CZML Availability works with a single interval.', function() {
        var packet1 = {
            id : 'testObject',
            availability : '2000-01-01/2001-01-01'
        };

        var dataSource = new CzmlDataSource();
        dataSource.process(makePacket(packet1));
        var entity = dataSource.entities.values[0];

        var interval = TimeInterval.fromIso8601({
            iso8601 : packet1.availability
        });
        expect(entity.availability.length).toEqual(1);
        expect(entity.availability.get(0)).toEqual(interval);

        var packet2 = {
            id : 'testObject',
            availability : '2000-02-02/2001-02-02'
        };

        dataSource.process(packet2);
        interval = TimeInterval.fromIso8601({
            iso8601 : packet2.availability
        });
        expect(entity.availability.length).toEqual(1);
        expect(entity.availability.get(0)).toEqual(interval);
    });

    it('CZML Availability works with multiple intervals.', function() {
        var packet1 = {
            id : 'testObject',
            availability : ['2000-01-01/2001-01-01', '2002-01-01/2003-01-01']
        };

        var dataSource = new CzmlDataSource();
        dataSource.process(makePacket(packet1));
        var entity = dataSource.entities.values[0];

        var interval1 = TimeInterval.fromIso8601({
            iso8601 : packet1.availability[0]
        });
        var interval2 = TimeInterval.fromIso8601({
            iso8601 : packet1.availability[1]
        });
        expect(entity.availability.length).toEqual(2);
        expect(entity.availability.get(0)).toEqual(interval1);
        expect(entity.availability.get(1)).toEqual(interval2);

        var packet2 = {
            id : 'testObject',
            availability : ['2003-01-01/2004-01-01', '2005-01-01/2006-01-01']
        };
        dataSource.process(packet2);

        interval1 = TimeInterval.fromIso8601({
            iso8601 : packet2.availability[0]
        });
        interval2 = TimeInterval.fromIso8601({
            iso8601 : packet2.availability[1]
        });
        expect(entity.availability.length).toEqual(2);
        expect(entity.availability.get(0)).toEqual(interval1);
        expect(entity.availability.get(1)).toEqual(interval2);
    });

    it('CZML adds data for infinite path.', function() {
        var pathPacket = {
            path : {
                material : {
                    polylineOutline : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        },
                        outlineColor : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        },
                        outlineWidth : 1.0
                    }
                },
                width : 1.0,
                resolution : 23.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(pathPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.path).toBeDefined();
        expect(entity.path.material.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.path.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.width);
        expect(entity.path.resolution.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.resolution);
        expect(entity.path.material.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.path.material.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(1.0);
        expect(entity.path.leadTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.leadTime);
        expect(entity.path.trailTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.trailTime);
        expect(entity.path.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('CZML adds data for constrained path.', function() {
        var pathPacket = {
            path : {
                interval : '2000-01-01/2001-01-01',
                material : {
                    polylineOutline : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        },
                        outlineColor : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        },
                        outlineWidth : 1.0
                    }
                },
                width : 1.0,
                resolution : 23.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : pathPacket.path.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(pathPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.path).toBeDefined();
        expect(entity.path.width.getValue(validTime)).toEqual(pathPacket.path.width);
        expect(entity.path.resolution.getValue(validTime)).toEqual(pathPacket.path.resolution);
        expect(entity.path.leadTime.getValue(validTime)).toEqual(pathPacket.path.leadTime);
        expect(entity.path.trailTime.getValue(validTime)).toEqual(pathPacket.path.trailTime);
        expect(entity.path.show.getValue(validTime)).toEqual(true);
        expect(entity.path.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.path.material.getValue(validTime).outlineColor).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.path.material.getValue(validTime).outlineWidth).toEqual(1.0);

        expect(entity.path.material.getValue(invalidTime)).toBeUndefined();
        expect(entity.path.width.getValue(invalidTime)).toBeUndefined();
        expect(entity.path.leadTime.getValue(invalidTime)).toBeUndefined();
        expect(entity.path.trailTime.getValue(invalidTime)).toBeUndefined();
        expect(entity.path.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite point.', function() {
        var pointPacket = {
            point : {
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                pixelSize : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(pointPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.point).toBeDefined();
        expect(entity.point.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.point.pixelSize.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pointPacket.point.pixelSize);
        expect(entity.point.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.point.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pointPacket.point.outlineWidth);
        expect(entity.point.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('CZML adds data for constrained point.', function() {
        var pointPacket = {
            point : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                pixelSize : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : pointPacket.point.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(pointPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.point).toBeDefined();
        expect(entity.point.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.point.pixelSize.getValue(validTime)).toEqual(pointPacket.point.pixelSize);
        expect(entity.point.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.point.outlineWidth.getValue(validTime)).toEqual(pointPacket.point.outlineWidth);
        expect(entity.point.show.getValue(validTime)).toEqual(true);

        expect(entity.point.color.getValue(invalidTime)).toBeUndefined();
        expect(entity.point.pixelSize.getValue(invalidTime)).toBeUndefined();
        expect(entity.point.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(entity.point.outlineWidth.getValue(invalidTime)).toBeUndefined();
        expect(entity.point.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite polygon.', function() {
        var polygonPacket = {
            polygon : {
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                height : 1,
                extrudedHeight : 2,
                granularity : 3,
                stRotation : 4,
                show : true,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(polygonPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.polygon).toBeDefined();
        expect(entity.polygon.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.polygon.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.polygon.height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(1);
        expect(entity.polygon.extrudedHeight.getValue(Iso8601.MINIMUM_VALUE)).toEqual(2);
        expect(entity.polygon.granularity.getValue(Iso8601.MINIMUM_VALUE)).toEqual(3);
        expect(entity.polygon.stRotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(4);
        expect(entity.polygon.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.polygon.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.polygon.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('CZML adds data for constrained polygon.', function() {
        var polygonPacket = {
            polygon : {
                interval : '2000-01-01/2001-01-01',
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : polygonPacket.polygon.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(polygonPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.polygon).toBeDefined();
        expect(entity.polygon.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.polygon.show.getValue(validTime)).toEqual(true);

        expect(entity.polygon.material.getValue(invalidTime)).toBeUndefined();
        expect(entity.polygon.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite polyline.', function() {
        var polylinePacket = {
            polyline : {
                material : {
                    polylineOutline : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        },
                        outlineColor : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        },
                        outlineWidth : 1.0
                    }
                },
                width : 1.0,
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(polylinePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.polyline).toBeDefined();
        expect(entity.polyline.material.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.polyline.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(polylinePacket.polyline.width);
        expect(entity.polyline.material.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.polyline.material.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(1.0);
        expect(entity.polyline.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('CZML adds data for constrained polyline.', function() {
        var polylinePacket = {
            polyline : {
                interval : '2000-01-01/2001-01-01',
                material : {
                    polylineOutline : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        },
                        outlineColor : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        },
                        outlineWidth : 1.0
                    }
                },
                width : 1.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : polylinePacket.polyline.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(polylinePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.polyline).toBeDefined();
        expect(entity.polyline.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(entity.polyline.width.getValue(validTime)).toEqual(polylinePacket.polyline.width);
        expect(entity.polyline.material.getValue(validTime).outlineColor).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.polyline.material.getValue(validTime).outlineWidth).toEqual(1.0);
        expect(entity.polyline.show.getValue(validTime)).toEqual(true);

        expect(entity.polyline.material.getValue(invalidTime)).toBeUndefined();
        expect(entity.polyline.width.getValue(invalidTime)).toBeUndefined();
        expect(entity.polyline.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzml deletes an existing object.', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(staticCzml));
        var objects = dataSource.entities.values;
        expect(objects.length).toEqual(1);
        dataSource.load(makePacket(czmlDelete));
        expect(objects.length).toEqual(0);
    });

    it('Processes parent property.', function() {
        var parentChildCzml = [{
            id : 'document',
            version : '1.0'
        }, {
            'id' : 'parent'
        }, {
            'id' : 'child',
            'parent' : 'parent'
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(parentChildCzml);
        var objects = dataSource.entities;

        var parent = objects.getById('parent');
        expect(parent.parent).toBeUndefined();

        var child = objects.getById('child');
        expect(child.parent).toBe(parent);
    });

    it('Processes parent property out of order.', function() {
        var parentChildCzml = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'child',
            parent : 'parent'
        }, {
            id : 'child2',
            parent : 'parent'
        }, {
            id : 'grandparent'
        }, {
            id : 'grandparent2'
        }, {
            id : 'parent',
            parent : 'grandparent'
        }, {
            id : 'parent2',
            parent : 'grandparent'
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(parentChildCzml);
        var objects = dataSource.entities;

        var grandparent = objects.getById('grandparent');
        expect(grandparent.parent).toBeUndefined();

        var grandparent2 = objects.getById('grandparent');
        expect(grandparent2.parent).toBeUndefined();

        var parent = objects.getById('parent');
        expect(parent.parent).toBe(grandparent);

        var parent2 = objects.getById('parent2');
        expect(parent2.parent).toBe(grandparent);

        var child = objects.getById('child');
        expect(child.parent).toBe(parent);

        var child2 = objects.getById('child2');
        expect(child2.parent).toBe(parent);
    });

    it('Processes JulianDate packets.', function() {
        var date = JulianDate.fromIso8601('2000-01-01');

        var object = {};
        CzmlDataSource.processPacketData(JulianDate, object, 'simpleDate', JulianDate.toIso8601(date));

        expect(object.simpleDate).toBeDefined();
        expect(object.simpleDate.getValue()).toEqual(date);

        CzmlDataSource.processPacketData(JulianDate, object, 'objDate', {
            date : JulianDate.toIso8601(date)
        });

        expect(object.objDate).toBeDefined();
        expect(object.objDate.getValue()).toEqual(date);
    });

    it('Processes array packets.', function() {
        var arrayPacket = {
            array : [1, 2, 3, 4, 5]
        };

        var object = {};
        CzmlDataSource.processPacketData(Array, object, 'arrayData', arrayPacket);

        expect(object.arrayData).toBeDefined();
        expect(object.arrayData.getValue()).toEqual(arrayPacket.array);
    });

    it('CZML load suspends events.', function() {
        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            point : {
                show : true,
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                }
            }
        }, {
            point : {
                show : false,
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                }
            }
        }];

        var spy = jasmine.createSpy('changedEvent');

        var dataSource = new CzmlDataSource();
        dataSource.entities.collectionChanged.addEventListener(spy);
        dataSource.load(packets);

        expect(spy.callCount).toEqual(1);
    });

    it('CZML materials work with composite interval', function() {
        var before = JulianDate.fromIso8601('2012-03-15T09:23:59Z');
        var solid = JulianDate.fromIso8601('2012-03-15T10:00:00Z');
        var grid1 = JulianDate.fromIso8601('2012-03-15T11:00:00Z');
        var grid2 = JulianDate.fromIso8601('2012-03-15T12:00:00Z');
        var after = JulianDate.fromIso8601('2012-03-15T12:00:01Z');

        var packet = {
            polygon : {
                material : [{
                    interval : '2012-03-15T10:00:00Z/2012-03-15T11:00:00Z',
                    interpolationAlgorithm : 'LINEAR',
                    interpolationDegree : 1,
                    epoch : '2012-03-15T10:00:00Z',
                    solidColor : {
                        color : {
                            rgba : [240, 0, 0, 0]
                        }
                    }
                }, {
                    interval : '2012-03-15T11:00:00Z/2012-03-15T12:00:00Z',
                    interpolationAlgorithm : 'LINEAR',
                    interpolationDegree : 1,
                    epoch : '2012-03-15T11:00:00Z',
                    grid : {
                        color : {
                            rgba : [240, 255, 255, 255]
                        },
                        cellAlpha : 0,
                        lineCount : {
                            cartesian2 : [36, 9]
                        },
                        lineThickness : {
                            cartesian2 : [1, 1]
                        },
                        lineOffset : {
                            cartesian2 : [0.5, 0.5]
                        }
                    }
                }]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.polygon.material.getType(solid)).toBe('Color');
        expect(entity.polygon.material.getType(grid1)).toBe('Grid');
        expect(entity.polygon.material.getType(grid2)).toBe('Grid');
        expect(entity.polygon.material.getType(before)).toBeUndefined();
        expect(entity.polygon.material.getType(after)).toBeUndefined();
    });

    it('CZML adds data for rectangle.', function() {
        var rectanglePacket = {
            rectangle : {
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        }
                    }
                },
                coordinates : {
                    wsen : [0, 1, 2, 3]
                },
                height : 1,
                extrudedHeight : 2,
                granularity : 3,
                rotation : 4,
                stRotation : 5,
                closeBottom : true,
                closeTop : false,
                show : true,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var czmlRectangle = rectanglePacket.rectangle;

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(rectanglePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.rectangle).toBeDefined();
        expect(entity.rectangle.coordinates.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Rectangle(0, 1, 2, 3));
        expect(entity.rectangle.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.rectangle.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.show);
        expect(entity.rectangle.height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.height);
        expect(entity.rectangle.extrudedHeight.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.extrudedHeight);
        expect(entity.rectangle.granularity.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.granularity);
        expect(entity.rectangle.rotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.rotation);
        expect(entity.rectangle.stRotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.stRotation);
        expect(entity.rectangle.closeBottom.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.closeBottom);
        expect(entity.rectangle.closeTop.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.closeTop);
        expect(entity.rectangle.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.rectangle.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.rectangle.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('CZML adds data for rectangle in degrees.', function() {
        var rectanglePacket = {
            rectangle : {
                coordinates : {
                    wsenDegrees : [0, 1, 2, 3]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(rectanglePacket));
        var entity = dataSource.entities.values[0];
        expect(entity.rectangle.coordinates.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Rectangle.fromDegrees(0, 1, 2, 3));
    });

    it('CZML adds data for wall.', function() {
        var wallPacket = {
            wall : {
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        }
                    }
                },
                granularity : 3,
                minimumHeights : {
                    array : [1, 2, 3]
                },
                maximumHeights : {
                    array : [4, 5, 6]
                },
                show : true,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var czmlRectangle = wallPacket.wall;

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(wallPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.wall).toBeDefined();
        expect(entity.wall.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.wall.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.show);
        expect(entity.wall.granularity.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.granularity);
        expect(entity.wall.minimumHeights.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.minimumHeights.array);
        expect(entity.wall.maximumHeights.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlRectangle.maximumHeights.array);
        expect(entity.wall.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.wall.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.wall.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('Can use constant reference properties', function() {
        var time = JulianDate.now();
        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'targetId',
            point : {
                pixelSize : 1.0
            }
        }, {
            id : 'referenceId',
            point : {
                pixelSize : {
                    reference : 'targetId#point.pixelSize'
                }
            }
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(packets);

        var targetEntity = dataSource.entities.getById('targetId');
        var referenceObject = dataSource.entities.getById('referenceId');

        expect(referenceObject.point.pixelSize instanceof ReferenceProperty).toBe(true);
        expect(targetEntity.point.pixelSize.getValue(time)).toEqual(referenceObject.point.pixelSize.getValue(time));
    });

    it('Can use interval reference properties', function() {
        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'targetId',
            point : {
                pixelSize : 1.0
            }
        }, {
            id : 'targetId2',
            point : {
                pixelSize : 2.0
            }
        }, {
            id : 'referenceId',
            point : {
                pixelSize : [{
                    interval : '2012/2013',
                    reference : 'targetId#point.pixelSize'
                }, {
                    interval : '2013/2014',
                    reference : 'targetId2#point.pixelSize'
                }]
            }
        }];

        var time1 = JulianDate.fromIso8601('2012');
        var time2 = JulianDate.fromIso8601('2014');

        var dataSource = new CzmlDataSource();
        dataSource.load(packets);

        var targetEntity = dataSource.entities.getById('targetId');
        var targetEntity2 = dataSource.entities.getById('targetId2');
        var referenceObject = dataSource.entities.getById('referenceId');

        expect(targetEntity.point.pixelSize.getValue(time1)).toEqual(referenceObject.point.pixelSize.getValue(time1));
        expect(targetEntity2.point.pixelSize.getValue(time2)).toEqual(referenceObject.point.pixelSize.getValue(time2));
    });

    it('Can use constant reference properties for position', function() {
        var time = JulianDate.now();

        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'targetId',
            position : {
                cartesian : [1.0, 2.0, 3.0]
            }
        }, {
            id : 'referenceId',
            position : {
                reference : 'targetId#position'
            }
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(packets);

        var targetEntity = dataSource.entities.getById('targetId');
        var referenceObject = dataSource.entities.getById('referenceId');

        expect(referenceObject.position instanceof ReferenceProperty).toBe(true);
        expect(targetEntity.position.getValue(time)).toEqual(referenceObject.position.getValue(time));
    });

    it('Can use interval reference properties for positions', function() {
        var time = JulianDate.now();

        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'targetId',
            position : {
                cartesian : [1.0, 2.0, 3.0]
            }
        }, {
            id : 'targetId2',
            position : {
                cartesian : [4.0, 5.0, 6.0]
            }
        }, {
            id : 'referenceId',
            position : [{
                interval : '2012/2013',
                reference : 'targetId#position'
            }, {
                interval : '2013/2014',
                reference : 'targetId2#position'
            }]
        }];

        var time1 = JulianDate.fromIso8601('2012');
        var time2 = JulianDate.fromIso8601('2014');

        var dataSource = new CzmlDataSource();
        dataSource.load(packets);

        var targetEntity = dataSource.entities.getById('targetId');
        var targetEntity2 = dataSource.entities.getById('targetId2');
        var referenceObject = dataSource.entities.getById('referenceId');

        expect(targetEntity.position.getValue(time1)).toEqual(referenceObject.position.getValue(time1));
        expect(targetEntity2.position.getValue(time2)).toEqual(referenceObject.position.getValue(time2));
    });

    it('Can reference properties before they exist.', function() {
        var time = JulianDate.now();
        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'referenceId',
            point : {
                pixelSize : {
                    reference : 'targetId#point.pixelSize'
                }
            }
        }, {
            id : 'targetId',
            point : {
                pixelSize : 1.0
            }
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(packets);

        var targetEntity = dataSource.entities.getById('targetId');
        var referenceObject = dataSource.entities.getById('referenceId');

        expect(referenceObject.point.pixelSize instanceof ReferenceProperty).toBe(true);
        expect(targetEntity.point.pixelSize.getValue(time)).toEqual(referenceObject.point.pixelSize.getValue(time));
    });

    it('Can reference local properties.', function() {
        var time = JulianDate.now();
        var packet = {
            id : 'testObject',
            point : {
                pixelSize : 1.0,
                outlineWidth : {
                    reference : '#point.pixelSize'
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));

        var targetEntity = dataSource.entities.getById('testObject');
        expect(targetEntity.point.outlineWidth instanceof ReferenceProperty).toBe(true);
        expect(targetEntity.point.outlineWidth.getValue(time)).toEqual(targetEntity.point.pixelSize.getValue(time));
    });

    it('Polyline glow.', function() {
        var time = JulianDate.now();
        var packet = {
            id : 'polylineGlow',
            polyline : {
                material : {
                    polylineGlow : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        },
                        glowPower : 0.75
                    }
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));

        var entity = dataSource.entities.getById('polylineGlow');
        expect(entity.polyline.material.color.getValue()).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.polyline.material.glowPower.getValue()).toEqual(0.75);
    });

    it('Processes extrapolation options', function() {
        var packet = {
            id : 'point',
            position : {
                forwardExtrapolationType : "HOLD",
                forwardExtrapolationDuration : 2.0,
                backwardExtrapolationType : "NONE",
                backwardExtrapolationDuration : 1.0,
                cartesian : ['2012', 0, 0, 0]
            },
            point : {
                color : {
                    forwardExtrapolationType : "NONE",
                    forwardExtrapolationDuration : 1.0,
                    backwardExtrapolationType : "HOLD",
                    backwardExtrapolationDuration : 2.0,
                    rgbaf : ['2012', 0.1, 0.2, 0.3, 0.4]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));

        var entity = dataSource.entities.getById('point');
        var color = entity.point.color;
        expect(color.forwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(color.forwardExtrapolationDuration).toEqual(1.0);
        expect(color.backwardExtrapolationType).toEqual(ExtrapolationType.HOLD);
        expect(color.backwardExtrapolationDuration).toEqual(2.0);

        var position = entity.position;
        expect(position.forwardExtrapolationType).toEqual(ExtrapolationType.HOLD);
        expect(position.forwardExtrapolationDuration).toEqual(2.0);
        expect(position.backwardExtrapolationType).toEqual(ExtrapolationType.NONE);
        expect(position.backwardExtrapolationDuration).toEqual(1.0);
    });

    it('rejects if first document packet lacks version information', function() {
        waitsForPromise.toReject(CzmlDataSource.load({
            id : 'document'
        }));
    });

    it('rejects if first packet is not document', function() {
        waitsForPromise.toReject(CzmlDataSource.load({
            id : 'someId'
        }));
    });

    it('rejects if document packet contains bad version', function() {
        waitsForPromise.toReject(CzmlDataSource.load({
            id : 'document',
            version : 12
        }));
    });
});