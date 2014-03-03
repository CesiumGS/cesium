/*global defineSuite*/
defineSuite([
        'DynamicScene/CzmlDataSource',
        'DynamicScene/DynamicObjectCollection',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/Color',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Quaternion',
        'Core/ReferenceFrame',
        'Core/Spherical',
        'DynamicScene/DynamicBillboard',
        'DynamicScene/DynamicObject',
        'Scene/HorizontalOrigin',
        'Core/Iso8601',
        'Scene/LabelStyle',
        'Scene/VerticalOrigin',
        'Core/Event',
        'Core/loadJson',
        'Core/JulianDate',
        'Core/TimeInterval',
        'ThirdParty/when'
    ], function(
        CzmlDataSource,
        DynamicObjectCollection,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Color,
        defined,
        Ellipsoid,
        Quaternion,
        ReferenceFrame,
        Spherical,
        DynamicBillboard,
        DynamicObject,
        HorizontalOrigin,
        Iso8601,
        LabelStyle,
        VerticalOrigin,
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
        clock : {
            interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
            currentTime : '2012-03-15T10:00:00Z',
            multiplier : 60.0,
            range : 'LOOP_STOP',
            step : 'SYSTEM_CLOCK_MULTIPLIER'
        }
    };

    var nameCzml = {
        id : 'document',
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
        expect(dataSource.getName()).toBeUndefined();
        expect(dataSource.getClock()).toBeUndefined();
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(0);
        expect(dataSource.getIsTimeVarying()).toEqual(true);
    });

    it('getName returns CZML defined name', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(nameCzml);
        expect(dataSource.getName()).toEqual('czmlName');
    });

    it('getName uses source name if CZML name is undefined', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(clockCzml, 'Gallery/simple.czml?asd=true');
        expect(dataSource.getName()).toEqual('simple.czml');
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
            return dataSource.getDynamicObjectCollection().getObjects().length === 11;
        });
    });

    it('processUrl loads data on top of existing', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 11;
        });

        runs(function() {
            dataSource.processUrl(vehicleUrl);
        });

        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 12;
        });
    });

    it('loadUrl replaces data', function() {
        var dataSource = new CzmlDataSource();
        dataSource.processUrl(simpleUrl);
        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 11;
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
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(11);
        });
    });

    it('process loads data on top of existing', function() {
        waitsFor(function() {
            return defined(simple) && defined(vehicle);
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, simpleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length === 11);

            dataSource.process(vehicle, vehicleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length === 12);
        });
    });

    it('load replaces data', function() {
        waitsFor(function() {
            return defined(simple) && defined(vehicle);
        });

        runs(function() {
            var dataSource = new CzmlDataSource();
            dataSource.process(simple, simpleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(11);

            dataSource.load(vehicle, vehicleUrl);
            expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
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

    it('processUrl throws with undefined Url', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.processUrl(undefined);
        }).toThrowDeveloperError();
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new CzmlDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrowDeveloperError();
    });

    it('raises changed event when loading CZML', function() {
        var dataSource = new CzmlDataSource();

        var spy = jasmine.createSpy('changedEvent');
        dataSource.getChangedEvent().addEventListener(spy);

        dataSource.load(clockCzml);

        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('raises changed event when name changes in CZML', function() {
        var dataSource = new CzmlDataSource();

        var originalCzml = {
            id : 'document',
            name : 'czmlName'
        };
        dataSource.load(originalCzml);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.getChangedEvent().addEventListener(spy);

        var newCzml = {
            id : 'document',
            name : 'newCzmlName'
        };
        dataSource.load(newCzml);

        expect(spy).toHaveBeenCalledWith(dataSource);
    });

    it('does not raise changed event when name does not change in CZML', function() {
        var dataSource = new CzmlDataSource();

        dataSource.load(nameCzml);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.getChangedEvent().addEventListener(spy);

        dataSource.load(nameCzml);

        expect(spy).not.toHaveBeenCalled();
    });

    it('raises changed event when clock changes in CZML', function() {
        var dataSource = new CzmlDataSource();

        var originalCzml = {
            id : 'document',
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
        dataSource.getChangedEvent().addEventListener(spy);

        var newCzml = {
            id : 'document',
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
        dataSource.getChangedEvent().addEventListener(spy);

        dataSource.load(clockCzml);

        expect(spy).not.toHaveBeenCalled();
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
        dataSource.load(billboardPacket, sourceUri);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.billboard).toBeDefined();
        expect(dynamicObject.billboard.image.getValue(Iso8601.MINIMUM_VALUE)).toEqual(sourceUri + 'image.png');
        expect(dynamicObject.billboard.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(billboardPacket.billboard.scale);
        expect(dynamicObject.billboard.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.CENTER);
        expect(dynamicObject.billboard.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.billboard.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(dynamicObject.billboard.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(dynamicObject.billboard.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(1.0, 2.0));
        expect(dynamicObject.billboard.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
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

        var validTime = TimeInterval.fromIso8601(billboardPacket.billboard.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(billboardPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.billboard).toBeDefined();
        expect(dynamicObject.billboard.image.getValue(validTime)).toEqual(billboardPacket.billboard.image);
        expect(dynamicObject.billboard.scale.getValue(validTime)).toEqual(billboardPacket.billboard.scale);
        expect(dynamicObject.billboard.horizontalOrigin.getValue(validTime)).toEqual(HorizontalOrigin.CENTER);
        expect(dynamicObject.billboard.verticalOrigin.getValue(validTime)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.billboard.color.getValue(validTime)).toEqual(new Color(1.0, 1.0, 1.0, 1.0));
        expect(dynamicObject.billboard.eyeOffset.getValue(validTime)).toEqual(new Cartesian3(3.0, 4.0, 5.0));
        expect(dynamicObject.billboard.pixelOffset.getValue(validTime)).toEqual(new Cartesian2(1.0, 2.0));
        expect(dynamicObject.billboard.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.billboard).toBeDefined();
        expect(dynamicObject.billboard.image.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.scale.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.horizontalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.verticalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.eyeOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.pixelOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.billboard.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds clock data.', function() {
        var clockPacket = {
            id : 'document',
            clock : {
                interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
                currentTime : '2012-03-15T10:00:00Z',
                multiplier : 60.0,
                range : 'LOOP_STOP',
                step : 'SYSTEM_CLOCK_MULTIPLIER'
            }
        };

        var interval = TimeInterval.fromIso8601(clockPacket.clock.interval);
        var currentTime = JulianDate.fromIso8601(clockPacket.clock.currentTime);
        var multiplier = clockPacket.clock.multiplier;
        var range = ClockRange[clockPacket.clock.range];
        var step = ClockStep[clockPacket.clock.step];

        var dataSource = new CzmlDataSource();
        dataSource.load(clockPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dataSource.getClock()).toBeDefined();
        expect(dataSource.getClock().startTime).toEqual(interval.start);
        expect(dataSource.getClock().stopTime).toEqual(interval.stop);
        expect(dataSource.getClock().currentTime).toEqual(currentTime);
        expect(dataSource.getClock().clockRange).toEqual(range);
        expect(dataSource.getClock().clockStep).toEqual(step);
        expect(dataSource.getClock().multiplier).toEqual(multiplier);
    });

    it('CZML only adds clock data on the document object.', function() {
        var clockPacket = {
            id : 'notTheDocument',
            clock : {
                interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
                currentTime : '2012-03-15T10:00:00Z',
                multiplier : 60.0,
                range : 'LOOP_STOP',
                step : 'SYSTEM_CLOCK_MULTIPLIER'
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(clockPacket);
        expect(dataSource.getClock()).toBeUndefined();
    });

    it('CZML adds data for infinite cone.', function() {
        var conePacket = {
            cone : {
                innerHalfAngle : 1.0,
                outerHalfAngle : 1.1,
                minimumClockAngle : 1.2,
                maximumClockAngle : 1.3,
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 6.0,
                capMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                innerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        }
                    }
                },
                outerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.3, 0.3, 0.3, 0.3]
                        }
                    }
                },
                silhouetteMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.4, 0.4, 0.4, 0.4]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(conePacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.cone).toBeDefined();
        expect(dynamicObject.cone.innerHalfAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.innerHalfAngle);
        expect(dynamicObject.cone.outerHalfAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.outerHalfAngle);
        expect(dynamicObject.cone.minimumClockAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.minimumClockAngle);
        expect(dynamicObject.cone.maximumClockAngle.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.maximumClockAngle);
        expect(dynamicObject.cone.radius.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.radius);
        expect(dynamicObject.cone.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.show);
        expect(dynamicObject.cone.showIntersection.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.showIntersection);
        expect(dynamicObject.cone.capMaterial.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.cone.innerMaterial.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.cone.outerMaterial.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.3, 0.3, 0.3, 0.3));
        expect(dynamicObject.cone.silhouetteMaterial.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.4, 0.4, 0.4, 0.4));
        expect(dynamicObject.cone.intersectionColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.cone.intersectionWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(conePacket.cone.intersectionWidth);
    });

    it('CZML adds data for constrained cone.', function() {
        var conePacket = {
            cone : {
                interval : '2000-01-01/2001-01-01',
                innerHalfAngle : 1.0,
                outerHalfAngle : 1.1,
                minimumClockAngle : 1.2,
                maximumClockAngle : 1.3,
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 4.0,
                capMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                innerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.2, 0.2, 0.2, 0.2]
                        }
                    }
                },
                outerMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.3, 0.3, 0.3, 0.3]
                        }
                    }
                },
                silhouetteMaterial : {
                    solidColor : {
                        color : {
                            rgbaf : [0.4, 0.4, 0.4, 0.4]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var validTime = TimeInterval.fromIso8601(conePacket.cone.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(conePacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.cone).toBeDefined();
        expect(dynamicObject.cone.innerHalfAngle.getValue(validTime)).toEqual(conePacket.cone.innerHalfAngle);
        expect(dynamicObject.cone.outerHalfAngle.getValue(validTime)).toEqual(conePacket.cone.outerHalfAngle);
        expect(dynamicObject.cone.minimumClockAngle.getValue(validTime)).toEqual(conePacket.cone.minimumClockAngle);
        expect(dynamicObject.cone.maximumClockAngle.getValue(validTime)).toEqual(conePacket.cone.maximumClockAngle);
        expect(dynamicObject.cone.radius.getValue(validTime)).toEqual(conePacket.cone.radius);
        expect(dynamicObject.cone.show.getValue(validTime)).toEqual(conePacket.cone.show);
        expect(dynamicObject.cone.showIntersection.getValue(validTime)).toEqual(conePacket.cone.showIntersection);
        expect(dynamicObject.cone.capMaterial.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.cone.innerMaterial.getValue(validTime).color).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.cone.outerMaterial.getValue(validTime).color).toEqual(new Color(0.3, 0.3, 0.3, 0.3));
        expect(dynamicObject.cone.silhouetteMaterial.getValue(validTime).color).toEqual(new Color(0.4, 0.4, 0.4, 0.4));
        expect(dynamicObject.cone.intersectionColor.getValue(validTime)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.cone.intersectionWidth.getValue(validTime)).toEqual(conePacket.cone.intersectionWidth);

        expect(dynamicObject.cone.innerHalfAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.outerHalfAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.minimumClockAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.maximumClockAngle.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.radius.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.showIntersection.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.capMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.innerMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.outerMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.silhouetteMaterial.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.intersectionColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.cone.intersectionWidth.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML constant cartographicsDegrees positions work.', function() {
        var czml = {
            position : {
                cartographicDegrees : [34, 117, 10000]
            }
        };
        var cartographic = Cartographic.fromDegrees(34, 117, 10000);

        var dataSource = new CzmlDataSource();
        dataSource.load(czml);

        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        var resultCartesian = dynamicObject.position.getValue(new JulianDate());
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic));
    });

    it('CZML sampled cartographicsDegrees positions work.', function() {
        var epoch = new JulianDate();

        var czml = {
            position : {
                epoch : epoch.toIso8601(),
                cartographicDegrees : [0, 34, 117, 10000, 1, 34, 117, 20000]
            }
        };
        var cartographic = Cartographic.fromDegrees(34, 117, 10000);
        var cartographic2 = Cartographic.fromDegrees(34, 117, 20000);

        var dataSource = new CzmlDataSource();
        dataSource.load(czml);

        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        var resultCartesian = dynamicObject.position.getValue(epoch);
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic));

        resultCartesian = dynamicObject.position.getValue(epoch.addSeconds(1));
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic2));
    });

    it('CZML sampled positions work without epoch.', function() {
        var lastDate = new JulianDate();
        var firstDate = new JulianDate(lastDate.getJulianDayNumber() - 1, 0);

        var czml = {
            position : {
                cartographicDegrees : [firstDate.toIso8601(), 34, 117, 10000, lastDate.toIso8601(), 34, 117, 20000]
            }
        };
        var cartographic = Cartographic.fromDegrees(34, 117, 10000);
        var cartographic2 = Cartographic.fromDegrees(34, 117, 20000);

        var dataSource = new CzmlDataSource();
        dataSource.load(czml);

        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        var resultCartesian = dynamicObject.position.getValue(firstDate);
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic));

        resultCartesian = dynamicObject.position.getValue(lastDate);
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic2));
    });

    it('CZML constant cartographicRadians positions work.', function() {
        var czml = {
            position : {
                cartographicRadians : [1, 2, 10000]
            }
        };
        var cartographic = new Cartographic(1, 2, 10000);

        var dataSource = new CzmlDataSource();
        dataSource.load(czml);

        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        var resultCartesian = dynamicObject.position.getValue(new JulianDate());
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic));
    });

    it('Can set reference frame', function() {
        var epoch = new JulianDate();
        var dataSource = new CzmlDataSource();

        var czml = {
            position : {
                referenceFrame : 'INERTIAL',
                epoch : epoch.toIso8601(),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.load(czml);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.position.referenceFrame).toBe(ReferenceFrame.INERTIAL);

        czml = {
            position : {
                referenceFrame : 'FIXED',
                epoch : epoch.toIso8601(),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.load(czml);
        dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.position.referenceFrame).toBe(ReferenceFrame.FIXED);
    });

    it('Default reference frame on existing interval does not reset value to FIXED.', function() {
        var epoch = new JulianDate();
        var dataSource = new CzmlDataSource();

        var czml = {
            position : {
                referenceFrame : 'INERTIAL',
                epoch : epoch.toIso8601(),
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        dataSource.process(czml);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.position.referenceFrame).toBe(ReferenceFrame.INERTIAL);

        var czml2 = {
            position : {
                epoch : epoch.toIso8601(),
                cartesian : [1.0, 2.0, 3.0]
            }
        };
        dataSource.process(czml2);

        expect(dynamicObject.position.referenceFrame).toBe(ReferenceFrame.INERTIAL);
    });

    it('CZML sampled cartographicRadians positions work.', function() {
        var epoch = new JulianDate();

        var czml = {
            position : {
                epoch : epoch.toIso8601(),
                cartographicRadians : [0, 2, 0.3, 10000, 1, 0.2, 0.5, 20000]
            }
        };
        var cartographic = new Cartographic(2, 0.3, 10000);
        var cartographic2 = new Cartographic(0.2, 0.5, 20000);

        var dataSource = new CzmlDataSource();
        dataSource.load(czml);

        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        var resultCartesian = dynamicObject.position.getValue(epoch);
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic));

        resultCartesian = dynamicObject.position.getValue(epoch.addSeconds(1));
        expect(resultCartesian).toEqual(Ellipsoid.WGS84.cartographicToCartesian(cartographic2));
    });

    it('CZML sampled numbers work without epoch.', function() {
        var firstDate = Iso8601.MINIMUM_VALUE;
        var midDate = firstDate.addDays(1);
        var lastDate = firstDate.addDays(2);

        var ellipsePacket = {
            ellipse : {
                semiMajorAxis : {
                    number : [firstDate.toIso8601(), 0, lastDate.toIso8601(), 10]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(ellipsePacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(firstDate)).toEqual(0);
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(midDate)).toEqual(5);
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(lastDate)).toEqual(10);
    });

    it('CZML adds data for infinite ellipse.', function() {
        var ellipsePacket = {
            ellipse : {
                semiMajorAxis : 10,
                semiMinorAxis : 20,
                rotation : 1.0
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(ellipsePacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMajorAxis);
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.semiMinorAxis);
        expect(dynamicObject.ellipse.rotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsePacket.ellipse.rotation);
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
        dataSource.load(ellipsePacketInterval);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        var validTime = TimeInterval.fromIso8601(ellipsePacketInterval.ellipse.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        expect(dynamicObject.ellipse).toBeDefined();
        expect(dynamicObject.ellipse.semiMajorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMajorAxis);
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.semiMinorAxis);
        expect(dynamicObject.ellipse.rotation.getValue(validTime)).toEqual(ellipsePacketInterval.ellipse.rotation);

        expect(dynamicObject.ellipse.semiMajorAxis.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.semiMinorAxis.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipse.rotation.getValue(invalidTime)).toBeUndefined();
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
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(ellipsoidPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.ellipsoid).toBeDefined();
        expect(dynamicObject.ellipsoid.radii.getValue(Iso8601.MINIMUM_VALUE)).toEqual(expectedRadii);
        expect(dynamicObject.ellipsoid.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(ellipsoidPacket.ellipsoid.show);
        expect(dynamicObject.ellipsoid.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
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

        var validTime = TimeInterval.fromIso8601(ellipsoidPacketInterval.ellipsoid.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(ellipsoidPacketInterval);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.ellipsoid).toBeDefined();
        expect(dynamicObject.ellipsoid.radii.getValue(validTime)).toEqual(expectedRadii);
        expect(dynamicObject.ellipsoid.show.getValue(validTime)).toEqual(ellipsoidPacketInterval.ellipsoid.show);
        expect(dynamicObject.ellipsoid.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));

        expect(dynamicObject.ellipsoid.radii.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipsoid.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.ellipsoid.material.getValue(invalidTime)).toBeUndefined();
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
        dataSource.load(labelPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.label).toBeDefined();
        expect(dynamicObject.label.text.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.text);
        expect(dynamicObject.label.font.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.font);
        expect(dynamicObject.label.style.getValue(Iso8601.MINIMUM_VALUE)).toEqual(LabelStyle.FILL);
        expect(dynamicObject.label.fillColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.label.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.label.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.outlineWidth);
        expect(dynamicObject.label.horizontalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HorizontalOrigin.LEFT);
        expect(dynamicObject.label.verticalOrigin.getValue(Iso8601.MINIMUM_VALUE)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.label.eyeOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(dynamicObject.label.pixelOffset.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian2(4.0, 5.0));
        expect(dynamicObject.label.scale.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.scale);
        expect(dynamicObject.label.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(labelPacket.label.show);
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

        var validTime = TimeInterval.fromIso8601(labelPacket.label.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(labelPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.label).toBeDefined();
        expect(dynamicObject.label.text.getValue(validTime)).toEqual(labelPacket.label.text);
        expect(dynamicObject.label.font.getValue(validTime)).toEqual(labelPacket.label.font);
        expect(dynamicObject.label.style.getValue(validTime)).toEqual(LabelStyle.FILL);
        expect(dynamicObject.label.fillColor.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.label.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.label.outlineWidth.getValue(validTime)).toEqual(labelPacket.label.outlineWidth);
        expect(dynamicObject.label.horizontalOrigin.getValue(validTime)).toEqual(HorizontalOrigin.LEFT);
        expect(dynamicObject.label.verticalOrigin.getValue(validTime)).toEqual(VerticalOrigin.CENTER);
        expect(dynamicObject.label.eyeOffset.getValue(validTime)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
        expect(dynamicObject.label.pixelOffset.getValue(validTime)).toEqual(new Cartesian2(4.0, 5.0));
        expect(dynamicObject.label.scale.getValue(validTime)).toEqual(labelPacket.label.scale);
        expect(dynamicObject.label.show.getValue(validTime)).toEqual(labelPacket.label.show);

        expect(dynamicObject.label.text.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.font.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.style.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.fillColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.outlineWidth.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.horizontalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.verticalOrigin.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.eyeOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.pixelOffset.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.scale.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.label.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML Position works.', function() {
        var packet = {
            position : {
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(packet);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    });

    it('CZML Orientation works.', function() {
        var packet = {
            orientation : {
                unitQuaternion : [0.0, 0.0, 0.0, 1.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(packet);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.orientation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Quaternion(0.0, 0.0, 0.0, 1.0));
    });

    it('CZML VertexPositions works.', function() {
        var packet = {
            vertexPositions : {
                cartesian : [1.0, 2.0, 3.0, 5.0, 6.0, 7.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(packet);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.vertexPositions.getValue(Iso8601.MINIMUM_VALUE)).toEqual([new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(5.0, 6.0, 7.0)]);

        packet = {
            vertexPositions : [{
                interval : '2013-01-01T00:00:00Z/2013-01-01T01:00:00Z',
                cartesian : [1.0, 2.0, 3.0]
            }, {
                interval : '2013-01-01T01:00:00Z/2013-01-01T02:00:00Z',
                cartesian : [4.0, 5.0, 6.0]
            }]
        };
        dataSource = new CzmlDataSource();
        dataSource.load(packet);
        dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.vertexPositions.getValue(JulianDate.fromIso8601('2013-01-01T00:00:00Z'))).toEqual([new Cartesian3(1.0, 2.0, 3.0)]);
        expect(dynamicObject.vertexPositions.getValue(JulianDate.fromIso8601('2013-01-01T01:00:00Z'))).toEqual([new Cartesian3(4.0, 5.0, 6.0)]);
    });

    it('CZML ViewFrom works.', function() {
        var packet = {
            viewFrom : {
                cartesian : [1.0, 2.0, 3.0]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(packet);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.viewFrom.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    });

    it('CZML description works.', function() {
        var packet = {
            description : 'this is a description'
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(packet);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.description.getValue(Iso8601.MINIMUM_VALUE)).toEqual(packet.description);
    });

    it('CZML Availability works with a single interval.', function() {
        var packet1 = {
            id : 'testObject',
            availability : '2000-01-01/2001-01-01'
        };

        var dataSource = new CzmlDataSource();
        dataSource.process(packet1);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        var interval = TimeInterval.fromIso8601(packet1.availability);
        expect(dynamicObject.availability.length).toEqual(1);
        expect(dynamicObject.availability.get(0)).toEqual(interval);

        var packet2 = {
            id : 'testObject',
            availability : '2000-02-02/2001-02-02'
        };

        dataSource.process(packet2);
        interval = TimeInterval.fromIso8601(packet2.availability);
        expect(dynamicObject.availability.length).toEqual(1);
        expect(dynamicObject.availability.get(0)).toEqual(interval);
    });

    it('CZML Availability works with multiple intervals.', function() {
        var packet1 = {
            id : 'testObject',
            availability : ['2000-01-01/2001-01-01', '2002-01-01/2003-01-01']
        };

        var dataSource = new CzmlDataSource();
        dataSource.process(packet1);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        var interval1 = TimeInterval.fromIso8601(packet1.availability[0]);
        var interval2 = TimeInterval.fromIso8601(packet1.availability[1]);
        expect(dynamicObject.availability.length).toEqual(2);
        expect(dynamicObject.availability.get(0)).toEqual(interval1);
        expect(dynamicObject.availability.get(1)).toEqual(interval2);

        var packet2 = {
            id : 'testObject',
            availability : ['2003-01-01/2004-01-01', '2005-01-01/2006-01-01']
        };
        dataSource.process(packet2);

        interval1 = TimeInterval.fromIso8601(packet2.availability[0]);
        interval2 = TimeInterval.fromIso8601(packet2.availability[1]);
        expect(dynamicObject.availability.length).toEqual(2);
        expect(dynamicObject.availability.get(0)).toEqual(interval1);
        expect(dynamicObject.availability.get(1)).toEqual(interval2);
    });

    it('CZML adds data for infinite path.', function() {
        var pathPacket = {
            path : {
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                resolution : 23.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(pathPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.path).toBeDefined();
        expect(dynamicObject.path.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.path.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.width);
        expect(dynamicObject.path.resolution.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.resolution);
        expect(dynamicObject.path.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.path.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.outlineWidth);
        expect(dynamicObject.path.leadTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.leadTime);
        expect(dynamicObject.path.trailTime.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pathPacket.path.trailTime);
        expect(dynamicObject.path.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('CZML adds data for constrained path.', function() {
        var pathPacket = {
            path : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                resolution : 23.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                leadTime : 2.0,
                trailTime : 3.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(pathPacket.path.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(pathPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.path).toBeDefined();
        expect(dynamicObject.path.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.path.width.getValue(validTime)).toEqual(pathPacket.path.width);
        expect(dynamicObject.path.resolution.getValue(validTime)).toEqual(pathPacket.path.resolution);
        expect(dynamicObject.path.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.path.outlineWidth.getValue(validTime)).toEqual(pathPacket.path.outlineWidth);
        expect(dynamicObject.path.leadTime.getValue(validTime)).toEqual(pathPacket.path.leadTime);
        expect(dynamicObject.path.trailTime.getValue(validTime)).toEqual(pathPacket.path.trailTime);
        expect(dynamicObject.path.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.path.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.outlineWidth.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.leadTime.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.trailTime.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.path.show.getValue(invalidTime)).toBeUndefined();
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
        dataSource.load(pointPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.point).toBeDefined();
        expect(dynamicObject.point.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.point.pixelSize.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pointPacket.point.pixelSize);
        expect(dynamicObject.point.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.point.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pointPacket.point.outlineWidth);
        expect(dynamicObject.point.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
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

        var validTime = TimeInterval.fromIso8601(pointPacket.point.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(pointPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.point).toBeDefined();
        expect(dynamicObject.point.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.point.pixelSize.getValue(validTime)).toEqual(pointPacket.point.pixelSize);
        expect(dynamicObject.point.outlineColor.getValue(validTime)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.point.outlineWidth.getValue(validTime)).toEqual(pointPacket.point.outlineWidth);
        expect(dynamicObject.point.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.point.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.point.pixelSize.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.point.outlineColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.point.outlineWidth.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.point.show.getValue(invalidTime)).toBeUndefined();
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
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(polygonPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.polygon).toBeDefined();
        expect(dynamicObject.polygon.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polygon.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
        expect(dynamicObject.polygon.height.getValue(Iso8601.MINIMUM_VALUE)).toEqual(1);
        expect(dynamicObject.polygon.extrudedHeight.getValue(Iso8601.MINIMUM_VALUE)).toEqual(2);
        expect(dynamicObject.polygon.granularity.getValue(Iso8601.MINIMUM_VALUE)).toEqual(3);
        expect(dynamicObject.polygon.stRotation.getValue(Iso8601.MINIMUM_VALUE)).toEqual(4);
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

        var validTime = TimeInterval.fromIso8601(polygonPacket.polygon.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(polygonPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.polygon).toBeDefined();
        expect(dynamicObject.polygon.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polygon.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.polygon.material.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polygon.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite polyline.', function() {
        var polylinePacket = {
            polyline : {
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(polylinePacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.polyline).toBeDefined();
        expect(dynamicObject.polyline.material.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polyline.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(polylinePacket.polyline.width);
        expect(dynamicObject.polyline.material.outlineColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.polyline.material.outlineWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(polylinePacket.polyline.outlineWidth);
        expect(dynamicObject.polyline.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('CZML adds data for constrained polyline.', function() {
        var polylinePacket = {
            polyline : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                outlineColor : {
                    rgbaf : [0.2, 0.2, 0.2, 0.2]
                },
                outlineWidth : 1.0,
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(polylinePacket.polyline.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(polylinePacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.polyline).toBeDefined();
        expect(dynamicObject.polyline.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.polyline.width.getValue(validTime)).toEqual(polylinePacket.polyline.width);
        expect(dynamicObject.polyline.material.getValue(validTime).outlineColor).toEqual(new Color(0.2, 0.2, 0.2, 0.2));
        expect(dynamicObject.polyline.material.getValue(validTime).outlineWidth).toEqual(polylinePacket.polyline.outlineWidth);
        expect(dynamicObject.polyline.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.polyline.material.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.polyline.show.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite pyramid.', function() {
        var pyramidPacket = {
            pyramid : {
                directions : {
                    unitSpherical : [1.0, 2.0, 3.0, 4.0]
                },
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 7.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(pyramidPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.pyramid).toBeDefined();
        expect(dynamicObject.pyramid.directions.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
                [new Spherical(pyramidPacket.pyramid.directions.unitSpherical[0], pyramidPacket.pyramid.directions.unitSpherical[1]),
                        new Spherical(pyramidPacket.pyramid.directions.unitSpherical[2], pyramidPacket.pyramid.directions.unitSpherical[3])]);
        expect(dynamicObject.pyramid.radius.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pyramidPacket.pyramid.radius);
        expect(dynamicObject.pyramid.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pyramidPacket.pyramid.show);
        expect(dynamicObject.pyramid.showIntersection.getValue(Iso8601.MINIMUM_VALUE)).toEqual(pyramidPacket.pyramid.showIntersection);
        expect(dynamicObject.pyramid.material.getValue(Iso8601.MINIMUM_VALUE).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.pyramid.intersectionColor.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.pyramid.intersectionWidth.getValue(Iso8601.MINIMUM_VALUE)).toEqual(7.0);
    });

    it('pyramid directions supports intervals.', function() {
        var pyramidPacket = {
            pyramid : {
                directions : [{
                    interval : '2013-01-01T00:00:00Z/2013-01-01T01:00:00Z',
                    unitSpherical : [1.0, 2.0]
                }, {
                    interval : '2013-01-01T01:00:00Z/2013-01-01T02:00:00Z',
                    unitSpherical : [3.0, 4.0]
                }]
            }
        };

        var expected1 = [new Spherical(pyramidPacket.pyramid.directions[0].unitSpherical[0], pyramidPacket.pyramid.directions[0].unitSpherical[1])];
        var expected2 = [new Spherical(pyramidPacket.pyramid.directions[1].unitSpherical[0], pyramidPacket.pyramid.directions[1].unitSpherical[1])];

        var dataSource = new CzmlDataSource();
        dataSource.load(pyramidPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.pyramid.directions.getValue(JulianDate.fromIso8601('2013-01-01T00:00:00Z'))).toEqual(expected1);
        expect(dynamicObject.pyramid.directions.getValue(JulianDate.fromIso8601('2013-01-01T01:00:00Z'))).toEqual(expected2);
    });

    it('CZML adds data for constrained pyramid.', function() {
        var pyramidPacket = {
            pyramid : {
                interval : '2000-01-01/2001-01-01',
                directions : {
                    unitSpherical : [1.0, 2.0, 3.0, 4.0]
                },
                radius : 2.0,
                show : true,
                showIntersection : false,
                intersectionWidth : 8.0,
                material : {
                    solidColor : {
                        color : {
                            rgbaf : [0.1, 0.1, 0.1, 0.1]
                        }
                    }
                },
                intersectionColor : {
                    rgbaf : [0.5, 0.5, 0.5, 0.5]
                }
            }
        };

        var validTime = TimeInterval.fromIso8601(pyramidPacket.pyramid.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(pyramidPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.pyramid).toBeDefined();
        expect(dynamicObject.pyramid.directions.getValue(validTime)).toEqual(
                [new Spherical(pyramidPacket.pyramid.directions.unitSpherical[0], pyramidPacket.pyramid.directions.unitSpherical[1]),
                        new Spherical(pyramidPacket.pyramid.directions.unitSpherical[2], pyramidPacket.pyramid.directions.unitSpherical[3])]);
        expect(dynamicObject.pyramid.radius.getValue(validTime)).toEqual(pyramidPacket.pyramid.radius);
        expect(dynamicObject.pyramid.show.getValue(validTime)).toEqual(pyramidPacket.pyramid.show);
        expect(dynamicObject.pyramid.showIntersection.getValue(validTime)).toEqual(pyramidPacket.pyramid.showIntersection);
        expect(dynamicObject.pyramid.material.getValue(validTime).color).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.pyramid.intersectionColor.getValue(validTime)).toEqual(new Color(0.5, 0.5, 0.5, 0.5));
        expect(dynamicObject.pyramid.intersectionWidth.getValue(validTime)).toEqual(8.0);

        expect(dynamicObject.pyramid.directions.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.radius.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.show.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.showIntersection.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.material.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.intersectionColor.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.pyramid.intersectionWidth.getValue(invalidTime)).toBeUndefined();
    });

    it('CZML adds data for infinite vector.', function() {
        var direction = Cartesian3.normalize(new Cartesian3(1, 2, 3));
        var vectorPacket = {
            vector : {
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                length : 10.0,
                direction : {
                    unitCartesian : [direction.x, direction.y, direction.z]
                },
                show : true
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(vectorPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.vector).toBeDefined();
        expect(dynamicObject.vector.color.getValue(Iso8601.MINIMUM_VALUE)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.vector.width.getValue(Iso8601.MINIMUM_VALUE)).toEqual(vectorPacket.vector.width);
        expect(dynamicObject.vector.direction.getValue(Iso8601.MINIMUM_VALUE)).toEqual(direction);
        expect(dynamicObject.vector.length.getValue(Iso8601.MINIMUM_VALUE)).toEqual(vectorPacket.vector.length);
        expect(dynamicObject.vector.show.getValue(Iso8601.MINIMUM_VALUE)).toEqual(true);
    });

    it('CZML adds data for constrained vector.', function() {
        var direction = Cartesian3.normalize(new Cartesian3(1, 2, 3));
        var vectorPacket = {
            vector : {
                interval : '2000-01-01/2001-01-01',
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                },
                width : 1.0,
                length : 10.0,
                direction : {
                    unitCartesian : [direction.x, direction.y, direction.z]
                },
                show : true
            }
        };

        var validTime = TimeInterval.fromIso8601(vectorPacket.vector.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dataSource = new CzmlDataSource();
        dataSource.load(vectorPacket);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];

        expect(dynamicObject.vector).toBeDefined();
        expect(dynamicObject.vector.color.getValue(validTime)).toEqual(new Color(0.1, 0.1, 0.1, 0.1));
        expect(dynamicObject.vector.width.getValue(validTime)).toEqual(vectorPacket.vector.width);
        expect(dynamicObject.vector.direction.getValue(validTime)).toEqual(direction);
        expect(dynamicObject.vector.length.getValue(validTime)).toEqual(vectorPacket.vector.length);
        expect(dynamicObject.vector.show.getValue(validTime)).toEqual(true);

        expect(dynamicObject.vector.color.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.width.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.direction.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.length.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.vector.show.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzml deletes an existing object.', function() {
        var dataSource = new CzmlDataSource();
        dataSource.load(staticCzml);
        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        dataSource.load(czmlDelete);
        expect(objects.length).toEqual(0);
    });

    it('Processes parent property.', function() {
        var parentChildCzml = [{
            'id' : 'parent'
        }, {
            'id' : 'child',
            'parent' : 'parent'
        }];

        var dataSource = new CzmlDataSource();
        dataSource.load(parentChildCzml);
        var objects = dataSource.getDynamicObjectCollection();

        var parent = objects.getById('parent');
        expect(parent.parent).toBeUndefined();

        var child = objects.getById('child');
        expect(child.parent).toBe(parent);
    });

    it('Processes parent property out of order.', function() {
        var parentChildCzml = [{
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
        var objects = dataSource.getDynamicObjectCollection();

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
        CzmlDataSource.processPacketData(JulianDate, object, 'simpleDate', date.toIso8601());

        expect(object.simpleDate).toBeDefined();
        expect(object.simpleDate.getValue()).toEqual(date);

        CzmlDataSource.processPacketData(JulianDate, object, 'objDate', {
            date : date.toIso8601()
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
            point : {
                show : true,
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                }
            }
        }, {
            point : {
                show : true,
                color : {
                    rgbaf : [0.1, 0.1, 0.1, 0.1]
                }
            }
        }];

        var spy = jasmine.createSpy('changedEvent');

        var dataSource = new CzmlDataSource();
        dataSource.getDynamicObjectCollection().collectionChanged.addEventListener(spy);
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
                        rowCount : 36,
                        rowThickness : 1,
                        columnCount : 9,
                        columnThickness : 1
                    }
                }]
            }
        };

        var dataSource = new CzmlDataSource();
        dataSource.load(packet);
        var dynamicObject = dataSource.getDynamicObjectCollection().getObjects()[0];
        expect(dynamicObject.polygon.material.getType(solid)).toBe('Color');
        expect(dynamicObject.polygon.material.getType(grid1)).toBe('Grid');
        expect(dynamicObject.polygon.material.getType(grid2)).toBe('Grid');
        expect(dynamicObject.polygon.material.getType(before)).toBeUndefined();
        expect(dynamicObject.polygon.material.getType(after)).toBeUndefined();

    });
});
