define([
	"dojo/_base/lang",
	"dojo/_base/kernel",
	"dojo/_base/declare"
], function(lang, dojo, declare){
return declare("dojox.form.manager._ValueMixin", null, {
	// summary:
	//		Form manager's mixin for getting/setting form values in the unified manner.
	// description:
	//		This mixin adds unified access to form widgets and form elements
	//		in terms of name-value regardless of the underlying type of
	//		an element. It should be used together with dojox.form.manager.Mixin.

	elementValue: function(name, value){
		// summary:
		//		Set or get a form widget/element or an attached point node by name.
		// name: String
		//		The name.
		// value: Object?
		//		Optional. The value to set.

		if(name in this.formWidgets){
			return this.formWidgetValue(name, value);	// Object
		}

		if(this.formNodes && name in this.formNodes){
			return this.formNodeValue(name, value);	// Object
		}

		return this.formPointValue(name, value);	// Object
	},

	gatherFormValues: function(names){
		// summary:
		//		Collect form values.
		// names: Object?
		//		If it is an array, it is a list of names of form elements to be collected.
		//		If it is an object, dictionary keys are names to be collected.
		//		If it is omitted, all known form elements are to be collected.

		var result = this.inspectFormWidgets(function(name){
			return this.formWidgetValue(name);
		}, names);

		if(this.inspectFormNodes){
			lang.mixin(result, this.inspectFormNodes(function(name){
				return this.formNodeValue(name);
			}, names));
		}

		lang.mixin(result, this.inspectAttachedPoints(function(name){
			return this.formPointValue(name);
		}, names));

		return result;	// Object
	},

	setFormValues: function(values){
		// summary:
		//		Set values to form elements
		// values: Object
		//		A dictionary of key-value pairs.
		if(values){
			this.inspectFormWidgets(function(name, widget, value){
				this.formWidgetValue(name, value);
			}, values);

			if(this.inspectFormNodes){
				this.inspectFormNodes(function(name, node, value){
					this.formNodeValue(name, value);
				}, values);
			}

			this.inspectAttachedPoints(function(name, node, value){
				this.formPointValue(name, value);
			}, values);
		}
		return this;
	}
});
});
