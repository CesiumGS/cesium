define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojo/_base/Color", "dojo/dom", 
		"dojo/dom-geometry", "./_base","./canvas", "./shape", "./matrix"], 
function(lang, declare, hub, Color, dom, domGeom, g, canvas, shapeLib, m){
	var canvasWithEvents = g.canvasWithEvents = {
		// summary:
		//		This the graphics rendering bridge for W3C Canvas compliant browsers which extends
		//		the basic canvas drawing renderer bridge to add additional support for graphics events
		//		on Shapes.
		//		Since Canvas is an immediate mode graphics api, with no object graph or
		//		eventing capabilities, use of the canvas module alone will only add in drawing support.
		//		This additional module, canvasWithEvents extends this module with additional support
		//		for handling events on Canvas.  By default, the support for events is now included
		//		however, if only drawing capabilities are needed, canvas event module can be disabled
		//		using the dojoConfig option, canvasEvents:true|false.
		//		The id of the Canvas renderer is 'canvasWithEvents'.  This id can be used when switch Dojo's
		//		graphics context between renderer implementations.  See dojox/gfx/_base.switchRenderer
		//		API.
	};

	canvasWithEvents.Shape = declare("dojox.gfx.canvasWithEvents.Shape", canvas.Shape, {
		
		_testInputs: function(/* Object */ctx, /* Array */ pos){
			if(this.clip || (!this.canvasFill && this.strokeStyle)){
				// pixel-based until a getStrokedPath-like api is available on the path
				this._hitTestPixel(ctx, pos);
			}else{
				this._renderShape(ctx);
				var cnt = pos.length, t = this.getTransform();
				for(var i = 0; i < pos.length; ++i){
					var input = pos[i];
					// already hit
					if(input.target) continue;
					var x = input.x, y = input.y;
					var p = t ? m.multiplyPoint(m.invert(t), x, y) : {
						x: x,
						y: y
					};
					input.target = this._hitTestGeometry(ctx, p.x, p.y);
				}
			}
		},
		_hitTestPixel: function(/* Object */ctx, /* Array */ pos){
			for(var i = 0; i < pos.length; ++i){
				var input = pos[i];
				if(input.target) continue;
				var x = input.x, y = input.y;
				ctx.clearRect(0,0,1,1);
				ctx.save();
				ctx.translate(-x, -y);
				this._render(ctx, true);
				input.target = ctx.getImageData(0, 0, 1, 1).data[0] ? this : null;
				ctx.restore();
			}
		},
		_hitTestGeometry: function(ctx, x, y){
			return ctx.isPointInPath(x, y) ? this : null;
		},				
		_renderFill: function(/* Object */ ctx, /* Boolean */ apply){
			// summary:
			//		render fill for the shape
			// ctx:
			//		a canvas context object
			// apply:
			//		whether ctx.fill() shall be called
			if(ctx.pickingMode){
				if("canvasFill" in this && apply){
					ctx.fill();
				}
				return;
			}
			this.inherited(arguments);
		},
		_renderStroke: function(/* Object */ ctx, /* Boolean */ apply){
			// summary:
			//		render stroke for the shape
			// ctx:
			//		a canvas context object
			// apply:
			//		whether ctx.stroke() shall be called
			if(this.strokeStyle && ctx.pickingMode){
				var c = this.strokeStyle.color;
				try{
					this.strokeStyle.color = new Color(ctx.strokeStyle);
					this.inherited(arguments);
				}finally{
					this.strokeStyle.color = c;
				}
			}else{
				this.inherited(arguments);				
			}
		},
		
		// events
		
		getEventSource: function(){
			// summary:
			//		returns this gfx shape event source, which is the surface rawnode in the case of canvas.
			return this.surface.getEventSource();
		},		
		connect: function(name, object, method){
			// summary:
			//		connects a handler to an event on this shape
			
			// mouse events *must* start with "on" but touch events *must not* start with on
			if(name.indexOf("mouse") === 0){
				name = "on" + name;
			}else if(name.indexOf("ontouch") === 0){
				name = name.slice(2);
			}
			
			this.surface._setupEvents(name); // setup events on demand
			// No need to fix callback. The listeners registered by
			// '_setupEvents()' are always invoked first and they
			// already 'fix' the event
			return arguments.length > 2 ? // Object
					 hub.connect(this, name, object, method) : hub.connect(this, name, object);
		},
		disconnect: function(token){
			// summary:
			//		disconnects an event handler
			hub.disconnect(token);
		},
		
		// connect hook
		
		oncontextmenu:  function(){},
		onclick:        function(){},
		ondblclick:     function(){},
		onmouseenter:   function(){},
		onmouseleave:   function(){},
		onmouseout:     function(){},
		onmousedown:    function(){},
		ontouchstart:   function(){},
		touchstart:     function(){},
		onmouseup:      function(){},
		ontouchend:     function(){},
		touchend:       function(){},
		onmouseover:    function(){},
		onmousemove:    function(){},
		ontouchmove:    function(){},
		touchmove:      function(){},
		onkeydown:      function(){},
		onkeyup:        function(){}
	});

	canvasWithEvents.Group = declare("dojox.gfx.canvasWithEvents.Group", [canvasWithEvents.Shape, canvas.Group], {
		_testInputs: function(/*Object*/ctx, /*Array*/ pos){
			var children = this.children, t = this.getTransform(), i, j, input;
			if(children.length === 0){
				return;
			}
			var posbk = [];
			for(i = 0; i < pos.length; ++i){
				input = pos[i];
				// backup position before transform applied
				posbk[i] = {
					x: input.x,
					y: input.y
				};
				if(input.target) continue;
				var x = input.x, y = input.y;
				var p = t ? m.multiplyPoint(m.invert(t), x, y) : {
					x: x,
					y: y
				};
				input.x = p.x;
				input.y = p.y;
			}
			for(i = children.length - 1; i >= 0; --i){
				children[i]._testInputs(ctx, pos);
				// does it need more hit tests ?
				var allFound = true;
				for(j = 0; j < pos.length; ++j){
					if(pos[j].target == null){
						allFound = false;
						break;
					}
				}
				if(allFound){
					break;
				}
			}
			if(this.clip){
				// filter positive hittests against the group clipping area
				for(i = 0; i < pos.length; ++i){
					input = pos[i];
					input.x = posbk[i].x;
					input.y = posbk[i].y;
					if(input.target){
						ctx.clearRect(0,0,1,1);
						ctx.save();
						ctx.translate(-input.x, -input.y);
						this._render(ctx, true);
						if(!ctx.getImageData(0, 0, 1, 1).data[0]){
							input.target = null;
						}
						ctx.restore();
					}
				}
			}else{
				for(i = 0; i < pos.length; ++i){
					pos[i].x = posbk[i].x;
					pos[i].y = posbk[i].y;
				}	
			}
		}	
	});

	canvasWithEvents.Image = declare("dojox.gfx.canvasWithEvents.Image", [canvasWithEvents.Shape, canvas.Image], {
		_renderShape: function(/* Object */ ctx){
			// summary:
			//		render image
			// ctx:
			//		a canvas context object
			var s = this.shape;
			if(ctx.pickingMode){
				ctx.fillRect(s.x, s.y, s.width, s.height);
			}else{
				this.inherited(arguments);
			}
		},		
		_hitTestGeometry: function(ctx, x, y){
			// TODO: improve hit testing to take into account transparency
			var s = this.shape;
			return x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height ? this : null;
		}
	});

	canvasWithEvents.Text = declare("dojox.gfx.canvasWithEvents.Text", [canvasWithEvents.Shape, canvas.Text], {
		_testInputs: function(ctx, pos){
			return this._hitTestPixel(ctx, pos);
		}
	});

	canvasWithEvents.Rect = declare("dojox.gfx.canvasWithEvents.Rect", [canvasWithEvents.Shape, canvas.Rect], {});
	canvasWithEvents.Circle = declare("dojox.gfx.canvasWithEvents.Circle", [canvasWithEvents.Shape, canvas.Circle], {});
	canvasWithEvents.Ellipse = declare("dojox.gfx.canvasWithEvents.Ellipse", [canvasWithEvents.Shape, canvas.Ellipse],{});
	canvasWithEvents.Line = declare("dojox.gfx.canvasWithEvents.Line", [canvasWithEvents.Shape, canvas.Line],{});
	canvasWithEvents.Polyline = declare("dojox.gfx.canvasWithEvents.Polyline", [canvasWithEvents.Shape, canvas.Polyline],{});
	canvasWithEvents.Path = declare("dojox.gfx.canvasWithEvents.Path", [canvasWithEvents.Shape, canvas.Path],{});
	canvasWithEvents.TextPath = declare("dojox.gfx.canvasWithEvents.TextPath", [canvasWithEvents.Shape, canvas.TextPath],{});

	
	// a map that redirects shape-specific events to the canvas event handler that deals with these events
	var _eventsRedirectMap = {
		onmouseenter : 'onmousemove',
		onmouseleave : 'onmousemove',
		onmouseout   : 'onmousemove',
		onmouseover  : 'onmousemove',
		touchstart   : 'ontouchstart',
		touchend     : 'ontouchend',
		touchmove    : 'ontouchmove'
	};
	var _eventsShortNameMap = {
		ontouchstart   : 'touchstart',
		ontouchend     : 'touchend',
		ontouchmove    : 'touchmove'
	};
	
	var uagent = navigator.userAgent.toLowerCase(),
		isiOS = uagent.search('iphone') > -1 || 
			    uagent.search('ipad') > -1 || 
				uagent.search('ipod') > -1;

	canvasWithEvents.Surface = declare("dojox.gfx.canvasWithEvents.Surface", canvas.Surface, {
		constructor:function(){
			this._pick = { curr: null, last: null };
			this._pickOfMouseDown = null;
			this._pickOfMouseUp = null;
		},
		
		connect: function(/*String*/name, /*Object*/object, /*Function|String*/method){
			// summary:
			//		connects a handler to an event on this surface
			// name: String
			//		The event name
			// object: Object
			//		The object that method will receive as "this".
			// method: Function
			//		A function reference, or name of a function in context.
			 
			if(name.indexOf('touch') !== -1){
				// in case of surface.connect('touchXXX'...), we must root the handler to the
				// specific touch event processing (done in fireTouchEvents) so that the event is properly configured.
				// So, we activate the shape-level event processing calling _setupEvents,
				// and connect to the _ontouchXXXImpl_ hooks that are called back by invokeHandler() 
				this._setupEvents(name);
				name = "_on" + name + "Impl_";
				return hub.connect(this, name, object, method);
			}else{
				this._initMirrorCanvas();
				return hub.connect(this.getEventSource(), name, null,
							shapeLib.fixCallback(this, g.fixTarget, object, method));
			}	
		},

		// connection hooks for touch events connect
		_ontouchstartImpl_: function(){},
		_ontouchendImpl_:   function(){},
		_ontouchmoveImpl_:  function(){},
		
		_initMirrorCanvas: function(){
			if(!this.mirrorCanvas){
				var p = this._parent, mirror = p.ownerDocument.createElement("canvas");
				mirror.width = 1;
				mirror.height = 1;
				mirror.style.position = 'absolute';
				mirror.style.left = '-99999px';
				mirror.style.top = '-99999px';
				p.appendChild(mirror);
				this.mirrorCanvas = mirror;
			}
		},

		_setupEvents: function(eventName){
			// summary:
			//		setup event listeners if not yet

			// onmouseenter and onmouseleave shape events are handled in the onmousemove surface handler
			if(eventName in _eventsRedirectMap){
				eventName = _eventsRedirectMap[eventName];
			}
			if(this._eventsH && this._eventsH[eventName]){
				// the required listener has already been connected
				return;
			}
			// a mirror canvas for shape picking
			this._initMirrorCanvas();
			if(!this._eventsH){
				this._eventsH = {};
			}
			// register event hooks if not done yet
			this._eventsH[eventName] = hub.connect(this.getEventSource(), eventName,
					shapeLib.fixCallback(this, g.fixTarget, this, "_" + eventName));
			if(eventName === 'onclick' || eventName==='ondblclick'){
				if(!this._eventsH['onmousedown']){
					this._eventsH['onmousedown'] = hub.connect(this.getEventSource(),
							'onmousedown', shapeLib.fixCallback(this, g.fixTarget, this, "_onmousedown"));
				}
			 	if(!this._eventsH['onmouseup']){
					this._eventsH['onmouseup'] = hub.connect(this.getEventSource(),
							'onmouseup', shapeLib.fixCallback(this, g.fixTarget, this, "_onmouseup"));
				}
			}
		},
		
		destroy: function(){
			// summary:
			//		stops the move, deletes all references, so the object can be garbage-collected
			this.inherited(arguments);
			// destroy events and objects
			for(var i in this._eventsH){
				hub.disconnect(this._eventsH[i]);
			}
			this._eventsH = this.mirrorCanvas = null;
		},	
		
		// events
		getEventSource: function(){
			// summary:
			//		returns the canvas DOM node for surface-level events
			return this.rawNode;
		},

		// internal handlers used to implement shape-level event notification
		_invokeHandler: function(base, method, event){
			// Invokes handler function
			var handler = base[method];
			if(handler && handler.after){
				handler.apply(base, [event]);
			}else if (method in _eventsShortNameMap){
				// there may be a synonym event name (touchstart -> ontouchstart)
				handler = base[_eventsShortNameMap[method]];
				if(handler && handler.after){
					handler.apply(base, [event]);
				}
			}
			if(!handler && method.indexOf('touch') !== -1){
				// special case for surface touch handlers
				method = "_" + method + "Impl_";
				handler = base[method];
				if(handler){
					handler.apply(base, [event]);
				}
			}
			// Propagates event up in the DOM hierarchy only if event
			// has not been stopped (event.cancelBubble is true)
			if(!isEventStopped(event) && base.parent){
				this._invokeHandler(base.parent, method, event);
			}
		},
		_oncontextmenu: function(e){
			// summary:
			//		triggers onclick
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pick.curr){
				this._invokeHandler(this._pick.curr, 'oncontextmenu', e);
			}
		},
		_ondblclick: function(e){
			// summary:
			//		triggers onclick
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pickOfMouseUp){
				this._invokeHandler(this._pickOfMouseUp, 'ondblclick', e);
			}
		},
		_onclick: function(e){
			// summary:
			//		triggers onclick
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pickOfMouseUp && this._pickOfMouseUp == this._pickOfMouseDown){
				this._invokeHandler(this._pickOfMouseUp, 'onclick', e);
			}
		},
		_onmousedown: function(e){
			// summary:
			//		triggers onmousedown
			this._pickOfMouseDown = this._pick.curr;
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pick.curr){
				this._invokeHandler(this._pick.curr, 'onmousedown', e);
			}
		},
		_ontouchstart: function(e){
			// summary:
			//		triggers ontouchstart
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pick.curr) {
				this._fireTouchEvent(e);
			}			
		},
		_onmouseup: function(e){
			// summary:
			//		triggers onmouseup
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			this._pickOfMouseUp = this._pick.curr;
			if(this._pick.curr){
				this._invokeHandler(this._pick.curr, 'onmouseup', e);
			}
		},
		_ontouchend: function(e){
			// summary:
			//		triggers ontouchend
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pick.curr){
				for(var i = 0; i < this._pick.curr.length; ++i){
					if(this._pick.curr[i].target){
						e.gfxTarget = this._pick.curr[i].target;
						this._invokeHandler(this._pick.curr[i].target, 'ontouchend', e);
					}
				}
			}
		},
		_onmousemove: function(e){
			// summary:
			//		triggers onmousemove, onmouseenter, onmouseleave
			
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			if(this._pick.last && this._pick.last != this._pick.curr){
				this._invokeHandler(this._pick.last, 'onmouseleave', e);
				this._invokeHandler(this._pick.last, 'onmouseout', e);
			}
			if(this._pick.curr){
				if(this._pick.last == this._pick.curr){
					this._invokeHandler(this._pick.curr, 'onmousemove', e);
				}else{
					this._invokeHandler(this._pick.curr, 'onmouseenter', e);
					this._invokeHandler(this._pick.curr, 'onmouseover', e);
				}
			}
		},
		_ontouchmove: function(e){
			// summary:
			//		triggers ontouchmove
			if(this._pick.curr){
				this._fireTouchEvent(e);
			}
		},
		
		_fireTouchEvent: function(e){
			// this._pick.curr = an array of target for touch event, one target instance for mouse events
			var toFire = []; // the per-shape events list to fire
			// for each positive picking:
			// .group all pickings by target
			// .collect all touches for the picking target 
			for(var i = 0; i < this._pick.curr.length; ++i){
				var pick = this._pick.curr[i];
				if(pick.target){
					// touches for this target
					var gfxtt = pick.target.__gfxtt;
					if(!gfxtt){
						gfxtt = [];
						pick.target.__gfxtt = gfxtt;
					}
					// store the touch that yielded to this picking
					gfxtt.push(pick.t);
					// if the target has not been added yet, add it
					if(!pick.target.__inToFire){
						toFire.push(pick.target);
						pick.target.__inToFire=true;
					}
				}
			}
			if(toFire.length === 0){
				// no target, invokes the surface handler
				this._invokeHandler(this, 'on' + e.type, e);
			}else{
				for(i = 0; i < toFire.length; ++i){
					(function(){
						var targetTouches = toFire[i].__gfxtt;
						// fires the original event BUT with our own targetTouches array.
						// Note for iOS:
						var evt = lang.delegate(e, {gfxTarget: toFire[i]});
						if(isiOS){
							// must use the original preventDefault function or iOS will throw a TypeError
							evt.preventDefault = function(){e.preventDefault();};
							evt.stopPropagation = function(){e.stopPropagation();};
						}
						// override targetTouches with the filtered one
						evt.__defineGetter__('targetTouches', function(){return targetTouches;});
						// clean up
						delete toFire[i].__gfxtt;
						delete toFire[i].__inToFire;
						// fire event
						this._invokeHandler(toFire[i], 'on' + e.type, evt);
					}).call(this);
				}
			}
		},
		_onkeydown: function(){},	// needed?
		_onkeyup:   function(){},	// needed?

		_whatsUnderEvent: function(evt){
			// summary:
			//		returns the shape under the mouse event
			// evt:
			//		mouse event
			
			var surface = this, i,
				pos = domGeom.position(surface.rawNode, true),
				inputs = [], changedTouches = evt.changedTouches, touches = evt.touches;
			// collect input events targets
			if(changedTouches){
				for(i = 0; i < changedTouches.length; ++i){
					inputs.push({
						t: changedTouches[i],
						x: changedTouches[i].pageX - pos.x,
						y: changedTouches[i].pageY - pos.y
					});
				}
			}else if(touches){
				for(i = 0; i < touches.length; ++i){
					inputs.push({
						t: touches[i],
						x: touches[i].pageX - pos.x,
						y: touches[i].pageY - pos.y
					});
				}
			}else{
				inputs.push({
					x : evt.pageX - pos.x,
					y : evt.pageY - pos.y
				});
			} 
				
			var mirror = surface.mirrorCanvas,
				ctx = mirror.getContext('2d'),
				children = surface.children;
			
			ctx.clearRect(0, 0, mirror.width, mirror.height);
			ctx.save();
			ctx.strokeStyle = "rgba(127,127,127,1.0)";
			ctx.fillStyle = "rgba(127,127,127,1.0)";
			ctx.pickingMode = true;
			var pick = null;
			// process the inputs to find the target.
			for(i = children.length-1; i >= 0; i--){
				children[i]._testInputs(ctx, inputs);
				// does it need more hit tests ?
				var allFound = true;
				for(j = 0; j < inputs.length; ++j){
					if(inputs[j].target == null){
						allFound = false;
						break;
					}
				}
				if(allFound){
					break;
				}
			}
			ctx.restore();
			// touch event handlers expect an array of target, mouse handlers one target
			return (touches || changedTouches) ? inputs : inputs[0].target;
		}		
	});
	
	canvasWithEvents.createSurface = function(parentNode, width, height){
		// summary:
		//		creates a surface (Canvas)
		// parentNode: Node
		//		a parent node
		// width: String
		//		width of surface, e.g., "100px"
		// height: String
		//		height of surface, e.g., "100px"

		if(!width && !height){
			var pos = domGeom.position(parentNode);
			width  = width  || pos.w;
			height = height || pos.h;
		}
		if(typeof width == "number"){
			width = width + "px";
		}
		if(typeof height == "number"){
			height = height + "px";
		}

		var s = new canvasWithEvents.Surface(),
			p = dom.byId(parentNode),
			c = p.ownerDocument.createElement("canvas");

		c.width  = g.normalizedLength(width);	// in pixels
		c.height = g.normalizedLength(height);	// in pixels

		p.appendChild(c);
		s.rawNode = c;
		s._parent = p;
		s.surface = s;
		return s;	// dojox/gfx.Surface
	};


	// Mouse/Touch event
	var isEventStopped = function(/*Event*/ evt){
		// summary:
		//		queries whether an event has been stopped or not
		// evt: Event
		//		The event object.
		if(evt.cancelBubble !== undefined){
			return evt.cancelBubble;
		}
		return false;
	};
	
	canvasWithEvents.fixTarget = function(event, gfxElement){
		// summary:
		//		Adds the gfxElement to event.gfxTarget if none exists. This new
		//		property will carry the GFX element associated with this event.
		// event: Object 
		//		The current input event (MouseEvent or TouchEvent)
		// gfxElement: Object
		//		The GFX target element (a Surface in this case)
		if(isEventStopped(event)){
			return false;
		}
		if(!event.gfxTarget){
			gfxElement._pick.last = gfxElement._pick.curr;
			gfxElement._pick.curr = gfxElement._whatsUnderEvent(event);
			if(!lang.isArray(gfxElement._pick.curr)){
				event.gfxTarget = gfxElement._pick.curr;
			}
		}
		return true;
	};

	return canvasWithEvents;
});
