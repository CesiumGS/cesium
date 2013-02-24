define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/event",
	"dojo/keys",
	"dojo/query",
	"dojo/_base/html",
	"dojo/_base/window",
	"dijit/focus",
	"../../_RowSelector",
	"../_Plugin",
	"../../EnhancedGrid",
	"../../cells/_base",
	"./AutoScroll"
], function(dojo, lang, declare, array, event, keys, query, html, win, dijitFocus, _RowSelector, _Plugin, EnhancedGrid){

/*=====
declare("__SelectItem", null,{
	// summary:
	//		An abstract representation of an item.
});
declare("__SelectCellItem", __SelectItem,{
	// summary:
	//		An abstract representation of a cell.
	
	// row: Integer
	//		Row index of this cell
	row: 0,
	
	// col: Integer
	//		Column index of this cell
	col: 0
});
declare("__SelectRowItem", __SelectItem,{
	// summary:
	//		An abstract representation of a row.
	
	// row: Integer
	//		Row index of this row
	row: 0,
	
	// except: Integer[]
	//		An array of column indexes of all the unselected cells in this row.
	except: []
});
declare("__SelectColItem", __SelectItem,{
	// summary:
	//		An abstract representation of a column.
	
	// col: Integer
	//		Column index of this column
	col: 0,
	
	// except: Integer[]
	//		An array of row indexes of all the unselected cells in this column.
	except: []
});
=====*/

var DISABLED = 0, SINGLE = 1, MULTI = 2,
	_theOther = { col: "row", row: "col" },
	_inRange = function(type, value, start, end, halfClose){
		if(type !== "cell"){
			value = value[type];
			start = start[type];
			end = end[type];
			if(typeof value !== "number" || typeof start !== "number" || typeof end !== "number"){
				return false;
			}
			return halfClose ? ((value >= start && value < end) || (value > end && value <= start))
							: ((value >= start && value <= end) || (value >= end && value <= start));
		}else{
			return _inRange("col", value, start, end, halfClose) && _inRange("row", value, start, end, halfClose);
		}
	},
	_isEqual = function(type, v1, v2){
		try{
			if(v1 && v2){
				switch(type){
					case "col": case "row":
						return v1[type] == v2[type] && typeof v1[type] == "number" &&
								!(_theOther[type] in v1) && !(_theOther[type] in v2);
					case "cell":
						return v1.col == v2.col && v1.row == v2.row && typeof v1.col == "number" && typeof v1.row == "number";
				}
			}
		}catch(e){}
		return false;
	},
	_stopEvent = function(evt){
		try{
			if(evt && evt.preventDefault){
				event.stop(evt);
			}
		}catch(e){}
	},
	_createItem = function(type, rowIndex, colIndex){
		switch(type){
			case "col":
				return {
					"col": typeof colIndex == "undefined" ? rowIndex : colIndex,
					"except": []
				};
			case "row":
				return {
					"row": rowIndex,
					"except": []
				};
			case "cell":
				return {
					"row": rowIndex,
					"col": colIndex
				};
		}
		return null;
	};
var Selector = declare("dojox.grid.enhanced.plugins.Selector", _Plugin, {
	// summary:
	//		Provides standard extended selection for grid.
	//		Supports mouse/keyboard selection, multi-selection, and de-selection.
	//
	//		Acceptable plugin parameters:
	//		The whole plugin parameter object is a config object passed to the setupConfig function.
	//
	//		Acceptable cell parameters defined in layout:
	//
	//		1. notselectable: Boolean: Whether this column is (and all the cells in it are) selectable.
	
	// name: String
	//		plugin name
	name: "selector",

	// noClear: Boolean
	//		Not to clear rows selected by IndirectSelection.
/*
	//	_config: null,
	//	_enabled: true,
	//	_selecting: {
	//		row: false,
	//		col: false,
	//		cell: false
	//	},
	//	_selected: {
	//		row: [],
	//		col: [],
	//		cell: []
	//	},
	//	_startPoint: {},
	//	_currentPoint: {},
	//	_lastAnchorPoint: {},
	//	_lastEndPoint: {},
	//	_lastSelectedAnchorPoint: {},
	//	_lastSelectedEndPoint: {},
	//	_keyboardSelect: {
	//		row: 0,
	//		col: 0,
	//		cell: 0
	//	},
	//	_curType: null,
	//	_lastType: null,
	//	_usingKeyboard: false,
	//	_toSelect: true,
*/

	constructor: function(grid, args){
		this.grid = grid;
		this._config = {
			row: MULTI,
			col: MULTI,
			cell: MULTI
		};
		this.noClear = args && args.noClear;
		this.setupConfig(args);
		if(grid.selectionMode === "single"){
			this._config.row = SINGLE;
		}
		this._enabled = true;
		this._selecting = {};
		this._selected = {
			"col": [],
			"row": [],
			"cell": []
		};
		this._startPoint = {};
		this._currentPoint = {};
		this._lastAnchorPoint = {};
		this._lastEndPoint = {};
		this._lastSelectedAnchorPoint = {};
		this._lastSelectedEndPoint = {};
		this._keyboardSelect = {};
		this._lastType = null;
		this._selectedRowModified = {};
		this._hacks();
		this._initEvents();
		this._initAreas();
		this._mixinGrid();
	},
	destroy: function(){
		this.inherited(arguments);
	},
	//------------public--------------------
	setupConfig: function(config){
		// summary:
		//		Set selection mode for row/col/cell.
		// config: Object
		//		An object with the following structure (all properties are optional):
		// |	{
		// |		//Default is "multi", all other values are same as "multi".
		// |		row: false|"disabled"|"single",
		// |		col: false|"disabled"|"single",
		// |		cell: false|"disabled"|"single"
		// |	}
		if(!config || !lang.isObject(config)){
			return;
		}
		var types = ["row", "col", "cell"];
		for(var type in config){
			if(array.indexOf(types, type) >= 0){
				if(!config[type] || config[type] == "disabled"){
					this._config[type] = DISABLED;
				}else if(config[type] == "single"){
					this._config[type] = SINGLE;
				}else{
					this._config[type] = MULTI;
				}
			}
		}
		
		//Have to set mode to default grid selection.
		var mode = ["none","single","extended"][this._config.row];
		this.grid.selection.setMode(mode);
	},
	isSelected: function(type, rowIndex, colIndex){
		// summary:
		//		Check whether a location (a cell, a column or a row) is selected.
		// tags:
		//		public
		// type: String
		//		"row" or "col" or "cell"
		// rowIndex: Integer
		//		If type is "row" or "cell", this is the row index.
		//		If type if "col", this is the column index.
		// colIndex: Integer?
		//		Only valid when type is "cell"
		// returns: Boolean
		//		true if selected, false if not. If cell is covered by a selected column, it's selected.
		return this._isSelected(type, _createItem(type, rowIndex, colIndex));
	},
	toggleSelect: function(type, rowIndex, colIndex){
		this._startSelect(type, _createItem(type, rowIndex, colIndex), this._config[type] === MULTI, false, false, !this.isSelected(type, rowIndex, colIndex));
		this._endSelect(type);
	},
	select: function(type, rowIndex, colIndex){
		// summary:
		//		Select a location (a cell, a column or a row).
		// tags:
		//		public
		// type: String
		//		"row" or "col" or "cell"
		// rowIndex: Integer
		//		If type is "row" or "cell", this is the row index.
		//		If type if "col", this is the column index.
		// colIndex: Integer?
		//		Only valid when type is "cell"
		if(!this.isSelected(type, rowIndex, colIndex)){
			this.toggleSelect(type, rowIndex, colIndex);
		}
	},
	deselect: function(type, rowIndex, colIndex){
		if(this.isSelected(type, rowIndex, colIndex)){
			this.toggleSelect(type, rowIndex, colIndex);
		}
	},
	selectRange: function(type, start, end, toSelect){
		// summary:
		//		Select a continuous range (a block of cells, a set of continuous columns or rows)
		// tags:
		//		public
		// type: String
		//		"row" or "col" or "cell"
		// start: Integer|Object
		//		If type is "row" or "col", this is the index of the starting row or column.
		//		If type if "cell", this is the left-top cell of the range.
		// end: Integer|Object
		//		If type is "row" or "col", this is the index of the ending row or column.
		//		If type if "cell", this is the right-bottom cell of the range.
		this.grid._selectingRange = true;
		var startPoint = type == "cell" ? _createItem(type, start.row, start.col) : _createItem(type, start),
			endPoint = type == "cell" ? _createItem(type, end.row, end.col) : _createItem(type, end);
		this._startSelect(type, startPoint, false, false, false, toSelect);
		this._highlight(type, endPoint, toSelect === undefined ? true : toSelect);
		this._endSelect(type);
		this.grid._selectingRange = false;
	},
	clear: function(type){
		// summary:
		//		Clear all selections.
		// tags:
		//		public
		// type: String?
		//		"row" or "col" or "cell". If omitted, clear all.
		this._clearSelection(type || "all");
	},
	isSelecting: function(type){
		// summary:
		//		Check whether the user is currently selecting something.
		// tags:
		//		public
		// type: String
		//		"row" or "col" or "cell"
		// returns: Boolean
		//		true if is selection, false otherwise.
		if(typeof type == "undefined"){
			return this._selecting.col || this._selecting.row || this._selecting.cell;
		}
		return this._selecting[type];
	},
	selectEnabled: function(toEnable){
		// summary:
		//		Turn on/off this selection functionality if *toEnable* is provided.
		//		Check whether this selection functionality is enabled if nothing is passed in.
		// tags:
		//		public
		// toEnable: Boolean?
		//		To enable or not.
		// returns: Boolean|undefined
		//		Enabled or not.
		if(typeof toEnable != "undefined" && !this.isSelecting()){
			this._enabled = !!toEnable;
		}
		return this._enabled;
	},
	getSelected: function(type, includeExceptions){
		// summary:
		//		Get an array of selected locations.
		// tags:
		//		public
		// type: String
		//		"row" or "col" or "cell"
		// includeExceptions: Boolean
		//		Only meaningful for rows/columns. If true, all selected rows/cols, even they are partly selected, are all returned.
		// returns: __SelectItem[]
		switch(type){
			case "cell":
				return array.map(this._selected[type], function(item){ return item; });
			case "col": case "row":
				return array.map(includeExceptions ? this._selected[type]
				: array.filter(this._selected[type], function(item){
					return item.except.length === 0;
				}), function(item){
					return includeExceptions ? item : item[type];
				});
		}
		return [];
	},
	getSelectedCount: function(type, includeExceptions){
		// summary:
		//		Get the number of selected items.
		// tags:
		//		public
		// type: String
		//		"row" or "col" or "cell"
		// includeExceptions: Boolean
		//		Only meaningful for rows/columns. If true, all selected rows/cols, even they are partly selected, are all returned.
		// returns: Integer
		//		The number of selected items.
		switch(type){
			case "cell":
				return this._selected[type].length;
			case "col": case "row":
				return (includeExceptions ? this._selected[type]
				: array.filter(this._selected[type], function(item){
					return item.except.length === 0;
				})).length;
		}
		return 0;
	},
	getSelectedType: function(){
		// summary:
		//		Get the type of selected items.
		// tags:
		//		public
		// returns: String
		//		"row" or "col" or "cell", or any mix of these (separator is | ).
		var s = this._selected;
		return ["",		"cell",		"row",		"row|cell",
				"col",	"col|cell",	"col|row",	"col|row|cell"
			][(!!s.cell.length) | (!!s.row.length << 1) | (!!s.col.length << 2)];
	},
	getLastSelectedRange: function(type){
		// summary:
		//		Get last selected range of the given type.
		// tags:
		//		public
		// returns: Object
		//		{start: __SelectItem, end: __SelectItem}
		//		return null if nothing is selected.
		return this._lastAnchorPoint[type] ? {
			"start": this._lastAnchorPoint[type],
			"end": this._lastEndPoint[type]
		} : null;
	},
	
	//--------------------------private----------------------------
	_hacks: function(){
		// summary:
		//		Complete the event system of grid, hack some grid functions to prevent default behavior.
		var g = this.grid;
		var doContentMouseUp = function(e){
			if(e.cellNode){
				g.onMouseUp(e);
			}
			g.onMouseUpRow(e);
		};
		var mouseUp = lang.hitch(g, "onMouseUp");
		var mouseDown = lang.hitch(g, "onMouseDown");
		var doRowSelectorFocus = function(e){
			e.cellNode.style.border = "solid 1px";
		};
		array.forEach(g.views.views, function(view){
			view.content.domouseup = doContentMouseUp;
			view.header.domouseup = mouseUp;
			if(view.declaredClass == "dojox.grid._RowSelector"){
				view.domousedown = mouseDown;
				view.domouseup = mouseUp;
				view.dofocus = doRowSelectorFocus;
			}
		});
		//Disable default selection.
		g.selection.clickSelect = function(){};
		
		this._oldDeselectAll = g.selection.deselectAll;
		var _this = this;
		g.selection.selectRange = function(from, to){
			_this.selectRange("row", from, to, true);
			if(g.selection.preserver){
				g.selection.preserver._updateMapping(true, true, false, from, to);
			}
			g.selection.onChanged();
		};
		g.selection.deselectRange = function(from, to){
			_this.selectRange("row", from, to, false);
			if(g.selection.preserver){
				g.selection.preserver._updateMapping(true, false, false, from, to);
			}
			g.selection.onChanged();
		};
		g.selection.deselectAll = function(){
			g._selectingRange = true;
			_this._oldDeselectAll.apply(g.selection, arguments);
			_this._clearSelection("all");
			g._selectingRange = false;
			if(g.selection.preserver){
				g.selection.preserver._updateMapping(true, false, true);
			}
			g.selection.onChanged();
		};
		
		var rowSelector = g.views.views[0];
		//The default function re-write the whole className, so can not insert any other classes.
		if(rowSelector instanceof _RowSelector){
			rowSelector.doStyleRowNode = function(inRowIndex, inRowNode){
				html.removeClass(inRowNode, "dojoxGridRow");
				html.addClass(inRowNode, "dojoxGridRowbar");
				html.addClass(inRowNode, "dojoxGridNonNormalizedCell");
				html.toggleClass(inRowNode, "dojoxGridRowbarOver", g.rows.isOver(inRowIndex));
				html.toggleClass(inRowNode, "dojoxGridRowbarSelected", !!g.selection.isSelected(inRowIndex));
			};
		}
		this.connect(g, "updateRow", function(rowIndex){
			array.forEach(g.layout.cells, function(cell){
				if(this.isSelected("cell", rowIndex, cell.index)){
					this._highlightNode(cell.getNode(rowIndex), true);
				}
			}, this);
		});
	},
	_mixinGrid: function(){
		// summary:
		//		Expose events to grid.
		var g = this.grid;
		g.setupSelectorConfig = lang.hitch(this, this.setupConfig);
		g.onStartSelect = function(){};
		g.onEndSelect = function(){};
		g.onStartDeselect = function(){};
		g.onEndDeselect = function(){};
		g.onSelectCleared = function(){};
	},
	_initEvents: function(){
		// summary:
		//		Connect events, create event handlers.
		var g = this.grid,
			_this = this,
			dp = lang.partial,
			starter = function(type, e){
				if(type === "row"){
					_this._isUsingRowSelector = true;
				}
				//only left mouse button can select.
				if(_this.selectEnabled() && _this._config[type] && e.button != 2){
					if(_this._keyboardSelect.col || _this._keyboardSelect.row || _this._keyboardSelect.cell){
						_this._endSelect("all");
						_this._keyboardSelect.col = _this._keyboardSelect.row = _this._keyboardSelect.cell = 0;
					}
					if(_this._usingKeyboard){
						_this._usingKeyboard = false;
					}
					var target = _createItem(type, e.rowIndex, e.cell && e.cell.index);
					_this._startSelect(type, target, e.ctrlKey, e.shiftKey);
				}
			},
			ender = lang.hitch(this, "_endSelect");
		this.connect(g, "onHeaderCellMouseDown", dp(starter, "col"));
		this.connect(g, "onHeaderCellMouseUp", dp(ender, "col"));
		
		this.connect(g, "onRowSelectorMouseDown", dp(starter, "row"));
		this.connect(g, "onRowSelectorMouseUp", dp(ender, "row"));
		
		this.connect(g, "onCellMouseDown", function(e){
			if(e.cell && e.cell.isRowSelector){ return; }
			if(g.singleClickEdit){
				_this._singleClickEdit = true;
				g.singleClickEdit = false;
			}
			starter(_this._config["cell"] == DISABLED ? "row" : "cell", e);
		});
		this.connect(g, "onCellMouseUp", function(e){
			if(_this._singleClickEdit){
				delete _this._singleClickEdit;
				g.singleClickEdit = true;
			}
			ender("all", e);
		});
		
		this.connect(g, "onCellMouseOver", function(e){
			if(_this._curType != "row" && _this._selecting[_this._curType] && _this._config[_this._curType] == MULTI){
				_this._highlight("col", _createItem("col", e.cell.index), _this._toSelect);
				if(!_this._keyboardSelect.cell){
					_this._highlight("cell", _createItem("cell", e.rowIndex, e.cell.index), _this._toSelect);
				}
			}
		});
		this.connect(g, "onHeaderCellMouseOver", function(e){
			if(_this._selecting.col && _this._config.col == MULTI){
				_this._highlight("col", _createItem("col", e.cell.index), _this._toSelect);
			}
		});
		this.connect(g, "onRowMouseOver", function(e){
			if(_this._selecting.row && _this._config.row == MULTI){
				_this._highlight("row", _createItem("row", e.rowIndex), _this._toSelect);
			}
		});
		
		//When row order has changed in a unpredictable way (sorted or filtered), map the new rowindex.
		this.connect(g, "onSelectedById", "_onSelectedById");
		
		//When the grid refreshes, all those selected should still appear selected.
		this.connect(g, "_onFetchComplete", function(){
			//console.debug("refresh after buildPage:", g._notRefreshSelection);
			if(!g._notRefreshSelection){
				this._refreshSelected(true);
			}
		});

		//Small scroll might not refresh the grid.
		this.connect(g.scroller, "buildPage", function(){
			//console.debug("refresh after buildPage:", g._notRefreshSelection);
			if(!g._notRefreshSelection){
				this._refreshSelected(true);
			}
		});
		
		//Whenever the mouse is up, end selecting.
		this.connect(win.doc, "onmouseup", dp(ender, "all"));
		
		//If autoscroll is enabled, connect to it.
		this.connect(g, "onEndAutoScroll", function(isVertical, isForward, view, target){
			var selectCell = _this._selecting.cell,
				type, current, dir = isForward ? 1 : -1;
			if(isVertical && (selectCell || _this._selecting.row)){
				type = selectCell ? "cell" : "row";
				current = _this._currentPoint[type];
				_this._highlight(type, _createItem(type, current.row + dir, current.col), _this._toSelect);
			}else if(!isVertical && (selectCell || _this._selecting.col)){
				type = selectCell ? "cell" : "col";
				current = _this._currentPoint[type];
				_this._highlight(type, _createItem(type, current.row, target), _this._toSelect);
			}
		});
		//If the grid is changed, selection should be consistent.
		this.subscribe("dojox/grid/rearrange/move/" + g.id, "_onInternalRearrange");
		this.subscribe("dojox/grid/rearrange/copy/" + g.id, "_onInternalRearrange");
		this.subscribe("dojox/grid/rearrange/change/" + g.id, "_onExternalChange");
		this.subscribe("dojox/grid/rearrange/insert/" + g.id, "_onExternalChange");
		this.subscribe("dojox/grid/rearrange/remove/" + g.id, "clear");
		
		//have to also select when the grid's default select is used.
		this.connect(g, "onSelected", function(rowIndex){
			if(this._selectedRowModified && this._isUsingRowSelector){
				delete this._selectedRowModified;
			}else if(!this.grid._selectingRange){
				this.select("row", rowIndex);
			}
		});
		this.connect(g, "onDeselected", function(rowIndex){
			if(this._selectedRowModified && this._isUsingRowSelector){
				delete this._selectedRowModified;
			}else if(!this.grid._selectingRange){
				this.deselect("row", rowIndex);
			}
		});
	},
	_onSelectedById: function(id, newIndex, isSelected){
		if(this.grid._noInternalMapping){
			return;
		}
		var pointSet = [this._lastAnchorPoint.row, this._lastEndPoint.row,
			this._lastSelectedAnchorPoint.row, this._lastSelectedEndPoint.row];
		pointSet = pointSet.concat(this._selected.row);
		var found = false;
		array.forEach(pointSet, function(item){
			if(item){
				if(item.id === id){
					found = true;
					item.row = newIndex;
				}else if(item.row === newIndex && item.id){
					item.row = -1;
				}
			}
		});
		if(!found && isSelected){
			array.some(this._selected.row, function(item){
				if(item && !item.id && !item.except.length){
					item.id = id;
					item.row = newIndex;
					return true;
				}
				return false;
			});
		}
		found = false;
		pointSet = [this._lastAnchorPoint.cell, this._lastEndPoint.cell,
			this._lastSelectedAnchorPoint.cell, this._lastSelectedEndPoint.cell];
		pointSet = pointSet.concat(this._selected.cell);
		array.forEach(pointSet, function(item){
			if(item){
				if(item.id === id){
					found = true;
					item.row = newIndex;
				}else if(item.row === newIndex && item.id){
					item.row = -1;
				}
			}
		});
	},
	onSetStore: function(){
		this._clearSelection("all");
	},
	_onInternalRearrange: function(type, mapping){
		try{
		//The column can not refresh it self!
		this._refresh("col", false);
		
		array.forEach(this._selected.row, function(item){
			array.forEach(this.grid.layout.cells, function(cell){
				this._highlightNode(cell.getNode(item.row), false);
			}, this);
		}, this);
		//The rowbar must be cleaned manually
		query(".dojoxGridRowSelectorSelected").forEach(function(node){
			html.removeClass(node, "dojoxGridRowSelectorSelected");
			html.removeClass(node, "dojoxGridRowSelectorSelectedUp");
			html.removeClass(node, "dojoxGridRowSelectorSelectedDown");
		});
		
		var cleanUp = function(item){
			if(item){
				delete item.converted;
			}
		},
		pointSet = [this._lastAnchorPoint[type], this._lastEndPoint[type],
			this._lastSelectedAnchorPoint[type], this._lastSelectedEndPoint[type]];
		
		if(type === "cell"){
			this.selectRange("cell", mapping.to.min, mapping.to.max);
			var cells = this.grid.layout.cells;
			array.forEach(pointSet, function(item){
				if(item.converted){ return; }
				for(var r = mapping.from.min.row, tr = mapping.to.min.row; r <= mapping.from.max.row; ++r, ++tr){
					for(var c = mapping.from.min.col, tc = mapping.to.min.col; c <= mapping.from.max.col; ++c, ++tc){
						while(cells[c].hidden){ ++c; }
						while(cells[tc].hidden){ ++tc; }
						if(item.row == r && item.col == c){
							//console.log('mapping found: (', item.row, ",",item.col,") to (", tr, ",", tc,")");
							item.row = tr;
							item.col = tc;
							item.converted = true;
							return;
						}
					}
				}
			});
		}else{
			pointSet = this._selected.cell.concat(this._selected[type]).concat(pointSet).concat(
				[this._lastAnchorPoint.cell, this._lastEndPoint.cell,
				this._lastSelectedAnchorPoint.cell, this._lastSelectedEndPoint.cell]);
			array.forEach(pointSet, function(item){
				if(item && !item.converted){
					var from = item[type];
					if(from in mapping){
						item[type] = mapping[from];
					}
					item.converted = true;
				}
			});
			array.forEach(this._selected[_theOther[type]], function(item){
				for(var i = 0, len = item.except.length; i < len; ++i){
					var from = item.except[i];
					if(from in mapping){
						item.except[i] = mapping[from];
					}
				}
			});
		}
		
		array.forEach(pointSet, cleanUp);
		
		this._refreshSelected(true);
		this._focusPoint(type, this._lastEndPoint);
		}catch(e){
			console.warn("Selector._onInternalRearrange() error",e);
		}
	},
	_onExternalChange: function(type, target){
		var start = type == "cell" ? target.min : target[0],
			end = type == "cell" ? target.max : target[target.length - 1];
		this.selectRange(type, start, end);
	},
	_refresh: function(type, toHighlight){
		if(!this._keyboardSelect[type]){
			array.forEach(this._selected[type], function(item){
				this._highlightSingle(type, toHighlight, item, undefined, true);
			}, this);
		}
	},
	_refreshSelected: function(){
		this._refresh("col", true);
		this._refresh("row", true);
		this._refresh("cell", true);
	},
	_initAreas: function(){
		var g = this.grid, f = g.focus, _this = this,
			keyboardSelectReady = 1, duringKeyboardSelect = 2,
			onmove = function(type, createNewEnd, rowStep, colStep, evt){
				//Keyboard swipe selection is SHIFT + Direction Keys.
				var ks = _this._keyboardSelect;
				//Tricky, rely on valid status not being 0.
				if(evt.shiftKey && ks[type]){
					if(ks[type] === keyboardSelectReady){
						if(type === "cell"){
							var item = _this._lastEndPoint[type];
							if(f.cell != g.layout.cells[item.col + colStep] || f.rowIndex != item.row + rowStep){
								ks[type] = 0;
								return;
							}
						}
						//If selecting is not started, start it
						_this._startSelect(type, _this._lastAnchorPoint[type], true, false, true);
						_this._highlight(type, _this._lastEndPoint[type], _this._toSelect);
						ks[type] = duringKeyboardSelect;
					}
					//Highlight to the new end point.
					var newEnd = createNewEnd(type, rowStep, colStep, evt);
					if(_this._isValid(type, newEnd, g)){
						_this._highlight(type, newEnd, _this._toSelect);
					}
					_stopEvent(evt);
				}
			},
			onkeydown = function(type, getTarget, evt, isBubble){
				if(isBubble && _this.selectEnabled() && _this._config[type] != DISABLED){
					switch(evt.keyCode){
						case keys.SPACE:
							//Keyboard single point selection is SPACE.
							_this._startSelect(type, getTarget(), evt.ctrlKey, evt.shiftKey);
							_this._endSelect(type);
							break;
						case keys.SHIFT:
							//Keyboard swipe selection starts with SHIFT.
							if(_this._config[type] == MULTI && _this._isValid(type, _this._lastAnchorPoint[type], g)){
								//End last selection if any.
								_this._endSelect(type);
								_this._keyboardSelect[type] = keyboardSelectReady;
								_this._usingKeyboard = true;
							}
					}
				}
			},
			onkeyup = function(type, evt, isBubble){
				if(isBubble && evt.keyCode == keys.SHIFT && _this._keyboardSelect[type]){
					_this._endSelect(type);
					_this._keyboardSelect[type] = 0;
				}
			};
		//TODO: this area "rowHeader" should be put outside, same level as header/content.
		if(g.views.views[0] instanceof _RowSelector){
			this._lastFocusedRowBarIdx = 0;
			f.addArea({
				name:"rowHeader",
				onFocus: function(evt, step){
					var view = g.views.views[0];
					if(view instanceof _RowSelector){
						var rowBarNode = view.getCellNode(_this._lastFocusedRowBarIdx, 0);
						if(rowBarNode){
							html.toggleClass(rowBarNode, f.focusClass, false);
						}
						//evt might not be real event, it may be a mock object instead.
						if(evt && "rowIndex" in evt){
							if(evt.rowIndex >= 0){
								_this._lastFocusedRowBarIdx = evt.rowIndex;
							}else if(!_this._lastFocusedRowBarIdx){
								_this._lastFocusedRowBarIdx = 0;
							}
						}
						rowBarNode = view.getCellNode(_this._lastFocusedRowBarIdx, 0);
						if(rowBarNode){
							dijitFocus.focus(rowBarNode);
							html.toggleClass(rowBarNode, f.focusClass, true);
						}
						f.rowIndex = _this._lastFocusedRowBarIdx;
						_stopEvent(evt);
						return true;
					}
					return false;
				},
				onBlur: function(evt, step){
					var view = g.views.views[0];
					if(view instanceof _RowSelector){
						var rowBarNode = view.getCellNode(_this._lastFocusedRowBarIdx, 0);
						if(rowBarNode){
							html.toggleClass(rowBarNode, f.focusClass, false);
						}
						_stopEvent(evt);
					}
					return true;
				},
				onMove: function(rowStep, colStep, evt){
					var view = g.views.views[0];
					if(rowStep && view instanceof _RowSelector){
						var next = _this._lastFocusedRowBarIdx + rowStep;
						if(next >= 0 && next < g.rowCount){
							//TODO: these logic require a better Scroller.
							_stopEvent(evt);
							var rowBarNode = view.getCellNode(_this._lastFocusedRowBarIdx, 0);
							html.toggleClass(rowBarNode, f.focusClass, false);
							//If the row is not fetched, fetch it.
							var sc = g.scroller;
							var lastPageRow = sc.getLastPageRow(sc.page);
							var rc = g.rowCount - 1, row = Math.min(rc, next);
							if(next > lastPageRow){
								g.setScrollTop(g.scrollTop + sc.findScrollTop(row) - sc.findScrollTop(_this._lastFocusedRowBarIdx));
							}
							//Now we have fetched the row.
							rowBarNode = view.getCellNode(next, 0);
							dijitFocus.focus(rowBarNode);
							html.toggleClass(rowBarNode, f.focusClass, true);
							_this._lastFocusedRowBarIdx = next;
							//If the row is out of view, scroll to it.
							f.cell = rowBarNode;
							f.cell.view = view;
							f.cell.getNode = function(index){
								return f.cell;
							};
							f.rowIndex = _this._lastFocusedRowBarIdx;
							f.scrollIntoView();
							f.cell = null;
						}
					}
				}
			});
			f.placeArea("rowHeader","before","content");
		}
		//Support keyboard selection.
		f.addArea({
			name:"cellselect",
			onMove: lang.partial(onmove, "cell", function(type, rowStep, colStep, evt){
				var current = _this._currentPoint[type];
				return _createItem("cell", current.row + rowStep, current.col + colStep);
			}),
			onKeyDown: lang.partial(onkeydown, "cell", function(){
				return _createItem("cell", f.rowIndex, f.cell.index);
			}),
			onKeyUp: lang.partial(onkeyup, "cell")
		});
		f.placeArea("cellselect","below","content");
		f.addArea({
			name:"colselect",
			onMove: lang.partial(onmove, "col", function(type, rowStep, colStep, evt){
				var current = _this._currentPoint[type];
				return _createItem("col", current.col + colStep);
			}),
			onKeyDown: lang.partial(onkeydown, "col", function(){
				return _createItem("col", f.getHeaderIndex());
			}),
			onKeyUp: lang.partial(onkeyup, "col")
		});
		f.placeArea("colselect","below","header");
		f.addArea({
			name:"rowselect",
			onMove: lang.partial(onmove, "row", function(type, rowStep, colStep, evt){
				return _createItem("row", f.rowIndex);
			}),
			onKeyDown: lang.partial(onkeydown, "row", function(){
				return _createItem("row", f.rowIndex);
			}),
			onKeyUp: lang.partial(onkeyup, "row")
		});
		f.placeArea("rowselect","below","rowHeader");
	},
	_clearSelection: function(type, reservedItem){
		// summary:
		//		Clear selection for given type and fire events, but retain the highlight for *reservedItem*,
		//		thus avoid "flashing".
		// tags:
		//		private
		// type: String
		//		"row", "col", or "cell
		// reservedItem: __SelectItem
		//		The item to retain highlight.
		if(type == "all"){
			this._clearSelection("cell", reservedItem);
			this._clearSelection("col", reservedItem);
			this._clearSelection("row", reservedItem);
			return;
		}
		this._isUsingRowSelector = true;
		array.forEach(this._selected[type], function(item){
			if(!_isEqual(type, reservedItem, item)){
				this._highlightSingle(type, false, item);
			}
		}, this);
		this._blurPoint(type, this._currentPoint);
		this._selecting[type] = false;
		this._startPoint[type] = this._currentPoint[type] = null;
		this._selected[type] = [];
		
		//Have to also deselect default grid selection.
		if(type == "row" && !this.grid._selectingRange){
			this._oldDeselectAll.call(this.grid.selection);
			this.grid.selection._selectedById = {};
		}
		
		//Fire events.
		this.grid.onEndDeselect(type, null, null, this._selected);
		this.grid.onSelectCleared(type);
	},
	_startSelect: function(type, start, extending, isRange, mandatarySelect, toSelect){
		// summary:
		//		Start selection, setup start point and current point, fire events.
		// tags:
		//		private
		// type: String
		//		"row", "col", or "cell"
		// extending: Boolean
		//		Whether this is a multi selection
		// isRange: Boolean
		//		Whether this is a range selection (i.e. select from the last end point to this point)
		// start: __SelectItem
		//		The start point
		// mandatarySelect: Boolean
		//		If true, toSelect will be same as the original selection status.
		if(!this._isValid(type, start)){
			return;
		}
		var lastIsSelected = this._isSelected(type, this._lastEndPoint[type]),
			isSelected = this._isSelected(type, start);
		
		if(this.noClear && !extending){
			this._toSelect = toSelect === undefined ? true : toSelect;
		}else{
			//If we are modifying the selection using keyboard, retain the old status.
			this._toSelect = mandatarySelect ? isSelected : !isSelected;
		}
		
		//If CTRL is not pressed or it's SINGLE mode, this is a brand new selection.
		if(!extending || (!isSelected && this._config[type] == SINGLE)){
			this._clearSelection("col", start);
			this._clearSelection("cell", start);
			if(!this.noClear || (type === 'row' && this._config[type] == SINGLE)){
				this._clearSelection('row', start);
			}
			this._toSelect = toSelect === undefined ? true : toSelect;
		}
		
		this._selecting[type] = true;
		this._currentPoint[type] = null;
		
		//We're holding SHIFT while clicking, it's a Click-Range selection.
		if(isRange && this._lastType == type && lastIsSelected == this._toSelect && this._config[type] == MULTI){
			if(type === "row"){
				this._isUsingRowSelector = true;
			}
			this._startPoint[type] = this._lastAnchorPoint[type];
			this._highlight(type, this._startPoint[type]);
			this._isUsingRowSelector = false;
		}else{
			this._startPoint[type] = start;
		}
		//Now start selection
		this._curType = type;
		this._fireEvent("start", type);
		this._isStartFocus = true;
		this._isUsingRowSelector = true;
		this._highlight(type, start, this._toSelect);
		this._isStartFocus = false;
	},
	_endSelect: function(type){
		// summary:
		//		End selection. Keep records, fire events and cleanup status.
		// tags:
		//		private
		// type: String
		//		"row", "col", or "cell"
		if(type === "row"){
			delete this._isUsingRowSelector;
		}
		if(type == "all"){
			this._endSelect("col");
			this._endSelect("row");
			this._endSelect("cell");
		}else if(this._selecting[type]){
			this._addToSelected(type);
			this._lastAnchorPoint[type] = this._startPoint[type];
			this._lastEndPoint[type] = this._currentPoint[type];
			if(this._toSelect){
				this._lastSelectedAnchorPoint[type] = this._lastAnchorPoint[type];
				this._lastSelectedEndPoint[type] = this._lastEndPoint[type];
			}
			this._startPoint[type] = this._currentPoint[type] = null;
			this._selecting[type] = false;
			this._lastType = type;
			this._fireEvent("end", type);
		}
	},
	_fireEvent: function(evtName, type){
		switch(evtName){
			case "start":
				this.grid[this._toSelect ? "onStartSelect" : "onStartDeselect"](type, this._startPoint[type], this._selected);
				break;
			case "end":
				this.grid[this._toSelect ? "onEndSelect" : "onEndDeselect"](type, this._lastAnchorPoint[type], this._lastEndPoint[type], this._selected);
				break;
		}
	},
	_calcToHighlight: function(type, target, toHighlight, toSelect){
		// summary:
		//		Calculate what status should *target* have.
		//		If *toSelect* is not provided, this is a no op.
		
		// This function is time-critical!!
		if(toSelect !== undefined){
			var sltd;
			if(this._usingKeyboard && !toHighlight){
				var last = this._isInLastRange(this._lastType, target);
				if(last){
					sltd = this._isSelected(type, target);
					//This 2 cases makes the keyboard swipe selection valid!
					if(toSelect && sltd){
						return false;
					}
					if(!toSelect && !sltd && this._isInLastRange(this._lastType, target, true)){
						return true;
					}
				}
			}
			return toHighlight ? toSelect : (sltd || this._isSelected(type, target));
		}
		return toHighlight;
	},
	_highlightNode: function(node, toHighlight){
		// summary:
		//		Do the actual highlight work.
		if(node){
			var selectCSSClass = "dojoxGridRowSelected";
			var selectCellClass = "dojoxGridCellSelected";
			html.toggleClass(node, selectCSSClass, toHighlight);
			html.toggleClass(node, selectCellClass, toHighlight);
		}
	},
	_highlightHeader: function(colIdx, toHighlight){
		var cells = this.grid.layout.cells;
		var node = cells[colIdx].getHeaderNode();
		var selectedClass = "dojoxGridHeaderSelected";
		html.toggleClass(node, selectedClass, toHighlight);
	},
	_highlightRowSelector: function(rowIdx, toHighlight){
		//var t1 = (new Date()).getTime();
		var rowSelector = this.grid.views.views[0];
		if(rowSelector instanceof _RowSelector){
			var node = rowSelector.getRowNode(rowIdx);
			if(node){
				var selectedClass = "dojoxGridRowSelectorSelected";
				html.toggleClass(node, selectedClass, toHighlight);
			}
		}
		//console.log((new Date()).getTime() - t1);
	},
	_highlightSingle: function(type, toHighlight, target, toSelect, isRefresh){
		// summary:
		//		Highlight a single item.
		
		// This function is time critical!!
		var _this = this, toHL, g = _this.grid, cells = g.layout.cells;
		switch(type){
			case "cell":
				toHL = this._calcToHighlight(type, target, toHighlight, toSelect);
				var c = cells[target.col];
				if(!c.hidden && !c.notselectable){
					this._highlightNode(target.node || c.getNode(target.row), toHL);
				}
				break;
			case "col":
				toHL = this._calcToHighlight(type, target, toHighlight, toSelect);
				this._highlightHeader(target.col, toHL);
				query("td[idx='" + target.col + "']", g.domNode).forEach(function(cellNode){
					var rowNode = cells[target.col].view.content.findRowTarget(cellNode);
					if(rowNode){
						var rowIndex = rowNode[dojox.grid.util.rowIndexTag];
						_this._highlightSingle("cell", toHL, {
							"row": rowIndex,
							"col": target.col,
							"node": cellNode
						});
					}
				});
				break;
			case "row":
				toHL = this._calcToHighlight(type, target, toHighlight, toSelect);
				this._highlightRowSelector(target.row, toHL);
				if(this._config.cell){
					array.forEach(cells, function(cell){
						_this._highlightSingle("cell", toHL, {
							"row": target.row,
							"col": cell.index,
							"node": cell.getNode(target.row)
						});
					});
				}
				//To avoid dead lock
				this._selectedRowModified = true;
				if(!isRefresh){
					g.selection.setSelected(target.row, toHL);
				}
		}
	},
	_highlight: function(type, target, toSelect){
		// summary:
		//		Highlight from start point to target.
		// toSelect: Boolean
		//		Whether we are selecting or deselecting.
		
		// This function is time critical!!
		if(this._selecting[type] && target !== null){
			var start = this._startPoint[type],
				current = this._currentPoint[type],
				_this = this,
				highlight = function(from, to, toHL){
					_this._forEach(type, from, to, function(item){
						_this._highlightSingle(type, toHL, item, toSelect);
					}, true);
				};
			switch(type){
				case "col": case "row":
					if(current !== null){
						if(_inRange(type, target, start, current, true)){
							//target is between start and current, some selected should be deselected.
							highlight(current, target, false);
						}else{
							if(_inRange(type, start, target, current, true)){
								//selection has jumped to different direction, all should be deselected.
								highlight(current, start, false);
								current = start;
							}
							highlight(target, current, true);
						}
					}else{
						//First time select.
						this._highlightSingle(type, true, target, toSelect);
					}
					break;
				case "cell":
					if(current !== null){
						if(_inRange("row", target, start, current, true) ||
							_inRange("col", target, start, current, true) ||
							_inRange("row", start, target, current, true) ||
							_inRange("col", start, target, current, true)){
							highlight(start, current, false);
						}
					}
					highlight(start, target, true);
			}
			this._currentPoint[type] = target;
			this._focusPoint(type, this._currentPoint);
		}
	},
	_focusPoint: function(type, point){
		// summary:
		//		Focus the current point, so when you move mouse, the focus indicator follows you.
		if(!this._isStartFocus){
			var current = point[type],
				f = this.grid.focus;
			if(type == "col"){
				f._colHeadFocusIdx = current.col;
				f.focusArea("header");
			}else if(type == "row"){
				f.focusArea("rowHeader", {
					"rowIndex": current.row
				});
			}else if(type == "cell"){
				f.setFocusIndex(current.row, current.col);
			}
		}
	},
	_blurPoint: function(type, point){
		// summary:
		//		Blur the current point.
		var f = this.grid.focus;
		if(type == "cell"){
			f._blurContent();
		}
	},
	_addToSelected: function(type){
		// summary:
		//		Record the selected items.
		var toSelect = this._toSelect, _this = this,
			toAdd = [], toRemove = [],
			start = this._startPoint[type],
			end = this._currentPoint[type];
		if(this._usingKeyboard){
			//If using keyboard, selection will be ended after every move. But we have to remember the original selection status,
			//so as to return to correct status when we shrink the selection region.
			this._forEach(type, this._lastAnchorPoint[type], this._lastEndPoint[type], function(item){
				//If the original selected item is not in current range, change its status.
				if(!_inRange(type, item, start, end)){
					(toSelect ? toRemove : toAdd).push(item);
				}
			});
		}
		this._forEach(type, start, end, function(item){
			var isSelected = _this._isSelected(type, item);
			if(toSelect && !isSelected){
				//Add new selected items
				toAdd.push(item);
			}else if(!toSelect){
				//Remove deselected items.
				toRemove.push(item);
			}
		});
		this._add(type, toAdd);
		this._remove(type, toRemove);
		
		// have to keep record in original grid selection
		array.forEach(this._selected.row, function(item){
			if(item.except.length > 0){
				//to avoid dead lock
				this._selectedRowModified = true;
				this.grid.selection.setSelected(item.row, false);
			}
		}, this);
	},
	_forEach: function(type, start, end, func, halfClose){
		// summary:
		//		Go through items from *start* point to *end* point.
		
		// This function is time critical!!
		if(!this._isValid(type, start, true) || !this._isValid(type, end, true)){
			return;
		}
		switch(type){
			case "col": case "row":
				start = start[type];
				end = end[type];
				var dir = end > start ? 1 : -1;
				if(!halfClose){
					end += dir;
				}
				for(; start != end; start += dir){
					func(_createItem(type, start));
				}
				break;
			case "cell":
				var colDir = end.col > start.col ? 1 : -1,
					rowDir = end.row > start.row ? 1 : -1;
				for(var i = start.row, p = end.row + rowDir; i != p; i += rowDir){
					for(var j = start.col, q = end.col + colDir; j != q; j += colDir){
						func(_createItem(type, i, j));
					}
				}
		}
	},
	_makeupForExceptions: function(type, newCellItems){
		// summary:
		//		When new cells is selected, maybe they will fill in the "holes" in selected rows and columns.
		var makedUps = [];
		array.forEach(this._selected[type], function(v1){
			array.forEach(newCellItems, function(v2){
				if(v1[type] == v2[type]){
					var pos = array.indexOf(v1.except, v2[_theOther[type]]);
					if(pos >= 0){
						v1.except.splice(pos, 1);
					}
					makedUps.push(v2);
				}
			});
		});
		return makedUps;
	},
	_makeupForCells: function(type, newItems){
		// summary:
		//		When some rows/cols are selected, maybe they can cover some of the selected cells,
		//		and fill some of the "holes" in the selected cols/rows.
		var toRemove = [];
		array.forEach(this._selected.cell, function(v1){
			array.some(newItems, function(v2){
				if(v1[type] == v2[type]){
					toRemove.push(v1);
					return true;
				}
				return false;
			});
		});
		this._remove("cell", toRemove);
		array.forEach(this._selected[_theOther[type]], function(v1){
			array.forEach(newItems, function(v2){
				var pos = array.indexOf(v1.except, v2[type]);
				if(pos >= 0){
					v1.except.splice(pos, 1);
				}
			});
		});
	},
	_addException: function(type, items){
		// summary:
		//		If some rows/cols are deselected, maybe they have created "holes" in selected cols/rows.
		array.forEach(this._selected[type], function(v1){
			array.forEach(items, function(v2){
				v1.except.push(v2[_theOther[type]]);
			});
		});
	},
	_addCellException: function(type, items){
		// summary:
		//		If some cells are deselected, maybe they have created "holes" in selected rows/cols.
		array.forEach(this._selected[type], function(v1){
			array.forEach(items, function(v2){
				if(v1[type] == v2[type]){
					v1.except.push(v2[_theOther[type]]);
				}
			});
		});
	},
	_add: function(type, items){
		// summary:
		//		Add to the selection record.
		var cells = this.grid.layout.cells;
		if(type == "cell"){
			var colMakedup = this._makeupForExceptions("col", items);
			var rowMakedup = this._makeupForExceptions("row", items);
			//Step over hidden columns.
			items = array.filter(items, function(item){
				return array.indexOf(colMakedup, item) < 0 && array.indexOf(rowMakedup, item) < 0 &&
					!cells[item.col].hidden && !cells[item.col].notselectable;
			});
		}else{
			if(type == "col"){
				//Step over hidden columns.
				items = array.filter(items, function(item){
					return !cells[item.col].hidden && !cells[item.col].notselectable;
				});
			}
			this._makeupForCells(type, items);
			this._selected[type] = array.filter(this._selected[type], function(v){
				return array.every(items, function(item){
					return v[type] !== item[type];
				});
			});
		}
		if(type != "col" && this.grid._hasIdentity){
			array.forEach(items, function(item){
				var record = this.grid._by_idx[item.row];
				if(record){
					item.id = record.idty;
				}
			}, this);
		}
		this._selected[type] = this._selected[type].concat(items);
	},
	_remove: function(type, items){
		// summary:
		//		Remove from the selection record.
		var comp = lang.partial(_isEqual, type);
		this._selected[type] = array.filter(this._selected[type], function(v1){
			return !array.some(items, function(v2){
				return comp(v1, v2);
			});
		});
		if(type == "cell"){
			this._addCellException("col", items);
			this._addCellException("row", items);
		}else if(this._config.cell){
			this._addException(_theOther[type], items);
		}
	},
	_isCellNotInExcept: function(type, item){
		// summary:
		//		Return true only when a cell is covered by selected row/col, and its not a "hole".
		var attr = item[type], corres = item[_theOther[type]];
		return array.some(this._selected[type], function(v){
			return v[type] == attr && array.indexOf(v.except, corres) < 0;
		});
	},
	_isSelected: function(type, item){
		// summary:
		//		Return true when the item is selected. (or logically selected, i.e, covered by a row/col).
		if(!item){ return false; }
		var res = array.some(this._selected[type], function(v){
			var ret = _isEqual(type, item, v);
			if(ret && type !== "cell"){
				return v.except.length === 0;
			}
			return ret;
		});
		if(!res && type === "cell"){
			res = (this._isCellNotInExcept("col", item) || this._isCellNotInExcept("row", item));
			if(type === "cell"){
				res = res && !this.grid.layout.cells[item.col].notselectable;
			}
		}
		return res;
	},
	_isInLastRange: function(type, item, isSelected){
		// summary:
		//		Return true only when the item is in the last seletion/deseletion range.
		var start = this[isSelected ? "_lastSelectedAnchorPoint" : "_lastAnchorPoint"][type],
			end = this[isSelected ? "_lastSelectedEndPoint" : "_lastEndPoint"][type];
		if(!item || !start || !end){ return false; }
		return _inRange(type, item, start, end);
	},
	_isValid: function(type, item, allowNotSelectable){
		// summary:
		//		Check whether the item is a valid __SelectItem for the given type.
		if(!item){ return false; }
		try{
			var g = this.grid, index = item[type];
			switch(type){
				case "col":
					return index >= 0 && index < g.layout.cells.length && lang.isArray(item.except) &&
							(allowNotSelectable || !g.layout.cells[index].notselectable);
				case "row":
					return index >= 0 && index < g.rowCount && lang.isArray(item.except);
				case "cell":
					return item.col >= 0 && item.col < g.layout.cells.length &&
							item.row >= 0 && item.row < g.rowCount &&
							(allowNotSelectable || !g.layout.cells[item.col].notselectable);
			}
		}catch(e){}
		return false;
	}
});

EnhancedGrid.registerPlugin(Selector/*name:'selector'*/, {
	"dependency": ["autoScroll"]
});

return Selector;

});