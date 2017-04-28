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
        'DataSources/CompositeEntityCollection',
        'DataSources/EntityCollection',
        'DataSources/ReferenceProperty',
        'DataSources/StripeOrientation',
        'Scene/ColorBlendMode',
        'Scene/HeightReference',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/ShadowMode',
        'Scene/VerticalOrigin',
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
        CompositeEntityCollection,
        EntityCollection,
        ReferenceProperty,
        StripeOrientation,
        ColorBlendMode,
        HeightReference,
        HorizontalOrigin,
        LabelStyle,
        ShadowMode,
        VerticalOrigin,
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
                outlineWidth : 6,
                shadows : 'ENABLED'
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
        expect(entity.ellipse.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
    });

    it('CZML adds data for constrained ellipse.', function() {
        var ellipsePacketInterval = {
            ellipse : {
                interval : '2000-01-01/2001-01-01',
                semiMajorAxis : 10,
                semiMinorAxis : 20,
                rotation : 1.0,
                shadows : 'ENABLED'
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
        expect(entity.ellipse.shadows.getValue(validTime)).toEqual(ShadowMode.ENABLED);

        expect(entity.ellipse.semiMajorAxis.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipse.semiMinorAxis.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipse.rotation.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipse.shadows.getValue(invalidTime)).toBeUndefined();
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
                subdivisions : 27,
                shadows : 'ENABLED'
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
        expect(entity.ellipsoid.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                },
                shadows : 'ENABLED'
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
        expect(entity.ellipsoid.shadows.getValue(validTime)).toEqual(ShadowMode.ENABLED);

        expect(entity.ellipsoid.radii.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipsoid.show.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipsoid.material.getValue(invalidTime)).toBeUndefined();
        expect(entity.ellipsoid.shadows.getValue(invalidTime)).toBeUndefined();
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

    it('works with properties that are constant.', function() {
        var testObject = {
            foo: 4,
            bar: {
                name: 'bar'
            }
        };
        var testArray = [2, 4, 16, 'test'];
        var packet = {
            properties: {
                constant_name: 'ABC',
                constant_height: 8,
                constant_object: {
                    value: testObject
                },
                constant_array: {
                    value: testArray
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.properties.constant_name.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet.properties.constant_name);
        expect(entity.properties.constant_height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet.properties.constant_height);
        expect(entity.properties.constant_object.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testObject);
        expect(entity.properties.constant_array.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testArray);
    });

    it('works with properties which are constant with specified type.', function() {
        var testObject = {
            foo: 4,
            bar: {
                name: 'bar'
            }
        };
        var testArray = [2, 4, 16, 'test'];
        var packet = {
            properties: {
                constant_name: {
                    string: 'ABC'
                },
                constant_height: {
                    number: 8
                },
                constant_object: {
                    object: testObject
                },
                constant_array: {
                    array: testArray
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];
        expect(entity.properties.constant_name.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet.properties.constant_name.string);
        expect(entity.properties.constant_height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet.properties.constant_height.number);
        expect(entity.properties.constant_object.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testObject);
        expect(entity.properties.constant_array.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testArray);
    });

    it('works with properties with one interval.', function() {
        var packet = {
            properties: {
                changing_name: {
                    interval: '2012/2014',
                    value: 'ABC'
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];

        var time1 = JulianDate.fromIso8601('2013');
        var time2 = JulianDate.fromIso8601('2015');

        expect(entity.properties.changing_name.getValue(time1)).toEqual('ABC');
        expect(entity.properties.changing_name.getValue(time2)).toBeUndefined();
    });

    it('works with properties with one interval with specified type.', function() {
        var packet = {
            properties: {
                changing_name: {
                    interval: '2012/2014',
                    string: 'ABC'
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];

        var time1 = JulianDate.fromIso8601('2013');
        var time2 = JulianDate.fromIso8601('2015');

        expect(entity.properties.changing_name.getValue(time1)).toEqual('ABC');
        expect(entity.properties.changing_name.getValue(time2)).toBeUndefined();
    });

    it('works with properties with multiple intervals.', function() {
        var array1 = [1, 2, 3];
        var array2 = [4, 5, 6];
        var packet = {
            properties: {
                changing_array: [
                    {
                        interval: '2012/2013',
                        value: array1
                    },
                    {
                        interval: '2013/2014',
                        value: array2
                    }
                ]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];

        var time1 = JulianDate.fromIso8601('2012-06-01');
        var time2 = JulianDate.fromIso8601('2013-06-01');

        expect(entity.properties.changing_array.getValue(time1)).toEqual(array1);
        expect(entity.properties.changing_array.getValue(time2)).toEqual(array2);
    });

    it('handles boolean custom properties with intervals.', function() {
        var packet = {
            id: 'MyID',
            properties: {
                custom_boolean: [
                    {
                        interval: '2012-04-02T12:00:00Z/2012-04-02T12:00:01Z',
                        boolean: true
                    },
                    {
                        interval: '2012-04-02T12:00:01Z/2012-04-02T12:00:02Z',
                        boolean: false
                    },
                    {
                        interval: '2012-04-02T12:00:02Z/2012-04-02T12:01:00Z',
                        boolean: true
                    }
                ]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.getById('MyID');
        expect(entity).toBeDefined();
        expect(entity.properties).toBeDefined();
        expect(entity.properties.custom_boolean).toBeDefined();

        expect(entity.properties.custom_boolean.getValue(JulianDate.fromIso8601('2012-04-02T12:00:00Z'))).toEqual(true);
        expect(entity.properties.custom_boolean.getValue(JulianDate.fromIso8601('2012-04-02T12:00:01Z'))).toEqual(false);
        expect(entity.properties.custom_boolean.getValue(JulianDate.fromIso8601('2012-04-02T12:00:02Z'))).toEqual(true);
    });

    it('works with properties with multiple intervals with specified type.', function() {
        var array1 = [1, 2, 3];
        var array2 = [4, 5, 6];
        var packet = {
            properties: {
                changing_array: [
                    {
                        interval: '2012/2013',
                        array: array1
                    },
                    {
                        interval: '2013/2014',
                        array: array2
                    }
                ]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.values[0];

        var time1 = JulianDate.fromIso8601('2012-06-01');
        var time2 = JulianDate.fromIso8601('2013-06-01');

        expect(entity.properties.changing_array.getValue(time1)).toEqual(array1);
        expect(entity.properties.changing_array.getValue(time2)).toEqual(array2);
    });

    it('handles sampled custom properties.', function() {
        var packet = {
            id: 'MyID',
            properties: {
                custom_cartesian: {
                    epoch: '2012-04-02T12:00:00Z',
                    cartesian: [
                        0, 1, 2, 3,
                        60, 4, 5, 6,
                        120, 7, 8, 9
                    ]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.getById('MyID');
        expect(entity).toBeDefined();
        expect(entity.properties).toBeDefined();
        expect(entity.properties.custom_cartesian).toBeDefined();

        expect(entity.properties.custom_cartesian.getValue(JulianDate.fromIso8601('2012-04-02T12:00:00Z'))).toBeInstanceOf(Cartesian3);
        expect(entity.properties.custom_cartesian.getValue(JulianDate.fromIso8601('2012-04-02T12:00:00Z'))).toEqual(new Cartesian3(1, 2, 3));
        // halfway between two samples, linearly interpolated
        expect(entity.properties.custom_cartesian.getValue(JulianDate.fromIso8601('2012-04-02T12:00:30Z'))).toEqual(new Cartesian3((1 + 4) / 2, (2 + 5) / 2, (3 + 6) / 2));
        expect(entity.properties.custom_cartesian.getValue(JulianDate.fromIso8601('2012-04-02T12:01:00Z'))).toEqual(new Cartesian3(4, 5, 6));
        expect(entity.properties.custom_cartesian.getValue(JulianDate.fromIso8601('2012-04-02T12:02:00Z'))).toEqual(new Cartesian3(7, 8, 9));
    });

    it('handles various types of custom properties.', function() {
        var interval1 = '2012/2013';
        var interval2 = '2013/2014';
        var packet = {
            id: 'MyID',
            properties: {
                custom_array_constant: {
                    array: [1, 2, 3]
                },
                custom_array_interval: [
                    {
                        interval: interval1,
                        array: [1, 2, 3]
                    },
                    {
                        interval: interval2,
                        array: [4, 5, 6]
                    }
                ],
                custom_boolean_constant: {
                    boolean: true
                },
                custom_boolean_interval: [
                    {
                        interval: interval1,
                        boolean: true
                    },
                    {
                        interval: interval2,
                        boolean: false
                    }
                ],
                custom_boundingRectangle_constant: {
                    boundingRectangle: [20, 30, 10, 11]
                },
                custom_boundingRectangle_interval: [
                    {
                        interval: interval1,
                        boundingRectangle: [20, 30, 10, 11]
                    },
                    {
                        interval: interval2,
                        boundingRectangle: [21, 31, 11, 12]
                    }
                ],
                custom_boundingRectangle_sampled: {
                    epoch: '2012-06-01',
                    boundingRectangle: [
                        0, 20, 30, 10, 11,
                        60, 21, 31, 11, 12
                    ]
                },
                custom_cartesian2_constant: {
                    cartesian2: [20, 30]
                },
                custom_cartesian2_interval: [
                    {
                        interval: interval1,
                        cartesian2: [20, 30]
                    },
                    {
                        interval: interval2,
                        cartesian2: [21, 31]
                    }
                ],
                custom_cartesian2_sampled: {
                    epoch: '2012-06-01',
                    cartesian2: [
                        0, 20, 30,
                        60, 21, 31
                    ]
                },
                custom_cartesian_constant: {
                    cartesian: [10, 11, 12]
                },
                custom_cartesian_interval: [
                    {
                        interval: interval1,
                        cartesian: [10, 11, 12]
                    },
                    {
                        interval: interval2,
                        cartesian: [13, 14, 15]
                    }
                ],
                custom_cartesian_sampled: {
                    epoch: '2012-06-01',
                    cartesian: [
                        0, 10, 11, 12,
                        60, 13, 14, 15
                    ]
                },
                custom_color_constant: {
                    rgbaf: [0.1, 0.2, 0.3, 0.4]
                },
                custom_color_interval: [
                    {
                        interval: interval1,
                        rgbaf: [0.1, 0.2, 0.3, 0.4]
                    },
                    {
                        interval: interval2,
                        rgbaf: [0.5, 0.6, 0.7, 0.8]
                    }
                ],
                custom_color_sampled: {
                    epoch: '2012-06-01',
                    rgbaf: [
                        0, 0.1, 0.2, 0.3, 0.4,
                        60, 0.5, 0.6, 0.7, 0.8
                    ]
                },
                custom_date_constant: {
                    date: '2014-06-01'
                },
                custom_date_interval: [
                    {
                        interval: interval1,
                        date: '2014-06-01'
                    },
                    {
                        interval: interval2,
                        date: '2015-06-01'
                    }
                ]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));
        var entity = dataSource.entities.getById('MyID');
        expect(entity).toBeDefined();
        expect(entity.properties).toBeDefined();

        var time1 = JulianDate.fromIso8601('2012-06-01');
        var time2 = JulianDate.fromIso8601('2013-06-01');

        expect(entity.properties.custom_array_constant).toBeDefined();
        expect(entity.properties.custom_array_constant.getValue(time1)).toBeInstanceOf(Array);
        expect(entity.properties.custom_array_constant.getValue(time1)).toEqual(packet.properties.custom_array_constant.array);

        expect(entity.properties.custom_array_interval).toBeDefined();
        expect(entity.properties.custom_array_interval.getValue(time1)).toBeInstanceOf(Array);
        expect(entity.properties.custom_array_interval.getValue(time1)).toEqual(packet.properties.custom_array_interval[0].array);
        expect(entity.properties.custom_array_interval.getValue(time2)).toEqual(packet.properties.custom_array_interval[1].array);

        expect(entity.properties.custom_boolean_constant).toBeDefined();
        expect(entity.properties.custom_boolean_constant.getValue(time1)).toEqual(packet.properties.custom_boolean_constant.boolean);

        expect(entity.properties.custom_boolean_interval).toBeDefined();
        expect(entity.properties.custom_boolean_interval.getValue(time1)).toEqual(packet.properties.custom_boolean_interval[0].boolean);
        expect(entity.properties.custom_boolean_interval.getValue(time2)).toEqual(packet.properties.custom_boolean_interval[1].boolean);

        expect(entity.properties.custom_boundingRectangle_constant).toBeDefined();
        expect(entity.properties.custom_boundingRectangle_constant.getValue(time1)).toBeInstanceOf(BoundingRectangle);
        expect(entity.properties.custom_boundingRectangle_constant.getValue(time1)).toEqual(BoundingRectangle.unpack(packet.properties.custom_boundingRectangle_constant.boundingRectangle));

        expect(entity.properties.custom_boundingRectangle_interval).toBeDefined();
        expect(entity.properties.custom_boundingRectangle_interval.getValue(time1)).toBeInstanceOf(BoundingRectangle);
        expect(entity.properties.custom_boundingRectangle_interval.getValue(time1)).toEqual(BoundingRectangle.unpack(packet.properties.custom_boundingRectangle_interval[0].boundingRectangle));
        expect(entity.properties.custom_boundingRectangle_interval.getValue(time2)).toEqual(BoundingRectangle.unpack(packet.properties.custom_boundingRectangle_interval[1].boundingRectangle));

        expect(entity.properties.custom_boundingRectangle_sampled).toBeDefined();
        expect(entity.properties.custom_boundingRectangle_sampled.getValue(time1)).toBeInstanceOf(BoundingRectangle);
        expect(entity.properties.custom_boundingRectangle_sampled.getValue(time1)).toEqual(BoundingRectangle.unpack(packet.properties.custom_boundingRectangle_sampled.boundingRectangle, 0 + 1));
        expect(entity.properties.custom_boundingRectangle_sampled.getValue(JulianDate.addSeconds(time1, 60, new JulianDate()))).toEqual(BoundingRectangle.unpack(packet.properties.custom_boundingRectangle_sampled.boundingRectangle, 4 + 2));

        expect(entity.properties.custom_cartesian2_constant).toBeDefined();
        expect(entity.properties.custom_cartesian2_constant.getValue(time1)).toBeInstanceOf(Cartesian2);
        expect(entity.properties.custom_cartesian2_constant.getValue(time1)).toEqual(Cartesian2.unpack(packet.properties.custom_cartesian2_constant.cartesian2));

        expect(entity.properties.custom_cartesian2_interval).toBeDefined();
        expect(entity.properties.custom_cartesian2_interval.getValue(time1)).toBeInstanceOf(Cartesian2);
        expect(entity.properties.custom_cartesian2_interval.getValue(time1)).toEqual(Cartesian2.unpack(packet.properties.custom_cartesian2_interval[0].cartesian2));
        expect(entity.properties.custom_cartesian2_interval.getValue(time2)).toEqual(Cartesian2.unpack(packet.properties.custom_cartesian2_interval[1].cartesian2));

        expect(entity.properties.custom_cartesian2_sampled).toBeDefined();
        expect(entity.properties.custom_cartesian2_sampled.getValue(time1)).toBeInstanceOf(Cartesian2);
        expect(entity.properties.custom_cartesian2_sampled.getValue(time1)).toEqual(Cartesian2.unpack(packet.properties.custom_cartesian2_sampled.cartesian2, 0 + 1));
        expect(entity.properties.custom_cartesian2_sampled.getValue(JulianDate.addSeconds(time1, 60, new JulianDate()))).toEqual(Cartesian2.unpack(packet.properties.custom_cartesian2_sampled.cartesian2, 2 + 2));

        expect(entity.properties.custom_cartesian_constant).toBeDefined();
        expect(entity.properties.custom_cartesian_constant.getValue(time1)).toBeInstanceOf(Cartesian3);
        expect(entity.properties.custom_cartesian_constant.getValue(time1)).toEqual(Cartesian3.unpack(packet.properties.custom_cartesian_constant.cartesian));

        expect(entity.properties.custom_cartesian_interval).toBeDefined();
        expect(entity.properties.custom_cartesian_interval.getValue(time1)).toBeInstanceOf(Cartesian3);
        expect(entity.properties.custom_cartesian_interval.getValue(time1)).toEqual(Cartesian3.unpack(packet.properties.custom_cartesian_interval[0].cartesian));
        expect(entity.properties.custom_cartesian_interval.getValue(time2)).toEqual(Cartesian3.unpack(packet.properties.custom_cartesian_interval[1].cartesian));

        expect(entity.properties.custom_cartesian_sampled).toBeDefined();
        expect(entity.properties.custom_cartesian_sampled.getValue(time1)).toBeInstanceOf(Cartesian3);
        expect(entity.properties.custom_cartesian_sampled.getValue(time1)).toEqual(Cartesian3.unpack(packet.properties.custom_cartesian_sampled.cartesian, 0 + 1));
        expect(entity.properties.custom_cartesian_sampled.getValue(JulianDate.addSeconds(time1, 60, new JulianDate()))).toEqual(Cartesian3.unpack(packet.properties.custom_cartesian_sampled.cartesian, 3 + 2));

        expect(entity.properties.custom_color_constant).toBeDefined();
        expect(entity.properties.custom_color_constant.getValue(time1)).toBeInstanceOf(Color);
        expect(entity.properties.custom_color_constant.getValue(time1)).toEqual(Color.unpack(packet.properties.custom_color_constant.rgbaf));

        expect(entity.properties.custom_color_interval).toBeDefined();
        expect(entity.properties.custom_color_interval.getValue(time1)).toBeInstanceOf(Color);
        expect(entity.properties.custom_color_interval.getValue(time1)).toEqual(Color.unpack(packet.properties.custom_color_interval[0].rgbaf));
        expect(entity.properties.custom_color_interval.getValue(time2)).toEqual(Color.unpack(packet.properties.custom_color_interval[1].rgbaf));

        expect(entity.properties.custom_color_sampled).toBeDefined();
        expect(entity.properties.custom_color_sampled.getValue(time1)).toBeInstanceOf(Color);
        expect(entity.properties.custom_color_sampled.getValue(time1)).toEqual(Color.unpack(packet.properties.custom_color_sampled.rgbaf, 0 + 1));
        expect(entity.properties.custom_color_sampled.getValue(JulianDate.addSeconds(time1, 60, new JulianDate()))).toEqual(Color.unpack(packet.properties.custom_color_sampled.rgbaf, 4 + 2));

        expect(entity.properties.custom_date_constant).toBeDefined();
        expect(entity.properties.custom_date_constant.getValue(time1)).toBeInstanceOf(JulianDate);
        expect(entity.properties.custom_date_constant.getValue(time1)).toEqual(JulianDate.fromIso8601(packet.properties.custom_date_constant.date));

        expect(entity.properties.custom_date_interval).toBeDefined();
        expect(entity.properties.custom_date_interval.getValue(time1)).toBeInstanceOf(JulianDate);
        expect(entity.properties.custom_date_interval.getValue(time1)).toEqual(JulianDate.fromIso8601(packet.properties.custom_date_interval[0].date));
        expect(entity.properties.custom_date_interval.getValue(time2)).toEqual(JulianDate.fromIso8601(packet.properties.custom_date_interval[1].date));
    });

    it('handles properties in a way that allows CompositeEntityCollection to work', function() {
        var testObject1 = {
            foo: 4,
            bar: {
                name: 'bar'
            }
        };
        var testArray1 = [2, 4, 16, 'test'];
        var packet1 = {
            id: 'test',
            properties: {
                constant_name: 'ABC',
                constant_height: 8,
                constant_object: {
                    value: testObject1
                },
                constant_array: {
                    value: testArray1
                }
            }
        };

        var dataSource1 = new CzmlDataSource();
        dataSource1.load(makePacket(packet1));

        var dataSource2 = new CzmlDataSource();
        var composite = new CompositeEntityCollection([dataSource1.entities, dataSource2.entities]);

        // Initially we use all the properties from dataSource1.
        var entity = composite.values[0];
        expect(entity.properties.constant_name.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet1.properties.constant_name);
        expect(entity.properties.constant_height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet1.properties.constant_height);
        expect(entity.properties.constant_object.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testObject1);
        expect(entity.properties.constant_array.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testArray1);

        // Load a new packet into dataSource2 and it should take precedence in the composite.
        var packet2 = {
            id: 'test',
            properties: {
                constant_name: 'DEF'
            }
        };

        dataSource2.load(makePacket(packet2));

        entity = composite.values[0];
        expect(entity.properties.constant_name.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet2.properties.constant_name);
        expect(entity.properties.constant_height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet1.properties.constant_height);
        expect(entity.properties.constant_object.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testObject1);
        expect(entity.properties.constant_array.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testArray1);

        // Changed values should be mirrored in the composite, too.
        var testObject3 = {
            some: 'value'
        };
        var testArray3 = ['not', 'the', 'same', 4];
        var packet3 = {
            id: 'test',
            properties: {
                constant_height: 9,
                constant_object: {
                    value: testObject3
                },
                constant_array: {
                    value: testArray3
                }
            }
        };

        dataSource2.process(packet3);

        entity = composite.values[0];
        expect(entity.properties.constant_name.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet2.properties.constant_name);
        expect(entity.properties.constant_height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet3.properties.constant_height);
        expect(entity.properties.constant_object.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testObject3);
        expect(entity.properties.constant_array.getValue(Iso8601.MINIMUM_VALUE)).toEqual(testArray3);
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
                closeBottom : false,
                shadows : 'ENABLED'
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
        expect(entity.polygon.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                show : true,
                shadows : 'ENABLED'
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
        expect(entity.polygon.shadows.getValue(validTime)).toEqual(ShadowMode.ENABLED);

        expect(entity.polygon.material.getValue(invalidTime)).toBeUndefined();
        expect(entity.polygon.show.getValue(invalidTime)).toBeUndefined();
        expect(entity.polygon.shadows.getValue(invalidTime)).toBeUndefined();

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
                show : true,
                shadows : 'ENABLED'
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
        expect(entity.polyline.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                show : true,
                shadows : 'ENABLED'
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
        expect(entity.polyline.shadows.getValue(validTime)).toEqual(ShadowMode.ENABLED);

        expect(entity.polyline.material.getValue(invalidTime)).toBeUndefined();
        expect(entity.polyline.width.getValue(invalidTime)).toBeUndefined();
        expect(entity.polyline.show.getValue(invalidTime)).toBeUndefined();
        expect(entity.polyline.shadows.getValue(invalidTime)).toBeUndefined();
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
                shadows : 'ENABLED',
                heightReference : 'CLAMP_TO_GROUND',
                silhouetteColor : {
                    rgbaf : [1.0, 0.0, 0.0, 1.0]
                },
                silhouetteSize : 2.0,
                color : {
                    rgbaf : [0.0, 1.0, 0.0, 0.2]
                },
                colorBlendMode : 'HIGHLIGHT',
                colorBlendAmount : 0.5,
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
        expect(entity.model.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
        expect(entity.model.heightReference.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HeightReference.CLAMP_TO_GROUND);
        expect(entity.model.silhouetteColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(entity.model.silhouetteSize.getValue(Iso8601.MINIMUM_VALUE)).toEqual(2.0);
        expect(entity.model.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.0, 1.0, 0.0, 0.2));
        expect(entity.model.colorBlendMode.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ColorBlendMode.HIGHLIGHT);
        expect(entity.model.colorBlendAmount.getValue(Iso8601.MINIMUM_VALUE)).toEqual(0.5);

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
                shadows : 'ENABLED',
                heightReference: 'CLAMP_TO_GROUND',
                silhouetteColor : {
                    rgbaf : [1.0, 0.0, 0.0, 1.0]
                },
                silhouetteSize : 2.0,
                color : {
                    rgbaf : [0.0, 1.0, 0.0, 0.2]
                },
                colorBlendMode : 'HIGHLIGHT',
                colorBlendAmount : 0.5,
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
        expect(entity.model.shadows.getValue(validTime)).toEqual(ShadowMode.ENABLED);
        expect(entity.model.heightReference.getValue(validTime)).toEqual(HeightReference.CLAMP_TO_GROUND);
        expect(entity.model.silhouetteColor.getValue(validTime)).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(entity.model.silhouetteSize.getValue(validTime)).toEqual(2.0);
        expect(entity.model.color.getValue(validTime)).toEqual(new Color(0.0, 1.0, 0.0, 0.2));
        expect(entity.model.colorBlendMode.getValue(validTime)).toEqual(ColorBlendMode.HIGHLIGHT);
        expect(entity.model.colorBlendAmount.getValue(validTime)).toEqual(0.5);

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
        expect(entity.model.shadows.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.heightReference.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.color.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.silhouetteColor.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.silhouetteSize.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.colorBlendMode.getValue(invalidTime)).toBeUndefined();
        expect(entity.model.colorBlendAmount.getValue(invalidTime)).toBeUndefined();

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
                outlineWidth : 6,
                shadows : 'ENABLED'
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
        expect(entity.rectangle.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                outlineWidth : 6,
                shadows : 'ENABLED'
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
        expect(entity.wall.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                outlineWidth : 6,
                shadows : 'ENABLED'
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
        expect(entity.box.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                slices : 100,
                shadows : 'ENABLED'
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
        expect(entity.cylinder.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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
                outlineWidth : 6,
                shadows : 'ENABLED'
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
        expect(entity.corridor.shadows.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ShadowMode.ENABLED);
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

    it('Polyline dash.', function() {
        var packet = {
            id : 'polylineDash',
            polyline : {
                material : {
                    polylineDash : {
                        color : {
                            rgbaf : [0.1, 0.2, 0.3, 0.4]
                        },
                        dashLength: 16.0,
                        dashPattern: 7.0
                    }
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(makePacket(packet));

        var entity = dataSource.entities.getById('polylineDash');
        expect(entity.polyline.material.color.getValue()).toEqual(new Color(0.1, 0.2, 0.3, 0.4));
        expect(entity.polyline.material.dashLength.getValue()).toEqual(16.0);
        expect(entity.polyline.material.dashPattern.getValue()).toEqual(7.0);
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
    // GenerateFromSchema.exe -p ..\..\..\..\Schema\Packet.json -t validation -o ..\..\..\CesiumLanguageWriterTests\
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
            expect(e.description.getValue(date)).toEqual('string31449');
            expect(e.position.getValue(date)).toEqual(new Cartesian3(24944, 16481, 24896));
            expect(e.orientation.getValue(date)).toEqualEpsilon(new Quaternion(0.431493311977589, 0.560811914509339, 0.423522822587574, 0.565625261998114), 1e-14);
            expect(e.viewFrom.getValue(date)).toEqual(new Cartesian3(17794, 13381, 18228));
            expect(e.billboard.show.getValue(date)).toEqual(true);
            expect(e.billboard.image.getValue(date)).toEqual('http://example.com/3792');
            expect(e.billboard.scale.getValue(date)).toEqual(27514.0);
            expect(e.billboard.pixelOffset.getValue(date)).toEqual(new Cartesian2(16996, 51010));
            expect(e.billboard.eyeOffset.getValue(date)).toEqual(new Cartesian3(64633, 11516, 17196));
            expect(e.billboard.horizontalOrigin.getValue(date)).toEqual(HorizontalOrigin.LEFT);
            expect(e.billboard.verticalOrigin.getValue(date)).toEqual(VerticalOrigin.BOTTOM);
            expect(e.billboard.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.billboard.color.getValue(date)).toEqual(Color.fromBytes(87, 118, 167, 140));
            expect(e.billboard.rotation.getValue(date)).toEqual(57379.0);
            expect(e.billboard.alignedAxis.getValue(date)).toEqualEpsilon(new Cartesian3(0.205062091895724, 0.975768213485699, 0.0763277932228903), 1e-14);
            expect(e.billboard.sizeInMeters.getValue(date)).toEqual(true);
            expect(e.billboard.width.getValue(date)).toEqual(25197.0);
            expect(e.billboard.height.getValue(date)).toEqual(53328.0);
            expect(e.billboard.scaleByDistance.getValue(date)).toEqual(new NearFarScalar(59318, 31207, 63353, 55287));
            expect(e.billboard.translucencyByDistance.getValue(date)).toEqual(new NearFarScalar(43707, 31146, 12921, 57138));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(date)).toEqual(new NearFarScalar(11873, 40494, 29598, 27507));
            expect(e.billboard.imageSubRegion.getValue(date)).toEqual(new BoundingRectangle(62620, 63220, 23030, 63321));
            expect(e.box.show.getValue(date)).toEqual(true);
            expect(e.box.dimensions.getValue(date)).toEqual(new Cartesian3(57494, 62432, 42995));
            expect(e.box.fill.getValue(date)).toEqual(true);
            expect(e.box.material.color.getValue(date)).toEqual(Color.fromBytes(88, 226, 91, 144));
            expect(e.box.outline.getValue(date)).toEqual(true);
            expect(e.box.outlineColor.getValue(date)).toEqual(Color.fromBytes(121, 42, 244, 168));
            expect(e.box.outlineWidth.getValue(date)).toEqual(15323.0);
            expect(e.box.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.corridor.show.getValue(date)).toEqual(true);
            expect(e.corridor.positions.getValue(date)).toEqual([ new Cartesian3(36415, 2702, 36618), new Cartesian3(47759, 11706, 63277) ]);
            expect(e.corridor.width.getValue(date)).toEqual(20413.0);
            expect(e.corridor.height.getValue(date)).toEqual(8062.0);
            expect(e.corridor.extrudedHeight.getValue(date)).toEqual(22846.0);
            expect(e.corridor.cornerType.getValue(date)).toEqual(CornerType.BEVELED);
            expect(e.corridor.granularity.getValue(date)).toEqual(44105.0);
            expect(e.corridor.fill.getValue(date)).toEqual(true);
            expect(e.corridor.material.color.getValue(date)).toEqual(Color.fromBytes(230, 252, 22, 236));
            expect(e.corridor.outline.getValue(date)).toEqual(true);
            expect(e.corridor.outlineColor.getValue(date)).toEqual(Color.fromBytes(198, 25, 134, 60));
            expect(e.corridor.outlineWidth.getValue(date)).toEqual(9132.0);
            expect(e.corridor.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.cylinder.show.getValue(date)).toEqual(true);
            expect(e.cylinder.length.getValue(date)).toEqual(33298.0);
            expect(e.cylinder.topRadius.getValue(date)).toEqual(16245.0);
            expect(e.cylinder.bottomRadius.getValue(date)).toEqual(59378.0);
            expect(e.cylinder.fill.getValue(date)).toEqual(true);
            expect(e.cylinder.material.color.getValue(date)).toEqual(Color.fromBytes(216, 68, 53, 64));
            expect(e.cylinder.outline.getValue(date)).toEqual(true);
            expect(e.cylinder.outlineColor.getValue(date)).toEqual(Color.fromBytes(4, 90, 209, 96));
            expect(e.cylinder.outlineWidth.getValue(date)).toEqual(64018.0);
            expect(e.cylinder.numberOfVerticalLines.getValue(date)).toEqual(38567.0);
            expect(e.cylinder.slices.getValue(date)).toEqual(39979.0);
            expect(e.cylinder.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.ellipse.show.getValue(date)).toEqual(true);
            expect(e.ellipse.semiMajorAxis.getValue(date)).toEqual(60072.0);
            expect(e.ellipse.semiMinorAxis.getValue(date)).toEqual(38653.0);
            expect(e.ellipse.height.getValue(date)).toEqual(15549.0);
            expect(e.ellipse.extrudedHeight.getValue(date)).toEqual(55640.0);
            expect(e.ellipse.rotation.getValue(date)).toEqual(27722.0);
            expect(e.ellipse.stRotation.getValue(date)).toEqual(4692.0);
            expect(e.ellipse.granularity.getValue(date)).toEqual(62192.0);
            expect(e.ellipse.fill.getValue(date)).toEqual(true);
            expect(e.ellipse.material.color.getValue(date)).toEqual(Color.fromBytes(116, 186, 200, 40));
            expect(e.ellipse.outline.getValue(date)).toEqual(true);
            expect(e.ellipse.outlineColor.getValue(date)).toEqual(Color.fromBytes(160, 82, 145, 104));
            expect(e.ellipse.outlineWidth.getValue(date)).toEqual(8839.0);
            expect(e.ellipse.numberOfVerticalLines.getValue(date)).toEqual(38878.0);
            expect(e.ellipse.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.ellipsoid.show.getValue(date)).toEqual(true);
            expect(e.ellipsoid.radii.getValue(date)).toEqual(new Cartesian3(15638, 24381, 37983));
            expect(e.ellipsoid.fill.getValue(date)).toEqual(true);
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(Color.fromBytes(202, 67, 110, 69));
            expect(e.ellipsoid.outline.getValue(date)).toEqual(true);
            expect(e.ellipsoid.outlineColor.getValue(date)).toEqual(Color.fromBytes(55, 23, 226, 7));
            expect(e.ellipsoid.outlineWidth.getValue(date)).toEqual(47507.0);
            expect(e.ellipsoid.stackPartitions.getValue(date)).toEqual(54278.0);
            expect(e.ellipsoid.slicePartitions.getValue(date)).toEqual(28562.0);
            expect(e.ellipsoid.subdivisions.getValue(date)).toEqual(14008.0);
            expect(e.ellipsoid.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.label.show.getValue(date)).toEqual(true);
            expect(e.label.text.getValue(date)).toEqual('string36641');
            expect(e.label.font.getValue(date)).toEqual('14px sans-serif');
            expect(e.label.style.getValue(date)).toEqual(LabelStyle.FILL_AND_OUTLINE);
            expect(e.label.scale.getValue(date)).toEqual(6510.0);
            expect(e.label.showBackground.getValue(date)).toEqual(true);
            expect(e.label.backgroundColor.getValue(date)).toEqual(Color.fromBytes(225, 114, 54, 128));
            expect(e.label.backgroundPadding.getValue(date)).toEqual(new Cartesian2(5508, 56341));
            expect(e.label.pixelOffset.getValue(date)).toEqual(new Cartesian2(25913, 30821));
            expect(e.label.eyeOffset.getValue(date)).toEqual(new Cartesian3(30502, 29047, 25457));
            expect(e.label.horizontalOrigin.getValue(date)).toEqual(HorizontalOrigin.LEFT);
            expect(e.label.verticalOrigin.getValue(date)).toEqual(VerticalOrigin.BOTTOM);
            expect(e.label.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.label.fillColor.getValue(date)).toEqual(Color.fromBytes(88, 197, 147, 137));
            expect(e.label.outlineColor.getValue(date)).toEqual(Color.fromBytes(171, 128, 159, 223));
            expect(e.label.outlineWidth.getValue(date)).toEqual(36637.0);
            expect(e.label.translucencyByDistance.getValue(date)).toEqual(new NearFarScalar(34067, 16517, 11328, 13612));
            expect(e.label.pixelOffsetScaleByDistance.getValue(date)).toEqual(new NearFarScalar(21220, 35154, 33161, 36737));
            expect(e.model.show.getValue(date)).toEqual(true);
            expect(e.model.uri.getValue(date)).toEqual('http://example.com/60043');
            expect(e.model.scale.getValue(date)).toEqual(44278.0);
            expect(e.model.minimumPixelSize.getValue(date)).toEqual(35888.0);
            expect(e.model.maximumScale.getValue(date)).toEqual(64305.0);
            expect(e.model.incrementallyLoadTextures.getValue(date)).toEqual(true);
            expect(e.model.runAnimations.getValue(date)).toEqual(true);
            expect(e.model.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.model.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.model.silhouetteColor.getValue(date)).toEqual(Color.fromBytes(29, 61, 52, 101));
            expect(e.model.silhouetteSize.getValue(date)).toEqual(4645.0);
            expect(e.model.color.getValue(date)).toEqual(Color.fromBytes(0, 52, 75, 73));
            expect(e.model.colorBlendMode.getValue(date)).toEqual(ColorBlendMode.REPLACE);
            expect(e.model.colorBlendAmount.getValue(date)).toEqual(7475.0);
            expect(e.model.nodeTransformations.prop.translation.getValue(date)).toEqual(new Cartesian3(18548, 48456, 21181));
            expect(e.model.nodeTransformations.prop.rotation.getValue(date)).toEqualEpsilon(new Quaternion(0.527960606328925, 0.567156704919186, 0.624812964569899, 0.0959146992664751), 1e-14);
            expect(e.model.nodeTransformations.prop.scale.getValue(date)).toEqual(new Cartesian3(53739, 37841, 41107));
            expect(e.path.show.getValue(date)).toEqual(true);
            expect(e.path.width.getValue(date)).toEqual(56040.0);
            expect(e.path.resolution.getValue(date)).toEqual(31563.0);
            expect(e.path.leadTime.getValue(date)).toEqual(5997.0);
            expect(e.path.trailTime.getValue(date)).toEqual(52915.0);
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(10, 78, 168, 13));
            expect(e.point.show.getValue(date)).toEqual(true);
            expect(e.point.pixelSize.getValue(date)).toEqual(53869.0);
            expect(e.point.heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.point.color.getValue(date)).toEqual(Color.fromBytes(3, 147, 219, 77));
            expect(e.point.outlineColor.getValue(date)).toEqual(Color.fromBytes(254, 106, 11, 94));
            expect(e.point.outlineWidth.getValue(date)).toEqual(27922.0);
            expect(e.point.scaleByDistance.getValue(date)).toEqual(new NearFarScalar(20128, 16462, 49728, 18882));
            expect(e.point.translucencyByDistance.getValue(date)).toEqual(new NearFarScalar(52796, 43982, 61099, 50158));
            expect(e.polygon.show.getValue(date)).toEqual(true);
            expect(e.polygon.hierarchy.getValue(date)).toEqual([ new Cartesian3(39143, 2200, 6408), new Cartesian3(27161, 33386, 62338) ]);
            expect(e.polygon.height.getValue(date)).toEqual(26391.0);
            expect(e.polygon.extrudedHeight.getValue(date)).toEqual(15922.0);
            expect(e.polygon.stRotation.getValue(date)).toEqual(2555.0);
            expect(e.polygon.granularity.getValue(date)).toEqual(17060.0);
            expect(e.polygon.fill.getValue(date)).toEqual(true);
            expect(e.polygon.material.color.getValue(date)).toEqual(Color.fromBytes(216, 139, 124, 253));
            expect(e.polygon.outline.getValue(date)).toEqual(true);
            expect(e.polygon.outlineColor.getValue(date)).toEqual(Color.fromBytes(172, 48, 134, 87));
            expect(e.polygon.outlineWidth.getValue(date)).toEqual(62220.0);
            expect(e.polygon.perPositionHeight.getValue(date)).toEqual(true);
            expect(e.polygon.closeTop.getValue(date)).toEqual(true);
            expect(e.polygon.closeBottom.getValue(date)).toEqual(true);
            expect(e.polygon.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.polyline.show.getValue(date)).toEqual(true);
            expect(e.polyline.positions.getValue(date)).toEqual([ new Cartesian3(23333, 31067, 17529), new Cartesian3(57924, 41186, 31648) ]);
            expect(e.polyline.width.getValue(date)).toEqual(14667.0);
            expect(e.polyline.granularity.getValue(date)).toEqual(53395.0);
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(88, 0, 232, 230));
            expect(e.polyline.followSurface.getValue(date)).toEqual(true);
            expect(e.polyline.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.rectangle.show.getValue(date)).toEqual(true);
            expect(e.rectangle.coordinates.getValue(date)).toEqual(new Rectangle(1.13325368272577, 0.703573207377445, 0.756676249095309, 0.339217858685931));
            expect(e.rectangle.height.getValue(date)).toEqual(20608.0);
            expect(e.rectangle.extrudedHeight.getValue(date)).toEqual(23002.0);
            expect(e.rectangle.rotation.getValue(date)).toEqual(54979.0);
            expect(e.rectangle.stRotation.getValue(date)).toEqual(8079.0);
            expect(e.rectangle.granularity.getValue(date)).toEqual(60343.0);
            expect(e.rectangle.fill.getValue(date)).toEqual(true);
            expect(e.rectangle.material.color.getValue(date)).toEqual(Color.fromBytes(160, 249, 70, 249));
            expect(e.rectangle.outline.getValue(date)).toEqual(true);
            expect(e.rectangle.outlineColor.getValue(date)).toEqual(Color.fromBytes(196, 59, 142, 36));
            expect(e.rectangle.outlineWidth.getValue(date)).toEqual(59794.0);
            expect(e.rectangle.closeTop.getValue(date)).toEqual(true);
            expect(e.rectangle.closeBottom.getValue(date)).toEqual(true);
            expect(e.rectangle.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.wall.show.getValue(date)).toEqual(true);
            expect(e.wall.positions.getValue(date)).toEqual([ new Cartesian3(21681, 40276, 30621), new Cartesian3(3959, 61967, 19442) ]);
            expect(e.wall.minimumHeights.getValue(date)).toEqual([ 49466, 44737 ]);
            expect(e.wall.maximumHeights.getValue(date)).toEqual([ 59672, 62697 ]);
            expect(e.wall.granularity.getValue(date)).toEqual(47652.0);
            expect(e.wall.fill.getValue(date)).toEqual(true);
            expect(e.wall.material.color.getValue(date)).toEqual(Color.fromBytes(64, 176, 190, 65));
            expect(e.wall.outline.getValue(date)).toEqual(true);
            expect(e.wall.outlineColor.getValue(date)).toEqual(Color.fromBytes(107, 196, 96, 198));
            expect(e.wall.outlineWidth.getValue(date)).toEqual(50458.0);
            expect(e.wall.shadows.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e = dataSource.entities.getById('constant_position_cartographicRadians')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(Cartesian3.fromRadians(0.368123392863751, 0.678098621973879, 32050));
            expect(e = dataSource.entities.getById('constant_position_cartographicDegrees')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(Cartesian3.fromDegrees(14, 14, 24697));
            expect(e = dataSource.entities.getById('constant_position_cartesianVelocity')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(new Cartesian3(15776, 23613, 14940));
            expect(e = dataSource.entities.getById('constant_billboard_color_rgbaf')).toBeDefined();
            expect(e.billboard.color.getValue(date)).toEqualEpsilon(new Color(0.674509803921569, 0.866666666666667, 0.6, 0.650980392156863), 1e-14);
            expect(e = dataSource.entities.getById('constant_billboard_alignedAxis_unitSpherical')).toBeDefined();
            expect(e.billboard.alignedAxis.getValue(date)).toEqual(Cartesian3.fromSpherical(new Spherical(20514, 39760)));
            expect(e = dataSource.entities.getById('constant_box_material_solidColor_color')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqualEpsilon(new Color(0.996078431372549, 0.0823529411764706, 0.494117647058824, 0.101960784313725), 1e-14);
            expect(e = dataSource.entities.getById('material_box_material_image')).toBeDefined();
            expect(e.box.material.image.getValue(date)).toEqual('http://example.com/50881');
            expect(e.box.material.repeat.getValue(date)).toEqual(new Cartesian2(58955, 45286));
            expect(e.box.material.color.getValue(date)).toEqual(Color.fromBytes(98, 97, 133, 129));
            expect(e.box.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_box_material_grid')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqual(Color.fromBytes(178, 10, 106, 226));
            expect(e.box.material.cellAlpha.getValue(date)).toEqual(47180.0);
            expect(e.box.material.lineCount.getValue(date)).toEqual(new Cartesian2(24659, 13408));
            expect(e.box.material.lineThickness.getValue(date)).toEqual(new Cartesian2(13897, 25654));
            expect(e.box.material.lineOffset.getValue(date)).toEqual(new Cartesian2(14153, 49207));
            expect(e = dataSource.entities.getById('material_box_material_stripe')).toBeDefined();
            expect(e.box.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.box.material.evenColor.getValue(date)).toEqual(Color.fromBytes(18, 147, 177, 80));
            expect(e.box.material.oddColor.getValue(date)).toEqual(Color.fromBytes(189, 226, 187, 107));
            expect(e.box.material.offset.getValue(date)).toEqual(43563.0);
            expect(e.box.material.repeat.getValue(date)).toEqual(24480.0);
            expect(e = dataSource.entities.getById('constant_box_material_image_color')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqualEpsilon(new Color(0.733333333333333, 0.474509803921569, 0.56078431372549, 0.349019607843137), 1e-14);
            expect(e = dataSource.entities.getById('constant_box_material_grid_color')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqualEpsilon(new Color(0.847058823529412, 0.392156862745098, 0.352941176470588, 0.898039215686275), 1e-14);
            expect(e = dataSource.entities.getById('constant_box_material_stripe_evenColor')).toBeDefined();
            expect(e.box.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.666666666666667, 0.976470588235294, 0.83921568627451, 0.643137254901961), 1e-14);
            expect(e = dataSource.entities.getById('constant_box_material_stripe_oddColor')).toBeDefined();
            expect(e.box.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.258823529411765, 0.796078431372549, 0.717647058823529, 0.749019607843137), 1e-14);
            expect(e = dataSource.entities.getById('constant_box_outlineColor_rgbaf')).toBeDefined();
            expect(e.box.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.835294117647059, 0.0313725490196078, 0.282352941176471, 0.337254901960784), 1e-14);
            expect(e = dataSource.entities.getById('constant_corridor_positions_cartographicRadians')).toBeDefined();
            expect(e.corridor.positions.getValue(date)).toEqual([ Cartesian3.fromRadians(0.220356654342316, 0.879184920197648, 64909), Cartesian3.fromRadians(0.175978952571564, 1.00316515710468, 913) ]);
            expect(e = dataSource.entities.getById('constant_corridor_positions_cartographicDegrees')).toBeDefined();
            expect(e.corridor.positions.getValue(date)).toEqual([ Cartesian3.fromDegrees(28, 14, 63058), Cartesian3.fromDegrees(15, 37, 26381) ]);
            expect(e = dataSource.entities.getById('constant_corridor_material_solidColor_color')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqualEpsilon(new Color(0.333333333333333, 0.87843137254902, 0.356862745098039, 0.435294117647059), 1e-14);
            expect(e = dataSource.entities.getById('material_corridor_material_image')).toBeDefined();
            expect(e.corridor.material.image.getValue(date)).toEqual('http://example.com/8903');
            expect(e.corridor.material.repeat.getValue(date)).toEqual(new Cartesian2(41660, 35234));
            expect(e.corridor.material.color.getValue(date)).toEqual(Color.fromBytes(213, 25, 147, 247));
            expect(e.corridor.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_corridor_material_grid')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqual(Color.fromBytes(236, 51, 112, 235));
            expect(e.corridor.material.cellAlpha.getValue(date)).toEqual(11472.0);
            expect(e.corridor.material.lineCount.getValue(date)).toEqual(new Cartesian2(1254, 38404));
            expect(e.corridor.material.lineThickness.getValue(date)).toEqual(new Cartesian2(48962, 63679));
            expect(e.corridor.material.lineOffset.getValue(date)).toEqual(new Cartesian2(39061, 47000));
            expect(e = dataSource.entities.getById('material_corridor_material_stripe')).toBeDefined();
            expect(e.corridor.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.corridor.material.evenColor.getValue(date)).toEqual(Color.fromBytes(245, 61, 208, 138));
            expect(e.corridor.material.oddColor.getValue(date)).toEqual(Color.fromBytes(114, 73, 91, 165));
            expect(e.corridor.material.offset.getValue(date)).toEqual(12788.0);
            expect(e.corridor.material.repeat.getValue(date)).toEqual(33136.0);
            expect(e = dataSource.entities.getById('constant_corridor_material_image_color')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqualEpsilon(new Color(0.0156862745098039, 0.0941176470588235, 0.4, 0.529411764705882), 1e-14);
            expect(e = dataSource.entities.getById('constant_corridor_material_grid_color')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqualEpsilon(new Color(0.576470588235294, 0.76078431372549, 0.152941176470588, 0.00392156862745098), 1e-14);
            expect(e = dataSource.entities.getById('constant_corridor_material_stripe_evenColor')).toBeDefined();
            expect(e.corridor.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.913725490196078, 0.63921568627451, 0.631372549019608, 0.890196078431373), 1e-14);
            expect(e = dataSource.entities.getById('constant_corridor_material_stripe_oddColor')).toBeDefined();
            expect(e.corridor.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.2, 0.137254901960784, 0.792156862745098, 0.301960784313725), 1e-14);
            expect(e = dataSource.entities.getById('constant_corridor_outlineColor_rgbaf')).toBeDefined();
            expect(e.corridor.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.690196078431373, 0.0549019607843137, 0.247058823529412, 0.298039215686275), 1e-14);
            expect(e = dataSource.entities.getById('constant_cylinder_material_solidColor_color')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqualEpsilon(new Color(0.47843137254902, 0.0509803921568627, 0.450980392156863, 0.87843137254902), 1e-14);
            expect(e = dataSource.entities.getById('material_cylinder_material_image')).toBeDefined();
            expect(e.cylinder.material.image.getValue(date)).toEqual('http://example.com/27447');
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(new Cartesian2(65243, 41470));
            expect(e.cylinder.material.color.getValue(date)).toEqual(Color.fromBytes(200, 175, 107, 217));
            expect(e.cylinder.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_cylinder_material_grid')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqual(Color.fromBytes(173, 210, 231, 62));
            expect(e.cylinder.material.cellAlpha.getValue(date)).toEqual(9555.0);
            expect(e.cylinder.material.lineCount.getValue(date)).toEqual(new Cartesian2(58545, 26852));
            expect(e.cylinder.material.lineThickness.getValue(date)).toEqual(new Cartesian2(58520, 44260));
            expect(e.cylinder.material.lineOffset.getValue(date)).toEqual(new Cartesian2(61513, 28656));
            expect(e = dataSource.entities.getById('material_cylinder_material_stripe')).toBeDefined();
            expect(e.cylinder.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.cylinder.material.evenColor.getValue(date)).toEqual(Color.fromBytes(158, 155, 154, 86));
            expect(e.cylinder.material.oddColor.getValue(date)).toEqual(Color.fromBytes(191, 226, 188, 74));
            expect(e.cylinder.material.offset.getValue(date)).toEqual(55018.0);
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(33073.0);
            expect(e = dataSource.entities.getById('constant_cylinder_material_image_color')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqualEpsilon(new Color(0.654901960784314, 0.0627450980392157, 0.517647058823529, 0.537254901960784), 1e-14);
            expect(e = dataSource.entities.getById('constant_cylinder_material_grid_color')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqualEpsilon(new Color(0.901960784313726, 0.364705882352941, 0.305882352941176, 0.945098039215686), 1e-14);
            expect(e = dataSource.entities.getById('constant_cylinder_material_stripe_evenColor')).toBeDefined();
            expect(e.cylinder.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.0901960784313725, 0.133333333333333, 0.372549019607843, 0.498039215686275), 1e-14);
            expect(e = dataSource.entities.getById('constant_cylinder_material_stripe_oddColor')).toBeDefined();
            expect(e.cylinder.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.905882352941176, 0.564705882352941, 0.486274509803922, 0.67843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_cylinder_outlineColor_rgbaf')).toBeDefined();
            expect(e.cylinder.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.647058823529412, 0.564705882352941, 0.4, 0.0862745098039216), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipse_material_solidColor_color')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqualEpsilon(new Color(0.0980392156862745, 0.913725490196078, 0.811764705882353, 0.2), 1e-14);
            expect(e = dataSource.entities.getById('material_ellipse_material_image')).toBeDefined();
            expect(e.ellipse.material.image.getValue(date)).toEqual('http://example.com/2481');
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(new Cartesian2(45447, 53937));
            expect(e.ellipse.material.color.getValue(date)).toEqual(Color.fromBytes(45, 86, 136, 120));
            expect(e.ellipse.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_ellipse_material_grid')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqual(Color.fromBytes(217, 159, 32, 60));
            expect(e.ellipse.material.cellAlpha.getValue(date)).toEqual(24764.0);
            expect(e.ellipse.material.lineCount.getValue(date)).toEqual(new Cartesian2(25721, 6500));
            expect(e.ellipse.material.lineThickness.getValue(date)).toEqual(new Cartesian2(57205, 63455));
            expect(e.ellipse.material.lineOffset.getValue(date)).toEqual(new Cartesian2(49829, 3778));
            expect(e = dataSource.entities.getById('material_ellipse_material_stripe')).toBeDefined();
            expect(e.ellipse.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.ellipse.material.evenColor.getValue(date)).toEqual(Color.fromBytes(7, 152, 58, 224));
            expect(e.ellipse.material.oddColor.getValue(date)).toEqual(Color.fromBytes(4, 228, 224, 57));
            expect(e.ellipse.material.offset.getValue(date)).toEqual(26719.0);
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(15097.0);
            expect(e = dataSource.entities.getById('constant_ellipse_material_image_color')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqualEpsilon(new Color(0.364705882352941, 0.698039215686274, 0.803921568627451, 0.843137254901961), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipse_material_grid_color')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqualEpsilon(new Color(0.67843137254902, 0.580392156862745, 0.823529411764706, 0.627450980392157), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipse_material_stripe_evenColor')).toBeDefined();
            expect(e.ellipse.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.313725490196078, 0.768627450980392, 0.674509803921569, 0.705882352941177), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipse_material_stripe_oddColor')).toBeDefined();
            expect(e.ellipse.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.682352941176471, 0.658823529411765, 0.952941176470588, 0.0823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipse_outlineColor_rgbaf')).toBeDefined();
            expect(e.ellipse.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.572549019607843, 0.956862745098039, 0.968627450980392, 0.674509803921569), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipsoid_material_solidColor_color')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqualEpsilon(new Color(0.572549019607843, 0.533333333333333, 0.384313725490196, 0.2), 1e-14);
            expect(e = dataSource.entities.getById('material_ellipsoid_material_image')).toBeDefined();
            expect(e.ellipsoid.material.image.getValue(date)).toEqual('http://example.com/47428');
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(new Cartesian2(53733, 35793));
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(Color.fromBytes(125, 49, 160, 165));
            expect(e.ellipsoid.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_ellipsoid_material_grid')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(Color.fromBytes(95, 212, 218, 57));
            expect(e.ellipsoid.material.cellAlpha.getValue(date)).toEqual(53044.0);
            expect(e.ellipsoid.material.lineCount.getValue(date)).toEqual(new Cartesian2(7763, 58654));
            expect(e.ellipsoid.material.lineThickness.getValue(date)).toEqual(new Cartesian2(25480, 4707));
            expect(e.ellipsoid.material.lineOffset.getValue(date)).toEqual(new Cartesian2(38422, 44182));
            expect(e = dataSource.entities.getById('material_ellipsoid_material_stripe')).toBeDefined();
            expect(e.ellipsoid.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.ellipsoid.material.evenColor.getValue(date)).toEqual(Color.fromBytes(174, 241, 84, 24));
            expect(e.ellipsoid.material.oddColor.getValue(date)).toEqual(Color.fromBytes(134, 51, 175, 154));
            expect(e.ellipsoid.material.offset.getValue(date)).toEqual(24796.0);
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(2913.0);
            expect(e = dataSource.entities.getById('constant_ellipsoid_material_image_color')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqualEpsilon(new Color(0.247058823529412, 0.403921568627451, 0.145098039215686, 0.47843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipsoid_material_grid_color')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqualEpsilon(new Color(0.270588235294118, 0.784313725490196, 0.172549019607843, 0.835294117647059), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipsoid_material_stripe_evenColor')).toBeDefined();
            expect(e.ellipsoid.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.415686274509804, 0.192156862745098, 0.368627450980392, 0.129411764705882), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipsoid_material_stripe_oddColor')).toBeDefined();
            expect(e.ellipsoid.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.580392156862745, 0.164705882352941, 0.741176470588235, 0.0941176470588235), 1e-14);
            expect(e = dataSource.entities.getById('constant_ellipsoid_outlineColor_rgbaf')).toBeDefined();
            expect(e.ellipsoid.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.494117647058824, 0.0823529411764706, 0.274509803921569, 0.823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('constant_label_backgroundColor_rgbaf')).toBeDefined();
            expect(e.label.backgroundColor.getValue(date)).toEqualEpsilon(new Color(0.894117647058824, 0.949019607843137, 0.494117647058824, 0.843137254901961), 1e-14);
            expect(e = dataSource.entities.getById('constant_label_fillColor_rgbaf')).toBeDefined();
            expect(e.label.fillColor.getValue(date)).toEqualEpsilon(new Color(0.16078431372549, 0.568627450980392, 0.776470588235294, 0.505882352941176), 1e-14);
            expect(e = dataSource.entities.getById('constant_label_outlineColor_rgbaf')).toBeDefined();
            expect(e.label.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.458823529411765, 0.325490196078431, 0.909803921568627, 0.67843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_model_silhouetteColor_rgbaf')).toBeDefined();
            expect(e.model.silhouetteColor.getValue(date)).toEqualEpsilon(new Color(0.294117647058824, 0.313725490196078, 0.419607843137255, 0.87843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_model_color_rgbaf')).toBeDefined();
            expect(e.model.color.getValue(date)).toEqualEpsilon(new Color(0.568627450980392, 0.333333333333333, 0.141176470588235, 0.572549019607843), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_solidColor_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.458823529411765, 0.517647058823529, 0.52156862745098, 0.925490196078431), 1e-14);
            expect(e = dataSource.entities.getById('material_path_material_polylineOutline')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(158, 14, 3, 86));
            expect(e.path.material.outlineColor.getValue(date)).toEqual(Color.fromBytes(137, 101, 236, 136));
            expect(e.path.material.outlineWidth.getValue(date)).toEqual(11017.0);
            expect(e = dataSource.entities.getById('material_path_material_polylineArrow')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(166, 131, 155, 102));
            expect(e = dataSource.entities.getById('material_path_material_polylineDash')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(190, 189, 9, 7));
            expect(e.path.material.gapColor.getValue(date)).toEqual(Color.fromBytes(170, 88, 12, 24));
            expect(e.path.material.dashLength.getValue(date)).toEqual(45848.0);
            expect(e.path.material.dashPattern.getValue(date)).toEqual(13519.0);
            expect(e = dataSource.entities.getById('material_path_material_polylineGlow')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(72, 114, 200, 147));
            expect(e.path.material.glowPower.getValue(date)).toEqual(42344.0);
            expect(e = dataSource.entities.getById('material_path_material_image')).toBeDefined();
            expect(e.path.material.image.getValue(date)).toEqual('http://example.com/31068');
            expect(e.path.material.repeat.getValue(date)).toEqual(new Cartesian2(48351, 63420));
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(105, 166, 133, 7));
            expect(e.path.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_path_material_grid')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(Color.fromBytes(120, 196, 99, 165));
            expect(e.path.material.cellAlpha.getValue(date)).toEqual(41317.0);
            expect(e.path.material.lineCount.getValue(date)).toEqual(new Cartesian2(52557, 7629));
            expect(e.path.material.lineThickness.getValue(date)).toEqual(new Cartesian2(21845, 52309));
            expect(e.path.material.lineOffset.getValue(date)).toEqual(new Cartesian2(48700, 4542));
            expect(e = dataSource.entities.getById('material_path_material_stripe')).toBeDefined();
            expect(e.path.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.path.material.evenColor.getValue(date)).toEqual(Color.fromBytes(20, 43, 77, 229));
            expect(e.path.material.oddColor.getValue(date)).toEqual(Color.fromBytes(157, 171, 93, 187));
            expect(e.path.material.offset.getValue(date)).toEqual(41305.0);
            expect(e.path.material.repeat.getValue(date)).toEqual(43637.0);
            expect(e = dataSource.entities.getById('constant_path_material_polylineOutline_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.0588235294117647, 0.0823529411764706, 0.964705882352941, 0.317647058823529), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_polylineOutline_outlineColor')).toBeDefined();
            expect(e.path.material.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.266666666666667, 0.556862745098039, 0.352941176470588, 0.76078431372549), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_polylineArrow_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.627450980392157, 0.27843137254902, 0.972549019607843, 0.92156862745098), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_polylineDash_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.113725490196078, 0.368627450980392, 0.411764705882353, 0.745098039215686), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_polylineDash_gapColor')).toBeDefined();
            expect(e.path.material.gapColor.getValue(date)).toEqualEpsilon(new Color(0.831372549019608, 0.313725490196078, 0.341176470588235, 0.749019607843137), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_polylineGlow_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.584313725490196, 0.0156862745098039, 0.329411764705882, 0.270588235294118), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_image_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.443137254901961, 0.450980392156863, 0.63921568627451, 0.415686274509804), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_grid_color')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqualEpsilon(new Color(0.984313725490196, 0.945098039215686, 0.764705882352941, 0.933333333333333), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_stripe_evenColor')).toBeDefined();
            expect(e.path.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.584313725490196, 0.631372549019608, 0.0196078431372549, 0.349019607843137), 1e-14);
            expect(e = dataSource.entities.getById('constant_path_material_stripe_oddColor')).toBeDefined();
            expect(e.path.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.231372549019608, 0.211764705882353, 0.941176470588235, 0.501960784313725), 1e-14);
            expect(e = dataSource.entities.getById('constant_point_color_rgbaf')).toBeDefined();
            expect(e.point.color.getValue(date)).toEqualEpsilon(new Color(0.662745098039216, 0.317647058823529, 0.643137254901961, 0.705882352941177), 1e-14);
            expect(e = dataSource.entities.getById('constant_point_outlineColor_rgbaf')).toBeDefined();
            expect(e.point.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.00392156862745098, 0.388235294117647, 0.101960784313725, 0.16078431372549), 1e-14);
            expect(e = dataSource.entities.getById('constant_polygon_hierarchy_cartographicRadians')).toBeDefined();
            expect(e.polygon.hierarchy.getValue(date)).toEqual([ Cartesian3.fromRadians(0.612948853926511, 1.3346715688367, 54401), Cartesian3.fromRadians(1.1867596160592, 0.345663242797974, 35811) ]);
            expect(e = dataSource.entities.getById('constant_polygon_hierarchy_cartographicDegrees')).toBeDefined();
            expect(e.polygon.hierarchy.getValue(date)).toEqual([ Cartesian3.fromDegrees(19, 41, 50907), Cartesian3.fromDegrees(28, 40, 24937) ]);
            expect(e = dataSource.entities.getById('constant_polygon_material_solidColor_color')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqualEpsilon(new Color(0.980392156862745, 0.905882352941176, 0.274509803921569, 0.972549019607843), 1e-14);
            expect(e = dataSource.entities.getById('material_polygon_material_image')).toBeDefined();
            expect(e.polygon.material.image.getValue(date)).toEqual('http://example.com/3481');
            expect(e.polygon.material.repeat.getValue(date)).toEqual(new Cartesian2(29381, 10354));
            expect(e.polygon.material.color.getValue(date)).toEqual(Color.fromBytes(36, 184, 236, 209));
            expect(e.polygon.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_polygon_material_grid')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqual(Color.fromBytes(246, 64, 141, 13));
            expect(e.polygon.material.cellAlpha.getValue(date)).toEqual(986.0);
            expect(e.polygon.material.lineCount.getValue(date)).toEqual(new Cartesian2(26094, 44645));
            expect(e.polygon.material.lineThickness.getValue(date)).toEqual(new Cartesian2(30775, 17784));
            expect(e.polygon.material.lineOffset.getValue(date)).toEqual(new Cartesian2(58344, 3555));
            expect(e = dataSource.entities.getById('material_polygon_material_stripe')).toBeDefined();
            expect(e.polygon.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.polygon.material.evenColor.getValue(date)).toEqual(Color.fromBytes(98, 184, 45, 52));
            expect(e.polygon.material.oddColor.getValue(date)).toEqual(Color.fromBytes(164, 123, 182, 228));
            expect(e.polygon.material.offset.getValue(date)).toEqual(12114.0);
            expect(e.polygon.material.repeat.getValue(date)).toEqual(60350.0);
            expect(e = dataSource.entities.getById('constant_polygon_material_image_color')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqualEpsilon(new Color(0.674509803921569, 0.8, 0.411764705882353, 0.207843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_polygon_material_grid_color')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqualEpsilon(new Color(0.603921568627451, 0.0941176470588235, 0.00784313725490196, 0.0862745098039216), 1e-14);
            expect(e = dataSource.entities.getById('constant_polygon_material_stripe_evenColor')).toBeDefined();
            expect(e.polygon.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.772549019607843, 0.866666666666667, 0.964705882352941, 0.862745098039216), 1e-14);
            expect(e = dataSource.entities.getById('constant_polygon_material_stripe_oddColor')).toBeDefined();
            expect(e.polygon.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.862745098039216, 0.0392156862745098, 0.458823529411765, 0.596078431372549), 1e-14);
            expect(e = dataSource.entities.getById('constant_polygon_outlineColor_rgbaf')).toBeDefined();
            expect(e.polygon.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.105882352941176, 0.423529411764706, 0.619607843137255, 0.956862745098039), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_positions_cartographicRadians')).toBeDefined();
            expect(e.polyline.positions.getValue(date)).toEqual([ Cartesian3.fromRadians(0.23083587429617, 0.738315731088925, 41390), Cartesian3.fromRadians(0.537259577218533, 0.25389340391868, 10573) ]);
            expect(e = dataSource.entities.getById('constant_polyline_positions_cartographicDegrees')).toBeDefined();
            expect(e.polyline.positions.getValue(date)).toEqual([ Cartesian3.fromDegrees(19, 5, 11802), Cartesian3.fromDegrees(15, 40, 39495) ]);
            expect(e = dataSource.entities.getById('constant_polyline_material_solidColor_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.764705882352941, 0.894117647058824, 0.874509803921569, 0.105882352941176), 1e-14);
            expect(e = dataSource.entities.getById('material_polyline_material_polylineOutline')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(152, 14, 11, 33));
            expect(e.polyline.material.outlineColor.getValue(date)).toEqual(Color.fromBytes(222, 51, 202, 92));
            expect(e.polyline.material.outlineWidth.getValue(date)).toEqual(6879.0);
            expect(e = dataSource.entities.getById('material_polyline_material_polylineArrow')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(82, 169, 80, 107));
            expect(e = dataSource.entities.getById('material_polyline_material_polylineDash')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(22, 214, 57, 141));
            expect(e.polyline.material.gapColor.getValue(date)).toEqual(Color.fromBytes(150, 91, 109, 117));
            expect(e.polyline.material.dashLength.getValue(date)).toEqual(60297.0);
            expect(e.polyline.material.dashPattern.getValue(date)).toEqual(40430.0);
            expect(e = dataSource.entities.getById('material_polyline_material_polylineGlow')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(59, 125, 181, 171));
            expect(e.polyline.material.glowPower.getValue(date)).toEqual(41345.0);
            expect(e = dataSource.entities.getById('material_polyline_material_image')).toBeDefined();
            expect(e.polyline.material.image.getValue(date)).toEqual('http://example.com/29020');
            expect(e.polyline.material.repeat.getValue(date)).toEqual(new Cartesian2(8980, 60451));
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(46, 136, 39, 94));
            expect(e.polyline.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_polyline_material_grid')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(Color.fromBytes(157, 57, 26, 26));
            expect(e.polyline.material.cellAlpha.getValue(date)).toEqual(27197.0);
            expect(e.polyline.material.lineCount.getValue(date)).toEqual(new Cartesian2(17878, 15173));
            expect(e.polyline.material.lineThickness.getValue(date)).toEqual(new Cartesian2(64504, 24571));
            expect(e.polyline.material.lineOffset.getValue(date)).toEqual(new Cartesian2(51933, 9674));
            expect(e = dataSource.entities.getById('material_polyline_material_stripe')).toBeDefined();
            expect(e.polyline.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.polyline.material.evenColor.getValue(date)).toEqual(Color.fromBytes(98, 239, 47, 132));
            expect(e.polyline.material.oddColor.getValue(date)).toEqual(Color.fromBytes(41, 198, 29, 144));
            expect(e.polyline.material.offset.getValue(date)).toEqual(10077.0);
            expect(e.polyline.material.repeat.getValue(date)).toEqual(31817.0);
            expect(e = dataSource.entities.getById('constant_polyline_material_polylineOutline_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.450980392156863, 0.890196078431373, 0.403921568627451, 0.16078431372549), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_polylineOutline_outlineColor')).toBeDefined();
            expect(e.polyline.material.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.815686274509804, 0.545098039215686, 0.529411764705882, 0.317647058823529), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_polylineArrow_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.831372549019608, 0.823529411764706, 0.631372549019608, 0.443137254901961), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_polylineDash_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.462745098039216, 0.184313725490196, 0.329411764705882, 0), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_polylineDash_gapColor')).toBeDefined();
            expect(e.polyline.material.gapColor.getValue(date)).toEqualEpsilon(new Color(0.0509803921568627, 0.0313725490196078, 0.23921568627451, 0.4), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_polylineGlow_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.411764705882353, 0.313725490196078, 0.858823529411765, 0.380392156862745), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_image_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.133333333333333, 0.552941176470588, 0.0431372549019608, 0.184313725490196), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_grid_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqualEpsilon(new Color(0.141176470588235, 0.823529411764706, 0.588235294117647, 0.56078431372549), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_stripe_evenColor')).toBeDefined();
            expect(e.polyline.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.647058823529412, 0.862745098039216, 0.129411764705882, 0.780392156862745), 1e-14);
            expect(e = dataSource.entities.getById('constant_polyline_material_stripe_oddColor')).toBeDefined();
            expect(e.polyline.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.290196078431373, 0.780392156862745, 0.0705882352941176, 0.27843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_rectangle_coordinates_wsenDegrees')).toBeDefined();
            expect(e.rectangle.coordinates.getValue(date)).toEqual(Rectangle.fromDegrees(42, 22, 5, 35));
            expect(e = dataSource.entities.getById('constant_rectangle_material_solidColor_color')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqualEpsilon(new Color(0.898039215686275, 0.8, 0.905882352941176, 0.952941176470588), 1e-14);
            expect(e = dataSource.entities.getById('material_rectangle_material_image')).toBeDefined();
            expect(e.rectangle.material.image.getValue(date)).toEqual('http://example.com/18033');
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(new Cartesian2(41461, 31905));
            expect(e.rectangle.material.color.getValue(date)).toEqual(Color.fromBytes(93, 203, 88, 125));
            expect(e.rectangle.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_rectangle_material_grid')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqual(Color.fromBytes(245, 105, 152, 83));
            expect(e.rectangle.material.cellAlpha.getValue(date)).toEqual(57393.0);
            expect(e.rectangle.material.lineCount.getValue(date)).toEqual(new Cartesian2(4947, 4627));
            expect(e.rectangle.material.lineThickness.getValue(date)).toEqual(new Cartesian2(37424, 19602));
            expect(e.rectangle.material.lineOffset.getValue(date)).toEqual(new Cartesian2(43685, 31658));
            expect(e = dataSource.entities.getById('material_rectangle_material_stripe')).toBeDefined();
            expect(e.rectangle.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.rectangle.material.evenColor.getValue(date)).toEqual(Color.fromBytes(196, 12, 53, 2));
            expect(e.rectangle.material.oddColor.getValue(date)).toEqual(Color.fromBytes(103, 243, 111, 72));
            expect(e.rectangle.material.offset.getValue(date)).toEqual(26578.0);
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(52842.0);
            expect(e = dataSource.entities.getById('constant_rectangle_material_image_color')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqualEpsilon(new Color(0.247058823529412, 0.498039215686275, 0.741176470588235, 0.968627450980392), 1e-14);
            expect(e = dataSource.entities.getById('constant_rectangle_material_grid_color')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqualEpsilon(new Color(0.458823529411765, 0.0627450980392157, 0.886274509803922, 0.83921568627451), 1e-14);
            expect(e = dataSource.entities.getById('constant_rectangle_material_stripe_evenColor')).toBeDefined();
            expect(e.rectangle.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.576470588235294, 0.341176470588235, 0.611764705882353, 0.207843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_rectangle_material_stripe_oddColor')).toBeDefined();
            expect(e.rectangle.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.866666666666667, 0.949019607843137, 0.0627450980392157, 0.0196078431372549), 1e-14);
            expect(e = dataSource.entities.getById('constant_rectangle_outlineColor_rgbaf')).toBeDefined();
            expect(e.rectangle.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.301960784313725, 0.0352941176470588, 0.917647058823529, 0.207843137254902), 1e-14);
            expect(e = dataSource.entities.getById('constant_wall_positions_cartographicRadians')).toBeDefined();
            expect(e.wall.positions.getValue(date)).toEqual([ Cartesian3.fromRadians(0.990822494752221, 0.11729920547879, 47975), Cartesian3.fromRadians(1.22405890229697, 1.46292679641256, 13438) ]);
            expect(e = dataSource.entities.getById('constant_wall_positions_cartographicDegrees')).toBeDefined();
            expect(e.wall.positions.getValue(date)).toEqual([ Cartesian3.fromDegrees(30, 24, 27738), Cartesian3.fromDegrees(14, 41, 41667) ]);
            expect(e = dataSource.entities.getById('constant_wall_material_solidColor_color')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqualEpsilon(new Color(0.694117647058824, 0.317647058823529, 0.909803921568627, 0.501960784313725), 1e-14);
            expect(e = dataSource.entities.getById('material_wall_material_image')).toBeDefined();
            expect(e.wall.material.image.getValue(date)).toEqual('http://example.com/58529');
            expect(e.wall.material.repeat.getValue(date)).toEqual(new Cartesian2(36340, 47245));
            expect(e.wall.material.color.getValue(date)).toEqual(Color.fromBytes(252, 63, 12, 38));
            expect(e.wall.material.transparent.getValue(date)).toEqual(true);
            expect(e = dataSource.entities.getById('material_wall_material_grid')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqual(Color.fromBytes(38, 183, 237, 174));
            expect(e.wall.material.cellAlpha.getValue(date)).toEqual(59606.0);
            expect(e.wall.material.lineCount.getValue(date)).toEqual(new Cartesian2(3079, 31244));
            expect(e.wall.material.lineThickness.getValue(date)).toEqual(new Cartesian2(32099, 44157));
            expect(e.wall.material.lineOffset.getValue(date)).toEqual(new Cartesian2(13529, 1844));
            expect(e = dataSource.entities.getById('material_wall_material_stripe')).toBeDefined();
            expect(e.wall.material.orientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.wall.material.evenColor.getValue(date)).toEqual(Color.fromBytes(202, 190, 37, 215));
            expect(e.wall.material.oddColor.getValue(date)).toEqual(Color.fromBytes(56, 107, 92, 38));
            expect(e.wall.material.offset.getValue(date)).toEqual(34142.0);
            expect(e.wall.material.repeat.getValue(date)).toEqual(33528.0);
            expect(e = dataSource.entities.getById('constant_wall_material_image_color')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqualEpsilon(new Color(0.349019607843137, 0.843137254901961, 0.290196078431373, 0.0431372549019608), 1e-14);
            expect(e = dataSource.entities.getById('constant_wall_material_grid_color')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqualEpsilon(new Color(0.756862745098039, 0.992156862745098, 0.992156862745098, 0.462745098039216), 1e-14);
            expect(e = dataSource.entities.getById('constant_wall_material_stripe_evenColor')).toBeDefined();
            expect(e.wall.material.evenColor.getValue(date)).toEqualEpsilon(new Color(0.690196078431373, 0.211764705882353, 0.615686274509804, 0.627450980392157), 1e-14);
            expect(e = dataSource.entities.getById('constant_wall_material_stripe_oddColor')).toBeDefined();
            expect(e.wall.material.oddColor.getValue(date)).toEqualEpsilon(new Color(0.968627450980392, 0.368627450980392, 0.219607843137255, 0.00392156862745098), 1e-14);
            expect(e = dataSource.entities.getById('constant_wall_outlineColor_rgbaf')).toBeDefined();
            expect(e.wall.outlineColor.getValue(date)).toEqualEpsilon(new Color(0.564705882352941, 0.67843137254902, 0.764705882352941, 0.811764705882353), 1e-14);
            expect(e = dataSource.entities.getById('constant_agi_conicSensor_intersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_lateralSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_lateralSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_lateralSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_lateralSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_lateralSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidHorizonSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidHorizonSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidHorizonSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_domeSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_domeSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_domeSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_domeSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_domeSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_environmentOcclusionMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_conicSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_environmentOcclusionMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_environmentOcclusionMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_environmentOcclusionMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_conicSensor_environmentOcclusionMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_conicSensor_environmentIntersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_customPatternSensor_directions_unitSpherical')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_customPatternSensor_directions_cartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_customPatternSensor_directions_unitCartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_customPatternSensor_intersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_lateralSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_lateralSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_lateralSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_lateralSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_lateralSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidHorizonSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidHorizonSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidHorizonSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_domeSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_domeSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_domeSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_domeSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_domeSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_environmentOcclusionMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_customPatternSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_environmentOcclusionMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_environmentOcclusionMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_environmentOcclusionMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_customPatternSensor_environmentOcclusionMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_customPatternSensor_environmentIntersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_rectangularSensor_intersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_lateralSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_lateralSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_lateralSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_lateralSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_lateralSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidHorizonSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidHorizonSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidHorizonSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_domeSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_domeSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_domeSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_domeSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_domeSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_environmentOcclusionMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_rectangularSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_environmentOcclusionMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_environmentOcclusionMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_environmentOcclusionMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_rectangularSensor_environmentOcclusionMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_rectangularSensor_environmentIntersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_fan_directions_unitSpherical')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_fan_directions_cartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_fan_directions_unitCartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_fan_material_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('material_fan_material_image')).toBeDefined();
            expect(e = dataSource.entities.getById('material_fan_material_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('material_fan_material_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_fan_material_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_fan_material_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_fan_material_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_fan_material_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_fan_outlineColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_vector_color_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_vector_direction_unitSpherical')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_vector_direction_cartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_agi_vector_direction_unitCartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('constant_custom')).toBeDefined();
            expect(e.properties.custom_boolean.getValue(date)).toEqual(true);
            expect(e.properties.custom_boundingRectangle.getValue(date)).toEqual(new BoundingRectangle(9369, 63524, 6904, 17690));
            expect(e.properties.custom_cartesian.getValue(date)).toEqual(new Cartesian3(28502, 45167, 944));
            expect(e.properties.custom_cartographicRadians.getValue(date)).toEqual(Cartesian3.fromRadians(0.350571264887744, 0.633274262413284, 42979));
            expect(e.properties.custom_cartographicDegrees.getValue(date)).toEqual(Cartesian3.fromDegrees(18, 36, 37743));
            expect(e.properties.custom_cartesian2.getValue(date)).toEqual(new Cartesian2(44825, 16303));
            expect(e.properties.custom_unitCartesian.getValue(date)).toEqualEpsilon(new Cartesian3(0.77935070007851, 0.565493818550955, 0.269868907930861), 1e-14);
            expect(e.properties.custom_spherical.getValue(date)).toEqual(Cartesian3.fromSpherical(new Spherical(1705, 13830, 21558)));
            expect(e.properties.custom_unitSpherical.getValue(date)).toEqual(Cartesian3.fromSpherical(new Spherical(59387, 15591)));
            expect(e.properties.custom_rgba.getValue(date)).toEqual(Color.fromBytes(50, 149, 175, 147));
            expect(e.properties.custom_rgbaf.getValue(date)).toEqualEpsilon(new Color(0.0666666666666667, 0.0666666666666667, 0.231372549019608, 0.427450980392157), 1e-14);
            expect(e.properties.custom_colorBlendMode.getValue(date)).toEqual(ColorBlendMode.REPLACE);
            expect(e.properties.custom_cornerType.getValue(date)).toEqual(CornerType.BEVELED);
            expect(e.properties.custom_heightReference.getValue(date)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(e.properties.custom_horizontalOrigin.getValue(date)).toEqual(HorizontalOrigin.LEFT);
            expect(e.properties.custom_labelStyle.getValue(date)).toEqual(LabelStyle.FILL_AND_OUTLINE);
            expect(e.properties.custom_number.getValue(date)).toEqual(31507.0);
            expect(e.properties.custom_nearFarScalar.getValue(date)).toEqual(new NearFarScalar(14621, 24121, 16734, 56129));
            expect(e.properties.custom_unitQuaternion.getValue(date)).toEqualEpsilon(new Quaternion(0.742737937277143, 0.267679401430615, 0.507905263014791, 0.344558178514049), 1e-14);
            expect(e.properties.custom_shadowMode.getValue(date)).toEqual(ShadowMode.CAST_ONLY);
            expect(e.properties.custom_string.getValue(date)).toEqual('string41758');
            expect(e.properties.custom_stripeOrientation.getValue(date)).toEqual(StripeOrientation.VERTICAL);
            expect(e.properties.custom_wsen.getValue(date)).toEqual(new Rectangle(1.47520917005826, 1.17615981869183, 0.973692387723505, 1.00039738410474));
            expect(e.properties.custom_wsenDegrees.getValue(date)).toEqual(Rectangle.fromDegrees(5, 3, 6, 19));
            expect(e.properties.custom_uri.getValue(date)).toEqual('http://example.com/41986');
            expect(e.properties.custom_verticalOrigin.getValue(date)).toEqual(VerticalOrigin.BOTTOM);
            expect(e = dataSource.entities.getById('ConstantPosition1')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(new Cartesian3(48370, 3260, 44044));
            expect(e = dataSource.entities.getById('ConstantDouble1')).toBeDefined();
            expect(e.billboard.scale.getValue(date)).toEqual(1155.0);
            expect(e = dataSource.entities.getById('ConstantPosition2')).toBeDefined();
            expect(e.position.getValue(date)).toEqual(new Cartesian3(2599, 10, 39168));
            expect(e = dataSource.entities.getById('ConstantDouble2')).toBeDefined();
            expect(e.billboard.scale.getValue(date)).toEqual(16451.0);
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
            expect(e.box.shadows.getValue(date)).toEqual(constant.box.shadows.getValue(date));
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
            expect(e.corridor.shadows.getValue(date)).toEqual(constant.corridor.shadows.getValue(date));
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
            expect(e.cylinder.shadows.getValue(date)).toEqual(constant.cylinder.shadows.getValue(date));
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
            expect(e.ellipse.shadows.getValue(date)).toEqual(constant.ellipse.shadows.getValue(date));
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
            expect(e.ellipsoid.shadows.getValue(date)).toEqual(constant.ellipsoid.shadows.getValue(date));
            expect(e.label.show.getValue(date)).toEqual(constant.label.show.getValue(date));
            expect(e.label.text.getValue(date)).toEqual(constant.label.text.getValue(date));
            expect(e.label.font.getValue(date)).toEqual(constant.label.font.getValue(date));
            expect(e.label.style.getValue(date)).toEqual(constant.label.style.getValue(date));
            expect(e.label.scale.getValue(date)).toEqual(constant.label.scale.getValue(date));
            expect(e.label.showBackground.getValue(date)).toEqual(constant.label.showBackground.getValue(date));
            expect(e.label.backgroundColor.getValue(date)).toEqual(constant.label.backgroundColor.getValue(date));
            expect(e.label.backgroundPadding.getValue(date)).toEqual(constant.label.backgroundPadding.getValue(date));
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
            expect(e.model.shadows.getValue(date)).toEqual(constant.model.shadows.getValue(date));
            expect(e.model.heightReference.getValue(date)).toEqual(constant.model.heightReference.getValue(date));
            expect(e.model.silhouetteColor.getValue(date)).toEqual(constant.model.silhouetteColor.getValue(date));
            expect(e.model.silhouetteSize.getValue(date)).toEqual(constant.model.silhouetteSize.getValue(date));
            expect(e.model.color.getValue(date)).toEqual(constant.model.color.getValue(date));
            expect(e.model.colorBlendMode.getValue(date)).toEqual(constant.model.colorBlendMode.getValue(date));
            expect(e.model.colorBlendAmount.getValue(date)).toEqual(constant.model.colorBlendAmount.getValue(date));
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
            expect(e.polygon.shadows.getValue(date)).toEqual(constant.polygon.shadows.getValue(date));
            expect(e.polyline.show.getValue(date)).toEqual(constant.polyline.show.getValue(date));
            expect(e.polyline.positions.getValue(date)).toEqual([dataSource.entities.getById('ConstantPosition1').position.getValue(date), dataSource.entities.getById('ConstantPosition2').position.getValue(date)]);
            expect(e.polyline.width.getValue(date)).toEqual(constant.polyline.width.getValue(date));
            expect(e.polyline.granularity.getValue(date)).toEqual(constant.polyline.granularity.getValue(date));
            expect(e.polyline.material.color.getValue(date)).toEqual(constant.polyline.material.color.getValue(date));
            expect(e.polyline.followSurface.getValue(date)).toEqual(constant.polyline.followSurface.getValue(date));
            expect(e.polyline.shadows.getValue(date)).toEqual(constant.polyline.shadows.getValue(date));
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
            expect(e.rectangle.shadows.getValue(date)).toEqual(constant.rectangle.shadows.getValue(date));
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
            expect(e.wall.shadows.getValue(date)).toEqual(constant.wall.shadows.getValue(date));
            expect(e = dataSource.entities.getById('reference_box_material_image')).toBeDefined();
            expect(e.box.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.image.getValue(date));
            expect(e.box.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.repeat.getValue(date));
            expect(e.box.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.color.getValue(date));
            expect(e.box.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_image').box.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_box_material_grid')).toBeDefined();
            expect(e.box.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.color.getValue(date));
            expect(e.box.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.cellAlpha.getValue(date));
            expect(e.box.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.lineCount.getValue(date));
            expect(e.box.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.lineThickness.getValue(date));
            expect(e.box.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_grid').box.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_box_material_stripe')).toBeDefined();
            expect(e.box.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.orientation.getValue(date));
            expect(e.box.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.evenColor.getValue(date));
            expect(e.box.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.oddColor.getValue(date));
            expect(e.box.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.offset.getValue(date));
            expect(e.box.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_box_material_stripe').box.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_corridor_material_image')).toBeDefined();
            expect(e.corridor.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.image.getValue(date));
            expect(e.corridor.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.repeat.getValue(date));
            expect(e.corridor.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.color.getValue(date));
            expect(e.corridor.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_image').corridor.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_corridor_material_grid')).toBeDefined();
            expect(e.corridor.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.color.getValue(date));
            expect(e.corridor.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.cellAlpha.getValue(date));
            expect(e.corridor.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.lineCount.getValue(date));
            expect(e.corridor.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.lineThickness.getValue(date));
            expect(e.corridor.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_grid').corridor.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_corridor_material_stripe')).toBeDefined();
            expect(e.corridor.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.orientation.getValue(date));
            expect(e.corridor.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.evenColor.getValue(date));
            expect(e.corridor.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.oddColor.getValue(date));
            expect(e.corridor.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.offset.getValue(date));
            expect(e.corridor.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_corridor_material_stripe').corridor.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_cylinder_material_image')).toBeDefined();
            expect(e.cylinder.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.image.getValue(date));
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.repeat.getValue(date));
            expect(e.cylinder.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.color.getValue(date));
            expect(e.cylinder.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_image').cylinder.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_cylinder_material_grid')).toBeDefined();
            expect(e.cylinder.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.color.getValue(date));
            expect(e.cylinder.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.cellAlpha.getValue(date));
            expect(e.cylinder.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.lineCount.getValue(date));
            expect(e.cylinder.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.lineThickness.getValue(date));
            expect(e.cylinder.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_grid').cylinder.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_cylinder_material_stripe')).toBeDefined();
            expect(e.cylinder.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.orientation.getValue(date));
            expect(e.cylinder.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.evenColor.getValue(date));
            expect(e.cylinder.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.oddColor.getValue(date));
            expect(e.cylinder.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.offset.getValue(date));
            expect(e.cylinder.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_cylinder_material_stripe').cylinder.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_ellipse_material_image')).toBeDefined();
            expect(e.ellipse.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.image.getValue(date));
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.repeat.getValue(date));
            expect(e.ellipse.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.color.getValue(date));
            expect(e.ellipse.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_image').ellipse.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_ellipse_material_grid')).toBeDefined();
            expect(e.ellipse.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.color.getValue(date));
            expect(e.ellipse.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.cellAlpha.getValue(date));
            expect(e.ellipse.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.lineCount.getValue(date));
            expect(e.ellipse.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.lineThickness.getValue(date));
            expect(e.ellipse.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_grid').ellipse.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_ellipse_material_stripe')).toBeDefined();
            expect(e.ellipse.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.orientation.getValue(date));
            expect(e.ellipse.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.evenColor.getValue(date));
            expect(e.ellipse.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.oddColor.getValue(date));
            expect(e.ellipse.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.offset.getValue(date));
            expect(e.ellipse.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipse_material_stripe').ellipse.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_ellipsoid_material_image')).toBeDefined();
            expect(e.ellipsoid.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.image.getValue(date));
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.repeat.getValue(date));
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.color.getValue(date));
            expect(e.ellipsoid.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_image').ellipsoid.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_ellipsoid_material_grid')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.color.getValue(date));
            expect(e.ellipsoid.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.cellAlpha.getValue(date));
            expect(e.ellipsoid.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.lineCount.getValue(date));
            expect(e.ellipsoid.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.lineThickness.getValue(date));
            expect(e.ellipsoid.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_grid').ellipsoid.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_ellipsoid_material_stripe')).toBeDefined();
            expect(e.ellipsoid.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.orientation.getValue(date));
            expect(e.ellipsoid.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.evenColor.getValue(date));
            expect(e.ellipsoid.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.oddColor.getValue(date));
            expect(e.ellipsoid.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.offset.getValue(date));
            expect(e.ellipsoid.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_ellipsoid_material_stripe').ellipsoid.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_polylineOutline')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineOutline').path.material.color.getValue(date));
            expect(e.path.material.outlineColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineOutline').path.material.outlineColor.getValue(date));
            expect(e.path.material.outlineWidth.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineOutline').path.material.outlineWidth.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_polylineArrow')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineArrow').path.material.color.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_polylineDash')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineDash').path.material.color.getValue(date));
            expect(e.path.material.gapColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineDash').path.material.gapColor.getValue(date));
            expect(e.path.material.dashLength.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineDash').path.material.dashLength.getValue(date));
            expect(e.path.material.dashPattern.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineDash').path.material.dashPattern.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_polylineGlow')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineGlow').path.material.color.getValue(date));
            expect(e.path.material.glowPower.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_polylineGlow').path.material.glowPower.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_image')).toBeDefined();
            expect(e.path.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.image.getValue(date));
            expect(e.path.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.repeat.getValue(date));
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.color.getValue(date));
            expect(e.path.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_image').path.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_grid')).toBeDefined();
            expect(e.path.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.color.getValue(date));
            expect(e.path.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.cellAlpha.getValue(date));
            expect(e.path.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.lineCount.getValue(date));
            expect(e.path.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.lineThickness.getValue(date));
            expect(e.path.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_grid').path.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_path_material_stripe')).toBeDefined();
            expect(e.path.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.orientation.getValue(date));
            expect(e.path.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.evenColor.getValue(date));
            expect(e.path.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.oddColor.getValue(date));
            expect(e.path.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.offset.getValue(date));
            expect(e.path.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_path_material_stripe').path.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_polygon_material_image')).toBeDefined();
            expect(e.polygon.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.image.getValue(date));
            expect(e.polygon.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.repeat.getValue(date));
            expect(e.polygon.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.color.getValue(date));
            expect(e.polygon.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_image').polygon.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_polygon_material_grid')).toBeDefined();
            expect(e.polygon.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.color.getValue(date));
            expect(e.polygon.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.cellAlpha.getValue(date));
            expect(e.polygon.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.lineCount.getValue(date));
            expect(e.polygon.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.lineThickness.getValue(date));
            expect(e.polygon.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_grid').polygon.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_polygon_material_stripe')).toBeDefined();
            expect(e.polygon.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.orientation.getValue(date));
            expect(e.polygon.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.evenColor.getValue(date));
            expect(e.polygon.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.oddColor.getValue(date));
            expect(e.polygon.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.offset.getValue(date));
            expect(e.polygon.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polygon_material_stripe').polygon.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_polylineOutline')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineOutline').polyline.material.color.getValue(date));
            expect(e.polyline.material.outlineColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineOutline').polyline.material.outlineColor.getValue(date));
            expect(e.polyline.material.outlineWidth.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineOutline').polyline.material.outlineWidth.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_polylineArrow')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineArrow').polyline.material.color.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_polylineDash')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineDash').polyline.material.color.getValue(date));
            expect(e.polyline.material.gapColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineDash').polyline.material.gapColor.getValue(date));
            expect(e.polyline.material.dashLength.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineDash').polyline.material.dashLength.getValue(date));
            expect(e.polyline.material.dashPattern.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineDash').polyline.material.dashPattern.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_polylineGlow')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineGlow').polyline.material.color.getValue(date));
            expect(e.polyline.material.glowPower.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_polylineGlow').polyline.material.glowPower.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_image')).toBeDefined();
            expect(e.polyline.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.image.getValue(date));
            expect(e.polyline.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.repeat.getValue(date));
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.color.getValue(date));
            expect(e.polyline.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_image').polyline.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_grid')).toBeDefined();
            expect(e.polyline.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.color.getValue(date));
            expect(e.polyline.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.cellAlpha.getValue(date));
            expect(e.polyline.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.lineCount.getValue(date));
            expect(e.polyline.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.lineThickness.getValue(date));
            expect(e.polyline.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_grid').polyline.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_polyline_material_stripe')).toBeDefined();
            expect(e.polyline.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.orientation.getValue(date));
            expect(e.polyline.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.evenColor.getValue(date));
            expect(e.polyline.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.oddColor.getValue(date));
            expect(e.polyline.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.offset.getValue(date));
            expect(e.polyline.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_polyline_material_stripe').polyline.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_rectangle_material_image')).toBeDefined();
            expect(e.rectangle.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.image.getValue(date));
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.repeat.getValue(date));
            expect(e.rectangle.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.color.getValue(date));
            expect(e.rectangle.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_image').rectangle.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_rectangle_material_grid')).toBeDefined();
            expect(e.rectangle.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.color.getValue(date));
            expect(e.rectangle.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.cellAlpha.getValue(date));
            expect(e.rectangle.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.lineCount.getValue(date));
            expect(e.rectangle.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.lineThickness.getValue(date));
            expect(e.rectangle.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_grid').rectangle.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_rectangle_material_stripe')).toBeDefined();
            expect(e.rectangle.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.orientation.getValue(date));
            expect(e.rectangle.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.evenColor.getValue(date));
            expect(e.rectangle.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.oddColor.getValue(date));
            expect(e.rectangle.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.offset.getValue(date));
            expect(e.rectangle.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_rectangle_material_stripe').rectangle.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_wall_material_image')).toBeDefined();
            expect(e.wall.material.image.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.image.getValue(date));
            expect(e.wall.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.repeat.getValue(date));
            expect(e.wall.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.color.getValue(date));
            expect(e.wall.material.transparent.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_image').wall.material.transparent.getValue(date));
            expect(e = dataSource.entities.getById('reference_wall_material_grid')).toBeDefined();
            expect(e.wall.material.color.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.color.getValue(date));
            expect(e.wall.material.cellAlpha.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.cellAlpha.getValue(date));
            expect(e.wall.material.lineCount.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.lineCount.getValue(date));
            expect(e.wall.material.lineThickness.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.lineThickness.getValue(date));
            expect(e.wall.material.lineOffset.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_grid').wall.material.lineOffset.getValue(date));
            expect(e = dataSource.entities.getById('reference_wall_material_stripe')).toBeDefined();
            expect(e.wall.material.orientation.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.orientation.getValue(date));
            expect(e.wall.material.evenColor.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.evenColor.getValue(date));
            expect(e.wall.material.oddColor.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.oddColor.getValue(date));
            expect(e.wall.material.offset.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.offset.getValue(date));
            expect(e.wall.material.repeat.getValue(date)).toEqual(dataSource.entities.getById('material_wall_material_stripe').wall.material.repeat.getValue(date));
            expect(e = dataSource.entities.getById('reference_conicSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_conicSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_customPatternSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_rectangularSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_fan_material_image')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_fan_material_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('reference_fan_material_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('VelocityPosition')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(new Cartesian3(1, 2, 3));
            expect(e.position.getValue(JulianDate.addSeconds(documentStartDate, 60, new JulianDate()))).toEqual(new Cartesian3(61, 122, 183));
            expect(e = dataSource.entities.getById('velocityReference_billboard_alignedAxis')).toBeDefined();
            expect(e.billboard.alignedAxis.getValue(JulianDate.addSeconds(documentStartDate, 50, new JulianDate()))).toEqualEpsilon(new Cartesian3(0.267261241912424, 0.534522483824849, 0.801783725737273), 1e-13);
            expect(e = dataSource.entities.getById('Sampled')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(new Cartesian3(14893, 22330, 50775));
            expect(e.position.getValue(documentStopDate)).toEqual(new Cartesian3(44952, 52911, 45006));
            expect(e.orientation.getValue(documentStartDate)).toEqualEpsilon(new Quaternion(0.63382030572505, 0.114406464045845, 0.748788933003267, 0.156518736408648), 1e-14);
            expect(e.orientation.getValue(documentStopDate)).toEqualEpsilon(new Quaternion(0.670778929875422, 0.608790403475694, 0.320013828781515, 0.277526613606122), 1e-14);
            expect(e.viewFrom.getValue(documentStartDate)).toEqual(new Cartesian3(36965, 47504, 12985));
            expect(e.viewFrom.getValue(documentStopDate)).toEqual(new Cartesian3(16155, 2367, 57353));
            expect(e.billboard.scale.getValue(documentStartDate)).toEqual(5763.0);
            expect(e.billboard.scale.getValue(documentStopDate)).toEqual(31607.0);
            expect(e.billboard.pixelOffset.getValue(documentStartDate)).toEqual(new Cartesian2(2029, 62215));
            expect(e.billboard.pixelOffset.getValue(documentStopDate)).toEqual(new Cartesian2(30658, 12919));
            expect(e.billboard.eyeOffset.getValue(documentStartDate)).toEqual(new Cartesian3(3553, 23821, 42589));
            expect(e.billboard.eyeOffset.getValue(documentStopDate)).toEqual(new Cartesian3(3059, 48139, 28860));
            expect(e.billboard.color.getValue(documentStartDate)).toEqual(Color.fromBytes(85, 19, 239, 63));
            expect(e.billboard.color.getValue(documentStopDate)).toEqual(Color.fromBytes(160, 189, 87, 99));
            expect(e.billboard.rotation.getValue(documentStartDate)).toEqual(4554.0);
            expect(e.billboard.rotation.getValue(documentStopDate)).toEqual(21210.0);
            expect(e.billboard.alignedAxis.getValue(documentStartDate)).toEqualEpsilon(new Cartesian3(0.971559394453729, 0.230094854374832, 0.0559347927405484), 1e-14);
            expect(e.billboard.alignedAxis.getValue(documentStopDate)).toEqualEpsilon(new Cartesian3(0.384810775516236, 0.82287332508932, 0.418091088045462), 1e-14);
            expect(e.billboard.width.getValue(documentStartDate)).toEqual(21333.0);
            expect(e.billboard.width.getValue(documentStopDate)).toEqual(51893.0);
            expect(e.billboard.height.getValue(documentStartDate)).toEqual(48314.0);
            expect(e.billboard.height.getValue(documentStopDate)).toEqual(61118.0);
            expect(e.billboard.scaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(46842, 10678, 46377, 15029));
            expect(e.billboard.scaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(20642, 43600, 7082, 11291));
            expect(e.billboard.translucencyByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(64366, 52219, 8139, 10015));
            expect(e.billboard.translucencyByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(10918, 18986, 49738, 60610));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(54503, 26068, 41061, 59552));
            expect(e.billboard.pixelOffsetScaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(37417, 4754, 19986, 15182));
            expect(e.billboard.imageSubRegion.getValue(documentStartDate)).toEqual(new BoundingRectangle(26590, 12135, 16431, 56640));
            expect(e.billboard.imageSubRegion.getValue(documentStopDate)).toEqual(new BoundingRectangle(43063, 42664, 60326, 52715));
            expect(e.box.dimensions.getValue(documentStartDate)).toEqual(new Cartesian3(37525, 42898, 18087));
            expect(e.box.dimensions.getValue(documentStopDate)).toEqual(new Cartesian3(49399, 59584, 63976));
            expect(e.box.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(172, 28, 222, 165));
            expect(e.box.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(16, 192, 121, 150));
            expect(e.box.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(53, 66, 217, 237));
            expect(e.box.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(163, 75, 228, 48));
            expect(e.box.outlineWidth.getValue(documentStartDate)).toEqual(45211.0);
            expect(e.box.outlineWidth.getValue(documentStopDate)).toEqual(20490.0);
            expect(e.corridor.width.getValue(documentStartDate)).toEqual(62443.0);
            expect(e.corridor.width.getValue(documentStopDate)).toEqual(13988.0);
            expect(e.corridor.height.getValue(documentStartDate)).toEqual(20585.0);
            expect(e.corridor.height.getValue(documentStopDate)).toEqual(63872.0);
            expect(e.corridor.extrudedHeight.getValue(documentStartDate)).toEqual(63407.0);
            expect(e.corridor.extrudedHeight.getValue(documentStopDate)).toEqual(42397.0);
            expect(e.corridor.granularity.getValue(documentStartDate)).toEqual(43027.0);
            expect(e.corridor.granularity.getValue(documentStopDate)).toEqual(55912.0);
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(35, 213, 31, 79));
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(87, 126, 23, 40));
            expect(e.corridor.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(137, 114, 57, 34));
            expect(e.corridor.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(93, 178, 74, 64));
            expect(e.corridor.outlineWidth.getValue(documentStartDate)).toEqual(14678.0);
            expect(e.corridor.outlineWidth.getValue(documentStopDate)).toEqual(57820.0);
            expect(e.cylinder.length.getValue(documentStartDate)).toEqual(30241.0);
            expect(e.cylinder.length.getValue(documentStopDate)).toEqual(48364.0);
            expect(e.cylinder.topRadius.getValue(documentStartDate)).toEqual(62881.0);
            expect(e.cylinder.topRadius.getValue(documentStopDate)).toEqual(16270.0);
            expect(e.cylinder.bottomRadius.getValue(documentStartDate)).toEqual(61925.0);
            expect(e.cylinder.bottomRadius.getValue(documentStopDate)).toEqual(21514.0);
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(133, 36, 52, 121));
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(7, 13, 34, 201));
            expect(e.cylinder.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(112, 241, 40, 103));
            expect(e.cylinder.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(237, 75, 59, 51));
            expect(e.cylinder.outlineWidth.getValue(documentStartDate)).toEqual(36483.0);
            expect(e.cylinder.outlineWidth.getValue(documentStopDate)).toEqual(32586.0);
            expect(e.cylinder.numberOfVerticalLines.getValue(documentStartDate)).toEqual(45816.0);
            expect(e.cylinder.numberOfVerticalLines.getValue(documentStopDate)).toEqual(42247.0);
            expect(e.cylinder.slices.getValue(documentStartDate)).toEqual(46140.0);
            expect(e.cylinder.slices.getValue(documentStopDate)).toEqual(53530.0);
            expect(e.ellipse.semiMajorAxis.getValue(documentStartDate)).toEqual(13136.0);
            expect(e.ellipse.semiMajorAxis.getValue(documentStopDate)).toEqual(55507.0);
            expect(e.ellipse.semiMinorAxis.getValue(documentStartDate)).toEqual(41580.0);
            expect(e.ellipse.semiMinorAxis.getValue(documentStopDate)).toEqual(60905.0);
            expect(e.ellipse.height.getValue(documentStartDate)).toEqual(5567.0);
            expect(e.ellipse.height.getValue(documentStopDate)).toEqual(45588.0);
            expect(e.ellipse.extrudedHeight.getValue(documentStartDate)).toEqual(16542.0);
            expect(e.ellipse.extrudedHeight.getValue(documentStopDate)).toEqual(13545.0);
            expect(e.ellipse.rotation.getValue(documentStartDate)).toEqual(5797.0);
            expect(e.ellipse.rotation.getValue(documentStopDate)).toEqual(24542.0);
            expect(e.ellipse.stRotation.getValue(documentStartDate)).toEqual(20596.0);
            expect(e.ellipse.stRotation.getValue(documentStopDate)).toEqual(58204.0);
            expect(e.ellipse.granularity.getValue(documentStartDate)).toEqual(2228.0);
            expect(e.ellipse.granularity.getValue(documentStopDate)).toEqual(43731.0);
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(174, 250, 78, 96));
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(63, 102, 221, 174));
            expect(e.ellipse.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(243, 123, 194, 31));
            expect(e.ellipse.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(236, 100, 22, 203));
            expect(e.ellipse.outlineWidth.getValue(documentStartDate)).toEqual(60636.0);
            expect(e.ellipse.outlineWidth.getValue(documentStopDate)).toEqual(24194.0);
            expect(e.ellipse.numberOfVerticalLines.getValue(documentStartDate)).toEqual(52822.0);
            expect(e.ellipse.numberOfVerticalLines.getValue(documentStopDate)).toEqual(45768.0);
            expect(e.ellipsoid.radii.getValue(documentStartDate)).toEqual(new Cartesian3(5183, 10004, 13863));
            expect(e.ellipsoid.radii.getValue(documentStopDate)).toEqual(new Cartesian3(39497, 12186, 45103));
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(137, 128, 194, 84));
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(50, 122, 190, 247));
            expect(e.ellipsoid.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(247, 210, 180, 171));
            expect(e.ellipsoid.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(239, 35, 237, 247));
            expect(e.ellipsoid.outlineWidth.getValue(documentStartDate)).toEqual(10713.0);
            expect(e.ellipsoid.outlineWidth.getValue(documentStopDate)).toEqual(10444.0);
            expect(e.ellipsoid.stackPartitions.getValue(documentStartDate)).toEqual(5841.0);
            expect(e.ellipsoid.stackPartitions.getValue(documentStopDate)).toEqual(39170.0);
            expect(e.ellipsoid.slicePartitions.getValue(documentStartDate)).toEqual(50327.0);
            expect(e.ellipsoid.slicePartitions.getValue(documentStopDate)).toEqual(4672.0);
            expect(e.ellipsoid.subdivisions.getValue(documentStartDate)).toEqual(10225.0);
            expect(e.ellipsoid.subdivisions.getValue(documentStopDate)).toEqual(53957.0);
            expect(e.label.scale.getValue(documentStartDate)).toEqual(40153.0);
            expect(e.label.scale.getValue(documentStopDate)).toEqual(42123.0);
            expect(e.label.backgroundColor.getValue(documentStartDate)).toEqual(Color.fromBytes(30, 92, 161, 169));
            expect(e.label.backgroundColor.getValue(documentStopDate)).toEqual(Color.fromBytes(85, 52, 166, 62));
            expect(e.label.backgroundPadding.getValue(documentStartDate)).toEqual(new Cartesian2(32945, 5504));
            expect(e.label.backgroundPadding.getValue(documentStopDate)).toEqual(new Cartesian2(35323, 6281));
            expect(e.label.pixelOffset.getValue(documentStartDate)).toEqual(new Cartesian2(8539, 9761));
            expect(e.label.pixelOffset.getValue(documentStopDate)).toEqual(new Cartesian2(10537, 54569));
            expect(e.label.eyeOffset.getValue(documentStartDate)).toEqual(new Cartesian3(5984, 34327, 59014));
            expect(e.label.eyeOffset.getValue(documentStopDate)).toEqual(new Cartesian3(1931, 5127, 18964));
            expect(e.label.fillColor.getValue(documentStartDate)).toEqual(Color.fromBytes(17, 212, 62, 58));
            expect(e.label.fillColor.getValue(documentStopDate)).toEqual(Color.fromBytes(214, 69, 90, 116));
            expect(e.label.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(205, 14, 169, 70));
            expect(e.label.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(143, 73, 168, 17));
            expect(e.label.outlineWidth.getValue(documentStartDate)).toEqual(53305.0);
            expect(e.label.outlineWidth.getValue(documentStopDate)).toEqual(43838.0);
            expect(e.label.translucencyByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(25055, 32865, 32128, 29309));
            expect(e.label.translucencyByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(58875, 9189, 20515, 15696));
            expect(e.label.pixelOffsetScaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(45296, 62896, 38133, 40084));
            expect(e.label.pixelOffsetScaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(28657, 25711, 9316, 62756));
            expect(e.model.scale.getValue(documentStartDate)).toEqual(63647.0);
            expect(e.model.scale.getValue(documentStopDate)).toEqual(53878.0);
            expect(e.model.minimumPixelSize.getValue(documentStartDate)).toEqual(16357.0);
            expect(e.model.minimumPixelSize.getValue(documentStopDate)).toEqual(40522.0);
            expect(e.model.maximumScale.getValue(documentStartDate)).toEqual(8290.0);
            expect(e.model.maximumScale.getValue(documentStopDate)).toEqual(25558.0);
            expect(e.model.silhouetteColor.getValue(documentStartDate)).toEqual(Color.fromBytes(33, 239, 70, 81));
            expect(e.model.silhouetteColor.getValue(documentStopDate)).toEqual(Color.fromBytes(60, 48, 26, 123));
            expect(e.model.silhouetteSize.getValue(documentStartDate)).toEqual(65103.0);
            expect(e.model.silhouetteSize.getValue(documentStopDate)).toEqual(29065.0);
            expect(e.model.color.getValue(documentStartDate)).toEqual(Color.fromBytes(74, 69, 164, 116));
            expect(e.model.color.getValue(documentStopDate)).toEqual(Color.fromBytes(127, 30, 46, 170));
            expect(e.model.colorBlendAmount.getValue(documentStartDate)).toEqual(64130.0);
            expect(e.model.colorBlendAmount.getValue(documentStopDate)).toEqual(21967.0);
            expect(e.path.width.getValue(documentStartDate)).toEqual(32449.0);
            expect(e.path.width.getValue(documentStopDate)).toEqual(33819.0);
            expect(e.path.resolution.getValue(documentStartDate)).toEqual(8399.0);
            expect(e.path.resolution.getValue(documentStopDate)).toEqual(19400.0);
            expect(e.path.leadTime.getValue(documentStartDate)).toEqual(40222.0);
            expect(e.path.leadTime.getValue(documentStopDate)).toEqual(33294.0);
            expect(e.path.trailTime.getValue(documentStartDate)).toEqual(34052.0);
            expect(e.path.trailTime.getValue(documentStopDate)).toEqual(57713.0);
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(97, 239, 22, 105));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(242, 157, 215, 125));
            expect(e.point.pixelSize.getValue(documentStartDate)).toEqual(39714.0);
            expect(e.point.pixelSize.getValue(documentStopDate)).toEqual(3313.0);
            expect(e.point.color.getValue(documentStartDate)).toEqual(Color.fromBytes(137, 151, 128, 95));
            expect(e.point.color.getValue(documentStopDate)).toEqual(Color.fromBytes(99, 157, 124, 108));
            expect(e.point.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(225, 246, 102, 195));
            expect(e.point.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(248, 38, 75, 222));
            expect(e.point.outlineWidth.getValue(documentStartDate)).toEqual(48323.0);
            expect(e.point.outlineWidth.getValue(documentStopDate)).toEqual(50914.0);
            expect(e.point.scaleByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(39727, 50843, 56262, 15579));
            expect(e.point.scaleByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(60522, 63980, 30201, 25205));
            expect(e.point.translucencyByDistance.getValue(documentStartDate)).toEqual(new NearFarScalar(61190, 16879, 16449, 10048));
            expect(e.point.translucencyByDistance.getValue(documentStopDate)).toEqual(new NearFarScalar(46491, 47541, 35769, 13707));
            expect(e.polygon.height.getValue(documentStartDate)).toEqual(64265.0);
            expect(e.polygon.height.getValue(documentStopDate)).toEqual(19257.0);
            expect(e.polygon.extrudedHeight.getValue(documentStartDate)).toEqual(12315.0);
            expect(e.polygon.extrudedHeight.getValue(documentStopDate)).toEqual(4797.0);
            expect(e.polygon.stRotation.getValue(documentStartDate)).toEqual(24959.0);
            expect(e.polygon.stRotation.getValue(documentStopDate)).toEqual(32341.0);
            expect(e.polygon.granularity.getValue(documentStartDate)).toEqual(51922.0);
            expect(e.polygon.granularity.getValue(documentStopDate)).toEqual(9185.0);
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(19, 40, 12, 31));
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(179, 204, 8, 194));
            expect(e.polygon.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(187, 223, 120, 26));
            expect(e.polygon.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(20, 135, 105, 81));
            expect(e.polygon.outlineWidth.getValue(documentStartDate)).toEqual(48428.0);
            expect(e.polygon.outlineWidth.getValue(documentStopDate)).toEqual(41508.0);
            expect(e.polyline.width.getValue(documentStartDate)).toEqual(60367.0);
            expect(e.polyline.width.getValue(documentStopDate)).toEqual(31077.0);
            expect(e.polyline.granularity.getValue(documentStartDate)).toEqual(62537.0);
            expect(e.polyline.granularity.getValue(documentStopDate)).toEqual(14676.0);
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(90, 30, 195, 220));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(39, 17, 221, 74));
            expect(e.rectangle.coordinates.getValue(documentStartDate)).toEqual(new Rectangle(0.392205830501108, 1.04907471338688, 0.00211010473645246, 0.064281089310235));
            expect(e.rectangle.coordinates.getValue(documentStopDate)).toEqual(new Rectangle(0.523469985903937, 0.229690388867811, 0.399550037703662, 0.48478405941078));
            expect(e.rectangle.height.getValue(documentStartDate)).toEqual(56388.0);
            expect(e.rectangle.height.getValue(documentStopDate)).toEqual(59991.0);
            expect(e.rectangle.extrudedHeight.getValue(documentStartDate)).toEqual(39796.0);
            expect(e.rectangle.extrudedHeight.getValue(documentStopDate)).toEqual(33335.0);
            expect(e.rectangle.rotation.getValue(documentStartDate)).toEqual(26921.0);
            expect(e.rectangle.rotation.getValue(documentStopDate)).toEqual(46937.0);
            expect(e.rectangle.stRotation.getValue(documentStartDate)).toEqual(65255.0);
            expect(e.rectangle.stRotation.getValue(documentStopDate)).toEqual(12220.0);
            expect(e.rectangle.granularity.getValue(documentStartDate)).toEqual(6948.0);
            expect(e.rectangle.granularity.getValue(documentStopDate)).toEqual(2204.0);
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(106, 81, 64, 152));
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(94, 108, 96, 154));
            expect(e.rectangle.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(6, 244, 49, 131));
            expect(e.rectangle.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(87, 190, 148, 55));
            expect(e.rectangle.outlineWidth.getValue(documentStartDate)).toEqual(41576.0);
            expect(e.rectangle.outlineWidth.getValue(documentStopDate)).toEqual(33933.0);
            expect(e.wall.granularity.getValue(documentStartDate)).toEqual(64428.0);
            expect(e.wall.granularity.getValue(documentStopDate)).toEqual(25333.0);
            expect(e.wall.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(31, 188, 250, 46));
            expect(e.wall.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(78, 91, 199, 227));
            expect(e.wall.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(241, 39, 105, 205));
            expect(e.wall.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(184, 17, 208, 44));
            expect(e.wall.outlineWidth.getValue(documentStartDate)).toEqual(62000.0);
            expect(e.wall.outlineWidth.getValue(documentStopDate)).toEqual(40549.0);
            expect(e = dataSource.entities.getById('sampled_position_cartographicRadians')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(Cartesian3.fromRadians(1.00319530145806, 0.889718921347432, 16911));
            expect(e.position.getValue(documentStopDate)).toEqual(Cartesian3.fromRadians(0.828301545608097, 0.517994728610812, 62937));
            expect(e = dataSource.entities.getById('sampled_position_cartographicDegrees')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(Cartesian3.fromDegrees(43, 23, 63733));
            expect(e.position.getValue(documentStopDate)).toEqual(Cartesian3.fromDegrees(28, 12, 9806));
            expect(e = dataSource.entities.getById('sampled_position_cartesianVelocity')).toBeDefined();
            expect(e.position.getValue(documentStartDate)).toEqual(new Cartesian3(40342, 23709, 14940));
            expect(e.position.getValue(documentStopDate)).toEqual(new Cartesian3(25648, 55396, 53208));
            expect(e = dataSource.entities.getById('sampled_billboard_color_rgbaf')).toBeDefined();
            expect(e.billboard.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0235294117647059, 0.427450980392157, 0.658823529411765, 0.0980392156862745), 1e-14);
            expect(e.billboard.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.968627450980392, 0.752941176470588, 0.843137254901961, 0.164705882352941), 1e-14);
            expect(e = dataSource.entities.getById('sampled_billboard_alignedAxis_unitSpherical')).toBeDefined();
            expect(e.billboard.alignedAxis.getValue(documentStartDate)).toEqual(Cartesian3.fromSpherical(new Spherical(57328, 53471)));
            expect(e.billboard.alignedAxis.getValue(documentStopDate)).toEqual(Cartesian3.fromSpherical(new Spherical(51360, 27848)));
            expect(e = dataSource.entities.getById('sampled_box_material_solidColor_color')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.556862745098039, 0.541176470588235, 0.956862745098039, 0.317647058823529), 1e-14);
            expect(e.box.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.792156862745098, 0.92156862745098, 0.125490196078431, 0.784313725490196), 1e-14);
            expect(e = dataSource.entities.getById('sampled_box_material_image')).toBeDefined();
            expect(e.box.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(21562, 11604));
            expect(e.box.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(56719, 11741));
            expect(e.box.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(146, 124, 215, 53));
            expect(e.box.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(229, 219, 61, 100));
            expect(e = dataSource.entities.getById('sampled_box_material_grid')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(111, 151, 56, 118));
            expect(e.box.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(178, 77, 41, 86));
            expect(e.box.material.cellAlpha.getValue(documentStartDate)).toEqual(10400.0);
            expect(e.box.material.cellAlpha.getValue(documentStopDate)).toEqual(10941.0);
            expect(e.box.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(3433, 28173));
            expect(e.box.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(53350, 6864));
            expect(e.box.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(36990, 37264));
            expect(e.box.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(38412, 45974));
            expect(e.box.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(38761, 46487));
            expect(e.box.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(62553, 37876));
            expect(e = dataSource.entities.getById('sampled_box_material_stripe')).toBeDefined();
            expect(e.box.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(251, 59, 84, 41));
            expect(e.box.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(20, 214, 81, 152));
            expect(e.box.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(233, 71, 17, 115));
            expect(e.box.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(20, 178, 40, 30));
            expect(e.box.material.offset.getValue(documentStartDate)).toEqual(46979.0);
            expect(e.box.material.offset.getValue(documentStopDate)).toEqual(1457.0);
            expect(e.box.material.repeat.getValue(documentStartDate)).toEqual(10283.0);
            expect(e.box.material.repeat.getValue(documentStopDate)).toEqual(63419.0);
            expect(e = dataSource.entities.getById('sampled_box_material_image_color')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.149019607843137, 0.929411764705882, 0.462745098039216, 0.764705882352941), 1e-14);
            expect(e.box.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.890196078431373, 0.262745098039216, 0.866666666666667, 0.792156862745098), 1e-14);
            expect(e = dataSource.entities.getById('sampled_box_material_grid_color')).toBeDefined();
            expect(e.box.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.501960784313725, 0.447058823529412, 0.72156862745098, 0.392156862745098), 1e-14);
            expect(e.box.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.890196078431373, 0.505882352941176, 0.56078431372549, 0.674509803921569), 1e-14);
            expect(e = dataSource.entities.getById('sampled_box_material_stripe_evenColor')).toBeDefined();
            expect(e.box.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.980392156862745, 0.345098039215686, 0.929411764705882, 0.533333333333333), 1e-14);
            expect(e.box.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.988235294117647, 0.372549019607843, 0.713725490196078, 0.466666666666667), 1e-14);
            expect(e = dataSource.entities.getById('sampled_box_material_stripe_oddColor')).toBeDefined();
            expect(e.box.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.545098039215686, 0.168627450980392, 0.654901960784314, 0.196078431372549), 1e-14);
            expect(e.box.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.407843137254902, 0.450980392156863, 0.874509803921569, 0.603921568627451), 1e-14);
            expect(e = dataSource.entities.getById('sampled_box_outlineColor_rgbaf')).toBeDefined();
            expect(e.box.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.215686274509804, 0.498039215686275, 0.274509803921569, 0.129411764705882), 1e-14);
            expect(e.box.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.854901960784314, 0.729411764705882, 0.172549019607843, 0.956862745098039), 1e-14);
            expect(e = dataSource.entities.getById('sampled_corridor_material_solidColor_color')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.858823529411765, 0.988235294117647, 0.733333333333333, 0.690196078431373), 1e-14);
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.549019607843137, 0.368627450980392, 0.964705882352941, 0.133333333333333), 1e-14);
            expect(e = dataSource.entities.getById('sampled_corridor_material_image')).toBeDefined();
            expect(e.corridor.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(14885, 62522));
            expect(e.corridor.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(45129, 25776));
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(57, 37, 208, 54));
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(24, 80, 140, 151));
            expect(e = dataSource.entities.getById('sampled_corridor_material_grid')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(130, 99, 15, 168));
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(246, 60, 236, 5));
            expect(e.corridor.material.cellAlpha.getValue(documentStartDate)).toEqual(22161.0);
            expect(e.corridor.material.cellAlpha.getValue(documentStopDate)).toEqual(55997.0);
            expect(e.corridor.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(7285, 25116));
            expect(e.corridor.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(18095, 8262));
            expect(e.corridor.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(31150, 55929));
            expect(e.corridor.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(40043, 22428));
            expect(e.corridor.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(41105, 52128));
            expect(e.corridor.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(2387, 32009));
            expect(e = dataSource.entities.getById('sampled_corridor_material_stripe')).toBeDefined();
            expect(e.corridor.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(8, 64, 254, 66));
            expect(e.corridor.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(47, 28, 112, 168));
            expect(e.corridor.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(17, 233, 150, 181));
            expect(e.corridor.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(171, 148, 181, 68));
            expect(e.corridor.material.offset.getValue(documentStartDate)).toEqual(21351.0);
            expect(e.corridor.material.offset.getValue(documentStopDate)).toEqual(20709.0);
            expect(e.corridor.material.repeat.getValue(documentStartDate)).toEqual(25188.0);
            expect(e.corridor.material.repeat.getValue(documentStopDate)).toEqual(19705.0);
            expect(e = dataSource.entities.getById('sampled_corridor_material_image_color')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.949019607843137, 0.666666666666667, 0.0588235294117647, 0.784313725490196), 1e-14);
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.388235294117647, 0.262745098039216, 0.764705882352941, 0.882352941176471), 1e-14);
            expect(e = dataSource.entities.getById('sampled_corridor_material_grid_color')).toBeDefined();
            expect(e.corridor.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.290196078431373, 0.83921568627451, 0.588235294117647, 0.525490196078431), 1e-14);
            expect(e.corridor.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.266666666666667, 0.00392156862745098, 0.180392156862745, 0.701960784313725), 1e-14);
            expect(e = dataSource.entities.getById('sampled_corridor_material_stripe_evenColor')).toBeDefined();
            expect(e.corridor.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.517647058823529, 0.282352941176471, 0.709803921568627, 0.737254901960784), 1e-14);
            expect(e.corridor.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.564705882352941, 0.407843137254902, 0.945098039215686, 0.666666666666667), 1e-14);
            expect(e = dataSource.entities.getById('sampled_corridor_material_stripe_oddColor')).toBeDefined();
            expect(e.corridor.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.137254901960784, 0.4, 0.356862745098039, 0.501960784313725), 1e-14);
            expect(e.corridor.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.992156862745098, 0.431372549019608, 0.301960784313725, 0.254901960784314), 1e-14);
            expect(e = dataSource.entities.getById('sampled_corridor_outlineColor_rgbaf')).toBeDefined();
            expect(e.corridor.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.882352941176471, 0.262745098039216, 0.247058823529412, 0.937254901960784), 1e-14);
            expect(e.corridor.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.701960784313725, 0.262745098039216, 0.0627450980392157, 0.627450980392157), 1e-14);
            expect(e = dataSource.entities.getById('sampled_cylinder_material_solidColor_color')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.117647058823529, 0.349019607843137, 0.411764705882353, 0.105882352941176), 1e-14);
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.513725490196078, 0.513725490196078, 0.666666666666667, 0.596078431372549), 1e-14);
            expect(e = dataSource.entities.getById('sampled_cylinder_material_image')).toBeDefined();
            expect(e.cylinder.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(42846, 26023));
            expect(e.cylinder.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(19184, 35658));
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(59, 239, 245, 44));
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(77, 93, 176, 39));
            expect(e = dataSource.entities.getById('sampled_cylinder_material_grid')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(211, 199, 71, 148));
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(142, 126, 167, 247));
            expect(e.cylinder.material.cellAlpha.getValue(documentStartDate)).toEqual(12751.0);
            expect(e.cylinder.material.cellAlpha.getValue(documentStopDate)).toEqual(16373.0);
            expect(e.cylinder.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(11469, 5164));
            expect(e.cylinder.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(8167, 36383));
            expect(e.cylinder.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(22021, 38742));
            expect(e.cylinder.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(45350, 43441));
            expect(e.cylinder.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(23237, 58970));
            expect(e.cylinder.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(62223, 62963));
            expect(e = dataSource.entities.getById('sampled_cylinder_material_stripe')).toBeDefined();
            expect(e.cylinder.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(131, 133, 216, 18));
            expect(e.cylinder.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(78, 238, 32, 231));
            expect(e.cylinder.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(209, 149, 133, 207));
            expect(e.cylinder.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(53, 207, 16, 210));
            expect(e.cylinder.material.offset.getValue(documentStartDate)).toEqual(49593.0);
            expect(e.cylinder.material.offset.getValue(documentStopDate)).toEqual(25216.0);
            expect(e.cylinder.material.repeat.getValue(documentStartDate)).toEqual(16819.0);
            expect(e.cylinder.material.repeat.getValue(documentStopDate)).toEqual(12539.0);
            expect(e = dataSource.entities.getById('sampled_cylinder_material_image_color')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.76078431372549, 0.133333333333333, 0.231372549019608, 0.631372549019608), 1e-14);
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.882352941176471, 0.0823529411764706, 0.8, 0.0823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled_cylinder_material_grid_color')).toBeDefined();
            expect(e.cylinder.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.176470588235294, 0.407843137254902, 0.623529411764706, 0.729411764705882), 1e-14);
            expect(e.cylinder.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.43921568627451, 0.0745098039215686, 0.603921568627451, 0.713725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled_cylinder_material_stripe_evenColor')).toBeDefined();
            expect(e.cylinder.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.380392156862745, 0.149019607843137, 0.8, 0.658823529411765), 1e-14);
            expect(e.cylinder.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.462745098039216, 0.172549019607843, 0.325490196078431, 0.854901960784314), 1e-14);
            expect(e = dataSource.entities.getById('sampled_cylinder_material_stripe_oddColor')).toBeDefined();
            expect(e.cylinder.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.207843137254902, 0.466666666666667, 0.427450980392157, 0.109803921568627), 1e-14);
            expect(e.cylinder.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.313725490196078, 0.498039215686275, 0.2, 0.423529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled_cylinder_outlineColor_rgbaf')).toBeDefined();
            expect(e.cylinder.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.780392156862745, 0.658823529411765, 0.235294117647059, 0.0705882352941176), 1e-14);
            expect(e.cylinder.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.643137254901961, 0.372549019607843, 0.16078431372549, 0.588235294117647), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipse_material_solidColor_color')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.67843137254902, 0.807843137254902, 0.541176470588235, 0.290196078431373), 1e-14);
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.749019607843137, 0.258823529411765, 0.733333333333333, 0.247058823529412), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipse_material_image')).toBeDefined();
            expect(e.ellipse.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(41027, 32928));
            expect(e.ellipse.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(30513, 54647));
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(243, 25, 233, 224));
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(230, 62, 9, 20));
            expect(e = dataSource.entities.getById('sampled_ellipse_material_grid')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(103, 140, 88, 233));
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(224, 133, 210, 4));
            expect(e.ellipse.material.cellAlpha.getValue(documentStartDate)).toEqual(39159.0);
            expect(e.ellipse.material.cellAlpha.getValue(documentStopDate)).toEqual(47494.0);
            expect(e.ellipse.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(40987, 3488));
            expect(e.ellipse.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(5066, 58131));
            expect(e.ellipse.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(11466, 25388));
            expect(e.ellipse.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(17761, 21317));
            expect(e.ellipse.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(478, 18945));
            expect(e.ellipse.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(25914, 29541));
            expect(e = dataSource.entities.getById('sampled_ellipse_material_stripe')).toBeDefined();
            expect(e.ellipse.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(218, 225, 186, 34));
            expect(e.ellipse.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(109, 193, 18, 44));
            expect(e.ellipse.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(119, 198, 180, 58));
            expect(e.ellipse.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(79, 137, 65, 31));
            expect(e.ellipse.material.offset.getValue(documentStartDate)).toEqual(16964.0);
            expect(e.ellipse.material.offset.getValue(documentStopDate)).toEqual(16523.0);
            expect(e.ellipse.material.repeat.getValue(documentStartDate)).toEqual(50015.0);
            expect(e.ellipse.material.repeat.getValue(documentStopDate)).toEqual(64942.0);
            expect(e = dataSource.entities.getById('sampled_ellipse_material_image_color')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.207843137254902, 0.0392156862745098, 0.12156862745098, 0.611764705882353), 1e-14);
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.611764705882353, 0.0117647058823529, 0.694117647058824, 0.576470588235294), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipse_material_grid_color')).toBeDefined();
            expect(e.ellipse.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.580392156862745, 0.0313725490196078, 0.27843137254902, 0.203921568627451), 1e-14);
            expect(e.ellipse.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0509803921568627, 0.870588235294118, 0.117647058823529, 0.588235294117647), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipse_material_stripe_evenColor')).toBeDefined();
            expect(e.ellipse.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0549019607843137, 0.117647058823529, 0.623529411764706, 0.929411764705882), 1e-14);
            expect(e.ellipse.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.266666666666667, 0.113725490196078, 0.937254901960784, 0.168627450980392), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipse_material_stripe_oddColor')).toBeDefined();
            expect(e.ellipse.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.262745098039216, 0.172549019607843, 0.282352941176471, 0.129411764705882), 1e-14);
            expect(e.ellipse.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.968627450980392, 0.635294117647059, 0.525490196078431, 0.831372549019608), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipse_outlineColor_rgbaf')).toBeDefined();
            expect(e.ellipse.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.76078431372549, 0.36078431372549, 0.223529411764706, 0.611764705882353), 1e-14);
            expect(e.ellipse.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.16078431372549, 0.83921568627451, 0.752941176470588, 0.647058823529412), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_solidColor_color')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.592156862745098, 0.976470588235294, 0.207843137254902, 0.501960784313725), 1e-14);
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0901960784313725, 0.662745098039216, 0.819607843137255, 0.235294117647059), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_image')).toBeDefined();
            expect(e.ellipsoid.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(63583, 15096));
            expect(e.ellipsoid.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(48977, 60351));
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(49, 50, 177, 104));
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(131, 27, 208, 157));
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_grid')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(121, 105, 70, 72));
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(204, 122, 157, 57));
            expect(e.ellipsoid.material.cellAlpha.getValue(documentStartDate)).toEqual(39442.0);
            expect(e.ellipsoid.material.cellAlpha.getValue(documentStopDate)).toEqual(463.0);
            expect(e.ellipsoid.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(33778, 30083));
            expect(e.ellipsoid.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(5202, 18708));
            expect(e.ellipsoid.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(44058, 37804));
            expect(e.ellipsoid.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(34449, 3718));
            expect(e.ellipsoid.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(33149, 21889));
            expect(e.ellipsoid.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(35482, 10122));
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_stripe')).toBeDefined();
            expect(e.ellipsoid.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(153, 245, 201, 196));
            expect(e.ellipsoid.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(245, 113, 5, 131));
            expect(e.ellipsoid.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(99, 151, 174, 111));
            expect(e.ellipsoid.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(188, 89, 18, 1));
            expect(e.ellipsoid.material.offset.getValue(documentStartDate)).toEqual(44961.0);
            expect(e.ellipsoid.material.offset.getValue(documentStopDate)).toEqual(5690.0);
            expect(e.ellipsoid.material.repeat.getValue(documentStartDate)).toEqual(3351.0);
            expect(e.ellipsoid.material.repeat.getValue(documentStopDate)).toEqual(44332.0);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_image_color')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.654901960784314, 0.517647058823529, 0.858823529411765, 0.486274509803922), 1e-14);
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.862745098039216, 0.713725490196078, 0.564705882352941, 0.0901960784313725), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_grid_color')).toBeDefined();
            expect(e.ellipsoid.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.6, 0.427450980392157, 0.203921568627451, 0.223529411764706), 1e-14);
            expect(e.ellipsoid.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.525490196078431, 0.305882352941176, 0.16078431372549, 0.819607843137255), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_stripe_evenColor')).toBeDefined();
            expect(e.ellipsoid.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.301960784313725, 0.572549019607843, 0.87843137254902, 0.219607843137255), 1e-14);
            expect(e.ellipsoid.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.337254901960784, 0.835294117647059, 0.964705882352941, 0.909803921568627), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_material_stripe_oddColor')).toBeDefined();
            expect(e.ellipsoid.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.647058823529412, 0.635294117647059, 0.258823529411765, 0.250980392156863), 1e-14);
            expect(e.ellipsoid.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.917647058823529, 0.262745098039216, 0.666666666666667, 0.980392156862745), 1e-14);
            expect(e = dataSource.entities.getById('sampled_ellipsoid_outlineColor_rgbaf')).toBeDefined();
            expect(e.ellipsoid.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.552941176470588, 0.549019607843137, 0.431372549019608, 0.568627450980392), 1e-14);
            expect(e.ellipsoid.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.435294117647059, 0.698039215686274, 0.396078431372549, 0.772549019607843), 1e-14);
            expect(e = dataSource.entities.getById('sampled_label_backgroundColor_rgbaf')).toBeDefined();
            expect(e.label.backgroundColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.96078431372549, 0.188235294117647, 0.870588235294118, 0.270588235294118), 1e-14);
            expect(e.label.backgroundColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.882352941176471, 0.796078431372549, 0.603921568627451, 0.823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled_label_fillColor_rgbaf')).toBeDefined();
            expect(e.label.fillColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.709803921568627, 0.556862745098039, 0.337254901960784, 0.247058823529412), 1e-14);
            expect(e.label.fillColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.43921568627451, 0.694117647058824, 0.901960784313726, 0.0823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled_label_outlineColor_rgbaf')).toBeDefined();
            expect(e.label.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.631372549019608, 0.709803921568627, 0.270588235294118, 0.792156862745098), 1e-14);
            expect(e.label.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.435294117647059, 0.176470588235294, 0.235294117647059, 0.631372549019608), 1e-14);
            expect(e = dataSource.entities.getById('sampled_model_silhouetteColor_rgbaf')).toBeDefined();
            expect(e.model.silhouetteColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.231372549019608, 0.866666666666667, 0.266666666666667, 0.635294117647059), 1e-14);
            expect(e.model.silhouetteColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.749019607843137, 0.227450980392157, 0.807843137254902, 0.0823529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled_model_color_rgbaf')).toBeDefined();
            expect(e.model.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0509803921568627, 0.83921568627451, 0.470588235294118, 0.956862745098039), 1e-14);
            expect(e.model.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.435294117647059, 0.945098039215686, 0.431372549019608, 0.619607843137255), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_solidColor_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.517647058823529, 0.56078431372549, 0.254901960784314, 0.494117647058824), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.905882352941176, 0.152941176470588, 0.854901960784314, 0.890196078431373), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineOutline')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(209, 154, 35, 76));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(186, 25, 242, 140));
            expect(e.path.material.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(218, 241, 216, 157));
            expect(e.path.material.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(70, 200, 183, 199));
            expect(e.path.material.outlineWidth.getValue(documentStartDate)).toEqual(2699.0);
            expect(e.path.material.outlineWidth.getValue(documentStopDate)).toEqual(1320.0);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineArrow')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(150, 221, 161, 136));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(19, 231, 68, 117));
            expect(e = dataSource.entities.getById('sampled_path_material_polylineDash')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(140, 167, 151, 119));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(65, 100, 228, 104));
            expect(e.path.material.gapColor.getValue(documentStartDate)).toEqual(Color.fromBytes(154, 198, 168, 151));
            expect(e.path.material.gapColor.getValue(documentStopDate)).toEqual(Color.fromBytes(16, 23, 0, 42));
            expect(e.path.material.dashLength.getValue(documentStartDate)).toEqual(38294.0);
            expect(e.path.material.dashLength.getValue(documentStopDate)).toEqual(33057.0);
            expect(e.path.material.dashPattern.getValue(documentStartDate)).toEqual(58660.0);
            expect(e.path.material.dashPattern.getValue(documentStopDate)).toEqual(3340.0);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineGlow')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(197, 117, 196, 254));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(18, 17, 195, 230));
            expect(e.path.material.glowPower.getValue(documentStartDate)).toEqual(5579.0);
            expect(e.path.material.glowPower.getValue(documentStopDate)).toEqual(59951.0);
            expect(e = dataSource.entities.getById('sampled_path_material_image')).toBeDefined();
            expect(e.path.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(25033, 47457));
            expect(e.path.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(30413, 15734));
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(225, 149, 237, 92));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(234, 146, 229, 9));
            expect(e = dataSource.entities.getById('sampled_path_material_grid')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(99, 177, 19, 203));
            expect(e.path.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(231, 169, 202, 127));
            expect(e.path.material.cellAlpha.getValue(documentStartDate)).toEqual(63572.0);
            expect(e.path.material.cellAlpha.getValue(documentStopDate)).toEqual(26232.0);
            expect(e.path.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(34101, 5509));
            expect(e.path.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(11991, 23086));
            expect(e.path.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(39225, 58265));
            expect(e.path.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(60443, 36332));
            expect(e.path.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(25536, 59747));
            expect(e.path.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(43164, 57256));
            expect(e = dataSource.entities.getById('sampled_path_material_stripe')).toBeDefined();
            expect(e.path.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(252, 51, 215, 123));
            expect(e.path.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(164, 66, 75, 80));
            expect(e.path.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(192, 190, 37, 99));
            expect(e.path.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(196, 81, 62, 248));
            expect(e.path.material.offset.getValue(documentStartDate)).toEqual(45320.0);
            expect(e.path.material.offset.getValue(documentStopDate)).toEqual(41173.0);
            expect(e.path.material.repeat.getValue(documentStartDate)).toEqual(42078.0);
            expect(e.path.material.repeat.getValue(documentStopDate)).toEqual(11633.0);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineOutline_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.490196078431373, 0.498039215686275, 0.819607843137255, 0.72156862745098), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.309803921568627, 0.329411764705882, 0.807843137254902, 0.368627450980392), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineOutline_outlineColor')).toBeDefined();
            expect(e.path.material.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.427450980392157, 0.96078431372549, 0.996078431372549, 0.662745098039216), 1e-14);
            expect(e.path.material.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.917647058823529, 0.635294117647059, 0.674509803921569, 0.298039215686275), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineArrow_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0666666666666667, 0.972549019607843, 0.686274509803922, 0.325490196078431), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.2, 0.482352941176471, 0.498039215686275, 0.219607843137255), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineDash_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.803921568627451, 0.67843137254902, 0.176470588235294, 0.709803921568627), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.674509803921569, 0.0980392156862745, 0.447058823529412, 0.803921568627451), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineDash_gapColor')).toBeDefined();
            expect(e.path.material.gapColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.231372549019608, 0.745098039215686, 0.772549019607843, 0.901960784313726), 1e-14);
            expect(e.path.material.gapColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.713725490196078, 0.180392156862745, 0.317647058823529, 0.309803921568627), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_polylineGlow_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.63921568627451, 0.2, 0.0196078431372549, 0.984313725490196), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.376470588235294, 0.815686274509804, 0.933333333333333, 0.0235294117647059), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_image_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.898039215686275, 0.772549019607843, 0.294117647058824, 0.0431372549019608), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.815686274509804, 0.0901960784313725, 0.898039215686275, 0.309803921568627), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_grid_color')).toBeDefined();
            expect(e.path.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.890196078431373, 0, 0.717647058823529, 0.329411764705882), 1e-14);
            expect(e.path.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.474509803921569, 0.690196078431373, 0.0431372549019608, 0.258823529411765), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_stripe_evenColor')).toBeDefined();
            expect(e.path.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.368627450980392, 0.584313725490196, 0.831372549019608, 0.541176470588235), 1e-14);
            expect(e.path.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.317647058823529, 0.4, 0.83921568627451, 0.537254901960784), 1e-14);
            expect(e = dataSource.entities.getById('sampled_path_material_stripe_oddColor')).toBeDefined();
            expect(e.path.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.145098039215686, 0.588235294117647, 0.917647058823529, 0.607843137254902), 1e-14);
            expect(e.path.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.117647058823529, 0.0705882352941176, 0.901960784313726, 0.525490196078431), 1e-14);
            expect(e = dataSource.entities.getById('sampled_point_color_rgbaf')).toBeDefined();
            expect(e.point.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.67843137254902, 0.356862745098039, 0.588235294117647, 0.796078431372549), 1e-14);
            expect(e.point.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.968627450980392, 0.298039215686275, 0.513725490196078, 0.631372549019608), 1e-14);
            expect(e = dataSource.entities.getById('sampled_point_outlineColor_rgbaf')).toBeDefined();
            expect(e.point.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.427450980392157, 0.894117647058824, 0.168627450980392, 0.768627450980392), 1e-14);
            expect(e.point.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.458823529411765, 0.466666666666667, 0.388235294117647, 0.792156862745098), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polygon_material_solidColor_color')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.305882352941176, 0.615686274509804, 0.337254901960784, 0.894117647058824), 1e-14);
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.184313725490196, 0.619607843137255, 0.352941176470588, 0.0313725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polygon_material_image')).toBeDefined();
            expect(e.polygon.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(19536, 17484));
            expect(e.polygon.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(46291, 28852));
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(157, 5, 231, 29));
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(53, 2, 148, 36));
            expect(e = dataSource.entities.getById('sampled_polygon_material_grid')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(179, 243, 247, 124));
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(15, 128, 159, 42));
            expect(e.polygon.material.cellAlpha.getValue(documentStartDate)).toEqual(11565.0);
            expect(e.polygon.material.cellAlpha.getValue(documentStopDate)).toEqual(42611.0);
            expect(e.polygon.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(47065, 65463));
            expect(e.polygon.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(29170, 16497));
            expect(e.polygon.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(62674, 26868));
            expect(e.polygon.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(22008, 39509));
            expect(e.polygon.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(28793, 1648));
            expect(e.polygon.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(44991, 42159));
            expect(e = dataSource.entities.getById('sampled_polygon_material_stripe')).toBeDefined();
            expect(e.polygon.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(113, 233, 143, 146));
            expect(e.polygon.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(106, 138, 115, 44));
            expect(e.polygon.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(104, 146, 138, 244));
            expect(e.polygon.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(161, 95, 25, 36));
            expect(e.polygon.material.offset.getValue(documentStartDate)).toEqual(4711.0);
            expect(e.polygon.material.offset.getValue(documentStopDate)).toEqual(65087.0);
            expect(e.polygon.material.repeat.getValue(documentStartDate)).toEqual(44013.0);
            expect(e.polygon.material.repeat.getValue(documentStopDate)).toEqual(7595.0);
            expect(e = dataSource.entities.getById('sampled_polygon_material_image_color')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.501960784313725, 0.0823529411764706, 0.282352941176471, 0.305882352941176), 1e-14);
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0745098039215686, 0.654901960784314, 0.6, 0.886274509803922), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polygon_material_grid_color')).toBeDefined();
            expect(e.polygon.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.192156862745098, 0.709803921568627, 0.807843137254902, 0.737254901960784), 1e-14);
            expect(e.polygon.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.674509803921569, 0.0235294117647059, 0.764705882352941, 0.976470588235294), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polygon_material_stripe_evenColor')).toBeDefined();
            expect(e.polygon.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.568627450980392, 0.352941176470588, 0.396078431372549, 0.435294117647059), 1e-14);
            expect(e.polygon.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.274509803921569, 0.43921568627451, 0.686274509803922, 0.419607843137255), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polygon_material_stripe_oddColor')).toBeDefined();
            expect(e.polygon.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.325490196078431, 0.349019607843137, 0.580392156862745, 0.725490196078431), 1e-14);
            expect(e.polygon.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.568627450980392, 0.690196078431373, 0.00392156862745098, 0.858823529411765), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polygon_outlineColor_rgbaf')).toBeDefined();
            expect(e.polygon.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.674509803921569, 0.556862745098039, 0.113725490196078, 0.6), 1e-14);
            expect(e.polygon.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.650980392156863, 0.827450980392157, 0.537254901960784, 0.713725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_solidColor_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.976470588235294, 0.949019607843137, 0.450980392156863, 0.466666666666667), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.262745098039216, 0.509803921568627, 0.537254901960784, 0.850980392156863), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineOutline')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(245, 92, 109, 218));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(241, 96, 196, 167));
            expect(e.polyline.material.outlineColor.getValue(documentStartDate)).toEqual(Color.fromBytes(174, 2, 11, 244));
            expect(e.polyline.material.outlineColor.getValue(documentStopDate)).toEqual(Color.fromBytes(31, 126, 140, 138));
            expect(e.polyline.material.outlineWidth.getValue(documentStartDate)).toEqual(33279.0);
            expect(e.polyline.material.outlineWidth.getValue(documentStopDate)).toEqual(26855.0);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineArrow')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(141, 137, 252, 157));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(8, 236, 198, 57));
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineDash')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(77, 159, 238, 158));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(206, 194, 234, 158));
            expect(e.polyline.material.gapColor.getValue(documentStartDate)).toEqual(Color.fromBytes(232, 145, 15, 164));
            expect(e.polyline.material.gapColor.getValue(documentStopDate)).toEqual(Color.fromBytes(173, 151, 118, 138));
            expect(e.polyline.material.dashLength.getValue(documentStartDate)).toEqual(41757.0);
            expect(e.polyline.material.dashLength.getValue(documentStopDate)).toEqual(10126.0);
            expect(e.polyline.material.dashPattern.getValue(documentStartDate)).toEqual(33948.0);
            expect(e.polyline.material.dashPattern.getValue(documentStopDate)).toEqual(16892.0);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineGlow')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(174, 178, 78, 176));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(79, 191, 38, 195));
            expect(e.polyline.material.glowPower.getValue(documentStartDate)).toEqual(55378.0);
            expect(e.polyline.material.glowPower.getValue(documentStopDate)).toEqual(60643.0);
            expect(e = dataSource.entities.getById('sampled_polyline_material_image')).toBeDefined();
            expect(e.polyline.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(50957, 35783));
            expect(e.polyline.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(59533, 65000));
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(174, 154, 113, 185));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(123, 236, 118, 155));
            expect(e = dataSource.entities.getById('sampled_polyline_material_grid')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(26, 89, 33, 224));
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(215, 131, 203, 1));
            expect(e.polyline.material.cellAlpha.getValue(documentStartDate)).toEqual(34343.0);
            expect(e.polyline.material.cellAlpha.getValue(documentStopDate)).toEqual(63863.0);
            expect(e.polyline.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(52308, 51660));
            expect(e.polyline.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(45338, 51633));
            expect(e.polyline.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(47738, 52154));
            expect(e.polyline.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(42674, 38822));
            expect(e.polyline.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(29194, 52338));
            expect(e.polyline.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(25319, 28514));
            expect(e = dataSource.entities.getById('sampled_polyline_material_stripe')).toBeDefined();
            expect(e.polyline.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(141, 205, 78, 73));
            expect(e.polyline.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(107, 159, 97, 34));
            expect(e.polyline.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(19, 76, 127, 197));
            expect(e.polyline.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(214, 222, 19, 168));
            expect(e.polyline.material.offset.getValue(documentStartDate)).toEqual(51126.0);
            expect(e.polyline.material.offset.getValue(documentStopDate)).toEqual(10891.0);
            expect(e.polyline.material.repeat.getValue(documentStartDate)).toEqual(25313.0);
            expect(e.polyline.material.repeat.getValue(documentStopDate)).toEqual(22020.0);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineOutline_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.384313725490196, 0.168627450980392, 0.443137254901961, 0.658823529411765), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0274509803921569, 0.647058823529412, 0.396078431372549, 0.105882352941176), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineOutline_outlineColor')).toBeDefined();
            expect(e.polyline.material.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0823529411764706, 0.0549019607843137, 0.149019607843137, 0.580392156862745), 1e-14);
            expect(e.polyline.material.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.733333333333333, 0.792156862745098, 0.63921568627451, 0.564705882352941), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineArrow_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.52156862745098, 0.725490196078431, 0.87843137254902, 0.823529411764706), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.772549019607843, 0.862745098039216, 0.325490196078431, 0), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineDash_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.525490196078431, 0.992156862745098, 0.964705882352941, 0.364705882352941), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.27843137254902, 0.133333333333333, 0.447058823529412, 0.192156862745098), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineDash_gapColor')).toBeDefined();
            expect(e.polyline.material.gapColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.498039215686275, 0.776470588235294, 0.803921568627451, 0.690196078431373), 1e-14);
            expect(e.polyline.material.gapColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.376470588235294, 0.898039215686275, 0.168627450980392, 0.898039215686275), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_polylineGlow_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.705882352941177, 0.901960784313726, 0.0784313725490196, 0.356862745098039), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.517647058823529, 0.207843137254902, 0.701960784313725, 0.105882352941176), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_image_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.796078431372549, 0.741176470588235, 0.741176470588235, 0.349019607843137), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.925490196078431, 0.266666666666667, 0.0941176470588235, 0.556862745098039), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_grid_color')).toBeDefined();
            expect(e.polyline.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.545098039215686, 0.847058823529412, 0.341176470588235, 0.101960784313725), 1e-14);
            expect(e.polyline.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.431372549019608, 0.952941176470588, 0.184313725490196, 0.184313725490196), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_stripe_evenColor')).toBeDefined();
            expect(e.polyline.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.807843137254902, 0.262745098039216, 0.898039215686275, 0.811764705882353), 1e-14);
            expect(e.polyline.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.415686274509804, 0.968627450980392, 0.0980392156862745, 0.423529411764706), 1e-14);
            expect(e = dataSource.entities.getById('sampled_polyline_material_stripe_oddColor')).toBeDefined();
            expect(e.polyline.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.427450980392157, 0.407843137254902, 0.470588235294118, 0.874509803921569), 1e-14);
            expect(e.polyline.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.509803921568627, 0.427450980392157, 0.976470588235294, 0), 1e-14);
            expect(e = dataSource.entities.getById('sampled_rectangle_coordinates_wsenDegrees')).toBeDefined();
            expect(e.rectangle.coordinates.getValue(documentStartDate)).toEqual(Rectangle.fromDegrees(35, 18, 38, 15));
            expect(e.rectangle.coordinates.getValue(documentStopDate)).toEqual(Rectangle.fromDegrees(38, 1, 12, 30));
            expect(e = dataSource.entities.getById('sampled_rectangle_material_solidColor_color')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.203921568627451, 0.243137254901961, 0.576470588235294, 0.0980392156862745), 1e-14);
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.913725490196078, 0.831372549019608, 0.76078431372549, 0.952941176470588), 1e-14);
            expect(e = dataSource.entities.getById('sampled_rectangle_material_image')).toBeDefined();
            expect(e.rectangle.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(3711, 44302));
            expect(e.rectangle.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(52318, 60108));
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(49, 142, 97, 190));
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(189, 250, 238, 118));
            expect(e = dataSource.entities.getById('sampled_rectangle_material_grid')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(95, 53, 115, 82));
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(204, 71, 209, 187));
            expect(e.rectangle.material.cellAlpha.getValue(documentStartDate)).toEqual(48813.0);
            expect(e.rectangle.material.cellAlpha.getValue(documentStopDate)).toEqual(21269.0);
            expect(e.rectangle.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(22945, 32857));
            expect(e.rectangle.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(55972, 34522));
            expect(e.rectangle.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(37146, 39825));
            expect(e.rectangle.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(64636, 13052));
            expect(e.rectangle.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(8882, 38690));
            expect(e.rectangle.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(8857, 21794));
            expect(e = dataSource.entities.getById('sampled_rectangle_material_stripe')).toBeDefined();
            expect(e.rectangle.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(243, 96, 246, 5));
            expect(e.rectangle.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(74, 28, 207, 87));
            expect(e.rectangle.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(147, 18, 134, 10));
            expect(e.rectangle.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(59, 151, 72, 114));
            expect(e.rectangle.material.offset.getValue(documentStartDate)).toEqual(57328.0);
            expect(e.rectangle.material.offset.getValue(documentStopDate)).toEqual(2602.0);
            expect(e.rectangle.material.repeat.getValue(documentStartDate)).toEqual(29729.0);
            expect(e.rectangle.material.repeat.getValue(documentStopDate)).toEqual(30206.0);
            expect(e = dataSource.entities.getById('sampled_rectangle_material_image_color')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.552941176470588, 0.101960784313725, 0.772549019607843, 0.00392156862745098), 1e-14);
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.0156862745098039, 0.964705882352941, 0.592156862745098, 0.396078431372549), 1e-14);
            expect(e = dataSource.entities.getById('sampled_rectangle_material_grid_color')).toBeDefined();
            expect(e.rectangle.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.490196078431373, 0.384313725490196, 0.937254901960784, 0.168627450980392), 1e-14);
            expect(e.rectangle.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.392156862745098, 0.756862745098039, 0.454901960784314, 0.529411764705882), 1e-14);
            expect(e = dataSource.entities.getById('sampled_rectangle_material_stripe_evenColor')).toBeDefined();
            expect(e.rectangle.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.32156862745098, 0.776470588235294, 0.227450980392157, 0.0823529411764706), 1e-14);
            expect(e.rectangle.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.929411764705882, 0.725490196078431, 0.00392156862745098, 0.364705882352941), 1e-14);
            expect(e = dataSource.entities.getById('sampled_rectangle_material_stripe_oddColor')).toBeDefined();
            expect(e.rectangle.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.984313725490196, 0.831372549019608, 0.827450980392157, 0.925490196078431), 1e-14);
            expect(e.rectangle.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.145098039215686, 0.0156862745098039, 0.380392156862745, 0.490196078431373), 1e-14);
            expect(e = dataSource.entities.getById('sampled_rectangle_outlineColor_rgbaf')).toBeDefined();
            expect(e.rectangle.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.980392156862745, 0.466666666666667, 0.752941176470588, 0.709803921568627), 1e-14);
            expect(e.rectangle.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.549019607843137, 0.949019607843137, 0.545098039215686, 0.380392156862745), 1e-14);
            expect(e = dataSource.entities.getById('sampled_wall_material_solidColor_color')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.384313725490196, 0.964705882352941, 0.827450980392157, 0.815686274509804), 1e-14);
            expect(e.wall.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.00784313725490196, 0.325490196078431, 0.952941176470588, 0.0549019607843137), 1e-14);
            expect(e = dataSource.entities.getById('sampled_wall_material_image')).toBeDefined();
            expect(e.wall.material.repeat.getValue(documentStartDate)).toEqual(new Cartesian2(13369, 38196));
            expect(e.wall.material.repeat.getValue(documentStopDate)).toEqual(new Cartesian2(36874, 55696));
            expect(e.wall.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(1, 152, 139, 83));
            expect(e.wall.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(127, 110, 56, 69));
            expect(e = dataSource.entities.getById('sampled_wall_material_grid')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqual(Color.fromBytes(243, 153, 88, 43));
            expect(e.wall.material.color.getValue(documentStopDate)).toEqual(Color.fromBytes(169, 159, 82, 75));
            expect(e.wall.material.cellAlpha.getValue(documentStartDate)).toEqual(32179.0);
            expect(e.wall.material.cellAlpha.getValue(documentStopDate)).toEqual(55901.0);
            expect(e.wall.material.lineCount.getValue(documentStartDate)).toEqual(new Cartesian2(46941, 30391));
            expect(e.wall.material.lineCount.getValue(documentStopDate)).toEqual(new Cartesian2(51565, 6089));
            expect(e.wall.material.lineThickness.getValue(documentStartDate)).toEqual(new Cartesian2(35543, 16778));
            expect(e.wall.material.lineThickness.getValue(documentStopDate)).toEqual(new Cartesian2(32904, 18048));
            expect(e.wall.material.lineOffset.getValue(documentStartDate)).toEqual(new Cartesian2(2955, 19723));
            expect(e.wall.material.lineOffset.getValue(documentStopDate)).toEqual(new Cartesian2(58723, 15333));
            expect(e = dataSource.entities.getById('sampled_wall_material_stripe')).toBeDefined();
            expect(e.wall.material.evenColor.getValue(documentStartDate)).toEqual(Color.fromBytes(204, 233, 122, 70));
            expect(e.wall.material.evenColor.getValue(documentStopDate)).toEqual(Color.fromBytes(215, 44, 132, 84));
            expect(e.wall.material.oddColor.getValue(documentStartDate)).toEqual(Color.fromBytes(20, 6, 10, 253));
            expect(e.wall.material.oddColor.getValue(documentStopDate)).toEqual(Color.fromBytes(96, 118, 90, 117));
            expect(e.wall.material.offset.getValue(documentStartDate)).toEqual(63629.0);
            expect(e.wall.material.offset.getValue(documentStopDate)).toEqual(38486.0);
            expect(e.wall.material.repeat.getValue(documentStartDate)).toEqual(41791.0);
            expect(e.wall.material.repeat.getValue(documentStopDate)).toEqual(56258.0);
            expect(e = dataSource.entities.getById('sampled_wall_material_image_color')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.584313725490196, 0.752941176470588, 0.588235294117647, 0.733333333333333), 1e-14);
            expect(e.wall.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.309803921568627, 0.988235294117647, 0.0784313725490196, 0.458823529411765), 1e-14);
            expect(e = dataSource.entities.getById('sampled_wall_material_grid_color')).toBeDefined();
            expect(e.wall.material.color.getValue(documentStartDate)).toEqualEpsilon(new Color(0.27843137254902, 0.549019607843137, 0.964705882352941, 0.96078431372549), 1e-14);
            expect(e.wall.material.color.getValue(documentStopDate)).toEqualEpsilon(new Color(0.709803921568627, 0.831372549019608, 0.67843137254902, 0.407843137254902), 1e-14);
            expect(e = dataSource.entities.getById('sampled_wall_material_stripe_evenColor')).toBeDefined();
            expect(e.wall.material.evenColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.0901960784313725, 0.243137254901961, 0.537254901960784, 0.168627450980392), 1e-14);
            expect(e.wall.material.evenColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.388235294117647, 0.847058823529412, 0.258823529411765, 0.113725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled_wall_material_stripe_oddColor')).toBeDefined();
            expect(e.wall.material.oddColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.345098039215686, 0.0196078431372549, 0.0549019607843137, 0.662745098039216), 1e-14);
            expect(e.wall.material.oddColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.694117647058824, 0.890196078431373, 0.380392156862745, 0.317647058823529), 1e-14);
            expect(e = dataSource.entities.getById('sampled_wall_outlineColor_rgbaf')).toBeDefined();
            expect(e.wall.outlineColor.getValue(documentStartDate)).toEqualEpsilon(new Color(0.933333333333333, 0.105882352941176, 0.0627450980392157, 0.396078431372549), 1e-14);
            expect(e.wall.outlineColor.getValue(documentStopDate)).toEqualEpsilon(new Color(0.901960784313726, 0.435294117647059, 0.352941176470588, 0.713725490196078), 1e-14);
            expect(e = dataSource.entities.getById('sampled_conicSensor_intersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_lateralSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_ellipsoidHorizonSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_domeSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentOcclusionMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_conicSensor_environmentIntersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_intersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_lateralSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_ellipsoidHorizonSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_domeSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentOcclusionMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_customPatternSensor_environmentIntersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_intersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_lateralSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_ellipsoidHorizonSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_domeSurfaceMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentOcclusionMaterial_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_rectangularSensor_environmentIntersectionColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_solidColor_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_image')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_grid')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_stripe')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_image_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_grid_color')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_stripe_evenColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_material_stripe_oddColor')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_fan_outlineColor_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_vector_color_rgbaf')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_vector_direction_unitSpherical')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_vector_direction_cartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_vector_direction_unitCartesian')).toBeDefined();
            expect(e = dataSource.entities.getById('sampled_custom')).toBeDefined();
            expect(e.properties.custom_boundingRectangle.getValue(documentStartDate)).toEqual(new BoundingRectangle(10924, 3626, 12558, 56113));
            expect(e.properties.custom_boundingRectangle.getValue(documentStopDate)).toEqual(new BoundingRectangle(59127, 45286, 34992, 17032));
            expect(e.properties.custom_cartesian.getValue(documentStartDate)).toEqual(new Cartesian3(59456, 60648, 1004));
            expect(e.properties.custom_cartesian.getValue(documentStopDate)).toEqual(new Cartesian3(37915, 14740, 14905));
            expect(e.properties.custom_cartographicRadians.getValue(documentStartDate)).toEqual(Cartesian3.fromRadians(1.25380297085855, 1.03510976346284, 7102));
            expect(e.properties.custom_cartographicRadians.getValue(documentStopDate)).toEqual(Cartesian3.fromRadians(1.10648839763778, 0.231915563506949, 340));
            expect(e.properties.custom_cartographicDegrees.getValue(documentStartDate)).toEqual(Cartesian3.fromDegrees(44, 31, 55762));
            expect(e.properties.custom_cartographicDegrees.getValue(documentStopDate)).toEqual(Cartesian3.fromDegrees(10, 18, 28847));
            expect(e.properties.custom_cartesian2.getValue(documentStartDate)).toEqual(new Cartesian2(9033, 9251));
            expect(e.properties.custom_cartesian2.getValue(documentStopDate)).toEqual(new Cartesian2(34048, 58501));
            expect(e.properties.custom_unitCartesian.getValue(documentStartDate)).toEqualEpsilon(new Cartesian3(0.0501133095086564, 0.917195967206924, 0.395272328843601), 1e-14);
            expect(e.properties.custom_unitCartesian.getValue(documentStopDate)).toEqualEpsilon(new Cartesian3(0.797476048450763, 0.40584478979077, 0.446454878735849), 1e-14);
            expect(e.properties.custom_spherical.getValue(documentStartDate)).toEqual(Cartesian3.fromSpherical(new Spherical(47098, 2231, 14088)));
            expect(e.properties.custom_spherical.getValue(documentStopDate)).toEqual(Cartesian3.fromSpherical(new Spherical(34883, 48264, 41148)));
            expect(e.properties.custom_unitSpherical.getValue(documentStartDate)).toEqual(Cartesian3.fromSpherical(new Spherical(48811, 24254)));
            expect(e.properties.custom_unitSpherical.getValue(documentStopDate)).toEqual(Cartesian3.fromSpherical(new Spherical(44800, 8111)));
            expect(e.properties.custom_rgba.getValue(documentStartDate)).toEqual(Color.fromBytes(179, 175, 115, 46));
            expect(e.properties.custom_rgba.getValue(documentStopDate)).toEqual(Color.fromBytes(136, 187, 237, 156));
            expect(e.properties.custom_rgbaf.getValue(documentStartDate)).toEqualEpsilon(new Color(0.890196078431373, 0.450980392156863, 0.588235294117647, 0.72156862745098), 1e-14);
            expect(e.properties.custom_rgbaf.getValue(documentStopDate)).toEqualEpsilon(new Color(0.419607843137255, 0.843137254901961, 0.36078431372549, 0.423529411764706), 1e-14);
            expect(e.properties.custom_number.getValue(documentStartDate)).toEqual(24561.0);
            expect(e.properties.custom_number.getValue(documentStopDate)).toEqual(45446.0);
            expect(e.properties.custom_nearFarScalar.getValue(documentStartDate)).toEqual(new NearFarScalar(64112, 15354, 32827, 10368));
            expect(e.properties.custom_nearFarScalar.getValue(documentStopDate)).toEqual(new NearFarScalar(55643, 45785, 33458, 29826));
            expect(e.properties.custom_unitQuaternion.getValue(documentStartDate)).toEqualEpsilon(new Quaternion(0.697299305414108, 0.26496667122144, 0.615947719782462, 0.253327354041402), 1e-14);
            expect(e.properties.custom_unitQuaternion.getValue(documentStopDate)).toEqualEpsilon(new Quaternion(0.134764165794432, 0.408681085292446, 0.902060273565587, 0.0332513608247514), 1e-14);
            expect(e.properties.custom_wsen.getValue(documentStartDate)).toEqual(new Rectangle(1.4164143530628, 1.2888469381038, 0.679756561409663, 1.29649258884014));
            expect(e.properties.custom_wsen.getValue(documentStopDate)).toEqual(new Rectangle(1.19133054275098, 0.9154648059314, 0.71347968461712, 1.32750822775441));
            expect(e.properties.custom_wsenDegrees.getValue(documentStartDate)).toEqual(Rectangle.fromDegrees(29, 11, 17, 36));
            expect(e.properties.custom_wsenDegrees.getValue(documentStopDate)).toEqual(Rectangle.fromDegrees(37, 16, 25, 23));
        });
    });
});
