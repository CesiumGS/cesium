define(["doh/runner"], function(doh) {
	doh.debug= print;
	doh.error= print;

	// Override the doh._report method to make it quit with an
	// appropriate exit code in case of test failures.
	var oldReport = doh._report;
	doh._report = function(){
		oldReport.apply(doh, arguments);
		if(this._failureCount > 0 || this._errorCount > 0){
			quit(1);
		}
	};

	print("\n"+doh._line);
	print("The Dojo Unit Test Harness, $Rev: 23869 $");
	print("Copyright (c) 2011, The Dojo Foundation, All Rights Reserved");
	for (var tests= [], args= doh.config["commandLineArgs"], i= 0, arg; i<args.length; i++) {
		arg= (args[i]+"").split("=");
		if (arg.length==2 && arg[0]=="test") {
			var test= arg[1];
			print("loading test " + test);
			tests.push(test);
		}
	}
	print(doh._line, "\n");

	require(tests, function() {
		doh.run();
	});
});
