define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/dom-class",
	"dojo/_base/window",
	"dojox/mdnd/AreaManager",
	"dojo/dnd/Manager"
],function(dojo, declare, connect, array, domClass, win, AreaManager, Manager){
	var dfd = declare(
		"dojox.mdnd.adapter.DndFromDojo",
		null,
	{
		// summary:
		//		Allow communication between Dojo dnd items and DojoX D&D areas
	
		// dropIndicatorSize: Object
		//		size by default of dropIndicator (display only into a D&D Area)
		dropIndicatorSize : {'w':0,'h':50},
	
		// dropIndicatorSize: Object
		//		size by default of dropIndicator (display only into a D&D Area)
		dropIndicatorSize: {'w':0,'h':50},
	
		// _areaManager: Object
		//		Reference to the current DojoX Dnd Manager
		_areaManager: null,
	
		// _dojoManager
		//		Reference to the current Dojo Manager
		_dojoManager: null,
	
		// _currentArea: Object
		//		The current Area on mouse over
		_currentArea: null,
	
		// _oldArea: Object
		//		The old area the mouse has passed over
		_oldArea: null,
	
		// _moveHandler: Object
		//		The handler of mouse connection
		_moveHandler: null,
	
		// _subscribeHandler: Array
		//		The list of dojo dnd topics
		_subscribeHandler: null,
	
		constructor: function(){
			this._areaManager = dojox.mdnd.areaManager();
			this._dojoManager = Manager.manager();
			this._currentArea = null;
			this._moveHandler = null;
			this.subscribeDnd();
		},
	
		subscribeDnd: function(){
			// summary:
			//		Subscribe to somes topics of dojo drag and drop.
	
			//console.log(("dojox.mdnd.adapter.DndFromDojo ::: subscribeDnd");
			this._subscribeHandler = [
				connect.subscribe("/dnd/start",this,"onDragStart"),
				connect.subscribe("/dnd/drop/before", this, "onDrop"),
				connect.subscribe("/dnd/cancel",this,"onDropCancel"),
				connect.subscribe("/dnd/source/over",this,"onDndSource")
			]
		},
	
		unsubscribeDnd: function(){
			// summary:
			//		Unsubscribe to some topics of dojo drag and drop.
	
			//console.log(("dojox.mdnd.adapter.DndFromDojo ::: unsubscribeDnd");
			array.forEach(this._subscribeHandler, connect.unsubscribe);
		},
	
		_getHoverArea: function(/*Object*/ coords){
			// summary:
			//		Get a D&D dojoX area as a DOM node positioned under a specific point.
			// coords:
			//		Object containing the coordinates x and y (mouse position)
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: _getHoverArea");
			var x = coords.x;
			var y = coords.y;
			this._oldArea = this._currentArea;
			this._currentArea = null;
			var areas = this._areaManager._areaList;
			for(var i = 0; i < areas.length; i++){
				var area = areas[i];
				var startX = area.coords.x;
				var endX = startX + area.node.offsetWidth;
				var startY = area.coords.y;
				var endY = startY + area.node.offsetHeight;
				// check if the coordinates mouse is in a D&D Area
				if(startX <= x && x <= endX && startY <= y && y <= endY){
					this._areaManager._oldIndexArea = this._areaManager._currentIndexArea;
					this._areaManager._currentIndexArea = i;
					this._currentArea = area.node;
					break;
				}
			}
			if(this._currentArea != this._oldArea){
				if(this._currentArea == null){
					// case when the dragNode was in a D&D area but it's out now.
					this.onDragExit();
				}
				else if(this._oldArea == null){
					// case when the dragNode was out a D&D area but it's in now.
					this.onDragEnter();
				}
				else{
					// case when the dragNode was in a D&D area and enter in an other D&D area directly.
					this.onDragExit();
					this.onDragEnter();
				}
			}
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: _getHoverArea",this._dojoManager.avatar.node,this._currentArea,this._oldArea);
		},
	
		onDragStart: function(/*Object*/source, /*Array*/nodes, /*Boolean*/copy){
			// summary:
			//		Occurs when the "/dnd/start" topic is published.
			// source:
			//		the source which provides items
			// nodes:
			//		the list of transferred items
			// copy:
			//		copy items, if true, move items otherwise
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onDragStart");
			// catch the dragNode to get the type when it's necessary.
			this._dragNode = nodes[0];
			this._copy = copy; this._source = source;
			// Connect the onMouseMove :
			// It's usefull to activate the detection of a D&D area and the dropIndicator place only if
			// the dragNode is out of a the source dojo. The classic behaviour of the dojo source is kept.
			this._outSourceHandler = connect.connect(this._dojoManager, "outSource", this, function(){
				//dojo.disconnect(this._outSourceHandler);
				if(this._moveHandler == null){
					this._moveHandler = connect.connect(dojo.doc, "mousemove", this, "onMouseMove");
				}
			});
		},
	
		onMouseMove: function(/*DOMEvent*/e){
			// summary:
			//		Occurs when the user moves the mouse.
			// e:
			//		the DOM event
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onMouseMove");
			// calculate the coordonates of the mouse.
			var coords = {
				'x': e.pageX,
				'y': e.pageY
			};
			this._getHoverArea(coords);
			// if a D&D area has been found and if it's accepted to drop this type of dragged node
			if(this._currentArea && this._areaManager._accept){
				// specific case : a dropIndicator can be hidden (see onDndSource method)
				if(this._areaManager._dropIndicator.node.style.visibility == "hidden"){
					this._areaManager._dropIndicator.node.style.visibility = "";
					domClass.add(this._dojoManager.avatar.node, "dojoDndAvatarCanDrop");
				}
				// place the dropIndicator in D&D Area with a default size.
				this._areaManager.placeDropIndicator(coords, this.dropIndicatorSize);
			}
		},
	
		onDragEnter: function(){
			// summary:
			//		Occurs when the user drages an DOJO dnd item inside a D&D dojoX area.
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onDragEnter");
			// Check if the type of dragged node is accepted in the selected D&D dojoX Area.
			var _dndType = this._dragNode.getAttribute("dndType");
			// need to have an array as type
			var type = (_dndType) ? _dndType.split(/\s*,\s*/) : ["text"];
			this._areaManager._isAccepted(type, this._areaManager._areaList[this._areaManager._currentIndexArea].accept);
			// if the D&D dojoX Area accepts the drop, change the color of Avatar.
			if(this._dojoManager.avatar){
				if(this._areaManager._accept){
					domClass.add(this._dojoManager.avatar.node, "dojoDndAvatarCanDrop");
				}
				else{
					domClass.remove(this._dojoManager.avatar.node, "dojoDndAvatarCanDrop");
				}
			}
		},
	
		onDragExit: function(){
			// summary:
			//		Occurs when the user leaves a D&D dojoX area after dragging an DOJO dnd item over it.
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onDragExit");
			// if the dragged node exits of a D&D dojoX Area :
			this._areaManager._accept = false;
			// change color of avatar
			if(this._dojoManager.avatar){
				domClass.remove(this._dojoManager.avatar.node, "dojoDndAvatarCanDrop");
			}
			// reset all variables and remove the dropIndicator.
			if(this._currentArea == null){
				this._areaManager._dropMode.refreshItems(this._areaManager._areaList[this._areaManager._oldIndexArea], this._areaManager._oldDropIndex, this.dropIndicatorSize, false);
				this._areaManager._resetAfterDrop();
			}
			else{
				this._areaManager._dropIndicator.remove();
			}
		},
	
		isAccepted: function(/*Node*/node, /*Object*/accept){
			// summary:
			//		Check if a dragNode is accepted into a dojo target.
			// node:
			//		The dragged node.
			// accept:
			//		Object containing the type accepted for a target dojo.
			// returns:
			//		true if the dragged node is accepted in the target dojo.
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: isAccepted");
			var type = (node.getAttribute("dndType")) ? node.getAttribute("dndType") : "text";
			if(type && type in accept)
				return true;	// Boolean
			else
				return false;	// Boolean
		},
	
		onDndSource: function(/*Object*/ source){
			// summary:
			//		Called when the mouse enters or exits of a source dojo.
			// source:
			//		the dojo source/target
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onDndSource",source);
			// Only the case : "source dojo into a D&D dojoX Area" is treated.
			if(this._currentArea == null){
				return;
			}
			if(source){
				// Enter in a source/target dojo.
				// test if the type of draggedNode is accepted :
				var accept = false;
				if(this._dojoManager.target == source){
					accept = true;
				}
				else{
					accept = this.isAccepted(this._dragNode, source.accept);
				}
				if(accept){
					// disconnect the onMouseMove to disabled the search of a drop zone in the D&D dojoX Area.
					connect.disconnect(this._moveHandler);
					this._currentArea = this._moveHandler = null;
					// hidden the visibility of dojoX dropIndicator to prevent an offset when the dropIndicator disappears.
					// test if drop indicator is visible before applaying hidden style.
					var dropIndicator = this._areaManager._dropIndicator.node;
					if(dropIndicator && dropIndicator.parentNode !== null && dropIndicator.parentNode.nodeType == 1)
						dropIndicator.style.visibility = "hidden";
				}
				else{
					// if the type of dragged node is not accepted in the target dojo, the color of avatar
					// have to be the same that the color of D&D dojoX Area acceptance.
					this._resetAvatar();
				}
			}
			else{
				// Exit of a source/target dojo.
				// reconnect the onMouseMove to enabled the search of a drop zone in the D&D dojox Area.
				if(!this._moveHandler)
					this._moveHandler = connect.connect(dojo.doc, "mousemove", this, "onMouseMove");
	
				this._resetAvatar();
			}
		},
	
		_resetAvatar: function(){
			// summary:
			//		Function executed in onDndSource function to set the avatar
			//		acceptance according to the dojox DnD AreaManager Acceptance.
			//		It is used when The mouse exit a source/target dojo or if the
			//		dragged node is not accepted in dojo source / target.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: _resetAvatar");
			if(this._dojoManager.avatar){
				if(this._areaManager._accept){
					domClass.add(this._dojoManager.avatar.node, "dojoDndAvatarCanDrop");
				}
				else{
					domClass.remove(this._dojoManager.avatar.node, "dojoDndAvatarCanDrop");
				}
			}
		},
	
		onDropCancel: function(){
			// summary:
			//		Occurs when the "/dnd/cancel" topic is published.
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onDropCancel");
			if(this._currentArea == null){
				// the dragged node is not in the D&D dojox Area => Cancel
				this._areaManager._resetAfterDrop();
				connect.disconnect(this._moveHandler);
				connect.disconnect(this._outSourceHandler);
				this._currentArea = this._moveHandler = this._outSourceHandler = null;
			}
			else{
				// the dragged node is in the D&D dojox Area
				//		(catch when dragged node exits of a source/target dojo and stays in the same D&D dojox Area)
				// dojo cancel the drop but it's authorized in the D&D Area
				if(this._areaManager._accept){
					this.onDrop(this._source, [this._dragNode], this._copy, this._currentArea);
				}
				else{
					this._currentArea = null;
					connect.disconnect(this._outSourceHandler);
					connect.disconnect(this._moveHandler);
					this._moveHandler = this._outSourceHandler = null;
				}
			}
		},
	
		onDrop: function(/*Object*/source, /*Array*/nodes, /*Boolean*/copy){
			// summary:
			//		Occurs when the user leaves a D&D dojox area after dragging an DOJO dnd item over it.
			// source:
			//		the source which provides items
			// nodes:
			//		the list of transferred items
			// copy:
			//		copy items, if true, move items otherwise
			// tags:
			//		callback
	
			//console.log("dojox.mdnd.adapter.DndFromDojo ::: onDrop", this._currentArea);
			connect.disconnect(this._moveHandler);
			connect.disconnect(this._outSourceHandler);
			this._moveHandler = this._outSourceHandler = null;
			if(this._currentArea){
				var dropIndex = this._areaManager._currentDropIndex;
				connect.publish("/dnd/drop/after", [source, nodes, copy, this._currentArea, dropIndex]);
				this._currentArea = null;
			}
			if(this._areaManager._dropIndicator.node.style.visibility == "hidden"){
				this._areaManager._dropIndicator.node.style.visibility = "";
			}
			this._areaManager._resetAfterDrop();
		}
	});
	
	dojox.mdnd.adapter._dndFromDojo = null;
	dojox.mdnd.adapter._dndFromDojo = new dojox.mdnd.adapter.DndFromDojo();
	return dfd; 
});
