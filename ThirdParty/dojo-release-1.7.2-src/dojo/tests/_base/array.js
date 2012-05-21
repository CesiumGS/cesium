dojo.provide("dojo.tests._base.array");

tests.register("tests._base.array",
	[
		function testIndexOf(t){
			var foo = [128, 256, 512];
			var bar = ["aaa", "bbb", "ccc"];

			t.assertEqual(1, dojo.indexOf([45, 56, 85], 56));
			t.assertEqual(1, dojo.indexOf([Number, String, Date], String));
			t.assertEqual(1, dojo.indexOf(foo, foo[1]));
			t.assertEqual(2, dojo.indexOf(foo, foo[2]));
			t.assertEqual(1, dojo.indexOf(bar, bar[1]));
			t.assertEqual(2, dojo.indexOf(bar, bar[2]));
			t.assertEqual(-1, dojo.indexOf({a:1}, "a"));

			foo.push(bar);
			t.assertEqual(3, dojo.indexOf(foo, bar));
		},

		function testIndexOfFromIndex(t){
			var foo = [128, 256, 512];
			var bar = ["aaa", "bbb", "ccc"];

			t.assertEqual(-1, dojo.indexOf([45, 56, 85], 56, 2));
			t.assertEqual(1, dojo.indexOf([45, 56, 85], 56, 1));
			t.assertEqual(1, dojo.indexOf([45, 56, 85], 56, -3));
			// Make sure going out of bounds doesn't throw us in an infinite loop
			t.assertEqual(-1, dojo.indexOf([45, 56, 85], 56, 3));
		},

		function testLastIndexOf(t){
			var foo = [128, 256, 512];
			var bar = ["aaa", "bbb", "aaa", "ccc"];

			t.assertEqual(1, dojo.indexOf([45, 56, 85], 56));
			t.assertEqual(1, dojo.indexOf([Number, String, Date], String));
			t.assertEqual(1, dojo.lastIndexOf(foo, foo[1]));
			t.assertEqual(2, dojo.lastIndexOf(foo, foo[2]));
			t.assertEqual(1, dojo.lastIndexOf(bar, bar[1]));
			t.assertEqual(2, dojo.lastIndexOf(bar, bar[2]));
			t.assertEqual(2, dojo.lastIndexOf(bar, bar[0]));
		},

		function testLastIndexOfFromIndex(t){
			t.assertEqual(1, dojo.lastIndexOf([45, 56, 85], 56, 1));
			t.assertEqual(-1, dojo.lastIndexOf([45, 56, 85], 85, 1));
			t.assertEqual(-1, dojo.lastIndexOf([45, 56, 85], 85, -2));
			t.assertEqual(0, dojo.lastIndexOf([45, 56, 45], 45, 0));
		},

		function testForEach(t){
			var foo = [128, "bbb", 512];
			dojo.forEach(foo, function(elt, idx, array){
				switch(idx){
					case 0: t.assertEqual(128, elt); break;
					case 1: t.assertEqual("bbb", elt); break;
					case 2: t.assertEqual(512, elt); break;
					default: t.assertTrue(false);
				}
			});

			var noException = true;
			try{
				dojo.forEach(undefined, function(){});
			}catch(e){
				noException = false;
			}
			t.assertTrue(noException);
		},

		function testForEach_str(t){
			var bar = 'abc';
			dojo.forEach(bar, function(elt, idx, array){
				switch(idx){
					case 0: t.assertEqual("a", elt); break;
					case 1: t.assertEqual("b", elt); break;
					case 2: t.assertEqual("c", elt); break;
					default: t.assertTrue(false);
				}
			});
		},
		// FIXME: test forEach w/ a NodeList()?

		function testForEach_string_callback(t){
			// Test using strings as callback", which accept the parameters with
			// the names "item", "index" and "array"!
			var foo = [128, "bbb", 512];
			// Test that the variable "item" contains the value of each item.
			var obj = {
				_res: ""
			};
			dojo.forEach(foo, "this._res += item", obj);
			t.assertEqual(obj._res, "128bbb512");
			// Test that the variable "index" contains each index.
			obj._res = [];
			dojo.forEach(foo, "this._res.push(index)", obj);
			t.assertEqual(obj._res, [0,1,2]);
			// Test that the variable "array" always contains the entire array.
			obj._res = [];
			dojo.forEach(foo, "this._res.push(array)", obj);
			t.assertEqual(obj._res, [
				[128, "bbb", 512],
				[128, "bbb", 512],
				[128, "bbb", 512]
			]);
			// Catch undefined variable usage (I used to use "i" :-)).
			var caughtException = false;
			try{
				dojo.forEach(foo, "this._res += arr[i];", obj);
			}catch(e){
				caughtException = true;
			}
			t.assertTrue(caughtException);
		},

		// FIXME: test forEach w/ a NodeList()?
		function testEvery(t){
			var foo = [128, "bbb", 512];

			t.assertTrue(
				dojo.every(foo, function(elt, idx, array){
					t.assertEqual(Array, array.constructor);
					t.assertTrue(dojo.isArray(array));
					t.assertTrue(typeof idx == "number");
					if(idx == 1){ t.assertEqual("bbb" , elt); }
					return true;
				})
			);

			t.assertTrue(
				dojo.every(foo, function(elt, idx, array){
					switch(idx){
						case 0: t.assertEqual(128, elt); return true;
						case 1: t.assertEqual("bbb", elt); return true;
						case 2: t.assertEqual(512, elt); return true;
						default: return false;
					}
				})
			);

			t.assertFalse(
				dojo.every(foo, function(elt, idx, array){
					switch(idx){
						case 0: t.assertEqual(128, elt); return true;
						case 1: t.assertEqual("bbb", elt); return true;
						case 2: t.assertEqual(512, elt); return false;
						default: return true;
					}
				})
			);

		},

		function testEvery_str(t){
			var bar = 'abc';
			t.assertTrue(
				dojo.every(bar, function(elt, idx, array){
					switch(idx){
						case 0: t.assertEqual("a", elt); return true;
						case 1: t.assertEqual("b", elt); return true;
						case 2: t.assertEqual("c", elt); return true;
						default: return false;
					}
				})
			);

			t.assertFalse(
				dojo.every(bar, function(elt, idx, array){
					switch(idx){
						case 0: t.assertEqual("a", elt); return true;
						case 1: t.assertEqual("b", elt); return true;
						case 2: t.assertEqual("c", elt); return false;
						default: return true;
					}
				})
			);
		},
		// FIXME: test NodeList for every()?

		function testSome(t){
			var foo = [128, "bbb", 512];
			t.assertTrue(
				dojo.some(foo, function(elt, idx, array){
					t.assertEqual(3, array.length);
					return true;
				})
			);

			t.assertTrue(
				dojo.some(foo, function(elt, idx, array){
					return idx < 1;

				})
			);

			t.assertFalse(
				dojo.some(foo, function(elt, idx, array){
					return false;
				})
			);

			t.assertTrue(
				dojo.some(foo, function(elt, idx, array){
					t.assertEqual(Array, array.constructor);
					t.assertTrue(dojo.isArray(array));
					t.assertTrue(typeof idx == "number");
					if(idx == 1){ t.assertEqual("bbb" , elt); }
					return true;
				})
			);
		},

		function testSome_str(t){
			var bar = 'abc';
			t.assertTrue(
				dojo.some(bar, function(elt, idx, array){
					t.assertEqual(3, array.length);
					switch(idx){
						case 0: t.assertEqual("a", elt); return true;
						case 1: t.assertEqual("b", elt); return true;
						case 2: t.assertEqual("c", elt); return true;
						default: return false;
					}
				})
			);

			t.assertTrue(
				dojo.some(bar, function(elt, idx, array){
					switch(idx){
						case 0: t.assertEqual("a", elt); return true;
						case 1: t.assertEqual("b", elt); return true;
						case 2: t.assertEqual("c", elt); return false;
						default: return true;
					}
				})
			);

			t.assertFalse(
				dojo.some(bar, function(elt, idx, array){
					return false;
				})
			);
		},
		// FIXME: need to add scoping tests for all of these!!!

		function testFilter(t){
			var foo = ["foo", "bar", 10];

			t.assertEqual(["foo"],
				dojo.filter(foo, function(elt, idx, array){
					return idx < 1;
				})
			);

			t.assertEqual(["foo"],
				dojo.filter(foo, function(elt, idx, array){
					return elt == "foo";
				})
			);

			t.assertEqual([],
				dojo.filter(foo, function(elt, idx, array){
					return false;
				})
			);

			t.assertEqual([10],
				dojo.filter(foo, function(elt, idx, array){
					return typeof elt == "number";
				})
			);
		},

		function testFilter_str(t){
			var foo = "thinger blah blah blah";
			t.assertEqual(["t", "h", "i"],
				dojo.filter(foo, function(elt, idx, array){
					return idx < 3;
				})
			);

			t.assertEqual([],
				dojo.filter(foo, function(elt, idx, array){
					return false;
				})
			);
		},

		function testMap(t){
			t.assertEqual([],
				dojo.map([], function(){ return true; })
			);

			t.assertEqual([1, 2, 3],
				dojo.map(["cat", "dog", "mouse"], function(elt, idx, array){
					return idx+1;
				})
			);
		}
	]
);

