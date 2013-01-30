define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Stateful",
	"./_atBindingMixin"
], function(declare, lang, Stateful, _atBindingMixin){
	return declare("dojox.mvc._Controller", [Stateful, _atBindingMixin], {
		postscript: function(/*Object?*/ params, /*DomNode|String?*/ srcNodeRef){
			// summary:
			//		If this object is not called from Dojo parser, starts this up right away.
			//		Also, if widget registry is available, register this object.

			// If there is dijit/_WidgetBase in upper class hierarchy (happens when this descendant is mixed into a widget), let _WidgetBase do all work
			if(this._applyAttributes){
				this.inherited(arguments);
			}
			// Look for dojox/mvc/at handles in the parameters
			this._dbpostscript(params, srcNodeRef);
			// Merge the parameters to this
			if(params){
				this.params = params;
				for(var s in params){
					this.set(s, params[s]);
				}
			}
			// Add this instance to dijit/registry, if it's available
			var registry;
			try{
				// Usage of dijit/registry module is optional. Do not use it if it's not already loaded.
				registry = require("dijit/registry");
				this.id = this.id || (srcNodeRef || {}).id || registry.getUniqueId(this.declaredClass.replace(/\./g, "_"));
				registry.add(this);
			}catch(e){}
			if(!srcNodeRef){
				// If this instance is not created via Dojo parser, start this up right away
				this.startup();
			}else{
				// If this is created via Dojo parser, set widgetId attribute so that destroyDescendants() of parent widget works
				srcNodeRef.setAttribute("widgetId", this.id); 
			}
		},

		startup: function(){
			// summary:
			//		Starts up data binding as this object starts up.

			if(!this._applyAttributes){
				this._startAtWatchHandles();
			}
			// If there is dijit/_WidgetBase in upper class hierarchy (happens when this descendant is mixed into a widget), let _WidgetBase do all work
			this.inherited(arguments);
		},

		destroy: function(){
			// summary:
			//		Stops data binding as this object is destroyed.

			this._beingDestroyed = true;
			if(!this._applyAttributes){
				this._stopAtWatchHandles();
			}
			// If there is dijit/_WidgetBase in upper class hierarchy (happens when this descendant is mixed into a widget), let _WidgetBase do all work
			this.inherited(arguments);
			if(!this._applyAttributes){
				try{
					// Remove this instance from dijit/registry
					// Usage of dijit/registry module is optional. Do not use it if it's not already loaded.
					require("dijit/registry").remove(this.id);
				}catch(e){}
			}
			this._destroyed = true;
		},

		set: function(/*String*/ name, /*Anything*/ value){
			// summary:
			//		If the value given is dojox/mvc/at handle, use it for data binding.
			//		Otherwise, if setter function is there, use it.
			//		Otherwise, set the value to the data model or to this object.
			// name: String
			//		The property name.
			// value: Anything
			//		The property value.

			// If an object is used, iterate through object
			if(typeof name === "object"){
				for(var x in name){
					if(name.hasOwnProperty(x)){
						this.set(x, name[x]);
					}
				}
				return this;
			}

			if(!this._applyAttributes){
				if((value || {}).atsignature == "dojox.mvc.at"){
					// If dojox/mvc/at handle is given, use it for data binding
					return this._setAtWatchHandle(name, value);
				}else{
					// Otherwise align the setter interface to _WidgetBase
					var setterName = "_set" + name.replace(/^[a-z]/, function(c){ return c.toUpperCase(); }) + "Attr";
					if(this[setterName]){
						this[setterName](value);
					}else{
						this._set(name, value);
					}
					return this;
				}
			}

			// If there is dijit/_WidgetBase in upper class hierarchy (happens when this descendant is mixed into a widget), let _WidgetBase do all work
			return this.inherited(arguments);
		},

		_set: function(/*String*/ name, /*Anything*/ value){
			// summary:
			//		Implement _set() interface so that _set() behavior is consistent whether the instance inherits _WidgetBase or not.
			//		If the instance does not inherit _WidgetBase, use dojo/Stateful/_changeAttrValue() that's equivalent to dijit/_WidgetBase._set().
			// name: String
			//		The property name.
			// value: Anything
			//		The property value.

			if(!this._applyAttributes){
				// Call dojo/Stateful/_changeAttrValue() that's equivalent to dijit/_WidgetBase/_set()
				return this._changeAttrValue(name, value);
			}
			// If there is dijit/_WidgetBase in upper class hierarchy (happens when this descendant is mixed into a widget), let _WidgetBase do all work
			return this.inherited(arguments);
		}
	});
});
