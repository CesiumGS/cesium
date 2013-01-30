define([
	"../buildControl",
	"../process",
	"../fileUtils",
	"dojo/has"
], function(bc, process, fileUtils, has) {
	return function(resource, callback) {
		fileUtils.ensureDirectoryByFilename(resource.dest);
		var
			cb = function(code, text){
				callback(resource, code);
			},
			errorMessage = "failed to copy file from \"" + resource.src + "\" to \"" + resource.dest + "\"",
			args = has("is-windows") ?
				["cmd", "/c", "copy", fileUtils.normalize(resource.src), fileUtils.normalize(resource.dest), errorMessage, bc, cb] :
				["cp", resource.src, resource.dest, errorMessage, bc, cb];
		process.exec.apply(process, args);
		return callback;
	};
});
