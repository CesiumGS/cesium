define(["dojo/has"], function(has){
	if(!has("host-node")){
		throw new Error("node plugin failed to load because environment is not Node.js");
	}

	return {
		// summary:
		//		This AMD plugin module allows native Node.js modules to be loaded by AMD modules using the Dojo
		//		loader. Note that this plugin will not work with AMD loaders other than the Dojo loader.
		// example:
		//	|	require(["dojo/node!fs"], function(fs){
		//	|		var fileData = fs.readFileSync("foo.txt", "utf-8");
		//	|	});

		load: function(/*string*/ id, /*Function*/ require, /*Function*/ load){
			// summary:
			//		Standard AMD plugin interface. See https://github.com/amdjs/amdjs-api/wiki/Loader-Plugins
			//		for information.

			if(!require.nodeRequire){
				throw new Error("Cannot find native require function");
			}

			load(require.nodeRequire(id));
		}
	};
});