define([
	"./messages",
	"dojo/text!./copyright.txt",
	"dojo/text!./buildNotice.txt"
], function(messages, defaultCopyright, defaultBuildNotice){
	var bc = {
		// 0 => no errors
		// 1 => messages.getErrorCount()>0 at exist
		exitCode:0,

		// use this variable for all newlines inserted by build transforms
		newline:"\n",

		// user profiles may replace this with a function from string to string that filters newlines
		// however they desire. For example,
		//
		// newlineFilter: function(s){
		//	 // convert all DOS-style newlines to Unix-style newlines
		//	 return s.replace(/\r\n/g, "\n").replace(/\n\r/g, "\n");
		// }
		//
		newlineFilter:function(s, resource, hint){return s;},


		// useful for dojo pragma including/excluding
		built:true,

		startTimestamp:new Date(),

		paths:{},
		destPathTransforms:[],
		packageMap:{},

		// resource sets
		resources:{},
		resourcesByDest:{},
		amdResources:{},

		closureCompilerPath:"../closureCompiler/compiler.jar",
		maxOptimizationProcesses:5,
		buildReportDir:".",
		buildReportFilename:"build-report.txt",

		defaultCopyright:defaultCopyright,
		defaultBuildNotice:defaultBuildNotice
	};
	for(var p in messages){
		bc[p] = messages[p];
	};
	return bc;
});
