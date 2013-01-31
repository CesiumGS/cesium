define([
	"dojo/_base/kernel",
	"dojo/_base/declare", // declare 
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/sniff",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/ready",	// dojo.ready
	"dojox/layout/GridContainerLite"
],function(dojo, declare, array, connect, has, domClass, domStyle, geom, domConstruct, lang, win, ready, GridContainerLite){
	return declare(
		"dojox.layout.GridContainer",
		GridContainerLite,
	{
		// summary:
		//		A grid containing any kind of objects and acting like web portals.
		//
		// description:
		//		This component inherits of all features of gridContainerLite plus :
		//
		//		- Resize colums
		//		- Add / remove columns
		//		- Fix columns at left or at right.
		// example:
		// 	|	<div dojoType="dojox.layout.GridContainer" nbZones="3" isAutoOrganized="true">
		// 	|		<div dojoType="dijit.layout.ContentPane">Content Pane 1 : Drag Me !</div>
		// 	|		<div dojoType="dijit.layout.ContentPane">Content Pane 2 : Drag Me !</div>
		// 	|		<div dojoType="dijit.layout.ContentPane">Content Pane 3 : Drag Me !</div>
		// 	|	</div>
		//
		// example:
		// 	|	dojo.ready(function(){
		// 	|		var cpane1 = new dijit.layout.ContentPane({ title:"cpane1", content: "Content Pane 1 : Drag Me !" }),
		// 	|			cpane2 = new dijit.layout.ContentPane({ title:"cpane2", content: "Content Pane 2 : Drag Me !" }),
		// 	|			cpane3 = new dijit.layout.ContentPane({ title:"cpane3", content: "Content Pane 3 : Drag Me !" });
		// 	|
		// 	|		var widget = new dojox.layout.GridContainer({
		// 	|			nbZones: 3,
		// 	|			isAutoOrganized: true
		// 	|		}, dojo.byId("idNode"));
		// 	|		widget.addChild(cpane1, 0, 0);
		// 	|		widget.addChild(cpane2, 1, 0);
		// 	|		widget.addChild(cpane3, 2, 1);
		// 	|		widget.startup();
		// 	|	});

		// hasResizableColumns: Boolean
		//		Allow or not resizing of columns by a grip handle.
		hasResizableColumns: true,

		// liveResizeColumns: Boolean
		//		Specifies whether columns resize as you drag (true) or only upon mouseup (false)
		liveResizeColumns : false,

		// minColWidth: Integer
		//		Minimum column width in percentage.
		minColWidth: 20,

		// minChildWidth: Integer
		//		Minimum children width in pixel (only used for IE6 which doesn't handle min-width css property)
		minChildWidth: 150,

		// mode: String
		//		Location to add/remove columns, must be set to 'left' or 'right' (default).
		mode: "right",

		// isRightFixed: Boolean
		//		Define if the last right column is fixed.
		//		Used when you add or remove columns by calling setColumns method.
		isRightFixed: false,

		// isLeftFixed: Boolean
		//		Define if the last left column is fixed.
		//		Used when you add or remove columns by calling setColumns method.
		isLeftFixed: false,

		startup: function(){
			// summary:
			//		Call the startup of GridContainerLite and place grips
			//		if user has chosen the hasResizableColumns attribute to true.

			//console.log("dojox.layout.GridContainer ::: startup");
			this.inherited(arguments);
			if(this.hasResizableColumns){
				for(var i = 0; i < this._grid.length - 1; i++){
					this._createGrip(i);
				}
				// If widget has a container parent, grips will be placed
				// by method onShow.
				if(!this.getParent()){
					// Fix IE7 :
					//		The CSS property height:100% for the grip
					//		doesn't work anytime. It's necessary to wait
					//		the end of loading before to place grips.
					ready(lang.hitch(this, "_placeGrips"));
				}
			}
		},

		resizeChildAfterDrop : function(/*Node*/node, /*Object*/targetArea, /*Integer*/indexChild){
			// summary:
			//		Call when a child is dropped.
			// description:
			//		Allow to resize and put grips
			// node:
			//		domNode of dropped widget.
			// targetArea:
			//		AreaManager Object containing information of targetArea
			// indexChild:
			//		Index where the dropped widget has been placed

			if(this.inherited(arguments)){
				this._placeGrips();
			}
		},

		onShow: function(){
			// summary:
			//		Place grips in the right place when the GridContainer becomes visible.

			//console.log("dojox.layout.GridContainer ::: onShow");
			this.inherited(arguments);
			this._placeGrips();
		},

		resize: function(){
			// summary:
			//		Resize the GridContainer widget and columns.
			//		Replace grips if it's necessary.
			// tags:
			//		callback

			//console.log("dojox.layout.GridContainer ::: resize");
			this.inherited(arguments);
			// Fix IE6 :
			//		IE6 calls method resize itself.
			//		If the GridContainer is not visible at this time,
			//		the method _placeGrips can return a negative value with
			//		contentBox method. (see method _placeGrip() with Fix Ie6 for the height)
			if(this._isShown() && this.hasResizableColumns){
				this._placeGrips();
			}
		},

		_createGrip: function(/*Integer*/ index){
			// summary:
			//		Create a grip for a specific zone.
			// index:
			//		index where the grip has to be created.
			// tags:
			//		protected

			//console.log("dojox.layout.GridContainer ::: _createGrip");
			var dropZone = this._grid[index],
				grip = domConstruct.create("div", { 'class': "gridContainerGrip" }, this.domNode);
			dropZone.grip = grip;
			dropZone.gripHandler = [
				this.connect(grip, "onmouseover", function(e){
					var gridContainerGripShow = false;
					for(var i = 0; i < this._grid.length - 1; i++){
						if(domClass.contains(this._grid[i].grip, "gridContainerGripShow")){
							gridContainerGripShow = true;
							break;
						}
					}
					if(!gridContainerGripShow){
						domClass.replace(e.target, "gridContainerGripShow", "gridContainerGrip");
					}
				})[0],
				this.connect(grip, "onmouseout", function(e){
					if(!this._isResized){
						domClass.replace(e.target, "gridContainerGrip", "gridContainerGripShow");
					}
				})[0],
				this.connect(grip, "onmousedown", "_resizeColumnOn")[0],
				this.connect(grip, "ondblclick", "_onGripDbClick")[0]
			];
		},

		_placeGrips: function(){
			// summary:
			//		Define the position of a grip and place it on page.
			// tags:
			//		protected

			//console.log("dojox.layout.GridContainer ::: _placeGrips");
			var gripWidth, height, left = 0, grip;
			//var scroll = this.domNode.style.overflowY;

			array.forEach(this._grid, function(dropZone){
				if(dropZone.grip){
					grip = dropZone.grip;
					if(!gripWidth){
						gripWidth = grip.offsetWidth / 2;
					}

					left += geom.getMarginBox(dropZone.node).w;

					domStyle.set(grip, "left", (left - gripWidth) + "px");
					//if(dojo.isIE == 6){ do it fot all navigators
					if(!height){
						height = geom.getContentBox(this.gridNode).h;
					}
					if(height > 0){
						domStyle.set(grip, "height", height + "px");
					}
					//}
				}
			}, this);
		},

		_onGripDbClick: function(){
			// summary:
			//		Called when a double click is catch. Resize all columns with the same width.
			//		The method resize of children have to be called.
			// tags:
			//		callback protected

			//console.log("dojox.layout.GridContainer ::: _onGripDbClick");
			this._updateColumnsWidth(this._dragManager);
			this.resize();
		},

		_resizeColumnOn: function(/*Event*/e){
			// summary:
			//		Connect events to listen the resize action.
			//		Change the type of width columns (% to px).
			//		Calculate the minwidth according to the children.
			// tags:
			//		callback

			//console.log("dojox.layout.GridContainer ::: _resizeColumnOn", e);
			this._activeGrip = e.target;
			this._initX = e.pageX;
			e.preventDefault();

			win.body().style.cursor = "ew-resize";

			this._isResized = true;

			var tabSize = [];
			var grid;
			var i;

			for(i = 0; i < this._grid.length; i++){
				tabSize[i] = geom.getContentBox(this._grid[i].node).w;
			}

			this._oldTabSize = tabSize;

			for(i = 0; i < this._grid.length; i++){
				grid = this._grid[i];
				if(this._activeGrip == grid.grip){
					this._currentColumn = grid.node;
					this._currentColumnWidth = tabSize[i];
					this._nextColumn = this._grid[i + 1].node;
					this._nextColumnWidth = tabSize[i + 1];
				}
				grid.node.style.width = tabSize[i] + "px";
			}

			// calculate the minWidh of all children for current and next column
			var calculateChildMinWidth = function(childNodes, minChild){
				var width = 0;
				var childMinWidth = 0;

				array.forEach(childNodes, function(child){
					if(child.nodeType == 1){
						var objectStyle = domStyle.getComputedStyle(child);
						var minWidth = (has("ie")) ? minChild : parseInt(objectStyle.minWidth);

						childMinWidth = minWidth +
									parseInt(objectStyle.marginLeft) +
									parseInt(objectStyle.marginRight);

						if(width < childMinWidth){
							width = childMinWidth;
						}
					}
				});
				return width;
			};
			var currentColumnMinWidth = calculateChildMinWidth(this._currentColumn.childNodes, this.minChildWidth);

			var nextColumnMinWidth = calculateChildMinWidth(this._nextColumn.childNodes, this.minChildWidth);

			var minPix = Math.round((geom.getMarginBox(this.gridContainerTable).w * this.minColWidth) / 100);

			this._currentMinCol = currentColumnMinWidth;
			this._nextMinCol = nextColumnMinWidth;

			if(minPix > this._currentMinCol){
				this._currentMinCol = minPix;
			}
			if(minPix > this._nextMinCol){
				this._nextMinCol = minPix;
			}
			this._connectResizeColumnMove = connect.connect(win.doc, "onmousemove", this, "_resizeColumnMove");
			this._connectOnGripMouseUp = connect.connect(win.doc, "onmouseup", this, "_onGripMouseUp");
		},

		_onGripMouseUp: function(){
			// summary:
			//		Call on the onMouseUp only if the reiszeColumnMove was not called.
			// tags:
			//		callback

			//console.log(dojox.layout.GridContainer ::: _onGripMouseUp");
			win.body().style.cursor = "default";

			connect.disconnect(this._connectResizeColumnMove);
			connect.disconnect(this._connectOnGripMouseUp);

			this._connectOnGripMouseUp = this._connectResizeColumnMove = null;

			if(this._activeGrip){
				domClass.replace(this._activeGrip, "gridContainerGrip", "gridContainerGripShow");
			}

			this._isResized = false;
		},

		_resizeColumnMove: function(/*Event*/e){
			// summary:
			//		Change columns size.
			// tags:
			//		callback

			//console.log("dojox.layout.GridContainer ::: _resizeColumnMove");
			e.preventDefault();
			if(!this._connectResizeColumnOff){
				connect.disconnect(this._connectOnGripMouseUp);
				this._connectOnGripMouseUp = null;
				this._connectResizeColumnOff = connect.connect(win.doc, "onmouseup", this, "_resizeColumnOff");
			}

			var d = e.pageX - this._initX;
			if(d == 0){ return; }

			if(!(this._currentColumnWidth + d < this._currentMinCol ||
					this._nextColumnWidth - d < this._nextMinCol)){

				this._currentColumnWidth += d;
				this._nextColumnWidth -= d;
				this._initX = e.pageX;
				this._activeGrip.style.left = parseInt(this._activeGrip.style.left) + d + "px";

				if(this.liveResizeColumns){
					this._currentColumn.style["width"] = this._currentColumnWidth + "px";
					this._nextColumn.style["width"] = this._nextColumnWidth + "px";
					this.resize();
				}
			}
		},

		_resizeColumnOff: function(/*Event*/e){
			// summary:
			//		Disconnect resize events.
			//		Change the type of width columns (px to %).
			// tags:
			//		callback

			//console.log("dojox.layout.GridContainer ::: _resizeColumnOff");
			win.body().style.cursor = "default";

			connect.disconnect(this._connectResizeColumnMove);
			connect.disconnect(this._connectResizeColumnOff);

			this._connectResizeColumnOff = this._connectResizeColumnMove = null;

			if(!this.liveResizeColumns){
				this._currentColumn.style["width"] = this._currentColumnWidth + "px";
				this._nextColumn.style["width"] = this._nextColumnWidth + "px";
				//this.resize();
			}

			var tabSize = [],
				testSize = [],
				tabWidth = this.gridContainerTable.clientWidth,
				node,
				update = false,
				i;

			for(i = 0; i < this._grid.length; i++){
				node = this._grid[i].node;
				if(has("ie")){
					tabSize[i] = geom.getMarginBox(node).w;
					testSize[i] = geom.getContentBox(node).w;
				}
				else{
					tabSize[i] = geom.getContentBox(node).w;
					testSize = tabSize;
				}
			}

			for(i = 0; i < testSize.length; i++){
				if(testSize[i] != this._oldTabSize[i]){
					update = true;
					break;
				}
			}

			if(update){
				var mul = has("ie") ? 100 : 10000;
				for(i = 0; i < this._grid.length; i++){
					this._grid[i].node.style.width = Math.round((100 * mul * tabSize[i]) / tabWidth) / mul + "%";
				}
				this.resize();
			}

			if(this._activeGrip){
				domClass.replace(this._activeGrip, "gridContainerGrip", "gridContainerGripShow");
			}

			this._isResized = false;
		},

		setColumns: function(/*Integer*/nbColumns){
			// summary:
			//		Set the number of columns.
			// nbColumns:
			//		Number of columns

			//console.log("dojox.layout.GridContainer ::: setColumns");
			var z, j;
			if(nbColumns > 0){
				var length = this._grid.length,
					delta = length - nbColumns;
				if(delta > 0){
					var count = [], zone, start, end, nbChildren;
					// Check if right or left columns are fixed
					// Columns are not taken in account and can't be deleted
					if(this.mode == "right"){
						end = (this.isLeftFixed && length > 0) ? 1 : 0;
						start = (this.isRightFixed) ? length - 2 : length - 1
						for(z = start; z >= end; z--){
							nbChildren = 0;
							zone = this._grid[z].node;
							for(j = 0; j < zone.childNodes.length; j++){
								if(zone.childNodes[j].nodeType == 1 && !(zone.childNodes[j].id == "")){
									nbChildren++;
									break;
								}
							}
							if(nbChildren == 0){ count[count.length] = z; }
							if(count.length >= delta){
								this._deleteColumn(count);
								break;
							}
						}
						if(count.length < delta){
							connect.publish("/dojox/layout/gridContainer/noEmptyColumn", [this]);
						}
					}
					else{ // mode = "left"
						start = (this.isLeftFixed && length > 0) ? 1 : 0;
						end = (this.isRightFixed) ? length - 1 : length;
						for(z = start; z < end; z++){
							nbChildren = 0;
							zone = this._grid[z].node;
							for(j = 0; j < zone.childNodes.length; j++){
								if(zone.childNodes[j].nodeType == 1 && !(zone.childNodes[j].id == "")){
									nbChildren++;
									break;
								}
							}
							if(nbChildren == 0){ count[count.length] = z; }
							if(count.length >= delta){
								this._deleteColumn(count);
								break;
							}
						}
						if(count.length < delta){
							//Not enough empty columns
							connect.publish("/dojox/layout/gridContainer/noEmptyColumn", [this]);
						}
					}
				}
				else{
					if(delta < 0){ this._addColumn(Math.abs(delta)); }
				}
				if(this.hasResizableColumns){ this._placeGrips(); }
			}
		},

		_addColumn: function(/*Integer*/nbColumns){
			// summary:
			//		Add some columns.
			// nbColumns:
			//		Number of column to added
			// tags:
			//		private

			//console.log("dojox.layout.GridContainer ::: _addColumn");
			var grid = this._grid,
				dropZone,
				node,
				index,
				length,
				isRightMode = (this.mode == "right"),
				accept = this.acceptTypes.join(","),
				m = this._dragManager;

			//Add a grip to the last column
			if(this.hasResizableColumns && ((!this.isRightFixed && isRightMode)
				|| (this.isLeftFixed && !isRightMode && this.nbZones == 1) )){
				this._createGrip(grid.length - 1);
			}

			for(var i = 0; i < nbColumns; i++){
				// Fix CODEX defect #53025 :
				//		Apply acceptType attribute on each new column.
				node = domConstruct.create("td", {
					'class': "gridContainerZone dojoxDndArea" ,
					'accept': accept,
					'id': this.id + "_dz" + this.nbZones
				});

				length = grid.length;

				if(isRightMode){
					if(this.isRightFixed){
						index = length - 1;
						grid.splice(index, 0, {
							'node': grid[index].node.parentNode.insertBefore(node, grid[index].node)
						});
					}
					else{
						index = length;
						grid.push({ 'node': this.gridNode.appendChild(node) });
					}
				}
				else{
					if(this.isLeftFixed){
						index = (length == 1) ? 0 : 1;
						this._grid.splice(1, 0, {
							'node': this._grid[index].node.parentNode.appendChild(node, this._grid[index].node)
						});
						index = 1;
					}
					else{
						index = length - this.nbZones;
						this._grid.splice(index, 0, {
							'node': grid[index].node.parentNode.insertBefore(node, grid[index].node)
						});
					}
				}
				if(this.hasResizableColumns){
					//Add a grip to resize columns
					if((!isRightMode && this.nbZones != 1) ||
							(!isRightMode && this.nbZones == 1 && !this.isLeftFixed) ||
								(isRightMode && i < nbColumns-1) ||
									(isRightMode && i == nbColumns-1 && this.isRightFixed)){
						this._createGrip(index);
					}
				}
				// register tnbZoneshe new area into the areaManager
				m.registerByNode(grid[index].node);
				this.nbZones++;
			}
			this._updateColumnsWidth(m);
		},

		_deleteColumn: function(/*Array*/indices){
			// summary:
			//		Remove some columns with indices passed as an array.
			// indices:
			//		Column index array
			// tags:
			//		private

			//console.log("dojox.layout.GridContainer ::: _deleteColumn");
			var child, grid, index,
				nbDelZones = 0,
				length = indices.length,
				m = this._dragManager;
			for(var i = 0; i < length; i++){
				index = (this.mode == "right") ? indices[i] : indices[i] - nbDelZones;
				grid = this._grid[index];

				if(this.hasResizableColumns && grid.grip){
					array.forEach(grid.gripHandler, function(handler){
						connect.disconnect(handler);
					});
					domConstruct.destroy(this.domNode.removeChild(grid.grip));
					grid.grip = null;
				}

				m.unregister(grid.node);
				domConstruct.destroy(this.gridNode.removeChild(grid.node));
				this._grid.splice(index, 1);
				this.nbZones--;
				nbDelZones++;
			}

			// last grip
			var lastGrid = this._grid[this.nbZones-1];
			if(lastGrid.grip){
				array.forEach(lastGrid.gripHandler, connect.disconnect);
				domConstruct.destroy(this.domNode.removeChild(lastGrid.grip));
				lastGrid.grip = null;
			}

			this._updateColumnsWidth(m);
		},

		_updateColumnsWidth: function(/*Object*/ manager){
			// summary:
			//		Update the columns width.
			// manager:
			//		dojox.mdnd.AreaManager singleton
			// tags:
			//		private

			//console.log("dojox.layout.GridContainer ::: _updateColumnsWidth");
			this.inherited(arguments);
			manager._dropMode.updateAreas(manager._areaList);
		},

		destroy: function(){
			connect.unsubscribe(this._dropHandler);
			this.inherited(arguments);
		}
	});
});
