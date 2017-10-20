define([
	"dojo/_base/array", // indexOf, map, forEach
	"dojo/_base/declare", // declare
	"dojo/dom-geometry", // domGeometry.setMarginBox
	"dojo/sniff",	// has("android")
	"dojo/query", // query
	"./_FormValueWidget",
	"dojo/NodeList-dom"	// orphan()
], function(array, declare, domGeometry, has, query, _FormValueWidget){

	// module:
	//		dijit/form/MultiSelect

	var MultiSelect = declare("dijit.form.MultiSelect" + (has("dojo-bidi") ? "_NoBidi" : ""), _FormValueWidget, {
		// summary:
		//		Widget version of a `<select multiple=multiple>` element,
		//		for selecting multiple options.

		// size: Number
		//		Number of elements to display on a page
		//		NOTE: may be removed in version 2.0, since elements may have variable height;
		//		set the size via style="..." or CSS class names instead.
		size: 7,

		baseClass: "dijitMultiSelect",

		templateString: "<select multiple='multiple' ${!nameAttrSetting} data-dojo-attach-point='containerNode,focusNode' data-dojo-attach-event='onchange: _onChange'></select>",

		addSelected: function(/*dijit/form/MultiSelect*/ select){
			// summary:
			//		Move the selected nodes of a passed Select widget
			//		instance to this Select widget.
			//
			// example:
			// |	// move all the selected values from "bar" to "foo"
			// |	dijit.byId("foo").addSelected(dijit.byId("bar"));

			select.getSelected().forEach(function(n){
				this.containerNode.appendChild(n);
				// scroll to bottom to see item
				// cannot use scrollIntoView since <option> tags don't support all attributes
				// does not work on IE due to a bug where <select> always shows scrollTop = 0
				this.domNode.scrollTop = this.domNode.offsetHeight; // overshoot will be ignored
				// scrolling the source select is trickier esp. on safari who forgets to change the scrollbar size
				var oldscroll = select.domNode.scrollTop;
				select.domNode.scrollTop = 0;
				select.domNode.scrollTop = oldscroll;
			}, this);
			this._set('value', this.get('value'));
		},

		getSelected: function(){
			// summary:
			//		Access the NodeList of the selected options directly
			return query("option", this.containerNode).filter(function(n){
				return n.selected; // Boolean
			}); // dojo/NodeList
		},

		_getValueAttr: function(){
			// summary:
			//		Hook so get('value') works.
			// description:
			//		Returns an array of the selected options' values.

			// Don't call getSelect.map() because it doesn't return a real array,
			// and that messes up dojo.toJson() calls like in the Form.html test
			return array.map(this.getSelected(), function(n){
				return n.value;
			});
		},

		// Set multiple so parent form widget knows that I return multiple values.
		// Also adding a no-op custom setter; otherwise the multiple property is applied to the <select> node
		// which causes problem on Android < 4.4 with all but the first selected item being deselected.
		multiple: true,
		_setMultipleAttr: function(val){
		},

		_setValueAttr: function(/*String[]*/ values){
			// summary:
			//		Hook so set('value', values) works.
			// description:
			//		Set the value(s) of this Select based on passed values

			if(has("android")){
				// Workaround bizarre Android bug where deselecting one option selects another one.
				// See https://code.google.com/p/android/issues/detail?id=68285.
				// Could use this code path for all browsers but I worry about IE memory leaks.
				query("option", this.containerNode).orphan().forEach(function(n){
					var option = n.ownerDocument.createElement("option");
					option.value = n.value;
					option.selected = (array.indexOf(values, n.value) != -1);
					option.text = n.text;
					option.originalText = n.originalText;	// for bidi support, see has("dojo-bidi") block below
					this.containerNode.appendChild(option);
				}, this);
			}else {
				query("option", this.containerNode).forEach(function(n){
					n.selected = (array.indexOf(values, n.value) != -1);
				});
			}

			this.inherited(arguments);
		},

		invertSelection: function(/*Boolean?*/ onChange){
			// summary:
			//		Invert the selection
			// onChange: Boolean
			//		If false, onChange is not fired.
			var val = [];
			query("option", this.containerNode).forEach(function(n){
				if(!n.selected){
					val.push(n.value);
				}
			});
			this._setValueAttr(val, !(onChange === false || onChange == null));
		},

		_onChange: function(/*Event*/){
			this._handleOnChange(this.get('value'), true);
		},

		// for layout widgets:
		resize: function(/*Object*/ size){
			if(size){
				domGeometry.setMarginBox(this.domNode, size);
			}
		},

		postCreate: function(){
			this._set('value', this.get('value'));
			this.inherited(arguments);
		}
	});

	if(has("dojo-bidi")){
		MultiSelect = declare("dijit.form.MultiSelect", MultiSelect, {
			addSelected: function(/*dijit/form/MultiSelect*/ select){
				select.getSelected().forEach(function(n){
					n.text = this.enforceTextDirWithUcc(this.restoreOriginalText(n), n.text);
				}, this);
				this.inherited(arguments);
			},

			_setTextDirAttr: function(textDir){
				// to insure the code executed only when _BidiSupport loaded, and only
				// when there was a change in textDir
				if((this.textDir != textDir || !this._created) && this.enforceTextDirWithUcc){
					this._set("textDir", textDir);

					query("option", this.containerNode).forEach(function(option){
						// If the value wasn't defined explicitly, it the same object as
						// option.text. Since the option.text will be modified (by wrapping of UCC)
						// we want to save the original option.value for form submission.
						if(!this._created && option.value === option.text){
							option.value = option.text;
						}
						// apply the bidi support
						option.text = this.enforceTextDirWithUcc(option, option.originalText || option.text);
					}, this);
				}
			}
		});
	}

	return MultiSelect;
});
