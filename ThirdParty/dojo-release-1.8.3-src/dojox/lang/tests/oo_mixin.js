dojo.provide("dojox.lang.tests.oo_mixin");

dojo.require("dojox.lang.functional.object");
dojo.require("dojox.lang.oo.mixin");
dojo.require("dojox.lang.oo.rearrange");

(function(){
	var df = dojox.lang.functional, oo = dojox.lang.oo,
		x = {a: 1, b: 2, c: 3},
		y = {c: 1, d: 2, e: 3, f: 4},
		z = oo.mixin({}, oo.filter(y, {d: "a", e: "b", f: ""})),
		q = dojo.clone(x),
		p = dojo.clone(y),
		print = function(v, i){ this.push("[" + i + "] = " + v); },
		show = function(o){ return df.forIn(o, print, []).sort().join(", "); };

	oo.mixin(q, y);
	oo.mixin(p, x);
	oo.rearrange(y, {d: "a", e: "b", f: ""});

	tests.register("dojox.lang.tests.oo_mixin", [
		function testMixin1(t){ t.assertEqual(df.keys(q).sort(), df.keys(p).sort()); },
		function testMixin2(t){ t.assertEqual(df.keys(x).sort(), df.keys(z).sort()); },
		function testRearrange(t){ t.assertEqual(df.keys(y).sort(), df.keys(z).sort()); }
	]);
})();
