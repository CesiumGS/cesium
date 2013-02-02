define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/event",
	"dojo/_base/html",
	"dojo/_base/window",
	"dojo/query",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/fx",
	"dojo/_base/fx",
	"dojo/string",
	"dijit/focus",
	"dojo/text!../../templates/FilterBar.html"
], function(declare, array, connect, lang, has, event, html, win, query, _Widget,
	_TemplatedMixin, _WidgetsInTemplateMixin, fx, baseFx, string, dijitFocus, template){

var _focusClass = "dojoxGridFBarHover",
	_filteredClass = "dojoxGridFBarFiltered",
	_stopEvent = function(evt){
		try{
			if(evt && evt.preventDefault){
				event.stop(evt);
			}
		}catch(e){}
	};
	
return declare("dojox.grid.enhanced.plugins.filter.FilterBar", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin],{
	// summary:
	//		The filter bar UI.
	templateString: template,

	widgetsInTemplate: true,
	
	_timeout_statusTooltip: 300,

	_handle_statusTooltip: null,

	_curColIdx: -1,
	
	plugin: null,

	postMixInProperties: function(){
		var plugin = this.plugin;
		var nls = plugin.nls;
		this._filterBarDefBtnLabel = nls["filterBarDefButton"];
		this._filterBarClearBtnLabel = nls["filterBarClearButton"];
		this._closeFilterBarBtnLabel = nls["closeFilterBarBtn"];
		var itemsName = plugin.args.itemsName || nls["defaultItemsName"];
		this._noFilterMsg = string.substitute(nls["filterBarMsgNoFilterTemplate"], ["", itemsName]);
		
		var t = this.plugin.args.statusTipTimeout;
		if(typeof t == 'number'){
			this._timeout_statusTooltip = t;
		}
		
		var g = plugin.grid;
		g.showFilterBar = lang.hitch(this, "showFilterBar");
		g.toggleFilterBar = lang.hitch(this, "toggleFilterBar");
		g.isFilterBarShown = lang.hitch(this, "isFilterBarShown");
	},
	postCreate: function(){
		this.inherited(arguments);
		if(!this.plugin.args.closeFilterbarButton){
			html.style(this.closeFilterBarButton.domNode, "display", "none");
		}
		var _this = this,
			g = this.plugin.grid,
			old_func = this.oldGetHeaderHeight = lang.hitch(g,g._getHeaderHeight);
		
		this.placeAt(g.viewsHeaderNode, "after");
		this.connect(this.plugin.filterDefDialog, "showDialog", "_onShowFilterDefDialog");
		this.connect(this.plugin.filterDefDialog, "closeDialog", "_onCloseFilterDefDialog");
		this.connect(g.layer("filter"), "onFiltered", this._onFiltered);
		
		this.defineFilterButton.domNode.title = this.plugin.nls["filterBarDefButton"];
		if(html.hasClass(win.body(), "dijit_a11y")){
			this.defineFilterButton.set("label", this.plugin.nls["a11yFilterBarDefButton"]);
		}
		this.connect(this.defineFilterButton.domNode, "click", _stopEvent);
		this.connect(this.clearFilterButton.domNode, "click", _stopEvent);
		this.connect(this.closeFilterBarButton.domNode, "click", _stopEvent);
		
		this.toggleClearFilterBtn(true);
		this._initAriaInfo();
		
		//Hack the header height to include filter bar height;
		g._getHeaderHeight = function(){
			return old_func() + html.marginBox(_this.domNode).h;
		};
		//Define an area to make focusManager handle all the navigation stuff
		g.focus.addArea({
			name: "filterbar",
			onFocus: lang.hitch(this, this._onFocusFilterBar, false),
			onBlur: lang.hitch(this, this._onBlurFilterBar)
		});
		g.focus.placeArea("filterbar","after","header");
	},
	uninitialize: function(){
		var g = this.plugin.grid;
		g._getHeaderHeight = this.oldGetHeaderHeight;
		g.focus.removeArea("filterbar");
		this.plugin = null;
	},
	isFilterBarShown: function(){
		return html.style(this.domNode, "display") != "none";
	},
	showFilterBar: function(toShow, useAnim, animArgs){
		var g = this.plugin.grid;
		if(useAnim){
			if(Boolean(toShow) == this.isFilterBarShown()){ return; }
			animArgs = animArgs || {};
			var anims = [], defaultDuration = 500;
			anims.push(fx[toShow ? "wipeIn" : "wipeOut"](lang.mixin({
				"node": this.domNode,
				"duration": defaultDuration
			}, animArgs)));
			var curHeight = g.views.views[0].domNode.offsetHeight;
			var prop = {
				"duration": defaultDuration,
				"properties": {
					"height": {
						"end": lang.hitch(this, function(){
							var barHeight = this.domNode.scrollHeight;
							if(has('ff')){
								barHeight -= 2;
							}
							return toShow ? (curHeight - barHeight) : (curHeight + barHeight);
						})
					}
				}
			};
			array.forEach(g.views.views, function(view){
				anims.push(baseFx.animateProperty(lang.mixin({
					"node": view.domNode
				}, prop, animArgs)), baseFx.animateProperty(lang.mixin({
					"node": view.scrollboxNode
				}, prop, animArgs)));
			});
			anims.push(baseFx.animateProperty(lang.mixin({
				"node": g.viewsNode
			}, prop, animArgs)));
			fx.combine(anims).play();
		}else{
			html.style(this.domNode, "display", toShow ? "" : "none");
			g.update();
		}
	},
	toggleFilterBar: function(useAnim, animArgs){
		this.showFilterBar(!this.isFilterBarShown(), useAnim, animArgs);
	},
	getColumnIdx: function(/* int */coordX){
		var headers = query("[role='columnheader']", this.plugin.grid.viewsHeaderNode);
		var idx = -1;
		for(var i = headers.length - 1; i >= 0; --i){
			var coord = html.position(headers[i]);
			if(coordX >= coord.x && coordX < coord.x + coord.w){
				idx = i;
				break;
			}
		}
		if(idx >= 0 && this.plugin.grid.layout.cells[idx].filterable !== false){
			return idx; //Integer
		}else{
			return -1; //Integer
		}
	},
	toggleClearFilterBtn: function(toHide){
		html.style(this.clearFilterButton.domNode, "display", toHide ? "none" : "");
	},
	_closeFilterBar: function(e){
		_stopEvent(e);
		var rulesCnt = this.plugin.filterDefDialog.getCriteria();
		if(rulesCnt){
			var handle = connect.connect(this.plugin.filterDefDialog, "clearFilter", this, function(){
				this.showFilterBar(false, true);
				connect.disconnect(handle);
			});
			this._clearFilterDefDialog(e);
		}else{
			this.showFilterBar(false, true);
		}
	},

	_showFilterDefDialog: function(e){
		_stopEvent(e);
		this.plugin.filterDefDialog.showDialog(this._curColIdx);
		this.plugin.grid.focus.focusArea("filterbar");
	},
	_clearFilterDefDialog: function(e){
		_stopEvent(e);
		this.plugin.filterDefDialog.onClearFilter();
		this.plugin.grid.focus.focusArea("filterbar");
	},
	_onEnterButton: function(e){
		//If mouse is hovering the btn, which means the user is about to click,
		//we should not show status tip on the btn!
		this._onBlurFilterBar();
		_stopEvent(e);
	},
	_onMoveButton: function(e){
		this._onBlurFilterBar();
	},
	_onLeaveButton: function(e){
		this._leavingBtn = true;
	},
	_onShowFilterDefDialog: function(/* Integer */colIdx){
		if(typeof colIdx == "number"){
			this._curColIdx = colIdx;
		}
		this._defPaneIsShown = true;
	},
	_onCloseFilterDefDialog: function(){
		this._defPaneIsShown = false;
		//Do not remember what column are we on, so clicking the btn will show 'any column'
		this._curColIdx = -1;
		dijitFocus.focus(this.defineFilterButton.domNode);
	},
	_onClickFilterBar: function(/* event */e){
		_stopEvent(e);
		this._clearStatusTipTimeout();
		this.plugin.grid.focus.focusArea("filterbar");
		this.plugin.filterDefDialog.showDialog(this.getColumnIdx(e.clientX));
	},
	_onMouseEnter: function(/* event */e){
		this._onFocusFilterBar(true, null);
		this._updateTipPosition(e);
		this._setStatusTipTimeout();
	},
	_onMouseMove: function(/* event */e){
		if(this._leavingBtn){
			this._onFocusFilterBar(true, null);
			this._leavingBtn = false;
		}
		if(this._isFocused){
			this._setStatusTipTimeout();
			this._highlightHeader(this.getColumnIdx(e.clientX));
			if(this._handle_statusTooltip){
				this._updateTipPosition(e);
			}
		}
	},
	_onMouseLeave: function(e){
		this._onBlurFilterBar();
	},
	_updateTipPosition: function(evt){
		this._tippos = {
			x: evt.pageX,
			y: evt.pageY
		};
	},
	_onFocusFilterBar: function(highlightOnly, evt, step){
		if(!this.isFilterBarShown()){
			return false;
		}
		this._isFocused = true;
		html.addClass(this.domNode,_focusClass);
		if(!highlightOnly){
			var hasFilter = html.style(this.clearFilterButton.domNode, "display") !== "none";
			var hasCloseButton = html.style(this.closeFilterBarButton.domNode, "display") !== "none";
			if(typeof this._focusPos == "undefined"){
				if(step > 0){
					this._focusPos = 0;
				}else{
					if(hasCloseButton){
						this._focusPos = 1;
					}else{
						this._focusPos = 0;
					}
					if(hasFilter){
						++this._focusPos;
					}
				}
			}
			if(this._focusPos === 0){
				dijitFocus.focus(this.defineFilterButton.focusNode);
			}else if(this._focusPos === 1 && hasFilter){
				dijitFocus.focus(this.clearFilterButton.focusNode);
			}else{
				dijitFocus.focus(this.closeFilterBarButton.focusNode);
			}
		}
		_stopEvent(evt);
		return true;
	},
	_onBlurFilterBar: function(evt, step){
		if(this._isFocused){
			this._isFocused = false;
			html.removeClass(this.domNode,_focusClass);
			this._clearStatusTipTimeout();
			this._clearHeaderHighlight();
		}
		var toBlur = true;
		if(step){
			var buttonCount = 3;
			if(html.style(this.closeFilterBarButton.domNode, "display") === "none"){
				--buttonCount;
			}
			if(html.style(this.clearFilterButton.domNode, "display") === "none"){
				--buttonCount;
			}
			if(buttonCount == 1){
				delete this._focusPos;
			}else{
				var current = this._focusPos;
				for(var next = current + step; next < 0; next += buttonCount){}
				next %= buttonCount;
				if((step > 0 && next < current) || (step < 0 && next > current)){
					delete this._focusPos;
				}else{
					this._focusPos = next;
					toBlur = false;
				}
			}
		}
		return toBlur;
	},
	_onFiltered: function(/* int */filteredSize,/* int */originSize){
		var p = this.plugin,
			itemsName = p.args.itemsName || p.nls["defaultItemsName"],
			msg = "", g = p.grid,
			filterLayer = g.layer("filter");
		if(filterLayer.filterDef()){
			msg = string.substitute(p.nls["filterBarMsgHasFilterTemplate"], [filteredSize, originSize, itemsName]);
			html.addClass(this.domNode, _filteredClass);
		}else{
			msg = string.substitute(p.nls["filterBarMsgNoFilterTemplate"], [originSize, itemsName]);
			html.removeClass(this.domNode, _filteredClass);
		}
		this.statusBarNode.innerHTML = msg;
		this._focusPos = 0;
	},
	_initAriaInfo: function(){
		this.defineFilterButton.domNode.setAttribute("aria-label", this.plugin.nls["waiFilterBarDefButton"]);
		this.clearFilterButton.domNode.setAttribute("aria-label", this.plugin.nls["waiFilterBarClearButton"]);
	},
	_isInColumn: function(/* int */mousePos_x, /* domNode */headerNode, /* int */colIndex){
		var coord = html.position(headerNode);
		return mousePos_x >= coord.x && mousePos_x < coord.x + coord.w;
	},
	_setStatusTipTimeout: function(){
		this._clearStatusTipTimeout();
		if(!this._defPaneIsShown){
			this._handle_statusTooltip = setTimeout(lang.hitch(this,this._showStatusTooltip),this._timeout_statusTooltip);
		}
	},
	_clearStatusTipTimeout: function(){
		clearTimeout(this._handle_statusTooltip);
		this._handle_statusTooltip = null;
	},
	_showStatusTooltip: function(){
		this._handle_statusTooltip = null;
		if(this.plugin){
			this.plugin.filterStatusTip.showDialog(this._tippos.x, this._tippos.y, this.getColumnIdx(this._tippos.x));
		}
	},
	_highlightHeader: function(/* int */colIdx){
		if(colIdx != this._previousHeaderIdx){
			var g = this.plugin.grid,
			cell = g.getCell(this._previousHeaderIdx);
			if(cell){
				html.removeClass(cell.getHeaderNode(), "dojoxGridCellOver");
			}
			cell = g.getCell(colIdx);
			if(cell){
				html.addClass(cell.getHeaderNode(), "dojoxGridCellOver");
			}
			this._previousHeaderIdx = colIdx;
		}
	},
	_clearHeaderHighlight: function(){
		if(typeof this._previousHeaderIdx != "undefined"){
			var g = this.plugin.grid,
			cell = g.getCell(this._previousHeaderIdx);
			if(cell){
				g.onHeaderCellMouseOut({
					cellNode: cell.getHeaderNode()
				});
			}
			delete this._previousHeaderIdx;
		}
	}
});
});
