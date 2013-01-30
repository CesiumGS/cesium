define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojox/gfx",
	"dojox/gfx/matrix",
	"./_base",
	"./scheduler",
	"./gradient",
	"./vector",
	"./matrix",
	"./lighting"
	/*===== , "dojox/gfx/shape" =====*/		// gfx.Surface
], function(arrayUtil,declare,lang,gfx,matrixUtil2d,gfx3d,schedulerExtensions,Gradient,VectorUtil,matrixUtil,lightUtil){

var scheduler = schedulerExtensions.scheduler;
	
// FIXME: why the "out" var here?
var out = function(o, x){
	if(arguments.length > 1){
		// console.debug("debug:", o);
		o = x;
	}
	var e = {};
	for(var i in o){
		if(i in e){ continue; }
		// console.debug("debug:", i, typeof o[i], o[i]);
	}
};

declare("dojox.gfx3d.Object", null, {
	constructor: function(){
		// summary:
		//		a Object object, which knows how to map
		//		3D objects to 2D shapes.

		// object: Object
		//		an abstract Object object
		//		(see dojox.gfx3d.defaultEdges,
		//		dojox.gfx3d.defaultTriangles,
		//		dojox.gfx3d.defaultQuads
		//		dojox.gfx3d.defaultOrbit
		//		dojox.gfx3d.defaultCube
		//		or dojox.gfx3d.defaultCylinder)
		this.object = null;

		// matrix: dojox.gfx3d.matrix
		//		world transform
		this.matrix = null;

		// cache:
		//		buffer for intermediate result, used late for draw()
		this.cache = null;

		// renderer:
		//		a reference for the Viewport
		this.renderer = null;

		// parent:
		//		a reference for parent, Scene or Viewport object
		this.parent = null;

		// strokeStyle: Object
		//		a stroke object
		this.strokeStyle = null;

		// fillStyle: Object
		//		a fill object or texture object
		this.fillStyle = null;

		// shape: dojox.gfx.Shape
		//		an underlying 2D shape
		this.shape = null;
	},

	setObject: function(newObject){
		// summary:
		//		sets a Object object
		// object: Object
		//		an abstract Object object
		//		(see dojox.gfx3d.defaultEdges,
		//		dojox.gfx3d.defaultTriangles,
		//		dojox.gfx3d.defaultQuads
		//		dojox.gfx3d.defaultOrbit
		//		dojox.gfx3d.defaultCube
		//		or dojox.gfx3d.defaultCylinder)
		this.object = gfx.makeParameters(this.object, newObject);
		return this;
	},

	setTransform: function(matrix){
		// summary:
		//		sets a transformation matrix

		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx3d.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		this.matrix = matrixUtil.clone(matrix ? matrixUtil.normalize(matrix) : gfx3d.identity, true);

		return this;	// self
	},

	// apply left & right transformation
	
	applyRightTransform: function(matrix){
		// summary:
		//		multiplies the existing matrix with an argument on right side
		//		(this.matrix * matrix)
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	applyLeftTransform: function(matrix){
		// summary:
		//		multiplies the existing matrix with an argument on left side
		//		(matrix * this.matrix)
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([matrix, this.matrix]) : this;	// self
	},

	applyTransform: function(matrix){
		// summary:
		//		a shortcut for dojox.gfx.Shape.applyRightTransform
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	
	setFill: function(fill){
		// summary:
		//		sets a fill object
		//		(the default implementation is to delegate to
		//		the underlying 2D shape).
		// fill: Object
		//		a fill object
		//		(see dojox.gfx.defaultLinearGradient,
		//		dojox.gfx.defaultRadialGradient,
		//		dojox.gfx.defaultPattern,
		//		dojo.Color
		//		or dojox.gfx.MODEL)
		this.fillStyle = fill;
		return this;
	},

	setStroke: function(stroke){
		// summary:
		//		sets a stroke object
		//		(the default implementation simply ignores it)
		// stroke: Object
		//		a stroke object
		//		(see dojox.gfx.defaultStroke)
		this.strokeStyle = stroke;
		return this;
	},

	toStdFill: function(lighting, normal){
		return (this.fillStyle && typeof this.fillStyle['type'] != "undefined") ? 
			lighting[this.fillStyle.type](normal, this.fillStyle.finish, this.fillStyle.color)
			: this.fillStyle;
	},

	invalidate: function(){
		this.renderer.addTodo(this);
	},
	
	destroy: function(){
		if(this.shape){
			var p = this.shape.getParent();
			if(p){
				p.remove(this.shape);
			}
			this.shape = null;
		}
	},

	// All the 3D objects need to override the following virtual functions:
	// render, getZOrder, getOutline, draw, redraw if necessary.

	render: function(camera){
		throw "Pure virtual function, not implemented";
	},

	draw: function(lighting){
		throw "Pure virtual function, not implemented";
	},

	getZOrder: function(){
		return 0;
	},

	getOutline: function(){
		return null;
	}

});

declare("dojox.gfx3d.Scene", gfx3d.Object, {
	// summary:
	//		the Scene is just a container.
	
	// note: we have the following assumption:
	// all objects in the Scene are not overlapped with other objects
	// outside of the scene.
	constructor: function(){
		// summary:
		//		a container of other 3D objects
		this.objects= [];
		this.todos = [];
		this.schedule = scheduler.zOrder;
		this._draw = gfx3d.drawer.conservative;
	},

	setFill: function(fill){
		this.fillStyle = fill;
		arrayUtil.forEach(this.objects, function(item){
			item.setFill(fill);
		});
		return this;
	},

	setStroke: function(stroke){
		this.strokeStyle = stroke;
		arrayUtil.forEach(this.objects, function(item){
			item.setStroke(stroke);
		});
		return this;
	},

	render: function(camera, deep){
		var m = matrixUtil.multiply(camera, this.matrix);
		if(deep){
			this.todos = this.objects;
		}
		arrayUtil.forEach(this.todos, function(item){ item.render(m, deep); });
	},

	draw: function(lighting){
		this.objects = this.schedule(this.objects);
		this._draw(this.todos, this.objects, this.renderer);
	},

	addTodo: function(newObject){
		// FIXME: use indexOf?
		if(arrayUtil.every(this.todos, function(item){ return item != newObject; })){
			this.todos.push(newObject);
			this.invalidate();
		}
	},

	invalidate: function(){
		this.parent.addTodo(this);
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.objects, function(item){ zOrder += item.getZOrder(); });
		return (this.objects.length > 1) ?  zOrder / this.objects.length : 0;
	}
});


declare("dojox.gfx3d.Edges", gfx3d.Object, {
	constructor: function(){
		// summary:
		//		a generic edge in 3D viewport
		this.object = lang.clone(gfx3d.defaultEdges);
	},

	setObject: function(/*Points[]|Object*/ newObject, /*String?*/ style){
		// summary:
		//		setup the object
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? { points: newObject, style: style } : newObject);
		return this;
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.cache, function(item){ zOrder += item.z;} );
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		this.cache = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
	},

	draw: function(){
		var c = this.cache;
		if(this.shape){
			this.shape.setShape("")
		}else{
			this.shape = this.renderer.createPath();
		}
		var p = this.shape.setAbsoluteMode("absolute");

		if(this.object.style == "strip" || this.object.style == "loop"){
			p.moveTo(c[0].x, c[0].y);
			arrayUtil.forEach(c.slice(1), function(item){
				p.lineTo(item.x, item.y);
			});
			if(this.object.style == "loop"){
				p.closePath();
			}
		}else{
			for(var i = 0; i < this.cache.length; ){
				p.moveTo(c[i].x, c[i].y);
				i ++;
				p.lineTo(c[i].x, c[i].y);
				i ++;
			}
		}
		// FIXME: doe setFill make sense here?
		p.setStroke(this.strokeStyle);
	}
});

declare("dojox.gfx3d.Orbit", gfx3d.Object, {
	constructor: function(){
		// summary:
		//		a generic edge in 3D viewport
		this.object = lang.clone(gfx3d.defaultOrbit);
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		var angles = [0, Math.PI/4, Math.PI/3];
		var center = matrixUtil.multiplyPoint(m, this.object.center);
		var marks = arrayUtil.map(angles, function(item){
			return {x: this.center.x + this.radius * Math.cos(item),
				y: this.center.y + this.radius * Math.sin(item), z: this.center.z};
			}, this.object);

		marks = arrayUtil.map(marks, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});

		var normal = VectorUtil.normalize(marks);

		marks = arrayUtil.map(marks, function(item){
			return VectorUtil.substract(item, center);
		});

		// Use the algorithm here:
		// http://www.3dsoftware.com/Math/PlaneCurves/EllipseAlgebra/
		// After we normalize the marks, the equation is:
		// a x^2 + 2b xy + cy^2 + f = 0: let a = 1
		// so the final equation is:
		//		[ xy, y^2, 1] * [2b, c, f]' = [ -x^2 ]'

		var A = {
			xx: marks[0].x * marks[0].y, xy: marks[0].y * marks[0].y, xz: 1,
			yx: marks[1].x * marks[1].y, yy: marks[1].y * marks[1].y, yz: 1,
			zx: marks[2].x * marks[2].y, zy: marks[2].y * marks[2].y, zz: 1,
			dx: 0, dy: 0, dz: 0
		};
		var B = arrayUtil.map(marks, function(item){
			return -Math.pow(item.x, 2);
		});

		// X is 2b, c, f
		var X = matrixUtil.multiplyPoint(matrixUtil.invert(A),B[0], B[1], B[2]);
		var theta = Math.atan2(X.x, 1 - X.y) / 2;

		// rotate the marks back to the canonical form
		var probes = arrayUtil.map(marks, function(item){
			return matrixUtil2d.multiplyPoint(matrixUtil2d.rotate(-theta), item.x, item.y);
		});

		// we are solving the equation: Ax = b
		// A = [x^2, y^2] X = [1/a^2, 1/b^2]', b = [1, 1]'
		// so rx = Math.sqrt(1/ ( inv(A)[1:] * b ) );
		// so ry = Math.sqrt(1/ ( inv(A)[2:] * b ) );

		var a = Math.pow(probes[0].x, 2);
		var b = Math.pow(probes[0].y, 2);
		var c = Math.pow(probes[1].x, 2);
		var d = Math.pow(probes[1].y, 2);

		// the invert matrix is
		// 1/(ad -bc) [ d, -b; -c, a];
		var rx = Math.sqrt( (a*d - b*c)/ (d-b) );
		var ry = Math.sqrt( (a*d - b*c)/ (a-c) );

		this.cache = {cx: center.x, cy: center.y, rx: rx, ry: ry, theta: theta, normal: normal};
	},

	draw: function(lighting){
		if(this.shape){
			this.shape.setShape(this.cache);
		} else {
			this.shape = this.renderer.createEllipse(this.cache);
		}
		this.shape.applyTransform(matrixUtil2d.rotateAt(this.cache.theta, this.cache.cx, this.cache.cy))
			.setStroke(this.strokeStyle)
			.setFill(this.toStdFill(lighting, this.cache.normal));
	}
});

declare("dojox.gfx3d.Path3d", gfx3d.Object, {
	// This object is still very immature !
	constructor: function(){
		// summary:
		//		a generic line

		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultPath3d);
		this.segments = [];
		this.absolute = true;
		this.last = {};
		this.path = "";
	},

	_collectArgs: function(array, args){
		// summary:
		//		converts an array of arguments to plain numeric values
		// array: Array
		//		an output argument (array of numbers)
		// args: Array
		//		an input argument (can be values of Boolean, Number, dojox.gfx.Point, or an embedded array of them)
		for(var i = 0; i < args.length; ++i){
			var t = args[i];
			if(typeof(t) == "boolean"){
				array.push(t ? 1 : 0);
			}else if(typeof(t) == "number"){
				array.push(t);
			}else if(t instanceof Array){
				this._collectArgs(array, t);
			}else if("x" in t && "y" in t){
				array.push(t.x);
				array.push(t.y);
			}
		}
	},

	// a dictionary, which maps segment type codes to a number of their argemnts
	_validSegments: {m: 3, l: 3,  z: 0},

	_pushSegment: function(action, args){
		// summary:
		//		adds a segment
		// action: String
		//		valid SVG code for a segment's type
		// args: Array
		//		a list of parameters for this segment
		var group = this._validSegments[action.toLowerCase()], segment;
		if(typeof(group) == "number"){
			if(group){
				if(args.length >= group){
					segment = {action: action, args: args.slice(0, args.length - args.length % group)};
					this.segments.push(segment);
				}
			}else{
				segment = {action: action, args: []};
				this.segments.push(segment);
			}
		}
	},

	moveTo: function(){
		// summary:
		//		forms a move segment
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "M" : "m", args);
		return this; // self
	},
	lineTo: function(){
		// summary:
		//		forms a line segment
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "L" : "l", args);
		return this; // self
	},

	closePath: function(){
		// summary:
		//		closes a path
		this._pushSegment("Z", []);
		return this; // self
	},

	render: function(camera){
		// TODO: we need to get the ancestors' matrix
		var m = matrixUtil.multiply(camera, this.matrix);
		// iterate all the segments and convert them to 2D canvas
		// TODO consider the relative mode
		var path = "";
		var _validSegments = this._validSegments;
		arrayUtil.forEach(this.segments, function(item){
			path += item.action;
			for(var i = 0; i < item.args.length; i+= _validSegments[item.action.toLowerCase()] ){
				var pt = matrixUtil.multiplyPoint(m, item.args[i], item.args[i+1], item.args[i+2])
				path += " " + pt.x + " " + pt.y;
			}
		});

		this.cache =  path;
	},

	_draw: function(){
		return this.parent.createPath(this.cache);
	}
});

declare("dojox.gfx3d.Triangles", gfx3d.Object, {
	constructor: function(){
		// summary:
		//		a generic triangle

		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultTriangles);
	},

	setObject: function(/*Points[]|Object*/ newObject, /*String?*/ style){
		// summary:
		//		setup the object
		if(newObject instanceof Array){
			this.object = gfx.makeParameters(this.object, { points: newObject, style: style } );
		} else {
			this.object = gfx.makeParameters(this.object, newObject);
		}
		return this;
	},
	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		var c = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		this.cache = [];
		var pool = c.slice(0, 2);
		var center = c[0];
		if(this.object.style == "strip"){
			arrayUtil.forEach(c.slice(2), function(item){
				pool.push(item);
				pool.push(pool[0]);
				this.cache.push(pool);
				pool = pool.slice(1, 3);
			}, this);
		} else if(this.object.style == "fan"){
			arrayUtil.forEach(c.slice(2), function(item){
				pool.push(item);
				pool.push(center);
				this.cache.push(pool);
				pool = [center, item];
			}, this);
		} else {
			for(var i = 0; i < c.length; ){
				this.cache.push( [ c[i], c[i+1], c[i+2], c[i] ]);
				i += 3;
			}
		}
	},

	draw: function(lighting){
		// use the BSP to schedule
		this.cache = scheduler.bsp(this.cache, function(it){  return it; });
		if(this.shape){
			this.shape.clear();
		} else {
			this.shape = this.renderer.createGroup();
		}
		arrayUtil.forEach(this.cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(item)));
		}, this);
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.cache, function(item){
				zOrder += (item[0].z + item[1].z + item[2].z) / 3; });
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	}
});

declare("dojox.gfx3d.Quads", gfx3d.Object, {
	constructor: function(){
		// summary:
		//		a generic quad

		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultQuads);
	},

	setObject: function(/*Points[]|Object*/ newObject, /*String?*/ style){
		// summary:
		//		setup the object
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? 
			{ points: newObject, style: style } 
				: newObject );
		return this;
	},
	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix), i;
		var c = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		this.cache = [];
		if(this.object.style == "strip"){
			var pool = c.slice(0, 2);
			for(i = 2; i < c.length; ){
				pool = pool.concat( [ c[i], c[i+1], pool[0] ] );
				this.cache.push(pool);
				pool = pool.slice(2,4);
				i += 2;
			}
		}else{
			for(i = 0; i < c.length; ){
				this.cache.push( [c[i], c[i+1], c[i+2], c[i+3], c[i] ] );
				i += 4;
			}
		}
	},

	draw: function(lighting){
		// use the BSP to schedule
		this.cache = gfx3d.scheduler.bsp(this.cache, function(it){  return it; });
		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			this.shape.createPolyline(this.cache[x])
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(this.cache[x])));
		}
		/*
		dojo.forEach(this.cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, dojox.gfx3d.vector.normalize(item)));
		}, this);
		*/
	},

	getZOrder: function(){
		var zOrder = 0;
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			var i = this.cache[x];
			zOrder += (i[0].z + i[1].z + i[2].z + i[3].z) / 4;
		}
		/*
		dojo.forEach(this.cache, function(item){
				zOrder += (item[0].z + item[1].z + item[2].z + item[3].z) / 4; });
		*/
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	}
});

declare("dojox.gfx3d.Polygon", gfx3d.Object, {
	constructor: function(){
		// summary:
		//		a generic polygon

		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultPolygon);
	},

	setObject: function(/*Points[]|Object*/ newObject){
		// summary:
		//		setup the object
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? {path: newObject} : newObject)
		return this;
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		this.cache = arrayUtil.map(this.object.path, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		// add the first point to close the polyline
		this.cache.push(this.cache[0]);
	},

	draw: function(lighting){
		if(this.shape){
			this.shape.setShape({points: this.cache});
		}else{
			this.shape = this.renderer.createPolyline({points: this.cache});
		}

		this.shape.setStroke(this.strokeStyle)
			.setFill(this.toStdFill(lighting, matrixUtil.normalize(this.cache)));
	},

	getZOrder: function(){
		var zOrder = 0;
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			zOrder += this.cache[x].z;
		}
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	},

	getOutline: function(){
		return this.cache.slice(0, 3);
	}
});

declare("dojox.gfx3d.Cube", gfx3d.Object, {
	constructor: function(){
		// summary:
		//		a generic cube

		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultCube);
		this.polygons = [];
	},

	setObject: function(/*Points[]|Object*/ newObject){
		// summary:
		//		setup the object
		this.object = gfx.makeParameters(this.object, newObject);
	},

	render: function(camera){
		// parse the top, bottom to get 6 polygons:
		var a = this.object.top;
		var g = this.object.bottom;
		var b = {x: g.x, y: a.y, z: a.z};
		var c = {x: g.x, y: g.y, z: a.z};
		var d = {x: a.x, y: g.y, z: a.z};
		var e = {x: a.x, y: a.y, z: g.z};
		var f = {x: g.x, y: a.y, z: g.z};
		var h = {x: a.x, y: g.y, z: g.z};
		var polygons = [a, b, c, d, e, f, g, h];
		var m = matrixUtil.multiply(camera, this.matrix);
		var p = arrayUtil.map(polygons, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		a = p[0]; b = p[1]; c = p[2]; d = p[3]; e = p[4]; f = p[5]; g = p[6]; h = p[7];
		this.cache = [[a, b, c, d, a], [e, f, g, h, e], [a, d, h, e, a], [d, c, g, h, d], [c, b, f, g, c], [b, a, e, f, b]];
	},

	draw: function(lighting){
		// use bsp to sort.
		this.cache = gfx3d.scheduler.bsp(this.cache, function(it){ return it; });
		// only the last 3 polys are visible.
		var cache = this.cache.slice(3);

		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		for(var x=0; x<cache.length; x++){
			this.shape.createPolyline(cache[x])
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(cache[x])));
		}
		/*
		dojo.forEach(cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, dojox.gfx3d.vector.normalize(item)));
		}, this);
		*/
	},

	getZOrder: function(){
		var top = this.cache[0][0];
		var bottom = this.cache[1][2];
		return (top.z + bottom.z) / 2;
	}
});


declare("dojox.gfx3d.Cylinder", gfx3d.Object, {
	constructor: function(){
		this.object = lang.clone(gfx3d.defaultCylinder);
	},

	render: function(camera){
		// get the bottom surface first
		var m = matrixUtil.multiply(camera, this.matrix);
		var angles = [0, Math.PI/4, Math.PI/3];
		var center = matrixUtil.multiplyPoint(m, this.object.center);
		var marks = arrayUtil.map(angles, function(item){
			return {x: this.center.x + this.radius * Math.cos(item),
				y: this.center.y + this.radius * Math.sin(item), z: this.center.z};
			}, this.object);

		marks = arrayUtil.map(marks, function(item){
			return VectorUtil.substract(matrixUtil.multiplyPoint(m, item), center);
		});

		// Use the algorithm here:
		// http://www.3dsoftware.com/Math/PlaneCurves/EllipseAlgebra/
		// After we normalize the marks, the equation is:
		// a x^2 + 2b xy + cy^2 + f = 0: let a = 1
		// so the final equation is:
		//		[ xy, y^2, 1] * [2b, c, f]' = [ -x^2 ]'

		var A = {
			xx: marks[0].x * marks[0].y, xy: marks[0].y * marks[0].y, xz: 1,
			yx: marks[1].x * marks[1].y, yy: marks[1].y * marks[1].y, yz: 1,
			zx: marks[2].x * marks[2].y, zy: marks[2].y * marks[2].y, zz: 1,
			dx: 0, dy: 0, dz: 0
		};
		var B = arrayUtil.map(marks, function(item){
			return -Math.pow(item.x, 2);
		});

		// X is 2b, c, f
		var X = matrixUtil.multiplyPoint(matrixUtil.invert(A), B[0], B[1], B[2]);
		var theta = Math.atan2(X.x, 1 - X.y) / 2;

		// rotate the marks back to the canonical form
		var probes = arrayUtil.map(marks, function(item){
			return matrixUtil2d.multiplyPoint(matrixUtil2d.rotate(-theta), item.x, item.y);
		});

		// we are solving the equation: Ax = b
		// A = [x^2, y^2] X = [1/a^2, 1/b^2]', b = [1, 1]'
		// so rx = Math.sqrt(1/ ( inv(A)[1:] * b ) );
		// so ry = Math.sqrt(1/ ( inv(A)[2:] * b ) );

		var a = Math.pow(probes[0].x, 2);
		var b = Math.pow(probes[0].y, 2);
		var c = Math.pow(probes[1].x, 2);
		var d = Math.pow(probes[1].y, 2);

		// the invert matrix is
		// 1/(ad - bc) [ d, -b; -c, a];
		var rx = Math.sqrt((a * d - b * c) / (d - b));
		var ry = Math.sqrt((a * d - b * c) / (a - c));
		if(rx < ry){
			var t = rx;
			rx = ry;
			ry = t;
			theta -= Math.PI/2;
		}

		var top = matrixUtil.multiplyPoint(m,
			VectorUtil.sum(this.object.center, {x: 0, y:0, z: this.object.height}));

		var gradient = this.fillStyle.type == "constant" ? this.fillStyle.color
			: Gradient(this.renderer.lighting, this.fillStyle, this.object.center, this.object.radius, Math.PI, 2 * Math.PI, m);
		if(isNaN(rx) || isNaN(ry) || isNaN(theta)){
			// in case the cap is invisible (parallel to the incident vector)
			rx = this.object.radius, ry = 0, theta = 0;
		}
		this.cache = {center: center, top: top, rx: rx, ry: ry, theta: theta, gradient: gradient};
	},

	draw: function(){
		var c = this.cache, v = VectorUtil, m = matrixUtil2d,
			centers = [c.center, c.top], normal = v.substract(c.top, c.center);
		if(v.dotProduct(normal, this.renderer.lighting.incident) > 0){
			centers = [c.top, c.center];
			normal = v.substract(c.center, c.top);
		}

		var color = this.renderer.lighting[this.fillStyle.type](normal, this.fillStyle.finish, this.fillStyle.color),
			d = Math.sqrt( Math.pow(c.center.x - c.top.x, 2) + Math.pow(c.center.y - c.top.y, 2) );

		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		
		this.shape.createPath("")
			.moveTo(0, -c.rx)
			.lineTo(d, -c.rx)
			.lineTo(d, c.rx)
			.lineTo(0, c.rx)
			.arcTo(c.ry, c.rx, 0, true, true, 0, -c.rx)
			.setFill(c.gradient).setStroke(this.strokeStyle)
			.setTransform([m.translate(centers[0]),
				m.rotate(Math.atan2(centers[1].y - centers[0].y, centers[1].x - centers[0].x))]);

		if(c.rx > 0 && c.ry > 0){
			this.shape.createEllipse({cx: centers[1].x, cy: centers[1].y, rx: c.rx, ry: c.ry})
				.setFill(color).setStroke(this.strokeStyle)
				.applyTransform(m.rotateAt(c.theta, centers[1]));
		}
	}
});


// the ultimate container of 3D world
declare("dojox.gfx3d.Viewport", gfx.Group, {
	constructor: function(){
		// summary:
		//		a viewport/container for 3D objects, which knows
		//		the camera and lightings

		// matrix: dojox.gfx3d.matrix
		//		world transform

		// dimension: Object
		//		the dimension of the canvas
		this.dimension = null;

		// objects: Array
		//		all 3d Objects
		this.objects = [];
		// todos: Array
		//		all 3d Objects that needs to redraw
		this.todos = [];

		// FIXME: memory leak?
		this.renderer = this;
		// Using zOrder as the default scheduler
		this.schedule = gfx3d.scheduler.zOrder;
		this.draw = gfx3d.drawer.conservative;
		// deep: boolean, true means the whole viewport needs to re-render, redraw
		this.deep = false;

		// lights: Array
		//		an array of light objects
		this.lights = [];
		this.lighting = null;
	},

	setCameraTransform: function(matrix){
		// summary:
		//		sets a transformation matrix
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		this.camera = matrixUtil.clone(matrix ? matrixUtil.normalize(matrix) : gfx3d.identity, true);
		this.invalidate();
		return this;	// self
	},

	applyCameraRightTransform: function(matrix){
		// summary:
		//		multiplies the existing matrix with an argument on right side
		//		(this.matrix * matrix)
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx3d.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		return matrix ? this.setCameraTransform([this.camera, matrix]) : this;	// self
	},

	applyCameraLeftTransform: function(matrix){
		// summary:
		//		multiplies the existing matrix with an argument on left side
		//		(matrix * this.matrix)
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx3d.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		return matrix ? this.setCameraTransform([matrix, this.camera]) : this;	// self
	},

	applyCameraTransform: function(matrix){
		// summary:
		//		a shortcut for dojox.gfx3d.Object.applyRightTransform
		// matrix: dojox.gfx3d.matrix.Matrix
		//		a matrix or a matrix-like object
		//		(see an argument of dojox.gfx3d.matrix.Matrix
		//		constructor for a list of acceptable arguments)
		return this.applyCameraRightTransform(matrix); // self
	},

	setLights: function(/* Array|Object */lights, /* Color? */ ambient,
		/* Color? */ specular){
		// summary:
		//		set the lights
		// lights: Array
		//		an array of light object
		//		or lights object
		// ambient: Color
		//		an ambient object
		// specular: Color
		//		an specular object
		this.lights = (lights instanceof Array) ? 
			{sources: lights, ambient: ambient, specular: specular}
				: lights;
		var view = {x: 0, y: 0, z: 1};

		this.lighting = new lightUtil.Model(view, this.lights.sources,
				this.lights.ambient, this.lights.specular);
		this.invalidate();
		return this;
	},

	addLights: function(lights){
		// summary:
		//		add new light/lights to the viewport.
		// lights: Array|Object
		//		light object(s)
		return this.setLights(this.lights.sources.concat(lights));
	},

	addTodo: function(newObject){
		// NOTE: Viewport implements almost the same addTodo,
		// except calling invalidate, since invalidate is used as
		// any modification needs to redraw the object itself, call invalidate.
		// then call render.
		if(arrayUtil.every(this.todos,
			function(item){
				return item != newObject;
			}
		)){
			this.todos.push(newObject);
		}
	},

	invalidate: function(){
		this.deep = true;
		this.todos = this.objects;
	},

	setDimensions: function(dim){
		if(dim){
			var w = lang.isString(dim.width) ? parseInt(dim.width)  : dim.width;
			var h = lang.isString(dim.height) ? parseInt(dim.height) : dim.height;
			// there is no rawNode in canvas GFX implementation
			if(this.rawNode){
				var trs = this.rawNode.style;
				if(trs){
					trs.height = h;
					trs.width = w;
				}else{
					// silverlight
					this.rawNode.width = w;
					this.rawNode.height = h;
				}
			}
			this.dimension = {
				width:  w,
				height: h
			};
		}else{
			this.dimension = null;
		}
	},

	render: function(){
		// summary:
		//		iterate all children and call their render callback function.
		if(!this.todos.length){ return; }
		// console.debug("Viewport::render");
		var m = matrixUtil;
		
		// Iterate the todos and call render to prepare the rendering:
		for(var x=0; x<this.todos.length; x++){
			this.todos[x].render(matrixUtil.normalize([
				m.cameraRotateXg(180),
				m.cameraTranslate(0, this.dimension.height, 0),
				this.camera
			]), this.deep);
		}

		this.objects = this.schedule(this.objects);
		this.draw(this.todos, this.objects, this);
		this.todos = [];
		this.deep = false;
	}

});

//FIXME: Viewport cannot masquerade as a Group
gfx3d.Viewport.nodeType = gfx.Group.nodeType;

gfx3d._creators = {
	// summary:
	//		object creators
	createEdges: function(edges, style){
		// summary:
		//		creates an edge object
		return this.create3DObject(gfx3d.Edges, edges, style);	// dojox.gfx3d.Edge
	},
	createTriangles: function(tris, style){
		// summary:
		//		creates an triangle object
		return this.create3DObject(gfx3d.Triangles, tris, style);	// dojox.gfx3d.Edge
	},
	createQuads: function(quads, style){
		// summary:
		//		creates an quads object
		return this.create3DObject(gfx3d.Quads, quads, style);	// dojox.gfx3d.Edge
	},
	createPolygon: function(/*Points[]|Object*/ points){
		// summary:
		//		creates an polygon object
		return this.create3DObject(gfx3d.Polygon, points);	// dojox.gfx3d.Polygon
	},

	createOrbit: function(orbit){
		// summary:
		//		creates an Orbit object
		return this.create3DObject(gfx3d.Orbit, orbit);	// dojox.gfx3d.Cube
	},

	createCube: function(cube){
		// summary:
		//		creates an cube object
		return this.create3DObject(gfx3d.Cube, cube);	// dojox.gfx3d.Cube
	},

	createCylinder: function(cylinder){
		// summary:
		//		creates an cylinder object
		return this.create3DObject(gfx3d.Cylinder, cylinder);	// dojox.gfx3d.Cube
	},

	createPath3d: function(path){
		// summary:
		//		creates an 3d path object
		return this.create3DObject(gfx3d.Path3d, path);	// dojox.gfx3d.Edge
	},
	createScene: function(){
		// summary:
		//		creates a scene object
		return this.create3DObject(gfx3d.Scene);	// dojox.gfx3d.Scene
	},

	create3DObject: function(objectType, rawObject, style){
		// summary:
		//		creates an instance of the passed objectType class
		// objectType: Function
		//		a class constructor to create an instance of
		// rawObject: Object
		//		properties to be passed in to the classes "setShape" method
		var obj = new objectType();
		this.adopt(obj);
		if(rawObject){ obj.setObject(rawObject, style); }
		return obj;	// dojox.gfx3d.Object
	},
	// todo : override the add/remove if necessary
	adopt: function(obj){
		// summary:
		//		adds a shape to the list
		obj.renderer = this.renderer; // obj._setParent(this, null); more TODOs HERER?
		obj.parent = this;
		this.objects.push(obj);
		this.addTodo(obj);
		return this;
	},
	abandon: function(obj, silently){
		// summary:
		//		removes a shape from the list
		// silently: Boolean?
		//		if true, do not redraw a picture yet
		for(var i = 0; i < this.objects.length; ++i){
			if(this.objects[i] == obj){
				this.objects.splice(i, 1);
			}
		}
		// if(this.rawNode == shape.rawNode.parentNode){
		//	this.rawNode.removeChild(shape.rawNode);
		// }
		// obj._setParent(null, null);
		obj.parent = null;
		return this;	// self
	},


	setScheduler: function(scheduler){
		this.schedule = scheduler;
	},

	setDrawer: function(drawer){
		this.draw = drawer;
	}
};

lang.extend(gfx3d.Viewport, gfx3d._creators);
lang.extend(gfx3d.Scene, gfx3d._creators);
delete gfx3d._creators;


//FIXME: extending dojox.gfx.Surface and masquerading Viewport as Group is hacky!

// Add createViewport to dojox.gfx.Surface
lang.extend(gfx.Surface, {
	createViewport: function(){
		//FIXME: createObject is non-public method!
		var viewport = this.createObject(gfx3d.Viewport, null, true);
		//FIXME: this may not work with dojox.gfx.Group !!
		viewport.setDimensions(this.getDimensions());
		return viewport;
	}
});

	return gfx3d.Object;
});
