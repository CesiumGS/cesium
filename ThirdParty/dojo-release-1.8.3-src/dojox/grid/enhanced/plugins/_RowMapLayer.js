define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"./_StoreLayer"
], function(array, declare, kernel, lang, layers){

var _devideToArrays = function(a){
	a.sort(function(v1, v2){
		return v1 - v2;
	});
	var arr = [[a[0]]];
	for(var i = 1, j = 0; i < a.length; ++i){
		if(a[i] == a[i-1] + 1){
			arr[j].push(a[i]);
		}else{
			arr[++j] = [a[i]];
		}
	}
	return arr;
},
hitchIfCan = function(scope, func){
	return func ? lang.hitch(scope || kernel.global, func) : function(){};
};

return declare("dojox.grid.enhanced.plugins._RowMapLayer", layers._StoreLayer, {
	tags: ["reorder"],
	constructor: function(grid){
		this._map = {};
		this._revMap = {};
		this.grid = grid;
		this._oldOnDelete = grid._onDelete;
		var _this = this;
		grid._onDelete = function(item){
			_this._onDelete(item);
			_this._oldOnDelete.call(grid, item);
		};
		this._oldSort = grid.sort;
		grid.sort = function(){
			_this.clearMapping();
			_this._oldSort.apply(grid, arguments);
		};
	},
	uninitialize: function(){
		this.grid._onDelete = this._oldOnDelete;
		this.grid.sort = this._oldSort;
	},
	setMapping: function(mapping){
		// summary:
		//		Remember the row mapping.
		// mapping: Object
		//		keys are original rowIndexes, values are new rowIndexes.
		this._store.forEachLayer(function(layer){
			if(layer.name() === "rowmap"){
				return false;
			}else if(layer.onRowMappingChange){
				layer.onRowMappingChange(mapping);
			}
			return true;
		}, false);
		var from, to, origin, revmap = {};
		for(from in mapping){
			from = parseInt(from, 10);
			to = mapping[from];
			if(typeof to == "number"){
				if(from in this._revMap){
					origin = this._revMap[from];
					delete this._revMap[from];
				}else{
					origin = from;
				}
				if(origin == to){
					delete this._map[origin];
					revmap[to] = "eq";
				}else{
					this._map[origin] = to;
					revmap[to] = origin;
				}
			}
		}
		for(to in revmap){
			if(revmap[to] === "eq"){
				delete this._revMap[parseInt(to, 10)];
			}else{
				this._revMap[parseInt(to, 10)] = revmap[to];
			}
		}
	},
	clearMapping: function(){
		this._map = {};
		this._revMap = {};
	},
	_onDelete: function(item){
		var idx = this.grid._getItemIndex(item, true);
		if(idx in this._revMap){
			var rowIdxArr = [], r, i, origin = this._revMap[idx];
			delete this._map[origin];
			delete this._revMap[idx];
			for(r in this._revMap){
				r = parseInt(r, 10);
				if(this._revMap[r] > origin){
					--this._revMap[r];
				}
			}
			for(r in this._revMap){
				r = parseInt(r, 10);
				if(r > idx){
					rowIdxArr.push(r);
				}
			}
			rowIdxArr.sort(function(a, b){
				return b - a;
			});
			for(i = rowIdxArr.length - 1; i >= 0; --i){
				r = rowIdxArr[i];
				this._revMap[r - 1] = this._revMap[r];
				delete this._revMap[r];
			}
			this._map = {};
			for(r in this._revMap){
				this._map[this._revMap[r]] = r;
			}
		}
	},
	_fetch: function(userRequest){
		var mapCount = 0, r;
		var start = userRequest.start || 0;
		for(r in this._revMap){
			r = parseInt(r, 10);
			if(r >= start){
				++mapCount;
			}
		}
		if(mapCount > 0){
			//Row mapping is in use.
			var rows = [], i, map = {},
				count = userRequest.count > 0 ? userRequest.count : -1;
			if(count > 0){
				for(i = 0; i < count; ++i){
					r = start + i;
					r = r in this._revMap ? this._revMap[r] : r;
					map[r] = i;
					rows.push(r);
				}
			}else{
				//We don't have a count, must create our own.
				for(i = 0;; ++i){
					r = start + i;
					if(r in this._revMap){
						--mapCount;
						r = this._revMap[r];
					}
					map[r] = i;
					rows.push(r);
					if(mapCount <= 0){
						break;
					}
				}
			}
			this._subFetch(userRequest, this._getRowArrays(rows), 0, [], map, userRequest.onComplete, start, count);
			return userRequest;
		}else{
			//No row mapping at all.
			return lang.hitch(this._store, this._originFetch)(userRequest);
		}
	},
	_getRowArrays: function(rows){
		return _devideToArrays(rows);
	},
	_subFetch: function(userRequest, rowArrays, index, result, map, oldOnComplete, start, count){
		var arr = rowArrays[index], _this = this;
		var urstart = userRequest.start = arr[0];
		userRequest.count = arr[arr.length - 1] - arr[0] + 1;
		userRequest.onComplete = function(items){
			array.forEach(items, function(item, i){
				var r = urstart + i;
				if(r in map){
					result[map[r]] = item;
				}
			});
			if(++index == rowArrays.length){
				//mapped rows are all fetched.
				if(count > 0){
					userRequest.start = start;
					userRequest.count = count;
					userRequest.onComplete = oldOnComplete;
					hitchIfCan(userRequest.scope, oldOnComplete)(result, userRequest);
				}else{
					userRequest.start = userRequest.start + items.length;
					delete userRequest.count;
					userRequest.onComplete = function(items){
						result = result.concat(items);
						userRequest.start = start;
						userRequest.onComplete = oldOnComplete;
						hitchIfCan(userRequest.scope, oldOnComplete)(result, userRequest);
					};
					_this.originFetch(userRequest);
				}
			}else{
				_this._subFetch(userRequest, rowArrays, index, result, map, oldOnComplete, start, count);
			}
		};
		_this.originFetch(userRequest);
	}
});
});
