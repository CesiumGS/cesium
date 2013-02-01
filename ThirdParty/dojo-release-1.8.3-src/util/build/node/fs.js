define(["../fileHandleThrottle"], function(fht){
	var fs = require.nodeRequire("fs");
	return {
		statSync:fs.statSync,
		mkdirSync:fs.mkdirSync,
		readFileSync:fs.readFileSync,
		writeFileSync:fs.writeFileSync,
		readdirSync:fs.readdirSync,

		readFile:function(filename, encoding, cb){
			fht.enqueue(function(){
				fs.readFile(filename, encoding, function(code){
					fht.release();
					cb.apply(null, arguments);
				});
			});
		},

		writeFile:function(filename, contents, encoding, cb){
			fht.enqueue(function(){
				fs.writeFile(filename, contents, encoding, function(code){
					fht.release();
					cb.apply(null, arguments);
				});
			});
		}
	};
});
