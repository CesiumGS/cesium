define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/dom-geometry",
	"dojox/mdnd/AreaManager"
],function(dojo, declare, connect, array, geom){
	var odm = declare(
		"dojox.mdnd.dropMode.OverDropMode",
		null,
	{
		// summary:
		//		Default class to find the nearest target only if the mouse is over an area.
	
		// _oldXPoint: Integer
		//		used to save a X position
		_oldXPoint: null,
	
		// _oldYPoint: Integer
		//		used to save a Y position
		_oldYPoint: null,
	
		// _oldBehaviour: Integer
		//		see getDragpoint()
		_oldBehaviour: "up",
	
		constructor: function(){
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: constructor");
			this._dragHandler = [
				connect.connect(dojox.mdnd.areaManager(), "onDragEnter", function(coords, size){
					var m = dojox.mdnd.areaManager();
					if(m._oldIndexArea == -1){
						m._oldIndexArea = m._lastValidIndexArea;
					}
				})
			];
	
		},
	
		addArea: function(/*Array*/areas, /*Object*/object){
			// summary:
			//		Add a D&D Area into an array sorting by the x position.
			// areas:
			//		array of areas
			// object:
			//		data type of a DndArea
			// returns:
			//		a sorted area
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: addArea");
			var length = areas.length,
				position = geom.position(object.node, true);
			object.coords = {'x':position.x, 'y':position.y};
			if(length == 0){
				areas.push(object);
			}
			else{
				var x = object.coords.x;
				for(var i = 0; i < length; i++){
					if(x < areas[i].coords.x){
						for(var j = length-1; j >= i; j--)
							areas[j + 1] = areas[j];
						areas[i] = object;
						break;
					}
				}
				if(i == length){
					areas.push(object);
				}
			}
			return areas;	// Array
		},
	
		updateAreas: function(/*Array*/areaList){
			// summary:
			//		refresh areas position and size to determinate the nearest area to drop an item
			// description:
			//		the area position (and size) is equal to the postion of the domNode associated.
			// areaList:
			//		array of areas
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: updateAreas");
			var length = areaList.length;
			for(var i = 0; i < length; i++){
				this._updateArea(areaList[i]);
			}
		},
	
		_updateArea : function(/*Object*/area){
			// summary:
			//		update the D&D area object (i.e. update coordinates of its DOM node)
			// area:
			//		the D&D area.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: addArea");
			var position = geom.position(area.node, true);
			area.coords.x = position.x;
			area.coords.x2 = position.x + position.w;
			area.coords.y = position.y;
		},
	
		initItems: function(/*Object*/area){
			// summary:
			//		initialize the horizontal line in order to determinate the drop zone.
			// area:
			//		the D&D area.
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: initItems");
			array.forEach(area.items, function(obj){
				//get the vertical middle of the item
				var node = obj.item.node;
				var position = geom.position(node, true);
				var y = position.y + position.h/2;
				obj.y = y;
			});
			area.initItems = true;
		},
	
		refreshItems: function(/*Object*/area, /*Integer*/indexItem, /*Object*/size, /*Boolean*/added){
			// summary:
			//		take into account the drop indicator DOM element in order to compute horizontal lines
			// area:
			//		a D&D area object
			// indexItem:
			//		index of a draggable item
			// size:
			//		dropIndicator size
			// added:
			//		boolean to know if a dropIndicator has been added or deleted
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: refreshItems", area, indexItem, size, added);
			if(indexItem == -1){
				return;
			}
			else if(area && size && size.h){
				var height = size.h;
				if(area.margin){
					height += area.margin.t;
				}
				var length = area.items.length;
				for(var i = indexItem; i < length; i++){
					var item = area.items[i];
					if(added){
						item.y += height;
					}
					else{
						item.y -= height;
					}
				}
			}
		},
	
		getDragPoint: function(/*Object*/coords, /*Object*/size, /*Object*/mousePosition){
			// summary:
			//		return coordinates of the draggable item.
			//
			//		- For X point : the x position of mouse
			//		- For Y point : the y position of mouse
			// returns:
			//		an object of coordinates
			//		examples:{'x':10,'y':10}
			// coords:
			//		an object encapsulating X and Y position
			// size:
			//		an object encapsulating width and height values
			// mousePosition:
			//		coordinates of mouse
	
			//console.log("dojox.mdnd.OverDropMode ::: getDragPoint");
			return {			// Object
				'x': mousePosition.x,
				'y': mousePosition.y
				}
		},
	
	
		getTargetArea: function(/*Array*/areaList, /*Object*/ coords, /*integer*/currentIndexArea ){
			// summary:
			//		get the nearest D&D area.
			// areaList:
			//		a list of D&D areas objects
			// coords:
			//		coordinates [x,y] of the dragItem (see getDragPoint())
			// currentIndexArea:
			//		an index representing the active D&D area
			// returns:
			//		the index of the D&D area
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: getTargetArea");
			var index = 0;
			var x = coords.x;
			var y = coords.y;
			var end = areaList.length;
			var start = 0, direction = "right", compute = false;
			if(currentIndexArea == -1 || arguments.length < 3){
				// first time : Need to search the nearest area in all areas.
				compute = true;
			}
			else{
				// check if it's always the same area
				if(this._checkInterval(areaList, currentIndexArea, x, y)){
					index = currentIndexArea;
				}
				else{
					if(this._oldXPoint < x){
						start = currentIndexArea + 1;
					}
					else{
						start = currentIndexArea - 1;
						end = 0;
						direction = "left";
					}
					compute = true;
				}
			}
			if(compute){
				if(direction === "right"){
					for(var i = start; i < end; i++){
						if(this._checkInterval(areaList, i, x, y)){
							index = i;
							break;
						}
					}
					if(i == end){
						index = -1;
					}
				}
				else{
					for(var i = start; i >= end; i--){
						if(this._checkInterval(areaList, i, x, y)){
							index = i;
							break;
						}
					}
					if(i == end-1){
						index = -1;
					}
				}
			}
			this._oldXPoint = x;
			return index; // Integer
		},
	
		_checkInterval: function(/*Array*/areaList, /*Integer*/index, /*Coord*/x, /*Coord*/y){
			// summary:
			//		check if the dragNode is in the interval.
			// returns:
			//		true if the dragNode is in intervall
			// areaList:
			//		a list of D&D areas objects
			// index:
			//		index of a D&D area (to get the interval)
			// x:
			//		coordinate x, of the dragNode (see getDragPoint())
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: _checkInterval");
			var area = areaList[index];
			var node = area.node;
			var coords = area.coords;
			var startX = coords.x;
			var endX = coords.x2;
			var startY = coords.y;
			var endY = startY + node.offsetHeight;
			if(startX <= x && x <= endX && startY <= y && y <= endY){
				return true;
			}
			return false; // Boolean
		},
	
		getDropIndex: function(/*Object*/ targetArea, /*Object*/ coords){
			// summary:
			//		Return the index where the drop has to be placed.
			// targetArea:
			//		a D&D area object.
			// coords:
			//		coordinates [x,y] of the draggable item.
			// returns:
			//		a number or -1 if the area has no children or the drop index represents the last position in to the area
	
			//console.log("dojox.mdnd.dropMode.OverDropMode ::: getDropIndex");
			var length = targetArea.items.length;
			var coordinates = targetArea.coords;
			var y = coords.y;
			if(length > 0){
				// course all children in the target area.
				for(var i = 0; i < length; i++){
					// compare y value with y value of children
					if(y < targetArea.items[i].y){
						return i;	// integer
					}
					else{
						if(i == length-1){
							return -1; // integer
						}
					}
				}
			}
			return -1;	//integer
		},
	
		destroy: function(){
			array.forEach(this._dragHandler, connect.disconnect);
		}
	});
	
	dojox.mdnd.areaManager()._dropMode = new dojox.mdnd.dropMode.OverDropMode();
	return odm;
});
