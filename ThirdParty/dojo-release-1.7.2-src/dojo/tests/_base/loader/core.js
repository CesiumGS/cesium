define(["doh"], function(doh){
	doh.register("dojo.tests._base._loader.internals", [
		function compactPath(t){
			var compactPath = require.compactPath;
			t.is(compactPath("../../dojo/../../mytests"), "../../../mytests");
			t.is(compactPath("module"), "module");
			t.is(compactPath("a/./b"), "a/b");
			t.is(compactPath("a/../b"), "b");
			t.is(compactPath("a/./b/./c/./d"), "a/b/c/d");
			t.is(compactPath("a/../b/../c/../d"), "d");
			t.is(compactPath("a/b/c/../../d"), "a/d");
			t.is(compactPath("a/b/c/././d"), "a/b/c/d");
			t.is(compactPath("./a/b"), "a/b");
			t.is(compactPath("../a/b"), "../a/b");
			t.is(compactPath(""), "");
		}
	]);
});
