define([
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"./manager/_Mixin",
	"./manager/_NodeMixin",
	"./manager/_FormMixin",
	"./manager/_ValueMixin",
	"./manager/_EnableMixin",
	"./manager/_DisplayMixin",
	"./manager/_ClassMixin",
	"dojo/_base/declare"
], function(_Widget, _TemplatedMixin, _Mixin, _NodeMixin, _FormMixin, _ValueMixin, _EnableMixin, _DisplayMixin, _ClassMixin, declare){

return declare("dojox.form.Manager", [ _Widget, _Mixin, _NodeMixin, _FormMixin, _ValueMixin, _EnableMixin, _DisplayMixin, _ClassMixin ], {
	// summary:
	//		The widget to orchestrate dynamic forms.
	// description:
	//		This widget hosts dojox.form.manager mixins.
	//		See _Mixin for more info.

	buildRendering: function(){
		var node = (this.domNode = this.srcNodeRef);
		if(!this.containerNode){
			// all widgets with descendants must set containerNode
			this.containerNode = node;
		}
		this.inherited(arguments);
		this._attachPoints = [];
		this._attachEvents = [];
		_TemplatedMixin.prototype._attachTemplateNodes.call(this, node, function(n, p){ return n.getAttribute(p); });
	},

	destroyRendering: function(preserveDom){
		// ctm: calling _TemplatedMixin
		if(!this.__ctm){
			// avoid recursive call from _TemplatedMixin
			this.__ctm = true;
			_TemplatedMixin.prototype.destroyRendering.apply(this, arguments);
			delete this.__ctm;
			this.inherited(arguments);
		}
	}
});
});