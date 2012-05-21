define(["dojo/_base/lang","dojo/_base/declare","dojo/_base/array","dojo/_base/event","dojo/_base/connect",
	"dojo/dom-class","dojo/_base/window","./Mover"], 
  function(lang,declare,arr,event,connect,domClass,win,Mover){
	return declare("dojox.gfx.Moveable", null, {
		constructor: function(shape, params){
			// summary: an object, which makes a shape moveable
			// shape: dojox.gfx.Shape: a shape object to be moved
			// params: Object: an optional object with additional parameters;
			//	following parameters are recognized:
			//		delay: Number: delay move by this number of pixels
			//		mover: Object: a constructor of custom Mover
			this.shape = shape;
			this.delay = (params && params.delay > 0) ? params.delay : 0;
			this.mover = (params && params.mover) ? params.mover : Mover;
			this.events = [
				this.shape.connect("onmousedown", this, "onMouseDown")
				// cancel text selection and text dragging
				//, dojo.connect(this.handle, "ondragstart",   dojo, "stopEvent")
				//, dojo.connect(this.handle, "onselectstart", dojo, "stopEvent")
			];
		},
	
		// methods
		destroy: function(){
			// summary: stops watching for possible move, deletes all references, so the object can be garbage-collected
			arr.forEach(this.events, this.shape.disconnect, this.shape);
			this.events = this.shape = null;
		},
	
		// mouse event processors
		onMouseDown: function(e){
			// summary: event processor for onmousedown, creates a Mover for the shape
			// e: Event: mouse event
			if(this.delay){
				this.events.push(
					this.shape.connect("onmousemove", this, "onMouseMove"),
					this.shape.connect("onmouseup", this, "onMouseUp"));
				this._lastX = e.clientX;
				this._lastY = e.clientY;
			}else{
				new this.mover(this.shape, e, this);
			}
			event.stop(e);
		},
		onMouseMove: function(e){
			// summary: event processor for onmousemove, used only for delayed drags
			// e: Event: mouse event
			if(Math.abs(e.clientX - this._lastX) > this.delay || Math.abs(e.clientY - this._lastY) > this.delay){
				this.onMouseUp(e);
				new this.mover(this.shape, e, this);
			}
			event.stop(e);
		},
		onMouseUp: function(e){
			// summary: event processor for onmouseup, used only for delayed delayed drags
			// e: Event: mouse event
			this.shape.disconnect(this.events.pop());
			this.shape.disconnect(this.events.pop());
		},
	
		// local events
		onMoveStart: function(/* dojox.gfx.Mover */ mover){
			// summary: called before every move operation
			connect.publish("/gfx/move/start", [mover]);
			domClass.add(win.body(), "dojoMove");
		},
		onMoveStop: function(/* dojox.gfx.Mover */ mover){
			// summary: called after every move operation
			connect.publish("/gfx/move/stop", [mover]);
			domClass.remove(win.body(), "dojoMove");
		},
		onFirstMove: function(/* dojox.gfx.Mover */ mover){
			// summary: called during the very first move notification,
			//	can be used to initialize coordinates, can be overwritten.
	
			// default implementation does nothing
		},
		onMove: function(/* dojox.gfx.Mover */ mover, /* Object */ shift){
			// summary: called during every move notification,
			//	should actually move the node, can be overwritten.
			this.onMoving(mover, shift);
			this.shape.applyLeftTransform(shift);
			this.onMoved(mover, shift);
		},
		onMoving: function(/* dojox.gfx.Mover */ mover, /* Object */ shift){
			// summary: called before every incremental move,
			//	can be overwritten.
	
			// default implementation does nothing
		},
		onMoved: function(/* dojox.gfx.Mover */ mover, /* Object */ shift){
			// summary: called after every incremental move,
			//	can be overwritten.
	
			// default implementation does nothing
		}
	});
});
