define([
	"dojo/_base/declare", // declare
	"dojo/sniff", // has("msapp")
	"dojo/dom-construct", // domConstruct.place
	"./ValidationTextBox"
], function(declare, has, domConstruct, ValidationTextBox){

	// module:
	//		dijit/form/MappedTextBox

	return declare("dijit.form.MappedTextBox", ValidationTextBox, {
		// summary:
		//		A dijit/form/ValidationTextBox subclass which provides a base class for widgets that have
		//		a visible formatted display value, and a serializable
		//		value in a hidden input field which is actually sent to the server.
		// description:
		//		The visible display may
		//		be locale-dependent and interactive.  The value sent to the server is stored in a hidden
		//		input field which uses the `name` attribute declared by the original widget.  That value sent
		//		to the server is defined by the dijit/form/MappedTextBox.serialize() method and is typically
		//		locale-neutral.
		// tags:
		//		protected

		postMixInProperties: function(){
			this.inherited(arguments);

			// We want the name attribute to go to the hidden <input>, not the displayed <input>,
			// so override _FormWidget.postMixInProperties() setting of nameAttrSetting for IE.
			this.nameAttrSetting = "";
		},

		// Remap name attribute to be mapped to hidden node created in buildRendering(), rather than this.focusNode
		_setNameAttr: "valueNode",

		serialize: function(val /*=====, options =====*/){
			// summary:
			//		Overridable function used to convert the get('value') result to a canonical
			//		(non-localized) string.  For example, will print dates in ISO format, and
			//		numbers the same way as they are represented in javascript.
			// val: anything
			// options: Object?
			// tags:
			//		protected extension
			return val.toString ? val.toString() : ""; // String
		},

		toString: function(){
			// summary:
			//		Returns widget as a printable string using the widget's value
			// tags:
			//		protected
			var val = this.filter(this.get('value')); // call filter in case value is nonstring and filter has been customized
			return val != null ? (typeof val == "string" ? val : this.serialize(val, this.constraints)) : ""; // String
		},

		validate: function(){
			// Overrides `dijit/form/TextBox.validate`
			this.valueNode.value = this.toString();
			return this.inherited(arguments);
		},

		buildRendering: function(){
			// Overrides `dijit/_TemplatedMixin/buildRendering`

			this.inherited(arguments);

			// Create a hidden <input> node with the serialized value used for submit
			// (as opposed to the displayed value).
			// Passing in name as markup rather than relying on _setNameAttr custom setter above
			// to make query(input[name=...]) work on IE. (see #8660).
			// But not doing that for Windows 8 Store apps because it causes a security exception (see #16452).
			this.valueNode = domConstruct.place("<input type='hidden'" +
				((this.name && !has("msapp")) ? ' name="' + this.name.replace(/"/g, "&quot;") + '"' : "") + "/>",
				this.textbox, "after");
		},

		reset: function(){
			// Overrides `dijit/form/ValidationTextBox.reset` to
			// reset the hidden textbox value to ''
			this.valueNode.value = '';
			this.inherited(arguments);
		}
	});
});
