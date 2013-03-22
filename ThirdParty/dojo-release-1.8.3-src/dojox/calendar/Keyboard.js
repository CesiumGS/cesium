define(["dojo/_base/array", "dojo/_base/lang", "dojo/_base/declare", "dojo/on", "dojo/_base/event", "dojo/keys"],
	function(arr, lang, declare, on, event, keys){
	
	return declare("dojox.calendar.Keyboard", null, {

		// summary:
		//		This mixin is managing the keyboard interactions on a calendar view.
		
		// keyboardUpDownUnit: String
		//		Unit used during editing of an event using the keyboard and the up or down keys were pressed. Valid values are "week", "day", "hours" "minute".
		keyboardUpDownUnit: "minute",
		
		// keyboardUpDownSteps: Integer
		//		Steps used during editing of an event using the keyboard and the up or down keys were pressed.		
		keyboardUpDownSteps: 15,		
		
		// keyboardLeftRightUnit: String
		//		Unit used during editing of an event using the keyboard and the left or right keys were pressed. Valid values are "week", "day", "hours" "minute".
		keyboardLeftRightUnit: "day",
		
		// keyboardLeftRightSteps: Integer
		//		Unit used during editing of an event using the keyboard and the left or right keys were pressed.		
		keyboardLeftRightSteps: 1,

		// allDayKeyboardUpDownSteps: Integer
		//		Steps used during editing of an all day event using the keyboard and the up or down keys were pressed.
		allDayKeyboardUpDownUnit: "day",
		
		// allDayKeyboardUpDownUnit: String
		//		Unit used during editing of an all day event using the keyboard and the up or down keys were pressed. Valid values are "week", "day", "hours" "minute".		
		allDayKeyboardUpDownSteps: 7,
		
		// allDayKeyboardUpDownSteps: Integer
		//		Steps used during editing of an all day event using the keyboard and the up or down keys were pressed.
		allDayKeyboardLeftRightUnit: "day",
		
		// allDayKeyboardLeftRightUnit: String
		//		Unit used during editing of an all day event using the keyboard and the left or right keys were pressed. Valid values are "week", "day", "hours" "minute".
		allDayKeyboardLeftRightSteps: 1,

		postCreate: function(){
			this.inherited(arguments);
			this._viewHandles.push(on(this.domNode, "keydown", lang.hitch(this, this._onKeyDown)));
		},
		
		// resizeModfier: "ctrl"
		//		The modifier used to determine if the item is resized instead moved during the editing on an item.
		resizeModifier: "ctrl",

		// maxScrollAnimationDuration: Number
		//		The duration in milliseconds to scroll the entire view. 
		//		The scroll speed is constant when scrolling to show an item renderer. 
		maxScrollAnimationDuration: 1000,
		
		///////////////////////////////////////////////////////////////
		//
		// Focus management
		//
		//////////////////////////////////////////////////////////////
		
		// tabIndex: String
		//		Order fields are traversed when user hits the tab key
		tabIndex: "0",
		
		// focusedItem: Object
		//		The data item that currently has the focus.
		focusedItem: null,
		
		_isItemFocused: function(item){
			return this.focusedItem != null && this.focusedItem.id == item.id;
		},

		_setFocusedItemAttr: function(value){
			if(value != this.focusedItem){
				var old = this.focusedItem;
				this._set("focusedItem", value);
				this.updateRenderers([old, this.focusedItem], true);
				this.onFocusChange({
					oldValue: old,
					newValue: value
				});
			}
			if(value != null){
				if(this.owner != null && this.owner.get("focusedItem") != null){
					this.owner.set("focusedItem", null);
				}
				if(this._secondarySheet != null && this._secondarySheet.set("focusedItem") != null){
					this._secondarySheet.set("focusedItem", null);
				}
			}			
		},
		
		onFocusChange: function(e){
			// summary:
			//		Event dispatched when the focus has changed.
			// tags:
			//		callback

		},

		// showFocus: Boolean
		//		Show or hide the focus graphic feedback on item renderers.
		showFocus: false,		
		
		_focusNextItem: function(dir){			
			// summary:
			//		Moves the focus to the next item in the specified direction.
			//		If there is no current child focused, the first (dir == 1) or last (dir == -1) is focused.
			// dir: Integer
			//		The direction of the next child to focus.
			//
			//		- 1: Move focus to the next item in the list.
			//		- -1: Move focus to the previous item in the list.
			
			if(!this.renderData || !this.renderData.items || this.renderData.items.length == 0){
				return null;
			}
			
			var index = -1;
			var list = this.renderData.items;
			var max = list.length - 1;
			var focusedItem = this.get("focusedItem");
			
			// find current index.
			if(focusedItem == null){
				index = dir > 0 ? 0 : max;
			}else{
				arr.some(list, lang.hitch(this, function(item, i){
					var found = item.id == focusedItem.id;
					if(found){
						index = i;
					}
					return found;
				}));
				index = this._focusNextItemImpl(dir, index, max);
			}
			
			// find the first item with renderers.
			var reachedOnce = false;
			var old = -1;
			
			while(old != index && (!reachedOnce || index != 0)){
				
				if(!reachedOnce && index == 0){
					reachedOnce = true;
				}
				
				var item = list[index];
				
				if(this.itemToRenderer[item.id] != null){
					// found item
					this.set("focusedItem", item);
					return;
				}
				old = index;				
				index = this._focusNextItemImpl(dir, index, max);
				
			}						
		},
		
		_focusNextItemImpl: function(dir, index, max){
			// tags:
			//		private

			if(index == -1){ // not found should not occur
				index = dir > 0 ? 0 : max;
			}else{				
				if(index == 0 && dir == -1 || index == max && dir == 1){
					return index;
				}				
				index = dir > 0 ? ++index : --index;					
			}			
			return index; 	
		},
		
		///////////////////////////////////////////////////////////
		//
		// Keyboard
		//
		//////////////////////////////////////////////////////////

		_handlePrevNextKeyCode: function(e, dir){
			// tags:
			//		private

			if(!this.isLeftToRight()){
				dir = dir == 1 ? -1 : 1;
			}
			this.showFocus = true;
			this._focusNextItem(dir);
			
			var focusedItem = this.get("focusedItem");
			
			if(!e.ctrlKey && focusedItem){
				this.set("selectedItem", focusedItem);
			}

			if(focusedItem){
				this.ensureVisibility(focusedItem.startTime, focusedItem.endTime, "both", undefined, this.maxScrollAnimationDuration);
			}
		},

		_keyboardItemEditing: function(e, dir){
			// tags:
			//		private

			event.stop(e);

			var p = this._edProps;

			var unit, steps; 

			if(p.editedItem.allDay || this.roundToDay || p.rendererKind == "label"){
				unit = dir == "up" || dir == "down" ? this.allDayKeyboardUpDownUnit : this.allDayKeyboardLeftRightUnit; 
				steps = dir == "up" || dir == "down" ? this.allDayKeyboardUpDownSteps : this.allDayKeyboardLeftRightSteps;
			}else{
				unit = dir == "up" || dir == "down" ? this.keyboardUpDownUnit : this.keyboardLeftRightUnit; 
				steps = dir == "up" || dir == "down" ? this.keyboardUpDownSteps : this.keyboardLeftRightSteps;
			}			
						
			if(dir == "up" || !this.isLeftToRight() && dir == "right" || 
				 this.isLeftToRight() && dir == "left"){
				steps = -steps;
			}
						
			var editKind = e[this.resizeModifier+"Key"] ? "resizeEnd" : "move";
			
			var d = editKind == "resizeEnd" ? p.editedItem.endTime : p.editedItem.startTime;
			
			var newTime = this.renderData.dateModule.add(d, unit, steps);
			
			this._startItemEditingGesture([d], editKind, "keyboard", e);
			this._moveOrResizeItemGesture([newTime], "keyboard", e);
			this._endItemEditingGesture(editKind, "keyboard", e, false);
			
			if(editKind == "move"){
				if(this.renderData.dateModule.compare(newTime, d) == -1){
					this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "start");
				}else{
					this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "end");
				}				
			}else{ // resize end only
				this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "end");	
			}						
		},
						
		_onKeyDown: function(e){
			// tags:
			//		private

			var focusedItem = this.get("focusedItem");
			
			switch(e.keyCode){

				case keys.ESCAPE:

					if(this._isEditing){
						
						if(this._editingGesture){
							this._endItemEditingGesture("keyboard", e, true);
						}
						
						this._endItemEditing("keyboard", true);

						this._edProps = null;
					}
					break;

				case keys.SPACE:

					event.stop(e); // prevent browser shortcut

					if(focusedItem != null){
						this.setItemSelected(focusedItem, e.ctrlKey ? !this.isItemSelected(focusedItem) : true);
					}
					break;

				case keys.ENTER:

					event.stop(e); // prevent browser shortcut

					if(focusedItem != null){

						if(this._isEditing){
							this._endItemEditing("keyboard", false);
						}else{
							
							var renderers = this.itemToRenderer[focusedItem.id];
								
							if(renderers && renderers.length > 0 && this.isItemEditable(focusedItem, renderers[0].kind)){

								this._edProps = {
									renderer: renderers[0],
									rendererKind: renderers[0].kind,
									tempEditedItem: focusedItem,
									liveLayout: this.liveLayout
								};

								this.set("selectedItem", focusedItem);

								this._startItemEditing(focusedItem, "keyboard");
							}
						}
					}
					break;

				case keys.LEFT_ARROW:
				
					event.stop(e); // prevent browser shortcut
					
					if(this._isEditing){
						this._keyboardItemEditing(e, "left");
					}else{
						this._handlePrevNextKeyCode(e, -1);
					}				
					break;
					
				case keys.RIGHT_ARROW:
				
					event.stop(e); // prevent browser shortcut
					
					if(this._isEditing){
						this._keyboardItemEditing(e, "right");
					}else{
						this._handlePrevNextKeyCode(e, 1);
					}
					break;
				
				case keys.UP_ARROW:
					if(this._isEditing){
						this._keyboardItemEditing(e, "up");
					}else if(this.scrollable){
						this.scrollView(-1);
					}
					break;
					
				case keys.DOWN_ARROW:
					if(this._isEditing){
						this._keyboardItemEditing(e, "down");
					}else if(this.scrollable){
						this.scrollView(1);
					}
					break;
					
			}
			
		}
	});
});
