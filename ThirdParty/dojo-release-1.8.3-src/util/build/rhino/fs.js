define([], function() {
	var
		readFileSync = function(filename, encoding) {
			if (encoding=="utf8") {
				// convert node.js idiom to rhino idiom
				encoding = "utf-8";
			}
			return readFile(filename, encoding || "utf-8");
		},

		writeFileSync = function(filename, contents, encoding){
			var
				outFile = new java.io.File(filename),
				outWriter;
			if (encoding=="utf8") {
				// convert node.js idiom to java idiom
				encoding = "UTF-8";
			}
			if(encoding){
				outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile), encoding);
			}else{
				outWriter = new java.io.OutputStreamWriter(new java.io.FileOutputStream(outFile));
			}

			var os = new java.io.BufferedWriter(outWriter);
			try{
				os.write(contents);
			}finally{
				os.close();
			}
		};

	return {
		statSync:function(filename) {
			return new java.io.File(filename);
		},

		mkdirSync:function(filename) {
			var dir = new java.io.File(filename);
			if (!dir.exists()) {
				dir.mkdirs();
			}
		},

		readFileSync:readFileSync,

		readdirSync:function(path) {
			// the item+"" is necessary because item is a java object that doesn't have the substring method
			return (new java.io.File(path)).listFiles().map(function(item){ return (item.name+""); });
		},



		readFile:function(filename, encoding, cb) {
			var result = readFileSync(filename, encoding);
			if (cb) {
				cb(0, result);
			}
		},

		writeFileSync:writeFileSync,

		writeFile:function(filename, contents, encoding, cb) {
			if (arguments.length==3 && typeof encoding!="string") {
				cb = encoding;
				encoding = 0;
			}
			writeFileSync(filename, contents, encoding);
			if (cb) {
				cb(0);
			};
		}
	};
});
