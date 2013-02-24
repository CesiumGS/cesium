dojo.provide("dojox.math.tests.random");

dojo.require("dojox.math.random.Simple");
dojo.require("dojox.math.random.Secure");
dojo.require("dojox.math.random.prng4");

tests.register("dojox.math.tests.random",
	[
		function sanity_check_Simple(t){
			var r = new dojox.math.random.Simple(),
				a = new Array(256);
			r.nextBytes(a);
			t.f(dojo.every(a, function(x){ return x === a[0]; }));
			r.destroy();
		},
		function sanity_check_Secure(t){
			var r = new dojox.math.random.Secure(dojox.math.random.prng4),
				a = new Array(256);
			r.nextBytes(a);
			t.f(dojo.every(a, function(x){ return x === a[0]; }));
			r.destroy();
		}
	]
);
