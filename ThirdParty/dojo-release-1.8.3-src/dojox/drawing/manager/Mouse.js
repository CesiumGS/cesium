define(["dojo", "../util/oo", "../defaults"], 
function(dojo, oo, defaults){

//dojox.drawing.manager.Mouse = 
return oo.declare(
	function(/* Object */options){
		this.util = options.util;
		this.keys = options.keys;
		this.id = options.id || this.util.uid("mouse");
		this.currentNodeId = "";
		this.registered = {};
	},
	
	{
		// summary:
		//		Master object (instance) that tracks mouse
		//		events. A new instance is created for each
		//		Drawing object.
		// description:
		//		You could connect to any method or event in this
		//		class, but it is designed to have the object
		//		'registered'. All objects with the current event
		//		will be called directly.
		//
		//		Custom events are used often. In addition to
		//		standard events onDown, onUp, onDrag, etc, if
		//		a certain object is clicked upon (or dragged, etc),
		//		that object's drawingType will create the custom event,
		//		such as onAnchorDown, or onStencilDown.


		// doublClickSpeed: Number
		//		Milliseconds between clicks to
		//		register as for onDoubleClick
		doublClickSpeed:400,
		
		// private properties
		
		_lastx:0,
		_lasty:0,
		__reg:0,
		_downOnCanvas:false,
		
		/*=====
		CustomEventMethod: {
			// summary:
			//		The custom event methods that an Object that has
			//		registered with manager.Mouse can receive.
			//		Can contain any or all of the following methods
			//		and they will be called on mouse events. All events
			//		will be sent a EventObject event object.
			//
			//		NOTE:
			//		Events happen anywhere in the document unless
			//		otherwise noted.

			// onMove: Function
			//		Fires on mousemove when mouse is up
			// onDown: Function
			//		Fires on mousedown *on the canvas*
			// onDrag: Function
			//		Fires on mousemove when mouse is down
			// onUp: Function
			//		Fires on mouseup, anywhere in the document
			// onStencilDown: Function
			//		Fired on mousedown on a Stencil
			// onStencilDrag: Function
			//		Fired when mouse moves and mose is down on a Stencil
			// onStencilUp: Function
			//		Fired on mouseup off of a Stencil
			// on[Custom]Up|Down|Move: Function
			//		Custom events can bet set and fired by setting a
			//		different drawingType on a Stencil, or by calling
			//		setEventMode(customEventName)
		},
		EventObject: function(){
			// summary:
			//		The custom event object that is sent to registered objects
			//		and their respective methods.
			//
			//		NOTE: Most event objects are the same with the exception
			//		of the onDown events, which have fewer.

			// id: String
			//		Id of the focused object (included in onDown)
			// pageX: Number
			//		The X coordinate of the mouse from the left side of
			//		the document. (included in onDown)
			// pageY: Number
			//		The Y coordinate of the mouse from the top of
			//		the document. (included in onDown)
			// x: Number
			//		The X coordinate of the mouse from the left side
			//		of the canvas (included in onDown)
			// y: Number
			//		The Y coordinate of the mouse from the top
			//		of the canvas (included in onDown)

			// last:	Object
			//		The x and y coordinates of the last mousemove
			//		relative to the canvas (not included in onDown)
			// move: Object
			//		The x and y amounts the mouse moved since the last event
			//		(not included in onDown)
			// orgX:	Number
			//		The left side of the canvas from the side of the document (not included in onDown)
			// orgY:	Number
			//		The top of the canvas from the top of the document (not included in onDown)
			// scroll: Object
			//		The 'top' and 'left' scroll amounts of the canvas. (not included in onDown)
			// start:	Object
			//		The x and y coordinates of the mousedown event (not included in onDown)
			// withinCanvas: Boolean
			//		Whether the event happened within the Canvas or not (not included in onDown)
		},
		=====*/
			
		init: function(/* HTMLNode*/node){
			// summary:
			//		Internal. Initializes mouse.

			this.container = node;
			this.setCanvas();
			var c;
			var _isDown = false;
			dojo.connect(this.container, "rightclick", this, function(evt){
				console.warn("RIGHTCLICK")
			});
			
			dojo.connect(document.body, "mousedown", this, function(evt){
				//evt.preventDefault();
				//dojo.stopEvent(evt);
			});
			
			dojo.connect(this.container, "mousedown", this, function(evt){
				this.down(evt);
				// Right click shouldn't trigger drag
				if(evt.button != dojo.mouseButtons.RIGHT){
					_isDown = true;
					c = dojo.connect(document, "mousemove", this, "drag");
				}
			});
			dojo.connect(document, "mouseup", this, function(evt){
				dojo.disconnect(c);
				_isDown = false;
				this.up(evt);
			});
			dojo.connect(document, "mousemove", this, function(evt){
				if(!_isDown){
					this.move(evt);
				}
			});
			dojo.connect(this.keys, "onEsc", this, function(evt){
				this._dragged = false;
			});
		},
		
		setCanvas: function(){
			// summary:
			//		Internal. Sets canvas position
			var pos = dojo.coords(this.container.parentNode);
			this.origin = dojo.clone(pos);
		},
		
		scrollOffset: function(){
			// summary:
			// 	Gets scroll offset of canvas
			return {
				top:this.container.parentNode.scrollTop,
				left:this.container.parentNode.scrollLeft
			}; // Object
		},

		resize: function(width,height){
			if(this.origin){
				this.origin.w=width;
				this.origin.h=height;
			}
		},

		register: function(/* CustomEventMethod*/scope){
			// summary:
			//		All objects (Stencils) should register here if they
			//		use mouse events. When registering, the object will
			//		be called if it has that method.
			//		See: CustomEventMethod and EventObject
			// scope:
			//		The object to be called
			// returns: handle
			//		Keep the handle to be used for disconnection.

			var handle = scope.id || "reg_"+(this.__reg++);
			if(!this.registered[handle]){ this.registered[handle] = scope; }
			return handle; // String
		},
		unregister: function(handle){
			// summary:
			//		Disconnects object. Mouse events are no longer
			//		called for it.
			if(!this.registered[handle]){ return; }
			delete this.registered[handle];
		},
		
		_broadcastEvent:function(strEvt, obj){
			// summary:
			//		Fire events to all registered objects.

			//console.log("mouse.broadcast:", strEvt, obj)
			for(var nm in this.registered){
				if(this.registered[nm][strEvt]) this.registered[nm][strEvt](obj);
			}
		},
		
		onDown: function(obj){
			// summary:
			//		Create on[xx]Down event and send to broadcaster.
			//		Could be connected to.
			
			//console.info("onDown:", this.eventName("down"))
			this._broadcastEvent(this.eventName("down"), obj);
		},
		
		onDrag: function(obj){
			// summary:
			//		Create on[xx]Drag event and send to broadcaster.
			//		Could be connected to.

			var nm = this.eventName("drag");
			if(this._selected && nm == "onDrag"){
				nm = "onStencilDrag"
			}
			this._broadcastEvent(nm, obj);
		},
		
		onMove: function(obj){
			// summary:
			//		Create onMove event and send to broadcaster.
			//		Could be connected to.
			//		Note: onMove never uses a custom event
			//		Note: onMove is currently not enabled in the app.

			this._broadcastEvent("onMove", obj);
		},
		
		overName: function(obj,evt){
			var nm = obj.id.split(".");
			evt = evt.charAt(0).toUpperCase() + evt.substring(1);
			if(nm[0] == "dojox" && (defaults.clickable || !defaults.clickMode)){
				return "onStencil"+evt;
			}else{
				return "on"+evt;
			}
			
		},
		
		onOver: function(obj){
			this._broadcastEvent(this.overName(obj,"over"), obj);
		},
		
		onOut: function(obj){
			this._broadcastEvent(this.overName(obj,"out"), obj);
		},
		
		onUp: function(obj){
			// summary:
			//		Create on[xx]Up event and send to broadcaster.
			//		Could be connected to.
			
			// 	blocking first click-off (deselect), largely for TextBlock
			// 	TODO: should have param to make this optional?
			var nm = this.eventName("up");
			
			if(nm == "onStencilUp"){
				this._selected  = true;
			}else if(this._selected && nm == "onUp"){ //////////////////////////////////////////
				nm = "onStencilUp";
				this._selected = false;
			}
			
			console.info("Up Event:", this.id, nm, "id:", obj.id);
			this._broadcastEvent(nm, obj);
			
			// Silverlight double-click handled in Silverlight class
			if(dojox.gfx.renderer == "silverlight"){ return; }
			
			// Check Double Click
			// If a double click is detected, the onDoubleClick event fires,
			// but does not replace the normal event. They both fire.
			this._clickTime = new Date().getTime();
			if(this._lastClickTime){
				if(this._clickTime-this._lastClickTime<this.doublClickSpeed){
					var dnm = this.eventName("doubleClick");
					console.warn("DOUBLE CLICK", dnm, obj);
					this._broadcastEvent(dnm, obj);
				}else{
					//console.log("    slow:", this._clickTime-this._lastClickTime)
				}
			}
			this._lastClickTime = this._clickTime;
			
		},
		
		zoom: 1,
		setZoom: function(zoom){
			// summary:
			//		Internal. Sets the mouse zoom percentage to
			//		that of the canvas
			this.zoom = 1/zoom;
		},
		
		setEventMode: function(mode){
			// summary:
			//		Sets the mouse mode s that custom events can be called.
			//		Also can 'disable' events by using a bogus mode:
			// |	mouse.setEventMode("DISABLED")
			//		(unless any object subscribes to this event,
			//		it is effectively disabled)

			this.mode = mode ? "on" + mode.charAt(0).toUpperCase() + mode.substring(1) :  "";
		},
		
		eventName: function(name){
			// summary:
			//		Internal. Determine the event name

			name = name.charAt(0).toUpperCase() + name.substring(1);
			if(this.mode){
				if(this.mode == "onPathEdit"){
					return "on"+name;
				}
				if(this.mode == "onUI"){
					//return "on"+name;
				}
				return this.mode + name;
			}else{
				//Allow a mode where stencils aren't clickable
				if(!defaults.clickable && defaults.clickMode){return "on"+name;}
				var dt = !this.drawingType || this.drawingType=="surface" || this.drawingType=="canvas" ? "" : this.drawingType;
				var t = !dt ? "" : dt.charAt(0).toUpperCase() + dt.substring(1);
				return "on"+t+name;
			}
		},
		
		up: function(evt){
			// summary:
			//		Internal. Create onUp event

			this.onUp(this.create(evt));
		},
		
		down: function(evt){
			// summary:
			//		Internal. Create onDown event

			this._downOnCanvas = true;
			var sc = this.scrollOffset();
			var dim = this._getXY(evt);
			this._lastpagex = dim.x;
			this._lastpagey = dim.y;
			var o = this.origin;
			var x = dim.x - o.x + sc.left;
			var y = dim.y - o.y + sc.top;
			
			var withinCanvas = x>=0 && y>=0 && x<=o.w && y<=o.h;
			x*= this.zoom;
			y*= this.zoom;
			
			o.startx = x;
			o.starty = y;
			this._lastx = x;
			this._lasty = y;
			
			this.drawingType = this.util.attr(evt, "drawingType") || "";
			var id = this._getId(evt);
			//console.log("DOWN:", this.id, id, withinCanvas);
			//console.log("this.drawingType:", this.drawingType);
			
			if(evt.button == dojo.mouseButtons.RIGHT && this.id == "mse"){
				//Allow right click events to bubble for context menus
			}else{
				evt.preventDefault();
				dojo.stopEvent(evt);
			}
			this.onDown({
				mid:this.id,
				x:x,
				y:y,
				pageX:dim.x,
				pageY:dim.y,
				withinCanvas:withinCanvas,
				id:id
			});
			
		},
		over: function(obj){
			// summary:
			//		Internal.

			this.onOver(obj);
		},
		out: function(obj){
			// summary:
			//		Internal.

			this.onOut(obj);
		},
		move: function(evt){
			// summary:
			//		Internal.

			var obj = this.create(evt);
			if(this.id=="MUI"){
				//console.log("obj.id:", obj.id, "was:", this.currentNodeId)
			}
			if(obj.id != this.currentNodeId){
				// TODO: I wonder if an ID is good enough
				//	that would avoid the mixin
				var outObj = {};
				for(var nm in obj){
					outObj[nm] = obj[nm];
				}
				outObj.id = this.currentNodeId;
				this.currentNodeId && this.out(outObj);
				obj.id && this.over(obj);
				this.currentNodeId = obj.id;
			}
			this.onMove(obj);
		},
		drag: function(evt){
			// summary:
			//		Internal. Create onDrag event
			this.onDrag(this.create(evt, true));
		},
		create: function(evt, squelchErrors){
			// summary:
			//		Internal. Create EventObject

			var sc = this.scrollOffset();
			var dim = this._getXY(evt);
			
			var pagex = dim.x;
			var pagey = dim.y;
			
			var o = this.origin;
			var x = dim.x - o.x + sc.left;
			var y = dim.y - o.y + sc.top;

			var withinCanvas = x>=0 && y>=0 && x<=o.w && y<=o.h;
			x*= this.zoom;
			y*= this.zoom;
			
			var id = withinCanvas ? this._getId(evt, squelchErrors) : "";
			var ret = {
				mid:this.id,
				x:x,
				y:y,
				pageX:dim.x,
				pageY:dim.y,
				page:{
					x:dim.x,
					y:dim.y
				},
				orgX:o.x,
				orgY:o.y,
				last:{
					x: this._lastx,
					y: this._lasty
				},
				start:{
					x: this.origin.startx, //+ sc.left,
					y: this.origin.starty //+ sc.top
				},
				move:{
					x:pagex - this._lastpagex,
					y:pagey - this._lastpagey
				},
				scroll:sc,
				id:id,
				withinCanvas:withinCanvas
			};
			
			//console.warn("MSE LAST:", x-this._lastx, y-this._lasty)
			this._lastx = x;
			this._lasty = y;
			this._lastpagex = pagex;
			this._lastpagey = pagey;
			dojo.stopEvent(evt);
			return ret; //Object
		},
		_getId: function(evt, squelchErrors){
			// summary:
			//		Internal. Gets ID of focused node.
			return this.util.attr(evt, "id", null, squelchErrors); // String
		},
		_getXY: function(evt){
			// summary:
			//		Internal. Gets mouse coords to page.
			return {x:evt.pageX, y:evt.pageY}; // Object
		},
		
		setCursor: function(cursor,/* HTMLNode*/node){
			// summary:
			//		Sets the cursor for  a given node.  If no
			//		node is specified the containing node is used.
			if(!node){
				dojo.style(this.container, "cursor", cursor);
			}else{
				dojo.style(node, "cursor", cursor);
			}
		}
	}
);
});
