dojo.provide("dojox.gfx.tests.matrix");
dojo.require("dojox.gfx.matrix");

(function(){
	var m = dojox.gfx.matrix;
	var eq = function(t, a, b){ t.t(2 * Math.abs(a - b) / ((a < 1 && b < 1) ? 1 : a + b) < 1e-6); };
	tests.register("dojox.gfx.tests.matrix", [
		function IdentityTest(t){
			var a = new m.Matrix2D();
			eq(t, a.xx, 1);
			eq(t, a.yy, 1);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
		},
		function Rot30gTest(t){
			var a = m.rotateg(30);
			eq(t, a.xx, a.yy);
			eq(t, a.xy, -a.yx);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.yx, 0.5);
			t.t(a.xy < 0);
			t.t(a.yx > 0);
		},
		function Rot45gTest(t){
			var a = m.rotateg(45);
			eq(t, a.xx, a.yy);
			eq(t, a.xy, -a.yx);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.xx, a.yx);
			eq(t, a.yy, -a.xy);
		},
		function Rot90gTest(t){
			var a = m.rotateg(90);
			eq(t, a.xx, a.yy);
			eq(t, a.xy, -a.yx);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.xx, 0);
			eq(t, a.yx, 1);
		},
		function CombineIdentitiesTest(t){
			var a = m.normalize([new m.Matrix2D(), new m.Matrix2D(), new m.Matrix2D()]);
			eq(t, a.xx, 1);
			eq(t, a.yy, 1);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
		},
		function CombineExclusiveTest(t){
			var a = m.normalize([m.rotateg(30), m.rotateg(-30)]);
			eq(t, a.xx, 1);
			eq(t, a.yy, 1);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
		},
		function CombineInvertedTest(t){
			var a = m.normalize([m.rotateg(30), m.invert(m.rotateg(30))]);
			eq(t, a.xx, 1);
			eq(t, a.yy, 1);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
		},
		function Rot90gAtTest(t){
			var a = m.rotategAt(90, 10, 10);
			eq(t, a.xx, a.yy);
			eq(t, a.xy, -a.yx);
			eq(t, a.dx, 20);
			eq(t, a.dy, 0);
			eq(t, a.xx, 0);
			eq(t, a.yx, 1);
		},
		function MultPointTest1(t){
			var b = m.multiplyPoint(m.rotategAt(90, 10, 10), 10, 10);
			eq(t, b.x, 10);
			eq(t, b.y, 10);
		},
		function MultPointTest2(t){
			var b = m.multiplyPoint(m.rotategAt(90, 10, 10), {x: 10, y: 5});
			eq(t, b.x, 15);
			eq(t, b.y, 10);
		},
		function MultPointTest3(t){
			var b = m.multiplyPoint(m.rotategAt(90, 10, 10), 10, 15);
			eq(t, b.x, 5);
			eq(t, b.y, 10);
		},
		function ScaleTest1(t){
			var a = m.normalize([m.scale(2, 1), m.invert(m.rotateg(45))]);
			eq(t, a.xx, 2 * a.yy);
			eq(t, a.xy, -2 * a.yx);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.xx, a.xy);
			eq(t, a.yy, -a.yx);
		},
		function ScaleTest2(t){
			var a = m.normalize([m.scale(1, 2), m.invert(m.rotateg(45))]);
			eq(t, 2 * a.xx, a.yy);
			eq(t, 2 * a.xy, -a.yx);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.xx, a.xy);
			eq(t, a.yy, -a.yx);
		},
		function ScaleTest3(t){
			var a = m.normalize([m.rotateg(45), m.scale(2, 1)]);
			eq(t, a.xx, 2 * a.yy);
			eq(t, a.yx, -2 * a.xy);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.xx, a.yx);
			eq(t, a.yy, -a.xy);
		},
		function ScaleTest4(t){
			var a = m.normalize([m.rotateg(45), m.scale(1, 2)]);
			eq(t, 2 * a.xx, a.yy);
			eq(t, 2 * a.yx, -a.xy);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
			eq(t, a.xx, a.yx);
			eq(t, a.yy, -a.xy);
		},
		function ScaleTest5(t){
			var a = m.normalize([m.rotategAt(45, 100, 100), m.scale(2)]);
			eq(t, a.xx, a.yy);
			eq(t, a.xy, -a.yx);
			eq(t, a.xx, a.yx);
			eq(t, a.yy, -a.xy);
			eq(t, a.dx, 100);
			t.t(a.dy < 0);
			var b = m.normalize([m.scale(2), m.rotategAt(45, 100, 100)]);
			eq(t, b.xx, b.yy);
			eq(t, b.xy, -b.yx);
			eq(t, b.xx, b.yx);
			eq(t, b.yy, -b.xy);
			eq(t, b.dx, 200);
			t.t(b.dy < 0);
			eq(t, a.xx, b.xx);
			eq(t, a.xy, b.xy);
			eq(t, a.yx, b.yx);
			eq(t, a.yy, b.yy);
			eq(t, 2 * a.dx, b.dx);
			eq(t, 2 * a.dy, b.dy);
			var c = m.normalize([m.rotateg(45), m.scale(2)]);
			eq(t, c.xx, c.yy);
			eq(t, c.xy, -c.yx);
			eq(t, c.xx, c.yx);
			eq(t, c.yy, -c.xy);
			eq(t, c.dx, 0);
			eq(t, c.dy, 0);
			var d = m.normalize([m.scale(2), m.rotateg(45)]);
			eq(t, d.xx, d.yy);
			eq(t, d.xy, -d.yx);
			eq(t, d.xx, d.yx);
			eq(t, d.yy, -d.xy);
			eq(t, d.dx, 0);
			eq(t, d.dy, 0);
			eq(t, a.xx, c.xx);
			eq(t, a.xy, c.xy);
			eq(t, a.yx, c.yx);
			eq(t, a.yy, c.yy);
			eq(t, a.xx, d.xx);
			eq(t, a.xy, d.xy);
			eq(t, a.yx, d.yx);
			eq(t, a.yy, d.yy);
		},
		function ScaleTest6(t){
			var a = m.normalize(6);
			eq(t, a.xx, 6);
			eq(t, a.yy, 6);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
		},
		function ScaleTest7(t){
			var a = m.normalize([2, m.scale(2, 1)]);
			eq(t, a.xx, 4);
			eq(t, a.yy, 2);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 0);
			eq(t, a.dy, 0);
		},
		function TranslateTest(t){
			var a = m.normalize({dx: 100, dy: 200});
			eq(t, a.xx, 1);
			eq(t, a.yy, 1);
			eq(t, a.xy, 0);
			eq(t, a.yx, 0);
			eq(t, a.dx, 100);
			eq(t, a.dy, 200);
		},
		function ReflectTest1(t){
			var b = m.multiplyPoint(m.reflect(1, 1), 1, 0);
			eq(t, b.x, 0);
			eq(t, b.y, 1);
		},
		function ReflectTest2(t){
			var b = m.multiplyPoint(m.reflect(1, 1), 0, 1);
			eq(t, b.x, 1);
			eq(t, b.y, 0);
		},
		function ProjectTest1(t){
			var b = m.multiplyPoint(m.project(1, 1), 1, 0);
			eq(t, b.x, 0.5);
			eq(t, b.y, 0.5);
		},
		function ProjectTest2(t){
			var b = m.multiplyPoint(m.project(1, 1), 0, 1);
			eq(t, b.x, 0.5);
			eq(t, b.y, 0.5);
		},
		function IsIdentityTest(t){
			var a = new m.Matrix2D();
			tests.assertTrue(m.isIdentity(a));
			a.xy=1;
			tests.assertFalse(m.isIdentity(a));
		},
		function MultiplyRectangle(t){
			var a = new m.Matrix2D(), 
				r = {x:0,y:0,width:3,height:2},
				res;
			// multiply by identity -> same rect
			res = m.multiplyRectangle(a, r);
			tests.assertTrue(res.x == r.x && res.y == r.y && res.width == r.width && res.height == r.height);			
			res = m.multiplyRectangle(m.scale(2,2), r);
			eq(t, res.x, 0);
			eq(t, res.y, 0);
			eq(t, res.width, 6);
			eq(t, res.height, 4);
			a = m.rotategAt(-45, 0, 0);
			var tl = m.multiplyPoint(a, 0, 0), // top left
				tr = m.multiplyPoint(a, 3, 0), // top right
				br = m.multiplyPoint(a, 3, 2), // bottom right
				bl = m.multiplyPoint(a, 0, 2), // bottom left
				exp = {x : tl.x, y:tr.y, width: br.x, height: bl.y - tr.y}; // expected
			res = m.multiplyRectangle(a, r);
			eq(t, res.x, exp.x);
			eq(t, res.y, exp.y);
			eq(t, res.width, exp.width);
			eq(t, res.height, exp.height);
			// matrices array
			res = m.multiplyRectangle([m.translate(10,10), m.scale(2,2)], r);
			eq(t, res.x, 10);
			eq(t, res.y, 10);
			eq(t, res.width, 6);
			eq(t, res.height, 4);
		}
		
	]);
})();
