define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/html",
	"dojo/_base/window",
	"dojo/_base/connect",
	"dojo/_base/sniff",
	"dojo/query",
	"dojo/keys",
	"dojo/string",
	"../_Plugin",
	"../../EnhancedGrid",
	"../../cells/dijit"
], function(declare, array, evt, lang, html, win, connect, has, query, keys, string, _Plugin, EnhancedGrid){

var gridCells = lang.getObject("dojox.grid.cells");

var RowSelector = declare("dojox.grid.cells.RowSelector", gridCells._Widget, {
	// summary:
	//		 Common attributes & functions for row selectors(Radio|CheckBox)

	// inputType: String
	//		Input type - Radio|CheckBox
	inputType: "",
	
	// map: Object
	//		Cache div refs of radio|checkbox to avoid querying each time
	map: null,
	
	// disabledMap: Object
	//		Cache index of disabled rows
	disabledMap: null,
	
	// isRowSelector: Boolean
	//		Marker of indirectSelection cell(column)
	isRowSelector: true,

	// _connects: Array
	//		List of all connections.
	_connects: null,
	
	// _subscribes: Array
	//		List of all subscribes.
	_subscribes: null,

	// checkedText: String
	//		Checked character for high contrast mode
	checkedText: '&#10003;',

	// unCheckedText: String
	//		Unchecked character for high contrast mode
	unCheckedText: 'O',

	constructor: function(){
		this.map = {}; this.disabledMap = {}; this.disabledCount= 0;
		this._connects = []; this._subscribes = [];
		this.inA11YMode = html.hasClass(win.body(), "dijit_a11y");
		
		this.baseClass = "dojoxGridRowSelector dijitReset dijitInline dijit" + this.inputType;
		this.checkedClass = " dijit" + this.inputType + "Checked";
		this.disabledClass = " dijit" + this.inputType + "Disabled";
		this.checkedDisabledClass = " dijit" + this.inputType + "CheckedDisabled";
		this.statusTextClass = " dojoxGridRowSelectorStatusText";//a11y use

		this._connects.push(connect.connect(this.grid, 'dokeyup', this, '_dokeyup'));
		this._connects.push(connect.connect(this.grid.selection, 'onSelected', this, '_onSelected'));
		this._connects.push(connect.connect(this.grid.selection, 'onDeselected', this, '_onDeselected'));
		this._connects.push(connect.connect(this.grid.scroller, 'invalidatePageNode', this, '_pageDestroyed'));
		this._connects.push(connect.connect(this.grid, 'onCellClick', this, '_onClick'));
		this._connects.push(connect.connect(this.grid, 'updateRow', this, '_onUpdateRow'));
	},
	formatter: function(data, rowIndex, scope){
		// summary:
		//		Overwritten, see dojox.grid.cells._Widget
		var _this = scope;
		var clazz = _this.baseClass;
		var checked = !!_this.getValue(rowIndex);
		var disabled = !!_this.disabledMap[rowIndex];//normalize 'undefined'
		
		if(checked){
			clazz += _this.checkedClass;
			if(disabled){ clazz += _this.checkedDisabledClass; }
		}else if(disabled){
			clazz += _this.disabledClass;
		}
		return ["<div tabindex = -1 ",
				"id = '" + _this.grid.id + "_rowSelector_" + rowIndex + "' ",
				"name = '" + _this.grid.id + "_rowSelector' class = '" + clazz + "' ",
				"role = " + _this.inputType + " aria-checked = '" + checked + "' aria-disabled = '" + disabled +
				"' aria-label = '" + string.substitute(_this.grid._nls["indirectSelection" + _this.inputType], [rowIndex + 1]) + "'>",
				"<span class = '" + _this.statusTextClass + "'>" + (checked ? _this.checkedText : _this.unCheckedText) + "</span>",
				"</div>"].join("");
	},
	setValue: function(rowIndex, inValue){
		// summary:
		//		Overwritten, see dojox.grid.cells._Widget
		//		Simply return, no action
	},
	getValue: function(rowIndex){
		// summary:
		//		Overwritten, see dojox.grid.cells._Widget
		return this.grid.selection.isSelected(rowIndex);
	},
	toggleRow: function(index, value){
		// summary:
		//		toggle checked | unchecked state for given row
		// index: Integer
		//		Row index
		// value: Boolean
		//		True - checked | False - unchecked
		this._nativeSelect(index, value);
	},
	setDisabled: function(index, disabled){
		// summary:
		//		toggle disabled | enabled state for given row
		// idx: Integer
		//		Row index
		// disabled: Boolean
		//		True - disabled | False - enabled
		if(index < 0){ return; }
		this._toggleDisabledStyle(index, disabled);
	},
	disabled: function(index){
		// summary:
		//		Check if one row is disabled
		return !!this.disabledMap[index];
	},
	_onClick: function(e){
		// summary:
		//		When mouse click on the selector cell, select/deselect the row.
		if(e.cell === this){
			this._selectRow(e);
		}
	},
	_dokeyup: function(e){
		// summary:
		//		Event handler for key up event
		//		- from dojox.grid.enhanced._Events.dokeyup()
		// e: Event
		//		Key up event
		if(e.cellIndex == this.index && e.rowIndex >= 0 && e.keyCode == keys.SPACE){
			this._selectRow(e);
		}
	},
	focus: function(rowIndex){
		// summary:
		//		Set focus to given row
		// rowIndex: Integer
		//		Target row
		var selector = this.map[rowIndex];
		if(selector){ selector.focus(); }
	},
	_focusEndingCell: function(rowIndex, cellIndex){
		// summary:
		//		Set focus to the ending grid cell(rowIndex,cellIndex) when swipe selection finished
		// rowIndex: Integer
		//		Row index
		// cellIndex: Integer
		//		Column index
		var cell = this.grid.getCell(cellIndex);
		this.grid.focus.setFocusCell(cell, rowIndex);
	},
	_nativeSelect: function(index, value){
		// summary:
		//		Use grid's native selection
		this.grid.selection[value ? 'select' : 'deselect'](index);
	},
	_onSelected: function(index){
		// summary:
		//		Triggered when a row is selected
		this._toggleCheckedStyle(index, true);
	},
	_onDeselected: function(index){
		// summary:
		//		Triggered when a row is deselected
		this._toggleCheckedStyle(index, false);
	},
	_onUpdateRow: function(index){
		// summary:
		//		Clear cache when row is re-built.
		delete this.map[index];
	},
	_toggleCheckedStyle: function(index, value){
		// summary:
		//		Change css styles for checked | unchecked
		var selector = this._getSelector(index);
		if(selector){
			html.toggleClass(selector, this.checkedClass, value);
			if(this.disabledMap[index]){
				html.toggleClass(selector, this.checkedDisabledClass, value);
			}
			selector.setAttribute("aria-checked", value);
			if(this.inA11YMode){
				selector.firstChild.innerHTML = (value ? this.checkedText : this.unCheckedText);
			}
		}
	},
	_toggleDisabledStyle: function(index, disabled){
		// summary:
		//		Change css styles for disabled | enabled
		var selector = this._getSelector(index);
		if(selector){
			html.toggleClass(selector, this.disabledClass, disabled);
			if(this.getValue(index)){
				html.toggleClass(selector, this.checkedDisabledClass, disabled);
			}
			selector.setAttribute("aria-disabled", disabled);
		}
		this.disabledMap[index] = disabled;
		if(index >= 0){
			this.disabledCount += disabled ? 1 : -1;
		}
	},
	_getSelector: function(index){
		// summary:
		//		Find selector for given row caching it if 1st time found
		var selector = this.map[index];
		if(!selector){//use accurate query for better performance
			var rowNode = this.view.rowNodes[index];
			if(rowNode){
				selector = query('.dojoxGridRowSelector', rowNode)[0];
				if(selector){ this.map[index] = selector; }
			}
		}
		return selector;
	},
	_pageDestroyed: function(pageIndex){
		// summary:
		//		Explicitly empty map cache when a page destroyed
		//		See dojox.grid._Scroller.invalidatePageNode()
		// pageIndex: Integer
		//		Index of destroyed page
		var rowsPerPage = this.grid.scroller.rowsPerPage;
		var start = pageIndex * rowsPerPage, end = start + rowsPerPage - 1;
		for(var i = start; i <= end; i++){
			if(!this.map[i]){continue;}
			html.destroy(this.map[i]);
			delete this.map[i];
		}
		//console.log("Page ",pageIndex, " destroyed, Map=",this.map);
	},
	destroy: function(){
		for(var i in this.map){
			html.destroy(this.map[i]);
			delete this.map[i];
		}
		for(i in this.disabledMap){ delete this.disabledMap[i]; }
		array.forEach(this._connects, connect.disconnect);
		array.forEach(this._subscribes, connect.unsubscribe);
		delete this._connects;
		delete this._subscribes;
		//console.log('Single(Multiple)RowSelector.destroy() executed!');
	}
});

var SingleRowSelector = declare("dojox.grid.cells.SingleRowSelector", RowSelector, {
	// summary:
	//		IndirectSelection cell(column) for single selection mode, using styles of dijit.form.RadioButton
	inputType: "Radio",

	_selectRow: function(e){
		// summary:
		//		Select the target row
		// e: Event
		//		Event fired on the target row
		var index = e.rowIndex;
		if(this.disabledMap[index]){ return; }
		this._focusEndingCell(index, e.cellIndex);
		this._nativeSelect(index, !this.grid.selection.selected[index]);
	}
});

var MultipleRowSelector = declare("dojox.grid.cells.MultipleRowSelector", RowSelector, {
	// summary:
	//		Indirect selection cell for multiple or extended mode, using dijit.form.CheckBox

	// inputType: String
	inputType: "CheckBox",
	
	// swipeStartRowIndex: Integer
	//		Start row index for swipe selection
	swipeStartRowIndex: -1,

	// swipeMinRowIndex: Integer
	//		Min row index for swipe selection
	swipeMinRowIndex: -1,
	
	// swipeMinRowIndex: Integer
	//		Max row index for swipe selection
	swipeMaxRowIndex: -1,
	
	// toSelect: Boolean
	//		new state for selection
	toSelect: false,
	
	// lastClickRowIdx: Integer
	//		Row index for last click, used for range selection via Shift + click
	lastClickRowIdx: -1,
		
	unCheckedText: '&#9633;',

	constructor: function(){
		this._connects.push(connect.connect(win.doc, 'onmouseup', this, '_domouseup'));
		this._connects.push(connect.connect(this.grid, 'onRowMouseOver', this, '_onRowMouseOver'));
		this._connects.push(connect.connect(this.grid.focus, 'move', this, '_swipeByKey'));
		this._connects.push(connect.connect(this.grid, 'onCellMouseDown', this, '_onMouseDown'));
		if(this.headerSelector){//option set by user to add a select-all checkbox in column header
			this._connects.push(connect.connect(this.grid.views, 'render', this, '_addHeaderSelector'));
			this._connects.push(connect.connect(this.grid, '_onFetchComplete', this, '_addHeaderSelector'));
			this._connects.push(connect.connect(this.grid, 'onSelectionChanged', this, '_onSelectionChanged'));
			this._connects.push(connect.connect(this.grid, 'onKeyDown', this, function(e){
				if(e.rowIndex == -1 && e.cellIndex == this.index && e.keyCode == keys.SPACE){
					this._toggletHeader();//TBD - a better way
				}
			}));
		}
	},
	toggleAllSelection:function(checked){
		// summary:
		//		Toggle select all|deselect all
		// checked: Boolean
		//		True - select all, False - deselect all
		var grid = this.grid, selection = grid.selection;
		if(checked){
			selection.selectRange(0, grid.rowCount-1);
		}else{
			selection.deselectAll();
		}
	},
	_onMouseDown: function(e){
		if(e.cell == this){
			this._startSelection(e.rowIndex);
			evt.stop(e);
		}
	},
	_onRowMouseOver: function(e){
		// summary:
		//		Event fired when mouse moves over a data row(outside of this column).
		//		- from dojox.grid.enhanced._Events.onRowMouseOver()
		// e: Event
		//		Decorated event object which contains reference to grid, cell, and rowIndex
		this._updateSelection(e, 0);
	},
	_domouseup: function(e){
		// summary:
		//		Event handler for mouse up event - from dojo.doc.domouseup()
		// e: Event
		//		Mouse up event
		if(has('ie')){
			this.view.content.decorateEvent(e);//TODO - why only e in IE hasn't been decorated?
		}
		var inSwipeSelection = e.cellIndex >= 0 && this.inSwipeSelection() && !this.grid.edit.isEditRow(e.rowIndex);
		if(inSwipeSelection){
			this._focusEndingCell(e.rowIndex, e.cellIndex);
		}
		this._finishSelect();
	},
	_dokeyup: function(e){
		// summary:
		//		Event handler for key up event
		//		- from dojox.grid.enhanced._Events.dokeyup()
		// e: Event
		//		Key up event
		this.inherited(arguments);
		if(!e.shiftKey){
			this._finishSelect();
		}
	},
	_startSelection: function(rowIndex){
		// summary:
		//		Initialize parameters to start a new swipe selection
		// rowIndex: Integer
		//		Index of the start row
		this.swipeStartRowIndex = this.swipeMinRowIndex = this.swipeMaxRowIndex = rowIndex;
		this.toSelect = !this.getValue(rowIndex);
	},
	_updateSelection: function(e, delta){
		// summary:
		//		Update row selections, fired during a swipe selection
		// e: Event
		//		Event of the current row,
		// delta: Integer
		//		Row index delta, used for swipe selection via Shift + Arrow key
		//		0: not via key, -1 : Shift +  Up, 1 : Shift + Down
		if(!this.inSwipeSelection()){ return; }
		
		var byKey = delta !== 0;//whether via Shift + Arrow Key
		var currRow = e.rowIndex, deltaRow = currRow - this.swipeStartRowIndex + delta;
		if(deltaRow > 0 && this.swipeMaxRowIndex < currRow + delta){
			this.swipeMaxRowIndex = currRow + delta;
		}
		if(deltaRow < 0 && this.swipeMinRowIndex > currRow + delta){
			this.swipeMinRowIndex = currRow + delta;
		}

		var min = deltaRow > 0 ? this.swipeStartRowIndex : currRow + delta;
		var max = deltaRow > 0 ? currRow + delta : this.swipeStartRowIndex;
		for(var i = this.swipeMinRowIndex; i <= this.swipeMaxRowIndex; i++){
			if(this.disabledMap[i] || i < 0){ continue; }
			if(i >= min && i <= max){//deltaRow != 0 || this.toSelect
				this._nativeSelect(i, this.toSelect);
			}else if(!byKey){
				this._nativeSelect(i, !this.toSelect);
			}
		}
	},
	_swipeByKey: function(rowOffset, colOffset, e){
		// summary:
		//		Update row selections, fired when Shift + Cursor is used for swipe selection
		//		See dojox.grid.enhanced._Events.onKeyDown
		// e: Event
		//		Event of the current row,
		// rowOffset: Integer
		//		Row offset, used for swipe selection via Shift + Cursor
		//		-1 : Shift +  Up, 1 : Shift + Down
		if(!e || rowOffset === 0 || !e.shiftKey || e.cellIndex != this.index ||
			this.grid.focus.rowIndex < 0){ //TBD - e.rowIndex == 0 && delta == -1
			return;
		}
		var rowIndex = e.rowIndex;
		if(this.swipeStartRowIndex < 0){
			//A new swipe selection starts via Shift + Arrow key
			this.swipeStartRowIndex = rowIndex;
			if(rowOffset > 0){//Shift + Down
				this.swipeMaxRowIndex = rowIndex + rowOffset;
				this.swipeMinRowIndex = rowIndex;
			}else{//Shift + UP
				this.swipeMinRowIndex = rowIndex + rowOffset;
				this.swipeMaxRowIndex = rowIndex;
			}
			this.toSelect = this.getValue(rowIndex);
		}
		this._updateSelection(e, rowOffset);
	},
	_finishSelect: function(){
		// summary:
		//		Reset parameters to end a swipe selection
		this.swipeStartRowIndex = -1;
		this.swipeMinRowIndex = -1;
		this.swipeMaxRowIndex = -1;
		this.toSelect = false;
	},
	inSwipeSelection: function(){
		// summary:
		//		Check if during a swipe selection
		// returns: Boolean
		//		Whether in swipe selection
		return this.swipeStartRowIndex >= 0;
	},
	_nativeSelect: function(index, value){
		// summary:
		//		Overwritten
		this.grid.selection[value ? 'addToSelection' : 'deselect'](index);
	},
	_selectRow: function(e){
		// summary:
		//		Select the target row or range or rows
		// e: Event
		//		Event fired on the target row
		var rowIndex = e.rowIndex;
		if(this.disabledMap[rowIndex]){ return; }
		evt.stop(e);
		this._focusEndingCell(rowIndex, e.cellIndex);
		
		var delta = rowIndex - this.lastClickRowIdx;
		var newValue = !this.grid.selection.selected[rowIndex];
		if(this.lastClickRowIdx >= 0 && !e.ctrlKey && !e.altKey && e.shiftKey){
			var min = delta > 0 ? this.lastClickRowIdx : rowIndex;
			var max = delta > 0 ? rowIndex : this.lastClickRowIdx;
			for(var i = min; i >= 0 && i <= max; i++){
				this._nativeSelect(i, newValue);
			}
		}else{
			this._nativeSelect(rowIndex, newValue);
		}
		this.lastClickRowIdx = rowIndex;
	},
	getValue: function(rowIndex){
		// summary:
		//		Overwritten
		if(rowIndex == -1){//header selector
			var g = this.grid;
			return g.rowCount > 0 && g.rowCount <= g.selection.getSelectedCount();
		}
		return this.inherited(arguments);
	},
	_addHeaderSelector: function(){
		// summary:
		//		Add selector in column header for selecting|deselecting all
		var headerCellNode = this.view.getHeaderCellNode(this.index);
		if(!headerCellNode){ return; }
		html.empty(headerCellNode);
		var g = this.grid;
		var selector = headerCellNode.appendChild(html.create("div", {
			'aria-label': g._nls["selectAll"],
			"tabindex": -1, "id": g.id + "_rowSelector_-1", "class": this.baseClass, "role": "Checkbox",
			"innerHTML": "<span class = '" + this.statusTextClass +
				"'></span><span style='height: 0; width: 0; overflow: hidden; display: block;'>" +
				g._nls["selectAll"] + "</span>"
		}));
		this.map[-1] = selector;
		var idx = this._headerSelectorConnectIdx;
		if(idx !== undefined){
			connect.disconnect(this._connects[idx]);
			this._connects.splice(idx, 1);
		}
		this._headerSelectorConnectIdx = this._connects.length;
		this._connects.push(connect.connect(selector, 'onclick', this, '_toggletHeader'));
		this._onSelectionChanged();
	},
	_toggletHeader: function(){
		// summary:
		//		Toggle state for head selector
		if(!!this.disabledMap[-1]){ return; }
		this.grid._selectingRange = true;
		this.toggleAllSelection(!this.getValue(-1));
		this._onSelectionChanged();
		this.grid._selectingRange = false;
	},
	_onSelectionChanged: function(){
		// summary:
		//		Update header selector anytime selection changed
		var g = this.grid;
		if(!this.map[-1] || g._selectingRange){ return; }
		g.allItemsSelected = this.getValue(-1);
		this._toggleCheckedStyle(-1, g.allItemsSelected);
	},
	_toggleDisabledStyle: function(index, disabled){
		// summary:
		//		Overwritten
		this.inherited(arguments);
		if(this.headerSelector){
			var allDisabled = (this.grid.rowCount == this.disabledCount);
			if(allDisabled != !!this.disabledMap[-1]){//only if needed
				arguments[0] = -1;
				arguments[1] = allDisabled;
				this.inherited(arguments);
			}
		}
	}
});

var IndirectSelection = declare("dojox.grid.enhanced.plugins.IndirectSelection", _Plugin, {
	// summary:
	//		A handy way for adding check boxe/radio button for rows, and selecting rows by swiping(or keyboard)

	// description:
	//		For better rendering performance, div(images) are used to simulate radio button|check boxes
	//
	// example:
	// |	<div dojoType="dojox.grid.EnhancedGrid" plugins="{indirectSelection: true}" ...></div>
	//		or
	// |	<div dojoType="dojox.grid.EnhancedGrid" plugins="{indirectSelection: {name: 'xxx', width:'30px', styles:'text-align: center;'}}" ...></div>

	// name: String
	//		Plugin name
	name: "indirectSelection",
	
	constructor: function(){
		// Hook layout.setStructure(), so that indirectSelection is always included
		var layout = this.grid.layout;
		this.connect(layout, 'setStructure', lang.hitch(layout, this.addRowSelectCell, this.option));
	},
	addRowSelectCell: function(option){
		// summary:
		//		Add indirectSelection cell(mapped to a column of radio button|check boxes)
		if(!this.grid.indirectSelection || this.grid.selectionMode == 'none'){
			return;
		}
		var rowSelectCellAdded = false, inValidFields = ['get', 'formatter', 'field', 'fields'],
		defaultCellDef = {type: MultipleRowSelector, name: '', width:'30px', styles:'text-align: center;'};
		if(option.headerSelector){ option.name = ''; }//mutual conflicting attrs

		if(this.grid.rowSelectCell){//remove the existed one
			this.grid.rowSelectCell.destroy();
		}
		
		array.forEach(this.structure, function(view){
			var cells = view.cells;
			if(cells && cells.length > 0 && !rowSelectCellAdded){
				var firstRow = cells[0];
				if(firstRow[0] && firstRow[0].isRowSelector){
					console.debug('addRowSelectCell() - row selector cells already added, return.');
					rowSelectCellAdded = true;
					return;
				}
				var selectDef, cellType = this.grid.selectionMode == 'single' ? SingleRowSelector : MultipleRowSelector;
				selectDef = lang.mixin(defaultCellDef, option, {type: cellType, editable: false, notselectable: true, filterable: false, navigatable: true, nosort: true});
				array.forEach(inValidFields, function(field){//remove invalid fields
					if(field in selectDef){ delete selectDef[field]; }
				});
				if(cells.length > 1){ selectDef.rowSpan = cells.length; }//for complicate layout
				array.forEach(this.cells, function(cell, i){
					if(cell.index >= 0){
						cell.index += 1;
						//console.debug('cell '+ (cell.index - 1) +  ' is updated to index ' + cell.index);
					}else{
						console.warn('Error:IndirectSelection.addRowSelectCell()-  cell ' + i + ' has no index!');
					}
				});
				var rowSelectCell = this.addCellDef(0, 0, selectDef);
				rowSelectCell.index = 0;
				firstRow.unshift(rowSelectCell);
				this.cells.unshift(rowSelectCell);
				this.grid.rowSelectCell = rowSelectCell;
				rowSelectCellAdded = true;
			}
		}, this);
		this.cellCount = this.cells.length;
	},
	destroy: function(){
		this.grid.rowSelectCell.destroy();
		delete this.grid.rowSelectCell;
		this.inherited(arguments);
	}
});

EnhancedGrid.registerPlugin(IndirectSelection/*name:'indirectSelection'*/, {"preInit": true});

return IndirectSelection;
});
