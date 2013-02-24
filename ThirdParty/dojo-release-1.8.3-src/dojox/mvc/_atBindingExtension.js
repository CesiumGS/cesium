define([
	"dojo/aspect",
	"dojo/_base/lang",
	"dijit/_WidgetBase",
	"./_atBindingMixin",
	"dijit/registry"
], function(aspect, lang, _WidgetBase, _atBindingMixin){
	// Apply the at binding mixin to all dijits, see mixin class description for details.
	// Hiding this from the doc viewer since it's too much to display for every single widget.
	lang.extend(_WidgetBase, /*===== {} || =====*/ _atBindingMixin.prototype);

	// Monkey patch dijit._WidgetBase.postscript to get the list of dojox/mvc/at handles before startup
	aspect.before(_WidgetBase.prototype, "postscript", function(/*Object?*/ params, /*DomNode|String*/ srcNodeRef){
		this._dbpostscript(params, srcNodeRef);
	});

	// Monkey patch dijit._WidgetBase.startup to get data binds set up
	aspect.before(_WidgetBase.prototype, "startup", function(){
		this._startAtWatchHandles();
	});

	// Monkey patch dijit._WidgetBase.destroy to remove watches setup in _DataBindingMixin
	aspect.before(_WidgetBase.prototype, "destroy", function(){
		this._stopAtWatchHandles();
	});

	// Monkey patch dijit._WidgetBase.set to establish data binding if a dojox/mvc/at handle comes
	aspect.around(_WidgetBase.prototype, "set", function(oldWidgetBaseSet){
		return function(/*String*/ name, /*Anything*/ value){
			if(name == _atBindingMixin.prototype.dataBindAttr){
				return this._setBind(value);
			}else if((value || {}).atsignature == "dojox.mvc.at"){
				return this._setAtWatchHandle(name, value);
			}
			return oldWidgetBaseSet.apply(this, lang._toArray(arguments));
		};
	});
});
