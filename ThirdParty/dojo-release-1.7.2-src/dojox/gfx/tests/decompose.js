dojo.provide("dojox.gfx.tests.decompose");
dojo.require("dojox.gfx.decompose");

(function(){
	var m = dojox.gfx.matrix;
	var eq = function(t, a, b){ t.t(2 * Math.abs(a - b) / ((a < 1 && b < 1) ? 1 : a + b) < 1e-6); };
	var eqM = function(t, a, b){
		eq(t, a.xx, b.xx);
		eq(t, a.yy, b.yy);
		eq(t, a.xy, b.xy);
		eq(t, a.yx, b.yx);
		eq(t, a.dx, b.dx);
		eq(t, a.dy, b.dy);
	};
	var compose = function(r){
		return m.normalize([
			m.translate(r.dx, r.dy),
			m.rotate(r.angle2),
			m.scale(r.sx, r.sy),
			m.rotate(r.angle1)
		]);
	};
	var reconstruct = function(a){
		return compose(dojox.gfx.decompose(a));
	};
	var compare = function(t, a){
		var A = m.normalize(a);
		eqM(t, A, reconstruct(A));
	};
	tests.register("dojox.gfx.tests.decompose", [
		function IdentityTest(t){
			compare(t, m.identity);
		},
		function FlipXTest(t){
			compare(t, m.flipX);
		},
		function FlipYTest(t){
			compare(t, m.flipY);
		},
		function FlipXYTest(t){
			compare(t, m.flipXY);
		},
		function TranslationTest(t){
			compare(t, m.translate(45, -15));
		},
		function RotationTest(t){
			compare(t, m.rotateg(35));
		},
		function SkewXTest(t){
			compare(t, m.skewXg(35));
		},
		function SkewYTest(t){
			compare(t, m.skewYg(35));
		},
		function ReflectTest(t){
			compare(t, m.reflect(13, 27));
		},
		function ProjectTest(t){
			compare(t, m.project(13, 27));
		},
		function ScaleTest1(t){
			compare(t, m.scale(3));
		},
		function ScaleTest2(t){
			compare(t, m.scale(3, -1));
		},
		function ScaleTest3(t){
			compare(t, m.scale(-3, 1));
		},
		function ScaleTest4(t){
			compare(t, m.scale(-3, -1));
		},
		function ScaleRotateTest1(t){
			compare(t, [m.scale(3), m.rotateAt(35, 13, 27)]);
		},
		function ScaleRotateTest2(t){
			compare(t, [m.scale(3, -1), m.rotateAt(35, 13, 27)]);
		},
		function ScaleRotateTest3(t){
			compare(t, [m.scale(-3, 1), m.rotateAt(35, 13, 27)]);
		},
		function ScaleRotateTest4(t){
			compare(t, [m.scale(-3, -1), m.rotateAt(35, 13, 27)]);
		},
		function RotateScaleTest1(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(3)]);
		},
		function RotateScaleTest2(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(3, -1)]);
		},
		function RotateScaleTest3(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(-3, 1)]);
		},
		function RotateScaleTest4(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(-3, -1)]);
		},
		function RotateScaleRotateTest1(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(3), m.rotateAt(-15, 163, -287)]);
		},
		function RotateScaleRotateTest2(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(3, -1), m.rotateAt(-15, 163, -287)]);
		},
		function RotateScaleRotateTest3(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(-3, 1), m.rotateAt(-15, 163, -287)]);
		},
		function RotateScaleRotateTest4(t){
			compare(t, [m.rotateAt(35, 13, 27), m.scale(-3, -1), m.rotateAt(-15, 163, -287)]);
		}
	]);
})();
