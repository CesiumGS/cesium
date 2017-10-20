define(["./has!dom-addeventlistener?:./aspect", "./_base/kernel", "./sniff"], function(aspect, dojo, has){

	"use strict";
	if(has("dom")){ // check to make sure we are in a browser, this module should work anywhere
		var major = window.ScriptEngineMajorVersion;
		has.add("jscript", major && (major() + ScriptEngineMinorVersion() / 10));
		has.add("event-orientationchange", has("touch") && !has("android")); // TODO: how do we detect this?
		has.add("event-stopimmediatepropagation", window.Event && !!window.Event.prototype && !!window.Event.prototype.stopImmediatePropagation);
		has.add("event-focusin", function(global, doc, element){
			return 'onfocusin' in element;
		});
		
		if(has("touch")){
			has.add("touch-can-modify-event-delegate", function(){
				// This feature test checks whether deleting a property of an event delegate works
				// for a touch-enabled device. If it works, event delegation can be used as fallback
				// for browsers such as Safari in older iOS where deleting properties of the original
				// event does not work.
				var EventDelegate = function(){};
				EventDelegate.prototype =
					document.createEvent("MouseEvents"); // original event
				// Attempt to modify a property of an event delegate and check if
				// it succeeds. Depending on browsers and on whether dojo/on's
				// strict mode is stripped in a Dojo build, there are 3 known behaviors:
				// it may either succeed, or raise an error, or fail to set the property
				// without raising an error.
				try{
					var eventDelegate = new EventDelegate;
					eventDelegate.target = null;
					return eventDelegate.target === null;
				}catch(e){
					return false; // cannot use event delegation
				}
			});
		}
	}
	var on = function(target, type, listener, dontFix){
		// summary:
		//		A function that provides core event listening functionality. With this function
		//		you can provide a target, event type, and listener to be notified of
		//		future matching events that are fired.
		// target: Element|Object
		//		This is the target object or DOM element that to receive events from
		// type: String|Function
		//		This is the name of the event to listen for or an extension event type.
		// listener: Function
		//		This is the function that should be called when the event fires.
		// returns: Object
		//		An object with a remove() method that can be used to stop listening for this
		//		event.
		// description:
		//		To listen for "click" events on a button node, we can do:
		//		|	define(["dojo/on"], function(on){
		//		|		on(button, "click", clickHandler);
		//		|		...
		//		Evented JavaScript objects can also have their own events.
		//		|	var obj = new Evented;
		//		|	on(obj, "foo", fooHandler);
		//		And then we could publish a "foo" event:
		//		|	on.emit(obj, "foo", {key: "value"});
		//		We can use extension events as well. For example, you could listen for a tap gesture:
		//		|	define(["dojo/on", "dojo/gesture/tap", function(on, tap){
		//		|		on(button, tap, tapHandler);
		//		|		...
		//		which would trigger fooHandler. Note that for a simple object this is equivalent to calling:
		//		|	obj.onfoo({key:"value"});
		//		If you use on.emit on a DOM node, it will use native event dispatching when possible.

		if(typeof target.on == "function" && typeof type != "function" && !target.nodeType){
			// delegate to the target's on() method, so it can handle it's own listening if it wants (unless it 
			// is DOM node and we may be dealing with jQuery or Prototype's incompatible addition to the
			// Element prototype 
			return target.on(type, listener);
		}
		// delegate to main listener code
		return on.parse(target, type, listener, addListener, dontFix, this);
	};
	on.pausable =  function(target, type, listener, dontFix){
		// summary:
		//		This function acts the same as on(), but with pausable functionality. The
		//		returned signal object has pause() and resume() functions. Calling the
		//		pause() method will cause the listener to not be called for future events. Calling the
		//		resume() method will cause the listener to again be called for future events.
		var paused;
		var signal = on(target, type, function(){
			if(!paused){
				return listener.apply(this, arguments);
			}
		}, dontFix);
		signal.pause = function(){
			paused = true;
		};
		signal.resume = function(){
			paused = false;
		};
		return signal;
	};
	on.once = function(target, type, listener, dontFix){
		// summary:
		//		This function acts the same as on(), but will only call the listener once. The 
		//		listener will be called for the first
		//		event that takes place and then listener will automatically be removed.
		var signal = on(target, type, function(){
			// remove this listener
			signal.remove();
			// proceed to call the listener
			return listener.apply(this, arguments);
		});
		return signal;
	};
	on.parse = function(target, type, listener, addListener, dontFix, matchesTarget){
		if(type.call){
			// event handler function
			// on(node, touch.press, touchListener);
			return type.call(matchesTarget, target, listener);
		}

		if(type instanceof Array){
			// allow an array of event names (or event handler functions)
			events = type;
		}else if(type.indexOf(",") > -1){
			// we allow comma delimited event names, so you can register for multiple events at once
			var events = type.split(/\s*,\s*/);
		} 
		if(events){
			var handles = [];
			var i = 0;
			var eventName;
			while(eventName = events[i++]){
				handles.push(on.parse(target, eventName, listener, addListener, dontFix, matchesTarget));
			}
			handles.remove = function(){
				for(var i = 0; i < handles.length; i++){
					handles[i].remove();
				}
			};
			return handles;
		}
		return addListener(target, type, listener, dontFix, matchesTarget);
	};
	var touchEvents = /^touch/;
	function addListener(target, type, listener, dontFix, matchesTarget){
		// event delegation:
		var selector = type.match(/(.*):(.*)/);
		// if we have a selector:event, the last one is interpreted as an event, and we use event delegation
		if(selector){
			type = selector[2];
			selector = selector[1];
			// create the extension event for selectors and directly call it
			return on.selector(selector, type).call(matchesTarget, target, listener);
		}
		// test to see if it a touch event right now, so we don't have to do it every time it fires
		if(has("touch")){
			if(touchEvents.test(type)){
				// touch event, fix it
				listener = fixTouchListener(listener);
			}
			if(!has("event-orientationchange") && (type == "orientationchange")){
				//"orientationchange" not supported <= Android 2.1, 
				//but works through "resize" on window
				type = "resize"; 
				target = window;
				listener = fixTouchListener(listener);
			} 
		}
		if(addStopImmediate){
			// add stopImmediatePropagation if it doesn't exist
			listener = addStopImmediate(listener);
		}
		// normal path, the target is |this|
		if(target.addEventListener){
			// the target has addEventListener, which should be used if available (might or might not be a node, non-nodes can implement this method as well)
			// check for capture conversions
			var capture = type in captures,
				adjustedType = capture ? captures[type] : type;
			target.addEventListener(adjustedType, listener, capture);
			// create and return the signal
			return {
				remove: function(){
					target.removeEventListener(adjustedType, listener, capture);
				}
			};
		}
		type = "on" + type;
		if(fixAttach && target.attachEvent){
			return fixAttach(target, type, listener);
		}
		throw new Error("Target must be an event emitter");
	}
	on.matches = function(node, selector, context, children, matchesTarget) {
		// summary:
		//		Check if a node match the current selector within the constraint of a context
		// node: DOMNode
		//		The node that originate the event
		// selector: String
		//		The selector to check against
		// context: DOMNode
		//		The context to search in.
		// children: Boolean
		//		Indicates if children elements of the selector should be allowed. This defaults to
		//		true
		// matchesTarget: Object|dojo/query?
		//		An object with a property "matches" as a function. Default is dojo/query.
		//		Matching DOMNodes will be done against this function
		//		The function must return a Boolean.
		//		It will have 3 arguments: "node", "selector" and "context"
		//		True is expected if "node" is matching the current "selector" in the passed "context"
		// returns: DOMNode?
		//		The matching node, if any. Else you get false

		// see if we have a valid matchesTarget or default to dojo/query
		matchesTarget = matchesTarget && matchesTarget.matches ? matchesTarget : dojo.query;
		children = children !== false;
		// there is a selector, so make sure it matches
		if(node.nodeType != 1){
			// text node will fail in native match selector
			node = node.parentNode;
		}
		while(!matchesTarget.matches(node, selector, context)){
			if(node == context || children === false || !(node = node.parentNode) || node.nodeType != 1){ // intentional assignment
				return false;
			}
		}
		return node;
	}
	on.selector = function(selector, eventType, children){
		// summary:
		//		Creates a new extension event with event delegation. This is based on
		//		the provided event type (can be extension event) that
		//		only calls the listener when the CSS selector matches the target of the event.
		//
		//		The application must require() an appropriate level of dojo/query to handle the selector.
		// selector:
		//		The CSS selector to use for filter events and determine the |this| of the event listener.
		// eventType:
		//		The event to listen for
		// children:
		//		Indicates if children elements of the selector should be allowed. This defaults to 
		//		true
		// example:
		// |	require(["dojo/on", "dojo/mouse", "dojo/query!css2"], function(on, mouse){
		// |		on(node, on.selector(".my-class", mouse.enter), handlerForMyHover);
		return function(target, listener){
			// if the selector is function, use it to select the node, otherwise use the matches method
			var matchesTarget = typeof selector == "function" ? {matches: selector} : this,
				bubble = eventType.bubble;
			function select(eventTarget){
				return on.matches(eventTarget, selector, target, children, matchesTarget);
			}
			if(bubble){
				// the event type doesn't naturally bubble, but has a bubbling form, use that, and give it the selector so it can perform the select itself
				return on(target, bubble(select), listener);
			}
			// standard event delegation
			return on(target, eventType, function(event){
				// call select to see if we match
				var eventTarget = select(event.target);
				// if it matches we call the listener
				if (eventTarget) {
					return listener.call(eventTarget, event);
				}
			});
		};
	};

	function syntheticPreventDefault(){
		this.cancelable = false;
		this.defaultPrevented = true;
	}
	function syntheticStopPropagation(){
		this.bubbles = false;
	}
	var slice = [].slice,
		syntheticDispatch = on.emit = function(target, type, event){
		// summary:
		//		Fires an event on the target object.
		// target:
		//		The target object to fire the event on. This can be a DOM element or a plain 
		//		JS object. If the target is a DOM element, native event emitting mechanisms
		//		are used when possible.
		// type:
		//		The event type name. You can emulate standard native events like "click" and 
		//		"mouseover" or create custom events like "open" or "finish".
		// event:
		//		An object that provides the properties for the event. See https://developer.mozilla.org/en/DOM/event.initEvent 
		//		for some of the properties. These properties are copied to the event object.
		//		Of particular importance are the cancelable and bubbles properties. The
		//		cancelable property indicates whether or not the event has a default action
		//		that can be cancelled. The event is cancelled by calling preventDefault() on
		//		the event object. The bubbles property indicates whether or not the
		//		event will bubble up the DOM tree. If bubbles is true, the event will be called
		//		on the target and then each parent successively until the top of the tree
		//		is reached or stopPropagation() is called. Both bubbles and cancelable 
		//		default to false.
		// returns:
		//		If the event is cancelable and the event is not cancelled,
		//		emit will return true. If the event is cancelable and the event is cancelled,
		//		emit will return false.
		// details:
		//		Note that this is designed to emit events for listeners registered through
		//		dojo/on. It should actually work with any event listener except those
		//		added through IE's attachEvent (IE8 and below's non-W3C event emitting
		//		doesn't support custom event types). It should work with all events registered
		//		through dojo/on. Also note that the emit method does do any default
		//		action, it only returns a value to indicate if the default action should take
		//		place. For example, emitting a keypress event would not cause a character
		//		to appear in a textbox.
		// example:
		//		To fire our own click event
		//	|	require(["dojo/on", "dojo/dom"
		//	|	], function(on, dom){
		//	|		on.emit(dom.byId("button"), "click", {
		//	|			cancelable: true,
		//	|			bubbles: true,
		//	|			screenX: 33,
		//	|			screenY: 44
		//	|		});
		//		We can also fire our own custom events:
		//	|		on.emit(dom.byId("slider"), "slide", {
		//	|			cancelable: true,
		//	|			bubbles: true,
		//	|			direction: "left-to-right"
		//	|		});
		//	|	});
		var args = slice.call(arguments, 2);
		var method = "on" + type;
		if("parentNode" in target){
			// node (or node-like), create event controller methods
			var newEvent = args[0] = {};
			for(var i in event){
				newEvent[i] = event[i];
			}
			newEvent.preventDefault = syntheticPreventDefault;
			newEvent.stopPropagation = syntheticStopPropagation;
			newEvent.target = target;
			newEvent.type = type;
			event = newEvent;
		}
		do{
			// call any node which has a handler (note that ideally we would try/catch to simulate normal event propagation but that causes too much pain for debugging)
			target[method] && target[method].apply(target, args);
			// and then continue up the parent node chain if it is still bubbling (if started as bubbles and stopPropagation hasn't been called)
		}while(event && event.bubbles && (target = target.parentNode));
		return event && event.cancelable && event; // if it is still true (was cancelable and was cancelled), return the event to indicate default action should happen
	};
	var captures = has("event-focusin") ? {} : {focusin: "focus", focusout: "blur"};
	if(!has("event-stopimmediatepropagation")){
		var stopImmediatePropagation =function(){
			this.immediatelyStopped = true;
			this.modified = true; // mark it as modified so the event will be cached in IE
		};
		var addStopImmediate = function(listener){
			return function(event){
				if(!event.immediatelyStopped){// check to make sure it hasn't been stopped immediately
					event.stopImmediatePropagation = stopImmediatePropagation;
					return listener.apply(this, arguments);
				}
			};
		}
	} 
	if(has("dom-addeventlistener")){
		// emitter that works with native event handling
		on.emit = function(target, type, event){
			if(target.dispatchEvent && document.createEvent){
				// use the native event emitting mechanism if it is available on the target object
				// create a generic event				
				// we could create branch into the different types of event constructors, but 
				// that would be a lot of extra code, with little benefit that I can see, seems 
				// best to use the generic constructor and copy properties over, making it 
				// easy to have events look like the ones created with specific initializers
				var ownerDocument = target.ownerDocument || document;
				var nativeEvent = ownerDocument.createEvent("HTMLEvents");
				nativeEvent.initEvent(type, !!event.bubbles, !!event.cancelable);
				// and copy all our properties over
				for(var i in event){
					if(!(i in nativeEvent)){
						nativeEvent[i] = event[i];
					}
				}
				return target.dispatchEvent(nativeEvent) && nativeEvent;
			}
			return syntheticDispatch.apply(on, arguments); // emit for a non-node
		};
	}else{
		// no addEventListener, basically old IE event normalization
		on._fixEvent = function(evt, sender){
			// summary:
			//		normalizes properties on the event object including event
			//		bubbling methods, keystroke normalization, and x/y positions
			// evt:
			//		native event object
			// sender:
			//		node to treat as "currentTarget"
			if(!evt){
				var w = sender && (sender.ownerDocument || sender.document || sender).parentWindow || window;
				evt = w.event;
			}
			if(!evt){return evt;}
			try{
				if(lastEvent && evt.type == lastEvent.type  && evt.srcElement == lastEvent.target){
					// should be same event, reuse event object (so it can be augmented);
					// accessing evt.srcElement rather than evt.target since evt.target not set on IE until fixup below
					evt = lastEvent;
				}
			}catch(e){
				// will occur on IE on lastEvent.type reference if lastEvent points to a previous event that already
				// finished bubbling, but the setTimeout() to clear lastEvent hasn't fired yet
			}
			if(!evt.target){ // check to see if it has been fixed yet
				evt.target = evt.srcElement;
				evt.currentTarget = (sender || evt.srcElement);
				if(evt.type == "mouseover"){
					evt.relatedTarget = evt.fromElement;
				}
				if(evt.type == "mouseout"){
					evt.relatedTarget = evt.toElement;
				}
				if(!evt.stopPropagation){
					evt.stopPropagation = stopPropagation;
					evt.preventDefault = preventDefault;
				}
				switch(evt.type){
					case "keypress":
						var c = ("charCode" in evt ? evt.charCode : evt.keyCode);
						if (c==10){
							// CTRL-ENTER is CTRL-ASCII(10) on IE, but CTRL-ENTER on Mozilla
							c=0;
							evt.keyCode = 13;
						}else if(c==13||c==27){
							c=0; // Mozilla considers ENTER and ESC non-printable
						}else if(c==3){
							c=99; // Mozilla maps CTRL-BREAK to CTRL-c
						}
						// Mozilla sets keyCode to 0 when there is a charCode
						// but that stops the event on IE.
						evt.charCode = c;
						_setKeyChar(evt);
						break;
				}
			}
			return evt;
		};
		var lastEvent, IESignal = function(handle){
			this.handle = handle;
		};
		IESignal.prototype.remove = function(){
			delete _dojoIEListeners_[this.handle];
		};
		var fixListener = function(listener){
			// this is a minimal function for closing on the previous listener with as few as variables as possible
			return function(evt){
				evt = on._fixEvent(evt, this);
				var result = listener.call(this, evt);
				if(evt.modified){
					// cache the last event and reuse it if we can
					if(!lastEvent){
						setTimeout(function(){
							lastEvent = null;
						});
					}
					lastEvent = evt;
				}
				return result;
			};
		};
		var fixAttach = function(target, type, listener){
			listener = fixListener(listener);
			if(((target.ownerDocument ? target.ownerDocument.parentWindow : target.parentWindow || target.window || window) != top || 
						has("jscript") < 5.8) && 
					!has("config-_allow_leaks")){
				// IE will leak memory on certain handlers in frames (IE8 and earlier) and in unattached DOM nodes for JScript 5.7 and below.
				// Here we use global redirection to solve the memory leaks
				if(typeof _dojoIEListeners_ == "undefined"){
					_dojoIEListeners_ = [];
				}
				var emitter = target[type];
				if(!emitter || !emitter.listeners){
					var oldListener = emitter;
					emitter = Function('event', 'var callee = arguments.callee; for(var i = 0; i<callee.listeners.length; i++){var listener = _dojoIEListeners_[callee.listeners[i]]; if(listener){listener.call(this,event);}}');
					emitter.listeners = [];
					target[type] = emitter;
					emitter.global = this;
					if(oldListener){
						emitter.listeners.push(_dojoIEListeners_.push(oldListener) - 1);
					}
				}
				var handle;
				emitter.listeners.push(handle = (emitter.global._dojoIEListeners_.push(listener) - 1));
				return new IESignal(handle);
			}
			return aspect.after(target, type, listener, true);
		};

		var _setKeyChar = function(evt){
			evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
			evt.charOrCode = evt.keyChar || evt.keyCode;	// TODO: remove for 2.0
		};
		// Called in Event scope
		var stopPropagation = function(){
			this.cancelBubble = true;
		};
		var preventDefault = on._preventDefault = function(){
			// Setting keyCode to 0 is the only way to prevent certain keypresses (namely
			// ctrl-combinations that correspond to menu accelerator keys).
			// Otoh, it prevents upstream listeners from getting this information
			// Try to split the difference here by clobbering keyCode only for ctrl
			// combinations. If you still need to access the key upstream, bubbledKeyCode is
			// provided as a workaround.
			this.bubbledKeyCode = this.keyCode;
			if(this.ctrlKey){
				try{
					// squelch errors when keyCode is read-only
					// (e.g. if keyCode is ctrl or shift)
					this.keyCode = 0;
				}catch(e){
				}
			}
			this.defaultPrevented = true;
			this.returnValue = false;
			this.modified = true; // mark it as modified  (for defaultPrevented flag) so the event will be cached in IE
		};
	}
	if(has("touch")){ 
		var EventDelegate = function(){};
		var windowOrientation = window.orientation; 
		var fixTouchListener = function(listener){ 
			return function(originalEvent){ 
				//Event normalization(for ontouchxxx and resize): 
				//1.incorrect e.pageX|pageY in iOS 
				//2.there are no "e.rotation", "e.scale" and "onorientationchange" in Android
				//3.More TBD e.g. force | screenX | screenX | clientX | clientY | radiusX | radiusY

				// see if it has already been corrected
				var event = originalEvent.corrected;
				if(!event){
					var type = originalEvent.type;
					try{
						delete originalEvent.type; // on some JS engines (android), deleting properties makes them mutable
					}catch(e){} 
					if(originalEvent.type){
						// Deleting the property of the original event did not work (this is the case of
						// browsers such as older Safari iOS), hence fallback:
						if(has("touch-can-modify-event-delegate")){
							// If deleting properties of delegated event works, use event delegation:
							EventDelegate.prototype = originalEvent;
							event = new EventDelegate;
						}else{
							// Otherwise last fallback: other browsers, such as mobile Firefox, do not like
							// delegated properties, so we have to copy
							event = {};
							for(var name in originalEvent){
								event[name] = originalEvent[name];
							}
						}
						// have to delegate methods to make them work
						event.preventDefault = function(){
							originalEvent.preventDefault();
						};
						event.stopPropagation = function(){
							originalEvent.stopPropagation();
						};
					}else{
						// deletion worked, use property as is
						event = originalEvent;
						event.type = type;
					}
					originalEvent.corrected = event;
					if(type == 'resize'){
						if(windowOrientation == window.orientation){ 
							return null;//double tap causes an unexpected 'resize' in Android
						} 
						windowOrientation = window.orientation;
						event.type = "orientationchange"; 
						return listener.call(this, event);
					}
					// We use the original event and augment, rather than doing an expensive mixin operation
					if(!("rotation" in event)){ // test to see if it has rotation
						event.rotation = 0; 
						event.scale = 1;
					}
					//use event.changedTouches[0].pageX|pageY|screenX|screenY|clientX|clientY|target
					var firstChangeTouch = event.changedTouches[0];
					for(var i in firstChangeTouch){ // use for-in, we don't need to have dependency on dojo/_base/lang here
						delete event[i]; // delete it first to make it mutable
						event[i] = firstChangeTouch[i];
					}
				}
				return listener.call(this, event); 
			}; 
		}; 
	}
	return on;
});
