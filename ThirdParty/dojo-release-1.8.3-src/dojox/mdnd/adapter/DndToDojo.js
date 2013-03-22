define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/topic", // topic.publish()
	"dojo/_base/window",
	"dojox/mdnd/PureSource",
	"dojox/mdnd/LazyManager"
],function(dojo, declare, connect, array, domClass, domStyle, geom, topic, win){
	var dtd = declare(
		"dojox.mdnd.adapter.DndToDojo",
		null,
	{
		// summary:
		//		Allow communication between an item of dojox D&D area to a target dojo.
	
		// _dojoList: Array
		//		Array containing object references the dojo Target list
		_dojoList: null,
	
		// _currentDojoArea: DOMNode
		//		Representing the current dojo area
		_currentDojoArea: null,
	
		// _dojoxManager: dojox.mdnd.AreaManager
		//		The reference to the dojox AreaManager
		_dojoxManager: null,
	
		// _dragStartHandler: Object
		//		Handle to keep start subscribe
		_dragStartHandler: null,
	
		// _dropHandler: Object
		//		Handle to keep drop subscribe
		_dropHandler: null,
	
		// _moveHandler: Object
		//		Handle to keep move subscribe
		_moveHandler: null,
	
		// _moveUpHandler: Object
		//		Handle to kee move up subscribe
		_moveUpHandler: null,
	
		// _draggedNode: DOMNode
		//		The current dragged node
		_draggedNode: null,
	
		constructor: function(){
			this._dojoList = [];
			this._currentDojoArea = null;
			this._dojoxManager = dojox.mdnd.areaManager();
			this._dragStartHandler = connect.subscribe("/dojox/mdnd/drag/start", this, function(node, sourceArea, sourceDropIndex){
				this._draggedNode = node;
				this._moveHandler = connect.connect(dojo.doc, "onmousemove", this, "onMouseMove");
			});
			this._dropHandler = connect.subscribe("/dojox/mdnd/drop", this, function(node, targetArea, indexChild){
				if(this._currentDojoArea){
					connect.publish("/dojox/mdnd/adapter/dndToDojo/cancel", [this._currentDojoArea.node, this._currentDojoArea.type, this._draggedNode, this.accept]);
				}
				this._draggedNode = null;
				this._currentDojoArea = null;
				connect.disconnect(this._moveHandler);
			});
		},
	
		_getIndexDojoArea: function(/*node*/area){
			// summary:
			//		Check if a dojo area is registered.
			// area: DOMNode
			//		A node corresponding to the target dojo.
			// returns:
			//		The index of area if it's registered else -1.
			// tags:
			//		protected
	
			//console.log('dojox.mdnd.adapter.DndToDojo ::: _getIndexDojoArea');
			if(area){
				for(var i = 0, l = this._dojoList.length; i < l; i++){
					if(this._dojoList[i].node === area){
						return i;
					}
				}
			}
			return -1;
		},
	
		_initCoordinates: function(/*DOMNode*/area){
			// summary:
			//		Initialize the coordinates of the target dojo.
			// area:
			//		A registered DOM node.
			// returns:
			//		An object which contains coordinates : *{x:0,y:,x1:0,y1:0}*
			// tags:
			//		protected
	
			//console.log('dojox.mdnd.adapter.DndToDojo ::: _initCoordinates');
			if(area){
				var position = geom.position(area, true),
					coords = {};
				coords.x = position.x;
				coords.y = position.y;
				coords.x1 = position.x + position.w;
				coords.y1 = position.y + position.h;
				return coords;	// 	Object
			}
			return null;
		},
	
		register: function(/*DOMNode*/area, /*String*/ type, /*Boolean*/ dojoTarget){
			// summary:
			//		Register a target dojo.
			//		The target is represented by an object containing :
			//
			//		- the dojo area node
			//		- the type reference to identify a group node
			//		- the coords of the area to enable refresh position
			// area:
			//		The DOM node which has to be registered.
			// type:
			//		A String to identify the node.
			// dojoTarget:
			//		True if the dojo D&D have to be enable when mouse is hover the registered target dojo.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: registerDojoArea", area, type, dojoTarget);
			if(this._getIndexDojoArea(area) == -1){
				var coords = this._initCoordinates(area),
					object = {
						'node': area,
						'type': type,
						'dojo': (dojoTarget)?dojoTarget:false,
						'coords': coords
					};
				this._dojoList.push(object);
				// initialization of the _fakeSource to allow Dnd switching
				if(dojoTarget && !this._lazyManager){
					this._lazyManager = new dojox.mdnd.LazyManager();
				}
			}
		},
	
		unregisterByNode: function(/*DOMNode*/area){
			// summary:
			//		Unregister a target dojo.
			// area:
			//		The DOM node of target dojo.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: unregisterByNode", area);
			var index = this._getIndexDojoArea(area);
			// if area is registered
			if(index != -1){
				this._dojoList.splice(index, 1);
			}
		},
	
		unregisterByType: function(/*String*/type){
			// summary:
			//		Unregister several targets dojo having the same type passing in parameter.
			// type:
			//		A String to identify dojo targets.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: unregisterByType", type);
			if(type){
				var tempList = [];
				array.forEach(this._dojoList, function(item, i){
					if(item.type != type){
						tempList.push(item);
					}
				});
				this._dojoList = tempList;
			}
		},
	
		unregister: function(){
			// summary:
			//		Unregister all targets dojo.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: unregister");
			this._dojoList = [];
		},
	
		refresh: function(){
			// summary:
			//		Refresh the coordinates of all registered dojo target.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: refresh");
			var dojoList = this._dojoList;
			this.unregister();
			array.forEach(dojoList, function(dojo){
				dojo.coords = this._initCoordinates(dojo.node);
			}, this);
			this._dojoList = dojoList;
		},
	
		refreshByType: function(/*String*/ type){
			// summary:
			//		Refresh the coordinates of registered dojo target with a specific type.
			// type:
			//		A String to identify dojo targets.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: refresh");
			var dojoList = this._dojoList;
			this.unregister();
			array.forEach(dojoList, function(dojo){
				if(dojo.type == type){
					dojo.coords = this._initCoordinates(dojo.node);
				}
			}, this);
			this._dojoList = dojoList;
		},
	
		_getHoverDojoArea: function(/*Object*/coords){
			// summary:
			//		Check if the coordinates of the mouse is in a dojo target.
			// coords:
			//		Coordinates of the mouse.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: _getHoverDojoArea");
			this._oldDojoArea = this._currentDojoArea;
			this._currentDojoArea = null;
			var x = coords.x;
			var y = coords.y;
			var length = this._dojoList.length;
			for(var i = 0; i < length; i++){
				var dojoArea = this._dojoList[i];
				var coordinates = dojoArea.coords;
				if(coordinates.x <= x && x <= coordinates.x1 && coordinates.y <= y && y <= coordinates.y1){
					this._currentDojoArea = dojoArea;
					break;
				}
			}
		},
	
		onMouseMove: function(/*DOMEvent*/e){
			// summary:
			//		Call when the mouse moving after an onStartDrag of AreaManger.
			//		Check if the coordinates of the mouse is in a dojo target.
			// e:
			//		Event object.
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: onMouseMove");
			var coords = {
				'x': e.pageX,
				'y': e.pageY
			};
			this._getHoverDojoArea(coords);
			if(this._currentDojoArea != this._oldDojoArea){
				if(this._currentDojoArea == null){
					this.onDragExit(e);
				}
				else if(this._oldDojoArea == null){
					this.onDragEnter(e);
				}
				else{
					this.onDragExit(e);
					this.onDragEnter(e);
				}
			}
		},
	
		isAccepted: function(/*DOMNode*/draggedNode, /*Object*/ target){
			// summary:
			//		Return true if the dragged node is accepted.
			//		This method has to be overwritten according to registered target.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: isAccepted");
			return true;
		},
	
	
		onDragEnter: function(/*DOMEvent*/e){
			// summary:
			//		Call when the mouse enters in a registered dojo target.
			// e:
			//		The current Javascript Event.
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: onDragEnter");
			// specific for drag and drop switch
			if(this._currentDojoArea.dojo){
				// disconnect
				connect.disconnect(this._dojoxManager._dragItem.handlers.pop());
				connect.disconnect(this._dojoxManager._dragItem.handlers.pop());
				//disconnect onmousemove of moveable item
				//console.info("before",this._dojoxManager._dragItem.item.events.pop());
				connect.disconnect(this._dojoxManager._dragItem.item.events.pop());
				win.body().removeChild(this._dojoxManager._cover);
				win.body().removeChild(this._dojoxManager._cover2);
				var node = this._dojoxManager._dragItem.item.node;
				// hide dragNode :
				// disconnect the dojoDndAdapter if it's initialize
				if(dojox.mdnd.adapter._dndFromDojo){
					dojox.mdnd.adapter._dndFromDojo.unsubscribeDnd();
				}
				domStyle.set(node, {
					'position': "relative",
					'top': '0',
					'left': '0'
				});
				// launch the drag and drop Dojo.
				this._lazyManager.startDrag(e, node);
				var handle = connect.connect(this._lazyManager.manager, "overSource", this, function(){
					connect.disconnect(handle);
					if(this._lazyManager.manager.canDropFlag){
						// remove dropIndicator
						this._dojoxManager._dropIndicator.node.style.display = "none";
					}
				});
	
				this.cancelHandler = connect.subscribe("/dnd/cancel", this, function(){
					var moveableItem = this._dojoxManager._dragItem.item;
					// connect onmousemove of moveable item
					// need to reconnect the onmousedown of movable class.
					moveableItem.events = [
						connect.connect(moveableItem.handle, "onmousedown", moveableItem, "onMouseDown")
					];
					// replace the cover and the dragNode in the cover.
					win.body().appendChild(this._dojoxManager._cover);
					win.body().appendChild(this._dojoxManager._cover2);
					this._dojoxManager._cover.appendChild(moveableItem.node);
	
					var objectArea = this._dojoxManager._areaList[this._dojoxManager._sourceIndexArea];
					var dropIndex = this._dojoxManager._sourceDropIndex;
					var nodeRef = null;
					if(dropIndex != objectArea.items.length
							&& dropIndex != -1){
						nodeRef = objectArea.items[this._dojoxManager._sourceDropIndex].item.node;
					}
					if(this._dojoxManager._dropIndicator.node.style.display == "none"){
						this._dojoxManager._dropIndicator.node.style.display == "";
					}
					this._dojoxManager._dragItem.handlers.push(connect.connect(this._dojoxManager._dragItem.item, "onDrag", this._dojoxManager, "onDrag"));
					this._dojoxManager._dragItem.handlers.push(connect.connect(this._dojoxManager._dragItem.item, "onDragEnd", this._dojoxManager, "onDrop"));
					this._draggedNode.style.display = "";
					this._dojoxManager.onDrop(this._draggedNode);
					connect.unsubscribe(this.cancelHandler);
					connect.unsubscribe(this.dropHandler);
					if(dojox.mdnd.adapter._dndFromDojo){
						dojox.mdnd.adapter._dndFromDojo.subscribeDnd();
					}
				});
				this.dropHandler = connect.subscribe("/dnd/drop/before", this, function(params){
					connect.unsubscribe(this.cancelHandler);
					connect.unsubscribe(this.dropHandler);
					this.onDrop();
				});
			}
			else{
				this.accept = this.isAccepted(this._dojoxManager._dragItem.item.node, this._currentDojoArea);
				if(this.accept){
					// disconnect
					connect.disconnect(this._dojoxManager._dragItem.handlers.pop());
					connect.disconnect(this._dojoxManager._dragItem.handlers.pop());
					// remove dropIndicator
					this._dojoxManager._dropIndicator.node.style.display = "none";
					if(!this._moveUpHandler){
						this._moveUpHandler = connect.connect(dojo.doc, "onmouseup", this, "onDrop");
					}
				}
			}
			// publish a topic
			connect.publish("/dojox/mdnd/adapter/dndToDojo/over",[this._currentDojoArea.node, this._currentDojoArea.type, this._draggedNode, this.accept]);
		},
	
		onDragExit: function(/*DOMEvent*/e){
			// summary:
			//		Call when the mouse exit of a registered dojo target.
			// e:
			//		current javscript event
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: onDragExit",e, this._dojoxManager._dragItem.item);
			// set the old height of dropIndicator.
			if(this._oldDojoArea.dojo){
				// unsubscribe the topic /dnd/cancel and /dnd/drop/before
				connect.unsubscribe(this.cancelHandler);
				connect.unsubscribe(this.dropHandler);
				// launch Drag and Drop
				var moveableItem = this._dojoxManager._dragItem.item;
				// connect onmousemove of moveable item
				this._dojoxManager._dragItem.item.events.push(connect.connect(
					moveableItem.node.ownerDocument,
					"onmousemove",
					moveableItem,
					"onMove"
				));
				// replace the cover and the dragNode in the cover.
				win.body().appendChild(this._dojoxManager._cover);
				win.body().appendChild(this._dojoxManager._cover2);
				this._dojoxManager._cover.appendChild(moveableItem.node);
				// fix style :
				var style = moveableItem.node.style;
				style.position = "absolute";
				style.left = (moveableItem.offsetDrag.l + e.pageX)+"px";
				style.top = (moveableItem.offsetDrag.t + e.pageX)+"px";
				style.display = "";
				// stop dojoDrag
				this._lazyManager.cancelDrag();
				// reconnect the dndFromDojo
				if(dojox.mdnd.adapter._dndFromDojo){
					dojox.mdnd.adapter._dndFromDojo.subscribeDnd();
				}
				if(this._dojoxManager._dropIndicator.node.style.display == "none"){
					this._dojoxManager._dropIndicator.node.style.display = "";
				}
				// reconnect the areaManager.
				this._dojoxManager._dragItem.handlers.push(connect.connect(this._dojoxManager._dragItem.item, "onDrag", this._dojoxManager, "onDrag"));
				this._dojoxManager._dragItem.handlers.push(connect.connect(this._dojoxManager._dragItem.item, "onDragEnd", this._dojoxManager, "onDrop"));
				this._dojoxManager._dragItem.item.onMove(e);
			}
			else{
				if(this.accept){
					// disconnect the mouseUp event.
					if(this._moveUpHandler){
						connect.disconnect(this._moveUpHandler);
						this._moveUpHandler = null;
					}
					// redisplay dropIndicator
					if(this._dojoxManager._dropIndicator.node.style.display == "none"){
						this._dojoxManager._dropIndicator.node.style.display = "";
					}
					// reconnect the areaManager.
					this._dojoxManager._dragItem.handlers.push(connect.connect(this._dojoxManager._dragItem.item, "onDrag", this._dojoxManager, "onDrag"));
					this._dojoxManager._dragItem.handlers.push(connect.connect(this._dojoxManager._dragItem.item, "onDragEnd", this._dojoxManager, "onDrop"));
					this._dojoxManager._dragItem.item.onMove(e);
				}
			}
			// publish a topic
			connect.publish("/dojox/mdnd/adapter/dndToDojo/out",[this._oldDojoArea.node, this._oldDojoArea.type, this._draggedNode, this.accept]);
		},
	
		onDrop: function(/*DOMEvent*/e){
			// summary:
			//		Called when an onmouseup event is loaded on a registered target dojo.
			// e:
			//		Event object.
	
			//console.log("dojox.mdnd.adapter.DndToDojo ::: onDrop", this._currentDojoArea);
			if(this._currentDojoArea.dojo){
				// reconnect the dojoDndAdapter
				if(dojox.mdnd.adapter._dndFromDojo){
					dojox.mdnd.adapter._dndFromDojo.subscribeDnd();
				}
			}
			if(this._dojoxManager._dropIndicator.node.style.display == "none"){
				this._dojoxManager._dropIndicator.node.style.display = "";
			}
			// remove the cover
			if(this._dojoxManager._cover.parentNode && this._dojoxManager._cover.parentNode.nodeType == 1){
				win.body().removeChild(this._dojoxManager._cover);
				win.body().removeChild(this._dojoxManager._cover2);
			}
			// remove draggedNode of target :
			if(this._draggedNode.parentNode == this._dojoxManager._cover){
				this._dojoxManager._cover.removeChild(this._draggedNode);
			}
			connect.disconnect(this._moveHandler);
			connect.disconnect(this._moveUpHandler);
			this._moveHandler = this._moveUpHandler = null;
			connect.publish("/dojox/mdnd/adapter/dndToDojo/drop", [this._draggedNode, this._currentDojoArea.node, this._currentDojoArea.type]);
			domClass.remove(this._draggedNode, "dragNode");
			var style = this._draggedNode.style;
			style.position = "relative";
			style.left = "0";
			style.top = "0";
			style.width = "auto";
			array.forEach(this._dojoxManager._dragItem.handlers, connect.disconnect);
			this._dojoxManager._deleteMoveableItem(this._dojoxManager._dragItem);
			this._draggedNode = null;
			this._currentDojoArea = null;
			// reset of area manager.
			this._dojoxManager._resetAfterDrop();
		}
	});
	
	dojox.mdnd.adapter._dndToDojo = null;
	dojox.mdnd.adapter.dndToDojo = function(){
		// summary:
		//		returns the current areaManager, creates one if it is not created yet
		if(!dojox.mdnd.adapter._dndToDojo){
			dojox.mdnd.adapter._dndToDojo = new dojox.mdnd.adapter.DndToDojo();
		}
		return dojox.mdnd.adapter._dndToDojo;	// Object
	};
	return dtd;
});
