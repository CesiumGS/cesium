define([
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"./ContentPane"
], function(declare, kernel, ContentPane){

	// module:
	//		dijit/layout/AccordionPane

	return declare("dijit.layout.AccordionPane", ContentPane, {
		// summary:
		//		Deprecated widget.   Use `dijit/layout/ContentPane` instead.
		// tags:
		//		deprecated

		constructor: function(){
			kernel.deprecated("dijit.layout.AccordionPane deprecated, use ContentPane instead", "", "2.0");
		},

		onSelected: function(){
			// summary:
			//		called when this pane is selected
		}
	});
});
