define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"./Base",
	"../main"
], function(kernel, declare, Base, dojox){
// module:
//		dojox/gesture/swipe

/*=====
	dojox.gesture.swipe = {
		// summary:
		//		This module provides swipe gestures including:
		//
		//		####dojox.gesture.swipe
		//
		//		A series of 'swipe' will be fired during touchmove, this will mostly
		//		be used to keep sliding the Dom target based on the swiped distance(dx, dy).
		//
		//		####dojox.gesture.swipe.end
		//	
		//		Fired when a swipe is ended so that an bounce animation may be applied
		//		to the dom target sliding to the final position.
		//
		//		Following information will be included in the fired swipe events:
		//
		//		1. type: 'swipe'|'swipe.end'
		//		2. time: an integer indicating the delta time(in milliseconds)
		//		3. dx: delta distance on X axis, dx less than 0 - moving left, dx larger than 0 - moving right
		//		4. dy: delta distance on Y axis, dy less than 0 - moving up, dY larger than 0 - moving down
		//
		//		Note - dx and dy can also be used together for a hybrid swipe(both vertically and horizontally)
		//
		// example:
		//		A. Used with dojo.connect()
		//		|	dojo.connect(node, dojox.gesture.swipe, function(e){});
		//		|	dojo.connect(node, dojox.gesture.swipe.end, function(e){});
		//
		//		B. Used with dojo.on
		//		|	define(['dojo/on', 'dojox/gesture/swipe'], function(on, swipe){
		//		|		on(node, swipe, function(e){});
		//		|		on(node, swipe.end, function(e){});
		//
		//		C. Used with dojox.gesture.swipe.* directly
		//		|	dojox.gesture.swipe(node, function(e){});
		//		|	dojox.gesture.swipe.end(node, function(e){});
	};
=====*/

kernel.experimental("dojox.gesture.swipe");

// Declare an internal anonymous class which will only be exported
// by module return value e.g. dojox.gesture.swipe.Swipe
var clz = declare(/*===== "dojox.gesture.swipe", =====*/Base, {

	// defaultEvent: [readonly] String
	//		Default event - 'swipe'
	defaultEvent: "swipe",

	// subEvents: [readonly] Array
	//		List of sub events, used by 
	//		being combined with defaultEvent as 'swipe.end'
	subEvents: ["end"],

	press: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, set initial swipe info
		if(e.touches && e.touches.length >= 2){
			//currently only support single-touch swipe
			delete data.context;
			return;
		}
		if(!data.context){
			data.context = {x: 0, y: 0, t: 0};
		}
		data.context.x = e.screenX;
		data.context.y = e.screenY;
		data.context.t = new Date().getTime();
		this.lock(e.currentTarget);
	},
	move: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, fire matched 'swipe' during touchmove
		this._recognize(data, e, "swipe");
	},
	release: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, fire matched 'swipe.end' when touchend
		this._recognize(data, e, "swipe.end");		
		delete data.context;
		this.unLock();
	},
	cancel: function(data, e){
		// summary:
		//		Overwritten
		delete data.context;
		this.unLock();
	},
	_recognize: function(/*Object*/data, /*Event*/e, /*String*/type){
		// summary:
		//		Recognize and fire appropriate gesture events
		if(!data.context){
			return;
		}
		var info = this._getSwipeInfo(data, e);
		if(!info){
			// no swipe happened
			return;
		}
		info.type = type;
		this.fire(e.target, info);
	},
	_getSwipeInfo: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Calculate swipe information - time, dx and dy
		var dx, dy, info = {}, startData = data.context;
		
		info.time = new Date().getTime() - startData.t;
		
		dx = e.screenX - startData.x;
		dy = e.screenY - startData.y;
		
		if(dx === 0 && dy === 0){
			// no swipes happened
			return null;
		}
		info.dx = dx;
		info.dy = dy;
		return info;
	}
});

// the default swipe instance for handy use
dojox.gesture.swipe = new clz();
// Class for creating a new Swipe instance
dojox.gesture.swipe.Swipe = clz;

return dojox.gesture.swipe;

});