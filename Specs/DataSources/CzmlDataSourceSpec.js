/*global defineSuite*/
defineSuite([
        'DataSources/CzmlDataSource',
        'Core/BoundingRectangle',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/Color',
        'Core/CornerType',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/ExtrapolationType',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/loadJson',
        'Core/Math',
        'Core/NearFarScalar',
        'Core/Quaternion',
        'Core/Rectangle',
        'Core/ReferenceFrame',
        'Core/RuntimeError',
        'Core/Spherical',
        'Core/TimeInterval',
        'Core/TranslationRotationScale',
        'DataSources/EntityCollection',
        'DataSources/ReferenceProperty',
        'DataSources/StripeOrientation',
        'Scene/HeightReference',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/VerticalOrigin',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        CzmlDataSource,
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Color,
        CornerType,
        defined,
        Ellipsoid,
        Event,
        ExtrapolationType,
        Iso8601,
        JulianDate,
        loadJson,
        CesiumMath,
        NearFarScalar,
        Quaternion,
        Rectangle,
        ReferenceFrame,
        RuntimeError,
        Spherical,
        TimeInterval,
        TranslationRotationScale,
        EntityCollection,
        ReferenceProperty,
        StripeOrientation,
        HeightReference,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin,
        pollToPromise,
        when) {
    'use strict';

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
        return when.join(
            loadJson(simpleUrl).then(function(result) {
                simple = result;
            }),
            loadJson(vehicleUrl).then(function(result) {
                vehicle = result;
            }));
    });

    it('default constructor has expected values', function() {
        var dataSource = new CzmlDataSource();
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.entities.values.length).toEqual(0);
        expect(dataSource.show).toBe(true);
    });

    it('show sets underlying entity collection show.', function() {
        var dataSource = new CzmlDataSource();

        dataSource.show = false;
        expect(dataSource.show).toBe(false);
        expect(dataSource.show).toEqual(dataSource.entities.show);

        dataSource.show = true;
        expect(dataSource.show).toBe(true);
        expect(dataSource.show).toEqual(dataSource.entities.show);
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

    it('process loads expected data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.process(simple, simpleUrl);
        expect(dataSource.entities.values.length).toEqual(10);
    });

    it('process loads data on top of existing', function() {
        var dataSource = new CzmlDataSource();
        dataSource.process(simple, simpleUrl);
        expect(dataSource.entities.values.length === 10);

        dataSource.process(vehicle, vehicleUrl);
        expect(dataSource.entities.values.length === 11);
    });

    it('load replaces data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.process(simple, simpleUrl);
        expect(dataSource.entities.values.length).toEqual(10);

        dataSource.load(vehicle, vehicleUrl);
        expect(dataSource.entities.values.length).toEqual(1);
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

        // Blue.png is not JSON
        return dataSource.load('Data/Images/Blue.png').then(function() {
            fail('should not be called');
        }).otherwise(function() {
            expect(spy).toHaveBeenCalledWith(dataSource, jasmine.any(Error));
        });
    });

    it('raises error when an error occurs in process', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('errorEvent');
        dataSource.errorEvent.addEventListener(spy);

        // Blue.png is not JSON
        dataSource.process('Data/Images/Blue.png').then(function() {
            fail('should not be called');
        }).otherwise(function() {
            expect(spy).toHaveBeenCalledWith(dataSource, jasmine.any(Error));
        });
    });

    it('CZML adds data for infinite billboard.', function() {
        var sourceUri = 'http://someImage.invalid/';
        var billboardPacket = {
            billboard : {
                image : 'image.png',
                scale : 1.0,
                rotation : 1.3,
                heightReference: 'CLAMP_TO_GROUND',
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
                alignedAxis : {
                    unitCartesian : [1.0, 0.0, 0.0]
                },
                show : true,
                sizeInMeters : false,
                width : 10,
                height : 11,
                scaleByDistance : {
                    nearFarScalar : [1.0, 2.0, 10000.0, 3.0]
                },
                translucencyByDistance : {
                    nearFarScalar : [1.0, 1.0, 10000.0, 0.0]
                },
                pixelOffsetScaleByDistance : {
                    nearFarScalar : [1.0, 20.0, 10000.0, 30.0]
                },
                imageSubRegion : {
                    boundingRectangle : [20, 30, 10, 11]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket), {
            sourceUri : sourceUri
        });
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image.getValue(Iso8601.MINIMUM_VALUE)).toEqual(sourceUri + 'image.png');
        expect(entity.billboard.rotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(billboardPacket.billboard.rotation);
        expect(entity.billboard.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(billboardPacket.billboard.scale);
        expect(entity.billboard.heightReference.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HeightReference.CLAMP_TO_GROUND);
        expect(entity.billboard.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.CENTER);
        expect(entity.billboard.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(entity.billboard.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(entity.billboard.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(entity.billboard.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(1.0, 2.0));
        expect(entity.billboard.alignedAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 0.0, 0.0));
        expect(entity.billboard.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.billboard.sizeInMeters.getValue(Iso8601.MINIMUM_VALUE)).toEqual(false);
        expect(entity.billboard.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(10);
        expect(entity.billboard.height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(11);
        expect(entity.billboard.scaleByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 2.0, 10000.0, 3.0));
        expect(entity.billboard.translucencyByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 1.0, 10000.0, 0.0));
        expect(entity.billboard.pixelOffsetScaleByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 20.0, 10000.0, 30.0));
        expect(entity.billboard.imageSubRegion.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new BoundingRectangle(20, 30, 10, 11));
    });

    it('can handle aligned axis expressed as a cartesian', function() {
        // historically, CZML allowed alignedAxis to be defined as a cartesian, even though that implied it could be
        // non-unit magnitude (it can't).
        // but, we need to ensure that continues to work.
        var billboardPacket = {
            billboard : {
                alignedAxis : {
                    cartesian : [1.0, 0.0, 0.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.alignedAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 0.0, 0.0));
    });

    it('can handle aligned axis expressed as a velocity reference', function() {
        var packet = {
            "position" : {
                "epoch" : "2016-06-17T12:00:00Z",
                "cartesian" : [0, 1, 2, 3,
                               60, 61, 122, 183]
            },
            "billboard" : {
                "alignedAxis" : {
                    "velocityReference" : "#position"
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        var property = entity.billboard.alignedAxis;

        var expectedVelocity = new Cartesian3(1.0, 2.0, 3.0);
        var expectedVelocityDirection = Cartesian3.normalize(expectedVelocity, new Cartesian3());

        expect(property.getValue(JulianDate.fromIso8601('2016-06-17T12:00:00Z'))).toEqualEpsilon(expectedVelocityDirection, CesiumMath.EPSILON15);
        expect(property.getValue(JulianDate.fromIso8601('2016-06-17T12:00:30Z'))).toEqualEpsilon(expectedVelocityDirection, CesiumMath.EPSILON15);
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
                    cartesian2 : [0.0, 1.0, 2.0,
                                  1.0, 3.0, 4.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 0.5, new JulianDate());
        var date3 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        expect(entity.billboard.pixelOffset.getValue(date1)).toEqual(new Cartesian2(1.0, 2.0));
        expect(entity.billboard.pixelOffset.getValue(date2)).toEqual(new Cartesian2(2.0, 3.0));
        expect(entity.billboard.pixelOffset.getValue(date3)).toEqual(new Cartesian2(3.0, 4.0));
    });

    it('can handle interval billboard scaleByDistance.', function() {
        var billboardPacket = {
            billboard : {
                scaleByDistance : [{
                    interval : '2013-01-01T00:00:00Z/2013-01-01T01:00:00Z',
                    nearFarScalar : [1.0, 2.0, 10000.0, 3.0]
                }, {
                    interval : '2013-01-01T01:00:00Z/2013-01-01T02:00:00Z',
                    nearFarScalar : [2.0, 3.0, 20000.0, 4.0]
                }]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.scaleByDistance.getValue(JulianDate.fromIso8601('2013-01-01T00:00:00Z'))).toEqual(new NearFarScalar(1.0, 2.0, 10000.0, 3.0));
        expect(entity.billboard.scaleByDistance.getValue(JulianDate.fromIso8601('2013-01-01T01:00:00Z'))).toEqual(new NearFarScalar(2.0, 3.0, 20000.0, 4.0));
    });

    it('can handle sampled billboard scaleByDistance.', function() {
        var epoch = JulianDate.now();

        var billboardPacket = {
            billboard : {
                scaleByDistance : {
                    epoch : JulianDate.toIso8601(epoch),
                    nearFarScalar : [
                        0, 1.0, 2.0, 10000.0, 3.0,
                        2, 2.0, 3.0, 20000.0, 4.0
                    ]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        var date3 = JulianDate.addSeconds(epoch, 2.0, new JulianDate());
        expect(entity.billboard.scaleByDistance.getValue(date1)).toEqual(new NearFarScalar(1.0, 2.0, 10000.0, 3.0));
        expect(entity.billboard.scaleByDistance.getValue(date2)).toEqual(new NearFarScalar(1.5, 2.5, 15000.0, 3.5));
        expect(entity.billboard.scaleByDistance.getValue(date3)).toEqual(new NearFarScalar(2.0, 3.0, 20000.0, 4.0));
    });

    it('can handle sampled billboard color rgba.', function() {
        var epoch = JulianDate.now();

        var billboardPacket = {
            billboard : {
                color : {
                    epoch : JulianDate.toIso8601(epoch),
                    rgba : [0, 200, 202, 204, 206,
                            2, 0, 0, 0, 0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(billboardPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.billboard).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        var date3 = JulianDate.addSeconds(epoch, 2.0, new JulianDate());
        expect(entity.billboard.color.getValue(date1)).toEqual(Color.fromBytes(200, 202, 204, 206));
        expect(entity.billboard.color.getValue(date2)).toEqual(Color.fromBytes(100, 101, 102, 103));
        expect(entity.billboard.color.getValue(date3)).toEqual(Color.fromBytes(0, 0, 0, 0));
    });

    it('can handle clock data.', function() {
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

        expect(dataSource.clock).toBeDefined();
        expect(dataSource.clock.startTime).toEqual(interval.start);
        expect(dataSource.clock.stopTime).toEqual(interval.stop);
        expect(dataSource.clock.currentTime).toEqual(currentTime);
        expect(dataSource.clock.clockRange).toEqual(range);
        expect(dataSource.clock.clockStep).toEqual(step);
        expect(dataSource.clock.multiplier).toEqual(multiplier);
    });

    it('can handle position specified as constant cartographicsDegrees.', function() {
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

    it('can handle position specified as sampled cartographicsDegrees.', function() {
        var epoch = JulianDate.now();

        var czml = {
            position : {
                epoch : JulianDate.toIso8601(epoch),
                cartographicDegrees : [0, 34, 117, 10000,
                                       1, 34, 117, 20000]
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

    it('can handle position specified as sampled cartographicDegrees without epoch.', function() {
        var lastDate = JulianDate.now();
        var firstDate = new JulianDate(lastDate.dayNumber - 1, 0);

        var czml = {
            position : {
                cartographicDegrees : [JulianDate.toIso8601(firstDate), 34, 117, 10000,
                                       JulianDate.toIso8601(lastDate), 34, 117, 20000]
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

    it('can handle position specified as constant cartographicRadians.', function() {
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

    it('can handle position specified as sampled cartographicRadians.', function() {
        var epoch = JulianDate.now();

        var czml = {
            position : {
                epoch : JulianDate.toIso8601(epoch),
                cartographicRadians : [0, 2, 0.3, 10000,
                                       1, 0.2, 0.5, 20000]
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

    it('uses FIXED as default if not specified in CZML', function() {
        var epoch = JulianDate.now();
        var dataSource = new CzmlDataSource();

        var czml = {
            position : {
                epoch : JulianDate.toIso8601(epoch),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.load(makePacket(czml));
        var entity = dataSource.entities.values[0];
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

    it('can handle a number specified as sampled values without epoch.', function() {
        var firstDate = Iso8601.MINIMUM_VALUE;
        var midDate = JulianDate.addDays(firstDate, 1, new JulianDate());
        var lastDate = JulianDate.addDays(firstDate, 2, new JulianDate());

        var ellipsePacket = {
            ellipse : {
                semiMajorAxis : {
                    number : [JulianDate.toIso8601(firstDate), 0,
                              JulianDate.toIso8601(lastDate), 10]
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

    it('can handle a direction specified as constant unitSpherical', function() {
        var czml = {
            billboard : {
                alignedAxis : {
                    unitSpherical : [1.0, 2.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.billboard.alignedAxis.getValue(JulianDate.now());
        expect(resultCartesian).toEqual(Cartesian3.fromSpherical(new Spherical(1.0, 2.0)));
    });

    it('can handle a direction specified as sampled unitSpherical.', function() {
        var epoch = JulianDate.now();

        var czml = {
            billboard : {
                alignedAxis : {
                    epoch : JulianDate.toIso8601(epoch),
                    unitSpherical : [0, 1.0, 2.0,
                                     1, -1.0, -2.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.billboard.alignedAxis.getValue(epoch);
        expect(resultCartesian).toEqual(Cartesian3.fromSpherical(new Spherical(1.0, 2.0)));

        resultCartesian = entity.billboard.alignedAxis.getValue(JulianDate.addSeconds(epoch, 1, new JulianDate()));
        expect(resultCartesian).toEqual(Cartesian3.fromSpherical(new Spherical(-1.0, -2.0)));
    });

    it('can handle a direction specified as constant spherical', function() {
        var czml = {
            billboard : {
                alignedAxis : {
                    spherical : [1.0, 2.0, 30.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.billboard.alignedAxis.getValue(JulianDate.now());
        expect(resultCartesian).toEqual(Cartesian3.fromSpherical(new Spherical(1.0, 2.0, 30.0)));
    });

    it('can handle a direction specified as sampled spherical.', function() {
        var epoch = JulianDate.now();

        var czml = {
            billboard : {
                alignedAxis : {
                    epoch : JulianDate.toIso8601(epoch),
                    spherical : [0, 1.0, 2.0, 30.0,
                                 1, -1.0, -2.0, 40.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(czml));

        var entity = dataSource.entities.values[0];
        var resultCartesian = entity.billboard.alignedAxis.getValue(epoch);
        expect(resultCartesian).toEqual(Cartesian3.fromSpherical(new Spherical(1.0, 2.0, 30.0)));

        resultCartesian = entity.billboard.alignedAxis.getValue(JulianDate.addSeconds(epoch, 1, new JulianDate()));
        expect(resultCartesian).toEqual(Cartesian3.fromSpherical(new Spherical(-1.0, -2.0, 40.0)));
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
                outlineWidth : 6,
                stackPartitions : 25,
                slicePartitions : 26,
                subdivisions : 27
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
        expect(entity.ellipsoid.stackPartitions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(25);
        expect(entity.ellipsoid.slicePartitions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(26);
        expect(entity.ellipsoid.subdivisions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(27);
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
                show : true,
                translucencyByDistance : {
                    nearFarScalar : [1.0, 1.0, 10000.0, 0.0]
                },
                pixelOffsetScaleByDistance : {
                    nearFarScalar : [1.0, 20.0, 10000.0, 30.0]
                }
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
        expect(entity.label.translucencyByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 1.0, 10000.0, 0.0));
        expect(entity.label.pixelOffsetScaleByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 20.0, 10000.0, 30.0));
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
                show : true,
                scaleByDistance : {
                    nearFarScalar : [1.0, 2.0, 10000.0, 3.0]
                },
                translucencyByDistance : {
                    nearFarScalar : [1.0, 1.0, 10000.0, 0.0]
                },
                heightReference : 'CLAMP_TO_GROUND'
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
        expect(entity.point.scaleByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 2.0, 10000.0, 3.0));
        expect(entity.point.translucencyByDistance.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new NearFarScalar(1.0, 1.0, 10000.0, 0.0));
        expect(entity.point.heightReference.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HeightReference.CLAMP_TO_GROUND);
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
                outlineWidth : 6,
                closeTop : false,
                closeBottom : false
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
        expect(entity.polygon.closeTop.getValue(Iso8601.MINIMUM_VALUE)).toEqual(false);
        expect(entity.polygon.closeBottom.getValue(Iso8601.MINIMUM_VALUE)).toEqual(false);
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

    it('CZML adds data for infinite model.', function() {
        var modelPacket = {
            model : {
                show : true,
                scale : 3.0,
                minimumPixelSize : 5.0,
                maximumScale : 4.0,
                gltf : './Data/Models/Box/CesiumBoxTest.gltf',
                incrementallyLoadTextures : true,
                castShadows : true,
                receiveShadows : true,
                heightReference: 'CLAMP_TO_GROUND',
                nodeTransformations : {
                    Mesh : {
                        scale : {
                            cartesian : [1.0, 2.0, 3.0]
                        },
                        translation : {
                            cartesian : [4.0, 5.0, 6.0]
                        },
                        rotation : {
                            unitQuaternion : [0.0, 0.707, 0.0, 0.707]
                        }
                    }
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(modelPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.model).toBeDefined();
        expect(entity.model.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.model.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(3.0);
        expect(entity.model.minimumPixelSize.getValue(Iso8601.MINIMUM_VALUE)).toEqual(5.0);
        expect(entity.model.maximumScale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(4.0);
        expect(entity.model.uri.getValue(Iso8601.MINIMUM_VALUE)).toEqual('./Data/Models/Box/CesiumBoxTest.gltf');
        expect(entity.model.incrementallyLoadTextures.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.model.castShadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.model.receiveShadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.model.heightReference.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HeightReference.CLAMP_TO_GROUND);

        var nodeTransform = entity.model.nodeTransformations.getValue(Iso8601.MINIMUM_VALUE).Mesh;
        expect(nodeTransform).toBeDefined();
        expect(nodeTransform.scale).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(nodeTransform.translation).toEqual(new Cartesian3(4.0, 5.0, 6.0));

        var expectedRotation = new Quaternion(0.0, 0.707, 0.0, 0.707);
        Quaternion.normalize(expectedRotation, expectedRotation);
        expect(nodeTransform.rotation).toEqual(expectedRotation);

        expect(entity.model.nodeTransformations.Mesh.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(entity.model.nodeTransformations.Mesh.translation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(entity.model.nodeTransformations.Mesh.rotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedRotation);
    });

    it('CZML adds data for constrained model.', function() {
        var modelPacket = {
            model : {
                interval : '2000-01-01/2001-01-01',
                show : true,
                scale : 3.0,
                minimumPixelSize : 5.0,
                gltf : './Data/Models/Box/CesiumBoxTest.gltf',
                incrementallyLoadTextures : true,
                castShadows : true,
                receiveShadows : true,
                nodeTransformations : {
                    Mesh : {
                        scale : {
                            cartesian : [1.0, 2.0, 3.0]
                        },
                        translation : {
                            cartesian : [4.0, 5.0, 6.0]
                        },
                        rotation : {
                            unitQuaternion : [0.0, 0.707, 0.0, 0.707]
                        }
                    }
                }
            }
        };

        var validTime = TimeInterval.fromIso8601({
            iso8601 : modelPacket.model.interval
        }).start;
        var invalidTime = JulianDate.addSeconds(validTime, -1, new JulianDate());

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(modelPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.model).toBeDefined();
        expect(entity.model.show.getValue(validTime)).toEqual(true);
        expect(entity.model.scale.getValue(validTime)).toEqual(3.0);
        expect(entity.model.minimumPixelSize.getValue(validTime)).toEqual(5.0);
        expect(entity.model.uri.getValue(validTime)).toEqual('./Data/Models/Box/CesiumBoxTest.gltf');
        expect(entity.model.incrementallyLoadTextures.getValue(validTime)).toEqual(true);
        expect(entity.model.castShadows.getValue(validTime)).toEqual(true);
        expect(entity.model.receiveShadows.getValue(validTime)).toEqual(true);

        var nodeTransform = entity.model.nodeTransformations.getValue(validTime).Mesh;
        expect(nodeTransform).toBeDefined();
        expect(nodeTransform.scale).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(nodeTransform.translation).toEqual(new Cartesian3(4.0, 5.0, 6.0));

        var expectedRotation = new Quaternion(0.0, 0.707, 0.0, 0.707);
        Quaternion.normalize(expectedRotation, expectedRotation);
        expect(nodeTransform.rotation).toEqual(expectedRotation);

        expect(entity.model.nodeTransformations.Mesh.scale.getValue(validTime)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(entity.model.nodeTransformations.Mesh.translation.getValue(validTime)).toEqual(new Cartesian3(4.0, 5.0, 6.0));
        expect(entity.model.nodeTransformations.Mesh.rotation.getValue(validTime)).toEqual(expectedRotation);

        expect(entity.model.show.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.scale.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.minimumPixelSize.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.uri.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.incrementallyLoadTextures.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.castShadows.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.receiveShadows.getValue(invalidTime)).toBeUndefined();

        expect(entity.model.nodeTransformations.Mesh.getValue(invalidTime)).toEqual(new TranslationRotationScale());
        expect(entity.model.nodeTransformations.Mesh.scale.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.nodeTransformations.Mesh.translation.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.nodeTransformations.Mesh.rotation.getValue(invalidTime)).toBeUndefined();
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

        expect(spy.calls.count()).toEqual(1);
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

    it('can handle constant rectangle coordinates in degrees.', function() {
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

    it('can handle sampled rectangle coordinates.', function() {
        var epoch = JulianDate.now();

        var rectanglePacket = {
            rectangle : {
                coordinates : {
                    epoch : JulianDate.toIso8601(epoch),
                    wsen : [0.0, 1.0, 2.0, 3.0, 4.0,
                            1.0, 3.0, 4.0, 5.0, 6.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(rectanglePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.rectangle).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 0.5, new JulianDate());
        var date3 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        expect(entity.rectangle.coordinates.getValue(date1)).toEqual(new Rectangle(1.0, 2.0, 3.0, 4.0));
        expect(entity.rectangle.coordinates.getValue(date2)).toEqual(new Rectangle(2.0, 3.0, 4.0, 5.0));
        expect(entity.rectangle.coordinates.getValue(date3)).toEqual(new Rectangle(3.0, 4.0, 5.0, 6.0));
    });

    it('can handle sampled rectangle coordinates in degrees.', function() {
        var epoch = JulianDate.now();

        var rectanglePacket = {
            rectangle : {
                coordinates : {
                    epoch : JulianDate.toIso8601(epoch),
                    wsenDegrees : [0.0, 1.0, 2.0, 3.0, 4.0,
                                   1.0, 3.0, 4.0, 5.0, 6.0]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(rectanglePacket));
        var entity = dataSource.entities.values[0];

        expect(entity.rectangle).toBeDefined();
        var date1 = epoch;
        var date2 = JulianDate.addSeconds(epoch, 0.5, new JulianDate());
        var date3 = JulianDate.addSeconds(epoch, 1.0, new JulianDate());
        expect(entity.rectangle.coordinates.getValue(date1)).toEqual(Rectangle.fromDegrees(1.0, 2.0, 3.0, 4.0));
        expect(entity.rectangle.coordinates.getValue(date2)).toEqualEpsilon(Rectangle.fromDegrees(2.0, 3.0, 4.0, 5.0), CesiumMath.EPSILON15);
        expect(entity.rectangle.coordinates.getValue(date3)).toEqual(Rectangle.fromDegrees(3.0, 4.0, 5.0, 6.0));
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

    it('CZML adds data for wall with minimumHeights as references.', function() {
        var packets = [{
            id : 'document',
            version : '1.0'
        }, {
            id : 'obj1',
            billboard : {
                scale : 1.0
            }
        }, {
            id : 'obj2',
            billboard : {
                scale : 4.0
            }
        }, {
            id : 'wall',
            wall : {
                minimumHeights : {
                    references : ['obj1#billboard.scale', 'obj2#billboard.scale']
                },
                maximumHeights : {
                    references : ['obj2#billboard.scale', 'obj1#billboard.scale']
                }
            }
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(packets);
        var entity = dataSource.entities.getById('wall');

        expect(entity.wall).toBeDefined();
        expect(entity.wall.minimumHeights.getValue(Iso8601.MINIMUM_VALUE)).toEqual([packets[1].billboard.scale, packets[2].billboard.scale]);
        expect(entity.wall.maximumHeights.getValue(Iso8601.MINIMUM_VALUE)).toEqual([packets[2].billboard.scale, packets[1].billboard.scale]);
    });

    it('CZML adds data for box.', function() {
        var boxPacket = {
            box : {
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        }
                    }
                },
                dimensions : {
                    cartesian : [1, 2, 3]
                },
                show : true,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(boxPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.box).toBeDefined();
        expect(entity.box.dimensions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1, 2, 3));
        expect(entity.box.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.box.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.box.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.box.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.box.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('CZML adds data for cylinder.', function() {
        var cylinderPacket = {
            cylinder : {
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        }
                    }
                },
                length : 5,
                topRadius: 6,
                bottomRadius: 7,
                show : true,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6,
                numberOfVerticalLines : 15,
                slices : 100
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(cylinderPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.cylinder).toBeDefined();
        expect(entity.cylinder.length.getValue(Iso8601.MINIMUM_VALUE)).toEqual(5);
        expect(entity.cylinder.topRadius.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
        expect(entity.cylinder.bottomRadius.getValue(Iso8601.MINIMUM_VALUE)).toEqual(7);
        expect(entity.cylinder.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.cylinder.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.cylinder.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.cylinder.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.cylinder.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
        expect(entity.cylinder.numberOfVerticalLines.getValue(Iso8601.MINIMUM_VALUE)).toEqual(15);
        expect(entity.cylinder.slices.getValue(Iso8601.MINIMUM_VALUE)).toEqual(100);
    });

    it('CZML adds data for corridor.', function() {
        var expectedResult = [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(5.0, 6.0, 7.0)];

        var corridorPacket = {
            corridor : {
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        }
                    }
                },
                positions : {
                    cartesian : [expectedResult[0].x, expectedResult[0].y, expectedResult[0].z, expectedResult[1].x, expectedResult[1].y, expectedResult[1].z]
                },
                cornerType : "MITERED",
                extrudedHeight : 2,
                granularity : 3,
                height : 4,
                width: 9,
                show : true,
                outline : true,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 6
            }
        };

        var czmlCorridor = corridorPacket.corridor;

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(corridorPacket));
        var entity = dataSource.entities.values[0];

        expect(entity.corridor).toBeDefined();
        expect(entity.corridor.positions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedResult);
        expect(entity.corridor.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.corridor.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlCorridor.show);
        expect(entity.corridor.height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlCorridor.height);
        expect(entity.corridor.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlCorridor.width);
        expect(entity.corridor.cornerType.getValue(Iso8601.MINIMUM_VALUE)).toEqual(CornerType.MITERED);
        expect(entity.corridor.extrudedHeight.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlCorridor.extrudedHeight);
        expect(entity.corridor.granularity.getValue(Iso8601.MINIMUM_VALUE)).toEqual(czmlCorridor.granularity);
        expect(entity.corridor.outline.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(entity.corridor.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(entity.corridor.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(6);
    });

    it('Has entity collection with link to data source', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(nameCzml);
        var entityCollection = dataSource.entities;
        expect(entityCollection.owner).toEqual(dataSource);
    });

    it('Has entity with link to entity collection', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(staticCzml));
        var entityCollection = dataSource.entities;
        var entity = entityCollection.values[0];
        expect(entity.entityCollection).toEqual(entityCollection);
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

    it('Polyline arrow.', function() {
        var packet = {
            id : 'polylineArrow',
            polyline : {
                material : {
                    polylineArrow : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        }
                    }
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));

        var entity = dataSource.entities.getById('polylineArrow');
        expect(entity.polyline.material.color.getValue()).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
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
        return CzmlDataSource.load({
            id : 'document'
        }).then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toBeInstanceOf(RuntimeError);
            expect(error.message).toEqual('CZML version information invalid.  It is expected to be a property on the document object in the <Major>.<Minor> version format.');
        });
    });

    it('rejects if first packet is not document', function() {
        return CzmlDataSource.load({
            id : 'someId'
        }).then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toBeInstanceOf(RuntimeError);
            expect(error.message).toEqual('The first CZML packet is required to be the document object.');
        });
    });

    it('rejects if document packet contains bad version', function() {
        return CzmlDataSource.load({
            id : 'document'
        }).then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toBeInstanceOf(RuntimeError);
            expect(error.message).toContain('CZML version information invalid.  It is expected to be a property on the document object in the <Major>.<Minor> version format.');
        });
    });

    // The below test was generated, along with ValidationDocument.czml,
    // by the czml-writer ValidationDocumentationGenerator.
    // https://github.com/AnalyticalGraphicsInc/czml-writer/blob/master/DotNet/GenerateFromSchema/ValidationDocumentGenerator.cs
    // using command line
    // GenerateFromSchema.exe -p ..\..\..\..\Schema\Packet.jsonschema -t validation -o ..\..\..\CesiumLanguageWriterTests\
    // then running the generated TestGenerateValidationDocument unit test
    // to produce ValidationDocument.czml and ValidationDocumentAssertions.js

    it('checks validation document', function() {
        return CzmlDataSource.load('Data/CZML/ValidationDocument.czml').then(function(dataSource) {
            /*jshint -W120 */
            var e;
            var date;
            var documentStartDate = JulianDate.fromIso8601('2016-06-17T12:00:00Z');
            var documentStopDate = JulianDate.fromIso8601('2016-06-17T13:00:00Z');
            expect(dataSource.clock.startTime).toEqual(documentStartDate);
            expect(dataSource.clock.stopTime).toEqual(documentStopDate);
            expect(dataSource.clock.currentTime).toEqual(documentStartDate);
            expect(dataSource.clock.multiplier).toEqual(1.0);
            expect(dataSource.clock.clockRange).toEqual(ClockRange.UNBOUNDED);
            expect(dataSource.clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
            var constant = e = dataSource.entities.getById('Constant');
            expect(e).toBeDefined();
            date = JulianDate.now();
            expect(e.description.getValue(date)).toEqual('string1');
            expect(e.position.getValue(date)).toEqual(new Cartesian3(1, 2, 3));
            expect(e.orientation.getValue(date)).toEqualEpsilon(new Quaternion(0.365148371670111, 0.547722557505166, 0.730296743340221, 0.182574185835055), 1e-14);
            expect(e.viewFrom.getValue(date)).toEqual(new Cartesian3(4, 5, 6));
            expect(e.billboard.show.getValue(date)).toEqual(true);
            expect(e.billboard.image.getValue(date)).toEqual('http://example.com/1');
            expect(e.billboard.scale.getValue(date)).toEqual(1.0);
            expect(e.billboard.pixelOffset.getValue(date)).toEqual(new Cartesian2(1, 2));
            expect(e.billboard.eyeOffset.getValue(date)).toEqual(new Cartesian3(7, 8, 9));
            expect(e.billboard.horizontalOrigin.getValue(date)).toEqual(HorizontalOrigin.LEFT);
            expect(e.billboard.verticalOrigin.getValue(date)).toEqual(VerticalOrigin.BOTTOM);
            expect(e.billboard.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.billboard.color.getValue(date)).toEqual(Color.fromBytes(2, 3, 4, 1));
            expect(e.billboard.rotation.getValue(date)).toEqual(2.0);
            expect(e.billboard.alignedAxis.getValue(date)).toEqualEpsilon(new Cartesian3(0.267261241912424, 0.534522483824849, 0.801783725737273), 1e-14);
            expect(e.billboard.sizeInMeters.getValue(date)).toEqual(true);
            expect(e.billboard.width.getValue(date)).toEqual(3.0);
            expect(e.billboard.height.getValue(date)).toEqual(4.0);
            expect(e.billboard.scaleByDistance.getValue(date)).toEqual(new NearFarScalar(1, 2, 3, 4));
            expect(e.billboard.translucencyByDistance.getValue(date)).toEqual(new NearFarScalar(5, 6, 7, 8));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(date)).toEqual(new NearFarScalar(9, 10, 11, 12));
            expect(e.billboard.imageSubRegion.getValue(date)).toEqual(new BoundingRectangle(1, 2, 3, 4));
            expect(e.box.show.getValue(date)).toEqual(true);
            expect(e.box.dimensions.getValue(date)).toEqual(new Cartesian3(10, 11, 12));
            expect(e.box.fill.getValue(date)).toEqual(true);
            expect(e.box.material.color.getValue(date)).toEqual(Color.fromBytes(6, 7, 8, 5));
            expect(e.box.outline.getValue(date)).toEqual(true);
            expect(e.box.outlineColor.getValue(date)).toEqual(Color.fromBytes(10, 11, 12, 9));
            expect(e.box.outlineWidth.getValue(date)).toEqual(5.0);
            expect(e.corridor.show.getValue(date)).toEqual(true);
            expect(e.corridor.positions.getValue(date)).toEqual([ new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6) ]);
            expect(e.corridor.width.getValue(date)).toEqual(6.0);
            expect(e.corridor.height.getValue(date)).toEqual(7.0);
            expect(e.corridor.extrudedHeight.getValue(date)).toEqual(8.0);
            expect(e.corridor.cornerType.getValue(date)).toEqual(CornerType.BEVELED);
            expect(e.corridor.granularity.getValue(date)).toEqual(9.0);
            expect(e.corridor.fill.getValue(date)).toEqual(true);
            expect(e.corridor.material.color.getValue(date)).toEqual(Color.fromBytes(14, 15, 16, 13));
            expect(e.corridor.outline.getValue(date)).toEqual(true);
            expect(e.corridor.outlineColor.getValue(date)).toEqual(Color.fromBytes(18, 19, 20, 17));
            expect(e.corridor.outlineWidth.getValue(date)).toEqual(10.0);
            expect(e.cylinder.show.getValue(date)).toEqual(true);
            expect(e.cylinder.length.getValue(date)).toEqual(11.0);
            expect(e.cylinder.topRadius.getValue(date)).toEqual(12.0);
            expect(e.cylinder.bottomRadius.getValue(date)).toEqual(13.0);
            expect(e.cylinder.fill.getValue(date)).toEqual(true);
            expect(e.cylinder.material.color.getValue(date)).toEqual(Color.fromBytes(22, 23, 24, 21));
            expect(e.cylinder.outline.getValue(date)).toEqual(true);
            expect(e.cylinder.outlineColor.getValue(date)).toEqual(Color.fromBytes(26, 27, 28, 25));
            expect(e.cylinder.outlineWidth.getValue(date)).toEqual(14.0);
            expect(e.cylinder.numberOfVerticalLines.getValue(date)).toEqual(15.0);
            expect(e.cylinder.slices.getValue(date)).toEqual(16.0);
            expect(e.ellipse.show.getValue(date)).toEqual(true);
            expect(e.ellipse.semiMajorAxis.getValue(date)).toEqual(17.0);
            expect(e.ellipse.semiMinorAxis.getValue(date)).toEqual(18.0);
            expect(e.ellipse.height.getValue(date)).toEqual(19.0);
            expect(e.ellipse.extrudedHeight.getValue(date)).toEqual(20.0);
            expect(e.ellipse.rotation.getValue(date)).toEqual(21.0);
            expect(e.ellipse.stRotation.getValue(date)).toEqual(22.0);
            expect(e.ellipse.granularity.getValue(date)).toEqual(23.0);
            expect(e.ellipse.fill.getValue(date)).toEqual(true);
            expect(e.ellipse.material.color.getValue(date)).toEqual(Color.fromBytes(30, 31, 32, 29));
            expect(e.ellipse.outline.getValue(date)).toEqual(true);
            expect(e.ellipse.outlineColor.getValue(date)).toEqual(Color.fromBytes(34, 35, 36, 33));
            expect(e.ellipse.outlineWidth.getValue(date)).toEqual(24.0);
            expect(e.ellipse.numberOfVerticalLines.getValue(date)).toEqual(25.0);
            expect(e.ellipsoid.show.getValue(date)).toEqual(true);
            expect(e.ellipsoid.radii.getValue(date)).toEqual(new Cartesian3(13, 14, 15));
            expect(e.ellipsoid.fill.getValue(date)).toEqual(true);
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(Color.fromBytes(38, 39, 40, 37));
            expect(e.ellipsoid.outline.getValue(date)).toEqual(true);
            expect(e.ellipsoid.outlineColor.getValue(date)).toEqual(Color.fromBytes(42, 43, 44, 41));
            expect(e.ellipsoid.outlineWidth.getValue(date)).toEqual(26.0);
            expect(e.ellipsoid.stackPartitions.getValue(date)).toEqual(27.0);
            expect(e.ellipsoid.slicePartitions.getValue(date)).toEqual(28.0);
            expect(e.ellipsoid.subdivisions.getValue(date)).toEqual(29.0);
            expect(e.label.show.getValue(date)).toEqual(true);
            expect(e.label.text.getValue(date)).toEqual('string2');
            expect(e.label.font.getValue(date)).toEqual('6px sans-serif');
            expect(e.label.style.getValue(date)).toEqual(LabelStyle.FILL_AND_OUTLINE);
            expect(e.label.scale.getValue(date)).toEqual(30.0);
            expect(e.label.pixelOffset.getValue(date)).toEqual(new Cartesian2(3, 4));
            expect(e.label.eyeOffset.getValue(date)).toEqual(new Cartesian3(16, 17, 18));
            expect(e.label.horizontalOrigin.getValue(date)).toEqual(HorizontalOrigin.LEFT);
            expect(e.label.verticalOrigin.getValue(date)).toEqual(VerticalOrigin.BOTTOM);
            expect(e.label.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.label.fillColor.getValue(date)).toEqual(Color.fromBytes(46, 47, 48, 45));
            expect(e.label.outlineColor.getValue(date)).toEqual(Color.fromBytes(50, 51, 52, 49));
            expect(e.label.outlineWidth.getValue(date)).toEqual(31.0);
            expect(e.label.translucencyByDistance.getValue(date)).toEqual(new NearFarScalar(13, 14, 15, 16));
            expect(e.label.pixelOffsetScaleByDistance.getValue(date)).toEqual(new NearFarScalar(17, 18, 19, 20));
            expect(e.model.show.getValue(date)).toEqual(true);
            expect(e.model.uri.getValue(date)).toEqual('http://example.com/2');
            expect(e.model.scale.getValue(date)).toEqual(32.0);
            expect(e.model.minimumPixelSize.getValue(date)).toEqual(33.0);
            expect(e.model.maximumScale.getValue(date)).toEqual(34.0);
            expect(e.model.incrementallyLoadTextures.getValue(date)).toEqual(true);
            expect(e.model.runAnimations.getValue(date)).toEqual(true);
            expect(e.model.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.model.nodeTransformations.prop.translation.getValue(date)).toEqual(new Cartesian3(19, 20, 21));
            expect(e.model.nodeTransformations.prop.rotation.getValue(date)).toEqualEpsilon(new Quaternion(0.454858826147342, 0.530668630505232, 0.606478434863123, 0.379049021789452), 1e-14);
            expect(e.model.nodeTransformations.prop.scale.getValue(date)).toEqual(new Cartesian3(22, 23, 24));
            expect(e.path.show.getValue(date)).toEqual(true);
            expect(e.path.width.getValue(date)).toEqual(35.0);
            expect(e.path.resolution.getValue(date)).toEqual(36.0);
            expect(e.path.leadTime.getValue(date)).toEqual(37.0);
            expect(e.path.trailTime.getValue(date)).toEqual(38.0);
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(54, 55, 56, 53));
            expect(e.point.show.getValue(date)).toEqual(true);
            expect(e.point.pixelSize.getValue(date)).toEqual(39.0);
            expect(e.point.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.point.color.getValue(date)).toEqual(Color.fromBytes(58, 59, 60, 57));
            expect(e.point.outlineColor.getValue(date)).toEqual(Color.fromBytes(62, 63, 64, 61));
            expect(e.point.outlineWidth.getValue(date)).toEqual(40.0);
            expect(e.point.scaleByDistance.getValue(date)).toEqual(new NearFarScalar(21, 22, 23, 24));
            expect(e.point.translucencyByDistance.getValue(date)).toEqual(new NearFarScalar(25, 26, 27, 28));
            expect(e.polygon.show.getValue(date)).toEqual(true);
            expect(e.polygon.hierarchy.getValue(date)).toEqual([ new Cartesian3(7, 8, 9), new Cartesian3(10, 11, 12) ]);
            expect(e.polygon.height.getValue(date)).toEqual(41.0);
            expect(e.polygon.extrudedHeight.getValue(date)).toEqual(42.0);
            expect(e.polygon.stRotation.getValue(date)).toEqual(43.0);
            expect(e.polygon.granularity.getValue(date)).toEqual(44.0);
            expect(e.polygon.fill.getValue(date)).toEqual(true);
            expect(e.polygon.material.color.getValue(date)).toEqual(Color.fromBytes(66, 67, 68, 65));
            expect(e.polygon.outline.getValue(date)).toEqual(true);
            expect(e.polygon.outlineColor.getValue(date)).toEqual(Color.fromBytes(70, 71, 72, 69));
            expect(e.polygon.outlineWidth.getValue(date)).toEqual(45.0);
            expect(e.polygon.perPositionHeight.getValue(date)).toEqual(true);
            expect(e.polygon.closeTop.getValue(date)).toEqual(true);
            expect(e.polygon.closeBottom.getValue(date)).toEqual(true);
            expect(e.polyline.show.getValue(date)).toEqual(true);
            expect(e.polyline.positions.getValue(date)).toEqual([ new Cartesian3(13, 14, 15), new Cartesian3(16, 17, 18) ]);
            expect(e.polyline.width.getValue(date)).toEqual(46.0);
            expect(e.polyline.granularity.getValue(date)).toEqual(47.0);
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(74, 75, 76, 73));
            expect(e.polyline.followSurface.getValue(date)).toEqual(true);
            expect(e.rectangle.show.getValue(date)).toEqual(true);
            expect(e.rectangle.coordinates.getValue(date)).toEqual(new Rectangle(1, 0.429203673205103, 1.4292036732051, 0.858407346410207));
            expect(e.rectangle.height.getValue(date)).toEqual(48.0);
            expect(e.rectangle.extrudedHeight.getValue(date)).toEqual(49.0);
            expect(e.rectangle.rotation.getValue(date)).toEqual(50.0);
            expect(e.rectangle.stRotation.getValue(date)).toEqual(51.0);
            expect(e.rectangle.granularity.getValue(date)).toEqual(52.0);
            expect(e.rectangle.fill.getValue(date)).toEqual(true);
            expect(e.rectangle.material.color.getValue(date)).toEqual(Color.fromBytes(78, 79, 80, 77));
            expect(e.rectangle.outline.getValue(date)).toEqual(true);
            expect(e.rectangle.outlineColor.getValue(date)).toEqual(Color.fromBytes(82, 83, 84, 81));
            expect(e.rectangle.outlineWidth.getValue(date)).toEqual(53.0);
            expect(e.rectangle.closeTop.getValue(date)).toEqual(true);
            expect(e.rectangle.closeBottom.getValue(date)).toEqual(true);
            expect(e.wall.show.getValue(date)).toEqual(true);
            expect(e.wall.positions.getValue(date)).toEqual([ new Cartesian3(19, 20, 21), new Cartesian3(22, 23, 24) ]);
            expect(e.wall.minimumHeights.getValue(date)).toEqual([ 1, 2 ]);
            expect(e.wall.maximumHeights.getValue(date)).toEqual([ 3, 4 ]);
            expect(e.wall.granularity.getValue(date)).toEqual(54.0);
            expect(e.wall.fill.getValue(date)).toEqual(true);
            expect(e.wall.material.color.getValue(date)).toEqual(Color.fromBytes(86, 87, 88, 85));
            expect(e.wall.outline.getValue(date)).toEqual(true);
            expect(e.wall.outlineColor.getValue(date)).toEqual(Color.fromBytes(90, 91, 92, 89));
            expect(e.wall.outlineWidth.getValue(date)).toEqual(55.0);
            expect(e = dataSource.entities.getById('constant1')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(Cartesian3.fromRadians(1, 0.429203673205103, 3));
            expect(e = dataSource.entities.getById('constant2')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(Cartesian3.fromDegrees(4, 5, 6));
            expect(e = dataSource.entities.getById('constant3')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(new Cartesian3(1, 2, 3));
            expect(e = dataSource.entities.getById('constant4')).toBeDefined();
            expect(e.billboard.color.getValue(date)).toEqualEpsilon(new Color(0.00784313725490196, 0.0117647058823529, 0.0156862745098039, 0.00392156862745098), 1e-14);
            expect(e = dataSource.entities.getById('constant5')).toBeDefined();
            expect(e.billboard.alignedAxis.getValue(date)).toEqual(Cartesian3.fromSpherical(new Spherical(1, 2)));
            expect(e = dataSource.entities.getById('constant6')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqualEpsilon(new Color(0.0235294117647059, 0.0274509803921569, 0.0313725490196078, 0.0196078431372549), 1e-14);
            expect(e = dataSource.entities.getById('material_box_material_image')).toBeDefined();
            expect(e.box.material.image.getValue(date)).toEqual('http://example.com/3');
            expect(e.box.material.repeat.getValue(date)).toEqual(new Cartesian2(5, 6));
            expect(e.box.material.color.getValue(date)).toEqual(Color.fromBytes(190, 191, 192, 189));
            expect(e.box.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_box_material_grid')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqual(Color.fromBytes(194, 195, 196, 193));
            expect(e.box.material.cellAlpha.getValue(date)).toEqual(76.0);
            expect(e.box.material.lineCount.getValue(date)).toEqual(new Cartesian2(7, 8));
            expect(e.box.material.lineThickness.getValue(date)).toEqual(new Cartesian2(9, 10));
            expect(e.box.material.lineOffset.getValue(date)).toEqual(new Cartesian2(11, 12));
            expect(e = dataSource.entities.getById('material_box_material_stripe')).toBeDefined();
            expect(e.box.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.box.material.evenColor.getValue(date)).toEqual(Color.fromBytes(198, 199, 200, 197));
            expect(e.box.material.oddColor.getValue(date)).toEqual(Color.fromBytes(202, 203, 204, 201));
            expect(e.box.material.offset.getValue(date)).toEqual(77.0);
            expect(e.box.material.repeat.getValue(date)).toEqual(78.0);
            expect(e = dataSource.entities.getById('material1')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqualEpsilon(new Color(0.0392156862745098, 0.0431372549019608, 0.0470588235294118, 0.0352941176470588), 1e-14);
            expect(e = dataSource.entities.getById('material2')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqualEpsilon(new Color(0.0549019607843137, 0.0588235294117647, 0.0627450980392157, 0.0509803921568627), 1e-14);
            expect(e = dataSource.entities.getById('material3')).toBeDefined();
            expect(e.box.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.0705882352941176, 0.0745098039215686, 0.0784313725490196, 0.0666666666666667), 1e-14);
            expect(e = dataSource.entities.getById('material4')).toBeDefined();
            expect(e.box.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.0862745098039216, 0.0901960784313725, 0.0941176470588235, 0.0823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('constant7')).toBeDefined();
            expect(e.box.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.101960784313725, 0.105882352941176, 0.109803921568627, 0.0980392156862745), 1e-14);
            expect(e = dataSource.entities.getById('constant8')).toBeDefined();
            expect(e.corridor.positions.getValue(date)).toEqual([ Cartesian3.fromRadians(1, 0.429203673205103, 3), Cartesian3.fromRadians(0.858407346410207, 0.28761101961531, 6) ]);
            expect(e = dataSource.entities.getById('constant9')).toBeDefined();
            expect(e.corridor.positions.getValue(date)).toEqual([ Cartesian3.fromDegrees(7, 8, 9), Cartesian3.fromDegrees(10, 11, 12) ]);
            expect(e = dataSource.entities.getById('constant10')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqualEpsilon(new Color(0.117647058823529, 0.12156862745098, 0.125490196078431, 0.113725490196078), 1e-14);
            expect(e = dataSource.entities.getById('material_corridor_material_image')).toBeDefined();
            expect(e.corridor.material.image.getValue(date)).toEqual('http://example.com/4');
            expect(e.corridor.material.repeat.getValue(date)).toEqual(new Cartesian2(13, 14));
            expect(e.corridor.material.color.getValue(date)).toEqual(Color.fromBytes(206, 207, 208, 205));
            expect(e.corridor.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_corridor_material_grid')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqual(Color.fromBytes(210, 211, 212, 209));
            expect(e.corridor.material.cellAlpha.getValue(date)).toEqual(79.0);
            expect(e.corridor.material.lineCount.getValue(date)).toEqual(new Cartesian2(15, 16));
            expect(e.corridor.material.lineThickness.getValue(date)).toEqual(new Cartesian2(17, 18));
            expect(e.corridor.material.lineOffset.getValue(date)).toEqual(new Cartesian2(19, 20));
            expect(e = dataSource.entities.getById('material_corridor_material_stripe')).toBeDefined();
            expect(e.corridor.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.corridor.material.evenColor.getValue(date)).toEqual(Color.fromBytes(214, 215, 216, 213));
            expect(e.corridor.material.oddColor.getValue(date)).toEqual(Color.fromBytes(218, 219, 220, 217));
            expect(e.corridor.material.offset.getValue(date)).toEqual(80.0);
            expect(e.corridor.material.repeat.getValue(date)).toEqual(81.0);
            expect(e = dataSource.entities.getById('material5')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqualEpsilon(new Color(0.133333333333333, 0.137254901960784, 0.141176470588235, 0.129411764705882), 1e-14);
            expect(e = dataSource.entities.getById('material6')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqualEpsilon(new Color(0.149019607843137, 0.152941176470588, 0.156862745098039, 0.145098039215686), 1e-14);
            expect(e = dataSource.entities.getById('material7')).toBeDefined();
            expect(e.corridor.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.164705882352941, 0.168627450980392, 0.172549019607843, 0.16078431372549), 1e-14);
            expect(e = dataSource.entities.getById('material8')).toBeDefined();
            expect(e.corridor.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.180392156862745, 0.184313725490196, 0.188235294117647, 0.176470588235294), 1e-14);
            expect(e = dataSource.entities.getById('constant11')).toBeDefined();
            expect(e.corridor.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.196078431372549, 0.2, 0.203921568627451, 0.192156862745098), 1e-14);
            expect(e = dataSource.entities.getById('constant12')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqualEpsilon(new Color(0.211764705882353, 0.215686274509804, 0.219607843137255, 0.207843137254902), 1e-14);
            expect(e = dataSource.entities.getById('material_cylinder_material_image')).toBeDefined();
            expect(e.cylinder.material.image.getValue(date)).toEqual('http://example.com/5');
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(new Cartesian2(21, 22));
            expect(e.cylinder.material.color.getValue(date)).toEqual(Color.fromBytes(222, 223, 224, 221));
            expect(e.cylinder.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_cylinder_material_grid')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqual(Color.fromBytes(226, 227, 228, 225));
            expect(e.cylinder.material.cellAlpha.getValue(date)).toEqual(82.0);
            expect(e.cylinder.material.lineCount.getValue(date)).toEqual(new Cartesian2(23, 24));
            expect(e.cylinder.material.lineThickness.getValue(date)).toEqual(new Cartesian2(25, 26));
            expect(e.cylinder.material.lineOffset.getValue(date)).toEqual(new Cartesian2(27, 28));
            expect(e = dataSource.entities.getById('material_cylinder_material_stripe')).toBeDefined();
            expect(e.cylinder.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.cylinder.material.evenColor.getValue(date)).toEqual(Color.fromBytes(230, 231, 232, 229));
            expect(e.cylinder.material.oddColor.getValue(date)).toEqual(Color.fromBytes(234, 235, 236, 233));
            expect(e.cylinder.material.offset.getValue(date)).toEqual(83.0);
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(84.0);
            expect(e = dataSource.entities.getById('material9')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqualEpsilon(new Color(0.227450980392157, 0.231372549019608, 0.235294117647059, 0.223529411764706), 1e-14);
            expect(e = dataSource.entities.getById('material10')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqualEpsilon(new Color(0.243137254901961, 0.247058823529412, 0.250980392156863, 0.23921568627451), 1e-14);
            expect(e = dataSource.entities.getById('material11')).toBeDefined();
            expect(e.cylinder.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.258823529411765, 0.262745098039216, 0.266666666666667, 0.254901960784314), 1e-14);
            expect(e = dataSource.entities.getById('material12')).toBeDefined();
            expect(e.cylinder.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.274509803921569, 0.27843137254902, 0.282352941176471, 0.270588235294118), 1e-14);
            expect(e = dataSource.entities.getById('constant13')).toBeDefined();
            expect(e.cylinder.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.290196078431373, 0.294117647058824, 0.298039215686275, 0.286274509803922), 1e-14);
            expect(e = dataSource.entities.getById('constant14')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqualEpsilon(new Color(0.305882352941176, 0.309803921568627, 0.313725490196078, 0.301960784313725), 1e-14);
            expect(e = dataSource.entities.getById('material_ellipse_material_image')).toBeDefined();
            expect(e.ellipse.material.image.getValue(date)).toEqual('http://example.com/6');
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(new Cartesian2(29, 30));
            expect(e.ellipse.material.color.getValue(date)).toEqual(Color.fromBytes(238, 239, 240, 237));
            expect(e.ellipse.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_ellipse_material_grid')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqual(Color.fromBytes(242, 243, 244, 241));
            expect(e.ellipse.material.cellAlpha.getValue(date)).toEqual(85.0);
            expect(e.ellipse.material.lineCount.getValue(date)).toEqual(new Cartesian2(31, 32));
            expect(e.ellipse.material.lineThickness.getValue(date)).toEqual(new Cartesian2(33, 34));
            expect(e.ellipse.material.lineOffset.getValue(date)).toEqual(new Cartesian2(35, 36));
            expect(e = dataSource.entities.getById('material_ellipse_material_stripe')).toBeDefined();
            expect(e.ellipse.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.ellipse.material.evenColor.getValue(date)).toEqual(Color.fromBytes(246, 247, 248, 245));
            expect(e.ellipse.material.oddColor.getValue(date)).toEqual(Color.fromBytes(250, 251, 252, 249));
            expect(e.ellipse.material.offset.getValue(date)).toEqual(86.0);
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(87.0);
            expect(e = dataSource.entities.getById('material13')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqualEpsilon(new Color(0.32156862745098, 0.325490196078431, 0.329411764705882, 0.317647058823529), 1e-14);
            expect(e = dataSource.entities.getById('material14')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqualEpsilon(new Color(0.337254901960784, 0.341176470588235, 0.345098039215686, 0.333333333333333), 1e-14);
            expect(e = dataSource.entities.getById('material15')).toBeDefined();
            expect(e.ellipse.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.352941176470588, 0.356862745098039, 0.36078431372549, 0.349019607843137), 1e-14);
            expect(e = dataSource.entities.getById('material16')).toBeDefined();
            expect(e.ellipse.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.368627450980392, 0.372549019607843, 0.376470588235294, 0.364705882352941), 1e-14);
            expect(e = dataSource.entities.getById('constant15')).toBeDefined();
            expect(e.ellipse.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.384313725490196, 0.388235294117647, 0.392156862745098, 0.380392156862745), 1e-14);
            expect(e = dataSource.entities.getById('constant16')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqualEpsilon(new Color(0.4, 0.403921568627451, 0.407843137254902, 0.396078431372549), 1e-14);
            expect(e = dataSource.entities.getById('material_ellipsoid_material_image')).toBeDefined();
            expect(e.ellipsoid.material.image.getValue(date)).toEqual('http://example.com/7');
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(new Cartesian2(37, 38));
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(Color.fromBytes(254, 0, 1, 253));
            expect(e.ellipsoid.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_ellipsoid_material_grid')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(Color.fromBytes(3, 4, 5, 2));
            expect(e.ellipsoid.material.cellAlpha.getValue(date)).toEqual(88.0);
            expect(e.ellipsoid.material.lineCount.getValue(date)).toEqual(new Cartesian2(39, 40));
            expect(e.ellipsoid.material.lineThickness.getValue(date)).toEqual(new Cartesian2(41, 42));
            expect(e.ellipsoid.material.lineOffset.getValue(date)).toEqual(new Cartesian2(43, 44));
            expect(e = dataSource.entities.getById('material_ellipsoid_material_stripe')).toBeDefined();
            expect(e.ellipsoid.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.ellipsoid.material.evenColor.getValue(date)).toEqual(Color.fromBytes(7, 8, 9, 6));
            expect(e.ellipsoid.material.oddColor.getValue(date)).toEqual(Color.fromBytes(11, 12, 13, 10));
            expect(e.ellipsoid.material.offset.getValue(date)).toEqual(89.0);
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(90.0);
            expect(e = dataSource.entities.getById('material17')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqualEpsilon(new Color(0.415686274509804, 0.419607843137255, 0.423529411764706, 0.411764705882353), 1e-14);
            expect(e = dataSource.entities.getById('material18')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqualEpsilon(new Color(0.431372549019608, 0.435294117647059, 0.43921568627451, 0.427450980392157), 1e-14);
            expect(e = dataSource.entities.getById('material19')).toBeDefined();
            expect(e.ellipsoid.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.447058823529412, 0.450980392156863, 0.454901960784314, 0.443137254901961), 1e-14);
            expect(e = dataSource.entities.getById('material20')).toBeDefined();
            expect(e.ellipsoid.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.462745098039216, 0.466666666666667, 0.470588235294118, 0.458823529411765), 1e-14);
            expect(e = dataSource.entities.getById('constant17')).toBeDefined();
            expect(e.ellipsoid.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.47843137254902, 0.482352941176471, 0.486274509803922, 0.474509803921569), 1e-14);
            expect(e = dataSource.entities.getById('constant18')).toBeDefined();
            expect(e.label.fillColor.getValue(date)).toEqualEpsilon(new Color(0.494117647058824, 0.498039215686275, 0.501960784313725, 0.490196078431373), 1e-14);
            expect(e = dataSource.entities.getById('constant19')).toBeDefined();
            expect(e.label.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.509803921568627, 0.513725490196078, 0.517647058823529, 0.505882352941176), 1e-14);
            expect(e = dataSource.entities.getById('constant20')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.525490196078431, 0.529411764705882, 0.533333333333333, 0.52156862745098), 1e-14);
            expect(e = dataSource.entities.getById('material_path_material_polylineOutline')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(15, 16, 17, 14));
            expect(e.path.material.outlineColor.getValue(date)).toEqual(Color.fromBytes(19, 20, 21, 18));
            expect(e.path.material.outlineWidth.getValue(date)).toEqual(91.0);
            expect(e = dataSource.entities.getById('material_path_material_polylineArrow')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(23, 24, 25, 22));
            expect(e = dataSource.entities.getById('material_path_material_polylineGlow')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(27, 28, 29, 26));
            expect(e.path.material.glowPower.getValue(date)).toEqual(92.0);
            expect(e = dataSource.entities.getById('material_path_material_image')).toBeDefined();
            expect(e.path.material.image.getValue(date)).toEqual('http://example.com/8');
            expect(e.path.material.repeat.getValue(date)).toEqual(new Cartesian2(45, 46));
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(31, 32, 33, 30));
            expect(e.path.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_path_material_grid')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(35, 36, 37, 34));
            expect(e.path.material.cellAlpha.getValue(date)).toEqual(93.0);
            expect(e.path.material.lineCount.getValue(date)).toEqual(new Cartesian2(47, 48));
            expect(e.path.material.lineThickness.getValue(date)).toEqual(new Cartesian2(49, 50));
            expect(e.path.material.lineOffset.getValue(date)).toEqual(new Cartesian2(51, 52));
            expect(e = dataSource.entities.getById('material_path_material_stripe')).toBeDefined();
            expect(e.path.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.path.material.evenColor.getValue(date)).toEqual(Color.fromBytes(39, 40, 41, 38));
            expect(e.path.material.oddColor.getValue(date)).toEqual(Color.fromBytes(43, 44, 45, 42));
            expect(e.path.material.offset.getValue(date)).toEqual(94.0);
            expect(e.path.material.repeat.getValue(date)).toEqual(95.0);
            expect(e = dataSource.entities.getById('material21')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.541176470588235, 0.545098039215686, 0.549019607843137, 0.537254901960784), 1e-14);
            expect(e = dataSource.entities.getById('material22')).toBeDefined();
            expect(e.path.material.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.556862745098039, 0.56078431372549, 0.564705882352941, 0.552941176470588), 1e-14);
            expect(e = dataSource.entities.getById('material23')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.572549019607843, 0.576470588235294, 0.580392156862745, 0.568627450980392), 1e-14);
            expect(e = dataSource.entities.getById('material24')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.588235294117647, 0.592156862745098, 0.596078431372549, 0.584313725490196), 1e-14);
            expect(e = dataSource.entities.getById('material25')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.603921568627451, 0.607843137254902, 0.611764705882353, 0.6), 1e-14);
            expect(e = dataSource.entities.getById('material26')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.619607843137255, 0.623529411764706, 0.627450980392157, 0.615686274509804), 1e-14);
            expect(e = dataSource.entities.getById('material27')).toBeDefined();
            expect(e.path.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.635294117647059, 0.63921568627451, 0.643137254901961, 0.631372549019608), 1e-14);
            expect(e = dataSource.entities.getById('material28')).toBeDefined();
            expect(e.path.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.650980392156863, 0.654901960784314, 0.658823529411765, 0.647058823529412), 1e-14);
            expect(e = dataSource.entities.getById('constant21')).toBeDefined();
            expect(e.point.color.getValue(date)).toEqualEpsilon(new Color(0.666666666666667, 0.670588235294118, 0.674509803921569, 0.662745098039216), 1e-14);
            expect(e = dataSource.entities.getById('constant22')).toBeDefined();
            expect(e.point.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.682352941176471, 0.686274509803922, 0.690196078431373, 0.67843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant23')).toBeDefined();
            expect(e.polygon.hierarchy.getValue(date)).toEqual([ Cartesian3.fromRadians(0.433629385640828, 1.43362938564083, 15), Cartesian3.fromRadians(0.292036732051034, 1.29203673205103, 18) ]);
            expect(e = dataSource.entities.getById('constant24')).toBeDefined();
            expect(e.polygon.hierarchy.getValue(date)).toEqual([ Cartesian3.fromDegrees(19, 20, 21), Cartesian3.fromDegrees(22, 23, 24) ]);
            expect(e = dataSource.entities.getById('constant25')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqualEpsilon(new Color(0.698039215686274, 0.701960784313725, 0.705882352941177, 0.694117647058824), 1e-14);
            expect(e = dataSource.entities.getById('material_polygon_material_image')).toBeDefined();
            expect(e.polygon.material.image.getValue(date)).toEqual('http://example.com/9');
            expect(e.polygon.material.repeat.getValue(date)).toEqual(new Cartesian2(53, 54));
            expect(e.polygon.material.color.getValue(date)).toEqual(Color.fromBytes(47, 48, 49, 46));
            expect(e.polygon.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_polygon_material_grid')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqual(Color.fromBytes(51, 52, 53, 50));
            expect(e.polygon.material.cellAlpha.getValue(date)).toEqual(96.0);
            expect(e.polygon.material.lineCount.getValue(date)).toEqual(new Cartesian2(55, 56));
            expect(e.polygon.material.lineThickness.getValue(date)).toEqual(new Cartesian2(57, 58));
            expect(e.polygon.material.lineOffset.getValue(date)).toEqual(new Cartesian2(59, 60));
            expect(e = dataSource.entities.getById('material_polygon_material_stripe')).toBeDefined();
            expect(e.polygon.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.polygon.material.evenColor.getValue(date)).toEqual(Color.fromBytes(55, 56, 57, 54));
            expect(e.polygon.material.oddColor.getValue(date)).toEqual(Color.fromBytes(59, 60, 61, 58));
            expect(e.polygon.material.offset.getValue(date)).toEqual(97.0);
            expect(e.polygon.material.repeat.getValue(date)).toEqual(98.0);
            expect(e = dataSource.entities.getById('material29')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqualEpsilon(new Color(0.713725490196078, 0.717647058823529, 0.72156862745098, 0.709803921568627), 1e-14);
            expect(e = dataSource.entities.getById('material30')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqualEpsilon(new Color(0.729411764705882, 0.733333333333333, 0.737254901960784, 0.725490196078431), 1e-14);
            expect(e = dataSource.entities.getById('material31')).toBeDefined();
            expect(e.polygon.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.745098039215686, 0.749019607843137, 0.752941176470588, 0.741176470588235), 1e-14);
            expect(e = dataSource.entities.getById('material32')).toBeDefined();
            expect(e.polygon.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.76078431372549, 0.764705882352941, 0.768627450980392, 0.756862745098039), 1e-14);
            expect(e = dataSource.entities.getById('constant26')).toBeDefined();
            expect(e.polygon.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.776470588235294, 0.780392156862745, 0.784313725490196, 0.772549019607843), 1e-14);
            expect(e = dataSource.entities.getById('constant27')).toBeDefined();
            expect(e.polyline.positions.getValue(date)).toEqual([ Cartesian3.fromRadians(1.43805509807655, 0.867258771281655, 27), Cartesian3.fromRadians(1.29646244448676, 0.725666117691862, 30) ]);
            expect(e = dataSource.entities.getById('constant28')).toBeDefined();
            expect(e.polyline.positions.getValue(date)).toEqual([ Cartesian3.fromDegrees(31, 32, 33), Cartesian3.fromDegrees(34, 35, 36) ]);
            expect(e = dataSource.entities.getById('constant29')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.792156862745098, 0.796078431372549, 0.8, 0.788235294117647), 1e-14);
            expect(e = dataSource.entities.getById('material_polyline_material_polylineOutline')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(63, 64, 65, 62));
            expect(e.polyline.material.outlineColor.getValue(date)).toEqual(Color.fromBytes(67, 68, 69, 66));
            expect(e.polyline.material.outlineWidth.getValue(date)).toEqual(99.0);
            expect(e = dataSource.entities.getById('material_polyline_material_polylineArrow')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(71, 72, 73, 70));
            expect(e = dataSource.entities.getById('material_polyline_material_polylineGlow')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(75, 76, 77, 74));
            expect(e.polyline.material.glowPower.getValue(date)).toEqual(100.0);
            expect(e = dataSource.entities.getById('material_polyline_material_image')).toBeDefined();
            expect(e.polyline.material.image.getValue(date)).toEqual('http://example.com/10');
            expect(e.polyline.material.repeat.getValue(date)).toEqual(new Cartesian2(61, 62));
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(79, 80, 81, 78));
            expect(e.polyline.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_polyline_material_grid')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(83, 84, 85, 82));
            expect(e.polyline.material.cellAlpha.getValue(date)).toEqual(101.0);
            expect(e.polyline.material.lineCount.getValue(date)).toEqual(new Cartesian2(63, 64));
            expect(e.polyline.material.lineThickness.getValue(date)).toEqual(new Cartesian2(65, 66));
            expect(e.polyline.material.lineOffset.getValue(date)).toEqual(new Cartesian2(67, 68));
            expect(e = dataSource.entities.getById('material_polyline_material_stripe')).toBeDefined();
            expect(e.polyline.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.polyline.material.evenColor.getValue(date)).toEqual(Color.fromBytes(87, 88, 89, 86));
            expect(e.polyline.material.oddColor.getValue(date)).toEqual(Color.fromBytes(91, 92, 93, 90));
            expect(e.polyline.material.offset.getValue(date)).toEqual(102.0);
            expect(e.polyline.material.repeat.getValue(date)).toEqual(103.0);
            expect(e = dataSource.entities.getById('material33')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.807843137254902, 0.811764705882353, 0.815686274509804, 0.803921568627451), 1e-14);
            expect(e = dataSource.entities.getById('material34')).toBeDefined();
            expect(e.polyline.material.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.823529411764706, 0.827450980392157, 0.831372549019608, 0.819607843137255), 1e-14);
            expect(e = dataSource.entities.getById('material35')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.83921568627451, 0.843137254901961, 0.847058823529412, 0.835294117647059), 1e-14);
            expect(e = dataSource.entities.getById('material36')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.854901960784314, 0.858823529411765, 0.862745098039216, 0.850980392156863), 1e-14);
            expect(e = dataSource.entities.getById('material37')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.870588235294118, 0.874509803921569, 0.87843137254902, 0.866666666666667), 1e-14);
            expect(e = dataSource.entities.getById('material38')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.886274509803922, 0.890196078431373, 0.894117647058824, 0.882352941176471), 1e-14);
            expect(e = dataSource.entities.getById('material39')).toBeDefined();
            expect(e.polyline.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.901960784313726, 0.905882352941176, 0.909803921568627, 0.898039215686275), 1e-14);
            expect(e = dataSource.entities.getById('material40')).toBeDefined();
            expect(e.polyline.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.917647058823529, 0.92156862745098, 0.925490196078431, 0.913725490196078), 1e-14);
            expect(e = dataSource.entities.getById('constant30')).toBeDefined();
            expect(e.rectangle.coordinates.getValue(date)).toEqual(Rectangle.fromDegrees(5, 6, 7, 8));
            expect(e = dataSource.entities.getById('constant31')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqualEpsilon(new Color(0.933333333333333, 0.937254901960784, 0.941176470588235, 0.929411764705882), 1e-14);
            expect(e = dataSource.entities.getById('material_rectangle_material_image')).toBeDefined();
            expect(e.rectangle.material.image.getValue(date)).toEqual('http://example.com/11');
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(new Cartesian2(69, 70));
            expect(e.rectangle.material.color.getValue(date)).toEqual(Color.fromBytes(95, 96, 97, 94));
            expect(e.rectangle.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_rectangle_material_grid')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqual(Color.fromBytes(99, 100, 101, 98));
            expect(e.rectangle.material.cellAlpha.getValue(date)).toEqual(104.0);
            expect(e.rectangle.material.lineCount.getValue(date)).toEqual(new Cartesian2(71, 72));
            expect(e.rectangle.material.lineThickness.getValue(date)).toEqual(new Cartesian2(73, 74));
            expect(e.rectangle.material.lineOffset.getValue(date)).toEqual(new Cartesian2(75, 76));
            expect(e = dataSource.entities.getById('material_rectangle_material_stripe')).toBeDefined();
            expect(e.rectangle.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.rectangle.material.evenColor.getValue(date)).toEqual(Color.fromBytes(103, 104, 105, 102));
            expect(e.rectangle.material.oddColor.getValue(date)).toEqual(Color.fromBytes(107, 108, 109, 106));
            expect(e.rectangle.material.offset.getValue(date)).toEqual(105.0);
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(106.0);
            expect(e = dataSource.entities.getById('material41')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqualEpsilon(new Color(0.949019607843137, 0.952941176470588, 0.956862745098039, 0.945098039215686), 1e-14);
            expect(e = dataSource.entities.getById('material42')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqualEpsilon(new Color(0.964705882352941, 0.968627450980392, 0.972549019607843, 0.96078431372549), 1e-14);
            expect(e = dataSource.entities.getById('material43')).toBeDefined();
            expect(e.rectangle.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.980392156862745, 0.984313725490196, 0.988235294117647, 0.976470588235294), 1e-14);
            expect(e = dataSource.entities.getById('material44')).toBeDefined();
            expect(e.rectangle.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.996078431372549, 0, 0.00392156862745098, 0.992156862745098), 1e-14);
            expect(e = dataSource.entities.getById('constant32')).toBeDefined();
            expect(e.rectangle.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.0117647058823529, 0.0156862745098039, 0.0196078431372549, 0.00784313725490196), 1e-14);
            expect(e = dataSource.entities.getById('constant33')).toBeDefined();
            expect(e.wall.positions.getValue(date)).toEqual([ Cartesian3.fromRadians(0.871684483717379, 0.300888156922483, 39), Cartesian3.fromRadians(0.730091830127586, 0.159295503332689, 42) ]);
            expect(e = dataSource.entities.getById('constant34')).toBeDefined();
            expect(e.wall.positions.getValue(date)).toEqual([ Cartesian3.fromDegrees(43, 44, 45), Cartesian3.fromDegrees(1, 2, 48) ]);
            expect(e = dataSource.entities.getById('constant35')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqualEpsilon(new Color(0.0274509803921569, 0.0313725490196078, 0.0352941176470588, 0.0235294117647059), 1e-14);
            expect(e = dataSource.entities.getById('material_wall_material_image')).toBeDefined();
            expect(e.wall.material.image.getValue(date)).toEqual('http://example.com/12');
            expect(e.wall.material.repeat.getValue(date)).toEqual(new Cartesian2(77, 78));
            expect(e.wall.material.color.getValue(date)).toEqual(Color.fromBytes(111, 112, 113, 110));
            expect(e.wall.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_wall_material_grid')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqual(Color.fromBytes(115, 116, 117, 114));
            expect(e.wall.material.cellAlpha.getValue(date)).toEqual(107.0);
            expect(e.wall.material.lineCount.getValue(date)).toEqual(new Cartesian2(79, 80));
            expect(e.wall.material.lineThickness.getValue(date)).toEqual(new Cartesian2(81, 82));
            expect(e.wall.material.lineOffset.getValue(date)).toEqual(new Cartesian2(83, 84));
            expect(e = dataSource.entities.getById('material_wall_material_stripe')).toBeDefined();
            expect(e.wall.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.wall.material.evenColor.getValue(date)).toEqual(Color.fromBytes(119, 120, 121, 118));
            expect(e.wall.material.oddColor.getValue(date)).toEqual(Color.fromBytes(123, 124, 125, 122));
            expect(e.wall.material.offset.getValue(date)).toEqual(108.0);
            expect(e.wall.material.repeat.getValue(date)).toEqual(109.0);
            expect(e = dataSource.entities.getById('material45')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqualEpsilon(new Color(0.0431372549019608, 0.0470588235294118, 0.0509803921568627, 0.0392156862745098), 1e-14);
            expect(e = dataSource.entities.getById('material46')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqualEpsilon(new Color(0.0588235294117647, 0.0627450980392157, 0.0666666666666667, 0.0549019607843137), 1e-14);
            expect(e = dataSource.entities.getById('material47')).toBeDefined();
            expect(e.wall.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.0745098039215686, 0.0784313725490196, 0.0823529411764706, 0.0705882352941176), 1e-14);
            expect(e = dataSource.entities.getById('material48')).toBeDefined();
            expect(e.wall.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.0901960784313725, 0.0941176470588235, 0.0980392156862745, 0.0862745098039216), 1e-14);
            expect(e = dataSource.entities.getById('constant36')).toBeDefined();
            expect(e.wall.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.105882352941176, 0.109803921568627, 0.113725490196078, 0.101960784313725), 1e-14);
            expect(e = dataSource.entities.getById('constant37')).toBeDefined();
            expect(e = dataSource.entities.getById('constant38')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material49')).toBeDefined();
            expect(e = dataSource.entities.getById('material50')).toBeDefined();
            expect(e = dataSource.entities.getById('material51')).toBeDefined();
            expect(e = dataSource.entities.getById('material52')).toBeDefined();
            expect(e = dataSource.entities.getById('constant39')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material53')).toBeDefined();
            expect(e = dataSource.entities.getById('material54')).toBeDefined();
            expect(e = dataSource.entities.getById('material55')).toBeDefined();
            expect(e = dataSource.entities.getById('material56')).toBeDefined();
            expect(e = dataSource.entities.getById('constant40')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material57')).toBeDefined();
            expect(e = dataSource.entities.getById('material58')).toBeDefined();
            expect(e = dataSource.entities.getById('material59')).toBeDefined();
            expect(e = dataSource.entities.getById('material60')).toBeDefined();
            expect(e = dataSource.entities.getById('constant41')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material61')).toBeDefined();
            expect(e = dataSource.entities.getById('material62')).toBeDefined();
            expect(e = dataSource.entities.getById('material63')).toBeDefined();
            expect(e = dataSource.entities.getById('material64')).toBeDefined();
            expect(e = dataSource.entities.getById('constant42')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material65')).toBeDefined();
            expect(e = dataSource.entities.getById('material66')).toBeDefined();
            expect(e = dataSource.entities.getById('material67')).toBeDefined();
            expect(e = dataSource.entities.getById('material68')).toBeDefined();
            expect(e = dataSource.entities.getById('constant43')).toBeDefined();
            expect(e = dataSource.entities.getById('constant44')).toBeDefined();
            expect(e = dataSource.entities.getById('constant45')).toBeDefined();
            expect(e = dataSource.entities.getById('constant46')).toBeDefined();
            expect(e = dataSource.entities.getById('constant47')).toBeDefined();
            expect(e = dataSource.entities.getById('constant48')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material69')).toBeDefined();
            expect(e = dataSource.entities.getById('material70')).toBeDefined();
            expect(e = dataSource.entities.getById('material71')).toBeDefined();
            expect(e = dataSource.entities.getById('material72')).toBeDefined();
            expect(e = dataSource.entities.getById('constant49')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material73')).toBeDefined();
            expect(e = dataSource.entities.getById('material74')).toBeDefined();
            expect(e = dataSource.entities.getById('material75')).toBeDefined();
            expect(e = dataSource.entities.getById('material76')).toBeDefined();
            expect(e = dataSource.entities.getById('constant50')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material77')).toBeDefined();
            expect(e = dataSource.entities.getById('material78')).toBeDefined();
            expect(e = dataSource.entities.getById('material79')).toBeDefined();
            expect(e = dataSource.entities.getById('material80')).toBeDefined();
            expect(e = dataSource.entities.getById('constant51')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material81')).toBeDefined();
            expect(e = dataSource.entities.getById('material82')).toBeDefined();
            expect(e = dataSource.entities.getById('material83')).toBeDefined();
            expect(e = dataSource.entities.getById('material84')).toBeDefined();
            expect(e = dataSource.entities.getById('constant52')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material85')).toBeDefined();
            expect(e = dataSource.entities.getById('material86')).toBeDefined();
            expect(e = dataSource.entities.getById('material87')).toBeDefined();
            expect(e = dataSource.entities.getById('material88')).toBeDefined();
            expect(e = dataSource.entities.getById('constant53')).toBeDefined();
            expect(e = dataSource.entities.getById('constant54')).toBeDefined();
            expect(e = dataSource.entities.getById('constant55')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material89')).toBeDefined();
            expect(e = dataSource.entities.getById('material90')).toBeDefined();
            expect(e = dataSource.entities.getById('material91')).toBeDefined();
            expect(e = dataSource.entities.getById('material92')).toBeDefined();
            expect(e = dataSource.entities.getById('constant56')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material93')).toBeDefined();
            expect(e = dataSource.entities.getById('material94')).toBeDefined();
            expect(e = dataSource.entities.getById('material95')).toBeDefined();
            expect(e = dataSource.entities.getById('material96')).toBeDefined();
            expect(e = dataSource.entities.getById('constant57')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material97')).toBeDefined();
            expect(e = dataSource.entities.getById('material98')).toBeDefined();
            expect(e = dataSource.entities.getById('material99')).toBeDefined();
            expect(e = dataSource.entities.getById('material100')).toBeDefined();
            expect(e = dataSource.entities.getById('constant58')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material101')).toBeDefined();
            expect(e = dataSource.entities.getById('material102')).toBeDefined();
            expect(e = dataSource.entities.getById('material103')).toBeDefined();
            expect(e = dataSource.entities.getById('material104')).toBeDefined();
            expect(e = dataSource.entities.getById('constant59')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material105')).toBeDefined();
            expect(e = dataSource.entities.getById('material106')).toBeDefined();
            expect(e = dataSource.entities.getById('material107')).toBeDefined();
            expect(e = dataSource.entities.getById('material108')).toBeDefined();
            expect(e = dataSource.entities.getById('constant60')).toBeDefined();
            expect(e = dataSource.entities.getById('constant61')).toBeDefined();
            expect(e = dataSource.entities.getById('constant62')).toBeDefined();
            expect(e = dataSource.entities.getById('constant63')).toBeDefined();
            expect(e = dataSource.entities.getById('constant64')).toBeDefined();
            expect(e = dataSource.entities.getById('material_fan_material_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_fan_material_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_fan_material_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('material109')).toBeDefined();
            expect(e = dataSource.entities.getById('material110')).toBeDefined();
            expect(e = dataSource.entities.getById('material111')).toBeDefined();
            expect(e = dataSource.entities.getById('material112')).toBeDefined();
            expect(e = dataSource.entities.getById('constant65')).toBeDefined();
            expect(e = dataSource.entities.getById('constant66')).toBeDefined();
            expect(e = dataSource.entities.getById('constant67')).toBeDefined();
            expect(e = dataSource.entities.getById('constant68')).toBeDefined();
            expect(e = dataSource.entities.getById('constant69')).toBeDefined();
            expect(e = dataSource.entities.getById('ConstantPosition1')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(new Cartesian3(28, 29, 30));
            expect(e = dataSource.entities.getById('ConstantDouble1')).toBeDefined();
            expect(e.billboard.scale.getValue(date)).toEqual(158.0);
            expect(e = dataSource.entities.getById('ConstantPosition2')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(new Cartesian3(31, 32, 33));
            expect(e = dataSource.entities.getById('ConstantDouble2')).toBeDefined();
            expect(e.billboard.scale.getValue(date)).toEqual(159.0);
            expect(e = dataSource.entities.getById('Reference')).toBeDefined();
            expect(e.description.getValue(date)).toEqual(constant.description.getValue(date));
            expect(e.position.getValue(date)).toEqual(constant.position.getValue(date));
            expect(e.orientation.getValue(date)).toEqual(constant.orientation.getValue(date));
            expect(e.viewFrom.getValue(date)).toEqual(constant.viewFrom.getValue(date));
            expect(e.billboard.show.getValue(date)).toEqual(constant.billboard.show.getValue(date));
            expect(e.billboard.image.getValue(date)).toEqual(constant.billboard.image.getValue(date));
            expect(e.billboard.scale.getValue(date)).toEqual(constant.billboard.scale.getValue(date));
            expect(e.billboard.pixelOffset.getValue(date)).toEqual(constant.billboard.pixelOffset.getValue(date));
            expect(e.billboard.eyeOffset.getValue(date)).toEqual(constant.billboard.eyeOffset.getValue(date));
            expect(e.billboard.horizontalOrigin.getValue(date)).toEqual(constant.billboard.horizontalOrigin.getValue(date));
            expect(e.billboard.verticalOrigin.getValue(date)).toEqual(constant.billboard.verticalOrigin.getValue(date));
            expect(e.billboard.heightReference.getValue(date)).toEqual(constant.billboard.heightReference.getValue(date));
            expect(e.billboard.color.getValue(date)).toEqual(constant.billboard.color.getValue(date));
            expect(e.billboard.rotation.getValue(date)).toEqual(constant.billboard.rotation.getValue(date));
            expect(e.billboard.alignedAxis.getValue(date)).toEqual(constant.billboard.alignedAxis.getValue(date));
            expect(e.billboard.sizeInMeters.getValue(date)).toEqual(constant.billboard.sizeInMeters.getValue(date));
            expect(e.billboard.width.getValue(date)).toEqual(constant.billboard.width.getValue(date));
            expect(e.billboard.height.getValue(date)).toEqual(constant.billboard.height.getValue(date));
            expect(e.billboard.scaleByDistance.getValue(date)).toEqual(constant.billboard.scaleByDistance.getValue(date));
            expect(e.billboard.translucencyByDistance.getValue(date)).toEqual(constant.billboard.translucencyByDistance.getValue(date));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(date)).toEqual(constant.billboard.pixelOffsetScaleByDistance.getValue(date));
            expect(e.billboard.imageSubRegion.getValue(date)).toEqual(constant.billboard.imageSubRegion.getValue(date));
            expect(e.box.show.getValue(date)).toEqual(constant.box.show.getValue(date));
            expect(e.box.dimensions.getValue(date)).toEqual(constant.box.dimensions.getValue(date));
            expect(e.box.fill.getValue(date)).toEqual(constant.box.fill.getValue(date));
            expect(e.box.material.color.getValue(date)).toEqual(constant.box.material.color.getValue(date));
            expect(e.box.outline.getValue(date)).toEqual(constant.box.outline.getValue(date));
            expect(e.box.outlineColor.getValue(date)).toEqual(constant.box.outlineColor.getValue(date));
            expect(e.box.outlineWidth.getValue(date)).toEqual(constant.box.outlineWidth.getValue(date));
            expect(e.corridor.show.getValue(date)).toEqual(constant.corridor.show.getValue(date));
            expect(e.corridor.positions.getValue(date)).toEqual([dataSource.entities.getById('ConstantPosition1').position.getValue(date), dataSource.entities.getById('ConstantPosition2').position.getValue(date)]);
            expect(e.corridor.width.getValue(date)).toEqual(constant.corridor.width.getValue(date));
            expect(e.corridor.height.getValue(date)).toEqual(constant.corridor.height.getValue(date));
            expect(e.corridor.extrudedHeight.getValue(date)).toEqual(constant.corridor.extrudedHeight.getValue(date));
            expect(e.corridor.cornerType.getValue(date)).toEqual(constant.corridor.cornerType.getValue(date));
            expect(e.corridor.granularity.getValue(date)).toEqual(constant.corridor.granularity.getValue(date));
            expect(e.corridor.fill.getValue(date)).toEqual(constant.corridor.fill.getValue(date));
            expect(e.corridor.material.color.getValue(date)).toEqual(constant.corridor.material.color.getValue(date));
            expect(e.corridor.outline.getValue(date)).toEqual(constant.corridor.outline.getValue(date));
            expect(e.corridor.outlineColor.getValue(date)).toEqual(constant.corridor.outlineColor.getValue(date));
            expect(e.corridor.outlineWidth.getValue(date)).toEqual(constant.corridor.outlineWidth.getValue(date));
            expect(e.cylinder.show.getValue(date)).toEqual(constant.cylinder.show.getValue(date));
            expect(e.cylinder.length.getValue(date)).toEqual(constant.cylinder.length.getValue(date));
            expect(e.cylinder.topRadius.getValue(date)).toEqual(constant.cylinder.topRadius.getValue(date));
            expect(e.cylinder.bottomRadius.getValue(date)).toEqual(constant.cylinder.bottomRadius.getValue(date));
            expect(e.cylinder.fill.getValue(date)).toEqual(constant.cylinder.fill.getValue(date));
            expect(e.cylinder.material.color.getValue(date)).toEqual(constant.cylinder.material.color.getValue(date));
            expect(e.cylinder.outline.getValue(date)).toEqual(constant.cylinder.outline.getValue(date));
            expect(e.cylinder.outlineColor.getValue(date)).toEqual(constant.cylinder.outlineColor.getValue(date));
            expect(e.cylinder.outlineWidth.getValue(date)).toEqual(constant.cylinder.outlineWidth.getValue(date));
            expect(e.cylinder.numberOfVerticalLines.getValue(date)).toEqual(constant.cylinder.numberOfVerticalLines.getValue(date));
            expect(e.cylinder.slices.getValue(date)).toEqual(constant.cylinder.slices.getValue(date));
            expect(e.ellipse.show.getValue(date)).toEqual(constant.ellipse.show.getValue(date));
            expect(e.ellipse.semiMajorAxis.getValue(date)).toEqual(constant.ellipse.semiMajorAxis.getValue(date));
            expect(e.ellipse.semiMinorAxis.getValue(date)).toEqual(constant.ellipse.semiMinorAxis.getValue(date));
            expect(e.ellipse.height.getValue(date)).toEqual(constant.ellipse.height.getValue(date));
            expect(e.ellipse.extrudedHeight.getValue(date)).toEqual(constant.ellipse.extrudedHeight.getValue(date));
            expect(e.ellipse.rotation.getValue(date)).toEqual(constant.ellipse.rotation.getValue(date));
            expect(e.ellipse.stRotation.getValue(date)).toEqual(constant.ellipse.stRotation.getValue(date));
            expect(e.ellipse.granularity.getValue(date)).toEqual(constant.ellipse.granularity.getValue(date));
            expect(e.ellipse.fill.getValue(date)).toEqual(constant.ellipse.fill.getValue(date));
            expect(e.ellipse.material.color.getValue(date)).toEqual(constant.ellipse.material.color.getValue(date));
            expect(e.ellipse.outline.getValue(date)).toEqual(constant.ellipse.outline.getValue(date));
            expect(e.ellipse.outlineColor.getValue(date)).toEqual(constant.ellipse.outlineColor.getValue(date));
            expect(e.ellipse.outlineWidth.getValue(date)).toEqual(constant.ellipse.outlineWidth.getValue(date));
            expect(e.ellipse.numberOfVerticalLines.getValue(date)).toEqual(constant.ellipse.numberOfVerticalLines.getValue(date));
            expect(e.ellipsoid.show.getValue(date)).toEqual(constant.ellipsoid.show.getValue(date));
            expect(e.ellipsoid.radii.getValue(date)).toEqual(constant.ellipsoid.radii.getValue(date));
            expect(e.ellipsoid.fill.getValue(date)).toEqual(constant.ellipsoid.fill.getValue(date));
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(constant.ellipsoid.material.color.getValue(date));
            expect(e.ellipsoid.outline.getValue(date)).toEqual(constant.ellipsoid.outline.getValue(date));
            expect(e.ellipsoid.outlineColor.getValue(date)).toEqual(constant.ellipsoid.outlineColor.getValue(date));
            expect(e.ellipsoid.outlineWidth.getValue(date)).toEqual(constant.ellipsoid.outlineWidth.getValue(date));
            expect(e.ellipsoid.stackPartitions.getValue(date)).toEqual(constant.ellipsoid.stackPartitions.getValue(date));
            expect(e.ellipsoid.slicePartitions.getValue(date)).toEqual(constant.ellipsoid.slicePartitions.getValue(date));
            expect(e.ellipsoid.subdivisions.getValue(date)).toEqual(constant.ellipsoid.subdivisions.getValue(date));
            expect(e.label.show.getValue(date)).toEqual(constant.label.show.getValue(date));
            expect(e.label.text.getValue(date)).toEqual(constant.label.text.getValue(date));
            expect(e.label.font.getValue(date)).toEqual(constant.label.font.getValue(date));
            expect(e.label.style.getValue(date)).toEqual(constant.label.style.getValue(date));
            expect(e.label.scale.getValue(date)).toEqual(constant.label.scale.getValue(date));
            expect(e.label.pixelOffset.getValue(date)).toEqual(constant.label.pixelOffset.getValue(date));
            expect(e.label.eyeOffset.getValue(date)).toEqual(constant.label.eyeOffset.getValue(date));
            expect(e.label.horizontalOrigin.getValue(date)).toEqual(constant.label.horizontalOrigin.getValue(date));
            expect(e.label.verticalOrigin.getValue(date)).toEqual(constant.label.verticalOrigin.getValue(date));
            expect(e.label.heightReference.getValue(date)).toEqual(constant.label.heightReference.getValue(date));
            expect(e.label.fillColor.getValue(date)).toEqual(constant.label.fillColor.getValue(date));
            expect(e.label.outlineColor.getValue(date)).toEqual(constant.label.outlineColor.getValue(date));
            expect(e.label.outlineWidth.getValue(date)).toEqual(constant.label.outlineWidth.getValue(date));
            expect(e.label.translucencyByDistance.getValue(date)).toEqual(constant.label.translucencyByDistance.getValue(date));
            expect(e.label.pixelOffsetScaleByDistance.getValue(date)).toEqual(constant.label.pixelOffsetScaleByDistance.getValue(date));
            expect(e.model.show.getValue(date)).toEqual(constant.model.show.getValue(date));
            expect(e.model.uri.getValue(date)).toEqual(constant.model.uri.getValue(date));
            expect(e.model.scale.getValue(date)).toEqual(constant.model.scale.getValue(date));
            expect(e.model.minimumPixelSize.getValue(date)).toEqual(constant.model.minimumPixelSize.getValue(date));
            expect(e.model.maximumScale.getValue(date)).toEqual(constant.model.maximumScale.getValue(date));
            expect(e.model.incrementallyLoadTextures.getValue(date)).toEqual(constant.model.incrementallyLoadTextures.getValue(date));
            expect(e.model.runAnimations.getValue(date)).toEqual(constant.model.runAnimations.getValue(date));
            expect(e.model.heightReference.getValue(date)).toEqual(constant.model.heightReference.getValue(date));
            expect(e.model.nodeTransformations.referenceProp.translation.getValue(date)).toEqual(constant.model.nodeTransformations.prop.translation.getValue(date));
            expect(e.model.nodeTransformations.referenceProp.rotation.getValue(date)).toEqual(constant.model.nodeTransformations.prop.rotation.getValue(date));
            expect(e.model.nodeTransformations.referenceProp.scale.getValue(date)).toEqual(constant.model.nodeTransformations.prop.scale.getValue(date));
            expect(e.path.show.getValue(date)).toEqual(constant.path.show.getValue(date));
            expect(e.path.width.getValue(date)).toEqual(constant.path.width.getValue(date));
            expect(e.path.resolution.getValue(date)).toEqual(constant.path.resolution.getValue(date));
            expect(e.path.leadTime.getValue(date)).toEqual(constant.path.leadTime.getValue(date));
            expect(e.path.trailTime.getValue(date)).toEqual(constant.path.trailTime.getValue(date));
            expect(e.path.material.color.getValue(date)).toEqual(constant.path.material.color.getValue(date));
            expect(e.point.show.getValue(date)).toEqual(constant.point.show.getValue(date));
            expect(e.point.pixelSize.getValue(date)).toEqual(constant.point.pixelSize.getValue(date));
            expect(e.point.heightReference.getValue(date)).toEqual(constant.point.heightReference.getValue(date));
            expect(e.point.color.getValue(date)).toEqual(constant.point.color.getValue(date));
            expect(e.point.outlineColor.getValue(date)).toEqual(constant.point.outlineColor.getValue(date));
            expect(e.point.outlineWidth.getValue(date)).toEqual(constant.point.outlineWidth.getValue(date));
            expect(e.point.scaleByDistance.getValue(date)).toEqual(constant.point.scaleByDistance.getValue(date));
            expect(e.point.translucencyByDistance.getValue(date)).toEqual(constant.point.translucencyByDistance.getValue(date));
            expect(e.polygon.show.getValue(date)).toEqual(constant.polygon.show.getValue(date));
            expect(e.polygon.hierarchy.getValue(date)).toEqual([dataSource.entities.getById('ConstantPosition1').position.getValue(date), dataSource.entities.getById('ConstantPosition2').position.getValue(date)]);
            expect(e.polygon.height.getValue(date)).toEqual(constant.polygon.height.getValue(date));
            expect(e.polygon.extrudedHeight.getValue(date)).toEqual(constant.polygon.extrudedHeight.getValue(date));
            expect(e.polygon.stRotation.getValue(date)).toEqual(constant.polygon.stRotation.getValue(date));
            expect(e.polygon.granularity.getValue(date)).toEqual(constant.polygon.granularity.getValue(date));
            expect(e.polygon.fill.getValue(date)).toEqual(constant.polygon.fill.getValue(date));
            expect(e.polygon.material.color.getValue(date)).toEqual(constant.polygon.material.color.getValue(date));
            expect(e.polygon.outline.getValue(date)).toEqual(constant.polygon.outline.getValue(date));
            expect(e.polygon.outlineColor.getValue(date)).toEqual(constant.polygon.outlineColor.getValue(date));
            expect(e.polygon.outlineWidth.getValue(date)).toEqual(constant.polygon.outlineWidth.getValue(date));
            expect(e.polygon.perPositionHeight.getValue(date)).toEqual(constant.polygon.perPositionHeight.getValue(date));
            expect(e.polygon.closeTop.getValue(date)).toEqual(constant.polygon.closeTop.getValue(date));
            expect(e.polygon.closeBottom.getValue(date)).toEqual(constant.polygon.closeBottom.getValue(date));
            expect(e.polyline.show.getValue(date)).toEqual(constant.polyline.show.getValue(date));
            expect(e.polyline.positions.getValue(date)).toEqual([dataSource.entities.getById('ConstantPosition1').position.getValue(date), dataSource.entities.getById('ConstantPosition2').position.getValue(date)]);
            expect(e.polyline.width.getValue(date)).toEqual(constant.polyline.width.getValue(date));
            expect(e.polyline.granularity.getValue(date)).toEqual(constant.polyline.granularity.getValue(date));
            expect(e.polyline.material.color.getValue(date)).toEqual(constant.polyline.material.color.getValue(date));
            expect(e.polyline.followSurface.getValue(date)).toEqual(constant.polyline.followSurface.getValue(date));
            expect(e.rectangle.show.getValue(date)).toEqual(constant.rectangle.show.getValue(date));
            expect(e.rectangle.coordinates.getValue(date)).toEqual(constant.rectangle.coordinates.getValue(date));
            expect(e.rectangle.height.getValue(date)).toEqual(constant.rectangle.height.getValue(date));
            expect(e.rectangle.extrudedHeight.getValue(date)).toEqual(constant.rectangle.extrudedHeight.getValue(date));
            expect(e.rectangle.rotation.getValue(date)).toEqual(constant.rectangle.rotation.getValue(date));
            expect(e.rectangle.stRotation.getValue(date)).toEqual(constant.rectangle.stRotation.getValue(date));
            expect(e.rectangle.granularity.getValue(date)).toEqual(constant.rectangle.granularity.getValue(date));
            expect(e.rectangle.fill.getValue(date)).toEqual(constant.rectangle.fill.getValue(date));
            expect(e.rectangle.material.color.getValue(date)).toEqual(constant.rectangle.material.color.getValue(date));
            expect(e.rectangle.outline.getValue(date)).toEqual(constant.rectangle.outline.getValue(date));
            expect(e.rectangle.outlineColor.getValue(date)).toEqual(constant.rectangle.outlineColor.getValue(date));
            expect(e.rectangle.outlineWidth.getValue(date)).toEqual(constant.rectangle.outlineWidth.getValue(date));
            expect(e.rectangle.closeTop.getValue(date)).toEqual(constant.rectangle.closeTop.getValue(date));
            expect(e.rectangle.closeBottom.getValue(date)).toEqual(constant.rectangle.closeBottom.getValue(date));
            expect(e.wall.show.getValue(date)).toEqual(constant.wall.show.getValue(date));
            expect(e.wall.positions.getValue(date)).toEqual([dataSource.entities.getById('ConstantPosition1').position.getValue(date), dataSource.entities.getById('ConstantPosition2').position.getValue(date)]);
            expect(e.wall.minimumHeights.getValue(date)).toEqual([dataSource.entities.getById('ConstantDouble1').billboard.scale.getValue(date), dataSource.entities.getById('ConstantDouble2').billboard.scale.getValue(date)]);
            expect(e.wall.maximumHeights.getValue(date)).toEqual([dataSource.entities.getById('ConstantDouble1').billboard.scale.getValue(date), dataSource.entities.getById('ConstantDouble2').billboard.scale.getValue(date)]);
            expect(e.wall.granularity.getValue(date)).toEqual(constant.wall.granularity.getValue(date));
            expect(e.wall.fill.getValue(date)).toEqual(constant.wall.fill.getValue(date));
            expect(e.wall.material.color.getValue(date)).toEqual(constant.wall.material.color.getValue(date));
            expect(e.wall.outline.getValue(date)).toEqual(constant.wall.outline.getValue(date));
            expect(e.wall.outlineColor.getValue(date)).toEqual(constant.wall.outlineColor.getValue(date));
            expect(e.wall.outlineWidth.getValue(date)).toEqual(constant.wall.outlineWidth.getValue(date));
            expect(e = dataSource.entities.getById('reference1')).toBeDefined();
            expect(e.box.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.image.getValue(date));
            expect(e.box.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.repeat.getValue(date));
            expect(e.box.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.color.getValue(date));
            expect(e.box.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference2')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.color.getValue(date));
            expect(e.box.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.cellAlpha.getValue(date));
            expect(e.box.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.lineCount.getValue(date));
            expect(e.box.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.lineThickness.getValue(date));
            expect(e.box.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference3')).toBeDefined();
            expect(e.box.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.orientation.getValue(date));
            expect(e.box.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.evenColor.getValue(date));
            expect(e.box.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.oddColor.getValue(date));
            expect(e.box.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.offset.getValue(date));
            expect(e.box.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference4')).toBeDefined();
            expect(e.corridor.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.image.getValue(date));
            expect(e.corridor.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.repeat.getValue(date));
            expect(e.corridor.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.color.getValue(date));
            expect(e.corridor.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference5')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.color.getValue(date));
            expect(e.corridor.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.cellAlpha.getValue(date));
            expect(e.corridor.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.lineCount.getValue(date));
            expect(e.corridor.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.lineThickness.getValue(date));
            expect(e.corridor.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference6')).toBeDefined();
            expect(e.corridor.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.orientation.getValue(date));
            expect(e.corridor.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.evenColor.getValue(date));
            expect(e.corridor.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.oddColor.getValue(date));
            expect(e.corridor.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.offset.getValue(date));
            expect(e.corridor.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference7')).toBeDefined();
            expect(e.cylinder.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.image.getValue(date));
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.repeat.getValue(date));
            expect(e.cylinder.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.color.getValue(date));
            expect(e.cylinder.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference8')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.color.getValue(date));
            expect(e.cylinder.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.cellAlpha.getValue(date));
            expect(e.cylinder.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.lineCount.getValue(date));
            expect(e.cylinder.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.lineThickness.getValue(date));
            expect(e.cylinder.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference9')).toBeDefined();
            expect(e.cylinder.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.orientation.getValue(date));
            expect(e.cylinder.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.evenColor.getValue(date));
            expect(e.cylinder.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.oddColor.getValue(date));
            expect(e.cylinder.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.offset.getValue(date));
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference10')).toBeDefined();
            expect(e.ellipse.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.image.getValue(date));
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.repeat.getValue(date));
            expect(e.ellipse.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.color.getValue(date));
            expect(e.ellipse.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference11')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.color.getValue(date));
            expect(e.ellipse.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.cellAlpha.getValue(date));
            expect(e.ellipse.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.lineCount.getValue(date));
            expect(e.ellipse.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.lineThickness.getValue(date));
            expect(e.ellipse.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference12')).toBeDefined();
            expect(e.ellipse.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.orientation.getValue(date));
            expect(e.ellipse.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.evenColor.getValue(date));
            expect(e.ellipse.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.oddColor.getValue(date));
            expect(e.ellipse.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.offset.getValue(date));
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference13')).toBeDefined();
            expect(e.ellipsoid.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.image.getValue(date));
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.repeat.getValue(date));
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.color.getValue(date));
            expect(e.ellipsoid.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference14')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.color.getValue(date));
            expect(e.ellipsoid.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.cellAlpha.getValue(date));
            expect(e.ellipsoid.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.lineCount.getValue(date));
            expect(e.ellipsoid.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.lineThickness.getValue(date));
            expect(e.ellipsoid.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference15')).toBeDefined();
            expect(e.ellipsoid.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.orientation.getValue(date));
            expect(e.ellipsoid.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.evenColor.getValue(date));
            expect(e.ellipsoid.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.oddColor.getValue(date));
            expect(e.ellipsoid.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.offset.getValue(date));
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference16')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineOutline').path.material.color.getValue(date));
            expect(e.path.material.outlineColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineOutline').path.material.outlineColor.getValue(date));
            expect(e.path.material.outlineWidth.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineOutline').path.material.outlineWidth.getValue(date));
            expect(e = dataSource.entities.getById('reference17')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineArrow').path.material.color.getValue(date));
            expect(e = dataSource.entities.getById('reference18')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineGlow').path.material.color.getValue(date));
            expect(e.path.material.glowPower.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineGlow').path.material.glowPower.getValue(date));
            expect(e = dataSource.entities.getById('reference19')).toBeDefined();
            expect(e.path.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.image.getValue(date));
            expect(e.path.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.repeat.getValue(date));
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.color.getValue(date));
            expect(e.path.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference20')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.color.getValue(date));
            expect(e.path.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.cellAlpha.getValue(date));
            expect(e.path.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.lineCount.getValue(date));
            expect(e.path.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.lineThickness.getValue(date));
            expect(e.path.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference21')).toBeDefined();
            expect(e.path.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.orientation.getValue(date));
            expect(e.path.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.evenColor.getValue(date));
            expect(e.path.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.oddColor.getValue(date));
            expect(e.path.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.offset.getValue(date));
            expect(e.path.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference22')).toBeDefined();
            expect(e.polygon.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.image.getValue(date));
            expect(e.polygon.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.repeat.getValue(date));
            expect(e.polygon.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.color.getValue(date));
            expect(e.polygon.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference23')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.color.getValue(date));
            expect(e.polygon.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.cellAlpha.getValue(date));
            expect(e.polygon.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.lineCount.getValue(date));
            expect(e.polygon.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.lineThickness.getValue(date));
            expect(e.polygon.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference24')).toBeDefined();
            expect(e.polygon.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.orientation.getValue(date));
            expect(e.polygon.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.evenColor.getValue(date));
            expect(e.polygon.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.oddColor.getValue(date));
            expect(e.polygon.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.offset.getValue(date));
            expect(e.polygon.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference25')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineOutline').polyline.material.color.getValue(date));
            expect(e.polyline.material.outlineColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineOutline').polyline.material.outlineColor.getValue(date));
            expect(e.polyline.material.outlineWidth.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineOutline').polyline.material.outlineWidth.getValue(date));
            expect(e = dataSource.entities.getById('reference26')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineArrow').polyline.material.color.getValue(date));
            expect(e = dataSource.entities.getById('reference27')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineGlow').polyline.material.color.getValue(date));
            expect(e.polyline.material.glowPower.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineGlow').polyline.material.glowPower.getValue(date));
            expect(e = dataSource.entities.getById('reference28')).toBeDefined();
            expect(e.polyline.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.image.getValue(date));
            expect(e.polyline.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.repeat.getValue(date));
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.color.getValue(date));
            expect(e.polyline.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference29')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.color.getValue(date));
            expect(e.polyline.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.cellAlpha.getValue(date));
            expect(e.polyline.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.lineCount.getValue(date));
            expect(e.polyline.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.lineThickness.getValue(date));
            expect(e.polyline.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference30')).toBeDefined();
            expect(e.polyline.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.orientation.getValue(date));
            expect(e.polyline.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.evenColor.getValue(date));
            expect(e.polyline.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.oddColor.getValue(date));
            expect(e.polyline.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.offset.getValue(date));
            expect(e.polyline.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference31')).toBeDefined();
            expect(e.rectangle.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.image.getValue(date));
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.repeat.getValue(date));
            expect(e.rectangle.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.color.getValue(date));
            expect(e.rectangle.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference32')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.color.getValue(date));
            expect(e.rectangle.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.cellAlpha.getValue(date));
            expect(e.rectangle.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.lineCount.getValue(date));
            expect(e.rectangle.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.lineThickness.getValue(date));
            expect(e.rectangle.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference33')).toBeDefined();
            expect(e.rectangle.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.orientation.getValue(date));
            expect(e.rectangle.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.evenColor.getValue(date));
            expect(e.rectangle.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.oddColor.getValue(date));
            expect(e.rectangle.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.offset.getValue(date));
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference34')).toBeDefined();
            expect(e.wall.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.image.getValue(date));
            expect(e.wall.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.repeat.getValue(date));
            expect(e.wall.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.color.getValue(date));
            expect(e.wall.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference35')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.color.getValue(date));
            expect(e.wall.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.cellAlpha.getValue(date));
            expect(e.wall.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.lineCount.getValue(date));
            expect(e.wall.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.lineThickness.getValue(date));
            expect(e.wall.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference36')).toBeDefined();
            expect(e.wall.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.orientation.getValue(date));
            expect(e.wall.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.evenColor.getValue(date));
            expect(e.wall.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.oddColor.getValue(date));
            expect(e.wall.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.offset.getValue(date));
            expect(e.wall.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference37')).toBeDefined();
            expect(e = dataSource.entities.getById('reference38')).toBeDefined();
            expect(e = dataSource.entities.getById('reference39')).toBeDefined();
            expect(e = dataSource.entities.getById('reference40')).toBeDefined();
            expect(e = dataSource.entities.getById('reference41')).toBeDefined();
            expect(e = dataSource.entities.getById('reference42')).toBeDefined();
            expect(e = dataSource.entities.getById('reference43')).toBeDefined();
            expect(e = dataSource.entities.getById('reference44')).toBeDefined();
            expect(e = dataSource.entities.getById('reference45')).toBeDefined();
            expect(e = dataSource.entities.getById('reference46')).toBeDefined();
            expect(e = dataSource.entities.getById('reference47')).toBeDefined();
            expect(e = dataSource.entities.getById('reference48')).toBeDefined();
            expect(e = dataSource.entities.getById('reference49')).toBeDefined();
            expect(e = dataSource.entities.getById('reference50')).toBeDefined();
            expect(e = dataSource.entities.getById('reference51')).toBeDefined();
            expect(e = dataSource.entities.getById('reference52')).toBeDefined();
            expect(e = dataSource.entities.getById('reference53')).toBeDefined();
            expect(e = dataSource.entities.getById('reference54')).toBeDefined();
            expect(e = dataSource.entities.getById('reference55')).toBeDefined();
            expect(e = dataSource.entities.getById('reference56')).toBeDefined();
            expect(e = dataSource.entities.getById('reference57')).toBeDefined();
            expect(e = dataSource.entities.getById('reference58')).toBeDefined();
            expect(e = dataSource.entities.getById('reference59')).toBeDefined();
            expect(e = dataSource.entities.getById('reference60')).toBeDefined();
            expect(e = dataSource.entities.getById('reference61')).toBeDefined();
            expect(e = dataSource.entities.getById('reference62')).toBeDefined();
            expect(e = dataSource.entities.getById('reference63')).toBeDefined();
            expect(e = dataSource.entities.getById('reference64')).toBeDefined();
            expect(e = dataSource.entities.getById('reference65')).toBeDefined();
            expect(e = dataSource.entities.getById('reference66')).toBeDefined();
            expect(e = dataSource.entities.getById('reference67')).toBeDefined();
            expect(e = dataSource.entities.getById('reference68')).toBeDefined();
            expect(e = dataSource.entities.getById('reference69')).toBeDefined();
            expect(e = dataSource.entities.getById('reference70')).toBeDefined();
            expect(e = dataSource.entities.getById('reference71')).toBeDefined();
            expect(e = dataSource.entities.getById('reference72')).toBeDefined();
            expect(e = dataSource.entities.getById('reference73')).toBeDefined();
            expect(e = dataSource.entities.getById('reference74')).toBeDefined();
            expect(e = dataSource.entities.getById('reference75')).toBeDefined();
            expect(e = dataSource.entities.getById('reference76')).toBeDefined();
            expect(e = dataSource.entities.getById('reference77')).toBeDefined();
            expect(e = dataSource.entities.getById('reference78')).toBeDefined();
            expect(e = dataSource.entities.getById('reference79')).toBeDefined();
            expect(e = dataSource.entities.getById('reference80')).toBeDefined();
            expect(e = dataSource.entities.getById('reference81')).toBeDefined();
            expect(e = dataSource.entities.getById('reference82')).toBeDefined();
            expect(e = dataSource.entities.getById('reference83')).toBeDefined();
            expect(e = dataSource.entities.getById('reference84')).toBeDefined();
            expect(e = dataSource.entities.getById('VelocityPosition')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(new Cartesian3(1, 2, 3));
            expect(e.position.getValue(JulianDate.addSeconds(documentStartDate, 60, new JulianDate()))).toEqual(new Cartesian3(61, 122, 183));
            expect(e = dataSource.entities.getById('velocityReference1')).toBeDefined();
            expect(e.billboard.alignedAxis.getValue(JulianDate.addSeconds(documentStartDate, 50, new JulianDate()))).toEqualEpsilon(new Cartesian3(0.267261241912424, 0.534522483824849, 0.801783725737273), 1e-13);
            expect(e = dataSource.entities.getById('Sampled')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(new Cartesian3(34, 35, 36));
            expect(e.position.getValue(documentStopDate)).toEqual(new Cartesian3(37, 38, 39));
            expect(e.orientation.getValue(documentStartDate)).toEqualEpsilon(new Quaternion(0.473513723810378, 0.520865096191416, 0.568216468572454, 0.426162351429341), 1e-14);
            expect(e.orientation.getValue(documentStopDate)).toEqualEpsilon(new Quaternion(0.48132991492077, 0.515710623129397, 0.550091331338023, 0.446949206712144), 1e-14);
            expect(e.viewFrom.getValue(documentStartDate)).toEqual(new Cartesian3(40, 41, 42));
            expect(e.viewFrom.getValue(documentStopDate)).toEqual(new Cartesian3(43, 44, 45));
            expect(e.billboard.scale.getValue(documentStartDate)).toEqual(160.0);
            expect(e.billboard.scale.getValue(documentStopDate)).toEqual(161.0);
            expect(e.billboard.pixelOffset.getValue(documentStartDate)).toEqual(new Cartesian2(213, 214));
            expect(e.billboard.pixelOffset.getValue(documentStopDate)).toEqual(new Cartesian2(215, 216));
            expect(e.billboard.eyeOffset.getValue(documentStartDate)).toEqual(new Cartesian3(46, 47, 48));
            expect(e.billboard.eyeOffset.getValue(documentStopDate)).toEqual(new Cartesian3(49, 50, 51));
            expect(e.billboard.color.getValue(documentStartDate)).toEqual(Color.fromBytes(128, 129, 130, 127));
            expect(e.billboard.color.getValue(documentStopDate)).toEqual(Color.fromBytes(132, 133, 134, 131));
            expect(e.billboard.rotation.getValue(documentStartDate)).toEqual(162.0);
            expect(e.billboard.rotation.getValue(documentStopDate)).toEqual(163.0);
            expect(e.billboard.alignedAxis.getValue(documentStartDate)).toEqualEpsilon(new Cartesian3(0.502570711032417, 0.574366526894191, 0.646162342755964), 1e-14);
            expect(e.billboard.alignedAxis.getValue(documentStopDate)).toEqualEpsilon(new Cartesian3(0.523423922590214, 0.575766314849235, 0.628108707108257), 1e-14);
            expect(e.billboard.width.getValue(documentStartDate)).toEqual(164.0);
            expect(e.billboard.width.getValue(documentStopDate)).toEqual(165.0);
            expect(e.billboard.height.getValue(documentStartDate)).toEqual(166.0);
            expect(e.billboard.height.getValue(documentStopDate)).toEqual(167.0);
            expect(e.billboard.scaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(29, 30, 31, 32));
            expect(e.billboard.scaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(33, 34, 35, 36));
            expect(e.billboard.translucencyByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(37, 38, 39, 40));
            expect(e.billboard.translucencyByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(41, 42, 43, 44));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(45, 46, 47, 48));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(49, 50, 51, 52));
            expect(e.billboard.imageSubRegion.getValue(documentStartDate)).toEqual(new BoundingRectangle(5, 6, 7, 8));
            expect(e.billboard.imageSubRegion.getValue(documentStopDate)).toEqual(new BoundingRectangle(9, 10, 11, 12));
            expect(e.box.dimensions.getValue(documentStartDate)).toEqual(new Cartesian3(52, 53, 54));
            expect(e.box.dimensions.getValue(documentStopDate)).toEqual(new Cartesian3(55, 56, 57));
            expect(e.box.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(136, 137, 138, 135));
            expect(e.box.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(140, 141, 142, 139));
            expect(e.box.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(144, 145, 146, 143));
            expect(e.box.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(148, 149, 150, 147));
            expect(e.box.outlineWidth.getValue(documentStartDate)).toEqual(168.0);
            expect(e.box.outlineWidth.getValue(documentStopDate)).toEqual(169.0);
            expect(e.corridor.width.getValue(documentStartDate)).toEqual(170.0);
            expect(e.corridor.width.getValue(documentStopDate)).toEqual(171.0);
            expect(e.corridor.height.getValue(documentStartDate)).toEqual(172.0);
            expect(e.corridor.height.getValue(documentStopDate)).toEqual(173.0);
            expect(e.corridor.extrudedHeight.getValue(documentStartDate)).toEqual(174.0);
            expect(e.corridor.extrudedHeight.getValue(documentStopDate)).toEqual(175.0);
            expect(e.corridor.granularity.getValue(documentStartDate)).toEqual(176.0);
            expect(e.corridor.granularity.getValue(documentStopDate)).toEqual(177.0);
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(152, 153, 154, 151));
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(156, 157, 158, 155));
            expect(e.corridor.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(160, 161, 162, 159));
            expect(e.corridor.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(164, 165, 166, 163));
            expect(e.corridor.outlineWidth.getValue(documentStartDate)).toEqual(178.0);
            expect(e.corridor.outlineWidth.getValue(documentStopDate)).toEqual(179.0);
            expect(e.cylinder.length.getValue(documentStartDate)).toEqual(180.0);
            expect(e.cylinder.length.getValue(documentStopDate)).toEqual(181.0);
            expect(e.cylinder.topRadius.getValue(documentStartDate)).toEqual(182.0);
            expect(e.cylinder.topRadius.getValue(documentStopDate)).toEqual(183.0);
            expect(e.cylinder.bottomRadius.getValue(documentStartDate)).toEqual(184.0);
            expect(e.cylinder.bottomRadius.getValue(documentStopDate)).toEqual(185.0);
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(168, 169, 170, 167));
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(172, 173, 174, 171));
            expect(e.cylinder.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(176, 177, 178, 175));
            expect(e.cylinder.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(180, 181, 182, 179));
            expect(e.cylinder.outlineWidth.getValue(documentStartDate)).toEqual(186.0);
            expect(e.cylinder.outlineWidth.getValue(documentStopDate)).toEqual(187.0);
            expect(e.cylinder.numberOfVerticalLines.getValue(documentStartDate)).toEqual(188.0);
            expect(e.cylinder.numberOfVerticalLines.getValue(documentStopDate)).toEqual(189.0);
            expect(e.cylinder.slices.getValue(documentStartDate)).toEqual(190.0);
            expect(e.cylinder.slices.getValue(documentStopDate)).toEqual(191.0);
            expect(e.ellipse.semiMajorAxis.getValue(documentStartDate)).toEqual(192.0);
            expect(e.ellipse.semiMajorAxis.getValue(documentStopDate)).toEqual(193.0);
            expect(e.ellipse.semiMinorAxis.getValue(documentStartDate)).toEqual(194.0);
            expect(e.ellipse.semiMinorAxis.getValue(documentStopDate)).toEqual(195.0);
            expect(e.ellipse.height.getValue(documentStartDate)).toEqual(196.0);
            expect(e.ellipse.height.getValue(documentStopDate)).toEqual(197.0);
            expect(e.ellipse.extrudedHeight.getValue(documentStartDate)).toEqual(198.0);
            expect(e.ellipse.extrudedHeight.getValue(documentStopDate)).toEqual(199.0);
            expect(e.ellipse.rotation.getValue(documentStartDate)).toEqual(200.0);
            expect(e.ellipse.rotation.getValue(documentStopDate)).toEqual(201.0);
            expect(e.ellipse.stRotation.getValue(documentStartDate)).toEqual(202.0);
            expect(e.ellipse.stRotation.getValue(documentStopDate)).toEqual(203.0);
            expect(e.ellipse.granularity.getValue(documentStartDate)).toEqual(204.0);
            expect(e.ellipse.granularity.getValue(documentStopDate)).toEqual(205.0);
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(184, 185, 186, 183));
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(188, 189, 190, 187));
            expect(e.ellipse.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(192, 193, 194, 191));
            expect(e.ellipse.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(196, 197, 198, 195));
            expect(e.ellipse.outlineWidth.getValue(documentStartDate)).toEqual(206.0);
            expect(e.ellipse.outlineWidth.getValue(documentStopDate)).toEqual(207.0);
            expect(e.ellipse.numberOfVerticalLines.getValue(documentStartDate)).toEqual(208.0);
            expect(e.ellipse.numberOfVerticalLines.getValue(documentStopDate)).toEqual(209.0);
            expect(e.ellipsoid.radii.getValue(documentStartDate)).toEqual(new Cartesian3(58, 59, 60));
            expect(e.ellipsoid.radii.getValue(documentStopDate)).toEqual(new Cartesian3(61, 62, 63));
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(200, 201, 202, 199));
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(204, 205, 206, 203));
            expect(e.ellipsoid.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(208, 209, 210, 207));
            expect(e.ellipsoid.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(212, 213, 214, 211));
            expect(e.ellipsoid.outlineWidth.getValue(documentStartDate)).toEqual(210.0);
            expect(e.ellipsoid.outlineWidth.getValue(documentStopDate)).toEqual(211.0);
            expect(e.ellipsoid.stackPartitions.getValue(documentStartDate)).toEqual(212.0);
            expect(e.ellipsoid.stackPartitions.getValue(documentStopDate)).toEqual(213.0);
            expect(e.ellipsoid.slicePartitions.getValue(documentStartDate)).toEqual(214.0);
            expect(e.ellipsoid.slicePartitions.getValue(documentStopDate)).toEqual(215.0);
            expect(e.ellipsoid.subdivisions.getValue(documentStartDate)).toEqual(216.0);
            expect(e.ellipsoid.subdivisions.getValue(documentStopDate)).toEqual(217.0);
            expect(e.label.scale.getValue(documentStartDate)).toEqual(218.0);
            expect(e.label.scale.getValue(documentStopDate)).toEqual(219.0);
            expect(e.label.pixelOffset.getValue(documentStartDate)).toEqual(new Cartesian2(217, 218));
            expect(e.label.pixelOffset.getValue(documentStopDate)).toEqual(new Cartesian2(219, 220));
            expect(e.label.eyeOffset.getValue(documentStartDate)).toEqual(new Cartesian3(64, 65, 66));
            expect(e.label.eyeOffset.getValue(documentStopDate)).toEqual(new Cartesian3(67, 68, 69));
            expect(e.label.fillColor.getValue(documentStartDate)).toEqual(Color.fromBytes(216, 217, 218, 215));
            expect(e.label.fillColor.getValue(documentStopDate)).toEqual(Color.fromBytes(220, 221, 222, 219));
            expect(e.label.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(224, 225, 226, 223));
            expect(e.label.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(228, 229, 230, 227));
            expect(e.label.outlineWidth.getValue(documentStartDate)).toEqual(220.0);
            expect(e.label.outlineWidth.getValue(documentStopDate)).toEqual(221.0);
            expect(e.label.translucencyByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(53, 54, 55, 56));
            expect(e.label.translucencyByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(57, 58, 59, 60));
            expect(e.label.pixelOffsetScaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(61, 62, 63, 64));
            expect(e.label.pixelOffsetScaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(65, 66, 67, 68));
            expect(e.model.scale.getValue(documentStartDate)).toEqual(222.0);
            expect(e.model.scale.getValue(documentStopDate)).toEqual(223.0);
            expect(e.model.minimumPixelSize.getValue(documentStartDate)).toEqual(224.0);
            expect(e.model.minimumPixelSize.getValue(documentStopDate)).toEqual(225.0);
            expect(e.model.maximumScale.getValue(documentStartDate)).toEqual(226.0);
            expect(e.model.maximumScale.getValue(documentStopDate)).toEqual(227.0);
            expect(e.path.width.getValue(documentStartDate)).toEqual(228.0);
            expect(e.path.width.getValue(documentStopDate)).toEqual(229.0);
            expect(e.path.resolution.getValue(documentStartDate)).toEqual(230.0);
            expect(e.path.resolution.getValue(documentStopDate)).toEqual(231.0);
            expect(e.path.leadTime.getValue(documentStartDate)).toEqual(232.0);
            expect(e.path.leadTime.getValue(documentStopDate)).toEqual(233.0);
            expect(e.path.trailTime.getValue(documentStartDate)).toEqual(234.0);
            expect(e.path.trailTime.getValue(documentStopDate)).toEqual(235.0);
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(232, 233, 234, 231));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(236, 237, 238, 235));
            expect(e.point.pixelSize.getValue(documentStartDate)).toEqual(236.0);
            expect(e.point.pixelSize.getValue(documentStopDate)).toEqual(237.0);
            expect(e.point.color.getValue(documentStartDate)).toEqual(Color.fromBytes(240, 241, 242, 239));
            expect(e.point.color.getValue(documentStopDate)).toEqual(Color.fromBytes(244, 245, 246, 243));
            expect(e.point.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(248, 249, 250, 247));
            expect(e.point.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(252, 253, 254, 251));
            expect(e.point.outlineWidth.getValue(documentStartDate)).toEqual(238.0);
            expect(e.point.outlineWidth.getValue(documentStopDate)).toEqual(239.0);
            expect(e.point.scaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(69, 70, 71, 72));
            expect(e.point.scaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(73, 74, 75, 76));
            expect(e.point.translucencyByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(77, 78, 79, 80));
            expect(e.point.translucencyByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(81, 82, 83, 84));
            expect(e.polygon.height.getValue(documentStartDate)).toEqual(240.0);
            expect(e.polygon.height.getValue(documentStopDate)).toEqual(241.0);
            expect(e.polygon.extrudedHeight.getValue(documentStartDate)).toEqual(242.0);
            expect(e.polygon.extrudedHeight.getValue(documentStopDate)).toEqual(243.0);
            expect(e.polygon.stRotation.getValue(documentStartDate)).toEqual(244.0);
            expect(e.polygon.stRotation.getValue(documentStopDate)).toEqual(245.0);
            expect(e.polygon.granularity.getValue(documentStartDate)).toEqual(246.0);
            expect(e.polygon.granularity.getValue(documentStopDate)).toEqual(247.0);
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(1, 2, 3, 0));
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(5, 6, 7, 4));
            expect(e.polygon.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(9, 10, 11, 8));
            expect(e.polygon.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(13, 14, 15, 12));
            expect(e.polygon.outlineWidth.getValue(documentStartDate)).toEqual(248.0);
            expect(e.polygon.outlineWidth.getValue(documentStopDate)).toEqual(249.0);
            expect(e.polyline.width.getValue(documentStartDate)).toEqual(250.0);
            expect(e.polyline.width.getValue(documentStopDate)).toEqual(251.0);
            expect(e.polyline.granularity.getValue(documentStartDate)).toEqual(252.0);
            expect(e.polyline.granularity.getValue(documentStopDate)).toEqual(253.0);
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(17, 18, 19, 16));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(21, 22, 23, 20));
            expect(e.rectangle.coordinates.getValue(documentStartDate)).toEqual(new Rectangle(1.14601836602552, 0.575222039230621, 0.00442571243572409, 1.00442571243572));
            expect(e.rectangle.coordinates.getValue(documentStopDate)).toEqual(new Rectangle(0.433629385640828, 1.43362938564083, 0.862833058845931, 0.292036732051034));
            expect(e.rectangle.height.getValue(documentStartDate)).toEqual(254.0);
            expect(e.rectangle.height.getValue(documentStopDate)).toEqual(255.0);
            expect(e.rectangle.extrudedHeight.getValue(documentStartDate)).toEqual(256.0);
            expect(e.rectangle.extrudedHeight.getValue(documentStopDate)).toEqual(257.0);
            expect(e.rectangle.rotation.getValue(documentStartDate)).toEqual(258.0);
            expect(e.rectangle.rotation.getValue(documentStopDate)).toEqual(259.0);
            expect(e.rectangle.stRotation.getValue(documentStartDate)).toEqual(260.0);
            expect(e.rectangle.stRotation.getValue(documentStopDate)).toEqual(261.0);
            expect(e.rectangle.granularity.getValue(documentStartDate)).toEqual(262.0);
            expect(e.rectangle.granularity.getValue(documentStopDate)).toEqual(263.0);
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(25, 26, 27, 24));
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(29, 30, 31, 28));
            expect(e.rectangle.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(33, 34, 35, 32));
            expect(e.rectangle.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(37, 38, 39, 36));
            expect(e.rectangle.outlineWidth.getValue(documentStartDate)).toEqual(264.0);
            expect(e.rectangle.outlineWidth.getValue(documentStopDate)).toEqual(265.0);
            expect(e.wall.granularity.getValue(documentStartDate)).toEqual(266.0);
            expect(e.wall.granularity.getValue(documentStopDate)).toEqual(267.0);
            expect(e.wall.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(41, 42, 43, 40));
            expect(e.wall.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(45, 46, 47, 44));
            expect(e.wall.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(49, 50, 51, 48));
            expect(e.wall.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(53, 54, 55, 52));
            expect(e.wall.outlineWidth.getValue(documentStartDate)).toEqual(268.0);
            expect(e.wall.outlineWidth.getValue(documentStopDate)).toEqual(269.0);
            expect(e = dataSource.entities.getById('sampled1')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(Cartesian3.fromRadians(0.716814692820414, 0.146018366025517, 9));
            expect(e.position.getValue(documentStopDate)).toEqual(Cartesian3.fromRadians(0.575222039230621, 0.00442571243572409, 12));
            expect(e = dataSource.entities.getById('sampled2')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(Cartesian3.fromDegrees(13, 14, 15));
            expect(e.position.getValue(documentStopDate)).toEqual(Cartesian3.fromDegrees(16, 17, 18));
            expect(e = dataSource.entities.getById('sampled3')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(new Cartesian3(7, 8, 9));
            expect(e.position.getValue(documentStopDate)).toEqual(new Cartesian3(13, 14, 15));
            expect(e = dataSource.entities.getById('sampled4')).toBeDefined();
            expect(e.billboard.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.501960784313725, 0.505882352941176, 0.509803921568627, 0.498039215686275), 1e-14);
            expect(e.billboard.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.517647058823529, 0.52156862745098, 0.525490196078431, 0.513725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled5')).toBeDefined();
            expect(e.billboard.alignedAxis.getValue(documentStartDate)).toEqual(Cartesian3.fromSpherical(new Spherical(5, 6)));
            expect(e.billboard.alignedAxis.getValue(documentStopDate)).toEqual(Cartesian3.fromSpherical(new Spherical(7, 8)));
            expect(e = dataSource.entities.getById('sampled6')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.533333333333333, 0.537254901960784, 0.541176470588235, 0.529411764705882), 1e-14);
            expect(e.box.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.549019607843137, 0.552941176470588, 0.556862745098039, 0.545098039215686), 1e-14);
            expect(e = dataSource.entities.getById('sampled7')).toBeDefined();
            expect(e.box.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(221, 222));
            expect(e.box.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(223, 224));
            expect(e.box.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(249, 250, 251, 248));
            expect(e.box.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(253, 254, 0, 252));
            expect(e = dataSource.entities.getById('sampled8')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(2, 3, 4, 1));
            expect(e.box.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(6, 7, 8, 5));
            expect(e.box.material.cellAlpha.getValue(documentStartDate)).toEqual(310.0);
            expect(e.box.material.cellAlpha.getValue(documentStopDate)).toEqual(311.0);
            expect(e.box.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(225, 226));
            expect(e.box.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(227, 228));
            expect(e.box.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(229, 230));
            expect(e.box.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(231, 232));
            expect(e.box.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(233, 234));
            expect(e.box.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(235, 236));
            expect(e = dataSource.entities.getById('sampled9')).toBeDefined();
            expect(e.box.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(10, 11, 12, 9));
            expect(e.box.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(14, 15, 16, 13));
            expect(e.box.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(18, 19, 20, 17));
            expect(e.box.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(22, 23, 24, 21));
            expect(e.box.material.offset.getValue(documentStartDate)).toEqual(312.0);
            expect(e.box.material.offset.getValue(documentStopDate)).toEqual(313.0);
            expect(e.box.material.repeat.getValue(documentStartDate)).toEqual(314.0);
            expect(e.box.material.repeat.getValue(documentStopDate)).toEqual(315.0);
            expect(e = dataSource.entities.getById('sampled10')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.564705882352941, 0.568627450980392, 0.572549019607843, 0.56078431372549), 1e-14);
            expect(e.box.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.580392156862745, 0.584313725490196, 0.588235294117647, 0.576470588235294), 1e-14);
            expect(e = dataSource.entities.getById('sampled11')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.596078431372549, 0.6, 0.603921568627451, 0.592156862745098), 1e-14);
            expect(e.box.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.611764705882353, 0.615686274509804, 0.619607843137255, 0.607843137254902), 1e-14);
            expect(e = dataSource.entities.getById('sampled12')).toBeDefined();
            expect(e.box.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.627450980392157, 0.631372549019608, 0.635294117647059, 0.623529411764706), 1e-14);
            expect(e.box.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.643137254901961, 0.647058823529412, 0.650980392156863, 0.63921568627451), 1e-14);
            expect(e = dataSource.entities.getById('sampled13')).toBeDefined();
            expect(e.box.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.658823529411765, 0.662745098039216, 0.666666666666667, 0.654901960784314), 1e-14);
            expect(e.box.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.674509803921569, 0.67843137254902, 0.682352941176471, 0.670588235294118), 1e-14);
            expect(e = dataSource.entities.getById('sampled14')).toBeDefined();
            expect(e.box.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.690196078431373, 0.694117647058824, 0.698039215686274, 0.686274509803922), 1e-14);
            expect(e.box.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.705882352941177, 0.709803921568627, 0.713725490196078, 0.701960784313725), 1e-14);
            expect(e = dataSource.entities.getById('sampled15')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.72156862745098, 0.725490196078431, 0.729411764705882, 0.717647058823529), 1e-14);
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.737254901960784, 0.741176470588235, 0.745098039215686, 0.733333333333333), 1e-14);
            expect(e = dataSource.entities.getById('sampled16')).toBeDefined();
            expect(e.corridor.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(237, 238));
            expect(e.corridor.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(239, 240));
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(26, 27, 28, 25));
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(30, 31, 32, 29));
            expect(e = dataSource.entities.getById('sampled17')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(34, 35, 36, 33));
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(38, 39, 40, 37));
            expect(e.corridor.material.cellAlpha.getValue(documentStartDate)).toEqual(316.0);
            expect(e.corridor.material.cellAlpha.getValue(documentStopDate)).toEqual(317.0);
            expect(e.corridor.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(241, 242));
            expect(e.corridor.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(243, 244));
            expect(e.corridor.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(245, 246));
            expect(e.corridor.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(247, 248));
            expect(e.corridor.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(249, 250));
            expect(e.corridor.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(251, 252));
            expect(e = dataSource.entities.getById('sampled18')).toBeDefined();
            expect(e.corridor.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(42, 43, 44, 41));
            expect(e.corridor.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(46, 47, 48, 45));
            expect(e.corridor.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(50, 51, 52, 49));
            expect(e.corridor.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(54, 55, 56, 53));
            expect(e.corridor.material.offset.getValue(documentStartDate)).toEqual(318.0);
            expect(e.corridor.material.offset.getValue(documentStopDate)).toEqual(319.0);
            expect(e.corridor.material.repeat.getValue(documentStartDate)).toEqual(320.0);
            expect(e.corridor.material.repeat.getValue(documentStopDate)).toEqual(321.0);
            expect(e = dataSource.entities.getById('sampled19')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.752941176470588, 0.756862745098039, 0.76078431372549, 0.749019607843137), 1e-14);
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.768627450980392, 0.772549019607843, 0.776470588235294, 0.764705882352941), 1e-14);
            expect(e = dataSource.entities.getById('sampled20')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.784313725490196, 0.788235294117647, 0.792156862745098, 0.780392156862745), 1e-14);
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.8, 0.803921568627451, 0.807843137254902, 0.796078431372549), 1e-14);
            expect(e = dataSource.entities.getById('sampled21')).toBeDefined();
            expect(e.corridor.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.815686274509804, 0.819607843137255, 0.823529411764706, 0.811764705882353), 1e-14);
            expect(e.corridor.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.831372549019608, 0.835294117647059, 0.83921568627451, 0.827450980392157), 1e-14);
            expect(e = dataSource.entities.getById('sampled22')).toBeDefined();
            expect(e.corridor.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.847058823529412, 0.850980392156863, 0.854901960784314, 0.843137254901961), 1e-14);
            expect(e.corridor.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.862745098039216, 0.866666666666667, 0.870588235294118, 0.858823529411765), 1e-14);
            expect(e = dataSource.entities.getById('sampled23')).toBeDefined();
            expect(e.corridor.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.87843137254902, 0.882352941176471, 0.886274509803922, 0.874509803921569), 1e-14);
            expect(e.corridor.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.894117647058824, 0.898039215686275, 0.901960784313726, 0.890196078431373), 1e-14);
            expect(e = dataSource.entities.getById('sampled24')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.909803921568627, 0.913725490196078, 0.917647058823529, 0.905882352941176), 1e-14);
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.925490196078431, 0.929411764705882, 0.933333333333333, 0.92156862745098), 1e-14);
            expect(e = dataSource.entities.getById('sampled25')).toBeDefined();
            expect(e.cylinder.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(253, 254));
            expect(e.cylinder.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(255, 256));
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(58, 59, 60, 57));
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(62, 63, 64, 61));
            expect(e = dataSource.entities.getById('sampled26')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(66, 67, 68, 65));
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(70, 71, 72, 69));
            expect(e.cylinder.material.cellAlpha.getValue(documentStartDate)).toEqual(322.0);
            expect(e.cylinder.material.cellAlpha.getValue(documentStopDate)).toEqual(323.0);
            expect(e.cylinder.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(257, 258));
            expect(e.cylinder.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(259, 260));
            expect(e.cylinder.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(261, 262));
            expect(e.cylinder.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(263, 264));
            expect(e.cylinder.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(265, 266));
            expect(e.cylinder.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(267, 268));
            expect(e = dataSource.entities.getById('sampled27')).toBeDefined();
            expect(e.cylinder.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(74, 75, 76, 73));
            expect(e.cylinder.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(78, 79, 80, 77));
            expect(e.cylinder.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(82, 83, 84, 81));
            expect(e.cylinder.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(86, 87, 88, 85));
            expect(e.cylinder.material.offset.getValue(documentStartDate)).toEqual(324.0);
            expect(e.cylinder.material.offset.getValue(documentStopDate)).toEqual(325.0);
            expect(e.cylinder.material.repeat.getValue(documentStartDate)).toEqual(326.0);
            expect(e.cylinder.material.repeat.getValue(documentStopDate)).toEqual(327.0);
            expect(e = dataSource.entities.getById('sampled28')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.941176470588235, 0.945098039215686, 0.949019607843137, 0.937254901960784), 1e-14);
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.956862745098039, 0.96078431372549, 0.964705882352941, 0.952941176470588), 1e-14);
            expect(e = dataSource.entities.getById('sampled29')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.972549019607843, 0.976470588235294, 0.980392156862745, 0.968627450980392), 1e-14);
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.988235294117647, 0.992156862745098, 0.996078431372549, 0.984313725490196), 1e-14);
            expect(e = dataSource.entities.getById('sampled30')).toBeDefined();
            expect(e.cylinder.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.00392156862745098, 0.00784313725490196, 0.0117647058823529, 0), 1e-14);
            expect(e.cylinder.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0196078431372549, 0.0235294117647059, 0.0274509803921569, 0.0156862745098039), 1e-14);
            expect(e = dataSource.entities.getById('sampled31')).toBeDefined();
            expect(e.cylinder.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0352941176470588, 0.0392156862745098, 0.0431372549019608, 0.0313725490196078), 1e-14);
            expect(e.cylinder.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0509803921568627, 0.0549019607843137, 0.0588235294117647, 0.0470588235294118), 1e-14);
            expect(e = dataSource.entities.getById('sampled32')).toBeDefined();
            expect(e.cylinder.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0666666666666667, 0.0705882352941176, 0.0745098039215686, 0.0627450980392157), 1e-14);
            expect(e.cylinder.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0823529411764706, 0.0862745098039216, 0.0901960784313725, 0.0784313725490196), 1e-14);
            expect(e = dataSource.entities.getById('sampled33')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0980392156862745, 0.101960784313725, 0.105882352941176, 0.0941176470588235), 1e-14);
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.113725490196078, 0.117647058823529, 0.12156862745098, 0.109803921568627), 1e-14);
            expect(e = dataSource.entities.getById('sampled34')).toBeDefined();
            expect(e.ellipse.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(269, 270));
            expect(e.ellipse.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(271, 272));
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(90, 91, 92, 89));
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(94, 95, 96, 93));
            expect(e = dataSource.entities.getById('sampled35')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(98, 99, 100, 97));
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(102, 103, 104, 101));
            expect(e.ellipse.material.cellAlpha.getValue(documentStartDate)).toEqual(328.0);
            expect(e.ellipse.material.cellAlpha.getValue(documentStopDate)).toEqual(329.0);
            expect(e.ellipse.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(273, 274));
            expect(e.ellipse.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(275, 276));
            expect(e.ellipse.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(277, 278));
            expect(e.ellipse.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(279, 280));
            expect(e.ellipse.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(281, 282));
            expect(e.ellipse.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(283, 284));
            expect(e = dataSource.entities.getById('sampled36')).toBeDefined();
            expect(e.ellipse.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(106, 107, 108, 105));
            expect(e.ellipse.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(110, 111, 112, 109));
            expect(e.ellipse.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(114, 115, 116, 113));
            expect(e.ellipse.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(118, 119, 120, 117));
            expect(e.ellipse.material.offset.getValue(documentStartDate)).toEqual(330.0);
            expect(e.ellipse.material.offset.getValue(documentStopDate)).toEqual(331.0);
            expect(e.ellipse.material.repeat.getValue(documentStartDate)).toEqual(332.0);
            expect(e.ellipse.material.repeat.getValue(documentStopDate)).toEqual(333.0);
            expect(e = dataSource.entities.getById('sampled37')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.129411764705882, 0.133333333333333, 0.137254901960784, 0.125490196078431), 1e-14);
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.145098039215686, 0.149019607843137, 0.152941176470588, 0.141176470588235), 1e-14);
            expect(e = dataSource.entities.getById('sampled38')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.16078431372549, 0.164705882352941, 0.168627450980392, 0.156862745098039), 1e-14);
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.176470588235294, 0.180392156862745, 0.184313725490196, 0.172549019607843), 1e-14);
            expect(e = dataSource.entities.getById('sampled39')).toBeDefined();
            expect(e.ellipse.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.192156862745098, 0.196078431372549, 0.2, 0.188235294117647), 1e-14);
            expect(e.ellipse.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.207843137254902, 0.211764705882353, 0.215686274509804, 0.203921568627451), 1e-14);
            expect(e = dataSource.entities.getById('sampled40')).toBeDefined();
            expect(e.ellipse.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.223529411764706, 0.227450980392157, 0.231372549019608, 0.219607843137255), 1e-14);
            expect(e.ellipse.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.23921568627451, 0.243137254901961, 0.247058823529412, 0.235294117647059), 1e-14);
            expect(e = dataSource.entities.getById('sampled41')).toBeDefined();
            expect(e.ellipse.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.254901960784314, 0.258823529411765, 0.262745098039216, 0.250980392156863), 1e-14);
            expect(e.ellipse.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.270588235294118, 0.274509803921569, 0.27843137254902, 0.266666666666667), 1e-14);
            expect(e = dataSource.entities.getById('sampled42')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.286274509803922, 0.290196078431373, 0.294117647058824, 0.282352941176471), 1e-14);
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.301960784313725, 0.305882352941176, 0.309803921568627, 0.298039215686275), 1e-14);
            expect(e = dataSource.entities.getById('sampled43')).toBeDefined();
            expect(e.ellipsoid.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(285, 286));
            expect(e.ellipsoid.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(287, 288));
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(122, 123, 124, 121));
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(126, 127, 128, 125));
            expect(e = dataSource.entities.getById('sampled44')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(130, 131, 132, 129));
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(134, 135, 136, 133));
            expect(e.ellipsoid.material.cellAlpha.getValue(documentStartDate)).toEqual(334.0);
            expect(e.ellipsoid.material.cellAlpha.getValue(documentStopDate)).toEqual(335.0);
            expect(e.ellipsoid.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(289, 290));
            expect(e.ellipsoid.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(291, 292));
            expect(e.ellipsoid.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(293, 294));
            expect(e.ellipsoid.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(295, 296));
            expect(e.ellipsoid.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(297, 298));
            expect(e.ellipsoid.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(299, 300));
            expect(e = dataSource.entities.getById('sampled45')).toBeDefined();
            expect(e.ellipsoid.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(138, 139, 140, 137));
            expect(e.ellipsoid.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(142, 143, 144, 141));
            expect(e.ellipsoid.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(146, 147, 148, 145));
            expect(e.ellipsoid.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(150, 151, 152, 149));
            expect(e.ellipsoid.material.offset.getValue(documentStartDate)).toEqual(336.0);
            expect(e.ellipsoid.material.offset.getValue(documentStopDate)).toEqual(337.0);
            expect(e.ellipsoid.material.repeat.getValue(documentStartDate)).toEqual(338.0);
            expect(e.ellipsoid.material.repeat.getValue(documentStopDate)).toEqual(339.0);
            expect(e = dataSource.entities.getById('sampled46')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.317647058823529, 0.32156862745098, 0.325490196078431, 0.313725490196078), 1e-14);
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.333333333333333, 0.337254901960784, 0.341176470588235, 0.329411764705882), 1e-14);
            expect(e = dataSource.entities.getById('sampled47')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.349019607843137, 0.352941176470588, 0.356862745098039, 0.345098039215686), 1e-14);
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.364705882352941, 0.368627450980392, 0.372549019607843, 0.36078431372549), 1e-14);
            expect(e = dataSource.entities.getById('sampled48')).toBeDefined();
            expect(e.ellipsoid.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.380392156862745, 0.384313725490196, 0.388235294117647, 0.376470588235294), 1e-14);
            expect(e.ellipsoid.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.396078431372549, 0.4, 0.403921568627451, 0.392156862745098), 1e-14);
            expect(e = dataSource.entities.getById('sampled49')).toBeDefined();
            expect(e.ellipsoid.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.411764705882353, 0.415686274509804, 0.419607843137255, 0.407843137254902), 1e-14);
            expect(e.ellipsoid.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.427450980392157, 0.431372549019608, 0.435294117647059, 0.423529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled50')).toBeDefined();
            expect(e.ellipsoid.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.443137254901961, 0.447058823529412, 0.450980392156863, 0.43921568627451), 1e-14);
            expect(e.ellipsoid.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.458823529411765, 0.462745098039216, 0.466666666666667, 0.454901960784314), 1e-14);
            expect(e = dataSource.entities.getById('sampled51')).toBeDefined();
            expect(e.label.fillColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.474509803921569, 0.47843137254902, 0.482352941176471, 0.470588235294118), 1e-14);
            expect(e.label.fillColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.490196078431373, 0.494117647058824, 0.498039215686275, 0.486274509803922), 1e-14);
            expect(e = dataSource.entities.getById('sampled52')).toBeDefined();
            expect(e.label.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.505882352941176, 0.509803921568627, 0.513725490196078, 0.501960784313725), 1e-14);
            expect(e.label.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.52156862745098, 0.525490196078431, 0.529411764705882, 0.517647058823529), 1e-14);
            expect(e = dataSource.entities.getById('sampled53')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.537254901960784, 0.541176470588235, 0.545098039215686, 0.533333333333333), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.552941176470588, 0.556862745098039, 0.56078431372549, 0.549019607843137), 1e-14);
            expect(e = dataSource.entities.getById('sampled54')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(154, 155, 156, 153));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(158, 159, 160, 157));
            expect(e.path.material.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(162, 163, 164, 161));
            expect(e.path.material.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(166, 167, 168, 165));
            expect(e.path.material.outlineWidth.getValue(documentStartDate)).toEqual(340.0);
            expect(e.path.material.outlineWidth.getValue(documentStopDate)).toEqual(341.0);
            expect(e = dataSource.entities.getById('sampled55')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(170, 171, 172, 169));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(174, 175, 176, 173));
            expect(e = dataSource.entities.getById('sampled56')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(178, 179, 180, 177));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(182, 183, 184, 181));
            expect(e.path.material.glowPower.getValue(documentStartDate)).toEqual(342.0);
            expect(e.path.material.glowPower.getValue(documentStopDate)).toEqual(343.0);
            expect(e = dataSource.entities.getById('sampled57')).toBeDefined();
            expect(e.path.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(301, 302));
            expect(e.path.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(303, 304));
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(186, 187, 188, 185));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(190, 191, 192, 189));
            expect(e = dataSource.entities.getById('sampled58')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(194, 195, 196, 193));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(198, 199, 200, 197));
            expect(e.path.material.cellAlpha.getValue(documentStartDate)).toEqual(344.0);
            expect(e.path.material.cellAlpha.getValue(documentStopDate)).toEqual(345.0);
            expect(e.path.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(305, 306));
            expect(e.path.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(307, 308));
            expect(e.path.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(309, 310));
            expect(e.path.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(311, 312));
            expect(e.path.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(313, 314));
            expect(e.path.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(315, 316));
            expect(e = dataSource.entities.getById('sampled59')).toBeDefined();
            expect(e.path.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(202, 203, 204, 201));
            expect(e.path.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(206, 207, 208, 205));
            expect(e.path.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(210, 211, 212, 209));
            expect(e.path.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(214, 215, 216, 213));
            expect(e.path.material.offset.getValue(documentStartDate)).toEqual(346.0);
            expect(e.path.material.offset.getValue(documentStopDate)).toEqual(347.0);
            expect(e.path.material.repeat.getValue(documentStartDate)).toEqual(348.0);
            expect(e.path.material.repeat.getValue(documentStopDate)).toEqual(349.0);
            expect(e = dataSource.entities.getById('sampled60')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.568627450980392, 0.572549019607843, 0.576470588235294, 0.564705882352941), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.584313725490196, 0.588235294117647, 0.592156862745098, 0.580392156862745), 1e-14);
            expect(e = dataSource.entities.getById('sampled61')).toBeDefined();
            expect(e.path.material.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.6, 0.603921568627451, 0.607843137254902, 0.596078431372549), 1e-14);
            expect(e.path.material.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.615686274509804, 0.619607843137255, 0.623529411764706, 0.611764705882353), 1e-14);
            expect(e = dataSource.entities.getById('sampled62')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.631372549019608, 0.635294117647059, 0.63921568627451, 0.627450980392157), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.647058823529412, 0.650980392156863, 0.654901960784314, 0.643137254901961), 1e-14);
            expect(e = dataSource.entities.getById('sampled63')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.662745098039216, 0.666666666666667, 0.670588235294118, 0.658823529411765), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.67843137254902, 0.682352941176471, 0.686274509803922, 0.674509803921569), 1e-14);
            expect(e = dataSource.entities.getById('sampled64')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.694117647058824, 0.698039215686274, 0.701960784313725, 0.690196078431373), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.709803921568627, 0.713725490196078, 0.717647058823529, 0.705882352941177), 1e-14);
            expect(e = dataSource.entities.getById('sampled65')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.725490196078431, 0.729411764705882, 0.733333333333333, 0.72156862745098), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.741176470588235, 0.745098039215686, 0.749019607843137, 0.737254901960784), 1e-14);
            expect(e = dataSource.entities.getById('sampled66')).toBeDefined();
            expect(e.path.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.756862745098039, 0.76078431372549, 0.764705882352941, 0.752941176470588), 1e-14);
            expect(e.path.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.772549019607843, 0.776470588235294, 0.780392156862745, 0.768627450980392), 1e-14);
            expect(e = dataSource.entities.getById('sampled67')).toBeDefined();
            expect(e.path.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.788235294117647, 0.792156862745098, 0.796078431372549, 0.784313725490196), 1e-14);
            expect(e.path.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.803921568627451, 0.807843137254902, 0.811764705882353, 0.8), 1e-14);
            expect(e = dataSource.entities.getById('sampled68')).toBeDefined();
            expect(e.point.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.819607843137255, 0.823529411764706, 0.827450980392157, 0.815686274509804), 1e-14);
            expect(e.point.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.835294117647059, 0.83921568627451, 0.843137254901961, 0.831372549019608), 1e-14);
            expect(e = dataSource.entities.getById('sampled69')).toBeDefined();
            expect(e.point.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.850980392156863, 0.854901960784314, 0.858823529411765, 0.847058823529412), 1e-14);
            expect(e.point.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.866666666666667, 0.870588235294118, 0.874509803921569, 0.862745098039216), 1e-14);
            expect(e = dataSource.entities.getById('sampled70')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.882352941176471, 0.886274509803922, 0.890196078431373, 0.87843137254902), 1e-14);
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.898039215686275, 0.901960784313726, 0.905882352941176, 0.894117647058824), 1e-14);
            expect(e = dataSource.entities.getById('sampled71')).toBeDefined();
            expect(e.polygon.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(317, 318));
            expect(e.polygon.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(319, 320));
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(218, 219, 220, 217));
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(222, 223, 224, 221));
            expect(e = dataSource.entities.getById('sampled72')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(226, 227, 228, 225));
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(230, 231, 232, 229));
            expect(e.polygon.material.cellAlpha.getValue(documentStartDate)).toEqual(350.0);
            expect(e.polygon.material.cellAlpha.getValue(documentStopDate)).toEqual(351.0);
            expect(e.polygon.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(321, 322));
            expect(e.polygon.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(323, 324));
            expect(e.polygon.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(325, 326));
            expect(e.polygon.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(327, 328));
            expect(e.polygon.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(329, 330));
            expect(e.polygon.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(331, 332));
            expect(e = dataSource.entities.getById('sampled73')).toBeDefined();
            expect(e.polygon.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(234, 235, 236, 233));
            expect(e.polygon.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(238, 239, 240, 237));
            expect(e.polygon.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(242, 243, 244, 241));
            expect(e.polygon.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(246, 247, 248, 245));
            expect(e.polygon.material.offset.getValue(documentStartDate)).toEqual(352.0);
            expect(e.polygon.material.offset.getValue(documentStopDate)).toEqual(353.0);
            expect(e.polygon.material.repeat.getValue(documentStartDate)).toEqual(354.0);
            expect(e.polygon.material.repeat.getValue(documentStopDate)).toEqual(355.0);
            expect(e = dataSource.entities.getById('sampled74')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.913725490196078, 0.917647058823529, 0.92156862745098, 0.909803921568627), 1e-14);
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.929411764705882, 0.933333333333333, 0.937254901960784, 0.925490196078431), 1e-14);
            expect(e = dataSource.entities.getById('sampled75')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.945098039215686, 0.949019607843137, 0.952941176470588, 0.941176470588235), 1e-14);
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.96078431372549, 0.964705882352941, 0.968627450980392, 0.956862745098039), 1e-14);
            expect(e = dataSource.entities.getById('sampled76')).toBeDefined();
            expect(e.polygon.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.976470588235294, 0.980392156862745, 0.984313725490196, 0.972549019607843), 1e-14);
            expect(e.polygon.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.992156862745098, 0.996078431372549, 0, 0.988235294117647), 1e-14);
            expect(e = dataSource.entities.getById('sampled77')).toBeDefined();
            expect(e.polygon.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.00784313725490196, 0.0117647058823529, 0.0156862745098039, 0.00392156862745098), 1e-14);
            expect(e.polygon.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0235294117647059, 0.0274509803921569, 0.0313725490196078, 0.0196078431372549), 1e-14);
            expect(e = dataSource.entities.getById('sampled78')).toBeDefined();
            expect(e.polygon.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0392156862745098, 0.0431372549019608, 0.0470588235294118, 0.0352941176470588), 1e-14);
            expect(e.polygon.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0549019607843137, 0.0588235294117647, 0.0627450980392157, 0.0509803921568627), 1e-14);
            expect(e = dataSource.entities.getById('sampled79')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0705882352941176, 0.0745098039215686, 0.0784313725490196, 0.0666666666666667), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0862745098039216, 0.0901960784313725, 0.0941176470588235, 0.0823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled80')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(250, 251, 252, 249));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(254, 0, 1, 253));
            expect(e.polyline.material.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(3, 4, 5, 2));
            expect(e.polyline.material.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(7, 8, 9, 6));
            expect(e.polyline.material.outlineWidth.getValue(documentStartDate)).toEqual(356.0);
            expect(e.polyline.material.outlineWidth.getValue(documentStopDate)).toEqual(357.0);
            expect(e = dataSource.entities.getById('sampled81')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(11, 12, 13, 10));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(15, 16, 17, 14));
            expect(e = dataSource.entities.getById('sampled82')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(19, 20, 21, 18));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(23, 24, 25, 22));
            expect(e.polyline.material.glowPower.getValue(documentStartDate)).toEqual(358.0);
            expect(e.polyline.material.glowPower.getValue(documentStopDate)).toEqual(359.0);
            expect(e = dataSource.entities.getById('sampled83')).toBeDefined();
            expect(e.polyline.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(333, 334));
            expect(e.polyline.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(335, 336));
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(27, 28, 29, 26));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(31, 32, 33, 30));
            expect(e = dataSource.entities.getById('sampled84')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(35, 36, 37, 34));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(39, 40, 41, 38));
            expect(e.polyline.material.cellAlpha.getValue(documentStartDate)).toEqual(360.0);
            expect(e.polyline.material.cellAlpha.getValue(documentStopDate)).toEqual(361.0);
            expect(e.polyline.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(337, 338));
            expect(e.polyline.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(339, 340));
            expect(e.polyline.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(341, 342));
            expect(e.polyline.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(343, 344));
            expect(e.polyline.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(345, 346));
            expect(e.polyline.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(347, 348));
            expect(e = dataSource.entities.getById('sampled85')).toBeDefined();
            expect(e.polyline.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(43, 44, 45, 42));
            expect(e.polyline.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(47, 48, 49, 46));
            expect(e.polyline.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(51, 52, 53, 50));
            expect(e.polyline.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(55, 56, 57, 54));
            expect(e.polyline.material.offset.getValue(documentStartDate)).toEqual(362.0);
            expect(e.polyline.material.offset.getValue(documentStopDate)).toEqual(363.0);
            expect(e.polyline.material.repeat.getValue(documentStartDate)).toEqual(364.0);
            expect(e.polyline.material.repeat.getValue(documentStopDate)).toEqual(365.0);
            expect(e = dataSource.entities.getById('sampled86')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.101960784313725, 0.105882352941176, 0.109803921568627, 0.0980392156862745), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.117647058823529, 0.12156862745098, 0.125490196078431, 0.113725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled87')).toBeDefined();
            expect(e.polyline.material.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.133333333333333, 0.137254901960784, 0.141176470588235, 0.129411764705882), 1e-14);
            expect(e.polyline.material.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.149019607843137, 0.152941176470588, 0.156862745098039, 0.145098039215686), 1e-14);
            expect(e = dataSource.entities.getById('sampled88')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.164705882352941, 0.168627450980392, 0.172549019607843, 0.16078431372549), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.180392156862745, 0.184313725490196, 0.188235294117647, 0.176470588235294), 1e-14);
            expect(e = dataSource.entities.getById('sampled89')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.196078431372549, 0.2, 0.203921568627451, 0.192156862745098), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.211764705882353, 0.215686274509804, 0.219607843137255, 0.207843137254902), 1e-14);
            expect(e = dataSource.entities.getById('sampled90')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.227450980392157, 0.231372549019608, 0.235294117647059, 0.223529411764706), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.243137254901961, 0.247058823529412, 0.250980392156863, 0.23921568627451), 1e-14);
            expect(e = dataSource.entities.getById('sampled91')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.258823529411765, 0.262745098039216, 0.266666666666667, 0.254901960784314), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.274509803921569, 0.27843137254902, 0.282352941176471, 0.270588235294118), 1e-14);
            expect(e = dataSource.entities.getById('sampled92')).toBeDefined();
            expect(e.polyline.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.290196078431373, 0.294117647058824, 0.298039215686275, 0.286274509803922), 1e-14);
            expect(e.polyline.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.305882352941176, 0.309803921568627, 0.313725490196078, 0.301960784313725), 1e-14);
            expect(e = dataSource.entities.getById('sampled93')).toBeDefined();
            expect(e.polyline.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.32156862745098, 0.325490196078431, 0.329411764705882, 0.317647058823529), 1e-14);
            expect(e.polyline.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.337254901960784, 0.341176470588235, 0.345098039215686, 0.333333333333333), 1e-14);
            expect(e = dataSource.entities.getById('sampled94')).toBeDefined();
            expect(e.rectangle.coordinates.getValue(documentStartDate)).toEqual(Rectangle.fromDegrees(17, 18, 19, 20));
            expect(e.rectangle.coordinates.getValue(documentStopDate)).toEqual(Rectangle.fromDegrees(21, 22, 23, 24));
            expect(e = dataSource.entities.getById('sampled95')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.352941176470588, 0.356862745098039, 0.36078431372549, 0.349019607843137), 1e-14);
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.368627450980392, 0.372549019607843, 0.376470588235294, 0.364705882352941), 1e-14);
            expect(e = dataSource.entities.getById('sampled96')).toBeDefined();
            expect(e.rectangle.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(349, 350));
            expect(e.rectangle.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(351, 352));
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(59, 60, 61, 58));
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(63, 64, 65, 62));
            expect(e = dataSource.entities.getById('sampled97')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(67, 68, 69, 66));
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(71, 72, 73, 70));
            expect(e.rectangle.material.cellAlpha.getValue(documentStartDate)).toEqual(366.0);
            expect(e.rectangle.material.cellAlpha.getValue(documentStopDate)).toEqual(367.0);
            expect(e.rectangle.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(353, 354));
            expect(e.rectangle.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(355, 356));
            expect(e.rectangle.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(357, 358));
            expect(e.rectangle.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(359, 360));
            expect(e.rectangle.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(361, 362));
            expect(e.rectangle.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(363, 364));
            expect(e = dataSource.entities.getById('sampled98')).toBeDefined();
            expect(e.rectangle.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(75, 76, 77, 74));
            expect(e.rectangle.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(79, 80, 81, 78));
            expect(e.rectangle.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(83, 84, 85, 82));
            expect(e.rectangle.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(87, 88, 89, 86));
            expect(e.rectangle.material.offset.getValue(documentStartDate)).toEqual(368.0);
            expect(e.rectangle.material.offset.getValue(documentStopDate)).toEqual(369.0);
            expect(e.rectangle.material.repeat.getValue(documentStartDate)).toEqual(370.0);
            expect(e.rectangle.material.repeat.getValue(documentStopDate)).toEqual(371.0);
            expect(e = dataSource.entities.getById('sampled99')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.384313725490196, 0.388235294117647, 0.392156862745098, 0.380392156862745), 1e-14);
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.4, 0.403921568627451, 0.407843137254902, 0.396078431372549), 1e-14);
            expect(e = dataSource.entities.getById('sampled100')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.415686274509804, 0.419607843137255, 0.423529411764706, 0.411764705882353), 1e-14);
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.431372549019608, 0.435294117647059, 0.43921568627451, 0.427450980392157), 1e-14);
            expect(e = dataSource.entities.getById('sampled101')).toBeDefined();
            expect(e.rectangle.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.447058823529412, 0.450980392156863, 0.454901960784314, 0.443137254901961), 1e-14);
            expect(e.rectangle.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.462745098039216, 0.466666666666667, 0.470588235294118, 0.458823529411765), 1e-14);
            expect(e = dataSource.entities.getById('sampled102')).toBeDefined();
            expect(e.rectangle.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.47843137254902, 0.482352941176471, 0.486274509803922, 0.474509803921569), 1e-14);
            expect(e.rectangle.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.494117647058824, 0.498039215686275, 0.501960784313725, 0.490196078431373), 1e-14);
            expect(e = dataSource.entities.getById('sampled103')).toBeDefined();
            expect(e.rectangle.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.509803921568627, 0.513725490196078, 0.517647058823529, 0.505882352941176), 1e-14);
            expect(e.rectangle.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.525490196078431, 0.529411764705882, 0.533333333333333, 0.52156862745098), 1e-14);
            expect(e = dataSource.entities.getById('sampled104')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.541176470588235, 0.545098039215686, 0.549019607843137, 0.537254901960784), 1e-14);
            expect(e.wall.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.556862745098039, 0.56078431372549, 0.564705882352941, 0.552941176470588), 1e-14);
            expect(e = dataSource.entities.getById('sampled105')).toBeDefined();
            expect(e.wall.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(365, 366));
            expect(e.wall.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(367, 368));
            expect(e.wall.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(91, 92, 93, 90));
            expect(e.wall.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(95, 96, 97, 94));
            expect(e = dataSource.entities.getById('sampled106')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(99, 100, 101, 98));
            expect(e.wall.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(103, 104, 105, 102));
            expect(e.wall.material.cellAlpha.getValue(documentStartDate)).toEqual(372.0);
            expect(e.wall.material.cellAlpha.getValue(documentStopDate)).toEqual(373.0);
            expect(e.wall.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(369, 370));
            expect(e.wall.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(371, 372));
            expect(e.wall.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(373, 374));
            expect(e.wall.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(375, 376));
            expect(e.wall.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(377, 378));
            expect(e.wall.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(379, 380));
            expect(e = dataSource.entities.getById('sampled107')).toBeDefined();
            expect(e.wall.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(107, 108, 109, 106));
            expect(e.wall.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(111, 112, 113, 110));
            expect(e.wall.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(115, 116, 117, 114));
            expect(e.wall.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(119, 120, 121, 118));
            expect(e.wall.material.offset.getValue(documentStartDate)).toEqual(374.0);
            expect(e.wall.material.offset.getValue(documentStopDate)).toEqual(375.0);
            expect(e.wall.material.repeat.getValue(documentStartDate)).toEqual(376.0);
            expect(e.wall.material.repeat.getValue(documentStopDate)).toEqual(377.0);
            expect(e = dataSource.entities.getById('sampled108')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.572549019607843, 0.576470588235294, 0.580392156862745, 0.568627450980392), 1e-14);
            expect(e.wall.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.588235294117647, 0.592156862745098, 0.596078431372549, 0.584313725490196), 1e-14);
            expect(e = dataSource.entities.getById('sampled109')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.603921568627451, 0.607843137254902, 0.611764705882353, 0.6), 1e-14);
            expect(e.wall.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.619607843137255, 0.623529411764706, 0.627450980392157, 0.615686274509804), 1e-14);
            expect(e = dataSource.entities.getById('sampled110')).toBeDefined();
            expect(e.wall.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.635294117647059, 0.63921568627451, 0.643137254901961, 0.631372549019608), 1e-14);
            expect(e.wall.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.650980392156863, 0.654901960784314, 0.658823529411765, 0.647058823529412), 1e-14);
            expect(e = dataSource.entities.getById('sampled111')).toBeDefined();
            expect(e.wall.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.666666666666667, 0.670588235294118, 0.674509803921569, 0.662745098039216), 1e-14);
            expect(e.wall.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.682352941176471, 0.686274509803922, 0.690196078431373, 0.67843137254902), 1e-14);
            expect(e = dataSource.entities.getById('sampled112')).toBeDefined();
            expect(e.wall.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.698039215686274, 0.701960784313725, 0.705882352941177, 0.694117647058824), 1e-14);
            expect(e.wall.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.713725490196078, 0.717647058823529, 0.72156862745098, 0.709803921568627), 1e-14);
            expect(e = dataSource.entities.getById('sampled113')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled114')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled115')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled116')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled117')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled118')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled119')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled120')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled121')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled122')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled123')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled124')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled125')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled126')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled127')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled128')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled129')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled130')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled131')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled132')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled133')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled134')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled135')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled136')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled137')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled138')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled139')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled140')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled141')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled142')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled143')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled144')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled145')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled146')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled147')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled148')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled149')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled150')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled151')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled152')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled153')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled154')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled155')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled156')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled157')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled158')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled159')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled160')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled161')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled162')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled163')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled164')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled165')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled166')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled167')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled168')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled169')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled170')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled171')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled172')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled173')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled174')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled175')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled176')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled177')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled178')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled179')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled180')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled181')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled182')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled183')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled184')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled185')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled186')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled187')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled188')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled189')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled190')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled191')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled192')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled193')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled194')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled195')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled196')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled197')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled198')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled199')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled200')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled201')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled202')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled203')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled204')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled205')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled206')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled207')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled208')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled209')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled210')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled211')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled212')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled213')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled214')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled215')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled216')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled217')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled218')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled219')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled220')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled221')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled222')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled223')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled224')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled225')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled226')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled227')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled228')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled229')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled230')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled231')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled232')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled233')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled234')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled235')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled236')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled237')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled238')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled239')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled240')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled241')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled242')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled243')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled244')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled245')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled246')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled247')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled248')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled249')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled250')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled251')).toBeDefined();
        });
    });
});
