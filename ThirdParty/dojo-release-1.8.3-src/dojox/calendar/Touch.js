define(["dojo/_base/array", "dojo/_base/lang", "dojo/_base/declare", "dojo/dom", "dojo/dom-geometry", "dojo/_base/window", "dojo/on", "dojo/_base/event", "dojo/keys"],

	function(arr, lang, declare, dom, domGeometry, win, on, event, keys){
			
	return declare("dojox.calendar.Touch", null, {
		
		// summary:
		//		This plugin is managing the touch interactions on item renderers displayed by a calendar view.		
				
		// touchStartEditingTimer: Integer
		//		The delay of one touch over the renderer before setting the item in editing mode.		
		touchStartEditingTimer: 500,
		
		// touchEndEditingTimer: Integer
		//		The delay after which the item is leaving the editing mode after the previous editing gesture, in touch context.
		touchEndEditingTimer: 10000,
		
		postMixInProperties: function(){
			
			this.on("rendererCreated", lang.hitch(this, function(ir){
				
				var renderer = ir.renderer;
				
				
				var h;
				if(!renderer.__handles){
					renderer.__handles = [];
				}
											
				h = on(renderer.domNode, "touchstart", lang.hitch(this, function(e){
					this._onRendererTouchStart(e, renderer);
				}));
				
				renderer.__handles.push(h);
			}));
		},
		
		_onRendererTouchStart: function(e, renderer){
			// tags:
			//		private
			var p = this._edProps;	
			
			if(p && p.endEditingTimer){
				clearTimeout(p.endEditingTimer);
				p.endEditingTimer = null;
			}				

			var theItem = renderer.item.item;

			if(p && p.endEditingTimer){
				clearTimeout(p.endEditingTimer);
				p.endEditingTimer = null;
			}

			if(p != null && p.item != theItem){
				// another item is edited.
				// stop previous item
				if(p.startEditingTimer){
					clearTimeout(p.startEditingTimer);
				}

				this._endItemEditing("touch", false);
				p = null;

			}

			// initialize editing properties
			if(!p){
				
				// register event listeners to manage gestures.
				var handles = [];
				
				handles.push(on(win.doc, "touchend", lang.hitch(this, this._docEditingTouchEndHandler)));
				handles.push(on(this.itemContainer, "touchmove", lang.hitch(this, this._docEditingTouchMoveHandler)));						
				
				this._setEditingProperties({
					touchMoved: false,
					item: theItem,
					renderer: renderer,
					rendererKind: renderer.rendererKind,
					event: e,
					handles: handles,
					liveLayout: this.liveLayout
				});

				p = this._edProps;
			}

			if(this._isEditing){
									
				// get info on touches 
				lang.mixin(p, this._getTouchesOnRenderers(e, p.editedItem));
				
				// start an editing gesture.
				this._startTouchItemEditingGesture(e);
				
			} else {
				
				// initial touch that will trigger or not the editing
			
				if(e.touches.length > 1){
					event.stop(e);
					return;
				}
				
				// set the selection state without dispatching (on touch end) after a short amount of time.
				// to allow a bit of time to scroll without selecting (graphically at least) 											
				this._touchSelectionTimer = setTimeout(lang.hitch(this, function(){									
					
					this._saveSelectedItems = this.get("selectedItems");
							
					var changed = this.selectFromEvent(e, this.renderItemToItem(theItem, this.get("store")), renderer, false);
					
					if(changed){					
						this._pendingSelectedItem = theItem;
					}else{
						delete this._saveSelectedItems;
					}
					this._touchSelectionTimer = null;
				}), 200);
				
				p.start = {x: e.touches[0].screenX, y: e.touches[0].screenY};
				
				if(this.isItemEditable(p.item, p.rendererKind)){
									
					// editing gesture timer
					this._edProps.startEditingTimer = setTimeout(lang.hitch(this, function(){											
						
						// we are editing, so the item *must* be selected.
						if(this._touchSelectionTimer){							
							clearTimeout(this._touchSelectionTimer);
							delete this._touchSelectionTime; 
						}
						if(this._pendingSelectedItem){							
							this.dispatchChange(this._saveSelectedItems == null ? null : this._saveSelectedItems[0], this._pendingSelectedItem, null, e);
							delete this._saveSelectedItems;
							delete this._pendingSelectedItem;
						}else{							
							this.selectFromEvent(e, this.renderItemToItem(theItem, this.get("store")), renderer);
						}
																					
						this._startItemEditing(p.item, "touch", e);
						
						p.moveTouchIndex = 0;
						
						// A move gesture is initiated even if we don't move 
						this._startItemEditingGesture([this.getTime(e)], "move", "touch", e);
						
					}), this.touchStartEditingTimer);
				
				}				
			}							
		},
		
		_docEditingTouchMoveHandler: function(e){
			// tags:
			//		private
			var p = this._edProps;
										
			// When the screen is touched, it can dispatch move events if the 
			// user press the finger a little more...
			var touch = {x: e.touches[0].screenX, y: e.touches[0].screenY};														
			if(p.startEditingTimer && 
					(Math.abs(touch.x - p.start.x) > 25 || 
					 Math.abs(touch.y - p.start.y) > 25)) {
					 	
				// scroll use case, do not edit
				clearTimeout(p.startEditingTimer);
				p.startEditingTimer = null;
				
				clearTimeout(this._touchSelectionTimer);
				this._touchSelectionTimer = null;				
				
				if(this._pendingSelectedItem){					
					delete this._pendingSelectedItem;
					this.selectFromEvent(e, null, null, false);
				}			
			}
			
			p.touchMoved = true;
								
			if(this._editingGesture){				
			
				event.stop(e);
				
				if(p.itemBeginDispatched){
					
					var times = [];
					var d = p.editKind == "resizeEnd" ? p.editedItem.endTime : p.editedItem.startTime;
					
					switch(p.editKind){
						case "move":
						  var touchIndex = p.moveTouchIndex == null || p.moveTouchIndex < 0 ? 0 : p.moveTouchIndex;
							times[0] = this.getTime(e, -1, -1, touchIndex);							
							break;
						case "resizeStart":
							times[0] = this.getTime(e, -1, -1, p.resizeStartTouchIndex);							
							break;
						case "resizeEnd":
							times[0] = this.getTime(e, -1, -1, p.resizeEndTouchIndex);							
							break;
						case "resizeBoth":
							times[0] = this.getTime(e, -1, -1, p.resizeStartTouchIndex);
							times[1] = this.getTime(e, -1, -1, p.resizeEndTouchIndex);
							break;							
					}
														
					this._moveOrResizeItemGesture(times, "touch", e);
					
					if(p.editKind == "move"){
						if(this.renderData.dateModule.compare(p.editedItem.startTime, d) == -1){
							this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "start", this.autoScrollTouchMargin);							
						}else{
							this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "end", this.autoScrollTouchMargin);
						}
					}else if(e.editKind == "resizeStart" || e.editKind == "resizeBoth"){
						this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "start", this.autoScrollTouchMargin);	
					}else{
						this.ensureVisibility(p.editedItem.startTime, p.editedItem.endTime, "end", this.autoScrollTouchMargin);
					}
																		
				}			
			} // else scroll, if any, is delegated to sub class							
						
		},
		
		// autoScrollTouchMargin: Integer
		//		The minimum number of minutes of margin around the edited event. 
		autoScrollTouchMargin: 10,
		
		_docEditingTouchEndHandler: function(e){
			// tags:
			//		private
			event.stop(e);
			
			var p = this._edProps;
			
			if(p.startEditingTimer){
				clearTimeout(p.startEditingTimer);
				p.startEditingTimer = null;
			}
								
			if(this._isEditing){
				
				lang.mixin(p, this._getTouchesOnRenderers(e, p.editedItem));
				
				if(this._editingGesture){
				
					if(p.touchesLen == 0){
						
						// all touches were removed => end of editing gesture
						this._endItemEditingGesture("touch", e);
						
						if(this.touchEndEditingTimer > 0){
						
							// Timer that trigger the end of the item editing mode.
							p.endEditingTimer = setTimeout(lang.hitch(this, function(){															
																	
								this._endItemEditing("touch", false);															
								
							}), this.touchEndEditingTimer);
						} // else validation must be explicit
						
					}else{
												
						if(this._editingGesture){
							this._endItemEditingGesture("touch", e);
						}
						// there touches of interest on item, process them.
						this._startTouchItemEditingGesture(e);						
					}
				}
				
			}else if(!p.touchMoved){
												
				event.stop(e);
					
				arr.forEach(p.handles, function(handle){
					handle.remove();
				});
								
				if(this._touchSelectionTimer){					
					// selection timer was not reached to a proper selection.
					clearTimeout(this._touchSelectionTimer);
					this.selectFromEvent(e, this.renderItemToItem(p.item, this.get("store")), p.renderer, true);
					
				}else if(this._pendingSelectedItem){
					// selection timer was reached, dispatch change event
					this.dispatchChange(this._saveSelectedItems.length == 0 ? null : this._saveSelectedItems[0], 
						this._pendingSelectedItem, null, e); // todo renderer ?
					delete this._saveSelectedItems;
					delete this._pendingSelectedItem;					
				}
								
				if(this._pendingDoubleTap && this._pendingDoubleTap.item == p.item){							
					this._onItemDoubleClick({
						triggerEvent: e,
						renderer: p.renderer,
						item: this.renderItemToItem(p.item, this.get("store"))
					});
					
					clearTimeout(this._pendingDoubleTap.timer);
					
					delete this._pendingDoubleTap;					
					
				}else{
					
					this._pendingDoubleTap = {
						item: p.item,
						timer: setTimeout(lang.hitch(this, function(){
								delete this._pendingDoubleTap;								
							}), this.doubleTapDelay)
					};
																						
					this._onItemClick({
						triggerEvent: e,
						renderer: p.renderer,
						item: this.renderItemToItem(p.item, this.get("store"))
					});
				}
								
				this._edProps = null;
							
			}else{
				// scroll view has finished.									
				
				if(this._saveSelectedItems){									
											
					// selection without dipatching was done, but the view scrolled, 
					// so revert last selection
				  this.set("selectedItems", this._saveSelectedItems);					
					delete this._saveSelectedItems;
					delete this._pendingSelectedItem;
				}								
							
				arr.forEach(p.handles, function(handle){
					handle.remove();
				});
							
				this._edProps = null;				
			}
		},
		
		_startTouchItemEditingGesture: function(e){
			// summary:
			//		Determines if a editing gesture is starting according to touches.  
			// tags:
			//		private

			var p = this._edProps;

			var fromResizeStart = p.resizeStartTouchIndex != -1;
			var fromResizeEnd = p.resizeEndTouchIndex != -1;

			if(fromResizeStart && fromResizeEnd || // initial gesture using two touches 
					this._editingGesture && p.touchesLen == 2 && 
					(fromResizeEnd && p.editKind == "resizeStart" || 
					 fromResizeStart && p.editKind =="resizeEnd")){ // gesture one after the other touch

				if(this._editingGesture && p.editKind != "resizeBoth"){ // stop ongoing gesture
					this._endItemEditingGesture("touch", e);
				}

				p.editKind = "resizeBoth";

				this._startItemEditingGesture([this.getTime(e, -1, -1, p.resizeStartTouchIndex), 
					this.getTime(e, -1, -1, p.resizeEndTouchIndex)], 
					p.editKind, "touch", e);

				return;

			}else if(fromResizeStart && p.touchesLen == 1 && !this._editingGesture){

				this._startItemEditingGesture([this.getTime(e, -1, -1, p.resizeStartTouchIndex)], 
					"resizeStart", "touch", e);

				return;

			}else if(fromResizeEnd && p.touchesLen == 1 && !this._editingGesture){

				this._startItemEditingGesture([this.getTime(e, -1, -1, p.resizeEndTouchIndex)], 
					"resizeEnd", "touch", e);

				return;

			} else {
				// A move gesture is initiated even if we don't move 
				this._startItemEditingGesture([this.getTime(e)], "move", "touch", e);
			}					
		},
		
		_getTouchesOnRenderers: function(e, item){
			// summary:
			//		Returns the touch indices that are on a editing handles or body of the renderers 
			// tags:
			//		private
			// item: Object
			//		The render item.
			// e: Event
			//		The touch event.
			// tags:
			//		private
			
			var irs = this._getStartEndRenderers(item);
										
			var resizeStartTouchIndex = -1;			
			var resizeEndTouchIndex = -1;			
			var moveTouchIndex = -1;
			var hasResizeStart = irs[0] != null && irs[0].resizeStartHandle != null;
			var hasResizeEnd = irs[1] != null && irs[1].resizeEndHandle != null;
			var len = 0;
			var touched = false;			
			var list = this.itemToRenderer[item.id];
														
			for(var i=0; i<e.touches.length; i++){
				
				if(resizeStartTouchIndex == -1 && hasResizeStart){
					touched = dom.isDescendant(e.touches[i].target, irs[0].resizeStartHandle);
					if(touched){
						resizeStartTouchIndex = i;
						len++;
					}
				}
				
				if(resizeEndTouchIndex == -1 && hasResizeEnd){
					touched = dom.isDescendant(e.touches[i].target, irs[1].resizeEndHandle);
					if(touched){
						resizeEndTouchIndex = i;
						len++;
					}
				}

				if(resizeStartTouchIndex == -1 && resizeEndTouchIndex == -1){ 

					for (var j=0; j<list.length; j++){
					  touched = dom.isDescendant(e.touches[i].target, list[j].container);
						if(touched){
							moveTouchIndex = i;
							len++;
							break;
						}
					}
				}

				if(resizeStartTouchIndex != -1 && resizeEndTouchIndex != -1 && moveTouchIndex != -1){
					// all touches of interest were found, ignore other ones.
				  break;	
				}
			}

			return {
				touchesLen: len,
				resizeStartTouchIndex: resizeStartTouchIndex,
				resizeEndTouchIndex: resizeEndTouchIndex,
				moveTouchIndex: moveTouchIndex
			};
		}

	});

});
