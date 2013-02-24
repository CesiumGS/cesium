define(["dojo/_base/array", "dojo/_base/declare", "dojo/_base/lang", "dojo/dom-style", "dojo/_base/kernel", "dojo/query", "dijit/registry", "dijit/Menu","dijit/MenuItem"],
    function(array, declare, lang, style, kernel, query, registry, Menu, MenuItem){

kernel.experimental("dojox.widget.PlaceholderMenuItem");

var PlaceholderMenuItem = declare("dojox.widget.PlaceholderMenuItem", MenuItem, {
	// summary:
	//		A menu item that can be used as a placeholder.  Set the label
	//		of this item to a unique key and you can then use it to add new
	//		items at that location.  This item is not displayed.
	
	_replaced: false,
	_replacedWith: null,
	_isPlaceholder: true,

	postCreate: function(){
		style.set(this.domNode, "display", "none");
		this._replacedWith = [];
		if(!this.label){
			this.label = this.containerNode.innerHTML;
		}
		this.inherited(arguments);
	},
	
	replace: function(/*dijit/MenuItem[]*/ menuItems){
		// summary:
		//		replaces this menu item with the given menuItems.  The original
		//		menu item is not actually removed from the menu - so if you want
		//		it removed, you must do that explicitly.
		// returns:
		//		true if the replace happened, false if not
		if(this._replaced){ return false; }

		var index = this.getIndexInParent();
		if(index < 0){ return false; }

		var p = this.getParent();

		array.forEach(menuItems, function(item){
			p.addChild(item, index++);
		});
		this._replacedWith = menuItems;

		this._replaced = true;
		return true;
	},
	
	unReplace: function(/*Boolean?*/ destroy){
		// summary:
		//		Removes menu items added by calling replace().  It returns the
		//		array of items that were actually removed (in case you want to
		//		clean them up later)
		// destroy:
		//		Also call destroy on any removed items.
		// returns:
		//		The array of items that were actually removed
		
		if(!this._replaced){ return []; }

		var p = this.getParent();
		if(!p){ return []; }

		var r = this._replacedWith;
		array.forEach(this._replacedWith, function(item){
			p.removeChild(item);
			if(destroy){
				item.destroyRecursive();
			}
		});
		this._replacedWith = [];
		this._replaced = false;

		return r; // dijit/MenuItem[]
	}
});

// Se need to extend dijit.Menu so that we have a getPlaceholders function.
lang.extend(Menu, {
	getPlaceholders: function(/*String?*/ label){
		// summary:
		//		Returns an array of placeholders with the given label.  There
		//		can be multiples.
		// label:
		//		Label to search for - if not specified, then all placeholders
		//		are returned
		// returns:
		//		An array of placeholders that match the given label
		var r = [];

		var children = this.getChildren();
		array.forEach(children, function(child){
			if(child._isPlaceholder && (!label || child.label == label)){
				r.push(child);
			}else if(child._started && child.popup && child.popup.getPlaceholders){
				r = r.concat(child.popup.getPlaceholders(label));
			}else if(!child._started && child.dropDownContainer){
				var node = query("[widgetId]", child.dropDownContainer)[0];
				var menu = registry.byNode(node);
				if(menu.getPlaceholders){
					r = r.concat(menu.getPlaceholders(label));
				}
			}
		}, this);
		return r; // dojox/widget/PlaceholderMenuItem[]
	}
});

return PlaceholderMenuItem;

});
