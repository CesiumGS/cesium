define([
	"dojo/_base/declare", // declare
	"dojo/dom-attr" // domAttr.set
], function(declare, domAttr){

	// module:
	//		dijit/form/_CheckBoxMixin

	return declare("dijit.form._CheckBoxMixin", null, {
		// summary:
		//		Mixin to provide widget functionality corresponding to an HTML checkbox
		//
		// description:
		//		User interacts with real html inputs.
		//		On onclick (which occurs by mouse click, space-bar, or
		//		using the arrow keys to switch the selected radio button),
		//		we update the state of the checkbox/radio.
		//

		// type: [private] String
		//		type attribute on `<input>` node.
		//		Overrides `dijit/form/Button.type`.  Users should not change this value.
		type: "checkbox",

		// value: String
		//		As an initialization parameter, equivalent to value field on normal checkbox
		//		(if checked, the value is passed as the value when form is submitted).
		value: "on",

		// readOnly: Boolean
		//		Should this widget respond to user input?
		//		In markup, this is specified as "readOnly".
		//		Similar to disabled except readOnly form values are submitted.
		readOnly: false,

		// aria-pressed for toggle buttons, and aria-checked for checkboxes
		_aria_attr: "aria-checked",

		_setReadOnlyAttr: function(/*Boolean*/ value){
			this._set("readOnly", value);
			domAttr.set(this.focusNode, 'readOnly', value);
		},

		// Override dijit/form/Button._setLabelAttr() since we don't even have a containerNode.
		// Normally users won't try to set label, except when CheckBox or RadioButton is the child of a dojox/layout/TabContainer
		_setLabelAttr: undefined,

		_getSubmitValue: function(/*String*/ value){
			return (value == null || value === "") ? "on" : value;
		},

		_setValueAttr: function(newValue){
			newValue = this._getSubmitValue(newValue);	// "on" to match browser native behavior when value unspecified
			this._set("value", newValue);
			domAttr.set(this.focusNode, "value", newValue);
		},

		reset: function(){
			this.inherited(arguments);
			// Handle unlikely event that the <input type=checkbox> value attribute has changed
			this._set("value", this._getSubmitValue(this.params.value));
			domAttr.set(this.focusNode, 'value', this.value);
		},

		_onClick: function(/*Event*/ e){
			// summary:
			//		Internal function to handle click actions - need to check
			//		readOnly, since button no longer does that check.
			if(this.readOnly){
				e.stopPropagation();
				e.preventDefault();
				return false;
			}
			return this.inherited(arguments);
		}
	});
});
