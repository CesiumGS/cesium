define([
	"dojo/_base/declare",
	"dojo/query!css2",
	"dijit/TitlePane",
	"dojo/text!./templates/Fieldset.html",
	"./a11yclick"	// template uses ondijitclick
], function(declare, query, TitlePane, template){


	return declare("dijit.Fieldset", TitlePane, {
		// summary:
		//		An accessible fieldset that can be expanded or collapsed via
		//		its legend.  Fieldset extends `dijit.TitlePane`.

		// baseClass: [protected] String
		//		The root className to use for the various states of this widget
		baseClass: 'dijitFieldset',

		// title: String
		//		Content of the legend tag. Overrides <legend> tag if not empty.
		title: '',

		// open: Boolean
		//		Whether fieldset is opened or closed.
		open: true,

		templateString: template,

		postCreate: function() {
			if(!this.title){
				var legends = query('legend', this.containerNode);
				if(legends.length) { // oops, no legend?
					this.set('title', legends[0].innerHTML);
					legends[0].parentNode.removeChild(legends[0]);
				}
			}

			this.inherited(arguments);
		}
	});
});
