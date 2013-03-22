// module:
//		dijit/tests/delay.js
// summary:
//		AMD plugin that waits a specified number of ms before "loading".
//		Used to delay execution of callbacks registered by dojo.ready().
//		(Used by _testCommon.html)
//
//		Usage: ready(1, function(){ require(["dijit/tests/delay!300"]); });
define({
	load: function(delay, req, loaded){
		setTimeout(function(){
			loaded(1);
		}, delay);
	},
	dynamic: 1,
	normalize: function(id){
		return id;
	}
});