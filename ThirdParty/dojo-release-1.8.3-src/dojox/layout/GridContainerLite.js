define([
	"dojo/_base/kernel",
	"dojo/text!./resources/GridContainer.html",
	"dojo/_base/declare", // declare 
	"dojo/query",
	"dojo/_base/sniff",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/dom-attr", // domAttr.get
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/keys", // keys
	"dojo/topic", // topic.publish()
	"dijit/registry",
	"dijit/focus",
	"dijit/_base/focus", // dijit.getFocus()
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/layout/_LayoutWidget",
	"dojo/_base/NodeList",
	"dojox/mdnd/AreaManager", "dojox/mdnd/DropIndicator",
	"dojox/mdnd/dropMode/OverDropMode","dojox/mdnd/AutoScroll"
],function(dojo, template, declare, query, has, domClass, domStyle, geom, domConstruct, domAttr, array, lang, events, keys, topic, registry, focus, baseFocus, _WidgetBase, _TemplatedMixin, _LayoutWidget, NodeList){

	var gcl = declare(
		"dojox.layout.GridContainerLite",
		[_LayoutWidget, _TemplatedMixin],
	{
		// summary:
		//		The GridContainerLite is a container of child elements that are placed in a kind of grid.
		//
		// description:
		//		GridContainerLite displays the child elements by column
		//		(ie: the children widths are fixed by the column width of the grid but
		//		the children heights are free).
		//		Each child is movable by drag and drop inside the GridContainer.
		//		The position of other children is automatically calculated when a child is moved.
		//
		// example:
		// 	|	<div dojoType="dojox.layout.GridContainerLite" nbZones="3" isAutoOrganized="true">
		// 	|		<div dojoType="dijit.layout.ContentPane">Content Pane 1 : Drag Me !</div>
		// 	|		<div dojoType="dijit.layout.ContentPane">Content Pane 2 : Drag Me !</div>
		// 	|		<div dojoType="dijit.layout.ContentPane">Content Pane 3 : Drag Me !</div>
		// 	|	</div>
		//
		// example:
		// 	|	dojo.ready(function(){
		// 	|		var cpane1 = new dijit.layout.ContentPane({
		//	|			title:"cpane1", content: "Content Pane 1 : Drag Me !"
		//	|		}),
		// 	|		cpane2 = new dijit.layout.ContentPane({
		//	|			title:"cpane2",
		//	|			content: "Content Pane 2 : Drag Me !"
		//	|		}),
		// 	|		cpane3 = new dijit.layout.ContentPane({
		//	|			title:"cpane3",
		//	|			content: "Content Pane 3 : Drag Me !"
		//	|		});
		// 	|
		// 	|		var widget = new dojox.layout.GridContainerLite({
		// 	|			nbZones: 3,
		// 	|			isAutoOrganized: true
		// 	|		}, dojo.byId("idNode"));
		// 	|		widget.addChild(cpane1, 0, 0);
		// 	|		widget.addChild(cpane2, 1, 0);
		// 	|		widget.addChild(cpane3, 2, 1);
		// 	|		widget.startup();
		// 	|	});

		// autoRefresh: Boolean
		//		Enable the refresh of registered areas on drag start.
		autoRefresh: true,


		// templateString: String
		//		template of gridContainer.
		templateString: template,

		// dragHandleClass: Array
		//		CSS class enabling a drag handle on a child.
		dragHandleClass: "dojoxDragHandle",

		// nbZones: Integer
		//		The number of dropped zones, by default 1.
		nbZones: 1,

		// doLayout: Boolean
		//		If true, change the size of my currently displayed child to match my size.
		doLayout: true,

		// isAutoOrganized: Boolean
		//		If true, widgets are organized automatically,
		//		else the attribute colum of child will define the right column.
		isAutoOrganized: true,

		// acceptTypes: Array
		//		The GridContainer will only accept the children that fit to the types.
		acceptTypes: [],

		// colWidths: String
		//		A comma separated list of column widths. If the column widths do not add up
		//		to 100, the remaining columns split the rest of the width evenly
		//		between them.
		colWidths: "",

		constructor: function(/*Object*/props, /*DOMNode*/node){
			this.acceptTypes = (props || {}).acceptTypes || ["text"];
			this._disabled = true;
		},

		postCreate: function(){
			//console.log("dojox.layout.GridContainerLite ::: postCreate");
			this.inherited(arguments);
			this._grid = [];

			this._createCells();

			// need to resize dragged child when it's dropped.
			this.subscribe("/dojox/mdnd/drop", "resizeChildAfterDrop");
			this.subscribe("/dojox/mdnd/drag/start", "resizeChildAfterDragStart");

			this._dragManager = dojox.mdnd.areaManager();
			// console.info("autorefresh ::: ", this.autoRefresh);
			this._dragManager.autoRefresh = this.autoRefresh;

			//	Add specific dragHandleClass to the manager.
			this._dragManager.dragHandleClass = this.dragHandleClass;

			if(this.doLayout){
				this._border = {
					h: has("ie") ? geom.getBorderExtents(this.gridContainerTable).h : 0,
					w: (has("ie") == 6) ? 1 : 0
				}
			}else{
				domStyle.set(this.domNode, "overflowY", "hidden");
				domStyle.set(this.gridContainerTable, "height", "auto");
			}
		},

		startup: function(){
			//console.log("dojox.layout.GridContainerLite ::: startup");
			if(this._started){ return; }

			if(this.isAutoOrganized){
				this._organizeChildren();
			}
			else{
				this._organizeChildrenManually();
			}

			// Need to call getChildren because getChildren return null
			// The children are not direct children because of _organizeChildren method
			array.forEach(this.getChildren(), function(child){ 
			  child.startup();
			});

			// Need to enable the Drag And Drop only if the GridContainer is visible.
			if(this._isShown()){
				this.enableDnd();
			}
			this.inherited(arguments);
		},

		resizeChildAfterDrop: function(/*Node*/node, /*Object*/targetArea, /*Integer*/indexChild){
			// summary:
			//		Resize the GridContainerLite inner table and the dropped widget.
			// description:
			//		These components are resized only if the targetArea.node is a
			//		child of this instance of gridContainerLite.
			//		To be resized, the dropped node must have also a method resize.
			// node:
			//		domNode of dropped widget.
			// targetArea:
			//		AreaManager Object containing information of targetArea
			// indexChild:
			//		Index where the dropped widget has been placed
			// returns:
			//		True if resized.

			//console.log("dojox.layout.GridContainerLite ::: resizeChildAfterDrop");
			if(this._disabled){
				return false;
			}
			if(registry.getEnclosingWidget(targetArea.node) == this){
				var widget = registry.byNode(node);
				if(widget.resize && lang.isFunction(widget.resize)){
					widget.resize();
				}

				// Update the column of the widget
				widget.set("column", node.parentNode.cellIndex);

				if(this.doLayout){
					var domNodeHeight = this._contentBox.h,
						divHeight = geom.getContentBox(this.gridContainerDiv).h;
					if(divHeight >= domNodeHeight){
						domStyle.set(this.gridContainerTable, "height",
								(domNodeHeight - this._border.h) + "px");
					}
				}
				return true;
			}
			return false;
		},

		resizeChildAfterDragStart: function(/*Node*/node, /*Object*/sourceArea, /*Integer*/indexChild){
			// summary:
			//		Resize the GridContainerLite inner table only if the drag source
			//		is a child of this gridContainer.
			// node:
			//		domNode of dragged widget.
			// sourceArea:
			//		AreaManager Object containing information of sourceArea
			// indexChild:
			//		Index where the dragged widget has been placed

			//console.log("dojox.layout.GridContainerLite ::: resizeChildAfterDragStart");
			if(this._disabled){
				return false;
			}
			if(registry.getEnclosingWidget(sourceArea.node) == this){
				this._draggedNode = node;
				if(this.doLayout){
					geom.getMarginBox(this.gridContainerTable, {
						h: geom.getContentBox(this.gridContainerDiv).h - this._border.h
					});
				}
				return true;
			}
			return false;
		},

		getChildren: function(){
			// summary:
			//		A specific method which returns children after they were placed in zones.
			// returns:
			//		A NodeList containing all children (widgets).
			// tags:
			//		protected

			var children = new NodeList();
			array.forEach(this._grid, function(dropZone){
				query("> [widgetId]", dropZone.node).map(registry.byNode).forEach(function(item){
				  children.push(item);
				});
			});
			return children;	// Array
		},

		_isShown: function(){
			// summary:
			//		Check if the domNode is visible or not.
			// returns:
			//		true if the content is currently shown
			// tags:
			//		protected

			//console.log("dojox.layout.GridContainerLite ::: _isShown");
			if("open" in this){		// for TitlePane, etc.
				return this.open;		// Boolean
			}
			else{
				var node = this.domNode;
				return (node.style.display != 'none') && (node.style.visibility != 'hidden') && !domClass.contains(node, "dijitHidden"); // Boolean
			}
		},

		layout: function(){
			// summary:
			//		Resize of each child

			//console.log("dojox.layout.GridContainerLite ::: layout");
			if(this.doLayout){
				var contentBox = this._contentBox;
				geom.getMarginBox(this.gridContainerTable, {
					h: contentBox.h - this._border.h
				});
				geom.getContentBox(this.domNode, {
					w: contentBox.w - this._border.w
				});
			}
			array.forEach(this.getChildren(), function(widget){
				if(widget.resize && lang.isFunction(widget.resize)){
					widget.resize();
				}
			});
		},

		onShow: function(){
			// summary:
			//		Enabled the Drag And Drop if it's necessary.

			//console.log("dojox.layout.GridContainerLite ::: onShow");
			if(this._disabled){
				this.enableDnd();
			}
		},

		onHide: function(){
			// summary:
			//		Disabled the Drag And Drop if it's necessary.

			//console.log("dojox.layout.GridContainerLite ::: onHide");
			if(!this._disabled){
				this.disableDnd();
			}
		},

		_createCells: function(){
			// summary:
			//		Create the columns of the GridContainer.
			// tags:
			//		protected

			//console.log("dojox.layout.GridContainerLite ::: _createCells");
			if(this.nbZones === 0){ this.nbZones = 1; }
			var accept = this.acceptTypes.join(","),
				i = 0;

			var origWidths = this.colWidths || [];
			var widths = [];
			var colWidth;
			var widthSum = 0;

			// Calculate the widths of each column.
			for(i = 0; i < this.nbZones; i++){
				if(widths.length < origWidths.length){
					widthSum += origWidths[i];
					widths.push(origWidths[i]);
				}else{
					if(!colWidth){
						colWidth = (100 - widthSum)/(this.nbZones - i);
					}
					widths.push(colWidth);
				}
			}

			i = 0;
			while(i < this.nbZones){
				// Add the parameter accept in each zone used by AreaManager
				// (see method dojox.mdnd.AreaManager:registerByNode)
				this._grid.push({
					node: domConstruct.create("td", {
						'class': "gridContainerZone",
						accept: accept,
						id: this.id + "_dz" + i,
						style: {
							'width': widths[i] + "%"
						}
					}, this.gridNode)
				});
				i++;
			}
		},

		_getZonesAttr: function(){
			// summary:
			//		return array of zone (domNode)
			return query(".gridContainerZone",  this.containerNode);
		},

		enableDnd: function(){
			// summary:
			//		Enable the Drag And Drop for children of GridContainer.

			//console.log("dojox.layout.GridContainerLite ::: enableDnd");
			var m = this._dragManager;
			array.forEach(this._grid, function(dropZone){
				m.registerByNode(dropZone.node);
			});
			m._dropMode.updateAreas(m._areaList);
			this._disabled = false;
		},

		disableDnd: function(){
			// summary:
			//		Disable the Drag And Drop for children of GridContainer.

			//console.log("dojox.layout.GridContainerLite ::: disableDnd");
			var m = this._dragManager;
			array.forEach(this._grid, function(dropZone){
				m.unregister(dropZone.node);
			});
			m._dropMode.updateAreas(m._areaList);
			this._disabled = true;
		},

		_organizeChildren: function(){
			// summary:
			//		List all zones and insert child into columns.

			//console.log("dojox.layout.GridContainerLite ::: _organizeChildren");
			var children = dojox.layout.GridContainerLite.superclass.getChildren.call(this);
			var numZones = this.nbZones,
				numPerZone = Math.floor(children.length / numZones),
				mod = children.length % numZones,
				i = 0;
	//		console.log('numPerZone', numPerZone, ':: mod', mod);
			for(var z = 0; z < numZones; z++){
				for(var r = 0; r < numPerZone; r++){
					this._insertChild(children[i], z);
					i++;
				}
				if(mod > 0){
					try{
						this._insertChild(children[i], z);
						i++;
					}
					catch(e){
						console.error("Unable to insert child in GridContainer", e);
					}
					mod--;
				}
				else if(numPerZone === 0){
					break;	// Optimization
				}
			}
		},

		_organizeChildrenManually: function (){
			// summary:
			//		Organize children by column property of widget.

			//console.log("dojox.layout.GridContainerLite ::: _organizeChildrenManually");
			var children = dojox.layout.GridContainerLite.superclass.getChildren.call(this),
				length = children.length,
				child;
			for(var i = 0; i < length; i++){
				child = children[i];
				try{
					this._insertChild(child, child.column - 1);
				}
				catch(e){
					console.error("Unable to insert child in GridContainer", e);
				}
			}
		},

		_insertChild: function(/*Widget*/child, /*Integer*/column, /*Integer?*/p){
			// summary:
			//		Insert a child in a specific column of the GridContainer widget.
			// column:
			//		Column number
			// p:
			//		Place in the zone (0 - first)
			// returns:
			//		The widget inserted

			//console.log("dojox.layout.GridContainerLite ::: _insertChild", child, column, p);
			var zone = this._grid[column].node,
				length = zone.childNodes.length;
			if(typeof(p) == undefined || p > length){
				p = length;
			}
			if(this._disabled){
				domConstruct.place(child.domNode, zone, p);
				domAttr.set(child.domNode, "tabIndex", "0");
			}
			else{
				if(!child.dragRestriction){
					this._dragManager.addDragItem(zone, child.domNode, p, true);
				}
				else{
					domConstruct.place(child.domNode, zone, p);
					domAttr.set(child.domNode, "tabIndex", "0");
				}
			}
			child.set("column", column);
			return child; // Widget
		},

		removeChild: function(/*Widget*/ widget){
			//console.log("dojox.layout.GridContainerLite ::: removeChild");
			if(this._disabled){
				this.inherited(arguments);
			}
			else{
				this._dragManager.removeDragItem(widget.domNode.parentNode, widget.domNode);
			}
		},

		addService: function(/*Object*/child, /*Integer?*/column, /*Integer?*/p){
			//console.log("dojox.layout.GridContainerLite ::: addService");
			kernel.deprecated("addService is deprecated.", "Please use  instead.", "Future");
			this.addChild(child, column, p);
		},

		addChild: function(/*Object*/child, /*Integer?*/column, /*Integer?*/p){
			// summary:
			//		Add a child in a specific column of the GridContainer widget.
			// child:
			//		widget to insert
			// column:
			//		column number
			// p:
			//		place in the zone (first = 0)
			// returns:
			//		The widget inserted

			//console.log("dojox.layout.GridContainerLite ::: addChild");
			child.domNode.id = child.id;
			dojox.layout.GridContainerLite.superclass.addChild.call(this, child, 0);
			if(column < 0 || column == undefined){ column = 0; }
			if(p <= 0){ p = 0; }
			try{
				return this._insertChild(child, column, p);
			}
			catch(e){
				console.error("Unable to insert child in GridContainer", e);
			}
			return null; 	// Widget
		},

		_setColWidthsAttr: function(value){
			this.colWidths = lang.isString(value) ? value.split(",") : (lang.isArray(value) ? value : [value]);

			if(this._started){
				this._updateColumnsWidth();
			}
		},

		_updateColumnsWidth: function(/*Object*/ manager){
			// summary:
			//		Update the columns width.
			// manager:
			//		dojox.mdnd.AreaManager singleton
			// tags:
			//		private

			//console.log("dojox.layout.GridContainer ::: _updateColumnsWidth");
			var length = this._grid.length;

			var origWidths = this.colWidths || [];
			var widths = [];
			var colWidth;
			var widthSum = 0;
			var i;

			// Calculate the widths of each column.
			for(i = 0; i < length; i++){
				if(widths.length < origWidths.length){
					widthSum += origWidths[i] * 1;
					widths.push(origWidths[i]);
				}else{
					if(!colWidth){
						colWidth = (100 - widthSum)/(this.nbZones - i);

						// If the numbers don't work out, make the remaining columns
						// an even width and let the code below average
						// out the differences.
						if(colWidth < 0){
							colWidth = 100 / this.nbZones;
						}
					}
					widths.push(colWidth);
					widthSum += colWidth * 1;
				}
			}

			// If the numbers are wrong, divide them all so they add up to 100
			if(widthSum > 100){
				var divisor = 100 / widthSum;
				for(i = 0; i < widths.length; i++){
					widths[i] *= divisor;
				}
			}

			// Set the widths of each node
			for(i = 0; i < length; i++){
				this._grid[i].node.style.width = widths[i] + "%";
			}
		},

		_selectFocus: function(/*Event*/event){
			// summary:
			//		Enable keyboard accessibility into the GridContainer.
			// description:
			//		Possibility to move focus into the GridContainer (TAB, LEFT ARROW, RIGHT ARROW, UP ARROW, DOWN ARROW).
			//		Possibility to move GridContainer's children (Drag and Drop) with keyboard. (SHIFT +  ARROW).
			//		If the type of widget is not draggable, a popup is displayed.

			//console.log("dojox.layout.GridContainerLite ::: _selectFocus");
			if(this._disabled){ return; }
			var key = event.keyCode,
				k = keys,
				zone = null,
				cFocus = baseFocus.getFocus(),
				focusNode = cFocus.node,
				m = this._dragManager,
				found,
				i,
				j,
				r,
				children,
				area,
				widget;
			if(focusNode == this.containerNode){
				area = this.gridNode.childNodes;
				switch(key){
					case k.DOWN_ARROW:
					case k.RIGHT_ARROW:
						found = false;
						for(i = 0; i < area.length; i++){
							children = area[i].childNodes;
							for(j = 0; j < children.length; j++){
								zone = children[j];
								if(zone != null && zone.style.display != "none"){
									focus.focus(zone);
									events.stop(event);
									found = true;
									break;
								}
							}
							if(found){ break };
						}
					break;
					case k.UP_ARROW:
					case k.LEFT_ARROW:
						area = this.gridNode.childNodes;
						found = false;
						for(i = area.length-1; i >= 0 ; i--){
							children = area[i].childNodes;
							for(j = children.length; j >= 0; j--){
								zone = children[j];
								if(zone != null && zone.style.display != "none"){
									focus.focus(zone);
									events.stop(event);
									found = true;
									break;
								}
							}
							if(found){ break };
						}
					break;
				}
			}
			else{
				if(focusNode.parentNode.parentNode == this.gridNode){
					var child = (key == k.UP_ARROW || key == k.LEFT_ARROW) ? "lastChild" : "firstChild";
					var pos = (key == k.UP_ARROW || key == k.LEFT_ARROW) ? "previousSibling" : "nextSibling";
					switch(key){
						case k.UP_ARROW:
						case k.DOWN_ARROW:
							events.stop(event);
							found = false;
							var focusTemp = focusNode;
							while(!found){
								children = focusTemp.parentNode.childNodes;
								var num = 0;
								for(i = 0; i < children.length; i++){
									if(children[i].style.display != "none"){ num++ };
									if(num > 1){ break; }
								}
								if(num == 1){ return; }
								if(focusTemp[pos] == null){
									zone = focusTemp.parentNode[child];
								}
								else{
									zone = focusTemp[pos];
								}
								if(zone.style.display === "none"){
									focusTemp = zone;
								}
								else{
									found = true;
								}
							}
							if(event.shiftKey){
								var parent = focusNode.parentNode;
								for(i = 0; i < this.gridNode.childNodes.length; i++){
									if(parent == this.gridNode.childNodes[i]){
										break;
									}
								}
								children = this.gridNode.childNodes[i].childNodes;
								for(j = 0; j < children.length; j++){
									if(zone == children[j]){
										break;
									}
								}
								if(has("mozilla") || has("webkit")){ i-- };

								widget = registry.byNode(focusNode);
								if(!widget.dragRestriction){
									r = m.removeDragItem(parent, focusNode);
									this.addChild(widget, i, j);
									domAttr.set(focusNode, "tabIndex", "0");
									focus.focus(focusNode);
								}
								else{
									topic.publish("/dojox/layout/gridContainer/moveRestriction", this);
								}
							}
							else{
								focus.focus(zone);
							}
						break;
						case k.RIGHT_ARROW:
						case k.LEFT_ARROW:
							events.stop(event);
							if(event.shiftKey){
								var z = 0;
								if(focusNode.parentNode[pos] == null){
									if(has("ie") && key == k.LEFT_ARROW){
										z = this.gridNode.childNodes.length-1;
									}
								}
								else if(focusNode.parentNode[pos].nodeType == 3){
									z = this.gridNode.childNodes.length - 2;
								}
								else{
									for(i = 0; i < this.gridNode.childNodes.length; i++){
										if(focusNode.parentNode[pos] == this.gridNode.childNodes[i]){
											break;
										}
										z++;
									}
									if(has("mozilla") || has("webkit")){ z-- };
								}
								widget = registry.byNode(focusNode);
								var _dndType = focusNode.getAttribute("dndtype");
								if(_dndType == null){
									//check if it's a dijit object
									if(widget && widget.dndType){
										_dndType = widget.dndType.split(/\s*,\s*/);
									}
									else{
										_dndType = ["text"];
									}
								}
								else{
									_dndType = _dndType.split(/\s*,\s*/);
								}
								var accept = false;
								for(i = 0; i < this.acceptTypes.length; i++){
									for(j = 0; j < _dndType.length; j++){
										if(_dndType[j] == this.acceptTypes[i]){
											accept = true;
											break;
										}
									}
								}
								if(accept && !widget.dragRestriction){
									var parentSource = focusNode.parentNode,
										place = 0;
									if(k.LEFT_ARROW == key){
										var t = z;
										if(has("mozilla") || has("webkit")){ t = z + 1 };
										place = this.gridNode.childNodes[t].childNodes.length;
									}
									// delete of manager :
									r = m.removeDragItem(parentSource, focusNode);
									this.addChild(widget, z, place);
									domAttr.set(r, "tabIndex", "0");
									focus.focus(r);
								}
								else{
									topic.publish("/dojox/layout/gridContainer/moveRestriction", this);
								}
							}
							else{
								var node = focusNode.parentNode;
								while(zone === null){
									if(node[pos] !== null && node[pos].nodeType !== 3){
										node = node[pos];
									}
									else{
										if(pos === "previousSibling"){
											node = node.parentNode.childNodes[node.parentNode.childNodes.length-1];
										}
										else{
											node = node.parentNode.childNodes[has("ie") ? 0 : 1];
										}
									}
									zone = node[child];
									if(zone && zone.style.display == "none"){
										// check that all elements are not hidden
										children = zone.parentNode.childNodes;
										var childToSelect = null;
										if(pos == "previousSibling"){
											for(i = children.length-1; i >= 0; i--){
												if(children[i].style.display != "none"){
													childToSelect = children[i];
													break;
												}
											}
										}
										else{
											for(i = 0; i < children.length; i++){
												if(children[i].style.display != "none"){
													childToSelect = children[i];
													break;
												}
											}
										}
										if(!childToSelect){
											focusNode = zone;
											node = focusNode.parentNode;
											zone = null;
										}
										else{
											zone = childToSelect;
										}
									}
								}
								focus.focus(zone);
							}
						break;
					}
				}
			}
		},

		destroy: function(){
			//console.log("dojox.layout.GridContainerLite ::: destroy");
			var m = this._dragManager;
			array.forEach(this._grid, function(dropZone){
				m.unregister(dropZone.node);
			});
			this.inherited(arguments);
		}
	});

	gcl.ChildWidgetProperties = {
		// summary:
		//		Properties set on children of a GridContainerLite

		// column: String
		//		Column of the grid to place the widget.
		//		Defined only if dojo.require("dojox.layout.GridContainerLite") is done.
		column: "1",

		// dragRestriction: Boolean
		//		If true, the widget can not be draggable.
		//		Defined only if dojo.require("dojox.layout.GridContainerLite") is done.
		dragRestriction: false
	};

	// Add to widget base for benefit of parser.   Remove for 2.0.   Also, hide from doc viewer.
	lang.extend(_WidgetBase, /*===== {} || =====*/ gcl.ChildWidgetProperties);

	return gcl;
});
