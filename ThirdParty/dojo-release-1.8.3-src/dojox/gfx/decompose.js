define(["./_base", "dojo/_base/lang", "./matrix"], 
  function (g, lang, m){
	function eq(/* Number */ a, /* Number */ b){
		// summary:
		//		compare two FP numbers for equality
		return Math.abs(a - b) <= 1e-6 * (Math.abs(a) + Math.abs(b));	// Boolean
	}

	function calcFromValues(/* Number */ r1, /* Number */ m1, /* Number */ r2, /* Number */ m2){
		// summary:
		//		uses two close FP ration and their original magnitudes to approximate the result
		if(!isFinite(r1)){
			return r2;	// Number
		}else if(!isFinite(r2)){
			return r1;	// Number
		}
		m1 = Math.abs(m1); m2 = Math.abs(m2);
		return (m1 * r1 + m2 * r2) / (m1 + m2);	// Number
	}

	function transpose(matrix){
		// matrix: dojox/gfx/matrix.Matrix2D
		//		a 2D matrix-like object
		var M = new m.Matrix2D(matrix);
		return lang.mixin(M, {dx: 0, dy: 0, xy: M.yx, yx: M.xy});	// dojox/gfx/matrix.Matrix2D
	}

	function scaleSign(/* dojox/gfx/matrix.Matrix2D */ matrix){
		return (matrix.xx * matrix.yy < 0 || matrix.xy * matrix.yx > 0) ? -1 : 1;	// Number
	}

	function eigenvalueDecomposition(matrix){
		// matrix: dojox/gfx/matrix.Matrix2D
		//		a 2D matrix-like object
		var M = m.normalize(matrix),
			b = -M.xx - M.yy,
			c = M.xx * M.yy - M.xy * M.yx,
			d = Math.sqrt(b * b - 4 * c),
			l1 = -(b + (b < 0 ? -d : d)) / 2,
			l2 = c / l1,
			vx1 = M.xy / (l1 - M.xx), vy1 = 1,
			vx2 = M.xy / (l2 - M.xx), vy2 = 1;
		if(eq(l1, l2)){
			vx1 = 1, vy1 = 0, vx2 = 0, vy2 = 1;
		}
		if(!isFinite(vx1)){
			vx1 = 1, vy1 = (l1 - M.xx) / M.xy;
			if(!isFinite(vy1)){
				vx1 = (l1 - M.yy) / M.yx, vy1 = 1;
				if(!isFinite(vx1)){
					vx1 = 1, vy1 = M.yx / (l1 - M.yy);
				}
			}
		}
		if(!isFinite(vx2)){
			vx2 = 1, vy2 = (l2 - M.xx) / M.xy;
			if(!isFinite(vy2)){
				vx2 = (l2 - M.yy) / M.yx, vy2 = 1;
				if(!isFinite(vx2)){
					vx2 = 1, vy2 = M.yx / (l2 - M.yy);
				}
			}
		}
		var d1 = Math.sqrt(vx1 * vx1 + vy1 * vy1),
			d2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
		if(!isFinite(vx1 /= d1)){ vx1 = 0; }
		if(!isFinite(vy1 /= d1)){ vy1 = 0; }
		if(!isFinite(vx2 /= d2)){ vx2 = 0; }
		if(!isFinite(vy2 /= d2)){ vy2 = 0; }
		return {	// Object
			value1: l1,
			value2: l2,
			vector1: {x: vx1, y: vy1},
			vector2: {x: vx2, y: vy2}
		};
	}

	function decomposeSR(/* dojox/gfx/matrix.Matrix2D */ M, /* Object */ result){
		// summary:
		//		decomposes a matrix into [scale, rotate]; no checks are done.
		var sign = scaleSign(M),
			a = result.angle1 = (Math.atan2(M.yx, M.yy) + Math.atan2(-sign * M.xy, sign * M.xx)) / 2,
			cos = Math.cos(a), sin = Math.sin(a);
		result.sx = calcFromValues(M.xx / cos, cos, -M.xy / sin, sin);
		result.sy = calcFromValues(M.yy / cos, cos,  M.yx / sin, sin);
		return result;	// Object
	}

	function decomposeRS(/* dojox/gfx/matrix.Matrix2D */ M, /* Object */ result){
		// summary:
		//		decomposes a matrix into [rotate, scale]; no checks are done
		var sign = scaleSign(M),
			a = result.angle2 = (Math.atan2(sign * M.yx, sign * M.xx) + Math.atan2(-M.xy, M.yy)) / 2,
			cos = Math.cos(a), sin = Math.sin(a);
		result.sx = calcFromValues(M.xx / cos, cos,  M.yx / sin, sin);
		result.sy = calcFromValues(M.yy / cos, cos, -M.xy / sin, sin);
		return result;	// Object
	}

	return g.decompose = function(matrix){
		// summary:
		//		Decompose a 2D matrix into translation, scaling, and rotation components.
		// description:
		//		This function decompose a matrix into four logical components:
		//		translation, rotation, scaling, and one more rotation using SVD.
		//		The components should be applied in following order:
		//	| [translate, rotate(angle2), scale, rotate(angle1)]
		// matrix: dojox/gfx/matrix.Matrix2D
		//		a 2D matrix-like object
		var M = m.normalize(matrix),
			result = {dx: M.dx, dy: M.dy, sx: 1, sy: 1, angle1: 0, angle2: 0};
		// detect case: [scale]
		if(eq(M.xy, 0) && eq(M.yx, 0)){
			return lang.mixin(result, {sx: M.xx, sy: M.yy});	// Object
		}
		// detect case: [scale, rotate]
		if(eq(M.xx * M.yx, -M.xy * M.yy)){
			return decomposeSR(M, result);	// Object
		}
		// detect case: [rotate, scale]
		if(eq(M.xx * M.xy, -M.yx * M.yy)){
			return decomposeRS(M, result);	// Object
		}
		// do SVD
		var	MT = transpose(M),
			u  = eigenvalueDecomposition([M, MT]),
			v  = eigenvalueDecomposition([MT, M]),
			U  = new m.Matrix2D({xx: u.vector1.x, xy: u.vector2.x, yx: u.vector1.y, yy: u.vector2.y}),
			VT = new m.Matrix2D({xx: v.vector1.x, xy: v.vector1.y, yx: v.vector2.x, yy: v.vector2.y}),
			S = new m.Matrix2D([m.invert(U), M, m.invert(VT)]);
		decomposeSR(VT, result);
		S.xx *= result.sx;
		S.yy *= result.sy;
		decomposeRS(U, result);
		S.xx *= result.sx;
		S.yy *= result.sy;
		return lang.mixin(result, {sx: S.xx, sy: S.yy});	// Object
	};
});
