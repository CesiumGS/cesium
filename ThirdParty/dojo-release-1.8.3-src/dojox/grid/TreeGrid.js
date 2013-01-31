define([
	"dojo/_base/kernel",
	"../main",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/query",
	"dojo/keys",
	"dijit/tree/ForestStoreModel",
	"./DataGrid",
	"./_Layout",
	"./_FocusManager",
	"./_RowManager",
	"./_EditManager",
	"./TreeSelection",
	"./cells/tree",
	"./_TreeView"
], function(dojo, dojox, declare, array, lang, event, domAttr, domClass, query, keys, ForestStoreModel,
	DataGrid, _Layout, _FocusManager, _RowManager, _EditManager, TreeSelection, TreeCell){

dojo.experimental("dojox.grid.TreeGrid");

var _TreeAggregator = declare("dojox.grid._TreeAggregator", null, {
	cells: [],
	grid: null,
	childFields: [],

	constructor: function(kwArgs){
		this.cells = kwArgs.cells || [];
		this.childFields = kwArgs.childFields || [];
		this.grid = kwArgs.grid;
		this.store = this.grid.store;
	},
	_cacheValue: function(cache, id, value){
		cache[id] = value;
		return value;
	},
	clearSubtotalCache: function(){
		// summary:
		//		Clears the subtotal cache so that we are forced to recalc it
		//		(or reread it) again.  This is needed, for example, when
		//		column order is changed.
		if(this.store){
			delete this.store._cachedAggregates;
		}
	},

	cnt: function(cell, level, item){
		// summary:
		//		calculates the count of the children of item at the given level
		var total = 0;
		var store = this.store;
		var childFields = this.childFields;
		if(childFields[level]){
			var children = store.getValues(item, childFields[level]);
			if (cell.index <= level + 1){
				total = children.length;
			}else{
				array.forEach(children, function(c){
					total += this.getForCell(cell, level + 1, c, "cnt");
				}, this);
			}
		}else{
			total = 1;
		}
		return total;
	},
	sum: function(cell, level, item){
		// summary:
		//		calculates the sum of the children of item at the given level
		var total = 0;
		var store = this.store;
		var childFields = this.childFields;
		if(childFields[level]){
			array.forEach(store.getValues(item, childFields[level]), function(c){
				total += this.getForCell(cell, level + 1, c, "sum");
			}, this);
		}else{
			total += store.getValue(item, cell.field);
		}
		return total;
	},
	value: function(cell, level, item){
		// summary:
		//		Empty function so that we can set "aggregate='value'" to
		//		force loading from the data - and bypass calculating
	},
	getForCell: function(cell, level, item, type){
		// summary:
		//		Gets the value of the given cell at the given level and type.
		//		type can be one of "sum", "cnt", or "value".  If itemAggregates
		//		is set and can be used, it is used instead.  Values are also
		//		cached to prevent calculating them too often.
		var store = this.store;
		if(!store || !item || !store.isItem(item)){ return ""; }
		var storeCache = store._cachedAggregates = store._cachedAggregates || {};
		var id = store.getIdentity(item);
		var itemCache = storeCache[id] = storeCache[id] || [];
		if(!cell.getOpenState){
			cell = this.grid.getCell(cell.layoutIndex + level + 1);
		}
		var idx = cell.index;
		var idxCache = itemCache[idx] = itemCache[idx] || {};
		type = (type || (cell.parentCell ? cell.parentCell.aggregate : "sum"))||"sum";
		var attr = cell.field;
		if(attr == store.getLabelAttributes()[0]){
			// If our attribute is one of the label attributes, we should
			// use cnt instead (since it makes no sense to do a sum of labels)
			type = "cnt";
		}
		var typeCache = idxCache[type] = idxCache[type] || [];

		// See if we have it in our cache immediately for easy returning
		if(typeCache[level] != undefined){
			return typeCache[level];
		}

		// See if they have specified a valid field
		var field = ((cell.parentCell && cell.parentCell.itemAggregates) ?
							cell.parentCell.itemAggregates[cell.idxInParent] : "")||"";
		if(field && store.hasAttribute(item, field)){
			return this._cacheValue(typeCache, level, store.getValue(item, field));
		}else if(field){
			return this._cacheValue(typeCache, level, 0);
		}

		// Calculate it
		return this._cacheValue(typeCache, level, this[type](cell, level, item));
	}
});

var _TreeLayout = declare("dojox.grid._TreeLayout", _Layout, {
	// Whether or not we are collapsable - this is calculated when we
	// set our structure.
	_isCollapsable: false,

	_getInternalStructure: function(inStructure){
		//	Create a "Tree View" with 1 row containing references for
		//		each column (recursively)
		var g = this.grid;

		var s = inStructure;
		var cells = s[0].cells[0];
		var tree = {
			type: "dojox.grid._TreeView",
			cells: [[]]
		};
		var cFields = [];
		var maxLevels = 0;
		var getTreeCells = function(parentCell, level){
			var children = parentCell.children;
			var cloneTreeCell = function(originalCell, idx){
				var k, n = {};
				for(k in originalCell){
					n[k] = originalCell[k];
				}
				n = lang.mixin(n, {
					level: level,
					idxInParent: level > 0 ? idx : -1,
					parentCell: level > 0 ? parentCell : null
				});
				return n;
			};
			var ret = [];
			array.forEach(children, function(c, idx){
				if("children" in c){
					cFields.push(c.field);
					var last = ret[ret.length - 1];
					last.isCollapsable = true;
					c.level = level;
					ret = ret.concat(getTreeCells(c, level + 1));
				}else{
					ret.push(cloneTreeCell(c, idx));
				}
			});
			maxLevels = Math.max(maxLevels, level);
			return ret;
		};
		var tCell = {children: cells, itemAggregates: []};
		tree.cells[0] = getTreeCells(tCell, 0);
		g.aggregator = new _TreeAggregator({cells: tree.cells[0],
														grid: g,
														childFields: cFields});
		if(g.scroller && g.defaultOpen){
			g.scroller.defaultRowHeight = g.scroller._origDefaultRowHeight * (2 * maxLevels + 1);
		}
		return [ tree ];
	},

	setStructure: function(inStructure){
		// Mangle the structure a bit and make it work as desired
		var s = inStructure;
		var g = this.grid;
		// Only supporting single-view, single row or else we
		// are not collapsable
		if(g && g.treeModel && !array.every(s, function(i){
			return ("cells" in i);
		})){
			s = arguments[0] = [{cells:[s]}];
		}
		if(s.length == 1 && s[0].cells.length == 1){
			if(g && g.treeModel){
				s[0].type = "dojox.grid._TreeView";
				this._isCollapsable = true;
				s[0].cells[0][(this.grid.treeModel?this.grid.expandoCell:0)].isCollapsable = true;
			}else{
				var childCells = array.filter(s[0].cells[0], function(c){
					return ("children" in c);
				});
				if(childCells.length === 1){
					this._isCollapsable = true;
				}
			}
		}
		if(this._isCollapsable && (!g || !g.treeModel)){
			arguments[0] = this._getInternalStructure(s);
		}
		this.inherited(arguments);
	},

	addCellDef: function(inRowIndex, inCellIndex, inDef){
		var obj = this.inherited(arguments);
		return lang.mixin(obj, TreeCell);
	}
});

var TreePath = declare("dojox.grid.TreePath", null, {
	level: 0,
	_str: "",
	_arr: null,
	grid: null,
	store: null,
	cell: null,
	item: null,

	constructor: function(/*String|Integer[]|Integer|dojox.grid.TreePath*/ path, /*dojox.grid.TreeGrid*/ grid){
		if(lang.isString(path)){
			this._str = path;
			this._arr = array.map(path.split('/'), function(item){ return parseInt(item, 10); });
		}else if(lang.isArray(path)){
			this._str = path.join('/');
			this._arr = path.slice(0);
		}else if(typeof path == "number"){
			this._str = String(path);
			this._arr = [path];
		}else{
			this._str = path._str;
			this._arr = path._arr.slice(0);
		}
		this.level = this._arr.length-1;
		this.grid = grid;
		this.store = this.grid.store;
		if(grid.treeModel){
			this.cell = grid.layout.cells[grid.expandoCell];
		}else{
			this.cell = grid.layout.cells[this.level];
		}
	},
	item: function(){
		// summary:
		//	gets the dojo.data item associated with this path
		if(!this._item){
			this._item = this.grid.getItem(this._arr);
		}
		return this._item;
	},
	compare: function(path /*dojox.grid.TreePath|String|Array*/){
		// summary:
		//	compares two paths
		if(lang.isString(path) || lang.isArray(path)){
			if(this._str == path){ return 0; }
			if(path.join && this._str == path.join('/')){ return 0; }
			path = new TreePath(path, this.grid);
		}else if(path instanceof TreePath){
			if(this._str == path._str){ return 0; }
		}
		for(var i=0, l=(this._arr.length < path._arr.length ? this._arr.length : path._arr.length); i<l; i++){
			if(this._arr[i]<path._arr[i]){ return -1; }
			if(this._arr[i]>path._arr[i]){ return 1; }
		}
		if(this._arr.length<path._arr.length){ return -1; }
		if(this._arr.length>path._arr.length){ return 1; }
		return 0;
	},
	isOpen: function(){
		// summary:
		//	Returns the open state of this cell.
		return this.cell.openStates && this.cell.getOpenState(this.item());
	},
	previous: function(){
		// summary:
		//	Returns the path that is before this path in the
		//	grid. If no path is found, returns null.
		var new_path = this._arr.slice(0);

		if(this._str == "0"){
			return null;
		}

		var last = new_path.length-1;

		if(new_path[last] === 0){
			new_path.pop();
			return new TreePath(new_path, this.grid);
		}

		new_path[last]--;
		var path = new TreePath(new_path, this.grid);
		return path.lastChild(true);
	},
	next: function(){
		// summary:
		//	Returns the next path in the grid.  If no path
		//	is found, returns null.
		var new_path = this._arr.slice(0);

		if(this.isOpen()){
			new_path.push(0);
		}else{
			new_path[new_path.length-1]++;
			for(var i=this.level; i>=0; i--){
				var item = this.grid.getItem(new_path.slice(0, i+1));
				if(i>0){
					if(!item){
						new_path.pop();
						new_path[i-1]++;
					}
				}else{
					if(!item){
						return null;
					}
				}
			}
		}

		return new TreePath(new_path, this.grid);
	},
	children: function(alwaysReturn){
		// summary:
		//	Returns the child data items of this row.  If this
		//	row isn't open and alwaysReturn is falsey, returns null.
		if(!this.isOpen()&&!alwaysReturn){
			return null;
		}
		var items = [];
		var model = this.grid.treeModel;
		if(model){
			var item = this.item();
			var store = model.store;
			if(!model.mayHaveChildren(item)){
				return null;
			}
			array.forEach(model.childrenAttrs, function(attr){
				items = items.concat(store.getValues(item, attr));
			});
		}else{
			items = this.store.getValues(this.item(), this.grid.layout.cells[this.cell.level+1].parentCell.field);
			if(items.length>1&&this.grid.sortChildItems){
				var sortProps = this.grid.getSortProps();
				if(sortProps&&sortProps.length){
					var attr = sortProps[0].attribute,
						grid = this.grid;
					if(attr&&items[0][attr]){
						var desc = !!sortProps[0].descending;
						items = items.slice(0); // don't touch the array in the store, make a copy
						items.sort(function(a, b){
							return grid._childItemSorter(a, b, attr, desc);
						});
					}
				}
			}
		}
		return items;
	},
	childPaths: function(){
		var childItems = this.children();
		if(!childItems){
			return [];
		}
		return array.map(childItems, function(item, index){
			return new TreePath(this._str + '/' + index, this.grid);
		}, this);
	},
	parent: function(){
		// summary:
		//	Returns the parent path of this path.  If this is a
		//	top-level row, returns null.
		if(this.level === 0){
			return null;
		}
		return new TreePath(this._arr.slice(0, this.level), this.grid);
	},
	lastChild: function(/*Boolean?*/ traverse){
		// summary:
		//	Returns the last child row below this path.  If traverse
		//	is true, will traverse down to find the last child row
		//	of this branch.  If there are no children, returns itself.
		var children = this.children();
		if(!children || !children.length){
			return this;
		}
		var path = new TreePath(this._str + "/" + String(children.length-1), this.grid);
		if(!traverse){
			return path;
		}
		return path.lastChild(true);
	},
	toString: function(){
		return this._str;
	}
});

var _TreeFocusManager = declare("dojox.grid._TreeFocusManager", _FocusManager, {
	setFocusCell: function(inCell, inRowIndex){
		if(inCell && inCell.getNode(inRowIndex)){
			this.inherited(arguments);
		}
	},
	isLastFocusCell: function(){
		if(this.cell && this.cell.index == this.grid.layout.cellCount-1){
			var path = new TreePath(this.grid.rowCount-1, this.grid);
			path = path.lastChild(true);
			return this.rowIndex == path._str;
		}
		return false;
	},
	next: function(){
		// summary:
		//	focus next grid cell
		if(this.cell){
			var row=this.rowIndex, col=this.cell.index+1, cc=this.grid.layout.cellCount-1;
			var path = new TreePath(this.rowIndex, this.grid);
			if(col > cc){
				var new_path = path.next();
				if(!new_path){
					col--;
				}else{
					col = 0;
					path = new_path;
				}
			}
			if(this.grid.edit.isEditing()){ //when editing, only navigate to editable cells
				var nextCell = this.grid.getCell(col);
				if (!this.isLastFocusCell() && !nextCell.editable){
					this._focusifyCellNode(false);
					this.cell=nextCell;
					this.rowIndex=path._str;
					this.next();
					return;
				}
			}
			this.setFocusIndex(path._str, col);
		}
	},
	previous: function(){
		// summary:
		//	focus previous grid cell
		if(this.cell){
			var row=(this.rowIndex || 0), col=(this.cell.index || 0) - 1;
			var path = new TreePath(row, this.grid);
			if(col < 0){
				var new_path = path.previous();
				if(!new_path){
					col = 0;
				}else{
					col = this.grid.layout.cellCount-1;
					path = new_path;
				}
			}
			if(this.grid.edit.isEditing()){ //when editing, only navigate to editable cells
				var prevCell = this.grid.getCell(col);
				if (!this.isFirstFocusCell() && !prevCell.editable){
					this._focusifyCellNode(false);
					this.cell=prevCell;
					this.rowIndex=path._str;
					this.previous();
					return;
				}
			}
			this.setFocusIndex(path._str, col);
		}
	},
	move: function(inRowDelta, inColDelta){
		if(this.isNavHeader()){
			this.inherited(arguments);
			return;
		}
		if(!this.cell){ return; }
		// Handle grid proper.
		var sc = this.grid.scroller,
			r = this.rowIndex,
			rc = this.grid.rowCount-1,
			path = new TreePath(this.rowIndex, this.grid);
		if(inRowDelta){
			var row;
			if(inRowDelta>0){
				path = path.next();
				row = path._arr[0];
				if(row > sc.getLastPageRow(sc.page)){
					//need to load additional data, let scroller do that
					this.grid.setScrollTop(this.grid.scrollTop+sc.findScrollTop(row)-sc.findScrollTop(r));
				}
			}else if(inRowDelta<0){
				path = path.previous();
				row = path._arr[0];
				if(row <= sc.getPageRow(sc.page)){
					//need to load additional data, let scroller do that
					this.grid.setScrollTop(this.grid.scrollTop-sc.findScrollTop(r)-sc.findScrollTop(row));
				}
			}
		}
		var cc = this.grid.layout.cellCount-1,
		i = this.cell.index,
		col = Math.min(cc, Math.max(0, i+inColDelta));
		var cell = this.grid.getCell(col);
		var colDir = inColDelta < 0 ? -1 : 1;
		while(col>=0 && col < cc && cell && cell.hidden === true){
			// skip hidden cells
			col += colDir;
			cell = this.grid.getCell(col);
		}
		if (!cell || cell.hidden === true){
			// don't change col if would move to hidden
			col = i;
		}
		if(inRowDelta){
			this.grid.updateRow(r);
		}
		this.setFocusIndex(path._str, col);
	}
});

var TreeGrid = declare("dojox.grid.TreeGrid", DataGrid, {
	// summary:
	//		A grid that supports nesting rows - it provides an expando function
	//		similar to dijit.Tree.  It also provides mechanisms for aggregating
	//		the values of subrows
	// description:
	//		TreeGrid currently only works on "simple" structures.  That is,
	//		single-view structures with a single row in them.
	//
	//		The TreeGrid works using the concept of "levels" - level 0 are the
	//		top-level items.

	// defaultOpen: Boolean
	//		Whether or not we default to open (all levels).  This defaults to
	//		false for grids with a treeModel.
	defaultOpen: true,

	// sortChildItems: Boolean
	//		If true, child items will be returned sorted according to the sorting
	//		properties of the grid.
	sortChildItems: false,

	// openAtLevels: Array
	//		Which levels we are open at (overrides defaultOpen for the values
	//		that exist here).  Its values can be a boolean (true/false) or an
	//		integer (for the # of children to be closed if there are more than
	//		that)
	openAtLevels: [],

	// treeModel: dijit.tree.ForestStoreModel
	//		A dijit.Tree model that will be used instead of using aggregates.
	//		Setting this value will make the TreeGrid behave like a columnar
	//		tree.  When setting this value, defaultOpen will default to false,
	//		and openAtLevels will be ignored.
	treeModel: null,

	// expandoCell: Integer
	//		When used in conjunction with a treeModel (see above), this is a 0-based
	//		index of the cell in which to place the actual expando
	expandoCell: 0,

	// aggregator: Object
	//		The aggregator class - it will be populated automatically if we
	//		are a collapsible grid
	aggregator: null,


	// Override this to get our "magic" layout
	_layoutClass: _TreeLayout,

	createSelection: function(){
		this.selection = new TreeSelection(this);
	},

	_childItemSorter: function(a, b, attribute, descending){
		var av = this.store.getValue(a, attribute);
		var bv = this.store.getValue(b, attribute);
		if(av != bv){
			return av < bv == descending ? 1 : -1;
		}
		return 0;
	},

	_onNew: function(item, parentInfo){
		if(!parentInfo || !parentInfo.item){
			this.inherited(arguments);
		}else{
			var idx = this.getItemIndex(parentInfo.item);
			if(typeof idx == "string"){
				this.updateRow(idx.split('/')[0]);
			}else if(idx > -1){
				this.updateRow(idx);
			}
		}
	},

	_onSet: function(item, attribute, oldValue, newValue){
		this._checkUpdateStatus();
		if(this.aggregator){
			this.aggregator.clearSubtotalCache();
		}
		var idx = this.getItemIndex(item);
		if(typeof idx == "string"){
			this.updateRow(idx.split('/')[0]);
		}else if(idx > -1){
			this.updateRow(idx);
		}
	},

	_onDelete: function(item){
		this._cleanupExpandoCache(this._getItemIndex(item, true), this.store.getIdentity(item), item);
		this.inherited(arguments);
	},

	_clearData: function() {
		this.inherited(arguments);
		this._by_idty_paths = {};
	},

	_cleanupExpandoCache: function(index, identity, item){},

	_addItem: function(item, index, noUpdate, dontUpdateRoot){
		// add our root items to the root of the model's children
		// list since we don't query the model
		if(!dontUpdateRoot && this.model && array.indexOf(this.model.root.children, item) == -1){
			this.model.root.children[index] = item;
		}
		this.inherited(arguments);
	},

	getItem: function(/*integer|Array|String*/ idx){
		// summary:
		//		overridden so that you can pass in a '/' delimited string of indexes to get the
		//		item based off its path...that is, passing in "1/3/2" will get the
		//		3rd (0-based) child from the 4th child of the 2nd top-level item.
		var isArray = lang.isArray(idx);
		if(lang.isString(idx) && idx.indexOf('/')){
			idx = idx.split('/');
			isArray = true;
		}
		if(isArray && idx.length == 1){
			idx = idx[0];
			isArray = false;
		}
		if(!isArray){
			return DataGrid.prototype.getItem.call(this, idx);
		}
		var s = this.store;
		var itm = DataGrid.prototype.getItem.call(this, idx[0]);
		var cf, i, j;
		if(this.aggregator){
			cf = this.aggregator.childFields||[];
			if(cf){
				for(i = 0; i < idx.length - 1 && itm; i++){
					if(cf[i]){
						itm = (s.getValues(itm, cf[i])||[])[idx[i + 1]];
					}else{
						itm = null;
					}
				}
			}
		}else if(this.treeModel){
			cf = this.treeModel.childrenAttrs||[];
			if(cf&&itm){
				for(i=1, il=idx.length; (i<il) && itm; i++) {
					for(j=0, jl=cf.length; j<jl; j++) {
						if(cf[j]){
							itm = (s.getValues(itm, cf[j])||[])[idx[i]];
						}else{
							itm = null;
						}
						if(itm){ break; }
					}
				}
			}
		}
		return itm || null;
	},

	_getItemIndex: function(item, isDeleted){
		if(!isDeleted && !this.store.isItem(item)){
			return -1;
		}
		var idx = this.inherited(arguments);
		if(idx == -1){
			var idty = this.store.getIdentity(item);
			return this._by_idty_paths[idty] || -1;
		}
		return idx;
	},

	postMixInProperties: function(){
		if(this.treeModel && !("defaultOpen" in this.params)){
			// Default open to false for tree models, true for other tree
			// grids.
			this.defaultOpen = false;
		}
		var def = this.defaultOpen;
		this.openAtLevels = array.map(this.openAtLevels, function(l){
			if(typeof l == "string"){
				switch(l.toLowerCase()){
					case "true":
						return true;
						break;
					case "false":
						return false;
						break;
					default:
						var r = parseInt(l, 10);
						if(isNaN(r)){
							return def;
						}
						return r;
						break;
				}
			}
			return l;
		});
		this._by_idty_paths = {};
		this.inherited(arguments);
	},

	postCreate: function(){
		this.inherited(arguments);
		if(this.treeModel){
			this._setModel(this.treeModel);
		}
	},

	setModel: function(treeModel){
		this._setModel(treeModel);
		this._refresh(true);
	},

	_setModel: function(treeModel){
		if(treeModel && (!ForestStoreModel || !(treeModel instanceof ForestStoreModel))){
			throw new Error("dojox.grid.TreeGrid: treeModel must be an instance of dijit.tree.ForestStoreModel");
		}
		this.treeModel = treeModel;
		domClass.toggle(this.domNode, "dojoxGridTreeModel", this.treeModel ? true : false);
		this._setQuery(treeModel ? treeModel.query : null);
		this._setStore(treeModel ? treeModel.store : null);
	},

	createScroller: function(){
		this.inherited(arguments);
		this.scroller._origDefaultRowHeight = this.scroller.defaultRowHeight;
	},

	createManagers: function(){
		// summary:
		//		create grid managers for various tasks including rows, focus, selection, editing

		// row manager
		this.rows = new _RowManager(this);
		// focus manager
		this.focus = new _TreeFocusManager(this);
		// edit manager
		this.edit = new _EditManager(this);
	},

	_setStore: function(store){
		this.inherited(arguments);
		if(this.treeModel&&!this.treeModel.root.children){
			this.treeModel.root.children = [];
		}
		if(this.aggregator){
			this.aggregator.store = store;
		}
	},

	getDefaultOpenState: function(cellDef, item){
		// summary:
		//		Returns the default open state for the given definition and item
		//		It reads from the openAtLevels and defaultOpen values of the
		//		grid to calculate if the given item should default to open or
		//		not.
		var cf;
		var store = this.store;
		if(this.treeModel){ return this.defaultOpen; }
		if(!cellDef || !store || !store.isItem(item) ||
				!(cf = this.aggregator.childFields[cellDef.level])){
			return this.defaultOpen;
		}
		if(this.openAtLevels.length > cellDef.level){
			var dVal = this.openAtLevels[cellDef.level];
			if(typeof dVal == "boolean"){
				return dVal;
			}else if(typeof dVal == "number"){
				return (store.getValues(item, cf).length <= dVal);
			}
		}
		return this.defaultOpen;
	},
	onStyleRow: function(row){
		if(!this.layout._isCollapsable){
			this.inherited(arguments);
			return;
		}
		var base = domAttr.get(row.node, 'dojoxTreeGridBaseClasses');
		if(base){
			row.customClasses = base;
		}
		var i = row;
		var tagName = i.node.tagName.toLowerCase();
		i.customClasses += (i.odd?" dojoxGridRowOdd":"") +
						   (i.selected&&tagName=='tr'?" dojoxGridRowSelected":"") +
						   (i.over&&tagName=='tr'?" dojoxGridRowOver":"");
		this.focus.styleRow(i);
		this.edit.styleRow(i);
	},
	styleRowNode: function(inRowIndex, inRowNode){
		if(inRowNode){
			if(inRowNode.tagName.toLowerCase() == 'div' && this.aggregator){
				query("tr[dojoxTreeGridPath]", inRowNode).forEach(function(rowNode){
					this.rows.styleRowNode(domAttr.get(rowNode, 'dojoxTreeGridPath'), rowNode);
				},this);
			}
			this.rows.styleRowNode(inRowIndex, inRowNode);
		}
	},
	onCanSelect: function(inRowIndex){
		var nodes = query("tr[dojoxTreeGridPath='" + inRowIndex + "']", this.domNode);
		if(nodes.length){
			if(domClass.contains(nodes[0], 'dojoxGridSummaryRow')){
				return false;
			}
		}
		return this.inherited(arguments);
	},
	onKeyDown: function(e){
		if(e.altKey || e.metaKey){
			return;
		}
		switch(e.keyCode){
			case keys.UP_ARROW:
				if(!this.edit.isEditing() && this.focus.rowIndex != "0"){
					event.stop(e);
					this.focus.move(-1, 0);
				}
				break;
			case keys.DOWN_ARROW:
				var currPath = new TreePath(this.focus.rowIndex, this);
				var lastPath = new TreePath(this.rowCount-1, this);
				lastPath = lastPath.lastChild(true);
				if(!this.edit.isEditing() && currPath.toString() != lastPath.toString()){
					event.stop(e);
					this.focus.move(1, 0);
				}
				break;
			default:
				this.inherited(arguments);
				break;
		}
	},
	canEdit: function(inCell, inRowIndex){
		var node = inCell.getNode(inRowIndex);
		return node && this._canEdit;
	},
	doApplyCellEdit: function(inValue, inRowIndex, inAttrName){
		var item = this.getItem(inRowIndex);
		var oldValue = this.store.getValue(item, inAttrName);
		if(typeof oldValue == 'number'){
			inValue = isNaN(inValue) ? inValue : parseFloat(inValue);
		}else if(typeof oldValue == 'boolean'){
			inValue = inValue == 'true' ? true : inValue == 'false' ? false : inValue;
		}else if(oldValue instanceof Date){
			var asDate = new Date(inValue);
			inValue = isNaN(asDate.getTime()) ? inValue : asDate;
		}
		this.store.setValue(item, inAttrName, inValue);
		this.onApplyCellEdit(inValue, inRowIndex, inAttrName);
	}
});
TreeGrid.markupFactory = function(props, node, ctor, cellFunc){
	var widthFromAttr = function(n){
		var w = domAttr.get(n, "width")||"auto";
		if((w != "auto")&&(w.slice(-2) != "em")&&(w.slice(-1) != "%")){
			w = parseInt(w, 10)+"px";
		}
		return w;
	};

	var cellsFromMarkup = function(table){
		var rows;
		// Don't support colgroup on our grid - single view, single row only
		if(table.nodeName.toLowerCase() == "table" &&
					query("> colgroup", table).length === 0 &&
					(rows = query("> thead > tr", table)).length == 1){
			var tr = rows[0];
			return query("> th", rows[0]).map(function(th){
				// Grab type and field (the only ones that are shared
				var cell = {
					type: lang.trim(domAttr.get(th, "cellType")||""),
					field: lang.trim(domAttr.get(th, "field")||"")
				};
				if(cell.type){
					cell.type = lang.getObject(cell.type);
				}

				var subTable = query("> table", th)[0];
				if(subTable){
					// If we have a subtable, we are an aggregate and a summary cell
					cell.name = "";
					cell.children = cellsFromMarkup(subTable);
					if(domAttr.has(th, "itemAggregates")){
						cell.itemAggregates = array.map(domAttr.get(th, "itemAggregates").split(","), function(v){
							return lang.trim(v);
						});
					}else{
						cell.itemAggregates = [];
					}
					if(domAttr.has(th, "aggregate")){
						cell.aggregate = domAttr.get(th, "aggregate");
					}
					cell.type = cell.type || dojox.grid.cells.SubtableCell;
				}else{
					// Grab our other stuff we need (mostly what's in the normal
					// Grid)
					cell.name = lang.trim(domAttr.get(th, "name")||th.innerHTML);
					if(domAttr.has(th, "width")){
						cell.width = widthFromAttr(th);
					}
					if(domAttr.has(th, "relWidth")){
						cell.relWidth = window.parseInt(domAttr.get(th, "relWidth"), 10);
					}
					if(domAttr.has(th, "hidden")){
						cell.hidden = domAttr.get(th, "hidden") == "true";
					}
					cell.field = cell.field||cell.name;
					DataGrid.cell_markupFactory(cellFunc, th, cell);
					cell.type = cell.type || dojox.grid.cells.Cell;
				}
				if(cell.type && cell.type.markupFactory){
					cell.type.markupFactory(th, cell);
				}
				return cell;
			});
		}
		return [];
	};

	var rows;
	if(	!props.structure ){
		var row = cellsFromMarkup(node);
		if(row.length){
			// Set our structure here - so that we don't try and set it in the
			// markup factory
			props.structure = [{__span: Infinity, cells:[row]}];
		}
	}
	return DataGrid.markupFactory(props, node, ctor, cellFunc);
};

return TreeGrid;

});