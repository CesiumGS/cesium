define([
	"../buildControl",
	"../fileUtils",
	"../fs",
	"../replace"
], function(bc, fileUtils, fs, replace) {
	return function(resource, callback) {
		if(resource.tag.noWrite){
			return 0;
		}
		fileUtils.ensureDirectoryByFilename(resource.dest);
		fs.writeFile(resource.dest, bc.newlineFilter(resource.getText(), resource, "write"), resource.encoding, function(err) {
			callback(resource, err);
		});
		return callback;
	};
});
