define(["dojo", "doh", "../../../_base/sniff", "require"], function(dojo, doh, has, require){
	doh.register("tests._base._loader.bootstrap", [
		function hasConsole(t){
			t.assertTrue("console" in dojo.global);
			t.assertTrue("assert" in console);
			t.assertEqual("function", typeof console.assert);
		},

		function getText(t){
			if(require.getText){
				var text = require.getText(require.toUrl("dojo/tests/_base/loader/getText.txt")).replace(/\n/g, "");
				t.assertEqual("dojo._getText() test data", text);
				if(dojo._getText){
					text = dojo._getText(require.toUrl("dojo/tests/_base/loader/getText.txt")).replace(/\n/g, "");
					t.assertEqual("dojo._getText() test data", text);
				}
			}
		},

		{
			name: "getObject",
			setUp: function(){
				//Set an object in global scope.
				dojo.global.globalValue = {
					color: "blue",
					size: 20
				};

				//Set up an object in a specific scope.
				this.foo = {
					bar: {
						color: "red",
						size: 100
					}
				};
			},
			runTest: function(t){
				//Test for existing object using global as root path.
				var globalVar = dojo.getObject("globalValue");
				t.is("object", (typeof globalVar));
				t.assertEqual("blue", globalVar.color);
				t.assertEqual(20, globalVar.size);
				t.assertEqual("blue", dojo.getObject("globalValue.color"));

				//Test for non-existent object using global as root path.
				//Then create it.
				t.assertFalse(dojo.getObject("something.thatisNew"));
				t.assertTrue(typeof(dojo.getObject("something.thatisNew", true)) == "object");

				//Test for existing object using another object as root path.
				var scopedVar = dojo.getObject("foo.bar", false, this);
				t.assertTrue(typeof(scopedVar) == "object");
				t.assertEqual("red", scopedVar.color);
				t.assertEqual(100, scopedVar.size);
				t.assertEqual("red", dojo.getObject("foo.bar.color", true, this));

				//Test for existing object using another object as root path.
				//Then create it.
				t.assertFalse(dojo.getObject("something.thatisNew", false, this));
				t.assertTrue(typeof(dojo.getObject("something.thatisNew", true, this)) == "object");
			},
			tearDown: function(){
				//Clean up global object that should not exist if
				//the test is re-run.
				try{
					delete dojo.global.something;
					delete this.something;
				}catch(e){}
			}
		},

		{
			name: "exists",
			setUp: function(){
				this.foo = {
					bar: {},
					baz: 0,
					bam: false,
					bal: "",
					ban: null
				};
			},
			runTest: function(t){
				t.assertTrue(dojo.exists("foo.bar", this));
				t.assertFalse(dojo.exists("foo.bar"));
				t.assertTrue(dojo.exists("foo.baz", this));
				t.assertTrue(dojo.exists("foo.bal", this));
				t.assertTrue(dojo.exists("foo.ban", this));
				t.assertTrue(dojo.exists("foo.bam", this));
				t.assertFalse(dojo.exists("foo.bat", this));
				t.assertTrue(dojo.exists("a.b", { a:{ b:0 }}));
				t.assertFalse(dojo.exists("foo.bar.baz.bam.bap", this));
			}
		},

		function evalWorks(t){
			t.assertTrue(dojo.eval("(true)"));
			t.assertFalse(dojo.eval("(false)"));
			if(!has("ie")){
				// eval truly executes in global scope for non IE
				t.is(window.rawld, undefined);
				dojo.eval("var rawld = 3.14;");
				t.assertEqual(rawld, 3.14);
				t.assertEqual(window.rawld, 3.14);
				window.rawld = undefined;
			}else{
				// example of how to compensate for IE
				t.is(window.rawld, undefined);
				dojo.eval("window.rawld = 3.14;");
				t.assertEqual(rawld, 3.14);
				t.assertEqual(window.rawld, 3.14);
				window.rawld = undefined;
			}
		},

		function _mixin(t){
			var a = {
				x: 1,
				y: function(){ return 2; },
				z1: 99,
				w: 2,
				v: undefined
			};
			var b = {
				x: 11,
				y: function(){ return 12; },
				z2: 33,
				toString: function(){ return "bark!"; },
				toLocaleString: function(){ return "le bark-s!"; },
				w: undefined,
				v: undefined,
				u: undefined
			};
			t.is(1, a.x);
			t.is(2, a.y());
			t.is(99, a.z1);
			t.t("w" in a);
			t.is(2, a.w);
			t.t("v" in a);
			t.is(undefined, a.v);
			t.f("u" in a);
			dojo._mixin(a, b);
			t.is(11, a.x);
			t.is(12, a.y());
			t.is("bark!", a.toString());
			t.is("le bark-s!", a.toLocaleString());
			t.is(99, a.z1);
			t.is(33, a.z2);
			t.t("w" in a);
			t.is(undefined, a.w);
			t.t("v" in a);
			t.is(undefined, a.v);
			t.t("u" in a);
			t.is(undefined, a.u);
		}
	]);
});
