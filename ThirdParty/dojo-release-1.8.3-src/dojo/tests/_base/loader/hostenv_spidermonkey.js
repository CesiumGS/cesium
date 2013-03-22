dojo.provide("dojo.tests._base._loader.hostenv_spidermonkey");

tests.register("tests._base._loader.hostenv_spidermonkey",
	[
		function getText(t){
			var filePath = dojo.moduleUrl("tests._base._loader", "getText.txt");
			var text = readText(filePath);
			t.assertEqual("dojo._getText() test data", text);
		}
	]
);
