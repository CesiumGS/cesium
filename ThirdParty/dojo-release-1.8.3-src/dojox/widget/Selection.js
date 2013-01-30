define(["dojo/_base/declare", "dojo/_base/array", "dojo/_base/lang", "dojo/Stateful"], 
	function(declare, arr, lang, Stateful){
		
	return declare("dojox.widget.Selection", Stateful, {
		// summary:
		//		Base class for widgets that manage a list of selected data items.

		constructor: function(){
			this.selectedItems = [];
		},
		
		// selectionMode: String
		//		Valid values are:
		//
		//		1. "none": No selection can be done.
		//		2. "single": Only one item can be selected at a time.
		//		3. "multiple": Several item can be selected using the control key modifier.
		//		Default value is "single".
		selectionMode: "single",
		
		_setSelectionModeAttr: function(value){
			if(value != "none" && value != "single" && value != "multiple"){
				value = "single"; //default value
			}			
			if(value != this.selectionMode){
				this.selectionMode = value;
				if(value == "none"){
					this.set("selectedItems", null);
				}else if(value == "single"){
					this.set("selectedItem", this.selectedItem); // null or last selected item 
				}
			}
		},
		
		// selectedItem: Object
		//		In single selection mode, the selected item or in multiple selection mode the last selected item.
		//		Warning: Do not use this property directly, make sure to call set() or get() methods.
		selectedItem: null,
		
		_setSelectedItemAttr: function(value){
			if(this.selectedItem != value){
				this._set("selectedItem", value);
				this.set("selectedItems", value ? [value] : null);
			}
		},
		
		// selectedItems: Object[]
		//		The list of selected items.
		//		Warning: Do not use this property directly, make sure to call set() or get() methods.
		selectedItems: null,
		
		_setSelectedItemsAttr: function(value){
			var oldSelectedItems = this.selectedItems;
			
			this.selectedItems = value;
			this.selectedItem = null;
			
			if(oldSelectedItems != null && oldSelectedItems.length>0){
				this.updateRenderers(oldSelectedItems, true);
			}
			if(this.selectedItems && this.selectedItems.length>0){
				this.selectedItem = this.selectedItems[0];
				this.updateRenderers(this.selectedItems, true);
			}
		},
		
		_getSelectedItemsAttr: function(){
			return this.selectedItems == null ? [] : this.selectedItems.concat();
		},
		
		isItemSelected: function(item){
			// summary:
			//		Returns wether an item is selected or not.
			// item: Object
			//		The item to test the selection for.			
			if(this.selectedItems == null || this.selectedItems.length== 0){
				return false;
			}
			 
			return arr.some(this.selectedItems, lang.hitch(this, function(sitem){
				return this.getIdentity(sitem) == this.getIdentity(item);
			}));
		},
		
		getIdentity: function(item){
			// summary:
			//		This function must be implemented to return the id of a item.
			// item: Object
			//		The item to query the identity for.
		},
		
		setItemSelected: function(item, value){
			// summary:
			//		Change the selection state of an item.
			// item: Object
			//		The item to change the selection state for.
			// value: Boolean
			//		True to select the item, false to deselect it. 
			
			if(this.selectionMode == "none" || item == null){
				return;
			}

			// copy is returned
			var sel = this.get("selectedItems");
			var old = this.get("selectedItems");
			
			if(this.selectionMode == "single"){
				if(value){
					this.set("selectedItem", item);
				}else if(this.isItemSelected(item)){
					this.set("selectedItems", null);
				}
			}else{ // multiple
				if(value){
					if(this.isItemSelected(item)){
						return; // already selected
					}
					if(sel == null){
						sel = [item];
					}else{
						sel.unshift(item);
					}
					this.set("selectedItems", sel);
				}else{
					var res = arr.filter(sel, function(sitem){
						return sitem.id != item.id; 
					});
					if(res == null || res.length == sel.length){
						return; // already not selected
					}
					this.set("selectedItems", res);
				}
			}
		},
		
		selectFromEvent: function(e, item, renderer, dispatch){
			// summary:
			//		Applies selection triggered by an user interaction
			// e: Event
			//		The source event of the user interaction.
			// item: Object
			//		The render item that has been selected/deselected.
			// renderer: Object
			//		The visual renderer of the selected/deselected item.			
			// dispatch: Boolean
			//		Whether an event must be dispatched or not.
			// returns: Boolean
			//		Returns true if the selection has changed and false otherwise.
			// tags:
			//		protected
			
			if(this.selectionMode == "none"){
				return false;
			}
			
			var changed;
			var oldSelectedItem = this.get("selectedItem");
			var selected = item ? this.isItemSelected(item): false;
			
			if(item == null){
				if(!e.ctrlKey && this.selectedItem != null){
					this.set("selectedItem", null);
					changed = true;
				}
			}else if(this.selectionMode == "multiple"){
				 if(e.ctrlKey){
					this.setItemSelected(item, !selected);
					changed = true;
				}else{
					this.set("selectedItem", item);					
					changed = true;						
				}				 								
			}else{ // single
				if(e.ctrlKey){					
					//if the object is selected deselects it.
					this.set("selectedItem", selected ? null : item);
					changed = true;					
				}else{
					if(!selected){							
						this.set("selectedItem", item);
						changed = true;
					}
				}
			}						
			
			if(dispatch && changed){
				this.dispatchChange(oldSelectedItem, this.get("selectedItem"), renderer, e);
			}
			
			return changed;
		},
		
		dispatchChange: function(oldSelectedItem, newSelectedItem, renderer, triggerEvent){
			// summary:
			//		Dispatch a selection change event.
			// oldSelectedItem: Object
			//		The previously selectedItem.
			// newSelectedItem: Object
			//		The new selectedItem.
			// renderer: Object
			//		The visual renderer of the selected/deselected item.
			// triggerEvent: Event
			//		The event that lead to the selection of the item. 			
			this.onChange({
				oldValue: oldSelectedItem,
				newValue: newSelectedItem,
				renderer: renderer,
				triggerEvent: triggerEvent
			});
		},
		
		onChange: function(){
			// summary:
			//		Called when the selection changed.
			// tags:
			//		callback			
		}
	});
});
