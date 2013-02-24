define([
	"dojo/dom",
	"dojo/json",
	"dijit/registry"
], function(dom, json, registry){
	// module:
	//		dojox/mvc/tests/mobile/demo/MobileDemoGenerateActions
	// summary:
	//		The action handlers for Generate example of this demo.

	return {
		switchToData: function(){
			// summary:
			//		Called when the "Update Model" button is pressed on the Generate View page.

			dom.byId("outerModelArea").style.display = "";
			try {
				dom.byId("modelArea").focus(); // hack: do this to force focus off of the textbox, bug on mobile?
				dom.byId("viewArea").style.display = "none";
				registry.byId("modelArea").set("value", json.stringify(registry.byId("view").get("children")));
			} catch(e) {
				console.log(e);
			}
		},
		
		switchToGenerated: function(){
			// summary:
			//		Called when the "Update View" button is pressed on the Generate Simple Form. 

			dom.byId("outerModelArea").style.display = "none";
			dom.byId("viewArea").style.display = "";
		}
	};
});

