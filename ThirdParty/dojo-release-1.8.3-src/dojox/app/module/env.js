define(["dojo/_base/declare"], function(declare){
	return declare(null, {
		mode: "",
		init: function(){

			//TODO BROADLY categorize the mode of the app...mobile,desktop
			//     This should be done with UA sniffing, but remember
			//	very broadly, this is for purposes of deciding
			//	which ui to render, NOT feature detection	
			/*
			this.mode="mobile";
			var def = this.inherited(arguments);

			//just an example
			return def.then(function(){
				console.log("env init after inherited inits");
			});	
			*/
		}
	});
});
