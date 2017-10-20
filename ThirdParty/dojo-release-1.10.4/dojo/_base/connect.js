define(["./kernel", "../on", "../topic", "../aspect", "./event", "../mouse", "./sniff", "./lang", "../keys"], function(dojo, on, hub, aspect, eventModule, mouse, has, lang){
// module:
//		dojo/_base/connect

has.add("events-keypress-typed", function(){ // keypresses should only occur a printable character is hit
	var testKeyEvent = {charCode: 0};
	try{
		testKeyEvent = document.createEvent("KeyboardEvent");
		(testKeyEvent.initKeyboardEvent || testKeyEvent.initKeyEvent).call(testKeyEvent, "keypress", true, true, null, false, false, false, false, 9, 3);
	}catch(e){}
	return testKeyEvent.charCode == 0 && !has("opera");
});

function connect_(obj, event, context, method, dontFix){
	method = lang.hitch(context, method);
	if(!obj || !(obj.addEventListener || obj.attachEvent)){
		// it is a not a DOM node and we are using the dojo.connect style of treating a
		// method like an event, must go right to aspect
		return aspect.after(obj || dojo.global, event, method, true);
	}
	if(typeof event == "string" && event.substring(0, 2) == "on"){
		event = event.substring(2);
	}
	if(!obj){
		obj = dojo.global;
	}
	if(!dontFix){
		switch(event){
			// dojo.connect has special handling for these event types
			case "keypress":
				event = keypress;
				break;
			case "mouseenter":
				event = mouse.enter;
				break;
			case "mouseleave":
				event = mouse.leave;
				break;
		}
	}
	return on(obj, event, method, dontFix);
}

var _punctMap = {
	106:42,
	111:47,
	186:59,
	187:43,
	188:44,
	189:45,
	190:46,
	191:47,
	192:96,
	219:91,
	220:92,
	221:93,
	222:39,
	229:113
};
var evtCopyKey = has("mac") ? "metaKey" : "ctrlKey";


var _synthesizeEvent = function(evt, props){
	var faux = lang.mixin({}, evt, props);
	setKeyChar(faux);
	// FIXME: would prefer to use lang.hitch: lang.hitch(evt, evt.preventDefault);
	// but it throws an error when preventDefault is invoked on Safari
	// does Event.preventDefault not support "apply" on Safari?
	faux.preventDefault = function(){ evt.preventDefault(); };
	faux.stopPropagation = function(){ evt.stopPropagation(); };
	return faux;
};
function setKeyChar(evt){
	evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
	evt.charOrCode = evt.keyChar || evt.keyCode;
}
var keypress;
if(has("events-keypress-typed")){
	// this emulates Firefox's keypress behavior where every keydown can correspond to a keypress
	var _trySetKeyCode = function(e, code){
		try{
			// squelch errors when keyCode is read-only
			// (e.g. if keyCode is ctrl or shift)
			return (e.keyCode = code);
		}catch(e){
			return 0;
		}
	};
	keypress = function(object, listener){
		var keydownSignal = on(object, "keydown", function(evt){
			// munge key/charCode
			var k=evt.keyCode;
			// These are Windows Virtual Key Codes
			// http://msdn.microsoft.com/library/default.asp?url=/library/en-us/winui/WinUI/WindowsUserInterface/UserInput/VirtualKeyCodes.asp
			var unprintable = (k!=13) && k!=32 && (k!=27||!has("ie")) && (k<48||k>90) && (k<96||k>111) && (k<186||k>192) && (k<219||k>222) && k!=229;
			// synthesize keypress for most unprintables and CTRL-keys
			if(unprintable||evt.ctrlKey){
				var c = unprintable ? 0 : k;
				if(evt.ctrlKey){
					if(k==3 || k==13){
						return listener.call(evt.currentTarget, evt); // IE will post CTRL-BREAK, CTRL-ENTER as keypress natively
					}else if(c>95 && c<106){
						c -= 48; // map CTRL-[numpad 0-9] to ASCII
					}else if((!evt.shiftKey)&&(c>=65&&c<=90)){
						c += 32; // map CTRL-[A-Z] to lowercase
					}else{
						c = _punctMap[c] || c; // map other problematic CTRL combinations to ASCII
					}
				}
				// simulate a keypress event
				var faux = _synthesizeEvent(evt, {type: 'keypress', faux: true, charCode: c});
				listener.call(evt.currentTarget, faux);
				if(has("ie")){
					_trySetKeyCode(evt, faux.keyCode);
				}
			}
		});
		var keypressSignal = on(object, "keypress", function(evt){
			var c = evt.charCode;
			c = c>=32 ? c : 0;
			evt = _synthesizeEvent(evt, {charCode: c, faux: true});
			return listener.call(this, evt);
		});
		return {
			remove: function(){
				keydownSignal.remove();
				keypressSignal.remove();
			}
		};
	};
}else{
	if(has("opera")){
		keypress = function(object, listener){
			return on(object, "keypress", function(evt){
				var c = evt.which;
				if(c==3){
					c=99; // Mozilla maps CTRL-BREAK to CTRL-c
				}
				// can't trap some keys at all, like INSERT and DELETE
				// there is no differentiating info between DELETE and ".", or INSERT and "-"
				c = c<32 && !evt.shiftKey ? 0 : c;
				if(evt.ctrlKey && !evt.shiftKey && c>=65 && c<=90){
					// lowercase CTRL-[A-Z] keys
					c += 32;
				}
				return listener.call(this, _synthesizeEvent(evt, { charCode: c }));
			});
		};
	}else{
		keypress = function(object, listener){
			return on(object, "keypress", function(evt){
				setKeyChar(evt);
				return listener.call(this, evt);
			});
		};
	}
}

var connect = {
	// summary:
	//		This module defines the dojo.connect API.
	//		This modules also provides keyboard event handling helpers.
	//		This module exports an extension event for emulating Firefox's keypress handling.
	//		However, this extension event exists primarily for backwards compatibility and
	//		is not recommended. WebKit and IE uses an alternate keypress handling (only
	//		firing for printable characters, to distinguish from keydown events), and most
	//		consider the WebKit/IE behavior more desirable.

	_keypress:keypress,

	connect:function(obj, event, context, method, dontFix){
		// summary:
		//		`dojo.connect` is a deprecated event handling and delegation method in
		//		Dojo. It allows one function to "listen in" on the execution of
		//		any other, triggering the second whenever the first is called. Many
		//		listeners may be attached to a function, and source functions may
		//		be either regular function calls or DOM events.
		//
		// description:
		//		Connects listeners to actions, so that after event fires, a
		//		listener is called with the same arguments passed to the original
		//		function.
		//
		//		Since `dojo.connect` allows the source of events to be either a
		//		"regular" JavaScript function or a DOM event, it provides a uniform
		//		interface for listening to all the types of events that an
		//		application is likely to deal with though a single, unified
		//		interface. DOM programmers may want to think of it as
		//		"addEventListener for everything and anything".
		//
		//		When setting up a connection, the `event` parameter must be a
		//		string that is the name of the method/event to be listened for. If
		//		`obj` is null, `kernel.global` is assumed, meaning that connections
		//		to global methods are supported but also that you may inadvertently
		//		connect to a global by passing an incorrect object name or invalid
		//		reference.
		//
		//		`dojo.connect` generally is forgiving. If you pass the name of a
		//		function or method that does not yet exist on `obj`, connect will
		//		not fail, but will instead set up a stub method. Similarly, null
		//		arguments may simply be omitted such that fewer than 4 arguments
		//		may be required to set up a connection See the examples for details.
		//
		//		The return value is a handle that is needed to
		//		remove this connection with `dojo.disconnect`.
		//
		// obj: Object?
		//		The source object for the event function.
		//		Defaults to `kernel.global` if null.
		//		If obj is a DOM node, the connection is delegated
		//		to the DOM event manager (unless dontFix is true).
		//
		// event: String
		//		String name of the event function in obj.
		//		I.e. identifies a property `obj[event]`.
		//
		// context: Object|null
		//		The object that method will receive as "this".
		//
		//		If context is null and method is a function, then method
		//		inherits the context of event.
		//
		//		If method is a string then context must be the source
		//		object object for method (context[method]). If context is null,
		//		kernel.global is used.
		//
		// method: String|Function
		//		A function reference, or name of a function in context.
		//		The function identified by method fires after event does.
		//		method receives the same arguments as the event.
		//		See context argument comments for information on method's scope.
		//
		// dontFix: Boolean?
		//		If obj is a DOM node, set dontFix to true to prevent delegation
		//		of this connection to the DOM event manager.
		//
		// example:
		//		When obj.onchange(), do ui.update():
		//	|	dojo.connect(obj, "onchange", ui, "update");
		//	|	dojo.connect(obj, "onchange", ui, ui.update); // same
		//
		// example:
		//		Using return value for disconnect:
		//	|	var link = dojo.connect(obj, "onchange", ui, "update");
		//	|	...
		//	|	dojo.disconnect(link);
		//
		// example:
		//		When onglobalevent executes, watcher.handler is invoked:
		//	|	dojo.connect(null, "onglobalevent", watcher, "handler");
		//
		// example:
		//		When ob.onCustomEvent executes, customEventHandler is invoked:
		//	|	dojo.connect(ob, "onCustomEvent", null, "customEventHandler");
		//	|	dojo.connect(ob, "onCustomEvent", "customEventHandler"); // same
		//
		// example:
		//		When ob.onCustomEvent executes, customEventHandler is invoked
		//		with the same scope (this):
		//	|	dojo.connect(ob, "onCustomEvent", null, customEventHandler);
		//	|	dojo.connect(ob, "onCustomEvent", customEventHandler); // same
		//
		// example:
		//		When globalEvent executes, globalHandler is invoked
		//		with the same scope (this):
		//	|	dojo.connect(null, "globalEvent", null, globalHandler);
		//	|	dojo.connect("globalEvent", globalHandler); // same

		// normalize arguments
		var a=arguments, args=[], i=0;
		// if a[0] is a String, obj was omitted
		args.push(typeof a[0] == "string" ? null : a[i++], a[i++]);
		// if the arg-after-next is a String or Function, context was NOT omitted
		var a1 = a[i+1];
		args.push(typeof a1 == "string" || typeof a1 == "function" ? a[i++] : null, a[i++]);
		// absorb any additional arguments
		for(var l=a.length; i<l; i++){	args.push(a[i]); }
		return connect_.apply(this, args);
	},

	disconnect:function(handle){
		// summary:
		//		Remove a link created by dojo.connect.
		// description:
		//		Removes the connection between event and the method referenced by handle.
		// handle: Handle
		//		the return value of the dojo.connect call that created the connection.

		if(handle){
			handle.remove();
		}
	},

	subscribe:function(topic, context, method){
		// summary:
		//		Attach a listener to a named topic. The listener function is invoked whenever the
		//		named topic is published (see: dojo.publish).
		//		Returns a handle which is needed to unsubscribe this listener.
		// topic: String
		//		The topic to which to subscribe.
		// context: Object?
		//		Scope in which method will be invoked, or null for default scope.
		// method: String|Function
		//		The name of a function in context, or a function reference. This is the function that
		//		is invoked when topic is published.
		// example:
		//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); });
		//	|	dojo.publish("alerts", [ "read this", "hello world" ]);
		return hub.subscribe(topic, lang.hitch(context, method));
	},

	publish:function(topic, args){
		// summary:
		//		Invoke all listener method subscribed to topic.
		// topic: String
		//		The name of the topic to publish.
		// args: Array?
		//		An array of arguments. The arguments will be applied
		//		to each topic subscriber (as first class parameters, via apply).
		// example:
		//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
		//	|	dojo.publish("alerts", [ "read this", "hello world" ]);
		return hub.publish.apply(hub, [topic].concat(args));
	},

	connectPublisher:function(topic, obj, event){
		// summary:
		//		Ensure that every time obj.event() is called, a message is published
		//		on the topic. Returns a handle which can be passed to
		//		dojo.disconnect() to disable subsequent automatic publication on
		//		the topic.
		// topic: String
		//		The name of the topic to publish.
		// obj: Object?
		//		The source object for the event function. Defaults to kernel.global
		//		if null.
		// event: String
		//		The name of the event function in obj.
		//		I.e. identifies a property obj[event].
		// example:
		//	|	dojo.connectPublisher("/ajax/start", dojo, "xhrGet");
		var pf = function(){ connect.publish(topic, arguments); };
		return event ? connect.connect(obj, event, pf) : connect.connect(obj, pf); //Handle
	},

	isCopyKey: function(e){
		// summary:
		//		Checks an event for the copy key (meta on Mac, and ctrl anywhere else)
		// e: Event
		//		Event object to examine
		return e[evtCopyKey];	// Boolean
	}
};

connect.unsubscribe = connect.disconnect;
/*=====
 connect.unsubscribe = function(handle){
	 // summary:
	 //		Remove a topic listener.
	 // handle: Handle
	 //		The handle returned from a call to subscribe.
	 // example:
	 //	|	var alerter = dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
	 //	|	...
	 //	|	dojo.unsubscribe(alerter);
 };
 =====*/

has("extend-dojo") && lang.mixin(dojo, connect);
return connect;

});


