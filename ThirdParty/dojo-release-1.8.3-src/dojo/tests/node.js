define([ "doh/main" ], function(doh){
	doh.register("tests.node", [
		function testRequireBuiltIn(t){
			var td = new doh.Deferred();
			require(["dojo/node!util"], td.getTestCallback(function(util){
				t.t("puts" in util, "this is the built in node module");
			}));
			return td;
		},

		function testRequireMissing(t){
			try{
				require(["dojo/node!missing"]);
			}catch(e){
				t.is(e.name, "Error", "plugin threw an error");
				t.is(e.message, "Cannot find module 'missing'", "module is missing");
			}
		},

		function testRequireSimpleModule(t){
			var td = new doh.Deferred();
			require(["dojo/node!./tests/resources/nodemodule"], td.getTestCallback(function(nodemodule){
				t.t("test" in nodemodule, "module loaded");
				t.is(nodemodule.test, "value", "object has expected value");
			}));
			return td;
		},

		function testRequireRequire(t){
			var td = new doh.Deferred();
			require(["dojo/node!./tests/resources/noderequire"], td.getTestCallback(function(noderequire){
				t.t("test" in noderequire, "module loaded");
				t.is(noderequire.test, "value", "object has expected value");
			}));
			return td;
		},

		function testRequirePackageJson(t){
			var td = new doh.Deferred();
			require(["dojo/node!./tests/resources/nodemod"], td.getTestCallback(function(nodemod){
				t.t("test" in nodemod, "module loaded");
				t.is(nodemod.test, "value", "object has expected value");
			}));
			return td;
		}
	]);
});