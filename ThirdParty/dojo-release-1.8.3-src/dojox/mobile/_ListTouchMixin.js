define([
	"dojo/_base/declare",
	"dijit/form/_ListBase"
], function(declare, ListBase){

	return declare( "dojox.mobile._ListTouchMixin", ListBase, {
		// summary:
		//		Focus-less menu to handle touch events consistently.
		// description:
		//		Focus-less menu to handle touch events consistently. Abstract 
		//		method that must be defined externally:
		//
		//		- onClick: item was chosen (mousedown somewhere on the menu and mouseup somewhere on the menu).
	
		postCreate: function(){
			this.inherited(arguments);

			this._listConnect("click", "_onClick");
		},
	
		_onClick: function(/*Event*/ evt, /*DomNode*/ target){
			this._setSelectedAttr(target);
			this.onClick(target);
		}
	});
});
