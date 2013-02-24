define([
	"dojo/_base/declare",
	"dojo/dom-construct",
	"dijit/form/_CheckBoxMixin",
	"./ToggleButton"
],
	function(declare, domConstruct, CheckBoxMixin, ToggleButton){

	return declare("dojox.mobile.CheckBox", [ToggleButton, CheckBoxMixin], {
		// summary:
		//		A non-templated checkbox widget that can be in two states 
		//		(checked or not checked).

		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblCheckBox",

		// _setTypeAttr: [private] Function 
		//		Overrides the automatic assignement of type to nodes.
		_setTypeAttr: function(){}, // cannot be changed: IE complains w/o this

		buildRendering: function(){
			if(!this.srcNodeRef){
				// The following doesn't work on IE < 8 if the default state is checked.
				// You have to use "<input checked>" instead but it's not worth the bytes here.
				this.srcNodeRef = domConstruct.create("input", {type: this.type});
			}
			this.inherited(arguments);
			this.focusNode = this.domNode;
		},
		
		_getValueAttr: function(){
			// tags:
			//		private
			return (this.checked ? this.value : false);
		}
	});
});
