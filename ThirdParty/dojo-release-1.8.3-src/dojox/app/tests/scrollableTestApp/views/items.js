define(["dojo/_base/lang", "dojo/dom", "dojo/dom-style", "dijit/registry", "dojox/mobile/TransitionEvent"],
	function(lang, dom, domStyle, registry, TransitionEvent){
	return {
		init: function(){
			if(this.app.isTablet){
				domStyle.set(dom.byId("gotoConfigurationView"), "display", "none");
			}
/*
			registry.byId("itemslist_add").on("click", lang.hitch(this, function(e){
				// use selected_item = -1 to identify add a new item
				this.app._addNewItem = true;

				// transition to detail view for edit
				var transOpts = {
					title: "Detail",
					target: "details,EditTodoItem",
					url: "#details,EditTodoItem"
				};
				new TransitionEvent(e.srcElement, transOpts, e).dispatch();
			}));
*/			
		}
	}
});
