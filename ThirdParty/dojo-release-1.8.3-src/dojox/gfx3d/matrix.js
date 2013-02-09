define(["dojo/_base/lang", "./_base"], function(lang, gfx3d){
	
	// candidates for dojox.math:
	gfx3d.matrix = {
		_degToRad : function(degree){ return Math.PI * degree / 180; },
		_radToDeg : function(radian){ return radian / Math.PI * 180; }
	};
	
	gfx3d.matrix.Matrix3D = function(arg){
		// summary:
		//		a 3D matrix object
		// description:
		//		Normalizes a 3D matrix-like object. If arrays is passed,
		//		all objects of the array are normalized and multiplied sequentially.
		// arg: Object
		//		a 3D matrix-like object, a number, or an array of such objects
		if(arg){
			if(typeof arg == "number"){
				this.xx = this.yy = this.zz = arg;
			}else if(arg instanceof Array){
				if(arg.length > 0){
					var m = gfx3d.matrix.normalize(arg[0]);
					// combine matrices
					for(var i = 1; i < arg.length; ++i){
						var l = m;
						var r = gfx3d.matrix.normalize(arg[i]);
						m = new gfx3d.matrix.Matrix3D();
						m.xx = l.xx * r.xx + l.xy * r.yx + l.xz * r.zx;
						m.xy = l.xx * r.xy + l.xy * r.yy + l.xz * r.zy;
						m.xz = l.xx * r.xz + l.xy * r.yz + l.xz * r.zz;
						m.yx = l.yx * r.xx + l.yy * r.yx + l.yz * r.zx;
						m.yy = l.yx * r.xy + l.yy * r.yy + l.yz * r.zy;
						m.yz = l.yx * r.xz + l.yy * r.yz + l.yz * r.zz;
						m.zx = l.zx * r.xx + l.zy * r.yx + l.zz * r.zx;
						m.zy = l.zx * r.xy + l.zy * r.yy + l.zz * r.zy;
						m.zz = l.zx * r.xz + l.zy * r.yz + l.zz * r.zz;
						m.dx = l.xx * r.dx + l.xy * r.dy + l.xz * r.dz + l.dx;
						m.dy = l.yx * r.dx + l.yy * r.dy + l.yz * r.dz + l.dy;
						m.dz = l.zx * r.dx + l.zy * r.dy + l.zz * r.dz + l.dz;
					}
					lang.mixin(this, m);
				}
			}else{
				lang.mixin(this, arg);
			}
		}
	};
	
	// the default (identity) matrix, which is used to fill in missing values
	lang.extend(gfx3d.matrix.Matrix3D, {xx: 1, xy: 0, xz: 0, yx: 0, yy: 1, yz: 0, zx: 0, zy: 0, zz: 1, dx: 0, dy: 0, dz: 0});
	
	lang.mixin(gfx3d.matrix, {
		// summary:
		//		class constants, and methods of dojox.gfx3d.matrix
		
		// matrix constants
		
		// identity: dojox.gfx3d.matrix.Matrix3D
		//		an identity matrix constant: identity * (x, y, z) == (x, y, z)
		identity: new gfx3d.matrix.Matrix3D(),
		
		// matrix creators
		
		translate: function(a, b, c){
			// summary:
			//		forms a translation matrix
			// description:
			//		The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number|Object
			//		an x coordinate value, or a point-like object, which specifies offsets for 3 dimensions
			// b: Number?
			//		a y coordinate value
			// c: Number?
			//		a z coordinate value

			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({dx: a, dy: b, dz: c}); // dojox.gfx3d.matrix.Matrix3D
			}

			return new gfx3d.matrix.Matrix3D({dx: a.x, dy: a.y, dz: a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		scale: function(a, b, c){
			// summary:
			//		forms a scaling matrix
			// description:
			//		The resulting matrix is used to scale (magnify) points by specified offsets.
			// a: Number|Object
			//		a scaling factor used for the x coordinate, or a uniform scaling factor used for the all coordinates,
			//		or a point-like object, which specifies scale factors for 3 dimensions
			// b: Number?
			//		a scaling factor used for the y coordinate
			// c: Number?
			//		a scaling factor used for the z coordinate
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({xx: a, yy: b, zz: c}); // dojox.gfx3d.matrix.Matrix3D
			}
			if(typeof a == "number"){
				return new gfx3d.matrix.Matrix3D({xx: a, yy: a, zz: a}); // dojox.gfx3d.matrix.Matrix3D
			}
			return new gfx3d.matrix.Matrix3D({xx: a.x, yy: a.y, zz: a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateX: function(angle){
			// summary:
			//		forms a rotating matrix (about the x axis)
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({yy: c, yz: -s, zy: s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateXg: function(degree){
			// summary:
			//		forms a rotating matrix (about the x axis)
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateX() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateX(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateY: function(angle){
			// summary:
			//		forms a rotating matrix (about the y axis)
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xz: s, zx: -s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateYg: function(degree){
			// summary:
			//		forms a rotating matrix (about the y axis)
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateY() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateY(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateZ: function(angle){
			// summary:
			//		forms a rotating matrix (about the z axis)
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateZg: function(degree){
			// summary:
			//		forms a rotating matrix (about the z axis)
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateZ() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateZ(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
	
		// camera transformation
		cameraTranslate: function(a, b, c){
			// summary:
			//		forms a translation matrix
			// description:
			//		The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number|Object
			//		an x coordinate value, or a point-like object, which specifies offsets for 3 dimensions
			// b: Number?
			//		a y coordinate value
			// c: Number?
			//		a z coordinate value
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({dx: -a, dy: -b, dz: -c}); // dojox.gfx3d.matrix.Matrix3D
			}
			return new gfx3d.matrix.Matrix3D({dx: -a.x, dy: -a.y, dz: -a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateX: function(angle){
			// summary:
			//		forms a rotating matrix (about the x axis) in cameraTransform manner
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({yy: c, yz: -s, zy: s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateXg: function(degree){
			// summary:
			//		forms a rotating matrix (about the x axis)in cameraTransform manner
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateX() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateX(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateY: function(angle){
			// summary:
			//		forms a rotating matrix (about the y axis) in cameraTransform manner
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xz: s, zx: -s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateYg: function(degree){
			// summary:
			//		forms a rotating matrix (about the y axis) in cameraTransform manner
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateY() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateY(dojox.gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateZ: function(angle){
			// summary:
			//		forms a rotating matrix (about the z axis) in cameraTransform manner
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number
			//		an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateZg: function(degree){
			// summary:
			//		forms a rotating matrix (about the z axis) in cameraTransform manner
			// description:
			//		The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateZ() for comparison.
			// degree: Number
			//		an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateZ(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
	
		// ensure matrix 3D conformance
		normalize: function(matrix){
			// summary:
			//		converts an object to a matrix, if necessary
			// description:
			//		Converts any 3D matrix-like object or an array of
			//		such objects to a valid dojox.gfx3d.matrix.Matrix3D object.
			// matrix: Object
			//		an object, which is converted to a matrix, if necessary
			return (matrix instanceof gfx3d.matrix.Matrix3D) ? matrix : new gfx3d.matrix.Matrix3D(matrix); // dojox.gfx3d.matrix.Matrix3D
		},
		
		// common operations
		
		clone: function(matrix){
			// summary:
			//		creates a copy of a 3D matrix
			// matrix: dojox.gfx3d.matrix.Matrix3D
			//		a 3D matrix-like object to be cloned
			var obj = new gfx3d.matrix.Matrix3D();
			for(var i in matrix){
				if(typeof(matrix[i]) == "number" && typeof(obj[i]) == "number" && obj[i] != matrix[i]) obj[i] = matrix[i];
			}
			return obj; // dojox.gfx3d.matrix.Matrix3D
		},
		invert: function(matrix){
			// summary:
			//		inverts a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix3D
			//		a 2D matrix-like object to be inverted
			var m = gfx3d.matrix.normalize(matrix);
			var D = m.xx * m.yy * m.zz + m.xy * m.yz * m.zx + m.xz * m.yx * m.zy - m.xx * m.yz * m.zy - m.xy * m.yx * m.zz - m.xz * m.yy * m.zx;
			var M = new gfx3d.matrix.Matrix3D({
				xx: (m.yy * m.zz - m.yz * m.zy) / D,
				xy: (m.xz * m.zy - m.xy * m.zz) / D,
				xz: (m.xy * m.yz - m.xz * m.yy) / D,
				yx: (m.yz * m.zx - m.yx * m.zz) / D,
				yy: (m.xx * m.zz - m.xz * m.zx) / D,
				yz: (m.xz * m.yx - m.xx * m.yz) / D,
				zx: (m.yx * m.zy - m.yy * m.zx) / D,
				zy: (m.xy * m.zx - m.xx * m.zy) / D,
				zz: (m.xx * m.yy - m.xy * m.yx) / D,
				dx: -1 * (m.xy * m.yz * m.dz + m.xz * m.dy * m.zy + m.dx * m.yy * m.zz - m.xy * m.dy * m.zz - m.xz * m.yy * m.dz - m.dx * m.yz * m.zy) / D,
				dy: (m.xx * m.yz * m.dz + m.xz * m.dy * m.zx + m.dx * m.yx * m.zz - m.xx * m.dy * m.zz - m.xz * m.yx * m.dz - m.dx * m.yz * m.zx) / D,
				dz: -1 * (m.xx * m.yy * m.dz + m.xy * m.dy * m.zx + m.dx * m.yx * m.zy - m.xx * m.dy * m.zy - m.xy * m.yx * m.dz - m.dx * m.yy * m.zx) / D
			});
			return M; // dojox.gfx3d.matrix.Matrix3D
		},
		_multiplyPoint: function(m, x, y, z){
			// summary:
			//		applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D
			//		a 3D matrix object to be applied
			// x: Number
			//		an x coordinate of a point
			// y: Number
			//		a y coordinate of a point
			// z: Number
			//		a z coordinate of a point
			return {x: m.xx * x + m.xy * y + m.xz * z + m.dx, y: m.yx * x + m.yy * y + m.yz * z + m.dy, z: m.zx * x + m.zy * y + m.zz * z + m.dz}; // Object
		},
		multiplyPoint: function(matrix, a,  b, c){
			// summary:
			//		applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D
			//		a 3D matrix object to be applied
			// a: Number|Object
			//		an x coordinate of a point, or an Object specifying the whole point
			// b: Number?
			//		a y coordinate of a point
			// c: Number?
			//		a z coordinate of a point
			var m = gfx3d.matrix.normalize(matrix);
			if(typeof a == "number" && typeof b == "number" && typeof c == "number"){
				return gfx3d.matrix._multiplyPoint(m, a, b, c); // Object
			}
			return gfx3d.matrix._multiplyPoint(m, a.x, a.y, a.z); // Object
		},
		multiply: function(matrix){
			// summary:
			//		combines matrices by multiplying them sequentially in the given order
			// matrix: dojox.gfx3d.matrix.Matrix3D
			//		a 3D matrix-like object,
			//		all subsequent arguments are matrix-like objects too
			var m = gfx3d.matrix.normalize(matrix);
			// combine matrices
			for(var i = 1; i < arguments.length; ++i){
				var l = m;
				var r = gfx3d.matrix.normalize(arguments[i]);
				m = new gfx3d.matrix.Matrix3D();
				m.xx = l.xx * r.xx + l.xy * r.yx + l.xz * r.zx;
				m.xy = l.xx * r.xy + l.xy * r.yy + l.xz * r.zy;
				m.xz = l.xx * r.xz + l.xy * r.yz + l.xz * r.zz;
				m.yx = l.yx * r.xx + l.yy * r.yx + l.yz * r.zx;
				m.yy = l.yx * r.xy + l.yy * r.yy + l.yz * r.zy;
				m.yz = l.yx * r.xz + l.yy * r.yz + l.yz * r.zz;
				m.zx = l.zx * r.xx + l.zy * r.yx + l.zz * r.zx;
				m.zy = l.zx * r.xy + l.zy * r.yy + l.zz * r.zy;
				m.zz = l.zx * r.xz + l.zy * r.yz + l.zz * r.zz;
				m.dx = l.xx * r.dx + l.xy * r.dy + l.xz * r.dz + l.dx;
				m.dy = l.yx * r.dx + l.yy * r.dy + l.yz * r.dz + l.dy;
				m.dz = l.zx * r.dx + l.zy * r.dy + l.zz * r.dz + l.dz;
			}
			return m; // dojox.gfx3d.matrix.Matrix3D
		},
	
		_project: function(m, x, y, z){
			// summary:
			//		applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D
			//		a 3D matrix object to be applied
			// x: Number
			//		an x coordinate of a point
			// y: Number
			//		a y coordinate of a point
			// z: Number
			//		a z coordinate of a point
			return {	// Object
				x: m.xx * x + m.xy * y + m.xz * z + m.dx,
				y: m.yx * x + m.yy * y + m.yz * z + m.dy,
				z: m.zx * x + m.zy * y + m.zz * z + m.dz};
		},
		project: function(matrix, a, b, c){
			// summary:
			//		applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D
			//		a 3D matrix object to be applied
			// a: Number|Point
			//		an x coordinate of a point, or an Object specifying the whole point
			// b: Number?
			//		a y coordinate of a point
			// c: Number?
			//		a z coordinate of a point
			var m = gfx3d.matrix.normalize(matrix);
			if(typeof a == "number" && typeof b == "number" && typeof c == "number"){
				return gfx3d.matrix._project(m, a, b, c); // Object
			}
			return gfx3d.matrix._project(m, a.x, a.y, a.z); // Object
		}
	});
	
	// propagate matrix up
	gfx3d.Matrix3D = gfx3d.matrix.Matrix3D;
	
	return gfx3d.matrix;
});