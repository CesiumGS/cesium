define([
	"dojo/_base/declare",
	"dijit/registry",
	"dojox/mvc/getStateful",
	"dojox/mvc/ListController",
	"dojox/mvc/StoreRefController"
], function(declare, registry, getStateful, ListController, StoreRefController){
	// module:
	//		dojox/mvc/tests/mobile/demo/MobileDemoContactListController
	// summary:
	//		The controller for contact list info for this demo.

	return declare([ListController, StoreRefController], {
		// summaryScrollableViewId: String
		//		The ID of the scrollable view representing summary (in list).
		summaryScrollableViewId: "",

		// detailScrollableViewId: String
		//		The ID of the scrollable view representing detail (in form).
		detailScrollableViewId: "",

		// initialFocusElementId: String
		//		The ID of the element that should get the focus when list selection switches, etc.
		initialFocusElementId: "",

		setDetailsContext: function(/*String*/ uniqueId){
			// summary:
			//		Called to move to the repeatdetails page when an item is selected on the WidgetList Data Binding page. 
			// uniqueId: String
			//		The ID of the row. 

			this.set("cursorId", uniqueId);
			registry.byId(this.initialFocusElementId).focus();
		},

		addEmpty: function(){
			// summary:
			//		Called to add an empty item when the white plus icon is pressed on the WidgetList Data Binding page. 

			var payload = getStateful({
				uniqueId: "" + Math.random(),
				First: "",
				Last: "",
				Location: "CA",
				Office: "",
				Email: "",
				Tel: "",
				Fax: ""
			});
			this[this._refInModelProp].push(payload);
			this.set("cursor", payload);
			registry.byId(this.summaryScrollableViewId).performTransition(this.detailScrollableViewId, 1, "none");
			registry.byId(this.initialFocusElementId).focus();
		},

		remove: function(/*String*/ uniqueId){
			// summary:
			//		Called to remove an item when the red circle minus icon is pressed on the WidgetList Data Binding page. 

			for(var model = this[this._refInModelProp], i = 0; i < model.length; i++){
				if(model[i][this.idProperty] == uniqueId){
					model.splice(i, 1);
					if(i < this[this._refInModelProp].get("length")){
						this.set("cursorIndex", i);
					}
					return;
				}
			}
		}
	});
});
