define(["../main", "../Evented", "../touch", "./Mover"], function(dojo, Evented, touch) {
	// module:
	//		dojo/dnd/Moveable
	// summary:
	//		TODOC


/*=====
dojo.declare("dojo.dnd.__MoveableArgs", [], {
	// handle: Node||String
	//		A node (or node's id), which is used as a mouse handle.
	//		If omitted, the node itself is used as a handle.
	handle: null,

	// delay: Number
	//		delay move by this number of pixels
	delay: 0,

	// skip: Boolean
	//		skip move of form elements
	skip: false,

	// mover: Object
	//		a constructor of custom Mover
	mover: dojo.dnd.Mover
});
=====*/

dojo.declare("dojo.dnd.Moveable", [Evented], {
	// object attributes (for markup)
	handle: "",
	delay: 0,
	skip: false,

	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.__MoveableArgs?
		//		optional parameters
		this.node = dojo.byId(node);
		if(!params){ params = {}; }
		this.handle = params.handle ? dojo.byId(params.handle) : null;
		if(!this.handle){ this.handle = this.node; }
		this.delay = params.delay > 0 ? params.delay : 0;
		this.skip  = params.skip;
		this.mover = params.mover ? params.mover : dojo.dnd.Mover;
		this.events = [
			dojo.connect(this.handle, touch.press, this, "onMouseDown"),
			// cancel text selection and text dragging
			dojo.connect(this.handle, "ondragstart",   this, "onSelectStart"),
			dojo.connect(this.handle, "onselectstart", this, "onSelectStart")
		];
	},

	// markup methods
	markupFactory: function(params, node, ctor){
		return new ctor(node, params);
	},

	// methods
	destroy: function(){
		// summary:
		//		stops watching for possible move, deletes all references, so the object can be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		this.events = this.node = this.handle = null;
	},

	// mouse event processors
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown/ontouchstart, creates a Mover for the node
		// e: Event
		//		mouse/touch event
		if(this.skip && dojo.dnd.isFormElement(e)){ return; }
		if(this.delay){
			this.events.push(
				dojo.connect(this.handle, touch.move, this, "onMouseMove"),
				dojo.connect(this.handle, touch.release, this, "onMouseUp")
			);
			this._lastX = e.pageX;
			this._lastY = e.pageY;
		}else{
			this.onDragDetected(e);
		}
		dojo.stopEvent(e);
	},
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove, used only for delayed drags
		// e: Event
		//		mouse/touch event
		if(Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay){
			this.onMouseUp(e);
			this.onDragDetected(e);
		}
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup, used only for delayed drags
		// e: Event
		//		mouse event
		for(var i = 0; i < 2; ++i){
			dojo.disconnect(this.events.pop());
		}
		dojo.stopEvent(e);
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skip || !dojo.dnd.isFormElement(e)){
			dojo.stopEvent(e);
		}
	},

	// local events
	onDragDetected: function(/* Event */ e){
		// summary:
		//		called when the drag is detected;
		//		responsible for creation of the mover
		new this.mover(this.node, e, this);
	},
	onMoveStart: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called before every move operation
		dojo.publish("/dnd/move/start", [mover]);
		dojo.addClass(dojo.body(), "dojoMove");
		dojo.addClass(this.node, "dojoMoveItem");
	},
	onMoveStop: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called after every move operation
		dojo.publish("/dnd/move/stop", [mover]);
		dojo.removeClass(dojo.body(), "dojoMove");
		dojo.removeClass(this.node, "dojoMoveItem");
	},
	onFirstMove: function(/* dojo.dnd.Mover */ mover, /* Event */ e){
		// summary:
		//		called during the very first move notification;
		//		can be used to initialize coordinates, can be overwritten.

		// default implementation does nothing
	},
	onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop, /* Event */ e){
		// summary:
		//		called during every move notification;
		//		should actually move the node; can be overwritten.
		this.onMoving(mover, leftTop);
		var s = mover.node.style;
		s.left = leftTop.l + "px";
		s.top  = leftTop.t + "px";
		this.onMoved(mover, leftTop);
	},
	onMoving: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called before every incremental move; can be overwritten.

		// default implementation does nothing
	},
	onMoved: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called after every incremental move; can be overwritten.

		// default implementation does nothing
	}
});

return dojo.dnd.Moveable;
});
