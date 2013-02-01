define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/dnd/Source",
	"./DnD"
], function(declare, array, lang, Source, DnD){

var _joinToArray = function(arrays){
	var a = arrays[0];
	for(var i = 1; i < arrays.length; ++i){
		a = a.concat(arrays[i]);
	}
	return a;
};

var GridDnDSource = lang.getObject("dojox.grid.enhanced.plugins.GridDnDSource");

return declare("dojox.grid.enhanced.plugins.GridSource", Source, {
	// summary:
	//		A special source that can accept grid contents.
	//		Only for non-grid widgets or domNodes.
	accept: ["grid/cells", "grid/rows", "grid/cols", "text"],
	
	// insertNodesForGrid:
	//		If you'd like to insert some sort of nodes into your dnd source, turn this on,
	//		and override getCellContent/getRowContent/getColumnContent
	//		to populate the dnd data in your desired format.
	insertNodesForGrid: false,
	
	markupFactory: function(params, node){
		cls = lang.getObject("dojox.grid.enhanced.plugins.GridSource");
		return new cls(node, params);
	},
	checkAcceptance: function(source, nodes){
		if(source instanceof GridDnDSource){
			if(nodes[0]){
				var item = source.getItem(nodes[0].id);
				if(item && (array.indexOf(item.type, "grid/rows") >= 0 || array.indexOf(item.type, "grid/cells") >= 0) &&
					!source.dndPlugin._allDnDItemsLoaded()){
					return false;
				}
			}
			this.sourcePlugin = source.dndPlugin;
		}
		return this.inherited(arguments);
	},
	onDraggingOver: function(){
		if(this.sourcePlugin){
			this.sourcePlugin._isSource = true;
		}
	},
	onDraggingOut: function(){
		if(this.sourcePlugin){
			this.sourcePlugin._isSource = false;
		}
	},
	onDropExternal: function(source, nodes, copy){
		if(source instanceof GridDnDSource){
			var ranges = array.map(nodes, function(node){
				return source.getItem(node.id).data;
			});
			var item = source.getItem(nodes[0].id);
			var grid = item.dndPlugin.grid;
			var type = item.type[0];
			var range;
			try{
				switch(type){
					case "grid/cells":
						nodes[0].innerHTML = this.getCellContent(grid, ranges[0].min, ranges[0].max) || "";
						this.onDropGridCells(grid, ranges[0].min, ranges[0].max);
						break;
					case "grid/rows":
						range = _joinToArray(ranges);
						nodes[0].innerHTML = this.getRowContent(grid, range) || "";
						this.onDropGridRows(grid, range);
						break;
					case "grid/cols":
						range = _joinToArray(ranges);
						nodes[0].innerHTML = this.getColumnContent(grid, range) || "";
						this.onDropGridColumns(grid, range);
						break;
				}
				if(this.insertNodesForGrid){
					this.selectNone();
					this.insertNodes(true, [nodes[0]], this.before, this.current);
				}
				item.dndPlugin.onDragOut(!copy);
			}catch(e){
				console.warn("GridSource.onDropExternal() error:",e);
			}
		}else{
			this.inherited(arguments);
		}
	},
	getCellContent: function(grid, leftTopCell, rightBottomCell){
		// summary:
		//		Fill node innerHTML for dnd grid cells.
		// example:
		//	|	var cells = grid.layout.cells;
		//	|	var store = grid.store;
		//	|	var cache = grid._by_idx;
		//	|	var res = "Grid Cells from " + grid.id + ":<br/>";
		//	|	for(var r = leftTopCell.row; r <= rightBottomCell.row; ++r){
		//	|		for(var c = leftTopCell.col; c <= rightBottomCell.col; ++c){
		//	|			res += store.getValue(cache[r].item, cells[c].field) + ", ";
		//	|		}
		//	|		res = res.substring(0, res.length - 2) + ";<br/>";
		//	|	}
		//	|	return res;
	},
	getRowContent: function(grid, rowIndexes){
		// summary:
		//		Fill node innerHTML for dnd grid rows.
		// example:
		//	|	var cells = grid.layout.cells;
		//	|	var store = grid.store;
		//	|	var cache = grid._by_idx;
		//	|	var res = "Grid Rows from " + grid.id + ":<br/>";
		//	|	for(var i = 0; i < rowIndexes.length; ++i){
		//	|		var r = rowIndexes[i];
		//	|		res += "Row " + r + ": ";
		//	|		for(var j = 0; j < cells.length; ++j){
		//	|			if(!cells[j].hidden){
		//	|				res += store.getValue(cache[r].item, cells[j].field) + ", ";
		//	|			}
		//	|		}
		//	|		res = res.substring(0, res.length - 2) + ";<br/>";
		//	|	}
		//	|	return res;
	},
	getColumnContent: function(grid, colIndexes){
		// summary:
		//		Fill node innerHTML for dnd grid columns.
		// example:
		//	|	var cells = grid.layout.cells;
		//	|	var res = "Grid Columns from " + grid.id + ":";
		//	|	for(var i = 0; i < colIndexes.length; ++i){
		//	|		var c = colIndexes[i];
		//	|		res += (cells[c].name || cells[c].field) + ", ";
		//	|	}
		//	|	return res.substring(0, res.length - 2);
	},
	onDropGridCells: function(grid, leftTopCell, rightBottomCell){
		
	},
	onDropGridRows: function(grid, rowIndexes){
		
	},
	onDropGridColumns: function(grid, colIndexes){
		
	}
});
});
