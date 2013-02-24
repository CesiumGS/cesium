require(["dojox/app/main", "dojo/text!./config.json"],
function(Application,config){
	app = Application(eval("(" + config + ")"));
});
