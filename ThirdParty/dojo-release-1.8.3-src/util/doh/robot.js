define([
	"doh/_browserRunner", "require",
	"dojo/aspect", "dojo/Deferred", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-geometry", "dojo/_base/lang", "dojo/ready",
	"dojo/_base/unload", "dojo/when", "dojo/_base/window"
], function(doh, require, aspect, Deferred, domClass, construct, geom, lang, ready, unload, when, win){

// loading state
var _robot = null;

var isSecure = (function(){
	var key = Math.random();
	return function(fcn){
		return key;
	};
})();

var _keyPress = function(/*Number*/ charCode, /*Number*/ keyCode, /*Boolean*/ alt, /*Boolean*/ ctrl, /*Boolean*/ shift, /*Boolean*/ meta, /*Integer?*/ delay, /*Boolean*/ async){
	// internal function to type one non-modifier key

	// typecasting Numbers helps Sun's IE plugin lookup methods that take int arguments

	// otherwise JS will send a double and Sun will complain
	_robot.typeKey(isSecure(), Number(charCode), Number(keyCode), Boolean(alt), Boolean(ctrl), Boolean(shift), Boolean(meta), Number(delay||0), Boolean(async||false));
};

// Queue of pending actions plus the currently executing action registered via sequence().
// Each action is a function that either:
//		1. does a setTimeout()
//		2. calls java Robot (mouse movement, typing a single letter, etc.)
//		3. executes user defined function (for when app called sequence() directly).
// Each function can return a Promise, or just a plain value if it executes synchronously.
var seqPromise;
aspect.before(doh, "_runFixture", function(){
	// At the start of each new test fixture, clear any leftover queued actions from the previous test fixture.
	// This will happen when the previous test throws an error, or times out.
	var _seqPromise = seqPromise;
	// need setTimeout to avoid false error; seqPromise from passing test is not fulfilled until after this execution trace finishes!
	// really we should not have both `seqPromise` here and `var d = new doh.Deferred()` in the test
	setTimeout(function(){
		if(_seqPromise && !_seqPromise.isFulfilled()){
			_seqPromise.cancel(new Error("new test starting, cancelling pending & in-progress queued events from previous test")); 
		}
	},0);
	seqPromise = new Deferred();
	seqPromise.resolve(true);
});

// Previous mouse position (from most recent mouseMoveTo() command)
var lastMouse = {x: 5, y: 5};

// For 2.0, remove code to set doh.robot global.
var robot = doh.robot = {
	_robotLoaded: true,
	_robotInitialized: false,
	// prime the event pump for fast browsers like Google Chrome - it's so fast, it doesn't stop to listen for keypresses!
	_spaceReceived: false,
	_primePump: false,

	_killApplet: function(){}, // overridden by Robot.html

	killRobot: function(){
		if(robot._robotLoaded){
			robot._robotLoaded = false;
			domClass.remove(document.documentElement, "dohRobot");
			robot._killApplet();
		}
	},

	// Robot init methods

	// controls access to doh.run
	// basically, doh.run takes two calls to start the robot:
	// one (or more after the robot loads) from the test page
	// one from either the applet or an error condition
	_runsemaphore: {
		lock: ["lock"],
		unlock: function(){
			try{
				return this.lock.shift();
			}catch(e){
				return null;
			}
		}
	},

	startRobot: function(){
		//startRobot should be called to initialize the robot (after the java applet is loaded).
		//one good place to do this is in a dojo.addOnLoad handler. This function will be called
		//automatically if it is not already called when doh.run() is invoked.
		if(!this._robotInitialized){
			this._robotInitialized = true;
			// if the iframe requested the applet and got a 404, then _robot is obviously unavailable
			// at least run the non-robot tests!
			if(robot._appletDead){
				robot._onKeyboard();
			}else{
				_robot._callLoaded(isSecure());
			}
		}
	},
	_initRobot: function(r){
		// called from Robot
		// Robot calls _initRobot in its startup sequence

		// Prevent rerunning the whole test (see #8958 for details)
		if(doh._initRobotCalled){ return; }
		doh._initRobotCalled = true;

		// add dohRobot class to HTML element so tests can use that in CSS rules if desired
		domClass.add(document.documentElement, "dohRobot");
		window.scrollTo(0, 0);
//		document.documentElement.scrollTop = document.documentElement.scrollLeft = 0;
		_robot = r;
		_robot._setKey(isSecure());
		// lazy load
		doh.run();
	},

	// some utility functions to help the iframe use private variables
	_run: function(frame){
		frame.style.visibility = "hidden";
		doh.run = _run;
		doh.run();
	},

	_initKeyboard: function(){
		_robot._initKeyboard(isSecure());
	},

	_initWheel: function(){
		_robot._initWheel(isSecure());
	},

	_setDocumentBounds: function(docScreenX, docScreenY){
		var robotView = document.getElementById("dohrobotview");
		_robot.setDocumentBounds(isSecure(), Number(docScreenX), Number(docScreenY), Number(robotView.offsetLeft), Number(robotView.offsetTop));
	},

	_notified: function(keystring){
		_robot._notified(isSecure(), keystring);
	},

	// if the applet is 404 or cert is denied, this becomes true and kills tests
	_appletDead: false,

	_assertRobot: function(){
		// make sure the applet is there and cert accepted
		// otherwise, skip the test requesting the robot action
		if(robot._appletDead){ throw new Error('robot not available; skipping test.'); }
	},

	_mouseMove: function(/*Number*/ x, /*Number*/ y, /*Boolean*/ absolute, /*Integer?*/ duration){
		// This function is no longer used, but left for back-compat
		if(absolute){
			var scroll = {y: (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0),
			x: (window.pageXOffset || geom.fixIeBiDiScrollLeft(document.documentElement.scrollLeft) || document.body.scrollLeft || 0)};
			y -= scroll.y;
			x -= scroll.x;
		}
		_robot.moveMouse(isSecure(), Number(x), Number(y), Number(0), Number(duration||100));
	},

	// Main robot API
	sequence: function(/*Function*/ f, /*Integer?*/ delay, /*Integer?*/ duration){
		// summary:
		//		Defer an action by adding it to the robot's incrementally delayed queue of actions to execute.
		// f:
		//		A function containing actions you want to defer.  It can return a Promise
		//		to delay further actions.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		// duration:
		//		Delay to wait after firing.

		function waitFunc(ms){
			// Returns a function that returns a Promise that fires after ms milliseconds.
			return function(){
				var timer, d;
				d = new Deferred(function(){ clearTimeout(timer); });
				timer = setTimeout(function(){ d.resolve(true); }, ms);
				return d;
			};
		}

		// Queue action to run specified function, plus optional "wait" actions for delay and duration.
		if(delay){ seqPromise = seqPromise.then(waitFunc(delay)); }
		seqPromise = seqPromise.then(f);
		if(duration){ seqPromise = seqPromise.then(waitFunc(duration)); }
	},

	typeKeys: function(/*String|Number*/ chars, /*Integer?*/ delay, /*Integer?*/ duration){
		// summary:
		//		Types a string of characters in order, or types a dojo.keys.* constant.
		// description:
		//		Types a string of characters in order, or types a dojo.keys.* constant.
		// example:
		// |	robot.typeKeys("dijit.ed", 500);
		// chars:
		//		String of characters to type, or a dojo.keys.* constant
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		// duration:
		//		Time, in milliseconds, to spend pressing all of the keys.
		//		The default is (string length)*50 ms.

		this._assertRobot();
		var isNum = typeof(chars) == Number;
		duration = duration||(isNum?50: chars.length*50);
		if(isNum){
			this.sequence(lang.partial(_keyPress, chars, chars, false, false, false, false, 0, 0),
				delay, duration);
		}else{
			for(var i = 0; i < chars.length; i++){
				this.sequence(lang.partial(_keyPress, chars.charCodeAt(i), 0, false, false, false, false, 0, 0),
					i == 0 ? delay : 0, Math.max(Math.ceil(duration/chars.length), 0));
			}
		}
	},

	keyPress: function(/*Integer*/ charOrCode, /*Integer?*/ delay, /*Object*/ modifiers, /*Boolean*/ asynchronous){
		// summary:
		//		Types a key combination, like SHIFT-TAB.
		// description:
		//		Types a key combination, like SHIFT-TAB.
		// example:
		//		to press shift-tab immediately, call robot.keyPress(dojo.keys.TAB, 0, {shift: true})
		// charOrCode:
		//		char/JS keyCode/dojo.keys.* constant for the key you want to press
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		// modifiers:
		//		JSON object that represents all of the modifier keys being pressed.
		//		It takes the following Boolean attributes:
		//
		//		- shift
		//		- alt
		//		- ctrl
		//		- meta
		// asynchronous:
		//		If true, the delay happens asynchronously and immediately, outside of the browser's JavaScript thread and any previous calls.
		//		This is useful for interacting with the browser's modal dialogs.

		this._assertRobot();
		if(!modifiers){
			modifiers = {alt:false, ctrl:false, shift:false, meta:false};
		}else{
			// normalize modifiers
			var attrs = ["alt", "ctrl", "shift", "meta"];
			for(var i = 0; i<attrs.length; i++){
				if(!modifiers[attrs[i]]){
					modifiers[attrs[i]] = false;
				}
			}
		}
		var isChar = typeof(charOrCode)=="string";
		if(asynchronous){
			_keyPress(isChar?charOrCode.charCodeAt(0):0, isChar?0:charOrCode, modifiers.alt, modifiers.ctrl, modifiers.shift, modifiers.meta, delay, true);
			return;
		}
		this.sequence(function(){
			_keyPress(isChar?charOrCode.charCodeAt(0):0, isChar?0:charOrCode, modifiers.alt, modifiers.ctrl, modifiers.shift, modifiers.meta, 0);
		}, delay);
	},

	keyDown: function(/*Integer*/ charOrCode, /*Integer?*/ delay){
		// summary:
		//		Holds down a single key, like SHIFT or 'a'.
		// description:
		//		Holds down a single key, like SHIFT or 'a'.
		// example:
		//		to hold down the 'a' key immediately, call robot.keyDown('a')
		// charOrCode:
		//		char/JS keyCode/dojo.keys.* constant for the key you want to hold down
		//		Warning: holding down a shifted key, like 'A', can have unpredictable results.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all

		this._assertRobot();
		this.sequence(function(){
			var isChar = typeof(charOrCode)=="string";
			_robot.downKey(isSecure(), isChar?charOrCode:0, isChar?0:charOrCode, 0);
		}, delay);
	},

	keyUp: function(/*Integer*/ charOrCode, /*Integer?*/ delay){
		// summary:
		//		Releases a single key, like SHIFT or 'a'.
		// description:
		//		Releases a single key, like SHIFT or 'a'.
		// example:
		//		to release the 'a' key immediately, call robot.keyUp('a')
		// charOrCode:
		//		char/JS keyCode/dojo.keys.* constant for the key you want to release
		//		Warning: releasing a shifted key, like 'A', can have unpredictable results.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all

		this._assertRobot();
		this.sequence(function(){
			var isChar=typeof(charOrCode)=="string";
			_robot.upKey(isSecure(), isChar?charOrCode:0, isChar?0:charOrCode, 0);
		}, delay);
	},


	mouseClick: function(/*Object*/ buttons, /*Integer?*/ delay){
		// summary:
		//		Convenience function to do a press/release.
		//		See robot.mousePress for more info.
		// description:
		//		Convenience function to do a press/release.
		//		See robot.mousePress for more info.

		this._assertRobot();
		robot.mousePress(buttons, delay);
		robot.mouseRelease(buttons, 1);
	},

	mousePress: function(/*Object*/ buttons, /*Integer?*/ delay){
		// summary:
		//		Presses mouse buttons.
		// description:
		//		Presses the mouse buttons you pass as true.
		//		Example: to press the left mouse button, pass {left: true}.
		//		Mouse buttons you don't specify keep their previous pressed state.
		// buttons:
		//		JSON object that represents all of the mouse buttons being pressed.
		//		It takes the following Boolean attributes:
		//
		//		- left
		//		- middle
		//		- right
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all

		this._assertRobot();
		if(!buttons){ return; }
		this.sequence(function(){
			var attrs = ["left", "middle", "right"];
			for(var i = 0; i<attrs.length; i++){
				if(!buttons[attrs[i]]){
					buttons[attrs[i]] = false;
				}
			}
			_robot.pressMouse(isSecure(), Boolean(buttons.left), Boolean(buttons.middle), Boolean(buttons.right), Number(0));
		}, delay);
	},

	mouseMoveTo: function(/*Object*/ point, /*Integer?*/ delay, /*Integer?*/ duration, /*Boolean*/ absolute){
		// summary:
		//		Move the mouse from the current position to the specified point.
		//		Delays reading contents point until queued command starts running.
		//		See mouseMove() for details.
		// point: Object
		//		x, y position relative to viewport, or if absolute == true, to document

		this._assertRobot();
		duration = duration||100;

		// Calculate number of mouse movements we will do, based on specified duration.
		// IE6-8 timers have a granularity of 15ms, so only do one mouse move every 15ms
		var steps = duration<=1 ? 1 : // duration==1 -> user wants to jump the mouse
			(duration/15)|1; // |1 to ensure an odd # of intermediate steps for sensible interpolation
		var stepDuration = Math.floor(duration/steps);

		// Starting and ending points of the mouse movement.
		var start, end;

		this.sequence(function(){
			// This runs right before we start moving the mouse.   At this time (but not before), point is guaranteed
			// to be filled w/the correct data.   So set start and end points for the movement of the mouse.
			start = lastMouse;
			if(absolute){
				// Adjust end to be relative to viewport
				var scroll = {y: (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0),
					x: (window.pageXOffset || geom.fixIeBiDiScrollLeft(document.documentElement.scrollLeft) || document.body.scrollLeft || 0)};
				end = { y: point.y - scroll.y, x: point.x - scroll.x };
			}else{
				end = point;
			}
			//console.log("mouseMoveTo() start, going from (", lastMouse.x, lastMouse.y, "), (", end.x, end.y, "), delay = " +
			//	delay + ", duration = " + duration);
		}, delay || 0);

		// Function to positions the mouse along the line from start to end at the idx'th position (from 0 .. steps)
		function step(idx){
			function easeInOutQuad(/*Number*/ t, /*Number*/ b, /*Number*/ c, /*Number*/ d){
				t /= d / 2;
				if(t < 1)
					return Math.round(c / 2 * t * t + b);
				t--;
				return Math.round(-c / 2 * (t * (t - 2) - 1) + b);
			}

			var x = idx == steps ? end.x : easeInOutQuad(idx, start.x, end.x - start.x, steps),
				y = idx == steps ? end.y : easeInOutQuad(idx, start.y, end.y - start.y, steps);

			// If same position as the last time, don't bother calling java robot.
			if(x == lastMouse.x && y == lastMouse.y){ return true; }

			_robot.moveMouse(isSecure(), Number(x), Number(y), Number(0), Number(1));
			lastMouse = {x: x, y: y};
		}

		// Schedule mouse moves from beginning to end of line.
		// Start from t=1 because there's no need to move the mouse to where it already is
		for (var t = 1; t <= steps; t++){
			// Use lang.partial() to lock in value of t before the t++
			this.sequence(lang.partial(step, t), 0, stepDuration);
		}
	},

	mouseMove: function(/*Number*/ x, /*Number*/ y, /*Integer?*/ delay, /*Integer?*/ duration, /*Boolean*/ absolute){
		// summary:
		//		Moves the mouse to the specified x,y offset relative to the viewport.
		// x:
		//		x offset relative to the viewport, in pixels, to move the mouse.
		// y:
		//		y offset relative to the viewport, in pixels, to move the mouse.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		// |		robot.mouseClick({left: true}, 100) // first call; wait 100ms
		// |		robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		// duration:
		//		Approximate time Robot will spend moving the mouse
		//		The default is 100ms. This also affects how many mousemove events will
		//		be generated, which is the log of the duration.
		// absolute:
		//		Boolean indicating whether the x and y values are absolute coordinates.
		//		If false, then mouseMove expects that the x,y will be relative to the window. (clientX/Y)
		//		If true, then mouseMove expects that the x,y will be absolute. (pageX/Y)

		this.mouseMoveTo({x: x, y: y}, delay, duration, absolute);
	},

	mouseRelease: function(/*Object*/ buttons, /*Integer?*/ delay){
		// summary:
		//		Releases mouse buttons.
		// description:
		//		Releases the mouse buttons you pass as true.
		//		Example: to release the left mouse button, pass {left: true}.
		//		Mouse buttons you don't specify keep their previous pressed state.
		//		See robot.mousePress for more info.

		this._assertRobot();
		if(!buttons){ return; }
		this.sequence(function(){
			var attrs = ["left", "middle", "right"];
			for(var i = 0; i<attrs.length; i++){
				if(!buttons[attrs[i]]){
					buttons[attrs[i]] = false;
				}
			}
			_robot.releaseMouse(isSecure(), Boolean(buttons.left), Boolean(buttons.middle), Boolean(buttons.right), Number(0));
		}, delay);
	},

	// mouseWheelSize: Integer value that determines the amount of wheel motion per unit
	mouseWheelSize: 1,

	mouseWheel: function(/*Number*/ wheelAmt, /*Integer?*/ delay, /*Integer?*/ duration){
		// summary:
		//		Spins the mouse wheel.
		// description:
		//		Spins the wheel wheelAmt "notches."
		//		Negative wheelAmt scrolls up/away from the user.
		//		Positive wheelAmt scrolls down/toward the user.
		//		Note: this will all happen in one event.
		//		Warning: the size of one mouse wheel notch is an OS setting.
		//		You can access this size from robot.mouseWheelSize
		// wheelAmt:
		//		Number of notches to spin the wheel.
		//		Negative wheelAmt scrolls up/away from the user.
		//		Positive wheelAmt scrolls down/toward the user.
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			robot.mouseClick({left: true}, 100) // first call; wait 100ms
		//			robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		// duration:
		//		Approximate time Robot will spend moving the mouse
		//		By default, the Robot will wheel the mouse as fast as possible.

		this._assertRobot();
		if(!wheelAmt){ return; }
		this.sequence(function(){
			_robot.wheelMouse(isSecure(), Number(wheelAmt), Number(0), Number(duration||0));
		}, delay, duration);
	},

	setClipboard: function(/*String*/ data,/*String?*/ format){
		// summary:
		//		Set clipboard content.
		// description:
		//		Set data as clipboard content, overriding anything already there. The
		//		data will be put to the clipboard using the given format.
		// data:
		//		New clipboard content to set
		// format:
		//		Set this to "text/html" to put richtext to the clipboard.
		//		Otherwise, data is treated as plaintext. By default, plaintext
		//		is used.
		if(format==='text/html'){
			_robot.setClipboardHtml(isSecure(), data);
		}else{
			_robot.setClipboardText(isSecure(), data);
		}
	}
};

// After page has finished loading, create the applet iframe.
// Note: could eliminate dojo/ready dependency by tying this code to startRobot() call, but then users
// are required to put doh.run() inside of a dojo/ready.   Probably they are already doing that though.
ready(function(){
	// console.log("creating applet iframe");
	var iframesrc;
	var scripts = document.getElementsByTagName("script");
	for(var x = 0; x<scripts.length; x++){
		var s = scripts[x].getAttribute('src');
		if(s && (s.substr(s.length-9) == "runner.js")){
			iframesrc = s.substr(0, s.length-9)+'Robot.html';
			break;
		}
	}

	if(!iframesrc){
		// if user set document.domain to something else, send it to the Robot too
		iframesrc = require.toUrl("./Robot.html") + "?domain=" + escape(document.domain);
	}
	construct.place('<div id="dohrobotview" style="border:0px none; margin:0px; padding:0px; position:absolute; bottom:0px; right:0px; width:1px; height:1px; overflow:hidden; visibility:hidden; background-color:red;"></div>',
		win.body());

	construct.place('<iframe application="true" style="border:0px none; z-index:32767; padding:0px; margin:0px; position:absolute; left:0px; top:0px; height:100px; width:200px; overflow:hidden; background-color:transparent;" tabIndex="-1" src="'+iframesrc+'" ALLOWTRANSPARENCY="true"></iframe>',
		win.body());
});

// If user did not manually call startRobot(), then call it when doh.run() is called.
var _run = doh.run;
doh.run = function(){
	if(!robot._runsemaphore.unlock()){
		// hijack doh._onEnd to clear the applet
		// have to do it here because browserRunner sets it in onload in standalone case
		var __onEnd = doh._onEnd;
		doh._onEnd = function(){
			robot.killRobot();
			doh._onEnd = __onEnd;
			doh._onEnd();
		};
		robot.startRobot();
	}
};

// Setup to kill robot on page unload.
// Maybe this should be done from startRobot() instead?
unload.addOnUnload(function(){
	robot.killRobot();
});

return robot;
});
