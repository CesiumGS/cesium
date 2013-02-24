define([
	"../buildControl",
	"../fileUtils",
	"../fs"
], function(bc, fileUtils, fs){
	return function(resource, callback){
		var
			waitCount = 0,

			errors = [],

			onWriteComplete = function(err){
				if(err){
					errors.push(err);
				}
				if(--waitCount==0){
					callback(resource, errors.length && errors);
				}
			},

			doWrite = function(filename, text, encoding){
				fileUtils.ensureDirectoryByFilename(filename);
				waitCount++;
				fs.writeFile(filename, bc.newlineFilter(text, resource, "writeCss"), encoding || "utf8", onWriteComplete);
				// this must go *after* the async call
			},

			wroteExterns = 0;

		try{
			doWrite(resource.dest, resource.text);
			if(resource.compactDest!=resource.dest){
				doWrite(resource.compactDest, resource.compactText);
			}

			// only need to tranverse bc.destDirToExternSet once...
			if(wroteExterns){
				return callback;
			}
			wroteExterns = 1;
			// bc.destDirToExternSet is a map from dest directory name to resourceSet;
			// resourceSet is a map from src filename (complete with path) to dest filename (name only)
			// bc.destDirToExternSet[dir][src]= dest implies copy filename src to dir + "/" + dest
			var
				destDirToExternSet = bc.destDirToExternSet,
				dir, resourceSet, src;
			for(dir in destDirToExternSet){
				resourceSet = destDirToExternSet[dir];
				for(src in resourceSet){
					doWrite(dir + "/" + resourceSet[src], bc.resources[src].text, resource.encoding);
				}
			}
		}catch(e){
			if(waitCount){
				// can't return the error since there are async processes already going
				errors.push(e);
				return 0;
			}else{
				return e;
			}
		}
		return callback;
	};
});
