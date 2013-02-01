define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/dom",
	"dojo/on",
	"dojo/touch",
	"dojo/has",
	"../main"
], function(kernel, declare, array, lang, dom, on, touch, has, dojox){
	// module:
	//		dojox/gesture/Base
	// summary:
	//		This module provides an abstract parental class for various gesture implementations.
	
/*=====
	dojox.gesture.Base = {
		// summary:
		//		An abstract parental class for various gesture implementations.
		//
		//		It's mainly responsible for:
		//
		//		1. Binding on() listening handlers for supported gesture events.
		//
		//		2. Monitoring underneath events and process different phases - 'press'|'move'|'release'|'cancel'.
		//
		//		3. Firing and bubbling gesture events with on() API.
		//
		//		A gesture implementation only needs to extend this class and overwrite appropriate phase handlers:
		//
		//		- press()|move()|release()|cancel for recognizing and firing gestures
		//
		// example:
		//		1. A typical gesture implementation.
		//
		//		Suppose we have dojox/gesture/a which provides 3 gesture events:"a", "a.x", "a.y" to be used as:
		//		|	dojo.connect(node, dojox.gesture.a, function(e){});
		//		|	dojo.connect(node, dojox.gesture.a.x, function(e){});
		//		|	dojo.connect(node, dojox.gesture.a.y, function(e){});
		//
		//		The definition of the gesture "a" may look like:
		//		|	define([..., "./Base"], function(..., Base){
		//		|		var clz = declare(Base, {
		//		|			defaultEvent: "a",
		//		|
		//		|			subEvents: ["x", "y"],
		//		|			
		//		|			press: function(data, e){
		//		|				this.fire(node, {type: "a.x", ...});
		//		|			},
		//		|			move: function(data, e){
		//		|				this.fire(node, {type: "a.y", ...});
		//		|			},
		//		|			release: function(data, e){
		//		|				this.fire(node, {type: "a", ...});
		//		|			},
		//		|			cancel: function(data, e){
		//		|				// clean up
		//		|			}
		//		|		});
		//		|
		//		|		// in order to have a default instance for handy use
		//		|		dojox.gesture.a = new clz();
		//		|
		//		|		// so that we can create new instances like
		//		|		// var mine = new dojox.gesture.a.A({...})
		//		|		dojox.gesture.a.A = clz;
		//		|
		//		|		return dojox.gesture.a;
		//		|	});
		//
		//		2. A gesture can be used in the following ways(taking dojox.gesture.tap for example):
		//
		//		A. Used with dojo.connect()
		//		|	dojo.connect(node, dojox.gesture.tap, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.hold, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.doubletap, function(e){});		
		//
		//		B. Used with dojo.on
		//		|	define(["dojo/on", "dojox/gesture/tap"], function(on, tap){
		//		|		on(node, tap, function(e){});
		//		|		on(node, tap.hold, function(e){});
		//		|		on(node, tap.doubletap, function(e){});
		//
		//		C. Used with dojox.gesture.tap directly
		//		|	dojox.gesture.tap(node, function(e){});
		//		|	dojox.gesture.tap.hold(node, function(e){});
		//		|	dojox.gesture.tap.doubletap(node, function(e){});
		//
		//		Though there is always a default gesture instance after being required, e.g 
		//		|	require(["dojox/gesture/tap"], function(){...});
		//
		//		It's possible to create a new one with different parameter setting:
		//		|	var myTap = new dojox.gesture.tap.Tap({holdThreshold: 300});
		//		|	dojo.connect(node, myTap, function(e){});
		//		|	dojo.connect(node, myTap.hold, function(e){});
		//		|	dojo.connect(node, myTap.doubletap, function(e){});
		//		
		//		Please refer to dojox/gesture/ for more gesture usages
	};
=====*/
	kernel.experimental("dojox.gesture.Base");
	
	lang.getObject("gesture", true, dojox);

	// Declare an internal anonymous class which will only be exported by module return value
	return declare(/*===== "dojox.gesture.Base", =====*/null, {

		// defaultEvent: [readonly] String
		//		Default event e.g. 'tap' is a default event of dojox.gesture.tap
		defaultEvent: " ",

		// subEvents: [readonly] Array
		//		A list of sub events e.g ['hold', 'doubletap'],
		//		used by being combined with defaultEvent like 'tap.hold', 'tap.doubletap' etc.
		subEvents: [],

		// touchOnly: boolean
		//		Whether the gesture is touch-device only
		touchOnly : false,

		// _elements: Array
		//		List of elements that wraps target node and gesture data
		_elements: null,

		/*=====
		// _lock: Dom
		//		The dom node whose descendants are all locked for processing
		_lock: null,
		
		// _events: [readonly] Array
		//		The complete list of supported gesture events with full name space
		//		e.g ['tap', 'tap.hold', 'tap.doubletap']
		_events: null,
		=====*/

		constructor: function(args){
			lang.mixin(this, args);
			this.init();
		},
		init: function(){
			// summary:
			//		Initialization works
			this._elements = [];

			if(!has("touch") && this.touchOnly){
				console.warn("Gestures:[", this.defaultEvent, "] is only supported on touch devices!");
				return;
			}

			// bind on() handlers for various events
			var evt = this.defaultEvent;
			this.call = this._handle(evt);

			this._events = [evt];
			array.forEach(this.subEvents, function(subEvt){
				this[subEvt] = this._handle(evt + '.' + subEvt);
				this._events.push(evt + '.' + subEvt);
			}, this);
		},
		_handle: function(/*String*/eventType){
			// summary:
			//		Bind listen handler for the given gesture event(e.g. 'tap', 'tap.hold' etc.)
			//		the returned handle will be used internally by dojo/on
			var self = this;
			//called by dojo/on
			return function(node, listener){
				// normalize, arguments might be (null, node, listener)
				var a = arguments;
				if(a.length > 2){
					node = a[1];
					listener = a[2];
				}
				var isNode = node && (node.nodeType || node.attachEvent || node.addEventListener);
				if(!isNode){
					return on(node, eventType, listener);
				}else{
					var onHandle = self._add(node, eventType, listener);
					// FIXME - users are supposed to explicitly call either
					// disconnect(signal) or signal.remove() to release resources
					var signal = {
						remove: function(){
							onHandle.remove();
							self._remove(node, eventType);
						}
					};
					return signal;
				}
			}; // dojo/on handle
		},
		_add: function(/*Dom*/node, /*String*/type, /*function*/listener){
			// summary:
			//		Bind dojo/on handlers for both gesture event(e.g 'tab.hold')
			//		and underneath 'press'|'move'|'release' events
			var element = this._getGestureElement(node);
			if(!element){
				// the first time listening to the node
				element = {
					target: node,
					data: {},
					handles: {}
				};

				var _press = lang.hitch(this, "_process", element, "press");
				var _move = lang.hitch(this, "_process", element, "move");
				var _release = lang.hitch(this, "_process", element, "release");
				var _cancel = lang.hitch(this, "_process", element, "cancel");

				var handles = element.handles;
				if(this.touchOnly){
					handles.press = on(node, 'touchstart', _press);
					handles.move = on(node, 'touchmove', _move);
					handles.release = on(node, 'touchend', _release);
					handles.cancel = on(node, 'touchcancel', _cancel);
				}else{
					handles.press = touch.press(node, _press);
					handles.move = touch.move(node, _move);
					handles.release = touch.release(node, _release);
					handles.cancel = touch.cancel(node, _cancel);
				}
				this._elements.push(element);
			}
			// track num of listeners for the gesture event - type
			// so that we can release element if no more gestures being monitored
			element.handles[type] = !element.handles[type] ? 1 : ++element.handles[type];

			return on(node, type, listener); //handle
		},
		_getGestureElement: function(/*Dom*/node){
			// summary:
			//		Obtain a gesture element for the give node
			var i = 0, element;
			for(; i < this._elements.length; i++){
				element = this._elements[i];
				if(element.target === node){
					return element;
				}
			}
		},
		_process: function(element, phase, e){
			// summary:
			//		Process and dispatch to appropriate phase handlers.
			//		Also provides the machinery for managing gesture bubbling.
			// description:
			//		1. e._locking is used to make sure only the most inner node
			//		will be processed for the same gesture, suppose we have:
			//	|	on(inner, dojox.gesture.tap, func1);
			//	|	on(outer, dojox.gesture.tap, func2);
			//		only the inner node will be processed by tap gesture, once matched,
			//		the 'tap' event will be bubbled up from inner to outer, dojo.StopEvent(e)
			//		can be used at any level to stop the 'tap' event.
			//
			//		2. Once a node starts being processed, all it's descendant nodes will be locked.
			//		The same gesture won't be processed on its descendant nodes until the lock is released.
			// element: Object
			//		Gesture element
			// phase: String
			//		Phase of a gesture to be processed, might be 'press'|'move'|'release'|'cancel'
			// e: Event
			//		Native event
			e._locking = e._locking || {};
			if(e._locking[this.defaultEvent] || this.isLocked(e.currentTarget)){
				return;
			}
			// invoking gesture.press()|move()|release()|cancel()
			e.preventDefault();
			e._locking[this.defaultEvent] = true;
			this[phase](element.data, e);
		},
		press: function(data, e){
			// summary:
			//		Process the 'press' phase of a gesture
		},
		move: function(data, e){
			// summary:
			//		Process the 'move' phase of a gesture
		},
		release: function(data, e){
			// summary:
			//		Process the 'release' phase of a gesture
		},
		cancel: function(data, e){
			// summary:
			//		Process the 'cancel' phase of a gesture
		},
		fire: function(node, event){
			// summary:
			//		Fire a gesture event and invoke registered listeners
			//		a simulated GestureEvent will also be sent along
			// node: DomNode
			//		Target node to fire the gesture
			// event: Object
			//		An object containing specific gesture info e.g {type: 'tap.hold'|'swipe.left'), ...}
			//		all these properties will be put into a simulated GestureEvent when fired.
			//		Note - Default properties in a native Event won't be overwritten, see on.emit() for more details.
			if(!node || !event){
				return;
			}
			event.bubbles = true;
			event.cancelable = true;
			on.emit(node, event.type, event);
		},
		_remove: function(/*Dom*/node, /*String*/type){
			// summary:
			//		Check and remove underneath handlers if node
			//		is not being listened for 'this' gesture anymore,
			//		this happens when user removed all previous on() handlers.
			var element = this._getGestureElement(node);
			if(!element || !element.handles){ return; }
			
			element.handles[type]--;

			var handles = element.handles;
			if(!array.some(this._events, function(evt){
				return handles[evt] > 0;
			})){
				// clean up if node is not being listened anymore
				this._cleanHandles(handles);
				var i = array.indexOf(this._elements, element);
				if(i >= 0){
					this._elements.splice(i, 1);
				}
			}
		},
		_cleanHandles: function(/*Object*/handles){
			// summary:
			//		Clean up on handles
			for(var x in handles){
				//remove handles for "press"|"move"|"release"|"cancel"
				if(handles[x].remove){
					handles[x].remove();
				}
				delete handles[x];
			}
		},
		lock: function(/*Dom*/node){
			// summary:
			//		Lock all descendants of the node.
			// tags:
			//		protected
			this._lock = node;
		},
		unLock: function(){
			// summary:
			//		Release the lock
			// tags:
			//		protected
			this._lock = null;
		},
		isLocked: function(node){
			// summary:
			//		Check if the node is locked, isLocked(node) means
			//		whether it's a descendant of the currently locked node.
			// tags:
			//		protected
			if(!this._lock || !node){
				return false;
			}
			return this._lock !== node && dom.isDescendant(node, this._lock);
		},
		destroy: function(){
			// summary:
			//		Release all handlers and resources
			array.forEach(this._elements, function(element){
				this._cleanHandles(element.handles);
			}, this);
			this._elements = null;
		}
	});
});