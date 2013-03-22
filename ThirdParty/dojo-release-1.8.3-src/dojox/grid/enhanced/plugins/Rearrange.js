define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"../../EnhancedGrid",
	"../_Plugin",
	"./_RowMapLayer"
], function(dojo, lang, declare, array, connect, EnhancedGrid, _Plugin, _RowMapLayer){

var Rearrange = declare("dojox.grid.enhanced.plugins.Rearrange", _Plugin, {
	// summary:
	//		Provides a set of method to re-arrange the structure of grid.
	
	// name: String
	//		plugin name
	name: "rearrange",
	
	constructor: function(grid, args){
		this.grid = grid;
		this.setArgs(args);
		var rowMapLayer = new _RowMapLayer(grid);
		dojox.grid.enhanced.plugins.wrap(grid, "_storeLayerFetch", rowMapLayer);
	},
	setArgs: function(args){
		this.args = lang.mixin(this.args || {}, args || {});
		this.args.setIdentifierForNewItem = this.args.setIdentifierForNewItem || function(v){return v;};
	},
	destroy: function(){
		this.inherited(arguments);
		this.grid.unwrap("rowmap");
	},
	onSetStore: function(store){
		this.grid.layer("rowmap").clearMapping();
	},
	_hasIdentity: function(points){
		var g = this.grid, s = g.store, cells = g.layout.cells;
		if(s.getFeatures()["dojo.data.api.Identity"]){
			if(array.some(points, function(point){
				return s.getIdentityAttributes(g._by_idx[point.r].item) == cells[point.c].field;
			})){
				return true;
			}
		}
		return false;
	},
	moveColumns: function(colsToMove, targetPos){
		// summary:
		//		Move a set of columns to a given position.
		// tags:
		//		public
		// colsToMove: Integer[]
		//		Array of column indexes.
		// targetPos: Integer
		//		The target position
		var g = this.grid,
			layout = g.layout,
			cells = layout.cells,
			colIndex, i, delta = 0,
			before = true, tmp = {}, mapping = {};
		colsToMove.sort(function(a, b){
			return a - b;
		});
		for(i = 0; i < colsToMove.length; ++i){
			tmp[colsToMove[i]] = i;
			if(colsToMove[i] < targetPos){
				++delta;
			}
		}
		var leftCount = 0, rightCount = 0;
		var maxCol = Math.max(colsToMove[colsToMove.length - 1], targetPos);
		if(maxCol == cells.length){
			--maxCol;
		}
		var minCol = Math.min(colsToMove[0], targetPos);
		for(i = minCol; i <= maxCol; ++i){
			var j = tmp[i];
			if(j >= 0){
				mapping[i] = targetPos - delta + j;
			}else if(i < targetPos){
				mapping[i] = minCol + leftCount;
				++leftCount;
			}else if(i >= targetPos){
				mapping[i] = targetPos + colsToMove.length - delta + rightCount;
				++rightCount;
			}
		}
		//console.log("mapping:", mapping, ", colsToMove:", colsToMove,", target:", targetPos);
		delta = 0;
		if(targetPos == cells.length){
			--targetPos;
			before = false;
		}
		g._notRefreshSelection = true;
		for(i = 0; i < colsToMove.length; ++i){
			colIndex = colsToMove[i];
			if(colIndex < targetPos){
				colIndex -= delta;
			}
			++delta;
			if(colIndex != targetPos){
				layout.moveColumn(cells[colIndex].view.idx, cells[targetPos].view.idx, colIndex, targetPos, before);
				cells = layout.cells;
			}
			if(targetPos <= colIndex){
				++targetPos;
			}
		}
		delete g._notRefreshSelection;
		connect.publish("dojox/grid/rearrange/move/" + g.id, ["col", mapping, colsToMove]);
	},
	moveRows: function(rowsToMove, targetPos){
		// summary:
		//		Move a set of rows to a given position
		// tags:
		//		public
		// rowsToMove: Integer[]
		//		Array of row indexes.
		// targetPos: Integer
		//		The target position
		var g = this.grid,
			mapping = {},
			preRowsToMove = [],
			postRowsToMove = [],
			len = rowsToMove.length,
			i, r, k, arr, rowMap, lastPos;
			
		for(i = 0; i < len; ++i){
			r = rowsToMove[i];
			if(r >= targetPos){
				break;
			}
			preRowsToMove.push(r);
		}
		postRowsToMove = rowsToMove.slice(i);
		
		arr = preRowsToMove;
		len = arr.length;
		if(len){
			rowMap = {};
			array.forEach(arr, function(r){
				rowMap[r] = true;
			});
			mapping[arr[0]] = targetPos - len;
			for(k = 0, i = arr[k] + 1, lastPos = i - 1; i < targetPos; ++i){
				if(!rowMap[i]){
					mapping[i] = lastPos;
					++lastPos;
				}else{
					++k;
					mapping[i] = targetPos - len + k;
				}
			}
		}
		arr = postRowsToMove;
		len = arr.length;
		if(len){
			rowMap = {};
			array.forEach(arr, function(r){
				rowMap[r] = true;
			});
			mapping[arr[len - 1]] = targetPos + len - 1;
			for(k = len - 1, i = arr[k] - 1, lastPos = i + 1; i >= targetPos; --i){
				if(!rowMap[i]){
					mapping[i] = lastPos;
					--lastPos;
				}else{
					--k;
					mapping[i] = targetPos + k;
				}
			}
		}
		var tmpMapping = lang.clone(mapping);
		g.layer("rowmap").setMapping(mapping);
		g.forEachLayer(function(layer){
			if(layer.name() != "rowmap"){
				layer.invalidate();
				return true;
			}else{
				return false;
			}
		}, false);
		g.selection.selected = [];
		g._noInternalMapping = true;
		g._refresh();
		setTimeout(function(){
			connect.publish("dojox/grid/rearrange/move/" + g.id, ["row", tmpMapping, rowsToMove]);
			g._noInternalMapping = false;
		}, 0);
	},
	moveCells: function(cellsToMove, target){
		var g = this.grid,
			s = g.store;
		if(s.getFeatures()["dojo.data.api.Write"]){
			if(cellsToMove.min.row == target.min.row && cellsToMove.min.col == target.min.col){
				//Same position, no need to move
				return;
			}
			var cells = g.layout.cells,
				cnt = cellsToMove.max.row - cellsToMove.min.row + 1,
				r, c, tr, tc,
				sources = [], targets = [];
			for(r = cellsToMove.min.row, tr = target.min.row; r <= cellsToMove.max.row; ++r, ++tr){
				for(c = cellsToMove.min.col, tc = target.min.col; c <= cellsToMove.max.col; ++c, ++tc){
					while(cells[c] && cells[c].hidden){
						++c;
					}
					while(cells[tc] && cells[tc].hidden){
						++tc;
					}
					sources.push({
						"r": r,
						"c": c
					});
					targets.push({
						"r": tr,
						"c": tc,
						"v": cells[c].get(r, g._by_idx[r].item)
					});
				}
			}
			if(this._hasIdentity(sources.concat(targets))){
				console.warn("Can not write to identity!");
				return;
			}
			array.forEach(sources, function(point){
				s.setValue(g._by_idx[point.r].item, cells[point.c].field, "");
			});
			array.forEach(targets, function(point){
				s.setValue(g._by_idx[point.r].item, cells[point.c].field, point.v);
			});
			s.save({
				onComplete: function(){
					connect.publish("dojox/grid/rearrange/move/" + g.id, ["cell", {
						"from": cellsToMove,
						"to": target
					}]);
				}
			});
		}
	},
	copyCells: function(cellsToMove, target){
		var g = this.grid,
			s = g.store;
		if(s.getFeatures()["dojo.data.api.Write"]){
			if(cellsToMove.min.row == target.min.row && cellsToMove.min.col == target.min.col){
				return;
			}
			var cells = g.layout.cells,
				cnt = cellsToMove.max.row - cellsToMove.min.row + 1,
				r, c, tr, tc,
				targets = [];
			for(r = cellsToMove.min.row, tr = target.min.row; r <= cellsToMove.max.row; ++r, ++tr){
				for(c = cellsToMove.min.col, tc = target.min.col; c <= cellsToMove.max.col; ++c, ++tc){
					while(cells[c] && cells[c].hidden){
						++c;
					}
					while(cells[tc] && cells[tc].hidden){
						++tc;
					}
					targets.push({
						"r": tr,
						"c": tc,
						"v": cells[c].get(r, g._by_idx[r].item)
					});
				}
			}
			if(this._hasIdentity(targets)){
				console.warn("Can not write to identity!");
				return;
			}
			array.forEach(targets, function(point){
				s.setValue(g._by_idx[point.r].item, cells[point.c].field, point.v);
			});
			s.save({
				onComplete: function(){
					setTimeout(function(){
						connect.publish("dojox/grid/rearrange/copy/" + g.id, ["cell", {
							"from": cellsToMove,
							"to": target
						}]);
					}, 0);
				}
			});
		}
	},
	changeCells: function(sourceGrid, cellsToMove, target){
		var g = this.grid,
			s = g.store;
		if(s.getFeatures()["dojo.data.api.Write"]){
			var srcg = sourceGrid,
				cells = g.layout.cells,
				srccells = srcg.layout.cells,
				cnt = cellsToMove.max.row - cellsToMove.min.row + 1,
				r, c, tr, tc, targets = [];
			for(r = cellsToMove.min.row, tr = target.min.row; r <= cellsToMove.max.row; ++r, ++tr){
				for(c = cellsToMove.min.col, tc = target.min.col; c <= cellsToMove.max.col; ++c, ++tc){
					while(srccells[c] && srccells[c].hidden){
						++c;
					}
					while(cells[tc] && cells[tc].hidden){
						++tc;
					}
					targets.push({
						"r": tr,
						"c": tc,
						"v": srccells[c].get(r, srcg._by_idx[r].item)
					});
				}
			}
			if(this._hasIdentity(targets)){
				console.warn("Can not write to identity!");
				return;
			}
			array.forEach(targets, function(point){
				s.setValue(g._by_idx[point.r].item, cells[point.c].field, point.v);
			});
			s.save({
				onComplete: function(){
					connect.publish("dojox/grid/rearrange/change/" + g.id, ["cell", target]);
				}
			});
		}
	},
	clearCells: function(cellsToClear){
		var g = this.grid,
			s = g.store;
		if(s.getFeatures()["dojo.data.api.Write"]){
			var cells = g.layout.cells,
				cnt = cellsToClear.max.row - cellsToClear.min.row + 1,
				r, c, targets = [];
			for(r = cellsToClear.min.row; r <= cellsToClear.max.row; ++r){
				for(c = cellsToClear.min.col; c <= cellsToClear.max.col; ++c){
					while(cells[c] && cells[c].hidden){
						++c;
					}
					targets.push({
						"r": r,
						"c": c
					});
				}
			}
			if(this._hasIdentity(targets)){
				console.warn("Can not write to identity!");
				return;
			}
			array.forEach(targets, function(point){
				s.setValue(g._by_idx[point.r].item, cells[point.c].field, "");
			});
			s.save({
				onComplete: function(){
					connect.publish("dojox/grid/rearrange/change/" + g.id, ["cell", cellsToClear]);
				}
			});
		}
	},
	insertRows: function(sourceGrid, rowsToMove, targetPos){
		try{
			var g = this.grid,
				s = g.store,
				rowCnt = g.rowCount,
				mapping = {},
				obj = {idx: 0},
				newRows = [],
				i,
				emptyTarget = targetPos < 0,
				_this = this,
				len = rowsToMove.length;
			if(emptyTarget){
				targetPos = 0;
			}else{
				for(i = targetPos; i < g.rowCount; ++i){
					mapping[i] = i + len;
				}
			}
			if(s.getFeatures()['dojo.data.api.Write']){
				if(sourceGrid){
					var srcg = sourceGrid,
						srcs = srcg.store,
						thisItem, attrs;
					if(!emptyTarget){
						for(i = 0; !thisItem; ++i){
							thisItem = g._by_idx[i];
						}
						attrs = s.getAttributes(thisItem.item);
					}else{
						//If the target grid is empty, there is no way to retrieve attributes.
						//So try to get attrs from grid.layout.cells[], but this might not be right
						//since some fields may be missed(e.g ID fields), please use "setIdentifierForNewItem()" 
						//to add those missed fields
						attrs = array.filter(array.map(g.layout.cells, function(cell){
							return cell.field;
						}), function(field){
							return field; //non empty
						});
					}
					var rowsToFetch = [];
					array.forEach(rowsToMove, function(rowIndex, i){
						var item = {};
						var srcItem = srcg._by_idx[rowIndex];
						if(srcItem){
							array.forEach(attrs, function(attr){
								item[attr] = srcs.getValue(srcItem.item, attr);
							});
							item = _this.args.setIdentifierForNewItem(item, s, rowCnt + obj.idx) || item;
							try{
								s.newItem(item);
								newRows.push(targetPos + i);
								mapping[rowCnt + obj.idx] = targetPos + i;
								++obj.idx;
							}catch(e){
								console.log("insertRows newItem:",e,item);
							}
						}else{
							rowsToFetch.push(rowIndex);
						}
					});
				}else if(rowsToMove.length && lang.isObject(rowsToMove[0])){
					array.forEach(rowsToMove, function(rowData, i){
						var item = _this.args.setIdentifierForNewItem(rowData, s, rowCnt + obj.idx) || rowData;
						try{
							s.newItem(item);
							newRows.push(targetPos + i);
							mapping[rowCnt + obj.idx] = targetPos + i;
							++obj.idx;
						}catch(e){
							console.log("insertRows newItem:",e,item);
						}
					});
				}else{
					return;
				}
				g.layer("rowmap").setMapping(mapping);
				s.save({
					onComplete: function(){
						g._refresh();
						setTimeout(function(){
							connect.publish("dojox/grid/rearrange/insert/" + g.id, ["row", newRows]);
						}, 0);
					}
				});
			}
		}catch(e){
			console.log("insertRows:",e);
		}
	},
	removeRows: function(rowsToRemove){
		var g = this.grid;
		var s = g.store;
		try{
			array.forEach(array.map(rowsToRemove, function(rowIndex){
				return g._by_idx[rowIndex];
			}), function(row){
				if(row){
					s.deleteItem(row.item);
				}
			});
			s.save({
				onComplete: function(){
					connect.publish("dojox/grid/rearrange/remove/" + g.id, ["row", rowsToRemove]);
				}
			});
		}catch(e){
			console.log("removeRows:",e);
		}
	},
	_getPageInfo: function(){
		// summary:
		//		Find pages that contain visible rows
		// returns: Object
		//		{topPage: xx, bottomPage: xx, invalidPages: [xx,xx,...]}
		var scroller = this.grid.scroller,
			topPage = scroller.page,
			bottomPage = scroller.page,
			firstVisibleRow = scroller.firstVisibleRow,
			lastVisibleRow = scroller.lastVisibleRow,
			rowsPerPage = scroller.rowsPerPage,
			renderedPages = scroller.pageNodes[0],
			topRow, bottomRow, matched,
			invalidPages = [];
		
		array.forEach(renderedPages, function(page, pageIndex){
			if(!page){ return; }
			matched = false;
			topRow = pageIndex * rowsPerPage;
			bottomRow = (pageIndex + 1) * rowsPerPage - 1;
			if(firstVisibleRow >= topRow && firstVisibleRow <= bottomRow){
				topPage = pageIndex;
				matched = true;
			}
			if(lastVisibleRow >= topRow && lastVisibleRow <= bottomRow){
				bottomPage = pageIndex;
				matched = true;
			}
			if(!matched && (topRow > lastVisibleRow || bottomRow < firstVisibleRow)){
				invalidPages.push(pageIndex);
			}
		});
		return {topPage: topPage, bottomPage: bottomPage, invalidPages: invalidPages};
	}
});

EnhancedGrid.registerPlugin(Rearrange/*name:'rearrange'*/);

return Rearrange;

});