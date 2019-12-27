import { Cartesian2 } from '../../Source/Cesium.js';
import { clone } from '../../Source/Cesium.js';
import { combine } from '../../Source/Cesium.js';
import { defined } from '../../Source/Cesium.js';
import { FeatureDetection } from '../../Source/Cesium.js';
import { KeyboardEventModifier } from '../../Source/Cesium.js';
import { ScreenSpaceEventHandler } from '../../Source/Cesium.js';
import { ScreenSpaceEventType } from '../../Source/Cesium.js';
import DomEventSimulator from '../DomEventSimulator.js';

describe('Core/ScreenSpaceEventHandler', function() {

    var usePointerEvents;
    var element;
    var handler;

    function createCloningSpy(name) {
        var spy = jasmine.createSpy(name);

        var cloningSpy = function() {
            // deep clone arguments so they are captured correctly by the spy
            var args = [].slice.apply(arguments).map(function(arg) {
                return clone(arg, true);
            });

            spy.apply(this, args);
        };

        function createPropertyDescriptor(prop) {
            return {
                get : function() {
                    return spy[prop];
                },
                set : function(value) {
                    spy[prop] = value;
                }
            };
        }

        for ( var prop in spy) {
            if (spy.hasOwnProperty(prop)) {
                Object.defineProperty(cloningSpy, prop, createPropertyDescriptor(prop));
            }
        }

        return cloningSpy;
    }

    var eventsToStop = 'pointerdown pointerup pointermove pointercancel mousedown mouseup mousemove touchstart touchend touchmove touchcancel dblclick wheel mousewheel DOMMouseScroll'.split(' ');

    function stop(event) {
        event.stopPropagation();
        event.preventDefault();
    }

    beforeAll(function(){
        usePointerEvents = FeatureDetection.supportsPointerEvents();
    });

    beforeEach(function() {
        // ignore events that bubble up to the document.
        // this prevents triggering the browser's "middle click to scroll" behavior
        eventsToStop.forEach(function(e) {
            document.addEventListener(e, stop, false);
        });

        element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = '0';
        element.style.left = '0';
        document.body.appendChild(element);
        element.disableRootEvents = true;

        if (usePointerEvents) {
            spyOn(element, 'setPointerCapture');
        }

        handler = new ScreenSpaceEventHandler(element);
    });

    afterEach(function() {
        document.body.removeChild(element);
        handler = !handler.isDestroyed() && handler.destroy();

        eventsToStop.forEach(function(e) {
            document.removeEventListener(e, stop, false);
        });
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

    function simulateMouseDown(element, options) {
        if (usePointerEvents) {
            DomEventSimulator.firePointerDown(element, combine(options, {
                pointerType : 'mouse'
            }));
        } else {
            DomEventSimulator.fireMouseDown(element, options);
        }
    }

    function simulateMouseUp(element, options) {
        if (usePointerEvents) {
            DomEventSimulator.firePointerUp(element, combine(options, {
                pointerType : 'mouse'
            }));
        } else {
            DomEventSimulator.fireMouseUp(element, options);
        }
    }

    function simulateMouseMove(element, options) {
        if (usePointerEvents) {
            DomEventSimulator.firePointerMove(element, combine(options, {
                pointerType : 'mouse'
            }));
        } else {
            DomEventSimulator.fireMouseMove(element, options);
        }
    }

    describe('handles mouse down', function() {
        function testMouseDownEvent(eventType, modifier, eventOptions) {
            var action = createCloningSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            function simulateInput() {
                simulateMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.count()).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            // should not be fired after removal
            action.calls.reset();

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
            var action = createCloningSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            // down, then up
            function simulateInput() {
                simulateMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                simulateMouseUp(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.count()).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            action.calls.reset();

            // down, move, then up
            function simulateInput2() {
                simulateMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                simulateMouseMove(element, combine({
                    clientX : 10,
                    clientY : 11
                }, eventOptions));
                simulateMouseUp(element, combine({
                    clientX : 10,
                    clientY : 11
                }, eventOptions));
            }

            simulateInput2();

            expect(action.calls.count()).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(10, 11)
            });

            // should not be fired after removal
            action.calls.reset();

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
            var action = createCloningSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            // down, then up
            function simulateInput() {
                simulateMouseDown(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                simulateMouseUp(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.count()).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            // mouse clicks are not fired if the mouse moves too far away from the down position
            action.calls.reset();
            simulateMouseDown(element, combine({
                clientX : 1,
                clientY : 2
            }, eventOptions));
            simulateMouseUp(element, combine({
                clientX : 10,
                clientY : 11
            }, eventOptions));

            expect(action).not.toHaveBeenCalled();

            // should not be fired after removal
            action.calls.reset();

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
            var action = createCloningSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            function simulateInput() {
                DomEventSimulator.fireDoubleClick(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.count()).toEqual(1);
            expect(action).toHaveBeenCalledWith({
                position : new Cartesian2(1, 2)
            });

            // should not be fired after removal
            action.calls.reset();

            handler.removeInputAction(eventType, modifier);

            simulateInput();

            expect(action).not.toHaveBeenCalled();
        }

        var possibleButtons = [MouseButton.LEFT];
        var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
        var possibleEventTypes = [ScreenSpaceEventType.LEFT_DOUBLE_CLICK];
        createAllMouseSpecCombinations(testMouseDoubleClickEvent, possibleButtons, possibleModifiers, possibleEventTypes);
    });

    describe('handles mouse move', function() {
        function testMouseMoveEvent(eventType, modifier, eventOptions) {
            var action = createCloningSpy('action');
            handler.setInputAction(action, eventType, modifier);

            expect(handler.getInputAction(eventType, modifier)).toEqual(action);

            function simulateInput() {
                simulateMouseMove(element, combine({
                    clientX : 1,
                    clientY : 2
                }, eventOptions));
                simulateMouseMove(element, combine({
                    clientX : 2,
                    clientY : 3
                }, eventOptions));
            }

            simulateInput();

            expect(action.calls.count()).toEqual(2);
            expect(action).toHaveBeenCalledWith({
                startPosition : new Cartesian2(1, 2),
                endPosition : new Cartesian2(2, 3)
            });

            // should not be fired after removal
            action.calls.reset();

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
                    var action = createCloningSpy('action');
                    handler.setInputAction(action, eventType, modifier);

                    expect(handler.getInputAction(eventType, modifier)).toEqual(action);

                    function simulateInput() {
                        DomEventSimulator.fireWheel(element, combine({
                            deltaY : 120
                        }, eventOptions));
                    }

                    simulateInput();

                    expect(action.calls.count()).toEqual(1);

                    // NOTE: currently the action is passed the value of 'wheelDelta' which is inverted from the standard 'deltaY'
                    expect(action).toHaveBeenCalledWith(-120);

                    // should not be fired after removal
                    action.calls.reset();

                    handler.removeInputAction(eventType, modifier);

                    simulateInput();

                    expect(action).not.toHaveBeenCalled();
                }

                var possibleButtons = [undefined];
                var possibleModifiers = [undefined, KeyboardEventModifier.SHIFT, KeyboardEventModifier.CTRL, KeyboardEventModifier.ALT];
                var possibleEventTypes = [ScreenSpaceEventType.WHEEL];
                createAllMouseSpecCombinations(testWheelEvent, possibleButtons, possibleModifiers, possibleEventTypes);
            });

        } else if (document.onmousewheel !== undefined) {

            describe('using legacy mousewheel event', function() {
                function testMouseWheelEvent(eventType, modifier, eventOptions) {
                    var action = createCloningSpy('action');
                    handler.setInputAction(action, eventType, modifier);

                    expect(handler.getInputAction(eventType, modifier)).toEqual(action);

                    function simulateInput() {
                        DomEventSimulator.fireMouseWheel(element, combine({
                            wheelDelta : -120
                        }, eventOptions));
                    }

                    simulateInput();

                    expect(action.calls.count()).toEqual(1);
                    expect(action).toHaveBeenCalledWith(-120);

                    // should not be fired after removal
                    action.calls.reset();

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

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        function simulateInput() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch move', function() {
        var eventType = ScreenSpaceEventType.MOUSE_MOVE;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then move
        function simulateInput() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchMovePosition = {
                clientX : 10,
                clientY : 11
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerMove(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchMovePosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchMove(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchMovePosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            startPosition : new Cartesian2(1, 2),
            endPosition : new Cartesian2(10, 11)
        });

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch end', function() {
        var eventType = ScreenSpaceEventType.LEFT_UP;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchEndPosition = {
                clientX : 1,
                clientY : 2
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerUp(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchEnd(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        action.calls.reset();

        // start, move, then end
        function simulateInput2() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchMovePosition = {
                clientX : 10,
                clientY : 11
            };
            var touchEndPosition = {
                clientX : 10,
                clientY : 11
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerMove(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchMovePosition));
                DomEventSimulator.firePointerUp(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchMove(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchMovePosition)]
                });
                DomEventSimulator.fireTouchEnd(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput2();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(10, 11)
        });

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();
        simulateInput2();

        expect(action).not.toHaveBeenCalled();
    });

    it('treats touch end as touch cancel', function() {
        var eventType = ScreenSpaceEventType.LEFT_UP;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchEndPosition = {
                clientX : 1,
                clientY : 2
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerCancel(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchCancel(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        action.calls.reset();

        // start, move, then end
        function simulateInput2() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchMovePosition = {
                clientX : 10,
                clientY : 11
            };
            var touchEndPosition = {
                clientX : 10,
                clientY : 11
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerMove(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchMovePosition));
                DomEventSimulator.firePointerCancel(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchMove(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchMovePosition)]
                });
                DomEventSimulator.fireTouchCancel(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput2();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(10, 11)
        });

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();
        simulateInput2();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch pinch start', function() {
        var eventType = ScreenSpaceEventType.PINCH_START;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // touch 1, then touch 2
        function simulateInput() {
            var touch1StartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touch2StartPosition = {
                clientX : 3,
                clientY : 4
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touch1StartPosition));
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 2
                }, touch2StartPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touch1StartPosition)]
                });
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touch1StartPosition), combine({
                        identifier : 1
                    }, touch2StartPosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position1 : new Cartesian2(1, 2),
            position2 : new Cartesian2(3, 4)
        });

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch pinch move', function() {
        var eventType = ScreenSpaceEventType.PINCH_MOVE;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // touch 1, then touch 2, then move
        function simulateInput() {
            var touch1StartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touch2StartPosition = {
                clientX : 4,
                clientY : 3
            };
            var touch1MovePosition = {
                clientX : 10,
                clientY : 11
            };
            var touch2MovePosition = {
                clientX : 21,
                clientY : 20
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touch1StartPosition));
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 2
                }, touch2StartPosition));
                DomEventSimulator.firePointerMove(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touch1MovePosition));
                DomEventSimulator.firePointerMove(element, combine({
                    pointerType : 'touch',
                    pointerId : 2
                }, touch2MovePosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touch1StartPosition)]
                });
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touch1StartPosition), combine({
                        identifier : 1
                    }, touch2StartPosition)]
                });
                DomEventSimulator.fireTouchMove(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touch1MovePosition), combine({
                        identifier : 1
                    }, touch2MovePosition)]
                });
            }
        }

        simulateInput();

        // original delta X: 3
        // original delta Y: 1
        // final delta X: 11
        // final delta Y: 9

        if (usePointerEvents) {
            // because every pointer event is separate, one touch moves, then the other.
            expect(action.calls.count()).toEqual(2);

            // intermediate delta X: -6
            // intermediate delta Y: -8
            expect(action).toHaveBeenCalledWith({
                distance : {
                    startPosition : new Cartesian2(0, Math.sqrt(3 * 3 + 1 * 1) * 0.25),
                    endPosition : new Cartesian2(0, Math.sqrt(-6 * -6 + -8 * -8) * 0.25)
                },
                angleAndHeight : {
                    startPosition : new Cartesian2(Math.atan2(1, 3), (3 + 2) * 0.125),
                    endPosition : new Cartesian2(Math.atan2(-8, -6), (3 + 11) * 0.125)
                }
            });
            expect(action).toHaveBeenCalledWith({
                distance : {
                    startPosition : new Cartesian2(0, Math.sqrt(-6 * -6 + -8 * -8) * 0.25),
                    endPosition : new Cartesian2(0, Math.sqrt(11 * 11 + 9 * 9) * 0.25)
                },
                angleAndHeight : {
                    startPosition : new Cartesian2(Math.atan2(-8, -6), (3 + 11) * 0.125),
                    endPosition : new Cartesian2(Math.atan2(9, 11), (11 + 20) * 0.125)
                }
            });
        } else {
            // touch events can move both touches simultaneously
            expect(action.calls.count()).toEqual(1);
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
        }

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch pinch release', function() {
        var leftDownEventType = ScreenSpaceEventType.LEFT_DOWN;
        var leftDownAction = createCloningSpy('LEFT_DOWN');
        handler.setInputAction(leftDownAction, leftDownEventType);

        var pinchStartEventType = ScreenSpaceEventType.PINCH_START;
        var pinchStartAction = createCloningSpy('PINCH_START');
        handler.setInputAction(pinchStartAction, pinchStartEventType);

        var pinchEndEventType = ScreenSpaceEventType.PINCH_END;
        var pinchEndAction = createCloningSpy('PINCH_END');
        handler.setInputAction(pinchEndAction, pinchEndEventType);

        var touch1Position = {
            clientX : 1,
            clientY : 2
        };
        var touch2Position = {
            clientX : 4,
            clientY : 3
        };
        if (usePointerEvents) {
            DomEventSimulator.firePointerDown(element, combine(
                {
                    pointerType : 'touch',
                    pointerId : 1
                },
                touch1Position
            ));
            DomEventSimulator.firePointerDown(element, combine(
                {
                    pointerType : 'touch',
                    pointerId : 2
                },
                touch2Position
            ));

            // Releasing one of two fingers should not trigger
            // PINCH_END or LEFT_DOWN:
            leftDownAction.calls.reset();
            DomEventSimulator.firePointerUp(element, combine(
                {
                    pointerType : 'touch',
                    pointerId : 1
                },
                touch1Position
            ));
            expect(pinchEndAction).not.toHaveBeenCalled();
            expect(leftDownAction).not.toHaveBeenCalled();
            pinchEndAction.calls.reset();

            // Putting another finger down should not trigger
            // PINCH_START:
            pinchStartAction.calls.reset();
            DomEventSimulator.firePointerDown(element, combine(
                {
                    pointerType : 'touch',
                    pointerId : 1
                },
                touch2Position
            ));
            expect(pinchStartAction).not.toHaveBeenCalled();

            // Releasing both fingers should trigger PINCH_END:
            DomEventSimulator.firePointerUp(element, combine(
                {
                    pointerType : 'touch',
                    pointerId : 1
                },
                touch2Position
            ));
            DomEventSimulator.firePointerUp(element, combine({
                pointerType : 'touch',
                pointerId : 2
            }, touch2Position));
            expect(pinchEndAction).toHaveBeenCalled();
        } else {
            DomEventSimulator.fireTouchStart(element, {
                changedTouches : [
                    combine({ identifier : 0 }, touch1Position),
                    combine({ identifier : 1 }, touch2Position)
                ]
            });
            leftDownAction.calls.reset();

            // Releasing one of two fingers should not trigger
            // PINCH_END or LEFT_DOWN:
            DomEventSimulator.fireTouchEnd(element, {
                changedTouches : [
                    combine({ identifier : 0 }, touch1Position)
                ]
            });

            expect(pinchEndAction).not.toHaveBeenCalled();
            expect(leftDownAction).not.toHaveBeenCalled();

            // Releasing both fingers should trigger PINCH_END:
            pinchEndAction.calls.reset();
            DomEventSimulator.fireTouchEnd(element, {
                changedTouches : [
                    combine({ identifier : 1 }, touch2Position)
                ]
            });
            expect(pinchEndAction).toHaveBeenCalled();
        }
    });

    it('handles touch click', function() {
        var eventType = ScreenSpaceEventType.LEFT_CLICK;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchEndPosition = {
                clientX : 1,
                clientY : 2
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerUp(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchEnd(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        // should not be fired after removal
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput();

        expect(action).not.toHaveBeenCalled();
    });

    it('handles touch and hold gesture', function() {
        jasmine.clock().install();

        var delay = ScreenSpaceEventHandler.touchHoldDelayMilliseconds;

        var eventType = ScreenSpaceEventType.RIGHT_CLICK;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput(timeout) {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchEndPosition = {
                clientX : 1,
                clientY : 2
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                jasmine.clock().tick(timeout);
                DomEventSimulator.firePointerUp(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                jasmine.clock().tick(timeout);
                DomEventSimulator.fireTouchEnd(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput(delay + 1);

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        // Should not be fired if hold delay is less than touchHoldDelayMilliseconds.
        action.calls.reset();

        simulateInput(delay - 1);

        expect(action).not.toHaveBeenCalled();

        // Should not be fired after removal.
        action.calls.reset();

        handler.removeInputAction(eventType);

        simulateInput(delay + 1);

        expect(action).not.toHaveBeenCalled();

        // Should not fire click action if touch and hold is triggered.
        eventType = ScreenSpaceEventType.LEFT_CLICK;

        handler.setInputAction(action, eventType);

        simulateInput(delay + 1);

        expect(action).not.toHaveBeenCalled();

        jasmine.clock().uninstall();
    });

    it('treats touch cancel as touch end for touch clicks', function() {
        var eventType = ScreenSpaceEventType.LEFT_CLICK;

        var action = createCloningSpy('action');
        handler.setInputAction(action, eventType);

        expect(handler.getInputAction(eventType)).toEqual(action);

        // start, then end
        function simulateInput() {
            var touchStartPosition = {
                clientX : 1,
                clientY : 2
            };
            var touchEndPosition = {
                clientX : 1,
                clientY : 2
            };

            if (usePointerEvents) {
                DomEventSimulator.firePointerDown(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchStartPosition));
                DomEventSimulator.firePointerCancel(element, combine({
                    pointerType : 'touch',
                    pointerId : 1
                }, touchEndPosition));
            } else {
                DomEventSimulator.fireTouchStart(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchStartPosition)]
                });
                DomEventSimulator.fireTouchCancel(element, {
                    changedTouches : [combine({
                        identifier : 0
                    }, touchEndPosition)]
                });
            }
        }

        simulateInput();

        expect(action.calls.count()).toEqual(1);
        expect(action).toHaveBeenCalledWith({
            position : new Cartesian2(1, 2)
        });

        // should not be fired after removal
        action.calls.reset();

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

        spyOn(element, 'addEventListener').and.callThrough();
        spyOn(element, 'removeEventListener').and.callThrough();

        handler = new ScreenSpaceEventHandler(element);

        expect(element.addEventListener.calls.count()).not.toEqual(0);
        expect(element.removeEventListener.calls.count()).toEqual(0);

        handler.destroy();

        expect(element.removeEventListener.calls.count()).toEqual(element.addEventListener.calls.count());
    });
});
