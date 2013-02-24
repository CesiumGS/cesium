define([
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add
	"dojo/sniff", // has("ie") has("opera")
	"./TextBox"
], function(declare, domClass, has, TextBox){

// module:
//		dijit/form/SimpleTextarea


return declare("dijit.form.SimpleTextarea", TextBox, {
	// summary:
	//		A simple textarea that degrades, and responds to
	//		minimal LayoutContainer usage, and works with dijit/form/Form.
	//		Doesn't automatically size according to input, like Textarea.
	//
	// example:
	//	|	<textarea data-dojo-type="dijit/form/SimpleTextarea" name="foo" value="bar" rows=30 cols=40></textarea>
	//
	// example:
	//	|	new SimpleTextarea({ rows:20, cols:30 }, "foo");

	baseClass: "dijitTextBox dijitTextArea",

	// rows: Number
	//		The number of rows of text.
	rows: "3",

	// rows: Number
	//		The number of characters per line.
	cols: "20",

	templateString: "<textarea ${!nameAttrSetting} data-dojo-attach-point='focusNode,containerNode,textbox' autocomplete='off'></textarea>",

	postMixInProperties: function(){
		// Copy value from srcNodeRef, unless user specified a value explicitly (or there is no srcNodeRef)
		// TODO: parser will handle this in 2.0
		if(!this.value && this.srcNodeRef){
			this.value = this.srcNodeRef.value;
		}
		this.inherited(arguments);
	},

	buildRendering: function(){
		this.inherited(arguments);
		if(has("ie") && this.cols){ // attribute selectors is not supported in IE6
			domClass.add(this.textbox, "dijitTextAreaCols");
		}
	},

	filter: function(/*String*/ value){
		// Override TextBox.filter to deal with newlines... specifically (IIRC) this is for IE which writes newlines
		// as \r\n instead of just \n
		if(value){
			value = value.replace(/\r/g,"");
		}
		return this.inherited(arguments);
	},

	_onInput: function(/*Event?*/ e){
		// Override TextBox._onInput() to enforce maxLength restriction
		if(this.maxLength){
			var maxLength = parseInt(this.maxLength);
			var value = this.textbox.value.replace(/\r/g,'');
			var overflow = value.length - maxLength;
			if(overflow > 0){
				var textarea = this.textbox;
				if(textarea.selectionStart){
					var pos = textarea.selectionStart;
					var cr = 0;
					if(has("opera")){
						cr = (this.textbox.value.substring(0,pos).match(/\r/g) || []).length;
					}
					this.textbox.value = value.substring(0,pos-overflow-cr)+value.substring(pos-cr);
					textarea.setSelectionRange(pos-overflow, pos-overflow);
				}else if(this.ownerDocument.selection){ //IE
					textarea.focus();
					var range = this.ownerDocument.selection.createRange();
					// delete overflow characters
					range.moveStart("character", -overflow);
					range.text = '';
					// show cursor
					range.select();
				}
			}
		}
		this.inherited(arguments);
	}
});

});
