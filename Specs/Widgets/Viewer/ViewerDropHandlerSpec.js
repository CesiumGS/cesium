/*global defineSuite*/
defineSuite([
         'Widgets/Viewer/ViewerDropHandler',
         'Core/TimeInterval',
         'Specs/EventHelper',
         'Widgets/Viewer/Viewer'
     ], function(
         ViewerDropHandler,
         TimeInterval,
         EventHelper,
         Viewer) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    beforeEach(function() {
        container = document.createElement('span');
        container.id = 'container';
        container.style.display = 'none';
        document.body.appendChild(container);

        //Impersonate FileReader for drag and drop tests
        var fakeFileReader = jasmine.createSpyObj('FileReader', ['readAsText']);
        fakeFileReader.readAsText = function(file) {
            if (typeof file.czmlString !== 'undefined') {
                this.onload({
                    target : {
                        result : file.czmlString
                    }
                });
            } else {
                this.onerror({
                    target : {
                        error : file.errorMessage
                    }
                });
            }
        };
        spyOn(window, 'FileReader').andReturn(fakeFileReader);
    });

    afterEach(function() {
        document.body.removeChild(container);
    });

    it('constructor sets default values', function() {
        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);
        expect(dropHandler.dropTarget).toBe(viewer.container);
        expect(dropHandler.enabled).toBe(true);
        expect(dropHandler.viewer).toBe(viewer);
        expect(dropHandler.clearOnDrop).toBe(true);
        viewer.destroy();
        expect(dropHandler.isDestroyed()).toEqual(false);
        dropHandler.destroy();
        expect(dropHandler.isDestroyed()).toEqual(true);
    });

    it('constructor sets option values', function() {
        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer, {
            dropTarget : document.body,
            clearOnDrop : false
        });
        expect(dropHandler.dropTarget).toBe(document.body);
        expect(dropHandler.enabled).toBe(true);
        expect(dropHandler.viewer).toBe(viewer);
        expect(dropHandler.clearOnDrop).toBe(false);
        viewer.destroy();
        dropHandler.destroy();
    });

    it('constructor works with dropTarget id string', function() {
        var viewer = new Viewer(document.body);
        var dropHandler = new ViewerDropHandler(viewer, {
            dropTarget : 'container'
        });
        expect(dropHandler.dropTarget).toBe(container);
        viewer.destroy();
        dropHandler.destroy();
    });

    var czml1 = {
        id : 'test',
        availability : '2000-01-01/2001-01-01',
        billboard : {
            show : true
        }
    };

    var czml2 = {
        id : 'test2',
        availability : '2000-01-02/2001-01-02',
        billboard : {
            show : true
        }
    };

    it('handleDrop processes drop event', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : JSON.stringify(czml1)
                }]
            },
            stopPropagation : function() {
            },
            preventDefault : function() {
            }
        };

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);

        EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);

        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 1;
            if (result) {
                var dataSource = viewer.dataSources.get(0);
                var interval = TimeInterval.fromIso8601(czml1.availability);
                expect(dataSource.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(dataSource.getClock().startTime).toEqual(interval.start);
                expect(dataSource.getClock().stopTime).toEqual(interval.stop);
            }
            return result;
        });

        runs(function() {
            viewer.destroy();
            dropHandler.destroy();
        });
    });

    it('handleDrop processes drop event with multiple files', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : JSON.stringify(czml1)
                }, {
                    name : 'czml2',
                    czmlString : JSON.stringify(czml2)
                }]
            },
            stopPropagation : function() {
            },
            preventDefault : function() {
            }
        };

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);

        EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);

        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 2;
            if (result) {
                var source1 = viewer.dataSources.get(0);
                var source2 = viewer.dataSources.get(1);
                expect(source1.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(source2.getDynamicObjectCollection().getObject('test2')).toBeDefined();
                //Interval of first file should be used.
                var interval = TimeInterval.fromIso8601(czml1.availability);
                expect(source1.getClock().startTime).toEqual(interval.start);
                expect(source1.getClock().stopTime).toEqual(interval.stop);
            }
            return result;
        });

        runs(function() {
            viewer.destroy();
            dropHandler.destroy();
        });
    });

    it('handleDrop obeys clearOnDrop', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : JSON.stringify(czml1)
                }, {
                    name : 'czml2',
                    czmlString : JSON.stringify(czml2)
                }]
            },
            stopPropagation : function() {
            },
            preventDefault : function() {
            }
        };

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);

        EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);

        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 2;
            if (result) {
                var source1 = viewer.dataSources.get(0);
                var source2 = viewer.dataSources.get(1);
                expect(source1.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(source2.getDynamicObjectCollection().getObject('test2')).toBeDefined();
                //Interval of first file should be used.
                var interval = TimeInterval.fromIso8601(czml1.availability);
                expect(source1.getClock().startTime).toEqual(interval.start);
                expect(source1.getClock().stopTime).toEqual(interval.stop);
            }
            return result;
        });

        runs(function() {
            dropHandler.clearOnDrop = false;
            EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);
        });

        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 4;
            if (result) {
                var source1 = viewer.dataSources.get(0);
                var source2 = viewer.dataSources.get(1);
                var source3 = viewer.dataSources.get(2);
                var source4 = viewer.dataSources.get(3);

                expect(source1.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(source2.getDynamicObjectCollection().getObject('test2')).toBeDefined();
                expect(source3.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(source4.getDynamicObjectCollection().getObject('test2')).toBeDefined();
            }
            return result;
        });

        runs(function() {
            dropHandler.clearOnDrop = true;
            EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);
        });

        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 2;
            if (result) {
                var source1 = viewer.dataSources.get(0);
                var source2 = viewer.dataSources.get(1);
                expect(source1.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(source2.getDynamicObjectCollection().getObject('test2')).toBeDefined();
                //Interval of first file should be used.
                var interval = TimeInterval.fromIso8601(czml1.availability);
                expect(source1.getClock().startTime).toEqual(interval.start);
                expect(source1.getClock().stopTime).toEqual(interval.stop);
            }
            return result;
        });

        runs(function() {
            viewer.destroy();
            dropHandler.destroy();
        });
    });

    it('onError is raised on exception', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : 'bad JSON'
                }]
            },
            stopPropagation : function() {
            },
            preventDefault : function() {
            }
        };

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);

        var called = false;
        var callback = function(dropHandlerArg, source, error) {
            expect(dropHandlerArg).toBe(dropHandler);
            expect(source).toEqual('czml1');
            expect(error).toBeInstanceOf(SyntaxError);
            called = true;
        };
        dropHandler.onError.addEventListener(callback);
        EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);

        waitsFor(function() {
            return called;
        });

        runs(function() {
            dropHandler.onError.removeEventListener(callback);
            viewer.destroy();
            dropHandler.destroy();
        });
    });

    it('onError is raised FileReader error', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    errorMessage : 'bad JSON'
                }]
            },
            stopPropagation : function() {
            },
            preventDefault : function() {
            }
        };

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);

        var called = false;
        var callback = function(dropHandlerArg, source, error) {
            expect(dropHandlerArg).toBe(dropHandler);
            expect(source).toEqual(mockEvent.dataTransfer.files[0].name);
            expect(error).toEqual(mockEvent.dataTransfer.files[0].errorMessage);
            called = true;
        };
        dropHandler.onError.addEventListener(callback);
        EventHelper.fireMockEvent(dropHandler._handleDrop, mockEvent);

        waitsFor(function() {
            return called;
        });

        runs(function() {
            dropHandler.onError.removeEventListener(callback);
            viewer.destroy();
            dropHandler.destroy();
        });
    });

    var MockContainer = function() {
        var events = {};
        this.events = events;

        this.addEventListener = function(name, func, bubble) {
            events[name] = {
                func : func,
                bubble : bubble
            };
        };

        this.removeEventListener = function(name, func, bubble) {
            var subscribed = events[name];
            expect(subscribed.func).toBe(func);
            expect(subscribed.bubble).toEqual(bubble);
            delete events[name];
        };
    };

    it('enable/disable subscribes to provided dropTarget.', function() {
        var dropTarget = new MockContainer();

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer, {
            dropTarget : dropTarget
        });

        expect(dropTarget.events.drop).toBeDefined();
        expect(dropTarget.events.dragenter).toBeDefined();
        expect(dropTarget.events.dragover).toBeDefined();
        expect(dropTarget.events.dragexit).toBeDefined();

        dropHandler.enabled = false;
        expect(dropTarget.events.drop).toBeUndefined();
        expect(dropTarget.events.dragenter).toBeUndefined();
        expect(dropTarget.events.dragover).toBeUndefined();
        expect(dropTarget.events.dragexit).toBeUndefined();

        dropHandler.enabled = true;
        expect(dropTarget.events.drop).toBeDefined();
        expect(dropTarget.events.dragenter).toBeDefined();
        expect(dropTarget.events.dragover).toBeDefined();
        expect(dropTarget.events.dragexit).toBeDefined();

        viewer.destroy();
        dropHandler.destroy();
    });

    it('can set new dropTarget.', function() {
        var dropTarget1 = new MockContainer();
        var dropTarget2 = new MockContainer();

        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer, {
            dropTarget : dropTarget1
        });

        expect(dropTarget1.events.drop).toBeDefined();
        expect(dropTarget1.events.dragenter).toBeDefined();
        expect(dropTarget1.events.dragover).toBeDefined();
        expect(dropTarget1.events.dragexit).toBeDefined();

        dropHandler.dropTarget = dropTarget2;
        expect(dropTarget1.events.drop).toBeUndefined();
        expect(dropTarget1.events.dragenter).toBeUndefined();
        expect(dropTarget1.events.dragover).toBeUndefined();
        expect(dropTarget1.events.dragexit).toBeUndefined();

        expect(dropTarget2.events.drop).toBeDefined();
        expect(dropTarget2.events.dragenter).toBeDefined();
        expect(dropTarget2.events.dragover).toBeDefined();
        expect(dropTarget2.events.dragexit).toBeDefined();

        viewer.destroy();
        dropHandler.destroy();
    });

    it('constructor throws with undefined viewer', function() {
        expect(function() {
            return new ViewerDropHandler(undefined);
        }).toThrow();
    });

    it('constructor throws with non-existant string container', function() {
        var viewer = new Viewer(container);
        expect(function() {
            return new ViewerDropHandler(viewer, {
                dropTarget : 'doesNotExist'
            });
        }).toThrow();
        viewer.destroy();
    });

    it('setting dropTarget to undefined throws exception', function() {
        var viewer = new Viewer(container);
        var dropHandler = new ViewerDropHandler(viewer);
        expect(function() {
            dropHandler.dropTarget = undefined;
        }).toThrow();
        viewer.destroy();
        dropHandler.destroy();
    });
});