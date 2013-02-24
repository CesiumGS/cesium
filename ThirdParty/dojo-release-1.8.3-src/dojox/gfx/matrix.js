define(["./_base","dojo/_base/lang"], 
  function(g, lang){
	var m = g.matrix = {};

	// candidates for dojox.math:
	var _degToRadCache = {};
	m._degToRad = function(degree){
		return _degToRadCache[degree] || (_degToRadCache[degree] = (Math.PI * degree / 180));
	};
	m._radToDeg = function(radian){ return radian / Math.PI * 180; };

	m.Matrix2D = function(arg){
		// summary:
		//		a 2D matrix object
		// description:
		//		Normalizes a 2D matrix-like object. If arrays is passed,
		//		all objects of the array are normalized and multiplied sequentially.
		// arg: Object
		//		a 2D matrix-like object, a number, or an array of such objects
		if(arg){
			if(typeof arg == "number"){
				this.xx = this.yy = arg;
			}else if(arg instanceof Array){
				if(arg.length > 0){
					var matrix = m.normalize(arg[0]);
					// combine matrices
					for(var i = 1; i < arg.length; ++i){
						var l = matrix, r = m.normalize(arg[i]);
						matrix = new m.Matrix2D();
						matrix.xx = l.xx * r.xx + l.xy * r.yx;
						matrix.xy = l.xx * r.xy + l.xy * r.yy;
						matrix.yx = l.yx * r.xx + l.yy * r.yx;
						matrix.yy = l.yx * r.xy + l.yy * r.yy;
						matrix.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
						matrix.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
					}
					lang.mixin(this, matrix);
				}
			}else{
				lang.mixin(this, arg);
			}
		}
	};

	// the default (identity) matrix, which is used to fill in missing values
	lang.extend(m.Matrix2D, {xx: 1, xy: 0, yx: 0, yy: 1, dx: 0, dy: 0});

	lang.mixin(m, {
		// summary:
		//		class constants, and methods of dojox/gfx/matrix

		// matrix constants

		// identity: dojox/gfx/matrix.Matrix2D
		//		an identity matrix constant: identity * (x, y) == (x, y)
		identity: new m.Matrix2D(),

		// flipX: dojox/gfx/matrix.Matrix2D
		//		a matrix, which reflects points at x = 0 line: flipX * (x, y) == (-x, y)
		flipX:    new m.Matrix2D({xx: -1}),

		// flipY: dojox/gfx/matrix.Matrix2D
		//		a matrix, which reflects points at y = 0 line: flipY * (x, y) == (x, -y)
		flipY:    new m.Matrix2D({yy: -1}),

		// flipXY: dojox/gfx/matrix.Matrix2D
		//		a matrix, which reflects points at the origin of coordinates: flipXY * (x, y) == (-x, -y)
		flipXY:   new m.Matrix2D({xx: -1, yy: -1}),

		// matrix creators

		translate: function(a, b){
			// summary:
			//		forms a translation matrix
			// description:
			//		The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number|dojox/gfx.Point
			//		an x coordinate value, or a point-like object, which specifies offsets for both dimensions
			// b: Number?
			//		a y coordinate value
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 1){
				return new m.Matrix2D({dx: a, dy: b}); // dojox/gfx/matrix.Matrix2D
			}
			// branch
			return new m.Matrix2D({dx: a.x, dy: a.y}); // dojox/gfx/matrix.Matrix2D
		},
		scale: function(a, b){
			// summary:
			//		forms a scaling matrix
			// description:
			//		The resulting matrix is used to scale (magnify) points by specified offsets.
			// a: Number|dojox/gfx.Point
			//		a scaling factor used for the x coordinate, or
			//		a uniform scaling factor used for the both coordinates, or
			//		a point-like object, which specifies scale factors for both dimensions
			// b: Number?
			//		a scaling factor used for the y coordinate
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 1){
				return new m.Matrix2D({xx: a, yy: b}); // dojox/gfx/matrix.Matrix2D
			}
			if(typeof a == "number"){
				return new m.Matrix2D({xx: a, yy: a}); // dojox/gfx/matrix.Matrix2D
			}
			return new m.Matrix2D({xx: a.x, yy: a.y}); // dojox/gfx/matrix.Matrix2D
		},
		rotate: function(angle){
			// summary:
			//		forms a rotating matrix
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			// returns: dojox/gfx/matrix.Matrix2D
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new m.Matrix2D({xx: c, xy: -s, yx: s, yy: c}); // dojox/gfx/matrix.Matrix2D
		},
		rotateg: function(degree){
			// summary:
			//		forms a rotating matrix
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox/gfx/matrix.rotate() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			// returns: dojox/gfx/matrix.Matrix2D
			return m.rotate(m._degToRad(degree)); // dojox/gfx/matrix.Matrix2D
		},
		skewX: function(angle) {
			// summary:
			//		forms an x skewing matrix
			// description:
			//		The resulting matrix is used to skew points in the x dimension
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		a skewing angle in radians
			// returns: dojox/gfx/matrix.Matrix2D
			return new m.Matrix2D({xy: Math.tan(angle)}); // dojox/gfx/matrix.Matrix2D
		},
		skewXg: function(degree){
			// summary:
			//		forms an x skewing matrix
			// description:
			//		The resulting matrix is used to skew points in the x dimension
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox/gfx/matrix.skewX() for comparison.
			// degree: Number
			//		a skewing angle in degrees
			// returns: dojox/gfx/matrix.Matrix2D
			return m.skewX(m._degToRad(degree)); // dojox/gfx/matrix.Matrix2D
		},
		skewY: function(angle){
			// summary:
			//		forms a y skewing matrix
			// description:
			//		The resulting matrix is used to skew points in the y dimension
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		a skewing angle in radians
			// returns: dojox/gfx/matrix.Matrix2D
			return new m.Matrix2D({yx: Math.tan(angle)}); // dojox/gfx/matrix.Matrix2D
		},
		skewYg: function(degree){
			// summary:
			//		forms a y skewing matrix
			// description:
			//		The resulting matrix is used to skew points in the y dimension
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox/gfx/matrix.skewY() for comparison.
			// degree: Number
			//		a skewing angle in degrees
			// returns: dojox/gfx/matrix.Matrix2D
			return m.skewY(m._degToRad(degree)); // dojox/gfx/matrix.Matrix2D
		},
		reflect: function(a, b){
			// summary:
			//		forms a reflection matrix
			// description:
			//		The resulting matrix is used to reflect points around a vector,
			//		which goes through the origin.
			// a: dojox/gfx.Point|Number
			//		a point-like object, which specifies a vector of reflection, or an X value
			// b: Number?
			//		a Y value
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length == 1){
				b = a.y;
				a = a.x;
			}
			// make a unit vector
			var a2 = a * a, b2 = b * b, n2 = a2 + b2, xy = 2 * a * b / n2;
			return new m.Matrix2D({xx: 2 * a2 / n2 - 1, xy: xy, yx: xy, yy: 2 * b2 / n2 - 1}); // dojox/gfx/matrix.Matrix2D
		},
		project: function(a, b){
			// summary:
			//		forms an orthogonal projection matrix
			// description:
			//		The resulting matrix is used to project points orthogonally on a vector,
			//		which goes through the origin.
			// a: dojox/gfx.Point|Number
			//		a point-like object, which specifies a vector of projection, or
			//		an x coordinate value
			// b: Number?
			//		a y coordinate value
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length == 1){
				b = a.y;
				a = a.x;
			}
			// make a unit vector
			var a2 = a * a, b2 = b * b, n2 = a2 + b2, xy = a * b / n2;
			return new m.Matrix2D({xx: a2 / n2, xy: xy, yx: xy, yy: b2 / n2}); // dojox/gfx/matrix.Matrix2D
		},

		// ensure matrix 2D conformance
		normalize: function(matrix){
			// summary:
			//		converts an object to a matrix, if necessary
			// description:
			//		Converts any 2D matrix-like object or an array of
			//		such objects to a valid dojox/gfx/matrix.Matrix2D object.
			// matrix: Object
			//		an object, which is converted to a matrix, if necessary
			// returns: dojox/gfx/matrix.Matrix2D
			return (matrix instanceof m.Matrix2D) ? matrix : new m.Matrix2D(matrix); // dojox/gfx/matrix.Matrix2D
		},

		// common operations

		isIdentity: function(matrix){
			// summary:
			//		returns whether the specified matrix is the identity.
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix object to be tested
			// returns: Boolean
			return matrix.xx == 1 && matrix.xy == 0 && matrix.yx == 0 && matrix.yy == 1 && matrix.dx == 0 && matrix.dy == 0; // Boolean
		},
		clone: function(matrix){
			// summary:
			//		creates a copy of a 2D matrix
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix-like object to be cloned
			// returns: dojox/gfx/matrix.Matrix2D
			var obj = new m.Matrix2D();
			for(var i in matrix){
				if(typeof(matrix[i]) == "number" && typeof(obj[i]) == "number" && obj[i] != matrix[i]) obj[i] = matrix[i];
			}
			return obj; // dojox/gfx/matrix.Matrix2D
		},
		invert: function(matrix){
			// summary:
			//		inverts a 2D matrix
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix-like object to be inverted
			// returns: dojox/gfx/matrix.Matrix2D
			var M = m.normalize(matrix),
				D = M.xx * M.yy - M.xy * M.yx;
				M = new m.Matrix2D({
					xx: M.yy/D, xy: -M.xy/D,
					yx: -M.yx/D, yy: M.xx/D,
					dx: (M.xy * M.dy - M.yy * M.dx) / D,
					dy: (M.yx * M.dx - M.xx * M.dy) / D
				});
			return M; // dojox/gfx/matrix.Matrix2D
		},
		_multiplyPoint: function(matrix, x, y){
			// summary:
			//		applies a matrix to a point
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix object to be applied
			// x: Number
			//		an x coordinate of a point
			// y: Number
			//		a y coordinate of a point
			// returns: dojox/gfx.Point
			return {x: matrix.xx * x + matrix.xy * y + matrix.dx, y: matrix.yx * x + matrix.yy * y + matrix.dy}; // dojox/gfx.Point
		},
		multiplyPoint: function(matrix, /* Number||Point */ a, /* Number? */ b){
			// summary:
			//		applies a matrix to a point
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix object to be applied
			// a: Number|dojox/gfx.Point
			//		an x coordinate of a point, or a point
			// b: Number?
			//		a y coordinate of a point
			// returns: dojox/gfx.Point
			var M = m.normalize(matrix);
			if(typeof a == "number" && typeof b == "number"){
				return m._multiplyPoint(M, a, b); // dojox/gfx.Point
			}
			return m._multiplyPoint(M, a.x, a.y); // dojox/gfx.Point
		},
		multiplyRectangle: function(matrix, /*Rectangle*/ rect){
			// summary:
			//		Applies a matrix to a rectangle.
			// description:
			//		The method applies the transformation on all corners of the
			//		rectangle and returns the smallest rectangle enclosing the 4 transformed
			//		points.
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix object to be applied.
			// rect: Rectangle
			//		the rectangle to transform.
			// returns: dojox/gfx.Rectangle
			var M = m.normalize(matrix);
			rect = rect || {x:0, y:0, width:0, height:0}; 
			if(m.isIdentity(M))
				return {x: rect.x, y: rect.y, width: rect.width, height: rect.height}; // dojo/gfx.Rectangle
			var p0 = m.multiplyPoint(M, rect.x, rect.y),
				p1 = m.multiplyPoint(M, rect.x, rect.y + rect.height),
				p2 = m.multiplyPoint(M, rect.x + rect.width, rect.y),
				p3 = m.multiplyPoint(M, rect.x + rect.width, rect.y + rect.height),
				minx = Math.min(p0.x, p1.x, p2.x, p3.x),
				miny = Math.min(p0.y, p1.y, p2.y, p3.y),
				maxx = Math.max(p0.x, p1.x, p2.x, p3.x),
				maxy = Math.max(p0.y, p1.y, p2.y, p3.y);
			return{ // dojo/gfx.Rectangle
				x: minx,
				y: miny,
				width: maxx - minx,
				height: maxy - miny
			};
		},
		multiply: function(matrix){
			// summary:
			//		combines matrices by multiplying them sequentially in the given order
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix-like object,
			//		all subsequent arguments are matrix-like objects too
			var M = m.normalize(matrix);
			// combine matrices
			for(var i = 1; i < arguments.length; ++i){
				var l = M, r = m.normalize(arguments[i]);
				M = new m.Matrix2D();
				M.xx = l.xx * r.xx + l.xy * r.yx;
				M.xy = l.xx * r.xy + l.xy * r.yy;
				M.yx = l.yx * r.xx + l.yy * r.yx;
				M.yy = l.yx * r.xy + l.yy * r.yy;
				M.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
				M.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
			}
			return M; // dojox/gfx/matrix.Matrix2D
		},

		// high level operations

		_sandwich: function(matrix, x, y){
			// summary:
			//		applies a matrix at a central point
			// matrix: dojox/gfx/matrix.Matrix2D
			//		a 2D matrix-like object, which is applied at a central point
			// x: Number
			//		an x component of the central point
			// y: Number
			//		a y component of the central point
			return m.multiply(m.translate(x, y), matrix, m.translate(-x, -y)); // dojox/gfx/matrix.Matrix2D
		},
		scaleAt: function(a, b, c, d){
			// summary:
			//		scales a picture using a specified point as a center of scaling
			// description:
			//		Compare with dojox/gfx/matrix.scale().
			// a: Number
			//		a scaling factor used for the x coordinate, or a uniform scaling factor used for both coordinates
			// b: Number?
			//		a scaling factor used for the y coordinate
			// c: Number|Point
			//		an x component of a central point, or a central point
			// d: Number
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			switch(arguments.length){
				case 4:
					// a and b are scale factor components, c and d are components of a point
					return m._sandwich(m.scale(a, b), c, d); // dojox/gfx/matrix.Matrix2D
				case 3:
					if(typeof c == "number"){
						return m._sandwich(m.scale(a), b, c); // dojox/gfx/matrix.Matrix2D
					}
					return m._sandwich(m.scale(a, b), c.x, c.y); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.scale(a), b.x, b.y); // dojox/gfx/matrix.Matrix2D
		},
		rotateAt: function(angle, a, b){
			// summary:
			//		rotates a picture using a specified point as a center of rotation
			// description:
			//		Compare with dojox/gfx/matrix.rotate().
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			// a: Number|dojox/gfx.Point
			//		an x component of a central point, or a central point
			// b: Number?
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 2){
				return m._sandwich(m.rotate(angle), a, b); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.rotate(angle), a.x, a.y); // dojox/gfx/matrix.Matrix2D
		},
		rotategAt: function(degree, a, b){
			// summary:
			//		rotates a picture using a specified point as a center of rotation
			// description:
			//		Compare with dojox/gfx/matrix.rotateg().
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			// a: Number|dojox/gfx.Point
			//		an x component of a central point, or a central point
			// b: Number?
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 2){
				return m._sandwich(m.rotateg(degree), a, b); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.rotateg(degree), a.x, a.y); // dojox/gfx/matrix.Matrix2D
		},
		skewXAt: function(angle, a, b){
			// summary:
			//		skews a picture along the x axis using a specified point as a center of skewing
			// description:
			//		Compare with dojox/gfx/matrix.skewX().
			// angle: Number
			//		a skewing angle in radians
			// a: Number|dojox/gfx.Point
			//		an x component of a central point, or a central point
			// b: Number?
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 2){
				return m._sandwich(m.skewX(angle), a, b); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.skewX(angle), a.x, a.y); // dojox/gfx/matrix.Matrix2D
		},
		skewXgAt: function(degree, a, b){
			// summary:
			//		skews a picture along the x axis using a specified point as a center of skewing
			// description:
			//		Compare with dojox/gfx/matrix.skewXg().
			// degree: Number
			//		a skewing angle in degrees
			// a: Number|dojox/gfx.Point
			//		an x component of a central point, or a central point
			// b: Number?
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 2){
				return m._sandwich(m.skewXg(degree), a, b); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.skewXg(degree), a.x, a.y); // dojox/gfx/matrix.Matrix2D
		},
		skewYAt: function(angle, a, b){
			// summary:
			//		skews a picture along the y axis using a specified point as a center of skewing
			// description:
			//		Compare with dojox/gfx/matrix.skewY().
			// angle: Number
			//		a skewing angle in radians
			// a: Number|dojox/gfx.Point
			//		an x component of a central point, or a central point
			// b: Number?
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 2){
				return m._sandwich(m.skewY(angle), a, b); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.skewY(angle), a.x, a.y); // dojox/gfx/matrix.Matrix2D
		},
		skewYgAt: function(/* Number */ degree, /* Number||Point */ a, /* Number? */ b){
			// summary:
			//		skews a picture along the y axis using a specified point as a center of skewing
			// description:
			//		Compare with dojox/gfx/matrix.skewYg().
			// degree: Number
			//		a skewing angle in degrees
			// a: Number|dojox/gfx.Point
			//		an x component of a central point, or a central point
			// b: Number?
			//		a y component of a central point
			// returns: dojox/gfx/matrix.Matrix2D
			if(arguments.length > 2){
				return m._sandwich(m.skewYg(degree), a, b); // dojox/gfx/matrix.Matrix2D
			}
			return m._sandwich(m.skewYg(degree), a.x, a.y); // dojox/gfx/matrix.Matrix2D
		}

		//TODO: rect-to-rect mapping, scale-to-fit (isotropic and anisotropic versions)

	});
	// propagate Matrix2D up
	g.Matrix2D = m.Matrix2D;

	return m;
});


