define(["../main", "doh/main", "../DeferredList"], function(dojo, doh){
	doh.register("tests.DeferredList", [
		function callback(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = new dojo.DeferredList([d1, d2]);
			var fired = false;

			dl.addCallback(function(res){
				doh.debug("debug from dojo.DeferredList callback");
				return res;
			});
			dl.addCallback(function(res){
				console.log("res: ", res, res.length);
				t.assertTrue(res.length == 2);
				t.assertTrue(res[0][0]);
				t.assertEqual(res[0][1], "foo");
				t.assertTrue(res[1][0]);
				t.assertEqual(res[1][1], "bar");
				fired = true;
				return res;
			});
			d1.callback("foo");
			d2.callback("bar");
			t.assertTrue(fired);
		},

		function errback(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = new dojo.DeferredList([d1, d2]);
			var fired = false;
			var e1 = new Error("foo");
			var e2 = new Error("bar");

			dl.addCallback(function(res){
				doh.debug("debug from dojo.DeferredList callback");
				return res;
			});
			dl.addCallback(function(res){
				t.assertTrue(res.length == 2);
				t.assertTrue(!res[0][0]);

				t.assertEqual(res[0][1], e1);
				t.assertTrue(!res[1][0]);
				t.assertEqual(res[1][1], e2);
				fired = true;
				return res;
			});
			d1.errback(e1);
			d2.errback(e2);
			t.assertTrue(fired);
		},


		function mixed(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = new dojo.DeferredList([d1, d2]);
			var fired = false;
			var e = new Error("foo");

			dl.addCallback(function(res){
				doh.debug("debug from dojo.DeferredList callback");
				return res;
			});
			dl.addCallback(function(res){
				t.assertTrue(res.length == 2);
				t.assertTrue(!res[0][0]);

				t.assertEqual(res[0][1], e);
				t.assertTrue(res[1][0]);
				t.assertEqual(res[1][1], "bar");
				fired = true;
				return res;
			});
			d1.errback(e);
			d2.callback("bar");
			t.assertTrue(fired);
		},

		function gather(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = dojo.DeferredList.prototype.gatherResults([d1, d2]);
			var fired = false;
			dl.addCallback(function(res){
				t.assertEqual(res[0], "foo");
				t.assertEqual(res[1], "bar");
				fired = true;
				return res;
			});
			d1.callback("foo");
			d2.callback("bar");
			t.assertTrue(fired);
		}
	]);

	doh.register("tests.DeferredList", [
		function callback(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = new dojo.DeferredList([d1, d2]);
			var fired = false;
			dl.addCallback(function(res){
				doh.debug("debug from dojo.DeferredList callback");
				return res;
			});
			dl.addCallback(function(res){
				t.assertTrue(res.length == 2);
				t.assertTrue(res[0][0]);
				t.assertEqual(res[0][1], "foo");
				t.assertTrue(res[1][0]);
				t.assertEqual(res[1][1], "bar");
				fired = true;
				return res;
			});
			d1.callback("foo");
			d2.callback("bar");
			t.assertTrue(fired);
		},

		function errback(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = new dojo.DeferredList([d1, d2]);
			var fired = false;
			var e1 = new Error("foo");
			var e2 = new Error("bar");

			dl.addCallback(function(res){
				doh.debug("debug from dojo.DeferredList callback");
				return res;
			});
			dl.addCallback(function(res){
				t.assertTrue(res.length == 2);
				t.assertTrue(!res[0][0]);

				t.assertEqual(res[0][1], e1);
				t.assertTrue(!res[1][0]);
				t.assertEqual(res[1][1], e2);
				fired = true;
				return res;
			});
			d1.errback(e1);
			d2.errback(e2);
			t.assertTrue(fired);
		},


		function mixed(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = new dojo.DeferredList([d1, d2]);
			var fired = false;
			var e = new Error("foo");

			dl.addCallback(function(res){
				doh.debug("debug from dojo.DeferredList callback");
				return res;
			});
			dl.addCallback(function(res){
				t.assertTrue(res.length == 2);
				t.assertTrue(!res[0][0]);

				t.assertEqual(res[0][1], e);
				t.assertTrue(res[1][0]);
				t.assertEqual(res[1][1], "bar");
				fired = true;
				return res;
			});
			d1.errback(e);
			d2.callback("bar");
			t.assertTrue(fired);
		},

		function gather(t){
			var d1 = new dojo.Deferred();
			var d2 = new dojo.Deferred();
			var dl = dojo.DeferredList.prototype.gatherResults([d1, d2]);
			var fired = false;
			dl.addCallback(function(res){
				t.assertEqual(res[0], "foo");
				t.assertEqual(res[1], "bar");
				fired = true;
				return res;
			});
			d1.callback("foo");
			d2.callback("bar");
			t.assertTrue(fired);
		}
	]);
});