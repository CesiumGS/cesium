define("dojox/testing/DocTest", ["dojo/string"], function() {

dojo.declare(
	"dojox.testing.DocTest",
	null,
	{
		// summary:
		//		This class executes doctests.
		// description:
		//		DocTests are tests that are defined inside the comment.
		//		A doctest looks as if it was copied from the shell (which it mostly is).
		//		A doctest is executed when the following conditions match:
		//		1) all lines are comments
		//		2) the line always starts with spaces/tabs followed by "//"
		//		   and at least one space
		//		3) the line(s) of the test to execute starts with ">>>"
		//		   preceeded by what is described in 2)
		//		4) the first line after 3) starting without ">>>" is the exptected result.
		//		   preceeded by what is described in 2)
		//		5) the test sequence is terminated by an empty line, or the next
		//		   test in the following line, or a new line that does not start as described in 2)
		//		   (simple said: is not a comment)
		//		   preceeded by what is described in 2)
		//
		//		I.e. the following is a simple doctest, that will actually also be run
		//		if you run this class against this file here:
		//		>>> 1+1 // A simple test case. Terminated by an empty line
		//		2
		//
		//		>>> 1==2
		//		false
		//		>>> "a"+"b" // Also without the empty line before, this is a new test.
		//		"ab"
		//
		//		>>> var anything = "anything" // Multiple commands for one test.
		//		>>> "something"==anything
		//		false
		//
		//		DocTests are great for inline documenting a class or method, they also
		//		are very helpful in understanding what the class/method actually does.
		//		They don't make sense everywhere, but sometimes they are really handy.


		//	TODO:
		//		-	using console.log() in a test prints something on the
		//			console (if you do it on the console) but its not accepted
		//			yet to be the test result, may be override console.log!?
		//			i.e. here i wanted to: dojo.forEach(["one", 2],
		//			function(el, index) {console.log(el, index)}) that works on
		//			the console, but not as a docTest :-(
		//		-	surround the eval for each test case singlely with a
		//			try-catch, to to catch syntax errors etc (though the
		//			shouldn't happen if you copy the test from the shell :-))
	
		
		errors: [],
		
		getTests:function(/*String*/moduleName){
			// summary:
			//		Extract the tests from the given module or string.
			// examples:
			//		>>> dojo.isArray(new dojox.testing.DocTest().getTests("dojox.testing.DocTest")) // Use the module name to extract the tests from.
			//		true
			var path = dojo.moduleUrl(moduleName).path;
			// TODO:
			//		this needs to be done better, this is pretty simple and
			//		surely not dummy proof
			var file = path.substring(0, path.length-1)+".js";
			var xhr = dojo.xhrGet({url:file, handleAs:"text"});
			// Make loading synchronously, mainly so we can use it in doh.
			var data = dojo._getText(file);
			return this._getTestsFromString(data, true);
		},
		
		getTestsFromString:function(/*String*/data){
			// examples:
			//		>>> (new dojox.testing.DocTest().getTestsFromString(">>> 1+1\n2\n>>> 2+2\n4")).length // Do tests from strings get detected properly?
			//		2
			return this._getTestsFromString(data, false);
		},
		
		_getTestsFromString:function(/*String*/data, /*Boolean*/insideComments){
			// summary:
			//		Parse the given string for tests.
			// insideComments: Boolean
			//		if false "data" contains only the pure tests, comments already stripped.
			var trim = dojo.hitch(dojo.string, "trim");
			var lines = data.split("\n");
			var len = lines.length;
			var tests = [];
			var test = {
				commands: [],
				expectedResult: [],
				line: null
			};
			for(var i=0; i<len+1; i++){
				// Trim the line, so we don't have to worry about leading
				// spaces or tabs, bla bla ...
				var l = trim(lines[i] || ""); // The '|| ""' makes sure tests that have no preceeding \n are taken into account too.
				// TODO:
				//		detect tests that dont match the condition: commands,
				//		result, empty line. esp the empty line might be missing
				//		or be tolerant and accept a new test starting on the
				//		next line, which would allow to omit the empty line!?
				if((insideComments && l.match(/^\/\/\s+>>>\s.*/)) || l.match(/^\s*>>>\s.*/)){
					if(!test.line){
						test.line = i+1;
					}
					// Find the test commands.
					if(test.expectedResult.length>0){
						// Start a new test right after the expected result,
						// without an empty line.
						tests.push({
							commands: test.commands,
							expectedResult: test.expectedResult.join("\n"),
							line: test.line
						});
						test = {commands:[], expectedResult:[], line:i+1};
					}
					l = insideComments ? trim(l).substring(2, l.length) : l; // Remove the leading slashes.
					l = trim(l).substring(3, l.length); // Remove the ">>>".
					test.commands.push(trim(l));
				}else if((!insideComments || l.match(/^\/\/\s+.*/)) && test.commands.length && test.expectedResult.length==0){
					// Detect the lines after the ">>>"-lines, the exptected result.
					l = insideComments ? trim(l).substring(3, l.length) : l; // Remove the leading slashes.
					test.expectedResult.push(trim(l));
				}else if(test.commands.length>0 && test.expectedResult.length){
					if(!insideComments || l.match(/^\/\/\s*$/)){
						// Detect the empty line.
						tests.push({
							commands: test.commands,
							expectedResult: test.expectedResult.join("\n"),
							line: test.line
						});
					}
					if(insideComments && !l.match(/^\/\//)){
						// If the next line is not a comment at all (doesn't start with "//").
						tests.push({
							commands: test.commands,
							expectedResult: test.expectedResult.join("\n"),
							line:test.line
						});
					}
					test = {
						commands: [],
						expectedResult: [],
						line:0
					};
				}
			}
			return tests;
		},
		
		run: function(moduleName){
			// summary:
			//		Run the doctests in the module given.
			// example:
			//		doctest = new dojox.testing.DocTest();
			//		doctest.run("dojox.testing.DocTest");
			//		doctest.errors should finally be an empty array.
			//		// The above is not a doctest, because it just would
			//		//	execute itself in a never ending loop.
			//
			//		>>> true==true // Test a new line terminating the test.
			//		true
			//
			//		>>> true==true // Test a new test terminating the test.
			//		true
			//		>>> true==true // Test a "not a comment"-line, especially an empty line terminating the test.
			//		true

			//		Make sure the result as printed on the console is the same as what
			//		is returned by the test. An array is printed as follows on the console.
			//		>>> [1,2,3,4]
			//		[1,2,3,4]
			//
			//		Test a "not a comment"-line, with some real code(!) terminating the test.
			//		This used to be a bug, so make sure the line below the test is real
			//		from this method! Don't write a test after it, always above!
			//		>>> true==true // Test code on new line terminating the test.
			//		true
	
			this.errors = [];
			
			var tests = this.getTests(moduleName);
			if(tests){
				this._run(tests);
			}
		},
		
		_run: function(/*Array*/tests){
			// summary:
			//		Each element in the array contains the test in the first element,
			//		and the expected result in the second element.
			// tests:
			//		Make sure that the types are compared properly. There used to be
			//		the bug that a return value false was compared to "false" which
			//		made the test fail. This is fixed and should be verified by the
			//		following tests.
			//		>>> false
			//		false
			//
			//		>>> "false"
			//		"false"
			//
			//		>>> true
			//		true
			//
			//		>>> 1
			//		1
			//
			//		>>> "s"
			//		"s"
			//
			//		>>> dojo.toJson({one:1})
			//		"{"one":1}"
			//
			var len = tests.length;
			this.tests = len;
			var oks = 0;
			for(var i=0; i<len; i++){
				var t = tests[i];
				var res = this.runTest(t.commands, t.expectedResult);
				var msg = "Test "+(i+1)+": ";
				var viewCommands = t.commands.join(" ");
				// Show the first part of the test command.
				viewCommands = (viewCommands.length > 50 ?
								viewCommands.substr(0,50) + "..." :
								viewCommands
				);
				if(res.success){
					// the last if-condition, dojo.toJson() adds a quote sign "
					// before and after the result, may be we remove it and
					// test the result again
					console.info(msg+"OK: "+viewCommands);
					oks += 1;
				}else{
					this.errors.push({
						commands: t.commands,
						actual: res.actualResult,
						expected: t.expectedResult
					});
					console.error(msg+"Failed: "+viewCommands, {
						commands: t.commands,
						actualResult: res.actualResult,
						expectedResult: t.expectedResult
					});
				}
			}
			console.info(len+" tests ran.", oks+" Success,", this.errors.length+" Errors");
		},
		
		runTest: function(commands, expected){
			var ret = {
				success: false,
				actualResult: null
			};
			// Concat multiple commands with new lines, so "//" comments at
			// the end of a line don't deactivate the next line (which it
			// would if we only concatenated with ";").
			var cmds = commands.join("\n");
			ret.actualResult = eval(cmds);
			if( (String(ret.actualResult)==expected) ||
				(dojo.toJson(ret.actualResult)==expected) ||
				(
					(expected.charAt(0)=='"')&&
					(expected.charAt(expected.length-1)=='"')&&
					(String(ret.actualResult)==expected.substring(1, expected.length-1))
				)
			){
				// the last if-condition, dojo.toJson() adds a quote sign "
				// before and after the result, may be we remove it and test
				// the result again
				ret.success = true;
			}
			return ret;
		}
	}
);

return dojox.testing.DocTest;
});