define(["dojo", "doh/runner"], function(dojo, doh) {

	// Checks the 'sounds' checkbox in the browser test runner 
	// so we get Homer's feedback on the test run
	dojo.ready(function(){
		var chkNode = dojo.byId("audio");
	    if(chkNode) {
			chkNode.checked=true;
		}
	});
});