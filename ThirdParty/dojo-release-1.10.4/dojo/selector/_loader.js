define(["../has", "require"],
		function(has, require){

"use strict";
var testDiv = document.createElement("div");
has.add("dom-qsa2.1", !!testDiv.querySelectorAll);
has.add("dom-qsa3", function(){
			// test to see if we have a reasonable native selector engine available
			try{
				testDiv.innerHTML = "<p class='TEST'></p>"; // test kind of from sizzle
				// Safari can't handle uppercase or unicode characters when
				// in quirks mode, IE8 can't handle pseudos like :empty
				return testDiv.querySelectorAll(".TEST:empty").length == 1;
			}catch(e){}
		});
var fullEngine;
var acme = "./acme", lite = "./lite";
return {
	// summary:
	//		This module handles loading the appropriate selector engine for the given browser

	load: function(id, parentRequire, loaded, config){
		var req = require;
		// here we implement the default logic for choosing a selector engine
		id = id == "default" ? has("config-selectorEngine") || "css3" : id;
		id = id == "css2" || id == "lite" ? lite :
				id == "css2.1" ? has("dom-qsa2.1") ? lite : acme :
				id == "css3" ? has("dom-qsa3") ? lite : acme :
				id == "acme" ? acme : (req = parentRequire) && id;
		if(id.charAt(id.length-1) == '?'){
			id = id.substring(0,id.length - 1);
			var optionalLoad = true;
		}
		// the query engine is optional, only load it if a native one is not available or existing one has not been loaded
		if(optionalLoad && (has("dom-compliant-qsa") || fullEngine)){
			return loaded(fullEngine);
		}
		// load the referenced selector engine
		req([id], function(engine){
			if(id != "./lite"){
				fullEngine = engine;
			}
			loaded(engine);
		});
	}
};
});
