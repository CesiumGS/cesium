define([
	"dojo/_base/declare"
], function(declare){
//require Exporter here, so the implementations only need to require this file,
//and the users only need to require the implementation file.

return declare("dojox.grid.enhanced.plugins.exporter._ExportWriter", null, {
	// summary:
	//		This is an abstract class for all kinds of writers used in the Exporter plugin.
	//		It utilizes the strategy pattern to break the export work into several stages,
	//		and provide interfaces for all of them.
	//
	//		Implementations might choose some of the functions in this class to override,
	//		thus providing their own functionalities.
	//
	//		The Exporter will go through the grid line by line. So in every line, all the Views
	//		will be reached, and the header line is only handled once.
	//
	//		An *argObj* object is passed to most functions of this class.
	//		It carries context arguments that make sense when they are called.

/*=====
	argObj: {
		// grid: EnhancedGrid
		//		The grid object we are now handling.
		grid: null,
		
		// isHeader: bool
		//		Indicating which context we're handling, header or content.
		isHeader: true,
		
		// view: _View
		//		Reference to the current _View object.
		view: null,
		
		// viewIdx: int
		//		The index of the current _View object in the views array.
		//		If the grid does not have any rowselector view, it conforms to the index
		//		in the _ViewManager.views.
		viewIdx: -1,
		
		// subrow: _View.structure.cells[i]
		//		Reference to the current subrow.
		//		A subrow describe the innter structure of a row in a view, it's an array of cells
		subrow: null,
		
		// subrowIdx: int
		//		The index of the current subrow in the subrow array: _View.structure.cells.
		subrowIdx: -1,
		
		// cell: dojox.grid.__CellDef
		//		Reference to the current cell.
		cell: null,
		
		// cellIdx: int
		//		The index of the current cell in the current subrow.
		//		It's different from cell.index, which is the index in the whole line.
		cellIdx: -1,
		
		// row: item
		//		The current row of data (logically), a.k.a.: current item.
		row: null,
		
		// rowIdx: int
		//		The index of the current row (item).
		rowIdx: -1,
		
		// spCols: int[]
		//		An array of special column indexes(flat,not regarding structure).
		//		Special columns are typically attached to grid as a kind of UI facility
		//		by the grid widget, instead of some real data.
		//		For example, indirect selectors and row indexers.
		//		Users can choose to export it or not.
		spCols: [],
		
		// colOffset: int
		//		If the grid has a _RowSelector view or something else, this view will NOT be
		//		passed to the user in argObj. So the column index (cell.index) will appear shifted
		//		(start from 1 instead of 0). This colOffset is provided to remove this shift.
		//
		//		usage:
		//		|	var correctColIndex = argObj.cell.index + argObj.colOffset;
		colOffset: 0
	},
=====*/

	constructor: function(/* object? */writerArgs){
		// summary:
		//		Writer initializations goes here.
		// writerArgs: object?
		//		Any implementation of this class might accept a writerArgs object (optional),
		//		which contains some writer-specific arguments given by the user.
	},
	_getExportDataForCell: function(rowIndex, rowItem, cell, grid){
		var data = (cell.get || grid.get).call(cell, rowIndex, rowItem);
		if(this.formatter){
			return this.formatter(data, cell, rowIndex, rowItem);
		}else{
			return data;
		}
	},
	beforeHeader: function(/* EnhancedGrid */grid){
		// summary:
		//		We are going to start the travel in the grid.
		//		Is there anything we should do now?
		// tags:
		//		protected extension
		// returns:
		//		- true: go on handling the header row and then call afterHeader.
		//		- false: skip the header row, won't call afterHeader.
		return true;	//Boolean
	},
	afterHeader: function(){
		// summary:
		//		The header line has been handled.
		// tags:
		//		protected extension
		// returns:
		//		undefined
	},
	beforeContent: function(/* Array */items){
		// summary:
		//		We are ready to go through all the contents(items).
		// tags:
		//		protected extension
		// items:
		//		All the items fetched from the store
		// returns:
		//		- true: go on handling the contents and then call afterContent.
		//		- false: skip all the contents, won't call afterContent.
		return true;	//Boolean
	},
	afterContent: function(){
		// summary:
		//		We have finished the entire grid travel.
		//		Do some clean up work if you need to.
		// tags:
		//		protected extension
		// returns:
		//		undefined
	},
	beforeContentRow: function(/* object */argObj){
		// summary:
		//		Before handling a line of data (not header).
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		row,rowIdx,
		// |		spCols
		// |	}
		// returns:
		//		- true: go on handling the current data row and then call afterContentRow.
		//		- false: skip the current data row, won't call afterContentRow.
		return true;	//Boolean
	},
	afterContentRow: function(/* object */argObj){
		// summary:
		//		After handling a line of data (not header).
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		row,rowIdx,
		// |		spCols
		// |	}
		// returns:
		//		undefined
	},
	beforeView: function(/* object */argObj){
		// summary:
		//		Before handling a view.
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		view,viewIdx,
		// |		spCols(if isHeader==false)
		// |	}
		// returns:
		//		- true: go on handling the current view and then call afterView.
		//		- false: skip the current view, won't call afterView.
		return true;	//Boolean
	},
	afterView: function(/* object */argObj){
		// summary:
		//		After handling a view.
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		view,viewIdx,
		// |		spCols(if isHeader==false)
		// |	}
		// tags:
		//		protected extension
		// returns:
		//		undefined
	},
	beforeSubrow: function(/* object */argObj){
		// summary:
		//		Before handling a subrow in a line (defined in the grid structure).
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		row,rowIdx,
		// |		view,viewIdx,
		// |		subrow,subrowIdx,
		// |		spCols(if isHeader==false)
		// |	}
		// returns:
		//		- true: go on handling the current subrow and then call afterSubrow.
		//		- false: skip the current subrow, won't call afterSubrow.
		return true;	//Boolean
	},
	afterSubrow: function(/* object */argObj){
		// summary:
		//		Before handling a subrow in a line (defined in the grid structure).
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		row,rowIdx,
		// |		view,viewIdx,
		// |		subrow,subrowIdx,
		// |		spCols(if isHeader==false)
		// |	}
		// returns:
		//		undefined
	},
	handleCell: function(/* object */argObj){
		// summary:
		//		Handle a header cell or data cell.
		// tags:
		//		protected extension
		// argObj:
		//		An object with at least the following context properties available:
		// |	{
		// |		grid,isHeader,
		// |		row,rowIdx,
		// |		view,viewIdx,
		// |		subrow,subrowIdx,
		// |		cell,cellIdx,
		// |		spCols(if isHeader==false)
		// |	}
		// returns:
		//		undefined
	},
	toString: function(){
		// summary:
		//		Export to a string.
		// tags:
		//		protected extension
		// returns:
		//		The exported result string.
		return '';	//String
	}
});
});
