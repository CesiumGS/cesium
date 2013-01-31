define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojox/mvc/at"
], function(declare, lang, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, at){
	return declare("dojox.mvc.Templated", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		// summary:
		//		A templated widget, mostly the same as dijit/_Templated, but without deprecated features in it.

		// bindings: Object
		//		The data binding declaration for child widgets.
		bindings: null,

		startup: function(){
			this.inherited(arguments);
			for(var s in this.bindings){
				var w = this[s], props = this.bindings[s];
				if(w){
					for(var prop in props){
						w.set(prop, props[prop]);
					}
				}
			}
		}
	});
});
