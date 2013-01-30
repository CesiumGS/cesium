define([
	"dojo/_base/array", 
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/window", 
	"dojo/dom-geometry",
	"dojo/mouse",
	"dojo/on", 	
	"dojo/keys"],
	
function(
	arr, 	
	declare,
	event,
	lang, 	
	win, 
	domGeometry,
	mouse,
	on, 	
	keys){
	
	/*=====
	var __ItemMouseEventArgs = {
		// summary:
		//		The event dispatched when an item is clicked, double-clicked or context-clicked.
		// item: Object
		//		The item clicked.
		// renderer: dojox/calendar/_RendererMixin
		//		The item renderer clicked.
		// triggerEvent: Event
		//		The event at the origin of this event.
	};
	=====*/
			
	return declare("dojox.calendar.Mouse", null, {

		// summary:
		//		This plugin is managing the mouse interactions on item renderers displayed by a calendar view.		
				
		// triggerExtent: Number
		//		The distance in pixels along the vertical or horizontal axis to cover with the 
		//		mouse button down before triggering the editing gesture.
		triggerExtent: 3,
					
		postMixInProperties: function(){
			this.inherited(arguments);
			
			this.on("rendererCreated", lang.hitch(this, function(ir){
				
				var renderer = ir.renderer;
				
				var h;
				if(!renderer.__handles){
					renderer.__handles = [];
				}
															
				h = on(renderer.domNode, "click", lang.hitch(this, function(e){
					event.stop(e);
					this._onItemClick({
						triggerEvent: e,
						renderer: renderer,
						item: this.renderItemToItem(renderer.item, this.get("store"))
					});
				}));
				renderer.__handles.push(h);
				
				h = on(renderer.domNode, "dblclick", lang.hitch(this, function(e){
					event.stop(e);
					this._onItemDoubleClick({
						triggerEvent: e,
						renderer: renderer,
						item: this.renderItemToItem(renderer.item, this.get("store"))
					});
				}));
				renderer.__handles.push(h);
				
				h = on(renderer.domNode, "contextmenu", lang.hitch(this, function(e){
					this._onItemContextMenu({
						triggerEvent: e,
						renderer: renderer,
						item: this.renderItemToItem(renderer.item, this.get("store"))
					});
				}));
				renderer.__handles.push(h);
				
				if(renderer.resizeStartHandle){
					h = on(renderer.resizeStartHandle, "mousedown", lang.hitch(this, function(e){
						this._onRendererHandleMouseDown(e, renderer, "resizeStart");
					}));
					renderer.__handles.push(h);
				}
				
				if(renderer.moveHandle){
					h = on(renderer.moveHandle, "mousedown", lang.hitch(this, function(e){
						this._onRendererHandleMouseDown(e, renderer, "move");
					}));
					renderer.__handles.push(h);
				}
				
				if(renderer.resizeEndHandle){
					h = on(renderer.resizeEndHandle, "mousedown", lang.hitch(this, function(e){
						this._onRendererHandleMouseDown(e, renderer, "resizeEnd");
					}));
					renderer.__handles.push(h);
				}				
				
				h = on(renderer.domNode, "mousedown", lang.hitch(this, function(e){
					this._rendererMouseDownHandler(e, renderer);
				}));
				renderer.__handles.push(h);
				
				h = on(ir.container, mouse.enter, lang.hitch(this, function(e){
					if(!renderer.item) return;
					
					if(!this._editingGesture){
						this._setHoveredItem(renderer.item.item, ir.renderer);
						this._onItemRollOver(this.__fixEvt({
							item: this.renderItemToItem(renderer.item, this.get("store")),
							renderer: renderer,
							triggerEvent: e
						}));
					}					
				}));
				renderer.__handles.push(h);
				
				h = on(renderer.domNode, mouse.leave, lang.hitch(this, function(e){
					if(!renderer.item) return;
					if(!this._editingGesture){						
						this._setHoveredItem(null);
						
						this._onItemRollOut(this.__fixEvt({
							item: this.renderItemToItem(renderer.item, this.get("store")),
							renderer: renderer,
							triggerEvent: e
						}));
					}
				}));
				
				renderer.__handles.push(h);
				
			}));			
		},
		
		_onItemRollOver: function(e){
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onItemRollOver");
		},
		
		onItemRollOver: function(e){
			// summary:
			//		Event dispatched when the mouse cursor in going over an item renderer.
			// e: __ItemMouseEventArgs
			//		The event dispatched when the mouse cursor enters in the item renderer.
			// tags:
			//		callback

		},
		
		_onItemRollOut: function(e){
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onItemRollOut");
		},
		
		onItemRollOut: function(e){
			// summary:
			//		Event dispatched when the mouse cursor in leaving an item renderer.
			// e: __ItemMouseEventArgs
			//		The event dispatched when the mouse cursor enters in the item renderer.
			// tags:
			//		protected

		},
		
		_rendererMouseDownHandler: function(e, renderer){
			
			// summary:
			//		Callback if the user clicked on the item renderer but not on a handle.
			//		Manages item selection.
			// tags:
			//		private

			event.stop(e);				
			
			var item = this.renderItemToItem(renderer.item, this.get("store"));
			
			this.selectFromEvent(e, item, renderer, true);
			
			if(this._setTabIndexAttr){
				this[this._setTabIndexAttr].focus();
			}
		},
		
		_onRendererHandleMouseDown: function(e, renderer, editKind){
			// summary:
			//		Callback if the user clicked on a handle of an item renderer.
			//		Manages item selection and editing gesture. If editing is not allowed, 
			//		resize handles are not displayed and so this callback will never be called.
			//		In that case selected is managed by the _rendererMouseDownHandler function.
			// tags:
			//		private

			
			event.stop(e);				
			
			this.showFocus = false;
			
			// save item here as calling endItemEditing may call a relayout and changes the item.
			var ritem = renderer.item;
			var item = ritem.item;
			
			if(!this.isItemBeingEdited(item)){
						
				if(this._isEditing){								
					this._endItemEditing("mouse", false);								
				}
				
				this.selectFromEvent(e, this.renderItemToItem(renderer.item, this.get("store")), renderer, true);
				
				if(this._setTabIndexAttr){
					this[this._setTabIndexAttr].focus();
				}
				
				this._edProps = {
					editKind: editKind,
					editedItem: item,
					rendererKind: renderer.rendererKind,
					tempEditedItem: item,					
					liveLayout: this.liveLayout				
				};
							
				this.set("focusedItem", this._edProps.editedItem);	
			}
																						
			var handles = [];
			handles.push(on(win.doc, "mouseup", lang.hitch(this, this._editingMouseUpHandler)));
			handles.push(on(win.doc, "mousemove", lang.hitch(this, this._editingMouseMoveHandler)));
			
			var p = this._edProps;
			p.handles = handles;
			p.eventSource = "mouse";
			p.editKind = editKind;
			
			this._startPoint = {x: e.screenX, y: e.screenY};												
		},
		
		_editingMouseMoveHandler: function(e){
			// tags:
			//		private

			var p = this._edProps;
					
			if(this._editingGesture){
				
				if(!this._autoScroll(e.pageX, e.pageY, true)){
					this._moveOrResizeItemGesture([this.getTime(e)], "mouse", e);	
				}
											
			}else if(Math.abs(this._startPoint.x - e.screenX) >= this.triggerExtent || // moved enough to trigger editing
							 Math.abs(this._startPoint.y - e.screenY) >= this.triggerExtent){
							 	
				if(!this._isEditing){
					this._startItemEditing(p.editedItem, "mouse");	
				}
				
				p = this._edProps;
								
				this._startItemEditingGesture([this.getTime(e)], p.editKind, "mouse", e);
			}
		},		
		
		_editingMouseUpHandler: function(e){
			// tags:
			//		private
			
			var p = this._edProps;
			
			this._stopAutoScroll();
									
			if(this._isEditing){			
				
				if(this._editingGesture){ // a gesture is ongoing.					
					this._endItemEditingGesture("mouse", e);					
				}
				
				this._endItemEditing("mouse", false);
								
			}else{ // handlers were not removed by endItemEditing
				arr.forEach(p.handles, function(handle){
					handle.remove();
				});
			}
		},
		
		_autoScroll: function(globalX, globalY, isVertical){
			
			if (!this.scrollable || !this.autoScroll) {
				return false;
			}
								
			var scrollerPos = domGeometry.position(this.scrollContainer, true);
			
			var p = isVertical ? globalY - scrollerPos.y : globalX - scrollerPos.x;
			var max = isVertical ? scrollerPos.h : scrollerPos.w;
			
			if (p < 0 || p > max) {
				
				step = Math.floor((p < 0	? p : p - max)/2)/3;
				
				this._startAutoScroll(step);
						
				return true;
				
			} else {
				
				this._stopAutoScroll();				
			}
			return false;
		}							
	});

});
