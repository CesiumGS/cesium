define([
	"dojo/_base/lang",
	"dojo/_base/kernel",
	"dojo/dom-attr",
	"./_Mixin",
	"dojo/_base/declare"
], function(lang, dojo, domAttr, _Mixin, declare){
	var fm = lang.getObject("dojox.form.manager", true),
		aa = fm.actionAdapter,
		ia = fm.inspectorAdapter;

	return declare("dojox.form.manager._EnableMixin", null, {
		// summary:
		//		Form manager's mixin for controlling enable/disable state of
		//		form elements.
		// description:
		//		This mixin provides unified enable/disable functionality for
		//		form widgets and form elements. It should be used together
		//		with dojox.form.manager.Mixin.

		gatherEnableState: function(names){
			// summary:
			//		Gather enable state of all form elements and return as a dictionary.
			// names: Object?
			//		If it is an array, it is a list of names to be processed.
			//		If it is an object, dictionary keys are names to be processed.
			//		If it is omitted, all known form elements are to be processed.

			var result = this.inspectFormWidgets(ia(function(name, widget){
				return !widget.get("disabled");
			}), names);

			if(this.inspectFormNodes){
				lang.mixin(result, this.inspectFormNodes(ia(function(name, node){
					return !domAttr.get(node, "disabled");
				}), names));
			}

			return result;	// Object
		},

		enable: function(state, defaultState){
			// summary:
			//		Enable form controls according to the supplied state object.
			// state: Object?
			//		Optional. If a name-value dictionary, the value is true
			//		to enable and false to disable. If an array, all names in the
			//		array will be set to defaultState. If omitted, all form
			//		elements will be set to defaultState.
			// defaultState: Boolean
			//		The default state (true, if omitted).

			if(arguments.length < 2 || defaultState === undefined){
				defaultState = true;
			}

			this.inspectFormWidgets(aa(function(name, widget, value){
				widget.set("disabled", !value);
			}), state, defaultState);

			if(this.inspectFormNodes){
				this.inspectFormNodes(aa(function(name, node, value){
					domAttr.set(node, "disabled", !value);
				}), state, defaultState);
			}

			return this;	// self
		},

		disable: function(state){
			// summary:
			//		Disable form controls according to the supplied state object
			//		returning the previous state.
			// state: Object?
			//		Optional. If a name-value dictionary, the value is true
			//		to enable and false to disable. If an array, all names in the
			//		array will be disabled. If omitted, disables all.
			var oldState = this.gatherEnableState();
			this.enable(state, false);
			return oldState;	// Object
		}
	});
});
