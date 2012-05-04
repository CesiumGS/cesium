dojo.provide("dojox.drawing.manager.Stencil");

(function(){
	var surface, surfaceNode;
	dojox.drawing.manager.Stencil = dojox.drawing.util.oo.declare(
		// summary:
		//		The main class for tracking Stencils that are cretaed, added,
		//		selected, or deleted. Also handles selections, multiple
		//		selections, adding and removing from selections, and dragging
		//		selections. It's this class that triggers the anchors to
		//		appear on a Stencil and whther there are anchor on a multiple
		//		select or not (currently not)
		//
		function(options){
			//
			// TODO: mixin props
			//
			surface = options.surface;
			this.canvas = options.canvas;
			
			this.defaults = dojox.drawing.defaults.copy();
			this.undo = options.undo;
			this.mouse = options.mouse;
			this.keys = options.keys;
			this.anchors = options.anchors;
			this.stencils = {};
			this.selectedStencils = {};
			this._mouseHandle = this.mouse.register(this);
			
			dojo.connect(this.keys, "onArrow", this, "onArrow");
			dojo.connect(this.keys, "onEsc", this, "deselect");
			dojo.connect(this.keys, "onDelete", this, "onDelete");
			
		},
		{
			_dragBegun: false,
			_wasDragged:false,
			_secondClick:false,
			_isBusy:false,
			
			setRecentStencil: function(stencil){
				// summary:
				//		Keeps track of the most recent stencil interacted
				//		with, whether created or selected.
				this.recent = stencil;
			},
			
			getRecentStencil: function(){
				// summary:
				//		Returns the stencil most recently interacted
				//		with whether it's last created or last selected
				return this.recent;
			},
			
			register: function(/*Object*/stencil){
				// summary:
				//		Key method for adding Stencils. Stencils
				//		can be added to the canvas without adding
				//		them to this, but they won't have selection
				//		or drag ability.
				//
				console.log("Selection.register ::::::", stencil.id);
				if(stencil.isText && !stencil.editMode && stencil.deleteEmptyCreate && !stencil.getText()){
					// created empty text field
					// defaults say to delete
					console.warn("EMPTY CREATE DELETE", stencil);
					stencil.destroy();
					return false;
				}
				
				this.stencils[stencil.id] = stencil;
				this.setRecentStencil(stencil);
				
				if(stencil.execText){
					if(stencil._text && !stencil.editMode){
						console.log("select text");
						this.selectItem(stencil);
					}
					stencil.connect("execText", this, function(){
						if(stencil.isText && stencil.deleteEmptyModify && !stencil.getText()){
							console.warn("EMPTY MOD DELETE", stencil);
							// text deleted
							// defaults say to delete
							this.deleteItem(stencil);
						}else if(stencil.selectOnExec){
							this.selectItem(stencil);
						}
					});
				}
				
				stencil.connect("deselect", this, function(){
					if(!this._isBusy && this.isSelected(stencil)){
						// called from within stencil. do action.
						this.deselectItem(stencil);
					}
				});
				
				stencil.connect("select", this, function(){
					if(!this._isBusy && !this.isSelected(stencil)){
						// called from within stencil. do action.
						this.selectItem(stencil);
					}
				});
				
				return stencil;
			},
			unregister: function(/*Object*/stencil){
				// summary:
				//		Method for removing Stencils from the manager.
				//		This doesn't delete them, only removes them from
				// 		the list.
				//
				console.log("Selection.unregister ::::::", stencil.id, "sel:", stencil.selected);
				if(stencil){
					stencil.selected && this.onDeselect(stencil);
					delete this.stencils[stencil.id];
				}
			},
			
			onArrow: function(/*Key Event*/evt){
				// summary:
				// 		Moves selection based on keyboard arrow keys
				//
				// FIXME: Check constraints
				if(this.hasSelected()){
					this.saveThrottledState();
					this.group.applyTransform({dx:evt.x, dy: evt.y});
				}
			},
			
			_throttleVrl:null,
			_throttle: false,
			throttleTime:400,
			_lastmxx:-1,
			_lastmxy:-1,
			saveMoveState: function(){
				// summary:
				//		Internal. Used for the prototype undo stack.
				// 		Saves selection position.
				//
				var mx = this.group.getTransform();
				if(mx.dx == this._lastmxx && mx.dy == this._lastmxy){ return; }
				this._lastmxx = mx.dx;
				this._lastmxy = mx.dy;
				//console.warn("SAVE MOVE!", mx.dx, mx.dy);
				this.undo.add({
					before:dojo.hitch(this.group, "setTransform", mx)
				});
			},
			
			saveThrottledState: function(){
				// summary:
				//		Internal. Used for the prototype undo stack.
				//		Prevents an undo point on every mouse move.
				//		Only does a point when the mouse hesitates.
				//
				clearTimeout(this._throttleVrl);
				clearInterval(this._throttleVrl);
				this._throttleVrl = setTimeout(dojo.hitch(this, function(){
					this._throttle = false;
					this.saveMoveState();
				}), this.throttleTime);
				if(this._throttle){ return; }
				this._throttle = true;
				
				this.saveMoveState();
				
			},
			unDelete: function(/*Array*/stencils){
				// summary:
				//		Undeletes a stencil. Used in undo stack.
				//
				console.log("unDelete:", stencils);
				for(var s in stencils){
					stencils[s].render();
					this.onSelect(stencils[s]);
				}
			},
			onDelete: function(/*Boolean*/noundo){
				// summary:
				//		Event fired on deletion of a stencil
				//
				console.log("Stencil onDelete", noundo);
				if(noundo!==true){
					this.undo.add({
						before:dojo.hitch(this, "unDelete", this.selectedStencils),
						after:dojo.hitch(this, "onDelete", true)
					});
				}
				this.withSelected(function(m){
					this.anchors.remove(m);
					var id = m.id;
					console.log("delete:", m);
					m.destroy();
					delete this.stencils[id];
				});
				this.selectedStencils = {};
			},
			
			deleteItem: function(/*Object*/stencil){
				// summary:
				//		Deletes a stencil.
				//		NOTE: supports limited undo.
				//
				// manipulating the selection to fire onDelete properly
				if(this.hasSelected()){
					// there is a selection
					var sids = [];
					for(var m in this.selectedStencils){
						if(this.selectedStencils.id == stencil.id){
							if(this.hasSelected()==1){
								// the deleting stencil is the only one selected
								this.onDelete();
								return;
							}
						}else{
							sids.push(this.selectedStencils.id);
						}
					}
					// remove selection, delete, restore selection
					this.deselect();
					this.selectItem(stencil);
					this.onDelete();
					dojo.forEach(sids, function(id){
						this.selectItem(id);
					}, this);
				}else{
					// there is not a selection. select it, delete it
					this.selectItem(stencil);
					// now delete selection
					this.onDelete();
				}
			},
			
			removeAll: function(){
				// summary:
				//		Deletes all Stencils on the canvas.
				
				this.selectAll();
				this._isBusy = true;
				this.onDelete();
				this.stencils = {};
				this._isBusy = false;
			},
			
			setSelectionGroup: function(){
				// summary:
				//		Internal. Creates a new selection group
				//		used to hold selected stencils.
				//
				this.withSelected(function(m){
					this.onDeselect(m, true);
				});
				
				if(this.group){
					surface.remove(this.group);
					this.group.removeShape();
				}
				this.group = surface.createGroup();
				this.group.setTransform({dx:0, dy: 0});
				
				this.withSelected(function(m){
					this.group.add(m.container);
					m.select();
				});
			},
			
			setConstraint: function(){
				// summary:
				//		Internal. Gets all selected stencils' coordinates
				//		and determines how far left and up the selection
				//		can go without going below zero
				//
				var t = Infinity, l = Infinity;
				this.withSelected(function(m){
					var o = m.getBounds();
					t = Math.min(o.y1, t);
					l = Math.min(o.x1, l);
				});
				this.constrain = {l:-l, t:-t};
			},
			
			
			
			onDeselect: function(stencil, keepObject){
				// summary:
				//		Event fired on deselection of a stencil
				//
				if(!keepObject){
					delete this.selectedStencils[stencil.id];
				}
				//console.log('onDeselect, keep:', keepObject, "stencil:", stencil.type)
				
				this.anchors.remove(stencil);
				
				surface.add(stencil.container);
				stencil.selected && stencil.deselect();
				stencil.applyTransform(this.group.getTransform());
			},
			
			deselectItem: function(/*Object*/stencil){
				// summary:
				//		Deselect passed stencil
				//
				// note: just keeping with standardized methods
				this.onDeselect(stencil);
			},
			
			deselect: function(){ // all stencils
				// summary:
				//		Deselect all stencils
				//
				this.withSelected(function(m){
					this.onDeselect(m);
				});
				this._dragBegun = false;
				this._wasDragged = false;
			},
			
			onSelect: function(/*Object*/stencil){
				// summary:
				//		Event fired on selection of a stencil
				//
				//console.log("stencil.onSelect", stencil);
				if(!stencil){
					console.error("null stencil is not selected:", this.stencils)
				}
				if(this.selectedStencils[stencil.id]){ return; }
				this.selectedStencils[stencil.id] = stencil;
				this.group.add(stencil.container);
				stencil.select();
				if(this.hasSelected()==1){
					this.anchors.add(stencil, this.group);
				}
			},
			
			selectAll: function(){
				// summary:
				//		Selects all items
				this._isBusy = true;
				for(var m in this.stencils){
					//if(!this.stencils[m].selected){
						this.selectItem(m);
					//}
				}
				this._isBusy = false;
			},
			
			selectItem: function(/*String|Object*/ idOrItem){
				// summary:
				//		Method used to select a stencil.
				//
				var id = typeof(idOrItem)=="string" ? idOrItem : idOrItem.id;
				var stencil = this.stencils[id];
				this.setSelectionGroup();
				this.onSelect(stencil);
				this.group.moveToFront();
				this.setConstraint();
			},
			
			onLabelDoubleClick: function(/*EventObject*/obj){
				// summary:
				//		Event to connect a textbox to
				//		for label edits
				console.info("mgr.onLabelDoubleClick:", obj);
				if(this.selectedStencils[obj.id]){
					this.deselect();
				}
			},
			
			onStencilDoubleClick: function(/*EventObject*/obj){
				// summary:
				//		Event fired on the double-click of a stencil
				//
				console.info("mgr.onStencilDoubleClick:", obj);
				if(this.selectedStencils[obj.id]){
					if(this.selectedStencils[obj.id].edit){
						console.info("Mgr Stencil Edit -> ", this.selectedStencils[obj.id]);
						var m = this.selectedStencils[obj.id];
						// deselect must happen first to set the transform
						// then edit knows where to set the text box
						m.editMode = true;
						this.deselect();
						m.edit();
					}
				}
				
			},
			
			onAnchorUp: function(){
				// summary:
				//		Event fire on mouseup off of an anchor point
				this.setConstraint();
			},
			
			onStencilDown: function(/*EventObject*/obj, evt){
				// summary:
				//		Event fired on mousedown on a stencil
				//
				console.info(" >>> onStencilDown:", obj.id, this.keys.meta);
				if(!this.stencils[obj.id]){ return; }
				this.setRecentStencil(this.stencils[obj.id]);
				this._isBusy = true;
				
				
				if(this.selectedStencils[obj.id] && this.keys.meta){
					if(dojo.isMac && this.keys.cmmd){
						// block context menu
						
					}
					console.log("    shift remove");
					this.onDeselect(this.selectedStencils[obj.id]);
					if(this.hasSelected()==1){
						this.withSelected(function(m){
							this.anchors.add(m, this.group);
						});
					}
					this.group.moveToFront();
					this.setConstraint();
					return;
				
				}else if(this.selectedStencils[obj.id]){
					console.log("    clicked on selected");
					// clicking on same selected item(s)
					// RESET OFFSETS
					var mx = this.group.getTransform();
					this._offx = obj.x - mx.dx;
					this._offy = obj.y - mx.dy;
					return;
				
				}else if(!this.keys.meta){
					
					console.log("    deselect all");
					this.deselect();
				
				}else{
					// meta-key add
					//console.log("reset sel and add stencil")
				}
				console.log("    add stencil to selection");
				// add a stencil
				this.selectItem(obj.id);
				
				mx = this.group.getTransform();
				this._offx = obj.x - mx.dx;
				this._offy = obj.y - mx.dx;
				
				this.orgx = obj.x;
				this.orgy = obj.y;
				
				this._isBusy = false;
				
				// TODO:
				//  dojo.style(surfaceNode, "cursor", "pointer");
				
				// TODO:
				this.undo.add({
					before:function(){
						
					},
					after: function(){
						
					}
				});
			},
			
			onLabelDown: function(/*EventObject*/obj, evt){
				// summary:
				//		Event fired on mousedown of a stencil's label
				//		Because it's an annotation the id will be the
				//		master stencil.
				//console.info("===============>>>Label click: ",obj, " evt: ",evt);
				this.onStencilDown(obj,evt);
			},
			
			onStencilUp: function(/*EventObject*/obj){
				// summary:
				//		Event fired on mouseup off of a stencil
				//
			},
			
			onLabelUp: function(/*EventObject*/obj){
				this.onStencilUp(obj);
			},
			
			onStencilDrag: function(/*EventObject*/obj){
				// summary:
				//		Event fired on every mousemove of a stencil drag
				//
				if(!this._dragBegun){
					// bug, in FF anyway - first mouse move shows x=0
					// the 'else' fixes it
					this.onBeginDrag(obj);
					this._dragBegun = true;
				}else{
					this.saveThrottledState();
					
					var x = obj.x - obj.last.x,
						y = obj.y - obj.last.y,
						c = this.constrain,
						mz = this.defaults.anchors.marginZero;
					
					
					x = obj.x - this._offx;
					y = obj.y - this._offy;
					
					if(x < c.l + mz){
						x = c.l + mz;
					}
					if(y < c.t + mz){
						y = c.t + mz;
					}
					
					this.group.setTransform({
						dx: x,
						dy: y
					});
					
					
				}
			},
			
			onLabelDrag: function(/*EventObject*/obj){
				this.onStencilDrag(obj);
			},
			
			onDragEnd: function(/*EventObject*/obj){
				// summary:
				//		Event fired at the end of a stencil drag
				//
				this._dragBegun = false;
			},
			onBeginDrag: function(/*EventObject*/obj){
				// summary:
				//		Event fired at the beginning of a stencil drag
				//
				this._wasDragged = true;
			},
			
			onDown: function(/*EventObject*/obj){
				// summary:
				//		Event fired on mousedown on the canvas
				//
				this.deselect();
			},
						
			
			onStencilOver: function(obj){
				// summary:
				//		This changes the cursor when hovering over
				//		a selectable stencil.
				//console.log("OVER")
				dojo.style(obj.id, "cursor", "move");
			},

			onStencilOut: function(obj){
				// summary:
				//		This restores the cursor.
				//console.log("OUT")
				dojo.style(obj.id, "cursor", "crosshair");
			},
			
			exporter: function(){
				// summary:
				//		Collects all Stencil data and returns an
				//		Array of objects.
				var items = [];
				for(var m in this.stencils){
					this.stencils[m].enabled && items.push(this.stencils[m].exporter());
				}
				return items; // Array
			},
			
			listStencils: function(){
				return this.stencils;
			},
			
			toSelected: function(/*String*/func){
				// summary:
				//		Convenience function calls function *within*
				//		all selected stencils
				var args = Array.prototype.slice.call(arguments).splice(1);
				for(var m in this.selectedStencils){
					var item = this.selectedStencils[m];
					item[func].apply(item, args);
				}
			},
			
			withSelected: function(/*Function*/func){
				// summary:
				//		Convenience function calls function on
				//		all selected stencils
				var f = dojo.hitch(this, func);
				for(var m in this.selectedStencils){
					f(this.selectedStencils[m]);
				}
			},
			
			withUnselected: function(/*Function*/func){
				// summary:
				//		Convenience function calls function on
				//		all stencils that are not selected
				var f = dojo.hitch(this, func);
				for(var m in this.stencils){
					!this.stencils[m].selected && f(this.stencils[m]);
				}
			},
			
			withStencils: function(/*Function*/func){
				// summary:
				//		Convenience function calls function on
				//		all stencils
				var f = dojo.hitch(this, func);
				for(var m in this.stencils){
					f(this.stencils[m]);
				}
			},
			
			hasSelected: function(){
				// summary:
				// 		Returns number of selected (generally used
				//		as truthy or falsey)
				//
				// FIXME: should be areSelected?
				var ln = 0;
				for(var m in this.selectedStencils){ ln++; }
				return ln; // Number
			},
			
			isSelected: function(/*Object*/stencil){
				// summary:
				//		Returns if passed stencil is selected or not
				//		based on internal collection, not on stencil
				//		boolean
				return !!this.selectedStencils[stencil.id]; // Boolean
			}
		}
		
	);
})();
