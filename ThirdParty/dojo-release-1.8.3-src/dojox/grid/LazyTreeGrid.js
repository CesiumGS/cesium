define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/_base/array",
	"dojo/query",
	"dojo/parser",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom",
	"dojo/keys",	
	"dojo/text!./resources/Expando.html",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"./TreeGrid",
	"./_Builder",
	"./_View",
	"./_Layout",
	"./cells/tree",
	"./_RowManager",
	"./_FocusManager",
	"./_EditManager",
	"./DataSelection",
	"./util"
], function(dojo, declare, lang, event, array, query, parser, domConstruct,
	domClass, domStyle, domGeometry, dom, keys, template, _widget, _templatedMixin,
	TreeGrid, _Builder, _View, _Layout, TreeCell, _RowManager, _FocusManager, _EditManager, DataSelection, util){
		
var _LazyExpando = declare("dojox.grid._LazyExpando", [_widget, _templatedMixin], {
	grid: null,
	view: null,
	rowIdx: -1,
	cellIdx: -1,
	level: 0,
	itemId: "",
	templateString: template,
	onToggle: function(evt){
		// summary:
		//		The onclick handler of expando, expand/collapse a tree node if has children.
		if(this.grid._treeCache.items[this.rowIdx]){
			this.grid.focus.setFocusIndex(this.rowIdx, this.cellIdx);
			this.setOpen(!this.grid._treeCache.items[this.rowIdx].opened);
			try{
				event.stop(evt);
			}catch(e){}
		}
	},
	setOpen: function(open){
		// summary:
		//		expand/collapse the row where the expando is in.
		var g = this.grid,
			item = g._by_idx[this.rowIdx].item;
		if(item && g.treeModel.mayHaveChildren(item) && !g._loading && g._treeCache.items[this.rowIdx].opened !== open){
			g._treeCache.items[this.rowIdx].opened = open;
			g.expandoFetch(this.rowIdx, open);
			this._updateOpenState(item);
		}
	},
	_updateOpenState: function(item){
		var g = this.grid, state;
		if(item && g.treeModel.mayHaveChildren(item)){
			state = g._treeCache.items[this.rowIdx].opened;
			this.expandoInner.innerHTML = state ? "-" : "+";
			domClass.toggle(this.domNode, "dojoxGridExpandoOpened", state);
			this.domNode.parentNode.setAttribute("aria-expanded", state);
		}else{
			domClass.remove(this.domNode, "dojoxGridExpandoOpened");
		}
	},
	setRowNode: function(rowIdx, rowNode, view){
		if(this.cellIdx < 0 || !this.itemId){
			return false;
		}
		this.view = view;
		this.grid = view.grid;
		this.rowIdx = rowIdx;
		var marginPos = this.grid.isLeftToRight() ? "marginLeft" : "marginRight";
		domStyle.set(this.domNode.parentNode, marginPos, (this.level * 1.125) + "em");
		this._updateOpenState(this.grid._by_idx[this.rowIdx].item);
		return true;
	}
});

var _TreeGridContentBuilder = declare("dojox.grid._TreeGridContentBuilder", _Builder._ContentBuilder, {
	generateHtml: function(inDataIndex, rowIndex){
		var html = this.getTableArray(),
			grid = this.grid,
			v = this.view,
			cells = v.structure.cells,
			item = grid.getItem(rowIndex),
			level = 0,
			toggleClass = "",
			treePath = grid._treeCache.items[rowIndex] ? grid._treeCache.items[rowIndex].treePath : null;
		util.fire(this.view, "onBeforeRow", [rowIndex, cells]);
		if(item && lang.isArray(treePath)){
			level = treePath.length;
			toggleClass = grid.treeModel.mayHaveChildren(item) ? "" : "dojoxGridNoChildren";
		}
		var i = 0, j = 0, row, cell,
			mergedCells, totalWidth = 0, totalWidthes = [];
		for(; row = cells[j]; j++){
			if(row.hidden || row.header){
				continue;
			}
			html.push('<tr class="' + toggleClass + '">');
			// cell merge
			mergedCells = this._getColSpans(level);
			if(mergedCells){
				array.forEach(mergedCells, function(c){
					for(i = 0; cell = row[i]; i++){
						if(i >= c.start && i <= c.end){
							totalWidth += this._getCellWidth(row, i);
						}
					}
					totalWidthes.push(totalWidth);
					totalWidth = 0;
				}, this);
			}
			var m, cc, cs, pbm, k = 0;
			for(i = 0; cell = row[i]; i++){
				m = cell.markup;
				cc = cell.customClasses = [];
				cs = cell.customStyles = [];
				if(mergedCells && mergedCells[k] && (i >= mergedCells[k].start && i <= mergedCells[k].end)){
					var primaryIdx = mergedCells[k].primary || mergedCells[k].start;
					if(i == primaryIdx){
						m[5] = cell.formatAtLevel(item, level, rowIndex);
						m[1] = cc.join(' ');
						pbm = domGeometry.getMarginBox(cell.getHeaderNode()).w - domGeometry.getContentBox(cell.getHeaderNode()).w;
						cs = cell.customStyles = ['width:' + (totalWidthes[k] - pbm) + "px"];
						m[3] = cs.join(';');
						html.push.apply(html, m);
					}else if(i == mergedCells[k].end){
						k++;
						continue;
					}else{
						continue;
					}
				}else{
					m[5] = cell.formatAtLevel(item, level, rowIndex);
					m[1] = cc.join(' ');
					m[3] = cs.join(';');
					html.push.apply(html, m);
				}
			}
			html.push('</tr>');
		}
		html.push('</table>');
		return html.join(''); // String
	},
	_getColSpans: function(level){
		var colSpans = this.grid.colSpans;
		return colSpans && colSpans[level] ? colSpans[level] : null;
	},
	_getCellWidth: function(cells, colIndex){
		var curCell = cells[colIndex], node = curCell.getHeaderNode();
		if(curCell.hidden){
			return 0;
		}
		if(colIndex == cells.length - 1 || array.every(cells.slice(colIndex + 1), function(cell){
			return cell.hidden;
		})){
			var headerNodePos = domGeometry.position(cells[colIndex].view.headerContentNode.firstChild);
			return headerNodePos.x + headerNodePos.w - domGeometry.position(node).x;
		}else{
			var nextCell;
			do{
				nextCell = cells[++colIndex];
			}while(nextCell.hidden);
			return domGeometry.position(nextCell.getHeaderNode()).x - domGeometry.position(node).x;
		}
	}
});

declare("dojox.grid._TreeGridView", _View, {
	_contentBuilderClass: _TreeGridContentBuilder,
	postCreate: function(){
		this.inherited(arguments);
		this._expandos = {};
		this.connect(this.grid, '_onCleanupExpandoCache', '_cleanupExpandoCache');
	},
	destroy: function(){
		this._cleanupExpandoCache();
		this.inherited(arguments);
	},
	_cleanupExpandoCache: function(identity){
		if(identity && this._expandos[identity]){
			this._expandos[identity].destroy();
			delete this._expandos[identity];
		}else{
			var i;
			for(i in this._expandos){
				this._expandos[i].destroy();
			}
			this._expandos = {};
		}
	},
	onAfterRow: function(rowIndex, cells, rowNode){
		query("span.dojoxGridExpando", rowNode).forEach(function(n){
			if(n && n.parentNode){
				var idty, expando, _byIdx = this.grid._by_idx;
				if(_byIdx && _byIdx[rowIndex] && _byIdx[rowIndex].idty){
					idty = _byIdx[rowIndex].idty;
					expando = this._expandos[idty];
				}
				if(expando){
					domConstruct.place(expando.domNode, n, "replace");
					expando.itemId = n.getAttribute("itemId");
					expando.cellIdx = parseInt(n.getAttribute("cellIdx"), 10);
					if(isNaN(expando.cellIdx)){
						expando.cellIdx = -1;
					}
				}else{
					expando = parser.parse(n.parentNode)[0];
					if(idty){
						this._expandos[idty] = expando;
					}
				}
				if(!expando.setRowNode(rowIndex, rowNode, this)){
					expando.domNode.parentNode.removeChild(expando.domNode);
				}
				domConstruct.destroy(n);
			}
		}, this);
		this.inherited(arguments);
	},
	updateRow: function(rowIndex){
		var grid = this.grid, item;
		if(grid.keepSelection){
			item = grid.getItem(rowIndex);
			if(item){
				grid.selection.preserver._reSelectById(item, rowIndex);
			}
		}
		this.inherited(arguments);
	}
});

var LazyTreeCell = lang.mixin(lang.clone(TreeCell), {
	formatAtLevel: function(item, level, rowIndex){
		if(!item){
			return this.formatIndexes(rowIndex, item, level);
		}
		var result = "", ret = "", content;
		if(this.isCollapsable && this.grid.store.isItem(item)){
			ret = '<span ' + dojo._scopeName + 'Type="dojox.grid._LazyExpando" level="' + level + '" class="dojoxGridExpando"' +
					' itemId="' + this.grid.store.getIdentity(item) + '" cellIdx="' + this.index + '"></span>';
		}
		content = this.formatIndexes(rowIndex, item, level);
		result = ret !== "" ? '<div>' + ret + content + '</div>' : content;
		return result;
	},
	formatIndexes: function(rowIndex, item, level){
		var info = this.grid.edit.info,
			d = this.get ? this.get(rowIndex, item) : (this.value || this.defaultValue);
		if(this.editable && (this.alwaysEditing || (info.rowIndex === rowIndex && info.cell === this))){
			return this.formatEditing(d, rowIndex);
		}else{
			return this._defaultFormat(d, [d, rowIndex, level, this]);
		}
	}
});

var _LazyTreeLayout = declare("dojox.grid._LazyTreeLayout", _Layout, {
	// summary:
	//		Override the dojox.grid._TreeLayout to modify the _TreeGridView and cell formatter
	setStructure: function(structure){
		var g = this.grid, s = structure;
		if(g && !array.every(s, function(i){
			return !!i.cells;
		})){
			s = arguments[0] = [{cells:[s]}];//intentionally change arguments[0]
		}
		if(s.length === 1 && s[0].cells.length === 1){
			s[0].type = "dojox.grid._TreeGridView";
			this._isCollapsable = true;
			s[0].cells[0][this.grid.expandoCell].isCollapsable = true;
		}
		this.inherited(arguments);
	},
	addCellDef: function(rowIndex, cellIndex, def){
		var obj = this.inherited(arguments);
		return lang.mixin(obj, LazyTreeCell);
	}
});

var _LazyTreeGridCache = declare("dojox.grid._LazyTreeGridCache", null, {
	// summary:
	//		An internal object used to cache the tree path and open state of each item.
	//		The form of the cache items would be an object array: 
	//		[{opened: true/false, treePath: [level0 parent id, level1 parent id, ...]}]
	// example:
	//		| [{opened: true, treePath: []},
	//		|  {opened: false, treePath: ["root0"]},
	//		|  {opened: false, treePath: ["root0"]},
	//		|  {opened: false, treePath: []},
	//		|  ...]
	constructor: function(){
		this.items = [];
	},
	getSiblingIndex: function(rowIndex, treePath){
		var i = rowIndex - 1, indexCount = 0, tp;
		for(; i >=0; i--){
			tp = this.items[i] ? this.items[i].treePath : [];
			if(tp.join('/') === treePath.join('/')){
				indexCount++;
			}else if(tp.length < treePath.length){
				break;
			}
		}
		return indexCount;
	},
	removeChildren: function(rowIndex){
		// find next sibling index
		var i = rowIndex + 1, count, tp,
			treePath = this.items[rowIndex] ? this.items[rowIndex].treePath : [];
		for(; i < this.items.length; i++){
			tp = this.items[i] ? this.items[i].treePath : [];
			if(tp.join('/') === treePath.join('/') || tp.length <= treePath.length){
				break;
			}
		}
		count = i - (rowIndex + 1);
		this.items.splice(rowIndex + 1, count);
		return count;
	}
});

var LazyTreeGrid = declare("dojox.grid.LazyTreeGrid", TreeGrid, {
	// summary:
	//		An enhanced TreeGrid widget which supports lazy-loading for nested children items
	//
	// description:
	//		LazyTreeGrid inherits from dojo.grid.TreeGrid and applies virtual scrolling mechanism
	//		to nested children rows so that it's possible to deal with complex tree structure data set
	//		with nested and huge children rows. It's also compatible with dijit.tree.ForestStoreModel
	//
	//		Most methods and properties pertaining to dojox.grid.DataGrid
	//		and dojox.grid.TreeGrid also apply here
	//
	//		LazyTreeGrid does not support summary row/items aggregate due to the lazy-loading rationale.

	_layoutClass: _LazyTreeLayout,
	_size: 0,

	// treeModel: dijit/tree/.ForestStoreModel|dojox/grid/LazyTreeGridStoreModel
	//		A tree store model object.
	treeModel: null,

	// defaultState: Object
	//		Used to restore the state of LazyTreeGrid.
	//		This object should ONLY be obtained from `LazyTreeGrid.getState()`.
	defaultState: null,

	// colSpans: Object
	//		A json object that defines column span of each level rows.  Attributes:
	//
	//		- 0/1/..: which level need to colspan
	//		- start: start column index of colspan
	//		- end: end column index of colspan
	//		- primary: index of column which content will be displayed (default is value of start).
	//
	//		example:
	//		|	colSpans = {
	//		|	0:	[
	//		|			{start: 0, end: 1, primary: 0},
	//		|			{start: 2, end: 4, primary: 3}
	//		|		],
	//		|	1:	[
	//		|			{start: 0, end: 3, primary: 1}
	//		|		]
	//		|	};
	colSpans: null,
	
	postCreate: function(){
		this._setState();
		this.inherited(arguments);
		if(!this._treeCache){
			this._treeCache = new _LazyTreeGridCache();
		}
		if(!this.treeModel || !(this.treeModel instanceof dijit.tree.ForestStoreModel)){
			throw new Error("dojox.grid.LazyTreeGrid: must be used with a treeModel which is an instance of dijit.tree.ForestStoreModel");
		}
		domClass.add(this.domNode, "dojoxGridTreeModel");
		dom.setSelectable(this.domNode, this.selectable);
	},
	createManagers: function(){
		this.rows = new _RowManager(this);
		this.focus = new _FocusManager(this);
		this.edit = new _EditManager(this);
	},
	createSelection: function(){
		this.selection = new DataSelection(this);
	},
	setModel: function(treeModel){
		if(!treeModel){
			return;
		}
		this._setModel(treeModel);
		this._cleanup();
		this._refresh(true);
	},
	setStore: function(store, query, queryOptions){
		if(!store){
			return;
		}
		this._setQuery(query, queryOptions);
		this.treeModel.query = query;
		this.treeModel.store = store;
		this.treeModel.root.children = [];
		this.setModel(this.treeModel);
	},
	onSetState: function(){
		// summary:
		//		Event fired when a default state being set.
	},
	_setState: function(){
		if(this.defaultState){
			this._treeCache = this.defaultState.cache;
			this.sortInfo = this.defaultState.sortInfo || 0;
			this.query = this.defaultState.query || this.query;
			this._lastScrollTop = this.defaultState.scrollTop;
			if(this.keepSelection){
				this.selection.preserver._selectedById = this.defaultState.selection;
			}else{
				this.selection.selected = this.defaultState.selection || [];
			}
			this.onSetState();
		}
	},
	getState: function(){
		// summary:
		//		Get the current state of LazyTreeGrid including expanding, sorting, selection and scroll top state.
		var _this = this, 
			selection = this.keepSelection ? this.selection.preserver._selectedById : this.selection.selected;
		return {
			cache: lang.clone(_this._treeCache),
			query: lang.clone(_this.query),
			sortInfo: lang.clone(_this.sortInfo),
			scrollTop: lang.clone(_this.scrollTop),
			selection: lang.clone(selection)
		};
	},
	_setQuery: function(query, queryOptions){
		this.inherited(arguments);
		this.treeModel.query = query;
	},
	filter: function(query, reRender){
		this._cleanup();
		this.inherited(arguments);
    },
	destroy: function(){
		this._cleanup();
		this.inherited(arguments);
	},
	expand: function(itemId){
		// summary:
		//		Expand the row with the given itemId.
		// itemId: String?
		this._fold(itemId, true);
	},
	collapse: function(itemId){
		// summary:
		//		Collapse the row with the given itemId.
		// itemId: String?
		this._fold(itemId, false);
	},
	refresh: function(keepState){
		// summary:
		//		Refresh, and persist the expand/collapse state when keepState equals true
		// keepState: Boolean
		if(!keepState){
			this._cleanup();
		}
		this._refresh(true);
	},
	_cleanup: function(){
		this._treeCache.items = [];
		this._onCleanupExpandoCache();
	},
	setSortIndex: function(inIndex, inAsc){
		// Need to clean up the cache before sorting
		if(this.canSort(inIndex + 1)){
			this._cleanup();
		}
		this.inherited(arguments);
	},
	_refresh: function(isRender){
		this._clearData();
		this.updateRowCount(this._size);
		this._fetch(0, true);
	},
	render: function(){
		this.inherited(arguments);
		this.setScrollTop(this.scrollTop);
	},
	_onNew: function(item, parentInfo){
		var addingChild = parentInfo && this.store.isItem(parentInfo.item) && array.some(this.treeModel.childrenAttrs, function(c){
			return c === parentInfo.attribute;
		});
		var items = this._treeCache.items, byIdx = this._by_idx;
		if(!addingChild){
			items.push({opened: false, treePath: []});
			this._size += 1;
			this.inherited(arguments);
		}else{
			var parentItem = parentInfo.item, 
				parentIdty = this.store.getIdentity(parentItem),
				rowIndex = -1, i = 0;
			for(; i < byIdx.length; i++){
				if(parentIdty === byIdx[i].idty){
					rowIndex = i;
					break;
				}
			}
			if(rowIndex >= 0){
				if(items[rowIndex] && items[rowIndex].opened){
					var parentTreePath = items[rowIndex].treePath, pos = rowIndex + 1;
					for(; pos < items.length; pos++){
						if(items[pos].treePath.length <= parentTreePath.length){
							break;
						}
					}
					var treePath = parentTreePath.slice();
					treePath.push(parentIdty);
					this._treeCache.items.splice(pos, 0, {opened: false, treePath: treePath});
					// update grid._by_idx
					var idty = this.store.getIdentity(item);
					this._by_idty[idty] = { idty: idty, item: item };
					byIdx.splice(pos, 0, this._by_idty[idty]);
					// update grid
					this._size += 1;
					this.updateRowCount(this._size);
					this._updateRenderedRows(pos);
				}else{
					this.updateRow(rowIndex);
				}
			}
		}
	},
	_onDelete: function(item){
		var i = 0, rowIndex = -1, idty = this.store.getIdentity(item);
		for(; i < this._by_idx.length; i++){
			if(idty === this._by_idx[i].idty){
				rowIndex = i;
				break;
			}
		}
		if(rowIndex >= 0){
			var items = this._treeCache.items, treePath = items[rowIndex] ? items[rowIndex].treePath : [], tp, count = 1;
			i = rowIndex + 1;
			for(; i < this._size; i++, count++){
				tp = items[i] ? items[i].treePath : [];
				if(items[i].treePath.length <= treePath.length){
					break;
				}
			}
			items.splice(rowIndex, count);
			this._onCleanupExpandoCache(idty);
			this._by_idx.splice(rowIndex, count);
			this._size -= count;
			this.updateRowCount(this._size);
			this._updateRenderedRows(rowIndex);
		}
	},
	_onCleanupExpandoCache: function(identity){},
	_fetch: function(start, isRender){
		if(!this._loading){
			this._loading = true;
		}
		start = start || 0;
		var count = this._size - start > 0 ? Math.min(this.rowsPerPage, this._size - start) : this.rowsPerPage;
		var i = 0;
		var fetchedItems = [];
		this._reqQueueLen = 0;
		for(; i < count; i++){
			if(this._by_idx[start + i]){
				fetchedItems.push(this._by_idx[start + i].item);
			}else{
				break;
			}
		}
		if(fetchedItems.length === count){
			this._reqQueueLen = 1;
			this._onFetchBegin(this._size, {startRowIdx: start, count: count});
			this._onFetchComplete(fetchedItems, {startRowIdx: start, count: count});
		}else{
			var level, nextLevel, len = 1, items = this._treeCache.items, 
				treePath = items[start] ? items[start].treePath : [];
			for(i = 1; i < count; i++){
				level = items[start + len - 1] ? items[start + len - 1].treePath.length : 0;
				nextLevel = items[start + len] ? items[start + len].treePath.length : 0;
				if(level !== nextLevel){
					this._reqQueueLen++;
					this._fetchItems({startRowIdx: start, count: len, treePath: treePath});
					start = start + len;
					len = 1;
					treePath = items[start] ? items[start].treePath : 0;
				}else{
					len++;
				}
			}
			this._reqQueueLen++;
			this._fetchItems({startRowIdx: start, count: len, treePath: treePath});
		}
	},
	_fetchItems: function(req){
		if(this._pending_requests[req.startRowIdx]){
			return;
		}
		this.showMessage(this.loadingMessage);
		this._pending_requests[req.startRowIdx] = true;
		var	onError = lang.hitch(this, '_onFetchError'),
			start = this._treeCache.getSiblingIndex(req.startRowIdx, req.treePath);
		if(req.treePath.length === 0){
			this.store.fetch({
				start: start,
				startRowIdx: req.startRowIdx,
				treePath: req.treePath,
				count: req.count,
				query: this.query,
				sort: this.getSortProps(),
				queryOptions: this.queryOptions,
				onBegin: lang.hitch(this, '_onFetchBegin'),
				onComplete: lang.hitch(this, '_onFetchComplete'),
				onError: lang.hitch(this, '_onFetchError')
			});
		}else{
			var parentId = req.treePath[req.treePath.length - 1], parentItem;
			var queryObj = {
				start: start,
				startRowIdx: req.startRowIdx,
				treePath: req.treePath,
				count: req.count,
				parentId: parentId,
				sort: this.getSortProps()
			};
			var _this = this;
			var onComplete = function(){
				var f = lang.hitch(_this, '_onFetchComplete');
				if(arguments.length == 1){
					f.apply(_this, [arguments[0], queryObj]);
				}else{
					f.apply(_this, arguments);
				}
			};
			if(this._by_idty[parentId]){
				parentItem = this._by_idty[parentId].item;
				this.treeModel.getChildren(parentItem, onComplete, onError, queryObj);
			}else{
				this.store.fetchItemByIdentity({
					identity: parentId,
					onItem: function(item){
						_this.treeModel.getChildren(item, onComplete, onError, queryObj);
					},
					onError: onError
				});
			}
		}
	},
	_onFetchBegin: function(size, request){
		if(this._treeCache.items.length === 0){
			this._size = parseInt(size, 10);
		}
		size = this._size;
		// this._size = size = this._treeCache.items.length;
		this.inherited(arguments);
	},
	_onFetchComplete: function(items, request){
		var startRowIdx = request.startRowIdx,
			count = request.count,
			start = items.length <= count ? 0: request.start,
			treePath = request.treePath || [];
		if(lang.isArray(items) && items.length > 0){
			var i = 0, len = Math.min(count, items.length);
			for(; i < len; i++){
				if(!this._treeCache.items[startRowIdx + i]){
					this._treeCache.items[startRowIdx + i] = {opened: false, treePath: treePath};
				}
				if(!this._by_idx[startRowIdx + i]){
					this._addItem(items[start + i], startRowIdx + i, true);
				}
				// this._treeCache.items.splice(startRowIdx + i, 0, {opened: false, treePath: treePath});
			}
			this.updateRows(startRowIdx, len);
		}
		if(this._size == 0){
			this.showMessage(this.noDataMessage);
		}else{
			this.showMessage();
		}
		this._pending_requests[startRowIdx] = false;
		this._reqQueueLen--;
		if(this._loading && this._reqQueueLen === 0){
			this._loading = false;
			if(this._lastScrollTop){
				this.setScrollTop(this._lastScrollTop);
			}
		}
	},
	expandoFetch: function(rowIndex, open){
		// summary:
		//		Function for fetch children of a given row
		if(this._loading || !this._by_idx[rowIndex]){return;}
		this._loading = true;
		this._toggleLoadingClass(rowIndex, true);
		this.expandoRowIndex = rowIndex;
		var item = this._by_idx[rowIndex].item;
		// this._pages = [];
		if(open){
			var queryObj = {
				start: 0,
				count: this.rowsPerPage,
				parentId: this.store.getIdentity(this._by_idx[rowIndex].item),
				sort: this.getSortProps()
			};
			this.treeModel.getChildren(item, lang.hitch(this, "_onExpandoComplete"), lang.hitch(this, "_onFetchError"), queryObj);
		}else{
			// get the whole children number when clear the children from cache
			var num = this._treeCache.removeChildren(rowIndex);
			// remove the items from grid._by_idx
			this._by_idx.splice(rowIndex + 1, num);
			this._bop = this._eop = -1;
			//update grid
			this._size -= num;
			this.updateRowCount(this._size);
			this._updateRenderedRows(rowIndex + 1);
			this._toggleLoadingClass(rowIndex, false);
			if(this._loading){
				this._loading = false;
			}
			this.focus._delayedCellFocus();
		}
	},
	_onExpandoComplete: function(childItems, request, size){
		size = isNaN(size) ? childItems.length : parseInt(size, 10);
		var treePath = this._treeCache.items[this.expandoRowIndex].treePath.slice(0);
		treePath.push(this.store.getIdentity(this._by_idx[this.expandoRowIndex].item));
		var i = 1, idty;
		for(; i <= size; i++){
			this._treeCache.items.splice(this.expandoRowIndex + i, 0, {treePath: treePath, opened: false});
		}
		this._size += size;
		this.updateRowCount(this._size);
		for(i = 0; i < size; i++){
			if(childItems[i]){
				idty = this.store.getIdentity(childItems[i]);
				this._by_idty[idty] = { idty: idty, item: childItems[i] };
				this._by_idx.splice(this.expandoRowIndex + 1 + i, 0, this._by_idty[idty]);
			}else{
				this._by_idx.splice(this.expandoRowIndex + 1 + i, 0, null);
			}
		}
		this._updateRenderedRows(this.expandoRowIndex + 1);
		this._toggleLoadingClass(this.expandoRowIndex, false);
		this.stateChangeNode = null;
		if(this._loading){
			this._loading = false;
		}
		if(this.autoHeight === true){
			this._resize();
		}
		this.focus._delayedCellFocus();
	},
	styleRowNode: function(rowIndex, rowNode){
		if(rowNode){
			this.rows.styleRowNode(rowIndex, rowNode);
		}
	},
	onStyleRow: function(row){
		if(!this.layout._isCollapsable){
			this.inherited(arguments);
			return;
		}
		row.customClasses += (row.odd ? " dojoxGridRowOdd" : "") + (row.selected ? " dojoxGridRowSelected" : "") + (row.over ? " dojoxGridRowOver" : "");
		this.focus.styleRow(row);
		this.edit.styleRow(row);
	},
	onKeyDown: function(e){
		if(e.altKey || e.metaKey){
			return;
		}
		var expando = dijit.findWidgets(e.target)[0];
		if(e.keyCode === keys.ENTER && expando instanceof _LazyExpando){
			expando.onToggle();
		}
		this.inherited(arguments);
	},
	_toggleLoadingClass: function(rowIndex, flag){
		var views = this.views.views, node,
			rowNode = views[views.length - 1].getRowNode(rowIndex);
		if(rowNode){
			node = query('.dojoxGridExpando', rowNode)[0];
			if(node){
				domClass.toggle(node, "dojoxGridExpandoLoading", flag);
			}
		}
	},
	_updateRenderedRows: function(start){
		array.forEach(this.scroller.stack, function(p){
			if(p * this.rowsPerPage >= start){
				this.updateRows(p * this.rowsPerPage, this.rowsPerPage);
			}else if((p + 1) * this.rowsPerPage >=  start){
				this.updateRows(start, (p + 1) * this.rowsPerPage - start + 1);
			}
		}, this);
	},
	_fold: function(itemId, open){
		var rowIndex = -1, i = 0, byIdx = this._by_idx, idty = this._by_idty[itemId];
		if(idty && idty.item && this.treeModel.mayHaveChildren(idty.item)){
			for(; i < byIdx.length; i++){
				if(byIdx[i] && byIdx[i].idty === itemId){
					rowIndex = i;
					break;
				}
			}
			if(rowIndex >= 0){
				var rowNode = this.views.views[this.views.views.length - 1].getRowNode(rowIndex);
				if(rowNode){
					var expando = dijit.findWidgets(rowNode)[0];
					if(expando){
						expando.setOpen(open);
					}
				}
			}
		}
	}
});

LazyTreeGrid.markupFactory = function(props, node, ctor, cellFunc){
	return TreeGrid.markupFactory(props, node, ctor, cellFunc);
};

return LazyTreeGrid;

});