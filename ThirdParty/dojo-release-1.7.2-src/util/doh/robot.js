define(["doh/_browserRunner", "require"], function(doh, require){

	// loading state
	var _robot = null;

	var isSecure = (function(){
		var key = Math.random();
		return function(fcn){
			return key;
		};
	})();

	// no dojo available
	// hijack doh.run instead
	var _run = doh.run;
	doh.run = function(){
		if(!doh.robot._runsemaphore.unlock()){
			// hijack doh._onEnd to clear the applet
			// have to do it here because browserRunner sets it in onload in standalone case
			var __onEnd = doh._onEnd;
			doh._onEnd = function(){
				doh.robot.killRobot();
				doh._onEnd = __onEnd;
				doh._onEnd();
			};
			doh.robot.startRobot();
		}
	};

	var cleanup=function(){
		doh.robot.killRobot();
	}
	if(typeof dojo !== 'undefined'){
		dojo.addOnUnload(cleanup)
	}else{
		window.onunload=cleanup;
	}
	var _keyPress = function(/*Number*/ charCode, /*Number*/ keyCode, /*Boolean*/ alt, /*Boolean*/ ctrl, /*Boolean*/ shift, /*Boolean*/ meta, /*Integer, optional*/ delay, /*Boolean*/ async){
		// internal function to type one non-modifier key

		// typecasting Numbers helps Sun's IE plugin lookup methods that take int arguments

		// otherwise JS will send a double and Sun will complain
		_robot.typeKey(isSecure(), Number(charCode), Number(keyCode), Boolean(alt), Boolean(ctrl), Boolean(shift), Boolean(meta), Number(delay||0), Boolean(async||false));
	};

	doh.robot = {
	_robotLoaded: true,
	_robotInitialized: false,
	// prime the event pump for fast browsers like Google Chrome - it's so fast, it doesn't stop to listen for keypresses!
	_spaceReceived: false,
	_primePump: false,

	_killApplet: function(){}, // overridden by Robot.html

	killRobot: function(){
		if(doh.robot._robotLoaded){
			doh.robot._robotLoaded = false;
			document.documentElement.className = document.documentElement.className.replace(/ ?dohRobot/, "");
			doh.robot._killApplet();
		}
	},

	// Robot init methods

	// controls access to doh.run
	// basically, doh.run takes two calls to start the robot:
	// one (or more after the robot loads) from the test page
	// one from either the applet or an error condition
	_runsemaphore: {
		lock:["lock"],
		unlock:function(){
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
			if(doh.robot._appletDead){
				doh.robot._onKeyboard();
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
		document.documentElement.className += " dohRobot";
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

	_time:0,

	// if the applet is 404 or cert is denied, this becomes true and kills tests
	_appletDead:false,

	_assertRobot:function(){
		// make sure the applet is there and cert accepted
		// otherwise, skip the test requesting the robot action
		if(doh.robot._appletDead){ throw new Error('doh.robot not available; skipping test.'); }
	},

	_mouseMove: function(/*Number*/ x, /*Number*/ y, /*Boolean*/ absolute, /*Integer, optional*/ duration){
		if(absolute){
			var scroll = {y: (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0),
			x: (window.pageXOffset || (window["dojo"]?dojo._fixIeBiDiScrollLeft(document.documentElement.scrollLeft):undefined) || document.body.scrollLeft || 0)};
			y -= scroll.y;
			x -= scroll.x;
		}
		_robot.moveMouse(isSecure(), Number(x), Number(y), Number(0), Number(duration||100));
	},

	// Main doh.robot API
	sequence:function(/*Function*/ f, /*Integer, optional*/ delay, /*Integer, optional*/ duration){
		// summary:
		//		Defer an action by adding it to the robot's incrementally delayed queue of actions to execute.
		//
		// f:
		//		A function containing actions you want to defer.
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//
		// duration:
		//		Delay to wait after firing.
		//

		var currentTime = (new Date()).getTime();
		if(currentTime > (doh.robot._time || 0)){
			doh.robot._time = currentTime;
		}
		doh.robot._time += delay || 1;
		setTimeout(f, doh.robot._time - currentTime);
		doh.robot._time += duration || 0;
	},

	typeKeys: function(/*String||Number*/ chars, /*Integer, optional*/ delay, /*Integer, optional*/ duration){
		// summary:
		//		Types a string of characters in order, or types a dojo.keys.* constant.
		//
		// description:
		// 		Types a string of characters in order, or types a dojo.keys.* constant.
		// 		Example: doh.robot.typeKeys("dijit.ed", 500);
		//
		// chars:
		//		String of characters to type, or a dojo.keys.* constant
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//
		// duration:
		//		Time, in milliseconds, to spend pressing all of the keys.
		//		The default is (string length)*50 ms.
		//

		this._assertRobot();
		this.sequence(function(){
			var isNum = typeof(chars) == Number;
			duration=duration||(isNum?50:chars.length*50);
			if(isNum){
				_keyPress(chars, chars, false, false, false, false, 0);
			}else if(chars.length){
				_keyPress(chars.charCodeAt(0), 0, false, false, false, false, 0);
				for(var i = 1; i<chars.length; i++){
					_keyPress(chars.charCodeAt(i), 0, false, false, false, false, Math.max(Math.floor(duration/chars.length), 0));
				}
			}
		}, delay, duration);
	},

	keyPress: function(/*Integer*/ charOrCode, /*Integer, optional*/ delay, /*Object*/ modifiers, /*Boolean*/ asynchronous){
		// summary:
		//		Types a key combination, like SHIFT-TAB.
		//
		// description:
		// 		Types a key combination, like SHIFT-TAB.
		// 		Example: to press shift-tab immediately, call doh.robot.keyPress(dojo.keys.TAB, 0, {shift:true})
		//
		// charOrCode:
		//		char/JS keyCode/dojo.keys.* constant for the key you want to press
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//
		// modifiers:
		//		JSON object that represents all of the modifier keys being pressed.
		//		It takes the following Boolean attributes:
		//			- shift
		//			- alt
		//			- ctrl
		//			- meta
		//
		// asynchronous:
		//		If true, the delay happens asynchronously and immediately, outside of the browser's JavaScript thread and any previous calls.
		//		This is useful for interacting with the browser's modal dialogs.
		//

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
		},delay);
	},

	keyDown: function(/*Integer*/ charOrCode, /*Integer, optional*/ delay){
		// summary:
		//		Holds down a single key, like SHIFT or 'a'.
		//
		// description:
		// 		Holds down a single key, like SHIFT or 'a'.
		// 		Example: to hold down the 'a' key immediately, call doh.robot.keyDown('a')
		//
		// charOrCode:
		//		char/JS keyCode/dojo.keys.* constant for the key you want to hold down
		//		Warning: holding down a shifted key, like 'A', can have unpredictable results.
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//

		this._assertRobot();
		this.sequence(function(){
			var isChar = typeof(charOrCode)=="string";
			_robot.downKey(isSecure(), isChar?charOrCode:0, isChar?0:charOrCode, 0);
		},delay);
	},

	keyUp: function(/*Integer*/ charOrCode, /*Integer, optional*/ delay){
		// summary:
		//		Releases a single key, like SHIFT or 'a'.
		//
		// description:
		// 		Releases a single key, like SHIFT or 'a'.
		// 		Example: to release the 'a' key immediately, call doh.robot.keyUp('a')
		//
		// charOrCode:
		//		char/JS keyCode/dojo.keys.* constant for the key you want to release
		//		Warning: releasing a shifted key, like 'A', can have unpredictable results.
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//

		this._assertRobot();
		this.sequence(function(){
			var isChar=typeof(charOrCode)=="string";
			_robot.upKey(isSecure(), isChar?charOrCode:0, isChar?0:charOrCode, 0);
		},delay);
	},


	mouseClick: function(/*Object*/ buttons, /*Integer, optional*/ delay){
		// summary:
		//		Convenience function to do a press/release.
		//		See doh.robot.mousePress for more info.
		//
		// description:
		//		Convenience function to do a press/release.
		//		See doh.robot.mousePress for more info.
		//

		this._assertRobot();
		doh.robot.mousePress(buttons, delay);
		doh.robot.mouseRelease(buttons, 1);
	},

	mousePress: function(/*Object*/ buttons, /*Integer, optional*/ delay){
		// summary:
		// 		Presses mouse buttons.
		// description:
		// 		Presses the mouse buttons you pass as true.
		// 		Example: to press the left mouse button, pass {left:true}.
		// 		Mouse buttons you don't specify keep their previous pressed state.
		//
		// buttons:	JSON object that represents all of the mouse buttons being pressed.
		//		It takes the following Boolean attributes:
		//			- left
		//			- middle
		//			- right
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//

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
		},delay);
	},

	mouseMove: function(/*Number*/ x, /*Number*/ y, /*Integer, optional*/ delay, /*Integer, optional*/ duration, /*Boolean*/ absolute){
		// summary:
		// 		Moves the mouse to the specified x,y offset relative to the viewport.
		//
		// x:
		//		x offset relative to the viewport, in pixels, to move the mouse.
		//
		// y:
		//		y offset relative to the viewport, in pixels, to move the mouse.
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//
		// duration:
		//		Approximate time Robot will spend moving the mouse
		//		The default is 100ms. This also affects how many mousemove events will
		//		be generated, which is the log of the duration.
		//
		// absolute:
		//		Boolean indicating whether the x and y values are absolute coordinates.
		//		If false, then mouseMove expects that the x,y will be relative to the window. (clientX/Y)
		//		If true, then mouseMove expects that the x,y will be absolute. (pageX/Y)
		//

		this._assertRobot();
		duration = duration||100;
		this.sequence(function(){
			doh.robot._mouseMove(x, y, absolute, duration);
		},delay,duration);
	},

	mouseRelease: function(/*Object*/ buttons, /*Integer, optional*/ delay){
		// summary:
		// 		Releases mouse buttons.
		//
		// description:
		// 		Releases the mouse buttons you pass as true.
		// 		Example: to release the left mouse button, pass {left:true}.
		// 		Mouse buttons you don't specify keep their previous pressed state.
		//		See doh.robot.mousePress for more info.
		//

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
		},delay);
	},

	// mouseWheelSize: Integer value that determines the amount of wheel motion per unit
	mouseWheelSize: 1,

	mouseWheel: function(/*Number*/ wheelAmt, /*Integer, optional*/ delay, /*Integer, optional*/ duration){
		// summary:
		//		Spins the mouse wheel.
		//
		// description:
		// 		Spins the wheel wheelAmt "notches."
		// 		Negative wheelAmt scrolls up/away from the user.
		// 		Positive wheelAmt scrolls down/toward the user.
		// 		Note: this will all happen in one event.
		// 		Warning: the size of one mouse wheel notch is an OS setting.
		//		You can accesss this size from doh.robot.mouseWheelSize
		//
		// wheelAmt:
		//		Number of notches to spin the wheel.
		// 		Negative wheelAmt scrolls up/away from the user.
		// 		Positive wheelAmt scrolls down/toward the user.
		//
		// delay:
		//		Delay, in milliseconds, to wait before firing.
		//		The delay is a delta with respect to the previous automation call.
		//		For example, the following code ends after 600ms:
		//			doh.robot.mouseClick({left:true}, 100) // first call; wait 100ms
		//			doh.robot.typeKeys("dij", 500) // 500ms AFTER previous call; 600ms in all
		//
		// duration:
		//		Approximate time Robot will spend moving the mouse
		//		By default, the Robot will wheel the mouse as fast as possible.
		//


		this._assertRobot();
		if(!wheelAmt){ return; }
		this.sequence(function(){
			_robot.wheelMouse(isSecure(), Number(wheelAmt), Number(0), Number(duration||0));
		},delay,duration);
	},

	setClipboard: function(/*String*/data,/*String, optional*/format){
		// summary:
		//		Set clipboard content.
		//
		// description:
		// 		Set data as clipboard content, overriding anything already there. The
		//		data will be put to the clipboard using the given format.
		//
		// data:
		//		New clipboard content to set
		//
		// format:
		//		Set this to "text/html" to put richtext to the clipboard.
		//		Otherwise, data is treated as plaintext. By default, plaintext
		//		is used.
		if(format==='text/html'){
			_robot.setClipboardHtml(isSecure(),data);
		}else{
			_robot.setClipboardText(isSecure(),data);
		}
	}
	};

	// the applet itself
	// needs to be down here so the handlers are set up
	var iframesrc;
	var scripts = document.getElementsByTagName("script");
	for(var x = 0; x<scripts.length; x++){
		var s = scripts[x].getAttribute('src');
		if(s && (s.substr(s.length-9) == "runner.js")){
			iframesrc = s.substr(0, s.length-9)+'Robot.html';
			break;
		}
	}
	// if loaded with dojo, there might not be a runner.js!
	if(!iframesrc && window["dojo"]){
		// if user set document.domain to something else, send it to the Robot too
		iframesrc = require.toUrl("./Robot.html") + "?domain=" + escape(document.domain);
	}
	document.writeln('<div id="dohrobotview" style="border:0px none; margin:0px; padding:0px; position:absolute; bottom:0px; right:0px; width:1px; height:1px; overflow:hidden; visibility:hidden; background-color:red;"></div>'+
		'<iframe application="true" style="border:0px none; z-index:32767; padding:0px; margin:0px; position:absolute; left:0px; top:0px; height:42px; width:200px; overflow:hidden; background-color:transparent;" tabIndex="-1" src="'+iframesrc+'" ALLOWTRANSPARENCY="true"></iframe>');
});
