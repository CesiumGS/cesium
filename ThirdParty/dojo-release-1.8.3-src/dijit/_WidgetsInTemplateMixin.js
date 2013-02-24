define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/parser" // parser.parse
], function(array, declare, parser){

	// module:
	//		dijit/_WidgetsInTemplateMixin

	return declare("dijit._WidgetsInTemplateMixin", null, {
		// summary:
		//		Mixin to supplement _TemplatedMixin when template contains widgets

		// _earlyTemplatedStartup: Boolean
		//		A fallback to preserve the 1.0 - 1.3 behavior of children in
		//		templates having their startup called before the parent widget
		//		fires postCreate. Defaults to 'false', causing child widgets to
		//		have their .startup() called immediately before a parent widget
		//		.startup(), but always after the parent .postCreate(). Set to
		//		'true' to re-enable to previous, arguably broken, behavior.
		_earlyTemplatedStartup: false,

		// widgetsInTemplate: [protected] Boolean
		//		Should we parse the template to find widgets that might be
		//		declared in markup inside it?  (Remove for 2.0 and assume true)
		widgetsInTemplate: true,

		_beforeFillContent: function(){
			if(this.widgetsInTemplate){
				// Before copying over content, instantiate widgets in template
				var node = this.domNode;

				var cw = (this._startupWidgets = parser.parse(node, {
					noStart: !this._earlyTemplatedStartup,
					template: true,
					inherited: {dir: this.dir, lang: this.lang, textDir: this.textDir},
					propsThis: this,	// so data-dojo-props of widgets in the template can reference "this" to refer to me
					scope: "dojo"	// even in multi-version mode templates use dojoType/data-dojo-type
				}));

				if(!cw.isFulfilled()){
					throw new Error(this.declaredClass + ": parser returned unfilled promise (probably waiting for module auto-load), " +
						"unsupported by _WidgetsInTemplateMixin.   Must pre-load all supporting widgets before instantiation.");
				}

				// _WidgetBase::destroy() will destroy any supporting widgets under this.domNode.
				// If we wanted to, we could call this.own() on anything in this._startupWidgets that was moved outside
				// of this.domNode (like Dialog, which is moved to <body>).

				this._attachTemplateNodes(cw, function(n,p){
					return n[p];
				});
			}
		},

		startup: function(){
			array.forEach(this._startupWidgets, function(w){
				if(w && !w._started && w.startup){
					w.startup();
				}
			});
			this.inherited(arguments);
		}
	});
});
