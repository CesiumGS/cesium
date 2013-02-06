define([
	"dojo/_base/lang",
	"dojo/_base/kernel",
	"dojo/dom-class",
	"./_Mixin",
	"dojo/_base/declare"
], function(lang, dojo, domClass, _Mixin, declare){
	var fm = lang.getObject("dojox.form.manager", true),
		aa = fm.actionAdapter,
		ia = fm.inspectorAdapter;

	return declare("dojox.form.manager._ClassMixin", null, {
		// summary:
		//		Form manager's mixin for testing/assigning/removing
		//		classes of controlled elements.
		// description:
		//		This mixin provides unified way to check/add/remove a class
		//		of controlled elements.
		//		It should be used together with dojox.form.manager.Mixin.

		gatherClassState: function(className, names){
			// summary:
			//		Gather the presence of a certain class in all controlled elements.
			// className: String
			//		The class name to test for.
			// names: Object?
			//		If it is an array, it is a list of names to be processed.
			//		If it is an object, dictionary keys are names to be processed.
			//		If it is omitted, all known form elements are to be processed.

			var result = this.inspect(ia(function(name, node){
				return domClass.contains(node, className);
			}), names);

			return result;	// Object
		},

		addClass: function(className, names){
			// summary:
			//		Add a class to nodes according to the supplied set of names
			// className: String
			//		Class name to add.
			// names: Object?
			//		If it is an array, it is a list of names to be processed.
			//		If it is an object, dictionary keys are names to be processed.
			//		If it is omitted, all known form elements are to be processed.

			this.inspect(aa(function(name, node){
				domClass.add(node, className);
			}), names);

			return this;	// self
		},

		removeClass: function(className, names){
			// summary:
			//		Remove a class from nodes according to the supplied set of names
			// className: String
			//		Class name to remove.
			// names: Object?
			//		If it is an array, it is a list of names to be processed.
			//		If it is an object, dictionary keys are names to be processed.
			//		If it is omitted, all known form elements are to be processed.

			this.inspect(aa(function(name, node){
				domClass.remove(node, className);
			}), names);

			return this;	// self
		}
	});
});
