define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/lang",
	"dojo/_base/html",
	"dojo/_base/event",
	"dojo/query",
	"dojo/string",
	"dojo/keys",
	"dojo/text!../templates/Pagination.html",
	"./Dialog",
	"./_StoreLayer",
	"../_Plugin",
	"../../EnhancedGrid",
	"dijit/form/Button",
	"dijit/form/NumberTextBox",
	"dijit/focus",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojox/html/metrics",
	"dojo/i18n!../nls/Pagination"
], function(kernel, declare, array, connect, lang, html, event, query,
	string, keys, template, Dialog, layers, _Plugin, EnhancedGrid,
	Button, NumberTextBox, dijitFocus, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin, metrics, nls){
		
var _GotoPagePane = declare("dojox.grid.enhanced.plugins.pagination._GotoPagePane", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
	templateString: "<div>" + 
						"<div class='dojoxGridDialogMargin' dojoAttachPoint='_mainMsgNode'></div>" +
						"<div class='dojoxGridDialogMargin'>" +
							"<input dojoType='dijit.form.NumberTextBox' style='width: 50px;' dojoAttachPoint='_pageInputBox' dojoAttachEvent='onKeyUp: _onKey'></input>" +
							"<label dojoAttachPoint='_pageLabelNode'></label>" +
						"</div>" +
						"<div class='dojoxGridDialogButton'>" +
							"<button dojoType='dijit.form.Button' dojoAttachPoint='_confirmBtn' dojoAttachEvent='onClick: _onConfirm'></button>" +
							"<button dojoType='dijit.form.Button' dojoAttachPoint='_cancelBtn' dojoAttachEvent='onClick: _onCancel'></button>" +
						"</div>" +
					"</div>",
	widgetsInTemplate: true,
	dlg: null,
	postMixInProperties: function(){
		this.plugin = this.dlg.plugin;
	},
	postCreate: function(){
		this.inherited(arguments);
		this._mainMsgNode.innerHTML = this.plugin._nls[12];
		this._confirmBtn.set("label", this.plugin._nls[14]);
		this._confirmBtn.set("disabled", true);
		this._cancelBtn.set("label", this.plugin._nls[15]);
	},
	_onConfirm: function(evt){
		if(this._pageInputBox.isValid() && this._pageInputBox.getDisplayedValue() !== ""){
			this.plugin.currentPage(this._pageInputBox.parse(this._pageInputBox.getDisplayedValue()));
			this.dlg._gotoPageDialog.hide();
			this._pageInputBox.reset();
		}
		stopEvent(evt);
	},
	_onCancel: function(evt){
		this._pageInputBox.reset();
		this.dlg._gotoPageDialog.hide();
		stopEvent(evt);
	},
	_onKey: function(evt){
		this._confirmBtn.set("disabled", !this._pageInputBox.isValid() || this._pageInputBox.getDisplayedValue() == "");
		if(!evt.altKey && !evt.metaKey && evt.keyCode === keys.ENTER){
			this._onConfirm(evt);
		}
	}
});

var _GotoPageDialog = declare("dojox.grid.enhanced.plugins.pagination._GotoPageDialog", null, {
	pageCount: 0,
	dlgPane: null,
	constructor: function(plugin){
		this.plugin = plugin;
		this.dlgPane = new _GotoPagePane({"dlg": this});
		this.dlgPane.startup();
		this._gotoPageDialog = new Dialog({
			"refNode": plugin.grid.domNode,
			"title": this.plugin._nls[11],
			"content": this.dlgPane
		});
		this._gotoPageDialog.startup();
	},
	_updatePageCount: function(){
		this.pageCount = this.plugin.getTotalPageNum();
		this.dlgPane._pageInputBox.constraints = {fractional:false, min:1, max:this.pageCount};
		this.dlgPane._pageLabelNode.innerHTML = string.substitute(this.plugin._nls[13], [this.pageCount]);
	},
	showDialog: function(){
		this._updatePageCount();
		this._gotoPageDialog.show();
	},
	destroy: function(){
		this._gotoPageDialog.destroy();
	}
});

var _ForcedPageStoreLayer = declare("dojox.grid.enhanced.plugins._ForcedPageStoreLayer", layers._StoreLayer, {
	tags: ["presentation"],
	constructor: function(plugin){
		this._plugin = plugin;
	},
	_fetch: function(request){
		var _this = this,
			plugin = _this._plugin,
			grid = plugin.grid,
			scope = request.scope || kernel.global,
			onBegin = request.onBegin;
		request.start = (plugin._currentPage - 1) * plugin._currentPageSize + request.start;
		_this.startIdx = request.start;
		_this.endIdx = request.start + plugin._currentPageSize - 1;
		var p = plugin._paginator;
		if(!plugin._showAll){
			plugin._showAll = !p.sizeSwitch && !p.pageStepper && !p.gotoButton;
		}
		if(onBegin && plugin._showAll){
			request.onBegin = function(size, req){
				plugin._maxSize = plugin._currentPageSize = size;
				_this.startIdx = 0;
				_this.endIdx = size - 1;
				plugin._paginator._update();
				req.onBegin = onBegin;
				req.onBegin.call(scope, size, req);
			};
		}else if(onBegin){
			request.onBegin = function(size, req){
				req.start = 0;
				req.count = plugin._currentPageSize;
				plugin._maxSize = size;
				_this.endIdx = _this.endIdx >= size ? (size - 1) : _this.endIdx;
				if(_this.startIdx > size && size !== 0){
					grid._pending_requests[req.start] = false;
					plugin.firstPage();
				}
				plugin._paginator._update();
				req.onBegin = onBegin;
				req.onBegin.call(scope, Math.min(plugin._currentPageSize, (size - _this.startIdx)), req);
			};
		}
		return lang.hitch(this._store, this._originFetch)(request);
	}
});

var stopEvent = function(evt){
	try{
		if(evt){
			event.stop(evt);
		}
	}catch(e){}
};

var _Focus = declare("dojox.grid.enhanced.plugins.pagination._Focus", null, {
	_focusedNode: null,
	_isFocused: false,
	constructor: function(paginator){
		this._pager = paginator;
		var focusMgr =  paginator.plugin.grid.focus;
		paginator.plugin.connect(paginator, 'onSwitchPageSize', lang.hitch(this, '_onActive'));
		paginator.plugin.connect(paginator, 'onPageStep', lang.hitch(this, '_onActive'));
		paginator.plugin.connect(paginator, 'onShowGotoPageDialog', lang.hitch(this, '_onActive'));
		paginator.plugin.connect(paginator, '_update', lang.hitch(this, '_moveFocus'));
	},
	_onFocus: function(evt, step){
		var node, nodes;
		if(!this._isFocused){
			node = this._focusedNode || query('[tabindex]', this._pager.domNode)[0];
		}else if(step && this._focusedNode){
			var dir = step > 0 ? -1 : 1,
				tabindex = parseInt(this._focusedNode.getAttribute('tabindex'), 10) + dir;
			while(tabindex >= -3 && tabindex < 0){
				node = query('[tabindex=' + tabindex + ']', this._pager.domNode)[0];
				if(node){
					break;
				}else{
					tabindex += dir;
				}
			}
		}
		return this._focus(node, evt);
	},
	_onBlur: function(evt, step){
		if(!step || !this._focusedNode){
			this._isFocused = false;
			if(this._focusedNode && html.hasClass(this._focusedNode, 'dojoxGridButtonFocus')){
				html.removeClass(this._focusedNode, 'dojoxGridButtonFocus');
			}
			return true;
		}
		var node, dir = step > 0 ? -1 : 1,
			tabindex = parseInt(this._focusedNode.getAttribute('tabindex'), 10) + dir;
		while(tabindex >= -3 && tabindex < 0){
			node = query('[tabindex=' + tabindex + ']', this._pager.domNode)[0];
			if(node){
				break;
			}else{
				tabindex += dir;
			}
		}
		if(!node){
			this._isFocused = false;
			if(html.hasClass(this._focusedNode, 'dojoxGridButtonFocus')){
				html.removeClass(this._focusedNode, 'dojoxGridButtonFocus');
			}
		}
		return node ? false : true;
	},
	_onMove: function(rowDelta, colDelta, evt){
		if(this._focusedNode){
			var tabindex = this._focusedNode.getAttribute('tabindex'),
				delta = colDelta == 1 ? "nextSibling" : "previousSibling",
				node = this._focusedNode[delta];
			while(node){
				if(node.getAttribute('tabindex') == tabindex){
					this._focus(node);
					break;
				}
				node = node[delta];
			}
		}
	},
	_focus: function(node, evt){
		if(node){
			this._isFocused = true;
			if(kernel.isIE && this._focusedNode){
				html.removeClass(this._focusedNode, 'dojoxGridButtonFocus');
			}
			this._focusedNode = node;
			node.focus();
			if(kernel.isIE){
				html.addClass(node, 'dojoxGridButtonFocus');
			}
			stopEvent(evt);
			return true;
		}
		return false;
	},
	_onActive: function(e){
		this._focusedNode = e.target;
		if(!this._isFocused){
			this._pager.plugin.grid.focus.focusArea('pagination' + this._pager.position);
		}
	},
	_moveFocus: function(){
		if(this._focusedNode && !this._focusedNode.getAttribute('tabindex')){
			var next = this._focusedNode.nextSibling;
			while(next){
				if(next.getAttribute('tabindex')){
					this._focus(next);
					return;
				}
				next = next.nextSibling;
			}
			var prev = this._focusedNode.previousSibling;
			while(prev){
				if(prev.getAttribute('tabindex')){
					this._focus(prev);
					return;
				}
				prev = prev.previousSibling;
			}
			this._focusedNode = null;
			this._onBlur();
		}else if(kernel.isIE && this._focusedNode){
			html.addClass(this._focusedNode, 'dojoxGridButtonFocus');
		}
	}
});

var _Paginator = declare("dojox.grid.enhanced.plugins._Paginator", [_Widget, _TemplatedMixin], {
	templateString: template,
	constructor: function(params){
		lang.mixin(this, params);
		this.grid = this.plugin.grid;
	},
	postCreate: function(){
		this.inherited(arguments);
		var _this = this, g = this.grid;
		this.plugin.connect(g, "_resize", lang.hitch(this, "_resetGridHeight"));
		this._originalResize = g.resize;
		g.resize = function(changeSize, resultSize){
			_this._changeSize = changeSize;
			_this._resultSize = resultSize;
			_this._originalResize.apply(g, arguments);
		};
		this.focus = _Focus(this);
		this._placeSelf();
	},
	destroy: function(){
		this.inherited(arguments);
		this.grid.focus.removeArea("pagination" + this.position);
		if(this._gotoPageDialog){
			this._gotoPageDialog.destroy();
		}
		this.grid.resize = this._originalResize;
	},
	onSwitchPageSize: function(/*Event*/evt){

	},
	onPageStep: function(/*Event*/evt){

	},
	onShowGotoPageDialog: function(/*Event*/evt){

	},
	_update: function(){
		// summary:
		//		Function to update paging information and update
		//		pagination bar display.
		this._updateDescription();
		this._updatePageStepper();
		this._updateSizeSwitch();
		this._updateGotoButton();
	},
	_registerFocus: function(isTop){
		// summary:
		//		Function to register pagination bar to focus manager.
		var focusMgr = this.grid.focus, 
			name = "pagination" + this.position,
			f = this.focus;
		focusMgr.addArea({
			name: name,
			onFocus: lang.hitch(this.focus, "_onFocus"),
			onBlur: lang.hitch(this.focus, "_onBlur"),
			onMove: lang.hitch(this.focus, "_onMove")
		});
		focusMgr.placeArea(name, isTop ? "before" : "after", isTop ? "header" : "content");
	},
	_placeSelf: function(){
		// summary:
		//		Place pagination bar to a position.
		//		There are two options, top of the grid, bottom of the grid.
		var g = this.grid,
			isTop = this.position == "top";
		this.placeAt(isTop ? g.viewsHeaderNode : g.viewsNode, isTop ? "before" : "after");
		this._registerFocus(isTop);
	},
	_resetGridHeight: function(changeSize, resultSize){
		// summary:
		//		Function of resize grid height to place this pagination bar.
		//		Since the grid would be able to add other element in its domNode, we have
		//		change the grid view size to place the pagination bar.
		//		This function will resize the grid viewsNode height, scorllboxNode height
		var g = this.grid;
		changeSize = changeSize || this._changeSize;
		resultSize = resultSize || this._resultSize;
		delete this._changeSize;
		delete this._resultSize;
		if(g._autoHeight){
			return;
		}
		var padBorder = g._getPadBorder().h;
		if(!this.plugin.gh){
			this.plugin.gh = (g.domNode.clientHeight || html.style(g.domNode, 'height')) + 2 * padBorder;
		}
		if(resultSize){
			changeSize = resultSize;
		}
		if(changeSize){
			this.plugin.gh = html.contentBox(g.domNode).h + 2 * padBorder;
		}
		var gh = this.plugin.gh,
			hh = g._getHeaderHeight(),
			ph = html.marginBox(this.domNode).h;
		// ph = this.plugin._paginator.position == "bottom" ? ph * 2 : ph;
		if(typeof g.autoHeight === "number"){
			var cgh = gh + ph - padBorder;
			html.style(g.domNode, "height", cgh + "px");
			html.style(g.viewsNode, "height", (cgh - ph - hh) + "px");
			this._styleMsgNode(hh, html.marginBox(g.viewsNode).w, cgh - ph - hh);
		}else{
			var h = gh - ph - hh - padBorder;
			html.style(g.viewsNode, "height", h + "px");
			var hasHScroller = array.some(g.views.views, function(v){
				return v.hasHScrollbar();
			});
			array.forEach(g.viewsNode.childNodes, function(c){
				html.style(c, "height", h + "px");
			});
			array.forEach(g.views.views, function(v){
				if(v.scrollboxNode){
					if(!v.hasHScrollbar() && hasHScroller){
						html.style(v.scrollboxNode, "height", (h - metrics.getScrollbar().h) + "px");
					}else{
						html.style(v.scrollboxNode, "height", h + "px");
					}
				}
			});
			this._styleMsgNode(hh, html.marginBox(g.viewsNode).w, h);
		}
	},
	_styleMsgNode: function(top, width, height){
		var messagesNode = this.grid.messagesNode;
		html.style(messagesNode, {"position": "absolute", "top": top + "px", "width": width + "px", "height": height + "px", "z-Index": "100"});
	},
	_updateDescription: function(){
		// summary:
		//		Update size information.
		var s = this.plugin.forcePageStoreLayer,
			maxSize = this.plugin._maxSize,
			nls = this.plugin._nls,
			getItemTitle = function(){
				return maxSize <= 0 || maxSize == 1 ? nls[5] : nls[4];
			};
		if(this.description && this.descriptionDiv){
			this.descriptionDiv.innerHTML = maxSize > 0 ? string.substitute(nls[0], [getItemTitle(), maxSize, s.startIdx + 1, s.endIdx + 1]) : "0 " + getItemTitle();
		}
	},
	_updateSizeSwitch: function(){
		// summary:
		//		Update "items per page" information.
		html.style(this.sizeSwitchTd, "display", this.sizeSwitch ? "" : "none");
		if(!this.sizeSwitch){
			return;
		}
		if(this.sizeSwitchTd.childNodes.length < 1){
			this._createSizeSwitchNodes();
		}
		this._updateSwitchNodesStyle();
	},
	_createSizeSwitchNodes: function(){
		// summary:
		//		The function to create the size switch nodes
		var node = null, 
			nls = this.plugin._nls, 
			connect = lang.hitch(this.plugin, 'connect');
		array.forEach(this.pageSizes, function(size){
			// create page size switch node
			var labelValue = isFinite(size) ? string.substitute(nls[2], [size]) : nls[1],
				value = isFinite(size) ? size : nls[16];
			node = html.create("span", {innerHTML: value, title: labelValue, value: size, tabindex: "-1"}, this.sizeSwitchTd, "last");
			// for accessibility
			node.setAttribute("aria-label", labelValue);
			// connect event
			connect(node, "onclick", lang.hitch(this, "_onSwitchPageSize"));
			connect(node, "onkeydown", lang.hitch(this, "_onSwitchPageSize"));
			connect(node, "onmouseover", function(e){
				html.addClass(e.target, "dojoxGridPageTextHover");
			});
			connect(node, "onmouseout", function(e){
				html.removeClass(e.target, "dojoxGridPageTextHover");
			});
			// create a separation node
			node = html.create("span", {innerHTML: "|"}, this.sizeSwitchTd, "last");
			html.addClass(node, "dojoxGridSeparator");
		}, this);
		// delete last separation node
		html.destroy(node);
	},
	_updateSwitchNodesStyle: function(){
		// summary:
		//		Update the switch nodes style
		var size = null;
		var styleNode = function(node, status){
			if(status){
				html.addClass(node, "dojoxGridActivedSwitch");
				html.removeAttr(node, "tabindex");
			}else{
				html.addClass(node, "dojoxGridInactiveSwitch");
				node.setAttribute("tabindex", "-1");
			}
		};
		array.forEach(this.sizeSwitchTd.childNodes, function(node){
			if(node.value){
				html.removeClass(node);
				size = node.value;
				if(this.plugin._showAll){
					styleNode(node, isNaN(parseInt(size, 10)));
				}else{
					styleNode(node, this.plugin._currentPageSize == size);
				}
			}
		}, this);
	},
	_updatePageStepper: function(){
		// summary:
		//		Update the page step nodes
		html.style(this.pageStepperTd, "display", this.pageStepper ? "" : "none");
		if(!this.pageStepper){
			return;
		}
		if(this.pageStepperDiv.childNodes.length < 1){
			this._createPageStepNodes();
			this._createWardBtns();
		}else{
			this._resetPageStepNodes();
		}
		this._updatePageStepNodesStyle();
	},
	_createPageStepNodes: function(){
		// summary:
		//		Create the page step nodes if they do not exist
		var startPage = this._getStartPage(),
			stepSize = this._getStepPageSize(),
			label = "", node = null, i = startPage,
			connect = lang.hitch(this.plugin, 'connect');
		for(; i < startPage + this.maxPageStep + 1; i++){
			label = string.substitute(this.plugin._nls[3], [i]);
			node = html.create("div", {innerHTML: i, value: i, title: label}, this.pageStepperDiv, "last");
			node.setAttribute("aria-label", label);
			// connect event
			connect(node, "onclick", lang.hitch(this, "_onPageStep"));
			connect(node, "onkeydown", lang.hitch(this, "_onPageStep"));
			connect(node, "onmouseover", function(e){
				html.addClass(e.target, "dojoxGridPageTextHover");
			});
			connect(node, "onmouseout", function(e){
				html.removeClass(e.target, "dojoxGridPageTextHover");
			});
			html.style(node, "display", i < startPage + stepSize ? "" : "none");
		}
	},
	_createWardBtns: function(){
		// summary:
		//		Create the previous/next/first/last button
		var _this = this, nls = this.plugin._nls;
		var highContrastLabel = {prevPage: "&#60;", firstPage: "&#171;", nextPage: "&#62;", lastPage: "&#187;"};
		var createWardBtn = function(value, label, position){
			var node = html.create("div", {value: value, title: label, tabindex: "-2"}, _this.pageStepperDiv, position);
			_this.plugin.connect(node, "onclick", lang.hitch(_this, "_onPageStep"));
			_this.plugin.connect(node, "onkeydown", lang.hitch(_this, "_onPageStep"));
			node.setAttribute("aria-label", label);
			// for high contrast
			var highConrastNode = html.create("span", {value: value, title: label, innerHTML: highContrastLabel[value]}, node, position);
			html.addClass(highConrastNode, "dojoxGridWardButtonInner");
		};
		createWardBtn("prevPage", nls[6], "first");
		createWardBtn("firstPage", nls[7], "first");
		createWardBtn("nextPage", nls[8], "last");
		createWardBtn("lastPage", nls[9], "last");
	},
	_resetPageStepNodes: function(){
		// summary:
		//		The page step nodes might be changed when fetch data, we need to
		//		update/reset them
		var startPage = this._getStartPage(),
			stepSize = this._getStepPageSize(),
			stepNodes = this.pageStepperDiv.childNodes,
			node = null, i = startPage, j = 2, tip;
		for(; j < stepNodes.length - 2; j++, i++){
			node = stepNodes[j];
			if(i < startPage + stepSize){
				tip = string.substitute(this.plugin._nls[3], [i]);
				html.attr(node, {
					"innerHTML": i,
					"title": tip,
					"value": i
				});
				html.style(node, "display", "");
				node.setAttribute("aria-label", tip);
			}else{
				html.style(node, "display", "none");
			}
		}
	},
	_updatePageStepNodesStyle: function(){
		// summary:
		//		Update the style of the page step nodes
		var value = null,
			curPage = this.plugin.currentPage(),
			pageCount = this.plugin.getTotalPageNum();
		var updateClass = function(node, isWardBtn, status){
			var value = node.value,
				enableClass = isWardBtn ? "dojoxGrid" + value + "Btn" : "dojoxGridInactived",
				disableClass = isWardBtn ? "dojoxGrid" + value + "BtnDisable" : "dojoxGridActived";
			if(status){
				html.addClass(node, disableClass);
				html.removeAttr(node, "tabindex");
			}else{
				html.addClass(node, enableClass);
				node.setAttribute("tabindex", "-2");
			}
		};
		array.forEach(this.pageStepperDiv.childNodes, function(node){
			html.removeClass(node);
			if(isNaN(parseInt(node.value, 10))){
				html.addClass(node, "dojoxGridWardButton");
				var disablePageNum = node.value == "prevPage" || node.value == "firstPage" ? 1 : pageCount;
				updateClass(node, true, (curPage === disablePageNum));
			}else{
				value = parseInt(node.value, 10);
				updateClass(node, false, (value === curPage || html.style(node, "display") === "none"));
			}
		}, this);
	},
	_showGotoButton: function(flag){
		this.gotoButton = flag;
		this._updateGotoButton();
	},
	_updateGotoButton: function(){
		// summary:
		//		Create/destroy the goto page button
		if(!this.gotoButton){
			if(this._gotoPageDialog){
				this._gotoPageDialog.destroy();
			}
			html.removeAttr(this.gotoPageDiv, "tabindex");
			html.style(this.gotoPageTd, 'display', 'none');
			return;
		}
		if(html.style(this.gotoPageTd, 'display') == 'none'){
			html.style(this.gotoPageTd, 'display', '');
		}
		this.gotoPageDiv.setAttribute('title', this.plugin._nls[10]);
		html.toggleClass(this.gotoPageDiv, "dojoxGridPaginatorGotoDivDisabled", this.plugin.getTotalPageNum() <= 1);
		if(this.plugin.getTotalPageNum() <= 1){
			html.removeAttr(this.gotoPageDiv, "tabindex");
		}else{
			this.gotoPageDiv.setAttribute("tabindex", "-3");
		}
	},
	_openGotopageDialog: function(e){
		// summary:
		//		Show the goto page dialog
		if(this.plugin.getTotalPageNum() <= 1){
			return;
		}
		if(e.type === "keydown" && e.keyCode !== keys.ENTER && e.keyCode !== keys.SPACE){
			return;
		}
		if(!this._gotoPageDialog){
			this._gotoPageDialog = new _GotoPageDialog(this.plugin);
		}
		this._gotoPageDialog.showDialog();
		this.onShowGotoPageDialog(e);
	},
	_onSwitchPageSize: function(/*Event*/e){
		// summary:
		//		The handler of switch the page size
		if(e.type === "keydown" && e.keyCode !== keys.ENTER && e.keyCode !== keys.SPACE){
			return;
		}
		this.onSwitchPageSize(e);
		this.plugin.currentPageSize(e.target.value);
	},
	_onPageStep: function(/*Event*/e){
		// summary:
		//		The handler jump page event
		if(e.type === "keydown" && e.keyCode !== keys.ENTER && e.keyCode !== keys.SPACE){
			return;
		}
		var p = this.plugin,
			value = e.target.value;
		this.onPageStep(e);
		if(!isNaN(parseInt(value, 10))){
			p.currentPage(parseInt(value, 10));
		}else{
			p[value]();
		}
	},
	_getStartPage: function(){
		var cp = this.plugin.currentPage(),
			ms = this.maxPageStep,
			hs = parseInt(ms / 2, 10),
			tp = this.plugin.getTotalPageNum();
		if(cp < hs || (cp - hs) < 1 || tp <= ms){
			return 1;
		}else{
			return tp - cp < hs && cp - ms >= 0 ? tp - ms + 1 : cp - hs;
		}
	},
	_getStepPageSize: function(){
		var sp = this._getStartPage(),
			tp = this.plugin.getTotalPageNum(),
			ms = this.maxPageStep;
		return sp + ms > tp ? tp - sp + 1 : ms;
	}
});

var Pagination = declare("dojox.grid.enhanced.plugins.Pagination", _Plugin, {
	// summary:
	//		The typical pagination way to deal with huge dataset
	//		an alternative for the default virtual scrolling manner.
	name: "pagination",

	// defaultPageSize: Integer
	//		Number of rows in a page, 25 by default.
	defaultPageSize: 25,

	// defaultPage: Integer
	//		Which page will be displayed initially, 1st page by default.
	defaultPage: 1,

	// description: boolean
	//		Whether the description information will be displayed, true by default.
	description: true,

	// sizeSwitch: boolean
	//		Whether the page size switch options will be displayed, true by default.
	sizeSwitch: true,

	// pageStepper: boolean
	//		Whether the page switch options will be displayed, true by default.
	pageStepper: true,

	// gotoButton: boolean
	//		Whether the goto page button will be displayed, false by default.
	gotoButton: false,

	// pageSizes: Array
	//		Array of page sizes for switching, e.g. [10, 25, 50, 100, Infinity] by default,
	//		Infinity or any NaN value will be treated as "all".
	pageSizes: [10, 25, 50, 100, Infinity],

	// maxPageStep: Integer
	//		The max number of page sizes to be displayed, 7 by default.
	maxPageStep: 7,

	// position: string
	//		The position of the pagination bar - "top"|"bottom", "bottom" by default.
	position: 'bottom',
	
	init: function(){
		var g = this.grid;
		g.usingPagination = true;
		this._initOptions();
		this._currentPage = this.defaultPage;
		this._currentPageSize = this.grid.rowsPerPage = this.defaultPageSize;
		// wrap store layer
		this._store = g.store;
		this.forcePageStoreLayer = new _ForcedPageStoreLayer(this);
		layers.wrap(g, "_storeLayerFetch", this.forcePageStoreLayer);
		// create pagination bar
		this._paginator = this.option.position != "top" ? 
			new _Paginator(lang.mixin(this.option, {position: "bottom", plugin: this})) :
			new _Paginator(lang.mixin(this.option, {position: "top", plugin: this}));
		this._regApis();
	},
	destroy: function(){
		this.inherited(arguments);
		this._paginator.destroy();
		var g = this.grid;
		g.unwrap(this.forcePageStoreLayer.name());
		g.scrollToRow = this._gridOriginalfuncs[0];
		g._onNew = this._gridOriginalfuncs[1];
		g.removeSelectedRows = this._gridOriginalfuncs[2];
		this._paginator = null;
		this._nls = null;
	},
	currentPage: function(page){
		// summary:
		//		Shift to the given page, return current page number. If there 
		//		is no valid page was passed in, just return current page num.
		// page: Integer
		//		The page to go to, starting at 1.
		// returns:
		//		Current page number
		if(page <= this.getTotalPageNum() && page > 0 && this._currentPage !== page){
			this._currentPage = page;
			this.grid._refresh(true);
			this.grid.resize();
		}
		return this._currentPage;
	},
	nextPage: function(){
		// summary:
		//		Go to the next page.
		this.currentPage(this._currentPage + 1);
	},
	prevPage: function(){
		// summary:
		//		Go to the previous page.
		this.currentPage(this._currentPage - 1);
	},
	firstPage: function(){
		// summary:
		//		Go to the first page
		this.currentPage(1);
	},
	lastPage: function(){
		// summary:
		//		Go to the last page
		this.currentPage(this.getTotalPageNum());
	},
	currentPageSize: function(size){
		// summary:
		//		Change the size of current page or return the current page size.
		// size: Integer|null
		//		An integer identifying the number of rows per page. If the size
		//		is an Infinity, all rows will be displayed; if an invalid value passed
		//		in, the current page size will be returned.
		// returns:
		//		Current size of items per page.  
		if(!isNaN(size)){
			var g = this.grid,
				startIndex = this._currentPageSize * (this._currentPage - 1), endIndex;
			this._showAll = !isFinite(size);
			this.grid.usingPagination = !this._showAll;
			this._currentPageSize = this._showAll ? this._maxSize : size;
			g.rowsPerPage = this._showAll ? this._defaultRowsPerPage : size;
			endIndex = startIndex + Math.min(this._currentPageSize, this._maxSize);
			if(endIndex > this._maxSize){
				this.lastPage();
			}else{
				var cp = Math.ceil(startIndex / this._currentPageSize) + 1;
				if(cp !== this._currentPage){
					this.currentPage(cp);
				}else{
					this.grid._refresh(true);
				}
			}
			this.grid.resize();
		}
		return this._currentPageSize;
	},
	getTotalPageNum: function(){
		// summary:
		//		Get total page number
		return Math.ceil(this._maxSize / this._currentPageSize);
	},
	getTotalRowCount: function(){
		// summary:
		//		Function for get total row count
		return this._maxSize;
	},
	scrollToRow: function(inRowIndex){
		// summary:
		//		Override the grid.scrollToRow(), could jump to the right page
		//		and scroll to the specific row
		// inRowIndex: integer
		//		The row index
		var page = parseInt(inRowIndex / this._currentPageSize, 10) + 1;
		if(page > this.getTotalPageNum()){
			return;
		}
		this.currentPage(page);
		var rowIdx = inRowIndex % this._currentPageSize;
		return this._gridOriginalfuncs[0](rowIdx);
	},
	removeSelectedRows: function(){
		this._multiRemoving = true;
		this._gridOriginalfuncs[2].apply();
		this._multiRemoving = false;
		if(this.grid.store.save){
			this.grid.store.save();
		}
		this.grid.resize();
		this.grid._refresh();
	},
	showGotoPageButton: function(flag){
		// summary:
		//		For show/hide the go to page button dynamically
		// flag: boolean
		//		Show the go to page button when flag is true, otherwise hide it
		this._paginator.gotoButton = flag;
		this._paginator._updateGotoButton();
	},
	// [DEPRECATED] ============
	gotoPage: function(page){
		kernel.deprecated("dojox.grid.enhanced.EnhancedGrid.gotoPage(page)", "use dojox.grid.enhanced.EnhancedGrid.currentPage(page) instead", "1.8");
		this.currentPage(page);
	},
	gotoFirstPage: function(){
		kernel.deprecated("dojox.grid.enhanced.EnhancedGrid.gotoFirstPage()", "use dojox.grid.enhanced.EnhancedGrid.firstPage() instead", "1.8");
		this.firstPage();
	},
	gotoLastPage: function(){
		kernel.deprecated("dojox.grid.enhanced.EnhancedGrid.gotoLastPage()", "use dojox.grid.enhanced.EnhancedGrid.lastPage() instead", "1.8");
		this.lastPage();
	},
	changePageSize: function(size){
		kernel.deprecated("dojox.grid.enhanced.EnhancedGrid.changePageSize(size)", "use dojox.grid.enhanced.EnhancedGrid.currentPageSize(size) instead", "1.8");
		this.currentPageSize(size);
	},
	// =============== Protected ================
	_nls: null,
	_showAll: false,
	_maxSize: 0,
	// =============== Private =============== 
	_defaultRowsPerPage: 25,
	_currentPage: 1,
	_currentPageSize: 25,
	
	_initOptions: function(){
		this._defaultRowsPerPage = this.grid.rowsPerPage || 25;
		this.defaultPage = this.option.defaultPage >= 1 ? parseInt(this.option.defaultPage, 10) : 1;
		this.option.description = this.option.description !== undefined ? !!this.option.description : this.description;
		this.option.sizeSwitch = this.option.sizeSwitch !== undefined ? !!this.option.sizeSwitch : this.sizeSwitch;
		this.option.pageStepper = this.option.pageStepper !== undefined ? !!this.option.pageStepper : this.pageStepper;
		this.option.gotoButton = this.option.gotoButton !== undefined ? !!this.option.gotoButton : this.gotoButton;
		if(lang.isArray(this.option.pageSizes)){
			var pageSizes = [];
			array.forEach(this.option.pageSizes, function(size){
				size = typeof size == 'number' ? size : parseInt(size, 10);
				if(!isNaN(size) && size > 0){
					pageSizes.push(size);
				}else if(array.indexOf(pageSizes, Infinity) < 0){
					pageSizes.push(Infinity);
				}
			}, this);
			this.option.pageSizes = pageSizes.sort(function(a, b){return a - b;});
		}else{
			this.option.pageSizes = this.pageSizes;
		}
		this.defaultPageSize = this.option.defaultPageSize >= 1 ? parseInt(this.option.defaultPageSize, 10) : this.pageSizes[0];
		this.option.maxPageStep = this.option.maxPageStep > 0 ? this.option.maxPageStep : this.maxPageStep;
		this.option.position = lang.isString(this.option.position) ? this.option.position.toLowerCase() : this.position;
		this._nls = [
			nls.descTemplate,
			nls.allItemsLabelTemplate,
			nls.pageSizeLabelTemplate,
			nls.pageStepLabelTemplate,
			nls.itemTitle,
			nls.singularItemTitle,
			nls.prevTip,
			nls.firstTip,
			nls.nextTip,
			nls.lastTip,
			nls.gotoButtonTitle,
			nls.dialogTitle,
			nls.dialogIndication,
			nls.pageCountIndication,
			nls.dialogConfirm,
			nls.dialogCancel,
			nls.all
		];
	},
	_regApis: function(){
		var g = this.grid;
		// New added APIs
		g.currentPage = lang.hitch(this, this.currentPage);
		g.nextPage = lang.hitch(this, this.nextPage);
		g.prevPage = lang.hitch(this, this.prevPage);
		g.firstPage = lang.hitch(this, this.firstPage);
		g.lastPage = lang.hitch(this, this.lastPage);
		g.currentPageSize = lang.hitch(this, this.currentPageSize);
		g.showGotoPageButton = lang.hitch(this, this.showGotoPageButton);
		g.getTotalRowCount = lang.hitch(this, this.getTotalRowCount);
		g.getTotalPageNum = lang.hitch(this, this.getTotalPageNum);
		
		g.gotoPage = lang.hitch(this, this.gotoPage);
		g.gotoFirstPage = lang.hitch(this, this.gotoFirstPage);
		g.gotoLastPage = lang.hitch(this, this.gotoLastPage);
		g.changePageSize = lang.hitch(this, this.changePageSize);
		// Changed APIs
		this._gridOriginalfuncs = [
			lang.hitch(g, g.scrollToRow),
			lang.hitch(g, g._onNew),		
			lang.hitch(g, g.removeSelectedRows)
		];
		g.scrollToRow = lang.hitch(this, this.scrollToRow);
		g.removeSelectedRows = lang.hitch(this, this.removeSelectedRows);
		g._onNew = lang.hitch(this, this._onNew);
		this.connect(g, "_onDelete", lang.hitch(this, this._onDelete));
	},
	_onNew: function(item, parentInfo){
		var totalPages = this.getTotalPageNum();
		if(((this._currentPage === totalPages || totalPages === 0) && this.grid.get('rowCount') < this._currentPageSize) || this._showAll){
			lang.hitch(this.grid, this._gridOriginalfuncs[1])(item, parentInfo);
			this.forcePageStoreLayer.endIdx++;
		}
		this._maxSize++;
		if(this._showAll){
			this._currentPageSize++;
		}
		if(this._showAll && this.grid.autoHeight){
			this.grid._refresh();
		}else{
			this._paginator._update();
		}
	},
	_onDelete: function(){
		if(!this._multiRemoving){
			this.grid.resize();
			if(this._showAll){
				this.grid._refresh();
			}
		}
		if(this.grid.get('rowCount') === 0){
			this.prevPage();
		}
	}
});

EnhancedGrid.registerPlugin(Pagination/*name:'pagination'*/);

return Pagination;

});