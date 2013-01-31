define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/event",
	"dojo/_base/sniff",
	"dojo/_base/html",
	"dojo/keys",
	"dijit/a11y",
	"dijit/focus",
	"../_FocusManager"
], function(dojo, lang, declare, array, connect, event, has, html, keys, dijitA11y, dijitFocus, _FocusManager){

var _FocusArea = declare("dojox.grid.enhanced._FocusArea", null, {
	// summary:
	//		This is a friend class of _FocusManager
/*=====
		// name: string
		//		Name of this area.
		name: "",

		onFocus: function(event, step){
			// summary:
			//		Called when this area logically gets focus.
			// event: Event object
			//		May be unavailable, should check before use.
			// step: Integer
			//		The distance in the tab sequence from last focused area to this area.
			// returns:
			//		whether this area is successfully focused. If not, the next area will get focus.

 			return true;
		},
		
		onBlur: function(event, step){
			// summary:
			//		Called when this area logically loses focus.
			// event: Event object
			//		May be unavailable, should check before use.
			// step: Integer
			//		The distance in the tab sequence from this area to the area to focus.
			// returns:
			//		If Boolean, means whether this area has successfully blurred. If not, the next area to focus is still this one.
			//		If String, means the next area to focus is given by this returned name.

			return true;
		},
		
		onMove: function(rowStep, colStep, event){
			// summary:
			//		Called when focus is moving around within this area.
			// rowStep: Integer
			// colStep: Integer
			// event: Event object
			//		May be unavailable, should check before use.
		},
		
		onKey: function(event, isBubble){
			// summary:
			//		Called when some key is pressed when focus is logically in this area.
			// event: Event object
			// isBubble: Boolean
			//		Whether is in bubble stage (true) or catch stage (false).
			// returns:
			//		If you do NOT want the event to propagate any further along the area stack, return exactly false.
			//		So if you return nothing (undefined), this event is still propagating.
			return true;
		},
		
		getRegions: function(){
			// summary:
			//		Define the small regions (dom nodes) in this area.
			// returns:
			//		Array of dom nodes.
		},
		
		onRegionFocus: function(event){
			// summary:
			//		Connected to the onfocus event of the defined regions (if any)
		},
		
		onRegionBlur: function(event){
			// summary:
			//		Connected to the onblur event of the defined regions (if any)
		},
=====*/
	constructor: function(area, focusManager){
		this._fm = focusManager;
		this._evtStack = [area.name];
		var dummy = function(){return true;};
		area.onFocus = area.onFocus || dummy;
		area.onBlur = area.onBlur || dummy;
		area.onMove = area.onMove || dummy;
		area.onKeyUp = area.onKeyUp || dummy;
		area.onKeyDown = area.onKeyDown || dummy;
		lang.mixin(this, area);
	},
	move: function(rowStep, colStep, evt){
		if(this.name){
			var i, len = this._evtStack.length;
			for(i = len - 1; i >= 0; --i){
				if(this._fm._areas[this._evtStack[i]].onMove(rowStep, colStep, evt) === false){
					return false;
				}
			}
		}
		return true;
	},
	_onKeyEvent: function(evt, funcName){
		if(this.name){
			var i, len = this._evtStack.length;
			for(i = len - 1; i >= 0; --i){
				if(this._fm._areas[this._evtStack[i]][funcName](evt, false) === false){
					return false;
				}
			}
			for(i = 0; i < len; ++i){
				if(this._fm._areas[this._evtStack[i]][funcName](evt, true) === false){
					return false;
				}
			}
		}
		return true;
	},
	keydown: function(evt){
		return this._onKeyEvent(evt, "onKeyDown");
	},
	keyup: function(evt){
		return this._onKeyEvent(evt, "onKeyUp");
	},
	contentMouseEventPlanner: function(){
		return 0;
	},
	headerMouseEventPlanner: function(){
		return 0;
	}
});

return declare("dojox.grid.enhanced._FocusManager", _FocusManager, {
	_stopEvent: function(evt){
		try{
			if(evt && evt.preventDefault){
				event.stop(evt);
			}
		}catch(e){}
	},
	
	constructor: function(grid){
		this.grid = grid;
		this._areas = {};
		this._areaQueue = [];
		this._contentMouseEventHandlers = [];
		this._headerMouseEventHandlers = [];
		this._currentAreaIdx = -1;
		this._gridBlured = true;
		this._connects.push(connect.connect(grid, "onBlur", this, "_doBlur"));
		this._connects.push(connect.connect(grid.scroller, "renderPage", this, "_delayedCellFocus"));
		
		this.addArea({
			name: "header",
			onFocus: lang.hitch(this, this.focusHeader),
			onBlur: lang.hitch(this, this._blurHeader),
			onMove: lang.hitch(this, this._navHeader),
			getRegions: lang.hitch(this, this._findHeaderCells),
			onRegionFocus: lang.hitch(this, this.doColHeaderFocus),
			onRegionBlur: lang.hitch(this, this.doColHeaderBlur),
			onKeyDown: lang.hitch(this, this._onHeaderKeyDown)
		});
		this.addArea({
			name: "content",
			onFocus: lang.hitch(this, this._focusContent),
			onBlur: lang.hitch(this, this._blurContent),
			onMove: lang.hitch(this, this._navContent),
			onKeyDown: lang.hitch(this, this._onContentKeyDown)
		});
		this.addArea({
			name: "editableCell",
			onFocus: lang.hitch(this, this._focusEditableCell),
			onBlur: lang.hitch(this, this._blurEditableCell),
			onKeyDown: lang.hitch(this, this._onEditableCellKeyDown),
			onContentMouseEvent: lang.hitch(this, this._onEditableCellMouseEvent),
			contentMouseEventPlanner: function(evt, areas){ return -1; }
		});
		this.placeArea("header");
		this.placeArea("content");
		this.placeArea("editableCell");
		this.placeArea("editableCell","above","content");
	},
	destroy: function(){
		for(var name in this._areas){
			var area = this._areas[name];
			array.forEach(area._connects, connect.disconnect);
			area._connects = null;
			if(area.uninitialize){
				area.uninitialize();
			}
		}
		this.inherited(arguments);
	},
	addArea: function(area){
		if(area.name && lang.isString(area.name)){
			if(this._areas[area.name]){
				//Just replace the original area, instead of remove it, so the position does not change.
				array.forEach(area._connects, connect.disconnect);
			}
			this._areas[area.name] = new _FocusArea(area, this);
			if(area.onHeaderMouseEvent){
				this._headerMouseEventHandlers.push(area.name);
			}
			if(area.onContentMouseEvent){
				this._contentMouseEventHandlers.push(area.name);
			}
		}
	},
	getArea: function(areaName){
		return this._areas[areaName];
	},
	_bindAreaEvents: function(){
		var area, hdl, areas = this._areas;
		array.forEach(this._areaQueue, function(name){
			area = areas[name];
			if(!area._initialized && lang.isFunction(area.initialize)){
				area.initialize();
				area._initialized = true;
			}
			if(area.getRegions){
				area._regions = area.getRegions() || [];
				array.forEach(area._connects || [], connect.disconnect);
				area._connects = [];
				array.forEach(area._regions, function(r){
					if(area.onRegionFocus){
						hdl = connect.connect(r, "onfocus", area.onRegionFocus);
						area._connects.push(hdl);
					}
					if(area.onRegionBlur){
						hdl = connect.connect(r, "onblur", area.onRegionBlur);
						area._connects.push(hdl);
					}
				});
			}
		});
	},
	removeArea: function(areaName){
		var area = this._areas[areaName];
		if(area){
			this.ignoreArea(areaName);
			var i = array.indexOf(this._contentMouseEventHandlers, areaName);
			if(i >= 0){
				this._contentMouseEventHandlers.splice(i, 1);
			}
			i = array.indexOf(this._headerMouseEventHandlers, areaName);
			if(i >= 0){
				this._headerMouseEventHandlers.splice(i, 1);
			}
			array.forEach(area._connects, connect.disconnect);
			if(area.uninitialize){
				area.uninitialize();
			}
			delete this._areas[areaName];
		}
	},
	currentArea: function(areaName, toBlurOld){
		// summary:
		//		Set current area to the one areaName refers.
		// areaName: String
		var idx, cai = this._currentAreaIdx;
		if(lang.isString(areaName) && (idx = array.indexOf(this._areaQueue, areaName)) >= 0){
			if(cai != idx){
				this.tabbingOut = false;
				if(toBlurOld && cai >= 0 && cai < this._areaQueue.length){
					this._areas[this._areaQueue[cai]].onBlur();
				}
				this._currentAreaIdx = idx;
			}
		}else{
			return (cai < 0 || cai >= this._areaQueue.length) ?
				new _FocusArea({}, this) :
				this._areas[this._areaQueue[this._currentAreaIdx]];
		}
		return null;
	},
	placeArea: function(name, pos, otherAreaName){
		// summary:
		//		Place the area refered by *name* at some logical position relative to an existing area.
		// example:
		//		placeArea("myarea","before"|"after",...)
		//		placeArea("myarea","below"|"above",...)
		if(!this._areas[name]){ return; }
		var idx = array.indexOf(this._areaQueue,otherAreaName);
		switch(pos){
			case "after":
				if(idx >= 0){ ++idx; }
				//intentional drop through
			case "before":
				if(idx >= 0){
					this._areaQueue.splice(idx,0,name);
					break;
				}
				//intentional drop through
			default:
				this._areaQueue.push(name);
				break;
			case "above":
				var isAbove = true;
				//intentional drop through
			case "below":
				var otherArea = this._areas[otherAreaName];
				if(otherArea){
					if(isAbove){
						otherArea._evtStack.push(name);
					}else{
						otherArea._evtStack.splice(0,0,name);
					}
				}
		}
	},
	ignoreArea: function(name){
		this._areaQueue = array.filter(this._areaQueue,function(areaName){
			return areaName != name;
		});
	},
	focusArea: function(/* int|string|areaObj */areaId,evt){
		var idx;
		if(typeof areaId == "number"){
			idx = areaId < 0 ? this._areaQueue.length + areaId : areaId;
		}else{
			idx = array.indexOf(this._areaQueue,
				lang.isString(areaId) ? areaId : (areaId && areaId.name));
		}
		if(idx < 0){ idx = 0; }
		var step = idx - this._currentAreaIdx;
		this._gridBlured = false;
		if(step){
			this.tab(step, evt);
		}else{
			this.currentArea().onFocus(evt, step);
		}
	},
	tab: function(step,evt){
		//console.log("===========tab",step,"curArea",this._currentAreaIdx,"areaCnt",this._areaQueue.length);
		this._gridBlured = false;
		this.tabbingOut = false;
		if(step === 0){
			return;
		}
		var cai = this._currentAreaIdx;
		var dir = step > 0 ? 1:-1;
		if(cai < 0 || cai >= this._areaQueue.length){
			cai = (this._currentAreaIdx += step);
		}else{
			var nextArea = this._areas[this._areaQueue[cai]].onBlur(evt,step);
			if(nextArea === true){
				cai = (this._currentAreaIdx += step);
			}else if(lang.isString(nextArea) && this._areas[nextArea]){
				cai = this._currentAreaIdx = array.indexOf(this._areaQueue,nextArea);
			}
		}
		//console.log("target area:",cai);
		for(; cai >= 0 && cai < this._areaQueue.length; cai += dir){
			this._currentAreaIdx = cai;
			if(this._areaQueue[cai] && this._areas[this._areaQueue[cai]].onFocus(evt,step)){
				//console.log("final target area:",this._currentAreaIdx);
				return;
			}
		}
		//console.log("tab out");
		this.tabbingOut = true;
		if(step < 0){
			this._currentAreaIdx = -1;
			dijitFocus.focus(this.grid.domNode);
		}else{
			this._currentAreaIdx = this._areaQueue.length;
			dijitFocus.focus(this.grid.lastFocusNode);
		}
	},
	_onMouseEvent: function(type, evt){
		var lowercase = type.toLowerCase(),
			handlers = this["_" + lowercase + "MouseEventHandlers"],
			res = array.map(handlers, function(areaName){
				return {
					"area": areaName,
					"idx": this._areas[areaName][lowercase + "MouseEventPlanner"](evt, handlers)
				};
			}, this).sort(function(a, b){
				return b.idx - a.idx;
			}),
			resHandlers = array.map(res, function(handler){
				return res.area;
			}),
			i = res.length;
		while(--i >= 0){
			if(this._areas[res[i].area]["on" + type + "MouseEvent"](evt, resHandlers) === false){
				return;
			}
		}
	},
	contentMouseEvent: function(evt){
		this._onMouseEvent("Content", evt);
	},
	headerMouseEvent: function(evt){
		this._onMouseEvent("Header", evt);
	},
	initFocusView: function(){
		// summary:
		//		Overwritten
		this.focusView = this.grid.views.getFirstScrollingView() || this.focusView || this.grid.views.views[0];
		this._bindAreaEvents();
	},
	isNavHeader: function(){
		// summary:
		//		Overwritten
		//		Check whether currently navigating among column headers.
		// returns:
		//		true - focus is on a certain column header | false otherwise
		return this._areaQueue[this._currentAreaIdx] == "header";
	},
	previousKey: function(e){
		// summary:
		//		Overwritten
		this.tab(-1,e);
	},
	nextKey: function(e){
		// summary:
		//		Overwritten
		this.tab(1,e);
	},
	setFocusCell: function(/* Object */inCell, /* Integer */inRowIndex){
		// summary:
		//		Overwritten - focuses the given grid cell
		if(inCell){
			this.currentArea(this.grid.edit.isEditing() ? "editableCell" : "content", true);
			//This is very slow when selecting cells!
			//this.focusGridView();
			this._focusifyCellNode(false);
			this.cell = inCell;
			this.rowIndex = inRowIndex;
			this._focusifyCellNode(true);
		}
		this.grid.onCellFocus(this.cell, this.rowIndex);
	},
	doFocus: function(e){
		// summary:
		//		Overwritten
		//		trap focus only for grid dom node
		//		do not focus for scrolling if grid is about to blur
		if(e && e.target == e.currentTarget && !this.tabbingOut){
			if(this._gridBlured){
				this._gridBlured = false;
				if(this._currentAreaIdx < 0 || this._currentAreaIdx >= this._areaQueue.length){
					this.focusArea(0, e);
				}else{
					this.focusArea(this._currentAreaIdx, e);
				}
			}
		}else{
			this.tabbingOut = false;
		}
		event.stop(e);
	},
	_doBlur: function(){
		this._gridBlured = true;
	},
	doLastNodeFocus: function(e){
		// summary:
		//		Overwritten
		if(this.tabbingOut){
			this.tabbingOut = false;
		}else{
			this.focusArea(-1, e);
		}
	},
	_delayedHeaderFocus: function(){
		// summary:
		//		Overwritten
		if(this.isNavHeader() && !has('ie')){
			this.focusHeader();
		}
	},
	_delayedCellFocus: function(){
		// summary:
		//		Overwritten
		
		//If focus header here, the page will scroll to grid when the grid is created.
		//this.focusArea("header");
	},
	_changeMenuBindNode: function(oldBindNode, newBindNode){
		var hm = this.grid.headerMenu;
		if(hm && this._contextMenuBindNode == oldBindNode){
			hm.unBindDomNode(oldBindNode);
			hm.bindDomNode(newBindNode);
			this._contextMenuBindNode = newBindNode;
		}
	},
	//---------------Header Area------------------------------------------
	focusHeader: function(evt, step){ //need a further look why these changes to parent's
		// summary:
		//		Overwritten
		var didFocus = false;
		this.inherited(arguments);
		if(this._colHeadNode && html.style(this._colHeadNode, 'display') != "none"){
			dijitFocus.focus(this._colHeadNode);
			this._stopEvent(evt);
			didFocus = true;
		}
		return didFocus;
	},
	_blurHeader: function(evt,step){
		// summary:
		//		Overwritten
		if(this._colHeadNode){
			html.removeClass(this._colHeadNode, this.focusClass);
		}
		html.removeAttr(this.grid.domNode,"aria-activedescendant");
		// reset contextMenu onto viewsHeaderNode so right mouse on header will invoke (see focusHeader)
		this._changeMenuBindNode(this.grid.domNode,this.grid.viewsHeaderNode);
		//moved here from nextKey
		this._colHeadNode = this._colHeadFocusIdx = null;
		return true;
	},
	_navHeader: function(rowStep, colStep, evt){
		var colDir = colStep < 0 ? -1 : 1,
			savedIdx = array.indexOf(this._findHeaderCells(), this._colHeadNode);
		if(savedIdx >= 0 && (evt.shiftKey && evt.ctrlKey)){
			this.colSizeAdjust(evt, savedIdx, colDir * 5);
			return;
		}
		this.move(rowStep, colStep);
	},
	_onHeaderKeyDown: function(e, isBubble){
		if(isBubble){
			var dk = keys;
			switch(e.keyCode){
				case dk.ENTER:
				case dk.SPACE:
					var colIdx = this.getHeaderIndex();
					if(colIdx >= 0 && !this.grid.pluginMgr.isFixedCell(e.cell)/*TODO*/){
						this.grid.setSortIndex(colIdx, null, e);
						event.stop(e);
					}
					break;
			}
		}
		return true;
	},
	_setActiveColHeader: function(){
		// summary:
		//		Overwritten
		this.inherited(arguments);
		//EDG now will decorate event on header key events, if no focus, the cell will be wrong
		dijitFocus.focus(this._colHeadNode);
	},
	//---------------Content Area------------------------------------------
	findAndFocusGridCell: function(){
		// summary:
		//		Overwritten
		this._focusContent();
	},
	_focusContent: function(evt,step){
		var didFocus = true;
		var isEmpty = (this.grid.rowCount === 0); // If grid is empty this.grid.rowCount == 0
		if(this.isNoFocusCell() && !isEmpty){
			//skip all the hidden cells
			for(var i = 0, cell = this.grid.getCell(0); cell && cell.hidden; cell = this.grid.getCell(++i)){}
			this.setFocusIndex(0, cell ? i : 0);
		}else if(this.cell && !isEmpty){
			if(this.focusView && !this.focusView.rowNodes[this.rowIndex]){
				// if rowNode for current index is undefined (likely as a result of a sort and because of #7304)
				// scroll to that row
				this.grid.scrollToRow(this.rowIndex);
				this.focusGrid();
			}else{
				this.setFocusIndex(this.rowIndex, this.cell.index);
			}
		}else{
			didFocus = false;
		}
		if(didFocus){ this._stopEvent(evt); }
		return didFocus;
	},
	_blurContent: function(evt,step){
		this._focusifyCellNode(false);
		return true;
	},
	_navContent: function(rowStep, colStep, evt){
		if((this.rowIndex === 0 && rowStep < 0) || (this.rowIndex === this.grid.rowCount - 1 && rowStep > 0)){
			return;
		}
		this._colHeadNode = null;
		this.move(rowStep, colStep, evt);
		if(evt){
			event.stop(evt);
		}
	},
	_onContentKeyDown: function(e, isBubble){
		if(isBubble){
			var dk = keys, s = this.grid.scroller;
			switch(e.keyCode){
				case dk.ENTER:
				case dk.SPACE:
					var g = this.grid;
					if(g.indirectSelection){ break; }
					g.selection.clickSelect(this.rowIndex, connect.isCopyKey(e), e.shiftKey);
					g.onRowClick(e);
					event.stop(e);
					break;
				case dk.PAGE_UP:
					if(this.rowIndex !== 0){
						if(this.rowIndex != s.firstVisibleRow + 1){
							this._navContent(s.firstVisibleRow - this.rowIndex, 0);
						}else{
							this.grid.setScrollTop(s.findScrollTop(this.rowIndex - 1));
							this._navContent(s.firstVisibleRow - s.lastVisibleRow + 1, 0);
						}
						event.stop(e);
					}
					break;
				case dk.PAGE_DOWN:
					if(this.rowIndex + 1 != this.grid.rowCount){
						event.stop(e);
						if(this.rowIndex != s.lastVisibleRow - 1){
							this._navContent(s.lastVisibleRow - this.rowIndex - 1, 0);
						}else{
							this.grid.setScrollTop(s.findScrollTop(this.rowIndex + 1));
							this._navContent(s.lastVisibleRow - s.firstVisibleRow - 1, 0);
						}
						event.stop(e);
					}
					break;
			}
		}
		return true;
	},
	//------------------editable content area-------------------------
	_blurFromEditableCell: false,
	_isNavigating: false,
	_navElems: null,
	_focusEditableCell: function(evt,step){
		var didFocus = false;
		if(this._isNavigating){
			didFocus = true;
		}else if(this.grid.edit.isEditing() && this.cell){
			if(this._blurFromEditableCell || !this._blurEditableCell(evt, step)){
				this.setFocusIndex(this.rowIndex,this.cell.index);
				didFocus = true;
			}
			this._stopEvent(evt);
		}
		return didFocus;
	},
	_applyEditableCell: function(){
		try{
			this.grid.edit.apply();
		}catch(e){
			console.warn("_FocusManager._applyEditableCell() error:", e);
		}
	},
	_blurEditableCell: function(evt,step){
		this._blurFromEditableCell = false;
		if(this._isNavigating){
			var toBlur = true;
			if(evt){
				var elems = this._navElems;
				var firstElem = elems.lowest || elems.first;
				var lastElem = elems.last || elems.highest || firstElem;
				var target = has('ie') ? evt.srcElement : evt.target;
				toBlur = target == (step > 0 ? lastElem : firstElem);
			}
			if(toBlur){
				this._isNavigating = false;
				html.setSelectable(this.cell.getNode(this.rowIndex), false);
				return "content";
			}
			return false;
		}else if(this.grid.edit.isEditing() && this.cell){
			if(!step || typeof step != "number"){ return false; }
			var dir = step > 0 ? 1 : -1;
			var cc = this.grid.layout.cellCount;
			for(var cell, col = this.cell.index + dir; col >= 0 && col < cc; col += dir){
				cell = this.grid.getCell(col);
				if(cell.editable){
					this.cell = cell;
					this._blurFromEditableCell = true;
					return false;
				}
			}
			if((this.rowIndex > 0 || dir == 1) && (this.rowIndex < this.grid.rowCount || dir == -1)){
				this.rowIndex += dir;
				//this.cell = this.grid.getCell(0); //There must be an editable cell, so this is not necessary.
				for(col = dir > 0 ? 0 : cc - 1; col >= 0 && col < cc; col += dir){
					cell = this.grid.getCell(col);
					if(cell.editable){
						this.cell = cell;
						break;
					}
				}
				this._applyEditableCell();
				return "content";
			}
		}
		return true;
	},
	_initNavigatableElems: function(){
		this._navElems = dijitA11y._getTabNavigable(this.cell.getNode(this.rowIndex));
	},
	_onEditableCellKeyDown: function(e, isBubble){
		var dk = keys,
			g = this.grid,
			edit = g.edit,
			editApplied = false,
			toPropagate = true;
		switch(e.keyCode){
			case dk.ENTER:
				if(isBubble && edit.isEditing()){
					this._applyEditableCell();
					editApplied = true;
					event.stop(e);
				}
				//intentional drop through
			case dk.SPACE:
				if(!isBubble && this._isNavigating){
					toPropagate = false;
					break;
				}
				if(isBubble){
					if(!this.cell.editable && this.cell.navigatable){
						this._initNavigatableElems();
						var toFocus = this._navElems.lowest || this._navElems.first;
						if(toFocus){
							this._isNavigating = true;
							html.setSelectable(this.cell.getNode(this.rowIndex), true);
							dijitFocus.focus(toFocus);
							event.stop(e);
							this.currentArea("editableCell", true);
							break;
						}
					}
					if(!editApplied && !edit.isEditing() && !g.pluginMgr.isFixedCell(this.cell)){
						edit.setEditCell(this.cell, this.rowIndex);
					}
					if(editApplied){
						this.currentArea("content", true);
					}else if(this.cell.editable && g.canEdit()){
						this.currentArea("editableCell", true);
					}
				}
				break;
			case dk.PAGE_UP:
			case dk.PAGE_DOWN:
				if(!isBubble && edit.isEditing()){
					//prevent propagating to content area
					toPropagate = false;
				}
				break;
			case dk.ESCAPE:
				if(!isBubble){
					edit.cancel();
					this.currentArea("content", true);
				}
		}
		return toPropagate;
	},
	_onEditableCellMouseEvent: function(evt){
		if(evt.type == "click"){
			var cell = this.cell || evt.cell;
			if(cell && !cell.editable && cell.navigatable){
				this._initNavigatableElems();
				if(this._navElems.lowest || this._navElems.first){
					var target = has('ie') ? evt.srcElement : evt.target;
					if(target != cell.getNode(evt.rowIndex)){
						this._isNavigating = true;
						this.focusArea("editableCell", evt);
						html.setSelectable(cell.getNode(evt.rowIndex), true);
						dijitFocus.focus(target);
						return false;
					}
				}
			}else if(this.grid.singleClickEdit){
				this.currentArea("editableCell");
				return false;
			}
		}
		return true;
	}
});
});