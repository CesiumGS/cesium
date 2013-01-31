define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"../_Plugin",
	"../../_RowSelector",
	"../../EnhancedGrid",
	"../../cells/_base"
], function(declare, array, lang, _Plugin, _RowSelector, EnhancedGrid){

var gridCells = lang.getObject("dojox.grid.cells");

var Exporter = declare("dojox.grid.enhanced.plugins.Exporter", _Plugin, {
	// summary:
	//		Provide functions to export the grid data into a given format.
	//
	//		Acceptable plugin parameters:
	//
	//		1. exportFormatter: function(data, cell, rowIndex, item)
	//			Provide a way to customize how data should look in exported string.
	//			Note that usually the formatter of grid cell should not be used here (it can return HTML or even widget).
	// example:
	//	|	function onExported(exported_text){
	//	|		//custom code here...
	//	|	}
	//	|	dijit.byId("my_grid_id").exportTo("csv",	//registered export format, mandatory
	//	|		{										//the whole object is optional.
	//	|			fetchArgs: {start:0,count:1000},	//keywordArgs for fetch, optional
	//	|			writerArgs: {separator:';'},		//export writer specific arguments, optional
	//	|		},
	//	|		function(str){
	//	|			//call back function, mandatory
	//	|	});
	//	|	var result = dijit.byId("my_grid_id").exportSelectedTo("table",     //registered export format, mandatory
	//	|														{separator:'|'} //export writer specific arguments, optional
	//	|	);
	//

	// name: String
	//		Plugin name.
	name: "exporter",
	
	constructor: function(grid, args){
		// summary:
		//		only newed by _Plugin
		// grid: EnhancedGrid
		//		The grid to plug in to.
		this.grid = grid;
		this.formatter = (args && lang.isObject(args)) && args.exportFormatter;
		this._mixinGrid();
	},
	_mixinGrid: function(){
		var g = this.grid;
		g.exportTo = lang.hitch(this, this.exportTo);
		g.exportGrid = lang.hitch(this, this.exportGrid);
		g.exportSelected = lang.hitch(this, this.exportSelected);
		g.setExportFormatter = lang.hitch(this, this.setExportFormatter);
	},
	setExportFormatter: function(formatter){
		this.formatter = formatter;
	},
	exportGrid: function(type, args, onExported){
		// summary:
		//		Export required rows(fetchArgs) to a kind of format(type)
		//		using the corresponding writer with given arguments(writerArgs),
		//		then pass the exported text to a given function(onExported).
		// tags:
		//		public
		// type: String
		//		A registered export format name
		// args: Object?
		//		includes:
		// |	{
		// |		fetchArgs: object?
		// |			Any arguments for store.fetch
		// |		writerArgs: object?
		// |			Arguments for the given format writer
		// |	}
		// onExported: Function(string)
		//		Call back function when export result is ready
		if(lang.isFunction(args)){
			onExported = args;
			args = {};
		}
		if(!lang.isString(type) || !lang.isFunction(onExported)){
			return;
		}
		args = args || {};
		var g = this.grid, _this = this,
			writer = this._getExportWriter(type, args.writerArgs),
			fetchArgs = (args.fetchArgs && lang.isObject(args.fetchArgs)) ? args.fetchArgs : {},
			oldFunc = fetchArgs.onComplete;
		if(g.store){
			fetchArgs.onComplete = function(items, request){
				if(oldFunc){
					oldFunc(items, request);
				}
				onExported(_this._goThroughGridData(items, writer));
			};
			fetchArgs.sort = fetchArgs.sort || g.getSortProps();
			g._storeLayerFetch(fetchArgs);
		}else{
			//Data is defined directly in the structure;
			var start = fetchArgs.start || 0,
				count = fetchArgs.count || -1,
				items = [];
			for(var i = start; i != start + count && i < g.rowCount; ++i){
				items.push(g.getItem(i));
			}
			onExported(this._goThroughGridData(items, writer));
		}
	},
	exportSelected: function(type, writerArgs, onExported){
		// summary:
		//		Only export selected rows.
		// tags:
		//		public
		// type: string
		//		A registered export format name
		// writerArgs: object?
		//		Arguments for the given format writer
		// returns: string
		//		The exported string
		if(!lang.isString(type)){
			return "";
		}
		var writer = this._getExportWriter(type, writerArgs);
		return onExported(this._goThroughGridData(this.grid.selection.getSelected(), writer));	//String
	},
	_buildRow: function(/* object */arg_obj,/* ExportWriter */writer){
		// summary:
		//		Use the given export writer(writer) to go through a single row
		//		which is given in the context object(arg_obj).
		// tags:
		//		private
		// returns:
		//		undefined
		var _this = this;
		array.forEach(arg_obj._views, function(view, vIdx){
			arg_obj.view = view;
			arg_obj.viewIdx = vIdx;
			if(writer.beforeView(arg_obj)){
				array.forEach(view.structure.cells, function(subrow, srIdx){
					arg_obj.subrow = subrow;
					arg_obj.subrowIdx = srIdx;
					if(writer.beforeSubrow(arg_obj)){
						array.forEach(subrow, function(cell, cIdx){
							if(arg_obj.isHeader && _this._isSpecialCol(cell)){
								arg_obj.spCols.push(cell.index);
							}
							arg_obj.cell = cell;
							arg_obj.cellIdx = cIdx;
							writer.handleCell(arg_obj);
						});
						writer.afterSubrow(arg_obj);
					}
				});
				writer.afterView(arg_obj);
			}
		});
	},
	_goThroughGridData: function(/* Array */items,/* ExportWriter */writer){
		// summary:
		//		Use the given export writer(writer) to go through the grid structure
		//		and the given rows(items), then return the writer output.
		// tags:
		//		private
		var grid = this.grid,
			views = array.filter(grid.views.views, function(view){
				return !(view instanceof _RowSelector);
			}),
			arg_obj = {
				'grid': grid,
				'isHeader': true,
				'spCols': [],
				'_views': views,
				'colOffset': (views.length < grid.views.views.length ? -1 : 0)
			};
		//go through header
		if(writer.beforeHeader(grid)){
			this._buildRow(arg_obj,writer);
			writer.afterHeader();
		}
		//go through content
		arg_obj.isHeader = false;
		if(writer.beforeContent(items)){
			array.forEach(items, function(item, rIdx){
				arg_obj.row = item;
				arg_obj.rowIdx = rIdx;
				if(writer.beforeContentRow(arg_obj)){
					this._buildRow(arg_obj, writer);
					writer.afterContentRow(arg_obj);
				}
			}, this);
			writer.afterContent();
		}
		return writer.toString();
	},
	_isSpecialCol: function(/* dojox.grid.__CellDef */header_cell){
		// summary:
		//		Row selectors and row indexes should be recognized and handled separately.
		// tags:
		//		private
		return header_cell.isRowSelector || header_cell instanceof gridCells.RowIndex;	//Boolean
	},
	_getExportWriter: function(/* string */ fileType, /* object? */ writerArgs){
		// summary:
		//		Use the given export format type(fileType)
		//		and writer arguments(writerArgs) to create
		//		a ExportWriter and return it.
		// tags:
		//		private
		var writerName, cls,
			expCls = Exporter;
		if(expCls.writerNames){
			writerName = expCls.writerNames[fileType.toLowerCase()];
			cls = lang.getObject(writerName);
			if(cls){
				var writer = new cls(writerArgs);
				writer.formatter = this.formatter;
				return writer;	//ExportWriter
			}else{
				throw new Error('Please make sure class "' + writerName + '" is required.');
			}
		}
		throw new Error('The writer for "' + fileType + '" has not been registered.');
	}
});

Exporter.registerWriter = function(/* string */fileType,/* string */writerClsName){
	// summary:
	//		Register a writer(writerClsName) to a export format type(fileType).
	//		This function separates the Exporter from all kinds of writers.
	// tags:
	//		public
	Exporter.writerNames = Exporter.writerNames || {};
	Exporter.writerNames[fileType] = writerClsName;
};

EnhancedGrid.registerPlugin(Exporter/*name:'exporter'*/);

return Exporter;
});
