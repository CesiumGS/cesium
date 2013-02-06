define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/touch",
	"dijit/registry",
	"./IconItem",
	"./sniff",
	"./viewRegistry"
], function(array, connect, declare, event, lang, domGeometry, domStyle, touch, registry, IconItem, has, viewRegistry){

	// module:
	//		dojox/mobile/_EditableIconMixin

	return declare("dojox.mobile._EditableIconMixin", null, {
		// summary:
		//		A mixin for IconContainer to make it editable.

		deleteIconForEdit: "mblDomButtonBlackCircleCross",
		threshold: 4, // drag threshold value in pixels

		destroy: function(){
			// summary:
			//		Destroys the container.
			if(this._blankItem){
				this._blankItem.destroy();
			}
			this.inherited(arguments);
		},

		startEdit: function(){
			// summary:
			//		Starts the editing.
			if(!this.editable || this.isEditing){ return; }

			this.isEditing = true;
			if(!this._handles){
				this._handles = [
					this.connect(this.domNode, "webkitTransitionStart", "_onTransitionStart"),
					this.connect(this.domNode, "webkitTransitionEnd", "_onTransitionEnd")
				];
			}

			var count = 0;
			array.forEach(this.getChildren(), function(w){
				setTimeout(lang.hitch(this, function(){
					w.set("deleteIcon", this.deleteIconForEdit);
					if(w.deleteIconNode){
						w._deleteHandle = this.connect(w.deleteIconNode, "onclick", "_deleteIconClicked");
					}
					w.highlight(0);
				}), 15*count++);
			}, this);

			connect.publish("/dojox/mobile/startEdit", [this]); // pubsub
			this.onStartEdit(); // callback
		},

		endEdit: function(){
			// summary:
			//		Ends the editing.
			if(!this.isEditing){ return; }

			array.forEach(this.getChildren(), function(w){
				w.unhighlight();
				if(w._deleteHandle){
					this.disconnect(w._deleteHandle);
					w._deleteHandle = null;
				}
				w.set("deleteIcon", "");
			}, this);

			this._movingItem = null;
			if(this._handles){
				array.forEach(this._handles, this.disconnect, this);
				this._handles = null;
			}

			connect.publish("/dojox/mobile/endEdit", [this]); // pubsub
			this.onEndEdit(); // callback
			this.isEditing = false;
		},

		scaleItem: function(/*Widget*/widget, /*Number*/ratio){
			// summary:
			//		Scales an item according to the specified ratio.
			domStyle.set(widget.domNode, {
				webkitTransition: has("android") ? "" : "-webkit-transform .1s ease-in-out",
				webkitTransform: ratio == 1 ? "" : "scale(" + ratio + ")"
			});			
		},

		_onTransitionStart: function(e){
			// tags:
			//		private
			event.stop(e);
		},

		_onTransitionEnd: function(e){
			// tags:
			//		private
			event.stop(e);
			var w = registry.getEnclosingWidget(e.target);
			w._moving = false;
			domStyle.set(w.domNode, "webkitTransition", "");
		},

		_onTouchStart: function(e){
			// tags:
			//		private
			if(!this._blankItem){
				this._blankItem = new IconItem();
				this._blankItem.domNode.style.visibility = "hidden";
				this._blankItem._onClick = function(){};
			}
			var item = this._movingItem = registry.getEnclosingWidget(e.target);
			var iconPressed = false;
			for(var n = e.target; n !== item.domNode; n = n.parentNode){
				if(n === item.iconNode){
					iconPressed = true;
					break;
				}
			}
			if(!iconPressed){ return; }

			if(!this._conn){
				// don't use touch.move since this is actually an event listened to on the document,
				// so we can't stop it when we are in a ScrollableView (to prevent the view from scrolling while dragging icons).
				this._conn = [
					this.connect(this.domNode, has("touch") ? "ontouchmove" : "onmousemove", "_onTouchMove"),
					this.connect(this.domNode, has("touch") ? "ontouchend" : "onmouseup", "_onTouchEnd")
				];
			}
			this._touchStartPosX = e.touches ? e.touches[0].pageX : e.pageX;
			this._touchStartPosY = e.touches ? e.touches[0].pageY : e.pageY;
			if(this.isEditing){
				this._onDragStart(e);
			}else{
				// set timer to detect long press
				this._pressTimer = setTimeout(lang.hitch(this, function(){
					this.startEdit();
					this._onDragStart(e);
				}), 1000);
			}
		},

		_onDragStart: function(e){
			// tags:
			//		private
			this._dragging = true;

			var movingItem = this._movingItem;
			if(movingItem.get("selected")){
				movingItem.set("selected", false);
			}
			this.scaleItem(movingItem, 1.1);

			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			
			var enclosingScrollable = viewRegistry.getEnclosingScrollable(movingItem.domNode);
			var dx = 0;
			var dy = 0;
			if(enclosingScrollable){ // this node is placed inside a scrollable
				var pos = enclosingScrollable.getPos();
				dx = pos.x;
				dy = pos.y;
				event.stop(e);
			}
			
			var startPos = this._startPos = domGeometry.position(movingItem.domNode, true);
			this._offsetPos = {
				x: startPos.x - x - dx,
				y: startPos.y - y - dy
			};

			this._startIndex = this.getIndexOfChild(movingItem);
			this.addChild(this._blankItem, this._startIndex);
			this.moveChild(movingItem, this.getChildren().length);
			domStyle.set(movingItem.domNode, {
				position: "absolute",
				top: (startPos.y - dy) + "px",
				left: (startPos.x - dx) + "px",
				zIndex: 100
			});
		},

		_onTouchMove: function(e){
			// tags:
			//		private
			var x = e.touches ? e.touches[0].pageX : e.pageX;
			var y = e.touches ? e.touches[0].pageY : e.pageY;
			if(this._dragging){
				domStyle.set(this._movingItem.domNode, {
					top: (this._offsetPos.y + y) + "px",
					left: (this._offsetPos.x + x) + "px"
				});
				this._detectOverlap({x: x, y: y});
				event.stop(e);
			}else{
				var dx = Math.abs(this._touchStartPosX - x);
				var dy = Math.abs(this._touchStartPosY - y);
				if (dx > this.threshold || dy > this.threshold) {
					this._clearPressTimer();					
				}
			}
		},

		_onTouchEnd: function(e){
			// tags:
			//		private
			this._clearPressTimer();
			if(this._conn){
				array.forEach(this._conn, this.disconnect, this);
				this._conn = null;				
			}

			if(this._dragging){
				this._dragging = false;

				var movingItem = this._movingItem;
				this.scaleItem(movingItem, 1.0);
				domStyle.set(movingItem.domNode, {
					position: "",
					top: "",
					left: "",
					zIndex: ""
				});
				var startIndex = this._startIndex;
				var endIndex = this.getIndexOfChild(this._blankItem);
				this.moveChild(movingItem, endIndex);
				this.removeChild(this._blankItem);
				connect.publish("/dojox/mobile/moveIconItem", [this, movingItem, startIndex, endIndex]); // pubsub
				this.onMoveItem(movingItem, startIndex, endIndex); // callback
			}
		},

		_clearPressTimer: function(){
			// tags:
			//		private
			if(this._pressTimer){
				clearTimeout(this._pressTimer);
				this._pressTimer = null;
			}
		},

		_detectOverlap: function(/*Object*/point){
			// tags:
			//		private
			var children = this.getChildren(),
				blankItem = this._blankItem,
				blankPos = domGeometry.position(blankItem.domNode, true),
				blankIndex = this.getIndexOfChild(blankItem),
				dir = 1;
			if(this._contains(point, blankPos)){
				return;
			}else if(point.y < blankPos.y || (point.y <= blankPos.y + blankPos.h && point.x < blankPos.x)){
				dir = -1;
			}
			for(var i = blankIndex + dir; i>=0 && i<children.length-1; i += dir){
				var w = children[i];
				if(w._moving){ continue; }
				var pos = domGeometry.position(w.domNode, true);
				if(this._contains(point, pos)){
					setTimeout(lang.hitch(this, function(){
						this.moveChildWithAnimation(blankItem, dir == 1 ? i+1 : i);
					}),0);
					break;
				}else if((dir == 1 && pos.y > point.y) || (dir == -1 && pos.y + pos.h < point.y)){
					break;
				}
			}
		},

		_contains: function(point, pos){
			// tags:
			//		private
			return pos.x < point.x && point.x < pos.x + pos.w && pos.y < point.y && point.y < pos.y + pos.h;
		},

		_animate: function(/*int*/from, /*int*/to){
			// tags:
			//		private
			if(from == to) { return; }
			var dir = from < to ? 1 : -1;
			var children = this.getChildren();
			var posArray = [];
			var i;
			for(i=from; i!=to; i+=dir){
				posArray.push({
					t: (children[i+dir].domNode.offsetTop - children[i].domNode.offsetTop) + "px",
					l: (children[i+dir].domNode.offsetLeft - children[i].domNode.offsetLeft) + "px"
				});
			}
			for(i=from, j=0; i!=to; i+=dir, j++){
				var w = children[i];
				w._moving = true;
				domStyle.set(w.domNode, {
					top: posArray[j].t,
					left: posArray[j].l
				});
				setTimeout(lang.hitch(w, function(){
					domStyle.set(this.domNode, {
						webkitTransition: "top .3s ease-in-out, left .3s ease-in-out",
						top: "0px",
						left: "0px"
					});
				}), j*10);
			}
		},

		removeChildWithAnimation: function(/*Widget|Number*/widget){
			// summary:
			//		Removes the given child with animation.
			var index = (typeof widget === "number") ? widget : this.getIndexOfChild(widget);
			this.removeChild(widget);

			// Show remove animation
			this.addChild(this._blankItem);
			this._animate(index, this.getChildren().length - 1);
			this.removeChild(this._blankItem);
		},

		moveChild: function(/*Widget|Number*/widget, /*Number?*/insertIndex){
			// summary:
			//		Moves a child without animation.
			this.addChild(widget, insertIndex);
			this.paneContainerWidget.addChild(widget.paneWidget, insertIndex);
		},

		moveChildWithAnimation: function(/*Widget|Number*/widget, /*Number?*/insertIndex){
			// summary:
			//		Moves a child with animation.	
			var index = this.getIndexOfChild(this._blankItem);
			this.moveChild(widget, insertIndex);

			// Show move animation
			this._animate(index, insertIndex);
		},

		_deleteIconClicked: function(e){
			// summary:
			//		Internal handler for click events.
			// tags:
			//		private
			if(this.deleteIconClicked(e) === false){ return; } // user's click action
			var item = registry.getEnclosingWidget(e.target);
			this.deleteItem(item);
		},

		deleteIconClicked: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		User-defined function to handle clicks for the delete icon.
			// tags:
			//		callback
		},

		deleteItem: function(/*Widget*/item){
			// summary:
			//		Deletes the given item.
			if(item._deleteHandle){
				this.disconnect(item._deleteHandle);
			}
			this.removeChildWithAnimation(item);

			connect.publish("/dojox/mobile/deleteIconItem", [this, item]); // pubsub
			this.onDeleteItem(item); // callback

			item.destroy();
		},

		onDeleteItem: function(/*Widget*/item){
			// summary:
			//		Stub function to connect to from your application.
		},

		onMoveItem: function(/*Widget*/item, /*int*/from, /*int*/to){
			// summary:
			//		Stub function to connect to from your application.
		},

		onStartEdit: function(){
			// summary:
			//		Stub function to connect to from your application.
		},

		onEndEdit: function(){
			// summary:
			//		Stub function to connect to from your application.
		},

		_setEditableAttr: function(/*Boolean*/editable){
			// tags:
			//		private
			this._set("editable", editable);
			if(editable && !this._touchStartHandle){ // Allow users to start editing by long press on IconItems
				this._touchStartHandle = this.connect(this.domNode, touch.press, "_onTouchStart");
			}else if(!editable && this._touchStartHandle){
				this.disconnect(this._touchStartHandle);
				this._touchStartHandle = null;
			}
		}
	});
});
