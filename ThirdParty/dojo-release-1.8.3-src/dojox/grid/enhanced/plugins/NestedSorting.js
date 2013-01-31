define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/lang",
	"dojo/_base/html",
	"dojo/_base/event",
	"dojo/_base/window",
	"dojo/keys",
	"dojo/query",
	"dojo/string",
	"../_Plugin",
	"../../EnhancedGrid"
], function(declare, array, connect, lang, html, evt, win, keys, query, string, _Plugin, EnhancedGrid){

var NestedSorting = declare("dojox.grid.enhanced.plugins.NestedSorting", _Plugin, {
	// summary:
	//		Provides nested sorting feature
	//
	// description:
	//		A flexible way to control multiple column sorting, including
	//
	//		1. Set default sorting order
	//		2. Disable sorting for certain columns
	//		3. Set sorting order dynamically with JS API
	//
	// example:
	// |	<script type="text/javascript">
	// |		var grid = new dojox.grid.EnhancedGrid({plugins : {nestedSorting: true}},
	// |	               sortFields: [{attribute: 'col4', descending: false},...],//set default sorting order
	// |			       canSort: function(index, field){ return true},//disable sorting for a column
	// |				   ... }, dojo.byId('gridDiv'));
	// |		grid.startup();
	// |		//set new sorting order
	// |		grid.setSortIndex([{attribute: 'col3', descending: true},...])
	// |	</script>
	
	// name: String
	//		Plugin name
	name: "nestedSorting",
	
	_currMainSort: 'none',//'none'|'asc'|'desc'
	
	_currRegionIdx: -1,
	
	_a11yText: {
		'dojoxGridDescending'   : '&#9662;',
		'dojoxGridAscending'    : '&#9652;',
		'dojoxGridAscendingTip' : '&#1784;',
		'dojoxGridDescendingTip': '&#1783;',
		'dojoxGridUnsortedTip'  : 'x' //'&#10006;'
	},
	
	constructor: function(){
		this._sortDef = [];
		this._sortData = {};
		this._headerNodes = {};
		//column index that are hidden, un-sortable or indirect selection etc.
		this._excludedColIdx = [];
		this.nls = this.grid._nls;
		this.grid.setSortInfo = function(){};
		this.grid.setSortIndex = lang.hitch(this, '_setGridSortIndex');
		this.grid.getSortIndex = function(){};
		this.grid.getSortProps = lang.hitch(this, 'getSortProps');
		if(this.grid.sortFields){
			this._setGridSortIndex(this.grid.sortFields, null, true);
		}
		this.connect(this.grid.views, 'render', '_initSort');//including column resize
		this.initCookieHandler();
		if(this.grid.plugin('rearrange')){
			this.subscribe("dojox/grid/rearrange/move/" + this.grid.id, lang.hitch(this, '_onColumnDnD'));
		}else{
			this.connect(this.grid.layout, 'moveColumn', '_onMoveColumn');
		}
	},
	onStartUp: function(){
		//overwrite base Grid functions
		this.inherited(arguments);
		this.connect(this.grid, 'onHeaderCellClick', '_onHeaderCellClick');
		this.connect(this.grid, 'onHeaderCellMouseOver', '_onHeaderCellMouseOver');
		this.connect(this.grid, 'onHeaderCellMouseOut', '_onHeaderCellMouseOut');
	},
	_onMoveColumn: function(sourceViewIndex, destViewIndex, cellIndex, targetIndex, before){
		var cr = this._getCurrentRegion(),
			idx = cr && this._getRegionHeader(cr).getAttribute('idx'),
			c = this._headerNodes[idx],
			sortData = this._sortData,
			newSortData = {},
			sortIndex, data;
		if(cr){
			this._blurRegion(cr);
			this._currRegionIdx = array.indexOf(this._getRegions(), c.firstChild);
		}
		if(targetIndex < cellIndex){
			for(sortIndex in sortData){
				sortIndex = parseInt(sortIndex, 10);
				data = sortData[sortIndex];
				if(data){
					if(sortIndex >= targetIndex && sortIndex < cellIndex){
						newSortData[sortIndex + 1] = data;
					}else if(sortIndex == cellIndex){
						newSortData[targetIndex] = data;
					}else{
						newSortData[sortIndex] = data;
					}
				}
			}
		}else if(targetIndex > cellIndex + 1){
			if(!before){
				targetIndex++;
			}
			for(sortIndex in sortData){
				sortIndex = parseInt(sortIndex, 10);
				data = sortData[sortIndex];
				if(data){
					if(sortIndex > cellIndex && sortIndex < targetIndex){
						newSortData[sortIndex - 1] = data;
					}else if(sortIndex == cellIndex){
						newSortData[targetIndex - 1] = data;
					}else{
						newSortData[sortIndex] = data;
					}
				}
			}
		}
		this._sortData = newSortData;
		this._initSort(false);
	},
	_onColumnDnD: function(type, mapping){
		// summary:
		//		Update nested sorting after column moved		
		if(type !== 'col'){return;}
		var m = mapping, obj = {}, d = this._sortData, p;
		var cr = this._getCurrentRegion();
		this._blurRegion(cr);
		var idx = this._getRegionHeader(cr).getAttribute('idx');
		for(p in m){
			if(d[p]){
				obj[m[p]] = d[p];
				delete d[p];
			}
			if(p === idx){
				idx = m[p];
			}
		}
		for(p in obj){
			d[p] = obj[p];
		}
		var c = this._headerNodes[idx];
		this._currRegionIdx = array.indexOf(this._getRegions(), c.firstChild);
		this._initSort(false);
	},
	_setGridSortIndex: function(inIndex, inAsc, noRefresh){
		if(lang.isArray(inIndex)){
			var i, d, cell;
			for(i = 0; i < inIndex.length; i++){
				d = inIndex[i];
				cell = this.grid.getCellByField(d.attribute);
				if(!cell){
					console.warn('Invalid sorting option, column ', d.attribute, ' not found.');
					return;
				}
				if(cell['nosort'] || !this.grid.canSort(cell.index, cell.field)){
					console.warn('Invalid sorting option, column ', d.attribute, ' is unsortable.');
					return;
				}
			}
			this.clearSort();
			array.forEach(inIndex, function(d, i){
				cell = this.grid.getCellByField(d.attribute);
				this.setSortData(cell.index, 'index', i);
				this.setSortData(cell.index, 'order', d.descending ? 'desc': 'asc');
			}, this);
		}else if(!isNaN(inIndex)){
			if(inAsc === undefined){ return; }//header click from base DataGrid
			this.setSortData(inIndex, 'order', inAsc ? 'asc' : 'desc');
		}else{
			return;
		}
		this._updateSortDef();
		if(!noRefresh){
			this.grid.sort();
		}
	},
	getSortProps: function(){
		// summary:
		//		Overwritten, see DataGrid.getSortProps()
		return this._sortDef.length ? this._sortDef : null;
	},
	_initSort: function(postSort){
		// summary:
		//		Initiate sorting
		var g = this.grid, n = g.domNode, len = this._sortDef.length;
		html.toggleClass(n, 'dojoxGridSorted', !!len);
		html.toggleClass(n, 'dojoxGridSingleSorted', len === 1);
		html.toggleClass(n, 'dojoxGridNestSorted', len > 1);
		if(len > 0){
			this._currMainSort = this._sortDef[0].descending ? 'desc' : 'asc';
		}
		var idx, excluded = this._excludedCoIdx = [];//reset it
		//cache column index of hidden, un-sortable or indirect selection
		this._headerNodes = query("th", g.viewsHeaderNode).forEach(function(n){
			idx = parseInt(n.getAttribute('idx'), 10);
			if(html.style(n, 'display') === 'none' || g.layout.cells[idx]['nosort'] || (g.canSort && !g.canSort(idx, g.layout.cells[idx]['field']))){
				excluded.push(idx);
			}
		});
		this._headerNodes.forEach(this._initHeaderNode, this);
		this._initFocus();
		if(postSort){
			this._focusHeader();
		}
	},
	_initHeaderNode: function(node){
		// summary:
		//		Initiate sort for each header cell node
		html.toggleClass(node, 'dojoxGridSortNoWrap', true);
		var sortNode = query('.dojoxGridSortNode', node)[0];
		if(sortNode){
			html.toggleClass(sortNode, 'dojoxGridSortNoWrap', true);
		}
		if(array.indexOf(this._excludedCoIdx, node.getAttribute('idx')) >= 0){
			html.addClass(node, 'dojoxGridNoSort');
			return;
		}
		if(!query('.dojoxGridSortBtn', node).length){
			//clear any previous connects
			this._connects = array.filter(this._connects, function(conn){
				if(conn._sort){
					connect.disconnect(conn);
					return false;
				}
				return true;
			});
			var n = html.create('a', {
				className: 'dojoxGridSortBtn dojoxGridSortBtnNested',
				title: string.substitute(this.nls.sortingState, [this.nls.nestedSort, this.nls.ascending]),
				innerHTML: '1'
			}, node.firstChild, 'last');
			n.onmousedown = evt.stop;
			n = html.create('a', {
				className: 'dojoxGridSortBtn dojoxGridSortBtnSingle',
				title: string.substitute(this.nls.sortingState, [this.nls.singleSort, this.nls.ascending])
			}, node.firstChild, 'last');
			n.onmousedown = evt.stop;
		}else{
			//deal with small height grid which doesn't re-render the grid after refresh
			var a1 = query('.dojoxGridSortBtnSingle', node)[0];
			var a2 = query('.dojoxGridSortBtnNested', node)[0];
			a1.className = 'dojoxGridSortBtn dojoxGridSortBtnSingle';
			a2.className = 'dojoxGridSortBtn dojoxGridSortBtnNested';
			a2.innerHTML = '1';
			html.removeClass(node, 'dojoxGridCellShowIndex');
			html.removeClass(node.firstChild, 'dojoxGridSortNodeSorted');
			html.removeClass(node.firstChild, 'dojoxGridSortNodeAsc');
			html.removeClass(node.firstChild, 'dojoxGridSortNodeDesc');
			html.removeClass(node.firstChild, 'dojoxGridSortNodeMain');
			html.removeClass(node.firstChild, 'dojoxGridSortNodeSub');
		}
		this._updateHeaderNodeUI(node);
	},
	_onHeaderCellClick: function(e){
		// summary:
		//		See dojox.grid.enhanced._Events._onHeaderCellClick()
		this._focusRegion(e.target);
		if(html.hasClass(e.target, 'dojoxGridSortBtn')){
			this._onSortBtnClick(e);
			evt.stop(e);
			this._focusRegion(this._getCurrentRegion());
		}
	},
	_onHeaderCellMouseOver: function(e){
		// summary:
		//		See dojox.grid._Events._onHeaderCellMouseOver()
		//		When user mouseover other columns than sorted column in a single sorted grid,
		//		We need to show 1 in the sorted column
		if(!e.cell){return; }
		if(this._sortDef.length > 1){ return; }
		if(this._sortData[e.cellIndex] && this._sortData[e.cellIndex].index === 0){ return; }
		var p;
		for(p in this._sortData){
			if(this._sortData[p] && this._sortData[p].index === 0){
				html.addClass(this._headerNodes[p], 'dojoxGridCellShowIndex');
				break;
			}
		}
		if(!html.hasClass(win.body(), 'dijit_a11y')){ return; }
		//a11y support
		var i = e.cell.index, node = e.cellNode;
		var singleSortBtn = query('.dojoxGridSortBtnSingle', node)[0];
		var nestedSortBtn = query('.dojoxGridSortBtnNested', node)[0];
		
		var sortMode = 'none';
		if(html.hasClass(this.grid.domNode, 'dojoxGridSingleSorted')){
			sortMode = 'single';
		}else if(html.hasClass(this.grid.domNode, 'dojoxGridNestSorted')){
			sortMode = 'nested';
		}
		var nestedIndex = nestedSortBtn.getAttribute('orderIndex');
		if(nestedIndex === null || nestedIndex === undefined){
			nestedSortBtn.setAttribute('orderIndex', nestedSortBtn.innerHTML);
			nestedIndex = nestedSortBtn.innerHTML;
		}
		if(this.isAsc(i)){
			nestedSortBtn.innerHTML = nestedIndex + this._a11yText.dojoxGridDescending;
		}else if(this.isDesc(i)){
			nestedSortBtn.innerHTML = nestedIndex + this._a11yText.dojoxGridUnsortedTip;
		}else{
			nestedSortBtn.innerHTML = nestedIndex + this._a11yText.dojoxGridAscending;
		}
		if(this._currMainSort === 'none'){
			singleSortBtn.innerHTML = this._a11yText.dojoxGridAscending;
		}else if(this._currMainSort === 'asc'){
			singleSortBtn.innerHTML = this._a11yText.dojoxGridDescending;
		}else if(this._currMainSort === 'desc'){
			singleSortBtn.innerHTML = this._a11yText.dojoxGridUnsortedTip;
		}
	},
	_onHeaderCellMouseOut: function(e){
		// summary:
		//		See dojox.grid.enhanced._Events._onHeaderCellMouseOut()
		var p;
		for(p in this._sortData){
			if(this._sortData[p] && this._sortData[p].index === 0){
				html.removeClass(this._headerNodes[p], 'dojoxGridCellShowIndex');
				break;
			}
		}
	},
	_onSortBtnClick: function(e){
		// summary:
		//		If the click target is single sort button, do single sort.
		//		Else if the click target is nested sort button, do nest sort.
		//		Otherwise return.
		var cellIdx = e.cell.index;
		if(html.hasClass(e.target, 'dojoxGridSortBtnSingle')){
			this._prepareSingleSort(cellIdx);
		}else if(html.hasClass(e.target, 'dojoxGridSortBtnNested')){
			this._prepareNestedSort(cellIdx);
		}else{
			return;
		}
		evt.stop(e);
		this._doSort(cellIdx);
	},
	_doSort: function(cellIdx){
		if(!this._sortData[cellIdx] || !this._sortData[cellIdx].order){
			this.setSortData(cellIdx, 'order', 'asc');	//no sorting data
		}else if(this.isAsc(cellIdx)){
			this.setSortData(cellIdx, 'order', 'desc');	//change to 'desc'
		}else if(this.isDesc(cellIdx)){
			this.removeSortData(cellIdx); //remove from sorting sequence
		}
		this._updateSortDef();
		this.grid.sort();
		this._initSort(true);
	},
	setSortData: function(cellIdx, attr, value){
		// summary:
		//		Set sorting data for a column.
		var sd = this._sortData[cellIdx];
		if(!sd){
			sd = this._sortData[cellIdx] = {};
		}
		sd[attr] = value;
	},
	removeSortData: function(cellIdx){
		var d = this._sortData, i = d[cellIdx].index, p;
		delete d[cellIdx];
		for(p in d){
			if(d[p].index > i){
				d[p].index--;
			}
		}
	},
	_prepareSingleSort: function(cellIdx){
		// summary:
		//		Prepare the single sort, also called main sort, this will clear any existing sorting and just sort the grid by current column.
		var d = this._sortData, p;
		for(p in d){
			delete d[p];
		}
		this.setSortData(cellIdx, 'index', 0);
		this.setSortData(cellIdx, 'order', this._currMainSort === 'none' ? null : this._currMainSort);
		if(!this._sortData[cellIdx] || !this._sortData[cellIdx].order){
			this._currMainSort = 'asc';
		}else if(this.isAsc(cellIdx)){
			this._currMainSort = 'desc';
		}else if(this.isDesc(cellIdx)){
			this._currMainSort = 'none';
		}
	},
	_prepareNestedSort: function(cellIdx){
		// summary:
		//		Prepare the nested sorting, this will order the column on existing sorting result.
		var i = this._sortData[cellIdx] ? this._sortData[cellIdx].index : null;
		if(i === 0 || !!i){ return; }
		this.setSortData(cellIdx, 'index', this._sortDef.length);
	},
	_updateSortDef: function(){
		this._sortDef.length = 0;
		var d = this._sortData, p;
		for(p in d){
			this._sortDef[d[p].index] = {
				attribute: this.grid.layout.cells[p].field,
				descending: d[p].order === 'desc'
			};
		}
	},
	_updateHeaderNodeUI: function(node){
		// summary:
		//		Update the column header UI based on current sorting state.
		//		Show indicator of the sorting order of the column, no order no indicator
		var cell = this._getCellByNode(node);
		var cellIdx = cell.index;
		var data = this._sortData[cellIdx];
		var sortNode = query('.dojoxGridSortNode', node)[0];
		var singleSortBtn = query('.dojoxGridSortBtnSingle', node)[0];
		var nestedSortBtn = query('.dojoxGridSortBtnNested', node)[0];
		
		html.toggleClass(singleSortBtn, 'dojoxGridSortBtnAsc', this._currMainSort === 'asc');
		html.toggleClass(singleSortBtn, 'dojoxGridSortBtnDesc', this._currMainSort === 'desc');
		if(this._currMainSort === 'asc'){
			singleSortBtn.title = string.substitute(this.nls.sortingState, [this.nls.singleSort, this.nls.descending]);
		}else if(this._currMainSort === 'desc'){
			singleSortBtn.title = string.substitute(this.nls.sortingState, [this.nls.singleSort, this.nls.unsorted]);
		}else{
			singleSortBtn.title = string.substitute(this.nls.sortingState, [this.nls.singleSort, this.nls.ascending]);
		}
		
		var _this = this;
		function setWaiState(){
			var columnInfo = 'Column ' + (cell.index + 1) + ' ' + cell.field;
			var orderState = 'none';
			var orderAction = 'ascending';
			if(data){
				orderState = data.order === 'asc' ? 'ascending' : 'descending';
				orderAction = data.order === 'asc' ? 'descending' : 'none';
			}
			var a11ySingleLabel = columnInfo + ' - is sorted by ' + orderState;
			var a11yNestedLabel = columnInfo + ' - is nested sorted by ' + orderState;
			var a11ySingleLabelHover = columnInfo + ' - choose to sort by ' + orderAction;
			var a11yNestedLabelHover = columnInfo + ' - choose to nested sort by ' + orderAction;
			
			singleSortBtn.setAttribute("aria-label", a11ySingleLabel);
			nestedSortBtn.setAttribute("aria-label", a11yNestedLabel);
			
			var handles = [
				_this.connect(singleSortBtn, "onmouseover", function(){
					singleSortBtn.setAttribute("aria-label", a11ySingleLabelHover);
				}),
				_this.connect(singleSortBtn, "onmouseout", function(){
					singleSortBtn.setAttribute("aria-label", a11ySingleLabel);
				}),
				_this.connect(nestedSortBtn, "onmouseover", function(){
					nestedSortBtn.setAttribute("aria-label", a11yNestedLabelHover);
				}),
				_this.connect(nestedSortBtn, "onmouseout", function(){
					nestedSortBtn.setAttribute("aria-label", a11yNestedLabel);
				})
			];
			array.forEach(handles, function(handle){ handle._sort = true; });
		}
		setWaiState();

		var a11y = html.hasClass(win.body(), "dijit_a11y");
		if(!data){
			nestedSortBtn.innerHTML = this._sortDef.length + 1;
			nestedSortBtn.title = string.substitute(this.nls.sortingState, [this.nls.nestedSort, this.nls.ascending]);
			if(a11y){sortNode.innerHTML = this._a11yText.dojoxGridUnsortedTip;}
			return;
		}
		if(data.index || (data.index === 0 && this._sortDef.length > 1)){
			nestedSortBtn.innerHTML = data.index + 1;
		}
		html.addClass(sortNode, 'dojoxGridSortNodeSorted');
		if(this.isAsc(cellIdx)){
			html.addClass(sortNode, 'dojoxGridSortNodeAsc');
			nestedSortBtn.title = string.substitute(this.nls.sortingState, [this.nls.nestedSort, this.nls.descending]);
			if(a11y){sortNode.innerHTML = this._a11yText.dojoxGridAscendingTip;}
		}else if(this.isDesc(cellIdx)){
			html.addClass(sortNode, 'dojoxGridSortNodeDesc');
			nestedSortBtn.title = string.substitute(this.nls.sortingState, [this.nls.nestedSort, this.nls.unsorted]);
			if(a11y){sortNode.innerHTML = this._a11yText.dojoxGridDescendingTip;}
		}
		html.addClass(sortNode, (data.index === 0 ? 'dojoxGridSortNodeMain' : 'dojoxGridSortNodeSub'));
	},
	isAsc: function(cellIndex){
		return this._sortData[cellIndex].order === 'asc';
	},
	isDesc: function(cellIndex){
		return this._sortData[cellIndex].order === 'desc';
	},
	_getCellByNode: function(node){
		var i;
		for(i = 0; i < this._headerNodes.length; i++){
			if(this._headerNodes[i] === node){
				return this.grid.layout.cells[i];
			}
		}
		return null;
	},
	clearSort: function(){
		this._sortData = {};
		this._sortDef.length = 0;
	},
	
	//persistence
	initCookieHandler: function(){
		if(this.grid.addCookieHandler){
			this.grid.addCookieHandler({
				name: "sortOrder",
				onLoad: lang.hitch(this, '_loadNestedSortingProps'),
				onSave: lang.hitch(this, '_saveNestedSortingProps')
			});
		}
	},
	_loadNestedSortingProps: function(sortInfo, grid){
		this._setGridSortIndex(sortInfo);
	},
	_saveNestedSortingProps: function(grid){
		return this.getSortProps();
	},
	
	//focus & keyboard
	_initFocus: function(){
		var f = this.focus = this.grid.focus;
		this._focusRegions = this._getRegions();
		if(!this._headerArea){
			var area = this._headerArea = f.getArea('header');
			area.onFocus = f.focusHeader = lang.hitch(this, '_focusHeader');
			area.onBlur = f.blurHeader = f._blurHeader = lang.hitch(this, '_blurHeader');
			area.onMove = lang.hitch(this, '_onMove');
			area.onKeyDown = lang.hitch(this, '_onKeyDown');
			area._regions = [];
			area.getRegions = null;
			this.connect(this.grid, 'onBlur', '_blurHeader');
		}
	},
	_focusHeader: function(e){
		// summary:
		//		Overwritten, see _FocusManager.focusHeader()
		// delayed: Boolean
		//		If called from "this.focus._delayedHeaderFocus()"
		if(this._currRegionIdx === -1){
			this._onMove(0, 1, null);
		}else{
			this._focusRegion(this._getCurrentRegion());
		}
		try{
			if(e){
				evt.stop(e);
			}
		}catch(e){}
		return true;
	},
	_blurHeader: function(e){
		this._blurRegion(this._getCurrentRegion());
		return true;
	},
	_onMove: function(rowStep, colStep, e){
		var curr = this._currRegionIdx || 0, regions = this._focusRegions;
		var region = regions[curr + colStep];
		if(!region){
			return;
		}else if(html.style(region, 'display') === 'none' || html.style(region, 'visibility') === 'hidden'){
			//if the region is invisible, keep finding next
			this._onMove(rowStep, colStep + (colStep > 0 ? 1 : -1), e);
			return;
		}
		this._focusRegion(region);
		//keep grid body scrolled by header
		var view = this._getRegionView(region);
		view.scrollboxNode.scrollLeft = view.headerNode.scrollLeft;
	},
	_onKeyDown: function(e, isBubble){
		if(isBubble){
			switch(e.keyCode){
				case keys.ENTER:
				case keys.SPACE:
					if(html.hasClass(e.target, 'dojoxGridSortBtnSingle') ||
						html.hasClass(e.target, 'dojoxGridSortBtnNested')){
						this._onSortBtnClick(e);
					}
			}
		}
	},
	_getRegionView: function(region){
		var header = region;
		while(header && !html.hasClass(header, 'dojoxGridHeader')){ header = header.parentNode; }
		if(header){
			return array.filter(this.grid.views.views, function(view){
				return view.headerNode === header;
			})[0] || null;
		}
		return null;
	},
	_getRegions: function(){
		var regions = [], cells = this.grid.layout.cells;
		this._headerNodes.forEach(function(n, i){
			if(html.style(n, 'display') === 'none'){return;}
			if(cells[i]['isRowSelector']){
				regions.push(n);
				return;
			}
			query('.dojoxGridSortNode,.dojoxGridSortBtnNested,.dojoxGridSortBtnSingle', n).forEach(function(node){
					node.setAttribute('tabindex', 0);
					regions.push(node);
			});
		},this);
		return regions;
	},
	_focusRegion: function(region){
		// summary:
		//		Focus the given region
		if(!region){return;}
		var currRegion = this._getCurrentRegion();
		if(currRegion && region !== currRegion){
			this._blurRegion(currRegion);
		}
		var header = this._getRegionHeader(region);
		html.addClass(header, 'dojoxGridCellSortFocus');
		if(html.hasClass(region, 'dojoxGridSortNode')){
			html.addClass(region, 'dojoxGridSortNodeFocus');
		}else if(html.hasClass(region, 'dojoxGridSortBtn')){
			html.addClass(region, 'dojoxGridSortBtnFocus');
		}
		//For invisible nodes, IE will throw error when calling focus().
		try{
			region.focus();
		}catch(e){}
		this.focus.currentArea('header');
		this._currRegionIdx = array.indexOf(this._focusRegions, region);
	},
	_blurRegion: function(region){
		if(!region){return;}
		var header = this._getRegionHeader(region);
		html.removeClass(header, 'dojoxGridCellSortFocus');
		if(html.hasClass(region, 'dojoxGridSortNode')){
			html.removeClass(region, 'dojoxGridSortNodeFocus');
		}else if(html.hasClass(region, 'dojoxGridSortBtn')){
			html.removeClass(region, 'dojoxGridSortBtnFocus');
		}
		region.blur();
	},
	_getCurrentRegion: function(){
		return this._focusRegions ? this._focusRegions[this._currRegionIdx] : null;
	},
	_getRegionHeader: function(region){
		while(region && !html.hasClass(region, 'dojoxGridCell')){
			region = region.parentNode;
		}
		return region;
	},
	destroy: function(){
		this._sortDef = this._sortData = null;
		this._headerNodes = this._focusRegions = null;
		this.inherited(arguments);
	}
});

EnhancedGrid.registerPlugin(NestedSorting);

return NestedSorting;
});
