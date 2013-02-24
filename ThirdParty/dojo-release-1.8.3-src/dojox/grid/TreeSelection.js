define([
	"../main",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/dom-attr",
	"dojo/query",
	"./DataSelection"
], function(dojox, declare, array, lang, domAttr, query, DataSelection){

return declare("dojox.grid.TreeSelection", DataSelection, {
	setMode: function(mode){
		this.selected = {};
		this.sorted_sel = [];
		this.sorted_ltos = {};
		this.sorted_stol = {};
		DataSelection.prototype.setMode.call(this, mode);
	},
	addToSelection: function(inItemOrIndex){
		if(this.mode == 'none'){ return; }
		var idx = null;
		if(typeof inItemOrIndex == "number" || typeof inItemOrIndex == "string"){
			idx = inItemOrIndex;
		}else{
			idx = this.grid.getItemIndex(inItemOrIndex);
		}
		if(this.selected[idx]){
			this.selectedIndex = idx;
		}else{
			if(this.onCanSelect(idx) !== false){
				this.selectedIndex = idx;
				var rowNodes = query("tr[dojoxTreeGridPath='" + idx + "']", this.grid.domNode);
				if(rowNodes.length){
					domAttr.set(rowNodes[0], "aria-selected", "true");
				}
				this._beginUpdate();
				this.selected[idx] = true;
				this._insertSortedSelection(idx);
				//this.grid.onSelected(idx);
				this.onSelected(idx);
				//this.onSetSelected(idx, true);
				this._endUpdate();
			}
		}
	},
	deselect: function(inItemOrIndex){
		if(this.mode == 'none'){ return; }
		var idx = null;
		if(typeof inItemOrIndex == "number" || typeof inItemOrIndex == "string"){
			idx = inItemOrIndex;
		}else{
			idx = this.grid.getItemIndex(inItemOrIndex);
		}
		if(this.selectedIndex == idx){
			this.selectedIndex = -1;
		}
		if(this.selected[idx]){
			if(this.onCanDeselect(idx) === false){
				return;
			}
			var rowNodes = query("tr[dojoxTreeGridPath='" + idx + "']", this.grid.domNode);
			if(rowNodes.length){
				domAttr.set(rowNodes[0], "aria-selected", "false");
			}
			this._beginUpdate();
			delete this.selected[idx];
			this._removeSortedSelection(idx);
			//this.grid.onDeselected(idx);
			this.onDeselected(idx);
			//this.onSetSelected(idx, false);
			this._endUpdate();
		}
	},
	getSelected: function(){
		var result = [];
		for(var i in this.selected){
			if(this.selected[i]){
				result.push(this.grid.getItem(i));
			}
		}
		return result;
	},
	getSelectedCount: function(){
		var c = 0;
		for(var i in this.selected){
			if(this.selected[i]){
				c++;
			}
		}
		return c;
	},
	_bsearch: function(v){
		var o = this.sorted_sel;
		var h = o.length - 1, l = 0, m;
		while(l<=h){
			var cmp = this._comparePaths(o[m = (l + h) >> 1], v);
			if(cmp < 0){ l = m + 1; continue; }
			if(cmp > 0){ h = m - 1; continue; }
			return m;
		}
		return cmp < 0 ? m - cmp : m;
	},
	_comparePaths: function(a, b){
		for(var i=0, l=(a.length < b.length ? a.length : b.length); i<l; i++){
			if(a[i]<b[i]){ return -1; }
			if(a[i]>b[i]){ return 1; }
		}
		if(a.length<b.length){ return -1; }
		if(a.length>b.length){ return 1; }
		return 0;
	},
	_insertSortedSelection: function(index){
		index = String(index);
		var s = this.sorted_sel;
		var sl = this.sorted_ltos;
		var ss = this.sorted_stol;

		var lpath = index.split('/');
		lpath = array.map(lpath, function(item){ return parseInt(item, 10); });
		sl[lpath] = index;
		ss[index] = lpath;

		if(s.length === 0){
			s.push(lpath);
			return;
		}
		if(s.length==1){
			var cmp = this._comparePaths(s[0], lpath);
			if(cmp==1){ s.unshift(lpath); }
			else{ s.push(lpath); }
			return;
		}

		var idx = this._bsearch(lpath);
		this.sorted_sel.splice(idx, 0, lpath);
	},
	_removeSortedSelection: function(index){
		index = String(index);
		var s = this.sorted_sel;
		var sl = this.sorted_ltos;
		var ss = this.sorted_stol;

		if(s.length === 0){
			return;
		}

		var lpath = ss[index];
		if(!lpath){ return; }

		var idx = this._bsearch(lpath);
		if(idx > -1){
			delete sl[lpath];
			delete ss[index];
			s.splice(idx, 1);
		}
	},
	getFirstSelected: function(){
		if(!this.sorted_sel.length||this.mode == 'none'){ return -1; }
		var fpath = this.sorted_sel[0];
		if(!fpath){
			return -1;
		}
		fpath = this.sorted_ltos[fpath];
		if(!fpath){
			return -1;
		}
		return fpath;
	},
	getNextSelected: function(inPrev){
		if(!this.sorted_sel.length||this.mode == 'none'){ return -1; }
		inPrev = String(inPrev);
		var prevPath = this.sorted_stol[inPrev];
		if(!prevPath){ return -1; }

		var idx = this._bsearch(prevPath);
		var lpath = this.sorted_sel[idx+1];
		if(!lpath){
			return -1;
		}
		return this.sorted_ltos[lpath];
	},
	_range: function(inFrom, inTo, func){
		if(!lang.isString(inFrom) && inFrom < 0){
			inFrom = inTo;
		}
		var cells = this.grid.layout.cells,
			store = this.grid.store,
			grid = this.grid;
		inFrom = new dojox.grid.TreePath(String(inFrom), grid);
		inTo = new dojox.grid.TreePath(String(inTo), grid);

		if(inFrom.compare(inTo) > 0){
			var tmp = inFrom;
			inFrom = inTo;
			inTo = tmp;
		}

		var inFromStr = inFrom._str, inToStr = inTo._str;

		// select/deselect the first
		func(inFromStr);

		var p = inFrom;
		while((p = p.next())){
			if(p._str == inToStr){
				break;
			}
			func(p._str);
		}

		// select/deselect the last
		func(inToStr);
	}
});
});