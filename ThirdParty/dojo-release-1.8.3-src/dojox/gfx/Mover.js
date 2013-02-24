define(["dojo/_base/lang","dojo/_base/array", "dojo/_base/declare", "dojo/on", "dojo/has", "dojo/_base/event"],
  function(lang, arr, declare, on, has, event){
	return declare("dojox.gfx.Mover", null, {
		constructor: function(shape, e, host){
			// summary:
			//		an object, which makes a shape follow the mouse,
			//		used as a default mover, and as a base class for custom movers
			// shape: dojox/gfx.Shape
			//		a shape object to be moved
			// e: Event
			//		a mouse event, which started the move;
			//		only clientX and clientY properties are used
			// host: Object?
			//		object which implements the functionality of the move,
			//		 and defines proper events (onMoveStart and onMoveStop)
			this.shape = shape;
			this.lastX = has("touch") ? (e.changedTouches ? e.changedTouches[0] : e).clientX : e.clientX;
			this.lastY = has("touch") ? (e.changedTouches ? e.changedTouches[0] : e).clientY : e.clientY;
			var h = this.host = host, d = document,
				firstEvent = on(d, has("touch") ? "touchmove" : "mousemove", lang.hitch(this, "onFirstMove"));
			this.events = [
				on(d, has("touch") ? "touchmove" : "mousemove",    lang.hitch(this, "onMouseMove")),
				on(d, has("touch") ? "touchend" : "mouseup", lang.hitch(this, "destroy")),
				// cancel text selection and text dragging
				on(d, "dragstart",   lang.hitch(event, "stop")),
				on(d, "selectstart", lang.hitch(event, "stop")),
				firstEvent
			];
			// notify that the move has started
			if(h && h.onMoveStart){
				h.onMoveStart(this);
			}
		},
		// mouse event processors
		onMouseMove: function(e){
			// summary:
			//		event processor for onmousemove
			// e: Event
			//		mouse event
			var x = has("touch") ? (e.changedTouches ? e.changedTouches[0] : e).clientX : e.clientX;
			var y = has("touch") ? (e.changedTouches ? e.changedTouches[0] : e).clientY : e.clientY;
			this.host.onMove(this, {dx: x - this.lastX, dy: y - this.lastY});
			this.lastX = x;
			this.lastY = y;
			event.stop(e);
		},
		// utilities
		onFirstMove: function(){
			// summary:
			//		it is meant to be called only once
			this.host.onFirstMove(this);
			this.events.pop().remove();
		},
		destroy: function(){
			// summary:
			//		stops the move, deletes all references, so the object can be garbage-collected
			arr.forEach(this.events, function(h){h.remove();});
			// undo global settings
			var h = this.host;
			if(h && h.onMoveStop){
				h.onMoveStop(this);
			}
			// destroy objects
			this.events = this.shape = null;
		}
	});
});
