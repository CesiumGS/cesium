require(["dojox/app/main", "dojox/json/ref"],
	function(Application, json){

	var isTablet = false;

	var configurationFile = "./config-phone.json";
	if(window.innerWidth > 600){
		configurationFile = "./config-tablet.json";
		isTablet = true;
	}

	require(["dojo/text!"+configurationFile], function(configJson){
		var config = json.fromJson(configJson);
		config.isTablet = isTablet;
		Application(config);
			 	
	 	window.removeScrollableItem = function(index){
				var repeatmodel = app.loadedModels.repeatmodels;
				repeatmodel.model.splice(index, 1);
				return false; 	 		
	 	};

	});
});
