define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./Base",
	"../main"
], function(kernel, declare, lang, Base, dojox){
// module:
//		dojox/gesture/tap
	
/*=====
	dojox.gesture.tap = {
		// summary:
		//		This module provides tap gesture event handlers:
		//
		//		1. dojox.gesture.tap: 'tap' event
		//
		//		2. dojox.gesture.tap.hold: 'tap.hold' event
		//
		//		3. dojox.gesture.tap.doubletap: 'tap.doubletap' event
		//
		// example:
		//		A. Used with dojo.connect()
		//		|	dojo.connect(node, dojox.gesture.tap, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.hold, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.doubletap, function(e){});
		//
		//		B. Used with dojo.on
		//		|	define(['dojo/on', 'dojox/gesture/tap'], function(on, tap){
		//		|		on(node, tap, function(e){});
		//		|		on(node, tap.hold, function(e){});
		//		|		on(node, tap.doubletap, function(e){});
		//
		//		C. Used with dojox.gesture.tap.* directly
		//		|	dojox.gesture.tap(node, function(e){});
		//		|	dojox.gesture.tap.hold(node, function(e){});
		//		|	dojox.gesture.tap.doubletap(node, function(e){});
		//
		//		Though there is always a default gesture instance after being required, e.g
		//		|	require(['dojox/gesture/tap'], function(){...});
		//
		//		It's possible to create a new one with different parameter setting:
		//		|	var myTap = new dojox.gesture.tap.Tap({holdThreshold: 300});
		//		|	dojo.connect(node, myTap, function(e){});
		//		|	dojo.connect(node, myTap.hold, function(e){});
		//		|	dojo.connect(node, myTap.doubletap, function(e){});
	};
=====*/

kernel.experimental("dojox.gesture.tap");

// Declare an internal anonymous class which will only be exported
// by module return value e.g. dojox.gesture.tap.Tap
var clz = declare(/*===== "dojox.gesture.tap", =====*/Base, {
	// defaultEvent: [readonly] String
	//		Default event - 'tap'
	defaultEvent: "tap",

	// subEvents: [readonly] Array
	//		List of sub events, used by being
	//		combined with defaultEvent as 'tap.hold', 'tap.doubletap'.
	subEvents: ["hold", "doubletap"],

	// holdThreshold: Integer
	//		Threshold(in milliseconds) for 'tap.hold'
	holdThreshold: 500,

	// holdThreshold: Integer
	//		Timeout (in milliseconds) for 'tap.doubletap'
	doubleTapTimeout: 250,

	// tapRadius: Integer
	//		Valid tap radius from previous touch point
	tapRadius: 10,

	press: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, record initial tap info and register a timeout checker for 'tap.hold'
		if(e.touches && e.touches.length >= 2){
			//tap gesture is only for single touch
			clearTimeout(data.tapTimeOut); 
			delete data.context;
			return;
		}
		var target = e.target;
		this._initTap(data, e);
		data.tapTimeOut = setTimeout(lang.hitch(this, function(){
			if(this._isTap(data, e)){
				this.fire(target, {type: "tap.hold"});
			}
			delete data.context;
		}), this.holdThreshold);
	},
	release: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, fire matched 'tap' or 'tap.doubletap' during touchend
		if(!data.context){
			clearTimeout(data.tapTimeOut);
			return;
		}
		if(this._isTap(data, e)){
			switch(data.context.c){
			case 1: 
				this.fire(e.target, {type: "tap"});
				break;
			case 2:
				this.fire(e.target, {type: "tap.doubletap"});
				break;
			}
		}
		clearTimeout(data.tapTimeOut);
	},
	_initTap: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Update the gesture data with new tap info 
		if(!data.context){
			data.context = {x: 0, y: 0, t: 0, c: 0};
		}
		var ct = new Date().getTime();
		if(ct - data.context.t <= this.doubleTapTimeout){
			data.context.c++;
		}else{
			data.context.c = 1;
			data.context.x = e.screenX;
			data.context.y = e.screenY;
		}
		data.context.t = ct;
	},
	_isTap: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Check whether it's an valid tap
		var dx = Math.abs(data.context.x - e.screenX);
		var dy = Math.abs(data.context.y - e.screenY);
		return dx <= this.tapRadius && dy <= this.tapRadius;
	}
});

// the default tap instance for handy use
dojox.gesture.tap = new clz();
// Class for creating a new Tap instance
dojox.gesture.tap.Tap = clz;

return dojox.gesture.tap;

});