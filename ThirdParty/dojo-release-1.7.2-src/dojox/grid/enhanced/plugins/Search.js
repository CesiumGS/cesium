define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/data/util/filter",
	"../../EnhancedGrid",
	"../_Plugin"
], function(dojo, lang, declare, array, dFilter, EnhancedGrid, _Plugin){

var Search = declare("dojox.grid.enhanced.plugins.Search", _Plugin, {
	// summary:
	//		Search the grid using wildcard string or Regular Expression.
	
	// name: String
	//		plugin name
	name: "search",
	
	constructor: function(grid, args){
		this.grid = grid;
		args = (args && lang.isObject(args)) ? args : {};
		this._cacheSize = args.cacheSize || -1;
		grid.searchRow = lang.hitch(this, "searchRow");
	},
	searchRow: function(/* Object|RegExp|String */searchArgs, /* function(Integer, item) */onSearched){
		if(!lang.isFunction(onSearched)){ return; }
		if(lang.isString(searchArgs)){
			searchArgs = dFilter.patternToRegExp(searchArgs);
		}
		var isGlobal = false;
		if(searchArgs instanceof RegExp){
			isGlobal = true;
		}else if(lang.isObject(searchArgs)){
			var isEmpty = true;
			for(var field in searchArgs){
				if(lang.isString(searchArgs[field])){
					searchArgs[field] = dFilter.patternToRegExp(searchArgs[field]);
				}
				isEmpty = false;
			}
			if(isEmpty){ return; }
		}else{
			return;
		}
		this._search(searchArgs, 0, onSearched, isGlobal);
	},
	_search: function(/* Object|RegExp */searchArgs, /* Integer */start, /* function(Integer, item) */onSearched, /* Boolean */isGlobal){
		var _this = this,
			cnt = this._cacheSize,
			args = {
				start: start,
				query: this.grid.query,
				sort: this.grid.getSortProps(),
				queryOptions: this.grid.queryOptions,
				onBegin: function(size){
					_this._storeSize = size;
				},
				onComplete: function(items){
					if(!array.some(items, function(item, i){
						if(_this._checkRow(item, searchArgs, isGlobal)){
							onSearched(start + i, item);
							return true;
						}
						return false;
					})){
						if(cnt > 0 && start + cnt < _this._storeSize){
							_this._search(searchArgs, start + cnt, onSearched, isGlobal);
						}else{
							onSearched(-1, null);
						}
					}
				}
			};
		if(cnt > 0){
			args.count = cnt;
		}
		this.grid._storeLayerFetch(args);
	},
	_checkRow: function(/* store item */item, /* Object|RegExp */searchArgs, /* Boolean */isGlobal){
		var g = this.grid, s = g.store, i, field,
			cells = array.filter(g.layout.cells, function(cell){
				return !cell.hidden;
			});
		if(isGlobal){
			return array.some(cells, function(cell){
				try{
					if(cell.field){
						return String(s.getValue(item, cell.field)).search(searchArgs) >= 0;
					}
				}catch(e){
					console.log("Search._checkRow() error: ", e);
				}
				return false;
			});
		}else{
			for(field in searchArgs){
				if(searchArgs[field] instanceof RegExp){
					for(i = cells.length - 1; i >= 0; --i){
						if(cells[i].field == field){
							try{
								if(String(s.getValue(item, field)).search(searchArgs[field]) < 0){
									return false;
								}
								break;
							}catch(e){
								return false;
							}
						}
					}
					if(i < 0){ return false; }
				}
			}
			return true;
		}
	}
});

EnhancedGrid.registerPlugin(Search/*name:'search'*/);

return Search;

});