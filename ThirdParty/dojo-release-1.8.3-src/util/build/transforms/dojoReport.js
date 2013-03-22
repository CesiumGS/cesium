define([
	"../buildControl",
	"../version",
	"../fileUtils"
], function(bc, version, fileUtils) {
	var dir = bc.buildReportDir || ".",
		filename = bc.buildReportFilename || "build-report.txt";

	return function(resource, callback) {
		resource.reports.push({
			dir:dir,
			filename:filename,
			content: function(){
				var result= "";

				result+= "Build started: " + bc.startTimestamp + "\n";
				result+= "Build application version: " + version + "\n";

				result+= "Messages:\n" + bc.getAllNonreportMessages();

				result+= "Layer Contents:\n";
				for(var p in bc.resources){
					resource= bc.resources[p];
					if(resource.moduleSet){
						result+= resource.mid + ":\n";
						var moduleSet= resource.moduleSet;
						for(var q in moduleSet){
							result+= "\t" + moduleSet[q].mid + "\n";
						}
						result+= "\n";
					}
				}

				var optimizerOutput = bc.getOptimizerOutput();
				if(optimizerOutput.length){
					result+= "Optimizer Messages:\n" + optimizerOutput;
				}

				result+= bc.getAllReportMessages();

				bc.log("pacify", "Report written to " + fileUtils.computePath(fileUtils.catPath(dir, filename), bc.destBasePath));

				result+= "\n\nProcess finished normally\n";
				result+= "\terrors: " + bc.getErrorCount() + "\n\twarnings: " + bc.getWarnCount() + "\n\tbuild time: " + ((new Date()).getTime() - bc.startTimestamp.getTime()) / 1000 + " seconds";
				return result;
			}
		});
		return 0;
	};
});
