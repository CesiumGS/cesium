/*global defineSuite*/
defineSuite([
        'Core/ScreenSpaceEventHandler',
        'Core/Cartesian2',
        'Core/combine',
        'Core/defined',
        'Core/KeyboardEventModifier',
        'Core/ScreenSpaceEventType',
        'Specs/DomEventSimulator'
    ], function(
        ScreenSpaceEventHandler,
        Cartesian2,
        combine,
        defined,
        KeyboardEventModifier,
        ScreenSpaceEventType,
        DomEventSimulator) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var element;
    var handler;

    beforeEach(function() {
        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '0';
        element.style.left = '0';
        document.body.appendChild(element);
        element.disableRootEvents = true;
        handler = new ScreenSpaceEventHandler(element);
    });

    afterEach(function() {
        document.body.removeChild(element);
        handler = !handler.isDestroyed() && handler.destroy();
    });

    describe('setInputAction', function() {
        it('throws if action is undefined', function() {
            expect(function() {
                handler.setInputAction();
            }).toThrowDeveloperError();
        });

        it('throws if type is undefined', function() {
            expect(function() {
                handler.setInputAction(function() {
                });
            }).toThrowDeveloperError();
        });
    });

    describe('getInputAction', function() {
        it('throws if type is undefined', function() {
            expect(function() {
                handler.getInputAction();
            }).toThrowDeveloperError();
        });
    });

    describe('removeInputAction', function() {
        it('throws if type is undefined', function() {
            expect(function() {
                handler.removeInputAction();
            }).toThrowDeveloperError();
        });
    });

    var MouseButton = {
        LEFT : 0,
        MIDDLE : 1,
        RIGHT : 2
    };

    function keyForValue(obj, val) {
        for ( var key in obj) {
            if (obj[key] === val) {
                return key;
            }
        }
    }

    function createMouseSpec(specFunction, eventType, button, modifier) {
        var specName = keyForValue(ScreenSpaceEventType, eventType) + ' action';
        if (defined(modifier)) {
            specName += ' with ' + keyForValue(KeyboardEventModifier, modifier) + ' modifier';
        }
        it(specName, function() {
            var eventOptions = {
                button : button,
                ctrlKey : modifier === KeyboardEventModifier.CTRL,
                altKey : modifier === KeyboardEventModifier.ALT,
                shiftKey : modifier === KeyboardEventModifier.SHIFT
            };
            specFunction(eventType, modifier, eventOptions);
        });
    }

    function createAllMouseSpecCombinations(specFunction, possibleButtons, possibleModifiers, possibleEventTypes) {
        for (var i = 0; i < possibleButtons.length; ++i) {
            var eventType = possibleEventTypes[i];
            var button = possibleButtons[i];
            for (var j = 0; j < possibleModifiers.length; ++j) {
                var modifier = possibleModifiers[j];
                createMouseSpec(specFunction, eventType, button, modifier);
            }
        }
    }

    describe('handles mouse down', function() {
        function testMouseDownEvent(eventType, modifier, eventOptions) {
            var action = jasmine.createSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            function simulateInput() {
                DomEventSimulator.fireMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.length).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            // should not be fired after removal
            action.reset();

            handler.removeInputAction(eventType, modifier);

            simulateInput();

            expect(action).not.toHaveBeenCalled();
        }

        var possibleButtons = [MouseButton.LEFT, MouseButton.MIDDLE, MouseButton.RIGHT];
        var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
        var possibleEventTypes = [ScreenSpaceEventType.LEFT_DOWN, ScreenSpaceEventType.MIDDLE_DOWN, ScreenSpaceEventType.RIGHT_DOWN];
        createAllMouseSpecCombinations(testMouseDownEvent, possibleButtons, possibleModifiers, possibleEventTypes);
    });

    describe('handles mouse up', function() {
        function testMouseUpEvent(eventType, modifier, eventOptions) {
            var action = jasmine.createSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            // down, then up
            function simulateInput() {
                DomEventSimulator.fireMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                DomEventSimulator.fireMouseUp(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.length).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            action.reset();

            // down, move, then up
            function simulateInput2() {
                DomEventSimulator.fireMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                DomEventSimulator.fireMouseMove(element, combine({
                    clientX : 10,
                    clientY : 11
                }, eventOptions));
                DomEventSimulator.fireMouseUp(element, combine({
                    clientX : 10,
                    clientY : 11
                }, eventOptions));
            }

            simulateInput2();

            expect(action.calls.length).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(10, 11)
            });

            // should not be fired after removal
            action.reset();

            handler.removeInputAction(eventType, modifier);

            simulateInput();
            simulateInput2();

            expect(action).not.toHaveBeenCalled();
        }

        var possibleButtons = [MouseButton.LEFT, MouseButton.MIDDLE, MouseButton.RIGHT];
        var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
        var possibleEventTypes = [ScreenSpaceEventType.LEFT_UP, ScreenSpaceEventType.MIDDLE_UP, ScreenSpaceEventType.RIGHT_UP];
        createAllMouseSpecCombinations(testMouseUpEvent, possibleButtons, possibleModifiers, possibleEventTypes);
    });

    describe('handles mouse click', function() {
        function testMouseClickEvent(eventType, modifier, eventOptions) {
            var action = jasmine.createSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            // down, then up
            function simulateInput() {
                DomEventSimulator.fireMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                DomEventSimulator.fireMouseUp(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.length).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            // mouse clicks are not fired if the mouse moves too far away from the down position
            action.reset();
            DomEventSimulator.fireMouseDown(element, combine({
                clientX : 1,
                clientY : 2
            }, eventOptions));
            DomEventSimulator.fireMouseUp(element, combine({
                clientX : 10,
                clientY : 11
            }, eventOptions));

            expect(action).not.toHaveBeenCalled();

            // should not be fired after removal
            action.reset();

            handler.removeInputAction(eventType, modifier);

            simulateInput();

            expect(action).not.toHaveBeenCalled();
        }

        var possibleButtons = [MouseButton.LEFT, MouseButton.MIDDLE, MouseButton.RIGHT];
        var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
        var possibleEventTypes = [ScreenSpaceEventType.LEFT_CLICK, ScreenSpaceEventType.MIDDLE_CLICK, ScreenSpaceEventType.RIGHT_CLICK];
        createAllMouseSpecCombinations(testMouseClickEvent, possibleButtons, possibleModifiers, possibleEventTypes);
    });

    describe('handles mouse double click', function() {
        function testMouseDoubleClickEvent(eventType, modifier, eventOptions) {
            var action = jasmine.createSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            function simulateInput() {
                DomEventSimulator.fireDoubleClick(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.length).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            // should not be fired after removal
            action.reset();

            handler.removeInputAction(eventType, modifier);

            simulateInput();

            expect(action).not.toHaveBeenCalled();
        }

        var possibleButtons = [MouseButton.LEFT, MouseButton.MIDDLE, MouseButton.RIGHT];
        var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
        var possibleEventTypes = [ScreenSpaceEventType.LEFT_DOUBLE_CLICK, ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, ScreenSpaceEventType.RIGHT_DOUBLE_CLICK];
        createAllMouseSpecCombinations(testMouseDoubleClickEvent, possibleButtons, possibleModifiers, possibleEventTypes);
    });

    describe('handles mouse move', function() {
        function testMouseMoveEvent(eventType, modifier, eventOptions) {
            var action = jasmine.createSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            function simulateInput() {
                DomEventSimulator.fireMouseMove(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                DomEventSimulator.fireMouseMove(element, combine({
                    clientX : 2,
                    clientY : 3
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.length).toEqual(2);
            expect(action).toHaveBeenCalledWith({
                startPosition : new Cartesian2(1, 2),
                endPosition : new Cartesian2(2, 3)
            });

            // should not be fired after removal
            action.reset();

            handler.removeInputAction(eventType, modifier);

            simulateInput();

            expect(action).not.toHaveBeenCalled();
        }

        var possibleButtons = [undefined];
        var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
        var possibleEventTypes = [ScreenSpaceEventType.MOUSE_MOVE];
        createAllMouseSpecCombinations(testMouseMoveEvent, possibleButtons, possibleModifiers, possibleEventTypes);
    });

    describe('handles mouse wheel', function() {

        if ('onwheel' in document) {

            describe('using standard wheel event', function() {
                function testWheelEvent(eventType, modifier, eventOptions) {
                    var action = jasmine.createSpy('action');
                    handler.setInputAction(action, eventType, modifier);

                    expect(handler.getInputAction(eventType, modifier)).toEqual(action);

                    function simulateInput() {
                        DomEventSimulator.fireWheel(element, combine({
                            deltaY : 120
                        }, eventOptions));
                    }

                    simulateInput();

                    expect(action.calls.length).toEqual(1);

                    // NOTE: currently the action is passed the value of 'wheelDelta' which is inverted from the standard 'deltaY'
                    expect(action).toHaveBeenCalledWith(-120);

                    // should not be fired after removal
                    action.reset();

                    handler.removeInputAction(eventType, modifier);

                    simulateInput();

                    expect(action).not.toHaveBeenCalled();
                }

                var possibleButtons = [undefined];
                var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
                var possibleEventTypes = [ScreenSpaceEventType.WHEEL];
                createAllMouseSpecCombinations(testWheelEvent, possibleButtons, possibleModifiers, possibleEventTypes);
            });

        } else if (defined(document.onmousewheel)) {

            describe('using legacy mousewheel event', function() {
                function testMouseWheelEvent(eventType, modifier, eventOptions) {
                    var action = jasmine.createSpy('action');
                    handler.setInputAction(action, eventType, modifier);

                    expect(handler.getInputAction(eventType, modifier)).toEqual(action);

                    function simulateInput() {
                        DomEventSimulator.fireMouseWheel(element, combine({
                            wheelDelta : -120
                        }, eventOptions));
                    }

                    simulateInput();

                    expect(action.calls.length).toEqual(1);
                    expect(action).toHaveBeenCalledWith(-120);

                    // should not be fired after removal
                    action.reset();

                    handler.removeInputAction(eventType, modifier);

                    simulateInput();

                    expect(action).not.toHaveBeenCalled();
                }

                var possibleButtons = [undefined];
                var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
                var possibleEventTypes = [ScreenSpaceEventType.WHEEL];
                createAllMouseSpecCombinations(testMouseWheelEvent, possibleButtons, possibleModifiers, possibleEventTypes);
            });

        }
    });

    it('handles touch start', function() {
        var eventType = ScreenSpaceEventType.LEFT_DOWN;

        var action = jasmine.createSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        function simulateInput() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2
                }]
            });
        }

        simulateInput();

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        // should not be fired after removal
        action.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch move', function() {
        var eventType = ScreenSpaceEventType.MOUSE_MOVE;

        var action = jasmine.createSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then move
        function simulateInput() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2
                }]
            });
            DomEventSimulator.fireTouchMove(element, {
                touches : [{
                    clientX : 10,
                    clientY : 11
                }]
            });
        }

        simulateInput();

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            startPosition : new Cartesian2(1, 2),
            endPosition : new Cartesian2(10, 11)
        });

        // should not be fired after removal
        action.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch end', function() {
        var eventType = ScreenSpaceEventType.LEFT_UP;

        var action = jasmine.createSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2
                }]
            });
            DomEventSimulator.fireTouchEnd(element, {
                changedTouches : [{
                    clientX : 1,
                    clientY : 2
                }]
            });
        }

        simulateInput();

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        action.reset();

        // start, move, then end
        function simulateInput2() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2
                }]
            });
            DomEventSimulator.fireTouchMove(element, {
                touches : [{
                    clientX : 10,
                    clientY : 11
                }]
            });
            DomEventSimulator.fireTouchEnd(element, {
                changedTouches : [{
                    clientX : 10,
                    clientY : 11
                }]
            });
        }

        simulateInput2();

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(10, 11)
        });

        // should not be fired after removal
        action.reset();

        handler.removeInputAction(eventType);

        simulateInput();
        simulateInput2();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch pinch start', function() {
        var eventType = ScreenSpaceEventType.PINCH_START;

        var action = jasmine.createSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // touch 1, then touch 2
        function simulateInput() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2,
                    identifier : 0
                }]
            });
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2,
                    identifier : 0
                }, {
                    clientX : 3,
                    clientY : 4,
                    identifier : 1
                }]
            });
        }

        simulateInput();

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position1 : new Cartesian2(1, 2),
            position2 : new Cartesian2(3, 4)
        });

        // should not be fired after removal
        action.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch pinch move', function() {
        var eventType = ScreenSpaceEventType.PINCH_MOVE;

        var action = jasmine.createSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // touch 1, then touch 2, then move
        function simulateInput() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2,
                    identifier : 0
                }]
            });
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2,
                    identifier : 0
                }, {
                    clientX : 4,
                    clientY : 3,
                    identifier : 1
                }]
            });
            DomEventSimulator.fireTouchMove(element, {
                touches : [{
                    clientX : 10,
                    clientY : 11,
                    identifier : 0
                }, {
                    clientX : 21,
                    clientY : 20,
                    identifier : 1
                }]
            });
        }

        simulateInput();

        // original delta X: 3
        // original delta Y: 1
        // new delta X: 11
        // new delta Y: 9

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            distance : {
                startPosition : new Cartesian2(0, Math.sqrt(3 * 3 + 1 * 1) * 0.25),
                endPosition : new Cartesian2(0, Math.sqrt(11 * 11 + 9 * 9) * 0.25)
            },
            angleAndHeight : {
                startPosition : new Cartesian2(Math.atan2(1, 3), (3 + 2) * 0.125),
                endPosition : new Cartesian2(Math.atan2(9, 11), (11 + 20) * 0.125)
            }
        });

        // should not be fired after removal
        action.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch click', function() {
        var eventType = ScreenSpaceEventType.LEFT_CLICK;

        var action = jasmine.createSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput() {
            DomEventSimulator.fireTouchStart(element, {
                touches : [{
                    clientX : 1,
                    clientY : 2,
                    identifier : 0
                }]
            });
            DomEventSimulator.fireTouchEnd(element, {
                changedTouches : [{
                    clientX : 1,
                    clientY : 2,
                    identifier : 0
                }]
            });
        }

        simulateInput();

        expect(action.calls.length).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        // should not be fired after removal
        action.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('sets isDestroyed when destroyed', function() {
        expect(handler.isDestroyed()).toEqual(false);
        handler.destroy();
        expect(handler.isDestroyed()).toEqual(true);
    });

    it('unregisters event listeners when destroyed', function() {
        handler = handler.destroy();

        spyOn(element, 'addEventListener').andCallThrough();
        spyOn(element, 'removeEventListener').andCallThrough();

        handler = new ScreenSpaceEventHandler(element);

        expect(element.addEventListener.callCount).not.toEqual(0);
        expect(element.removeEventListener.callCount).toEqual(0);

        handler.destroy();

        expect(element.removeEventListener.callCount).toEqual(element.addEventListener.callCount);
    });
});
