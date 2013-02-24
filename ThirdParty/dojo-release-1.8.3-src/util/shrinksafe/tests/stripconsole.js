result = "";

/* For the purpose of these tests, we have no actual console with
   which to test output, so create a dummy console and capture to
   'result', which is examined by the test framework post eval. */
var console = {
	debug: function(arg) { result += "DEBUG: " + arg; },
	warn: function(arg) { result += "WARN: " + arg; },
	error: function(arg) { result += "ERROR: " + arg; },
	dir: function(arg) { result += "DIR: " + arg; }
};
/* Make something that looks a bit like console to ensure it
   isn't stripped. */
var notconsole = {
	debug: function(arg) { result += arg; },
	warn: function(arg) { result += arg; }
};
(function() {
	var variable = 'variable';

	console.debug("debug here!" + variable);
	console.warn("warn here!");
	console.error("error here!");
	notconsole.debug("notconsole debug here!");
	notconsole.warn("notconsole warn here!");

	console.dir(notconsole);
})();
