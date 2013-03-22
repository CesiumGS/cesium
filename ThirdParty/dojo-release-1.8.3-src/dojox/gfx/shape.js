define(["./_base", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/kernel", "dojo/_base/sniff",
	"dojo/_base/connect", "dojo/_base/array", "dojo/dom-construct", "dojo/_base/Color", "./matrix" /*===== , "./path" =====*/ ], 
	function(g, lang, declare, kernel, has, events, arr, domConstruct, Color, matrixLib){

	var shape = g.shape = {
		// summary:
		//		This module contains the core graphics Shape API.
		//		Different graphics renderer implementation modules (svg, canvas, vml, silverlight, etc.) extend this
		//		basic api to provide renderer-specific implementations for each shape.
	};
	
	// a set of ids (keys=type)
	var _ids = {};
	// a simple set impl to map shape<->id
	var registry = {};
	
	shape.register = function(/*dojox/gfx/shape.Shape*/s){
		// summary:
		//		Register the specified shape into the graphics registry.
		// s: dojox/gfx/shape.Shape
		//		The shape to register.
		// returns: Number
		//		The unique id associated with this shape.
		
		// the id pattern : type+number (ex: Rect0,Rect1,etc)
		var t = s.declaredClass.split('.').pop();
		var i = t in _ids ? ++_ids[t] : ((_ids[t] = 0));
		var uid = t+i;
		registry[uid] = s;
		return uid;
	};
	
	shape.byId = function(/*String*/id){
		// summary:
		//		Returns the shape that matches the specified id.
		// id: String
		//		The unique identifier for this Shape.
		// returns: dojox/gfx/shape.Shape
		return registry[id]; //dojox/gfx/shape.Shape
	};
	
	shape.dispose = function(/*dojox/gfx/shape.Shape*/s, /*Boolean?*/recurse){
		// summary:
		//		Removes the specified shape from the registry.
		// s: dojox/gfx/shape.Shape
		//		The shape to unregister.
		if(recurse && s.children){
			for(var i=0; i< s.children.length; ++i){
				shape.dispose(s.children[i], true);
			}
		}
		delete registry[s.getUID()];
	};
	
	shape.Shape = declare("dojox.gfx.shape.Shape", null, {
		// summary:
		//		a Shape object, which knows how to apply
		//		graphical attributes and transformations
	
		constructor: function(){
			// rawNode: Node
			//		underlying graphics-renderer-specific implementation object (if applicable)
			this.rawNode = null;

			// shape: Object
			//		an abstract shape object
			//		(see dojox/gfx.defaultPath,
			//		dojox/gfx.defaultPolyline,
			//		dojox/gfx.defaultRect,
			//		dojox/gfx.defaultEllipse,
			//		dojox/gfx.defaultCircle,
			//		dojox/gfx.defaultLine,
			//		or dojox/gfx.defaultImage)
			this.shape = null;
	
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a transformation matrix
			this.matrix = null;
	
			// fillStyle: dojox/gfx.Fill
			//		a fill object
			//		(see dojox/gfx.defaultLinearGradient,
			//		dojox/gfx.defaultRadialGradient,
			//		dojox/gfx.defaultPattern,
			//		or dojo/Color)
			this.fillStyle = null;
	
			// strokeStyle: dojox/gfx.Stroke
			//		a stroke object
			//		(see dojox/gfx.defaultStroke)
			this.strokeStyle = null;
	
			// bbox: dojox/gfx.Rectangle
			//		a bounding box of this shape
			//		(see dojox/gfx.defaultRect)
			this.bbox = null;
	
			// virtual group structure
	
			// parent: Object
			//		a parent or null
			//		(see dojox/gfx/shape.Surface,
			//		or dojox/gfx.Group)
			this.parent = null;
	
			// parentMatrix: dojox/gfx/matrix.Matrix2D
			//		a transformation matrix inherited from the parent
			this.parentMatrix = null;
			
			var uid = shape.register(this);
			this.getUID = function(){
				return uid;
			}
		},
		
		destroy: function(){
			// summary:
			//		Releases all internal resources owned by this shape. Once this method has been called,
			//		the instance is considered destroyed and should not be used anymore.
			shape.dispose(this);
		},
	
		// trivial getters
	
		getNode: function(){
			// summary:
			//		Different graphics rendering subsystems implement shapes in different ways.  This
			//		method provides access to the underlying graphics subsystem object.  Clients calling this
			//		method and using the return value must be careful not to try sharing or using the underlying node
			//		in a general way across renderer implementation.
			//		Returns the underlying graphics Node, or null if no underlying graphics node is used by this shape.
			return this.rawNode; // Node
		},
		getShape: function(){
			// summary:
			//		returns the current Shape object or null
			//		(see dojox/gfx.defaultPath,
			//		dojox/gfx.defaultPolyline,
			//		dojox/gfx.defaultRect,
			//		dojox/gfx.defaultEllipse,
			//		dojox/gfx.defaultCircle,
			//		dojox/gfx.defaultLine,
			//		or dojox/gfx.defaultImage)
			return this.shape; // Object
		},
		getTransform: function(){
			// summary:
			//		Returns the current transformation matrix applied to this Shape or null
			return this.matrix;	// dojox/gfx/matrix.Matrix2D
		},
		getFill: function(){
			// summary:
			//		Returns the current fill object or null
			//		(see dojox/gfx.defaultLinearGradient,
			//		dojox/gfx.defaultRadialGradient,
			//		dojox/gfx.defaultPattern,
			//		or dojo/Color)
			return this.fillStyle;	// Object
		},
		getStroke: function(){
			// summary:
			//		Returns the current stroke object or null
			//		(see dojox/gfx.defaultStroke)
			return this.strokeStyle;	// Object
		},
		getParent: function(){
			// summary:
			//		Returns the parent Shape, Group or null if this Shape is unparented.
			//		(see dojox/gfx/shape.Surface,
			//		or dojox/gfx.Group)
			return this.parent;	// Object
		},
		getBoundingBox: function(){
			// summary:
			//		Returns the bounding box Rectangle for this shape or null if a BoundingBox cannot be
			//		calculated for the shape on the current renderer or for shapes with no geometric area (points).
			//		A bounding box is a rectangular geometric region
			//		defining the X and Y extent of the shape.
			//		(see dojox/gfx.defaultRect)
			//		Note that this method returns a direct reference to the attribute of this instance. Therefore you should
			//		not modify its value directly but clone it instead.
			return this.bbox;	// dojox/gfx.Rectangle
		},
		getTransformedBoundingBox: function(){
			// summary:
			//		returns an array of four points or null
			//		four points represent four corners of the untransformed bounding box
			var b = this.getBoundingBox();
			if(!b){
				return null;	// null
			}
			var m = this._getRealMatrix(),
				gm = matrixLib;
			return [	// Array
					gm.multiplyPoint(m, b.x, b.y),
					gm.multiplyPoint(m, b.x + b.width, b.y),
					gm.multiplyPoint(m, b.x + b.width, b.y + b.height),
					gm.multiplyPoint(m, b.x, b.y + b.height)
				];
		},
		getEventSource: function(){
			// summary:
			//		returns a Node, which is used as
			//		a source of events for this shape
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			return this.rawNode;	// Node
		},
	
		// empty settings
		
		setClip: function(clip){
			// summary:
			//		sets the clipping area of this shape.
			// description:
			//		The clipping area defines the shape area that will be effectively visible. Everything that
			//		would be drawn outside of the clipping area will not be rendered.
			//		The possible clipping area types are rectangle, ellipse, polyline and path, but all are not
			//		supported by all the renderers. vml only supports rectangle clipping, while the gfx silverlight renderer does not
			//		support path clipping.
			//		The clip parameter defines the clipping area geometry, and should be an object with the following properties:
			//
			//		- {x:Number, y:Number, width:Number, height:Number} for rectangular clip
			//		- {cx:Number, cy:Number, rx:Number, ry:Number} for ellipse clip
			//		- {points:Array} for polyline clip
			//		- {d:String} for a path clip.
			//
			//		The clip geometry coordinates are expressed in the coordinate system used to draw the shape. In other
			//		words, the clipping area is defined in the shape parent coordinate system and the shape transform is automatically applied.
			// example:
			//		The following example shows how to clip a gfx image with all the possible clip geometry: a rectangle,
			//		an ellipse, a circle (using the ellipse geometry), a polyline and a path:
			//
			//	|	surface.createImage({src:img, width:200,height:200}).setClip({x:10,y:10,width:50,height:50});
			//	|	surface.createImage({src:img, x:100,y:50,width:200,height:200}).setClip({cx:200,cy:100,rx:20,ry:30});
			//	|	surface.createImage({src:img, x:0,y:350,width:200,height:200}).setClip({cx:100,cy:425,rx:60,ry:60});
			//	|	surface.createImage({src:img, x:300,y:0,width:200,height:200}).setClip({points:[350,0,450,50,380,130,300,110]});
			//	|	surface.createImage({src:img, x:300,y:350,width:200,height:200}).setClip({d:"M 350,350 C314,414 317,557 373,450.0000 z"});

			// clip: Object
			//		an object that defines the clipping geometry, or null to remove clip.
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			this.clip = clip;
		},
		
		getClip: function(){
			return this.clip;
		},
	
		setShape: function(shape){
			// summary:
			//		sets a shape object
			//		(the default implementation simply ignores it)
			// shape: Object
			//		a shape object
			//		(see dojox/gfx.defaultPath,
			//		dojox/gfx.defaultPolyline,
			//		dojox/gfx.defaultRect,
			//		dojox/gfx.defaultEllipse,
			//		dojox/gfx.defaultCircle,
			//		dojox/gfx.defaultLine,
			//		or dojox/gfx.defaultImage)
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			this.shape = g.makeParameters(this.shape, shape);
			this.bbox = null;
			return this;	// self
		},
		setFill: function(fill){
			// summary:
			//		sets a fill object
			//		(the default implementation simply ignores it)
			// fill: Object
			//		a fill object
			//		(see dojox/gfx.defaultLinearGradient,
			//		dojox/gfx.defaultRadialGradient,
			//		dojox/gfx.defaultPattern,
			//		or dojo/_base/Color)
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			if(!fill){
				// don't fill
				this.fillStyle = null;
				return this;	// self
			}
			var f = null;
			if(typeof(fill) == "object" && "type" in fill){
				// gradient or pattern
				switch(fill.type){
					case "linear":
						f = g.makeParameters(g.defaultLinearGradient, fill);
						break;
					case "radial":
						f = g.makeParameters(g.defaultRadialGradient, fill);
						break;
					case "pattern":
						f = g.makeParameters(g.defaultPattern, fill);
						break;
				}
			}else{
				// color object
				f = g.normalizeColor(fill);
			}
			this.fillStyle = f;
			return this;	// self
		},
		setStroke: function(stroke){
			// summary:
			//		sets a stroke object
			//		(the default implementation simply ignores it)
			// stroke: Object
			//		a stroke object
			//		(see dojox/gfx.defaultStroke)
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			if(!stroke){
				// don't stroke
				this.strokeStyle = null;
				return this;	// self
			}
			// normalize the stroke
			if(typeof stroke == "string" || lang.isArray(stroke) || stroke instanceof Color){
				stroke = {color: stroke};
			}
			var s = this.strokeStyle = g.makeParameters(g.defaultStroke, stroke);
			s.color = g.normalizeColor(s.color);
			return this;	// self
		},
		setTransform: function(matrix){
			// summary:
			//		sets a transformation matrix
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a matrix or a matrix-like object
			//		(see an argument of dojox/gfx/matrix.Matrix2D
			//		constructor for a list of acceptable arguments)
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			this.matrix = matrixLib.clone(matrix ? matrixLib.normalize(matrix) : matrixLib.identity);
			return this._applyTransform();	// self
		},
	
		_applyTransform: function(){
			// summary:
			//		physically sets a matrix
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			return this;	// self
		},
	
		// z-index
	
		moveToFront: function(){
			// summary:
			//		moves a shape to front of its parent's list of shapes
			var p = this.getParent();
			if(p){
				p._moveChildToFront(this);
				this._moveToFront();	// execute renderer-specific action
			}
			return this;	// self
		},
		moveToBack: function(){
			// summary:
			//		moves a shape to back of its parent's list of shapes
			var p = this.getParent();
			if(p){
				p._moveChildToBack(this);
				this._moveToBack();	// execute renderer-specific action
			}
			return this;
		},
		_moveToFront: function(){
			// summary:
			//		renderer-specific hook, see dojox/gfx/shape.Shape.moveToFront()
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
		},
		_moveToBack: function(){
			// summary:
			//		renderer-specific hook, see dojox/gfx/shape.Shape.moveToFront()
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
		},
	
		// apply left & right transformation
	
		applyRightTransform: function(matrix){
			// summary:
			//		multiplies the existing matrix with an argument on right side
			//		(this.matrix * matrix)
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a matrix or a matrix-like object
			//		(see an argument of dojox/gfx/matrix.Matrix2D
			//		constructor for a list of acceptable arguments)
			return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
		},
		applyLeftTransform: function(matrix){
			// summary:
			//		multiplies the existing matrix with an argument on left side
			//		(matrix * this.matrix)
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a matrix or a matrix-like object
			//		(see an argument of dojox/gfx/matrix.Matrix2D
			//		constructor for a list of acceptable arguments)
			return matrix ? this.setTransform([matrix, this.matrix]) : this;	// self
		},
		applyTransform: function(matrix){
			// summary:
			//		a shortcut for dojox/gfx/shape.Shape.applyRightTransform
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a matrix or a matrix-like object
			//		(see an argument of dojox/gfx/matrix.Matrix2D
			//		constructor for a list of acceptable arguments)
			return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
		},
	
		// virtual group methods
	
		removeShape: function(silently){
			// summary:
			//		removes the shape from its parent's list of shapes
			// silently: Boolean
			//		if true, do not redraw a picture yet
			if(this.parent){
				this.parent.remove(this, silently);
			}
			return this;	// self
		},
		_setParent: function(parent, matrix){
			// summary:
			//		sets a parent
			// parent: Object
			//		a parent or null
			//		(see dojox/gfx/shape.Surface,
			//		or dojox/gfx.Group)
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix or a matrix-like object
			this.parent = parent;
			return this._updateParentMatrix(matrix);	// self
		},
		_updateParentMatrix: function(matrix){
			// summary:
			//		updates the parent matrix with new matrix
			// matrix: dojox/gfx/Matrix2D
			//		a 2D matrix or a matrix-like object
			this.parentMatrix = matrix ? matrixLib.clone(matrix) : null;
			return this._applyTransform();	// self
		},
		_getRealMatrix: function(){
			// summary:
			//		returns the cumulative ('real') transformation matrix
			//		by combining the shape's matrix with its parent's matrix
			var m = this.matrix;
			var p = this.parent;
			while(p){
				if(p.matrix){
					m = matrixLib.multiply(p.matrix, m);
				}
				p = p.parent;
			}
			return m;	// dojox/gfx/matrix.Matrix2D
		}
	});
	
	shape._eventsProcessing = {
		connect: function(name, object, method){
			// summary:
			//		connects a handler to an event on this shape
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			// redirect to fixCallback to normalize events and add the gfxTarget to the event. The latter
			// is done by dojox/gfx.fixTarget which is defined by each renderer
			return events.connect(this.getEventSource(), name, shape.fixCallback(this, g.fixTarget, object, method));
			
		},
		disconnect: function(token){
			// summary:
			//		connects a handler by token from an event on this shape
			
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
	
			events.disconnect(token);
		}
	};
	
	shape.fixCallback = function(gfxElement, fixFunction, scope, method){
		// summary:
		//		Wraps the callback to allow for tests and event normalization
		//		before it gets invoked. This is where 'fixTarget' is invoked.
		// tags:
		//      private
		// gfxElement: Object
		//		The GFX object that triggers the action (ex.:
		//		dojox/gfx.Surface and dojox/gfx/shape.Shape). A new event property
		//		'gfxTarget' is added to the event to reference this object.
		//		for easy manipulation of GFX objects by the event handlers.
		// fixFunction: Function
		//		The function that implements the logic to set the 'gfxTarget'
		//		property to the event. It should be 'dojox/gfx.fixTarget' for
		//		most of the cases
		// scope: Object
		//		Optional. The scope to be used when invoking 'method'. If
		//		omitted, a global scope is used.
		// method: Function|String
		//		The original callback to be invoked.
		if(!method){
			method = scope;
			scope = null;
		}
		if(lang.isString(method)){
			scope = scope || kernel.global;
			if(!scope[method]){ throw(['dojox.gfx.shape.fixCallback: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
			return function(e){  
				return fixFunction(e,gfxElement) ? scope[method].apply(scope, arguments || []) : undefined; }; // Function
		}
		return !scope 
			? function(e){ 
				return fixFunction(e,gfxElement) ? method.apply(scope, arguments) : undefined; } 
			: function(e){ 
				return fixFunction(e,gfxElement) ? method.apply(scope, arguments || []) : undefined; }; // Function
	};
	lang.extend(shape.Shape, shape._eventsProcessing);
	
	shape.Container = {
		// summary:
		//		a container of shapes, which can be used
		//		as a foundation for renderer-specific groups, or as a way
		//		to logically group shapes (e.g, to propagate matricies)
	
		_init: function() {
			// children: Array
			//		a list of children
			this.children = [];
		},
	
		// group management
	
		openBatch: function() {
			// summary:
			//		starts a new batch, subsequent new child shapes will be held in
			//		the batch instead of appending to the container directly
		},
		closeBatch: function() {
			// summary:
			//		submits the current batch, append all pending child shapes to DOM
		},
		add: function(shape){
			// summary:
			//		adds a shape to the list
			// shape: dojox/gfx/shape.Shape
			//		the shape to add to the list
			var oldParent = shape.getParent();
			if(oldParent){
				oldParent.remove(shape, true);
			}
			this.children.push(shape);
			return shape._setParent(this, this._getRealMatrix());	// self
		},
		remove: function(shape, silently){
			// summary:
			//		removes a shape from the list
			// shape: dojox/gfx/shape.Shape
			//		the shape to remove
			// silently: Boolean
			//		if true, do not redraw a picture yet
			for(var i = 0; i < this.children.length; ++i){
				if(this.children[i] == shape){
					if(silently){
						// skip for now
					}else{
						shape.parent = null;
						shape.parentMatrix = null;
					}
					this.children.splice(i, 1);
					break;
				}
			}
			return this;	// self
		},
		clear: function(/*Boolean?*/ destroy){
			// summary:
			//		removes all shapes from a group/surface.
			// destroy: Boolean
			//		Indicates whether the children should be destroyed. Optional.
			var shape;
			for(var i = 0; i < this.children.length;++i){
				shape = this.children[i];
				shape.parent = null;
				shape.parentMatrix = null;
				if(destroy){
					shape.destroy();
				}
			}
			this.children = [];
			return this;	// self
		},
		getBoundingBox: function(){
			// summary:
			//		Returns the bounding box Rectangle for this shape.
			if(this.children){
				// if this is a composite shape, then sum up all the children
				var result = null;
				arr.forEach(this.children, function(shape){
					var bb = shape.getBoundingBox();
					if(bb){
						var ct = shape.getTransform();
						if(ct){
							bb = matrixLib.multiplyRectangle(ct, bb);
						}
						if(result){
							// merge two bbox 
							result.x = Math.min(result.x, bb.x);
							result.y = Math.min(result.y, bb.y);
							result.endX = Math.max(result.endX, bb.x + bb.width);
							result.endY = Math.max(result.endY, bb.y + bb.height);
						}else{
							// first bbox 
							result = {
								x: bb.x,
								y: bb.y,
								endX: bb.x + bb.width,
								endY: bb.y + bb.height
							};
						}
					}
				});
				if(result){
					result.width = result.endX - result.x;
					result.height = result.endY - result.y;
				}
				return result; // dojox/gfx.Rectangle
			}
			// unknown/empty bounding box, subclass shall override this impl 
			return null;
		},
		// moving child nodes
		_moveChildToFront: function(shape){
			// summary:
			//		moves a shape to front of the list of shapes
			// shape: dojox/gfx/shape.Shape
			//		one of the child shapes to move to the front
			for(var i = 0; i < this.children.length; ++i){
				if(this.children[i] == shape){
					this.children.splice(i, 1);
					this.children.push(shape);
					break;
				}
			}
			return this;	// self
		},
		_moveChildToBack: function(shape){
			// summary:
			//		moves a shape to back of the list of shapes
			// shape: dojox/gfx/shape.Shape
			//		one of the child shapes to move to the front
			for(var i = 0; i < this.children.length; ++i){
				if(this.children[i] == shape){
					this.children.splice(i, 1);
					this.children.unshift(shape);
					break;
				}
			}
			return this;	// self
		}
	};

	shape.Surface = declare("dojox.gfx.shape.Surface", null, {
		// summary:
		//		a surface object to be used for drawings
		constructor: function(){
			// underlying node
			this.rawNode = null;
			// the parent node
			this._parent = null;
			// the list of DOM nodes to be deleted in the case of destruction
			this._nodes = [];
			// the list of events to be detached in the case of destruction
			this._events = [];
		},
		destroy: function(){
			// summary:
			//		destroy all relevant external resources and release all
			//		external references to make this object garbage-collectible
			arr.forEach(this._nodes, domConstruct.destroy);
			this._nodes = [];
			arr.forEach(this._events, events.disconnect);
			this._events = [];
			this.rawNode = null;	// recycle it in _nodes, if it needs to be recycled
			if(has("ie")){
				while(this._parent.lastChild){
					domConstruct.destroy(this._parent.lastChild);
				}
			}else{
				this._parent.innerHTML = "";
			}
			this._parent = null;
		},
		getEventSource: function(){
			// summary:
			//		returns a node, which can be used to attach event listeners
			return this.rawNode; // Node
		},
		_getRealMatrix: function(){
			// summary:
			//		always returns the identity matrix
			return null;	// dojox/gfx/Matrix2D
		},
		/*=====
		 setDimensions: function(width, height){
			 // summary:
			 //		sets the width and height of the rawNode
			 // width: String
			 //		width of surface, e.g., "100px"
			 // height: String
			 //		height of surface, e.g., "100px"
			 return this;	// self
		 },
		 getDimensions: function(){
			 // summary:
			 //     gets current width and height in pixels
			 // returns: Object
			 //     object with properties "width" and "height"
		 },
		 =====*/
		isLoaded: true,
		onLoad: function(/*dojox/gfx/shape.Surface*/ surface){
			// summary:
			//		local event, fired once when the surface is created
			//		asynchronously, used only when isLoaded is false, required
			//		only for Silverlight.
		},
		whenLoaded: function(/*Object|Null*/ context, /*Function|String*/ method){
			var f = lang.hitch(context, method);
			if(this.isLoaded){
				f(this);
			}else{
				var h = events.connect(this, "onLoad", function(surface){
					events.disconnect(h);
					f(surface);
				});
			}
		}
	});
	lang.extend(shape.Surface, shape._eventsProcessing);

	/*=====
	g.Point = declare("dojox/gfx.Point", null, {
		// summary:
		//		2D point for drawings - {x, y}
		// description:
		//		Do not use this object directly!
		//		Use the naked object instead: {x: 1, y: 2}.
	});

	g.Rectangle = declare("dojox.gfx.Rectangle", null, {
		// summary:
		//		rectangle - {x, y, width, height}
		// description:
		//		Do not use this object directly!
		//		Use the naked object instead: {x: 1, y: 2, width: 100, height: 200}.
	});
	 =====*/


	shape.Rect = declare("dojox.gfx.shape.Rect", shape.Shape, {
		// summary:
		//		a generic rectangle
		constructor: function(rawNode){
			// rawNode: Node
			//		The underlying graphics system object (typically a DOM Node)
			this.shape = g.getDefault("Rect");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary:
			//		returns the bounding box (its shape in this case)
			return this.shape;	// dojox/gfx.Rectangle
		}
	});
	
	shape.Ellipse = declare("dojox.gfx.shape.Ellipse", shape.Shape, {
		// summary:
		//		a generic ellipse
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Ellipse");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary:
			//		returns the bounding box
			if(!this.bbox){
				var shape = this.shape;
				this.bbox = {x: shape.cx - shape.rx, y: shape.cy - shape.ry,
					width: 2 * shape.rx, height: 2 * shape.ry};
			}
			return this.bbox;	// dojox/gfx.Rectangle
		}
	});
	
	shape.Circle = declare("dojox.gfx.shape.Circle", shape.Shape, {
		// summary:
		//		a generic circle
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Circle");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary:
			//		returns the bounding box
			if(!this.bbox){
				var shape = this.shape;
				this.bbox = {x: shape.cx - shape.r, y: shape.cy - shape.r,
					width: 2 * shape.r, height: 2 * shape.r};
			}
			return this.bbox;	// dojox/gfx.Rectangle
		}
	});
	
	shape.Line = declare("dojox.gfx.shape.Line", shape.Shape, {
		// summary:
		//		a generic line (do not instantiate it directly)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Line");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary:
			//		returns the bounding box
			if(!this.bbox){
				var shape = this.shape;
				this.bbox = {
					x:		Math.min(shape.x1, shape.x2),
					y:		Math.min(shape.y1, shape.y2),
					width:	Math.abs(shape.x2 - shape.x1),
					height:	Math.abs(shape.y2 - shape.y1)
				};
			}
			return this.bbox;	// dojox/gfx.Rectangle
		}
	});
	
	shape.Polyline = declare("dojox.gfx.shape.Polyline", shape.Shape, {
		// summary:
		//		a generic polyline/polygon (do not instantiate it directly)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Polyline");
			this.rawNode = rawNode;
		},
		setShape: function(points, closed){
			// summary:
			//		sets a polyline/polygon shape object
			// points: Object|Array
			//		a polyline/polygon shape object, or an array of points
			// closed: Boolean
			//		close the polyline to make a polygon
			if(points && points instanceof Array){
				this.inherited(arguments, [{points: points}]);
				if(closed && this.shape.points.length){
					this.shape.points.push(this.shape.points[0]);
				}
			}else{
				this.inherited(arguments, [points]);
			}
			return this;	// self
		},
		_normalizePoints: function(){
			// summary:
			//		normalize points to array of {x:number, y:number}
			var p = this.shape.points, l = p && p.length;
			if(l && typeof p[0] == "number"){
				var points = [];
				for(var i = 0; i < l; i += 2){
					points.push({x: p[i], y: p[i + 1]});
				}
				this.shape.points = points;
			}
		},
		getBoundingBox: function(){
			// summary:
			//		returns the bounding box
			if(!this.bbox && this.shape.points.length){
				var p = this.shape.points;
				var l = p.length;
				var t = p[0];
				var bbox = {l: t.x, t: t.y, r: t.x, b: t.y};
				for(var i = 1; i < l; ++i){
					t = p[i];
					if(bbox.l > t.x) bbox.l = t.x;
					if(bbox.r < t.x) bbox.r = t.x;
					if(bbox.t > t.y) bbox.t = t.y;
					if(bbox.b < t.y) bbox.b = t.y;
				}
				this.bbox = {
					x:		bbox.l,
					y:		bbox.t,
					width:	bbox.r - bbox.l,
					height:	bbox.b - bbox.t
				};
			}
			return this.bbox;	// dojox/gfx.Rectangle
		}
	});
	
	shape.Image = declare("dojox.gfx.shape.Image", shape.Shape, {
		// summary:
		//		a generic image (do not instantiate it directly)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Image");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary:
			//		returns the bounding box (its shape in this case)
			return this.shape;	// dojox/gfx.Rectangle
		},
		setStroke: function(){
			// summary:
			//		ignore setting a stroke style
			return this;	// self
		},
		setFill: function(){
			// summary:
			//		ignore setting a fill style
			return this;	// self
		}
	});
	
	shape.Text = declare(shape.Shape, {
		// summary:
		//		a generic text (do not instantiate it directly)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.fontStyle = null;
			this.shape = g.getDefault("Text");
			this.rawNode = rawNode;
		},
		getFont: function(){
			// summary:
			//		returns the current font object or null
			return this.fontStyle;	// Object
		},
		setFont: function(newFont){
			// summary:
			//		sets a font for text
			// newFont: Object
			//		a font object (see dojox/gfx.defaultFont) or a font string
			this.fontStyle = typeof newFont == "string" ? g.splitFontString(newFont) :
				g.makeParameters(g.defaultFont, newFont);
			this._setFont();
			return this;	// self
		}
	});
	
	shape.Creator = {
		// summary:
		//		shape creators
		createShape: function(shape){
			// summary:
			//		creates a shape object based on its type; it is meant to be used
			//		by group-like objects
			// shape: Object
			//		a shape descriptor object
			// returns: dojox/gfx/shape.Shape | Null
			//      a fully instantiated surface-specific Shape object
			switch(shape.type){
				case g.defaultPath.type:		return this.createPath(shape);
				case g.defaultRect.type:		return this.createRect(shape);
				case g.defaultCircle.type:	    return this.createCircle(shape);
				case g.defaultEllipse.type:	    return this.createEllipse(shape);
				case g.defaultLine.type:		return this.createLine(shape);
				case g.defaultPolyline.type:	return this.createPolyline(shape);
				case g.defaultImage.type:		return this.createImage(shape);
				case g.defaultText.type:		return this.createText(shape);
				case g.defaultTextPath.type:	return this.createTextPath(shape);
			}
			return null;
		},
		createGroup: function(){
			// summary:
			//		creates a group shape
			return this.createObject(g.Group);	// dojox/gfx/Group
		},
		createRect: function(rect){
			// summary:
			//		creates a rectangle shape
			// rect: Object
			//		a path object (see dojox/gfx.defaultRect)
			return this.createObject(g.Rect, rect);	// dojox/gfx/shape.Rect
		},
		createEllipse: function(ellipse){
			// summary:
			//		creates an ellipse shape
			// ellipse: Object
			//		an ellipse object (see dojox/gfx.defaultEllipse)
			return this.createObject(g.Ellipse, ellipse);	// dojox/gfx/shape.Ellipse
		},
		createCircle: function(circle){
			// summary:
			//		creates a circle shape
			// circle: Object
			//		a circle object (see dojox/gfx.defaultCircle)
			return this.createObject(g.Circle, circle);	// dojox/gfx/shape.Circle
		},
		createLine: function(line){
			// summary:
			//		creates a line shape
			// line: Object
			//		a line object (see dojox/gfx.defaultLine)
			return this.createObject(g.Line, line);	// dojox/gfx/shape.Line
		},
		createPolyline: function(points){
			// summary:
			//		creates a polyline/polygon shape
			// points: Object
			//		a points object (see dojox/gfx.defaultPolyline)
			//		or an Array of points
			return this.createObject(g.Polyline, points);	// dojox/gfx/shape.Polyline
		},
		createImage: function(image){
			// summary:
			//		creates a image shape
			// image: Object
			//		an image object (see dojox/gfx.defaultImage)
			return this.createObject(g.Image, image);	// dojox/gfx/shape.Image
		},
		createText: function(text){
			// summary:
			//		creates a text shape
			// text: Object
			//		a text object (see dojox/gfx.defaultText)
			return this.createObject(g.Text, text);	// dojox/gfx/shape.Text
		},
		createPath: function(path){
			// summary:
			//		creates a path shape
			// path: Object
			//		a path object (see dojox/gfx.defaultPath)
			return this.createObject(g.Path, path);	// dojox/gfx/shape.Path
		},
		createTextPath: function(text){
			// summary:
			//		creates a text shape
			// text: Object
			//		a textpath object (see dojox/gfx.defaultTextPath)
			return this.createObject(g.TextPath, {}).setText(text);	// dojox/gfx/shape.TextPath
		},
		createObject: function(shapeType, rawShape){
			// summary:
			//		creates an instance of the passed shapeType class
			// shapeType: Function
			//		a class constructor to create an instance of
			// rawShape: Object 
			//		properties to be passed in to the classes 'setShape' method
	
			// SHOULD BE RE-IMPLEMENTED BY THE RENDERER!
			return null;	// dojox/gfx/shape.Shape
		}
	};
	
	/*=====
	 lang.extend(shape.Surface, shape.Container);
	 lang.extend(shape.Surface, shape.Creator);

	 g.Group = declare(shape.Shape, {
		// summary:
		//		a group shape, which can be used
		//		to logically group shapes (e.g, to propagate matricies)
	});
	lang.extend(g.Group, shape.Container);
	lang.extend(g.Group, shape.Creator);

	g.Rect     = shape.Rect;
	g.Circle   = shape.Circle;
	g.Ellipse  = shape.Ellipse;
	g.Line     = shape.Line;
	g.Polyline = shape.Polyline;
	g.Path     = shape.Path;
	g.Text     = shape.Text;
	g.Surface  = shape.Surface;

	g.Path = g.path.Path;
	g.TextPath = g.path.TextPath;
	=====*/

	return shape;
});
