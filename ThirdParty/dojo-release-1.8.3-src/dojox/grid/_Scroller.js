define([
	"dijit/registry",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./util",
	"dojo/_base/html"
], function(dijitRegistry, declare, lang, util, html){

	var indexInParent = function(inNode){
		var i=0, n, p=inNode.parentNode;
		while((n = p.childNodes[i++])){
			if(n == inNode){
				return i - 1;
			}
		}
		return -1;
	};
	
	var cleanNode = function(inNode){
		if(!inNode){
			return;
		}
		dojo.forEach(dijitRegistry.toArray(), function(w){
			if(w.domNode && html.isDescendant(w.domNode, inNode, true)){
				w.destroy();
			}
		});
	};

	var getTagName = function(inNodeOrId){
		var node = html.byId(inNodeOrId);
		return (node && node.tagName ? node.tagName.toLowerCase() : '');
	};
	
	var nodeKids = function(inNode, inTag){
		var result = [];
		var i=0, n;
		while((n = inNode.childNodes[i])){
			i++;
			if(getTagName(n) == inTag){
				result.push(n);
			}
		}
		return result;
	};
	
	var divkids = function(inNode){
		return nodeKids(inNode, 'div');
	};

	return declare("dojox.grid._Scroller", null, {
		constructor: function(inContentNodes){
			this.setContentNodes(inContentNodes);
			this.pageHeights = [];
			this.pageNodes = [];
			this.stack = [];
		},
		// specified
		rowCount: 0, // total number of rows to manage
		defaultRowHeight: 32, // default height of a row
		keepRows: 100, // maximum number of rows that should exist at one time
		contentNode: null, // node to contain pages
		scrollboxNode: null, // node that controls scrolling
		// calculated
		defaultPageHeight: 0, // default height of a page
		keepPages: 10, // maximum number of pages that should exists at one time
		pageCount: 0,
		windowHeight: 0,
		firstVisibleRow: 0,
		lastVisibleRow: 0,
		averageRowHeight: 0, // the average height of a row
		// private
		page: 0,
		pageTop: 0,
		// init
		init: function(inRowCount, inKeepRows, inRowsPerPage){
			switch(arguments.length){
				case 3: this.rowsPerPage = inRowsPerPage;
				case 2: this.keepRows = inKeepRows;
				case 1: this.rowCount = inRowCount;
				default: break;
			}
			this.defaultPageHeight = (this.grid.rowHeight > 0 ? this.grid.rowHeight : this.defaultRowHeight) * this.rowsPerPage;
			this.pageCount = this._getPageCount(this.rowCount, this.rowsPerPage);
			this.setKeepInfo(this.keepRows);
			this.invalidate();
			if(this.scrollboxNode){
				this.scrollboxNode.scrollTop = 0;
				this.scroll(0);
				this.scrollboxNode.onscroll = lang.hitch(this, 'onscroll');
			}
		},
		_getPageCount: function(rowCount, rowsPerPage){
			return rowCount ? (Math.ceil(rowCount / rowsPerPage) || 1) : 0;
		},
		destroy: function(){
			this.invalidateNodes();
			delete this.contentNodes;
			delete this.contentNode;
			delete this.scrollboxNode;
		},
		setKeepInfo: function(inKeepRows){
			this.keepRows = inKeepRows;
			this.keepPages = !this.keepRows ? this.keepPages : Math.max(Math.ceil(this.keepRows / this.rowsPerPage), 2);
		},
		// nodes
		setContentNodes: function(inNodes){
			this.contentNodes = inNodes;
			this.colCount = (this.contentNodes ? this.contentNodes.length : 0);
			this.pageNodes = [];
			for(var i=0; i<this.colCount; i++){
				this.pageNodes[i] = [];
			}
		},
		getDefaultNodes: function(){
			return this.pageNodes[0] || [];
		},
		// updating
		invalidate: function(){
			this._invalidating = true;
			this.invalidateNodes();
			this.pageHeights = [];
			this.height = (this.pageCount ? (this.pageCount - 1)* this.defaultPageHeight + this.calcLastPageHeight() : 0);
			this.resize();
			this._invalidating = false;
		},
		updateRowCount: function(inRowCount){
			this.invalidateNodes();
			this.rowCount = inRowCount;
			// update page count, adjust document height
			var oldPageCount = this.pageCount;
			if(oldPageCount === 0){
				//We want to have at least 1px in height to keep scroller.  Otherwise with an
				//empty grid you can't scroll to see the header.
				this.height = 1;
			}
			this.pageCount = this._getPageCount(this.rowCount, this.rowsPerPage);
			if(this.pageCount < oldPageCount){
				for(var i=oldPageCount-1; i>=this.pageCount; i--){
					this.height -= this.getPageHeight(i);
					delete this.pageHeights[i];
				}
			}else if(this.pageCount > oldPageCount){
				this.height += this.defaultPageHeight * (this.pageCount - oldPageCount - 1) + this.calcLastPageHeight();
			}
			this.resize();
		},
		// implementation for page manager
		pageExists: function(inPageIndex){
			return Boolean(this.getDefaultPageNode(inPageIndex));
		},
		measurePage: function(inPageIndex){
			if(this.grid.rowHeight){
				return ((inPageIndex + 1) * this.rowsPerPage > this.rowCount ?
					this.rowCount - inPageIndex * this.rowsPerPage :
					this.rowsPerPage) * this.grid.rowHeight;
					 
			}
			var n = this.getDefaultPageNode(inPageIndex);
			return (n && n.innerHTML) ? n.offsetHeight : undefined;
		},
		positionPage: function(inPageIndex, inPos){
			for(var i=0; i<this.colCount; i++){
				this.pageNodes[i][inPageIndex].style.top = inPos + 'px';
			}
		},
		repositionPages: function(inPageIndex){
			var nodes = this.getDefaultNodes();
			var last = 0;

			for(var i=0; i<this.stack.length; i++){
				last = Math.max(this.stack[i], last);
			}
			//
			var n = nodes[inPageIndex];
			var y = (n ? this.getPageNodePosition(n) + this.getPageHeight(inPageIndex) : 0);
			for(var p=inPageIndex+1; p<=last; p++){
				n = nodes[p];
				if(n){
					if(this.getPageNodePosition(n) == y){
						return;
					}
					this.positionPage(p, y);
				}
				y += this.getPageHeight(p);
			}
		},
		installPage: function(inPageIndex){
			for(var i=0; i<this.colCount; i++){
				this.contentNodes[i].appendChild(this.pageNodes[i][inPageIndex]);
			}
		},
		preparePage: function(inPageIndex, inReuseNode){
			var p = (inReuseNode ? this.popPage() : null);
			for(var i=0; i<this.colCount; i++){
				var nodes = this.pageNodes[i];
				var new_p = (p === null ? this.createPageNode() : this.invalidatePageNode(p, nodes));
				new_p.pageIndex = inPageIndex;
				nodes[inPageIndex] = new_p;
			}
		},
		// rendering implementation
		renderPage: function(inPageIndex){
			var nodes = [];
			var i, j;
			for(i=0; i<this.colCount; i++){
				nodes[i] = this.pageNodes[i][inPageIndex];
			}
			for(i=0, j=inPageIndex*this.rowsPerPage; (i<this.rowsPerPage)&&(j<this.rowCount); i++, j++){
				this.renderRow(j, nodes);
			}
		},
		removePage: function(inPageIndex){
			for(var i=0, j=inPageIndex*this.rowsPerPage; i<this.rowsPerPage; i++, j++){
				this.removeRow(j);
			}
		},
		destroyPage: function(inPageIndex){
			for(var i=0; i<this.colCount; i++){
				var n = this.invalidatePageNode(inPageIndex, this.pageNodes[i]);
				if(n){
					html.destroy(n);
				}
			}
		},
		pacify: function(inShouldPacify){
		},
		// pacification
		pacifying: false,
		pacifyTicks: 200,
		setPacifying: function(inPacifying){
			if(this.pacifying != inPacifying){
				this.pacifying = inPacifying;
				this.pacify(this.pacifying);
			}
		},
		startPacify: function(){
			this.startPacifyTicks = new Date().getTime();
		},
		doPacify: function(){
			var result = (new Date().getTime() - this.startPacifyTicks) > this.pacifyTicks;
			this.setPacifying(true);
			this.startPacify();
			return result;
		},
		endPacify: function(){
			this.setPacifying(false);
		},
		// default sizing implementation
		resize: function(){
			if(this.scrollboxNode){
				this.windowHeight = this.scrollboxNode.clientHeight;
			}
			for(var i=0; i<this.colCount; i++){
				//We want to have 1px in height min to keep scroller.  Otherwise can't scroll
				//and see header in empty grid.
				util.setStyleHeightPx(this.contentNodes[i], Math.max(1,this.height));
			}
			
			// Calculate the average row height and update the defaults (row and page).
			var needPage = (!this._invalidating);
			if(!needPage){
				var ah = this.grid.get("autoHeight");
				if(typeof ah == "number" && ah <= Math.min(this.rowsPerPage, this.rowCount)){
					needPage = true;
				}
			}
			if(needPage){
				this.needPage(this.page, this.pageTop);
			}
			var rowsOnPage = (this.page < this.pageCount - 1) ? this.rowsPerPage : ((this.rowCount % this.rowsPerPage) || this.rowsPerPage);
			var pageHeight = this.getPageHeight(this.page);
			this.averageRowHeight = (pageHeight > 0 && rowsOnPage > 0) ? (pageHeight / rowsOnPage) : 0;
		},
		calcLastPageHeight: function(){
			if(!this.pageCount){
				return 0;
			}
			var lastPage = this.pageCount - 1;
			var lastPageHeight = ((this.rowCount % this.rowsPerPage)||(this.rowsPerPage)) * this.defaultRowHeight;
			this.pageHeights[lastPage] = lastPageHeight;
			return lastPageHeight;
		},
		updateContentHeight: function(inDh){
			this.height += inDh;
			this.resize();
		},
		updatePageHeight: function(inPageIndex, fromBuild, fromAsynRendering){
			if(this.pageExists(inPageIndex)){
				var oh = this.getPageHeight(inPageIndex);
				var h = (this.measurePage(inPageIndex));
				if(h === undefined){
					h = oh;
				}
				this.pageHeights[inPageIndex] = h;
				if(oh != h){
					this.updateContentHeight(h - oh);
					var ah = this.grid.get("autoHeight");
					if((typeof ah == "number" && ah > this.rowCount)||(ah === true && !fromBuild)){
						if(!fromAsynRendering){
							this.grid.sizeChange();
						}else{//fix #11101 by using fromAsynRendering to avoid deadlock
							var ns = this.grid.viewsNode.style;
							ns.height = parseInt(ns.height) + h - oh + 'px';
							this.repositionPages(inPageIndex);
						}
					}else{
						this.repositionPages(inPageIndex);
					}
				}
				return h;
			}
			return 0;
		},
		rowHeightChanged: function(inRowIndex, fromAsynRendering){
			this.updatePageHeight(Math.floor(inRowIndex / this.rowsPerPage), false, fromAsynRendering);
		},
		// scroller core
		invalidateNodes: function(){
			while(this.stack.length){
				this.destroyPage(this.popPage());
			}
		},
		createPageNode: function(){
			var p = document.createElement('div');
			html.attr(p,"role","presentation");
			p.style.position = 'absolute';
			//p.style.width = '100%';
			p.style[this.grid.isLeftToRight() ? "left" : "right"] = '0';
			return p;
		},
		getPageHeight: function(inPageIndex){
			var ph = this.pageHeights[inPageIndex];
			return (ph !== undefined ? ph : this.defaultPageHeight);
		},
		// FIXME: this is not a stack, it's a FIFO list
		pushPage: function(inPageIndex){
			return this.stack.push(inPageIndex);
		},
		popPage: function(){
			return this.stack.shift();
		},
		findPage: function(inTop){
			var i = 0, h = 0;
			for(var ph = 0; i<this.pageCount; i++, h += ph){
				ph = this.getPageHeight(i);
				if(h + ph >= inTop){
					break;
				}
			}
			this.page = i;
			this.pageTop = h;
		},
		buildPage: function(inPageIndex, inReuseNode, inPos){
			this.preparePage(inPageIndex, inReuseNode);
			this.positionPage(inPageIndex, inPos);
			// order of operations is key below
			this.installPage(inPageIndex);
			this.renderPage(inPageIndex);
			// order of operations is key above
			this.pushPage(inPageIndex);
		},
		needPage: function(inPageIndex, inPos){
			var h = this.getPageHeight(inPageIndex), oh = h;
			if(!this.pageExists(inPageIndex)){
				this.buildPage(inPageIndex, (!this.grid._autoHeight/*fix #10543*/ && this.keepPages&&(this.stack.length >= this.keepPages)), inPos);
				h = this.updatePageHeight(inPageIndex, true);
			}else{
				this.positionPage(inPageIndex, inPos);
			}
			return h;
		},
		onscroll: function(){
			this.scroll(this.scrollboxNode.scrollTop);
		},
		scroll: function(inTop){
			this.grid.scrollTop = inTop;
			if(this.colCount){
				this.startPacify();
				this.findPage(inTop);
				var h = this.height;
				var b = this.getScrollBottom(inTop);
				for(var p=this.page, y=this.pageTop; (p<this.pageCount)&&((b<0)||(y<b)); p++){
					y += this.needPage(p, y);
				}
				this.firstVisibleRow = this.getFirstVisibleRow(this.page, this.pageTop, inTop);
				this.lastVisibleRow = this.getLastVisibleRow(p - 1, y, b);
				// indicates some page size has been updated
				if(h != this.height){
					this.repositionPages(p-1);
				}
				this.endPacify();
			}
		},
		getScrollBottom: function(inTop){
			return (this.windowHeight >= 0 ? inTop + this.windowHeight : -1);
		},
		// events
		processNodeEvent: function(e, inNode){
			var t = e.target;
			while(t && (t != inNode) && t.parentNode && (t.parentNode.parentNode != inNode)){
				t = t.parentNode;
			}
			if(!t || !t.parentNode || (t.parentNode.parentNode != inNode)){
				return false;
			}
			var page = t.parentNode;
			e.topRowIndex = page.pageIndex * this.rowsPerPage;
			e.rowIndex = e.topRowIndex + indexInParent(t);
			e.rowTarget = t;
			return true;
		},
		processEvent: function(e){
			return this.processNodeEvent(e, this.contentNode);
		},
		// virtual rendering interface
		renderRow: function(inRowIndex, inPageNode){
		},
		removeRow: function(inRowIndex){
		},
		// page node operations
		getDefaultPageNode: function(inPageIndex){
			return this.getDefaultNodes()[inPageIndex];
		},
		positionPageNode: function(inNode, inPos){
		},
		getPageNodePosition: function(inNode){
			return inNode.offsetTop;
		},
		invalidatePageNode: function(inPageIndex, inNodes){
			var p = inNodes[inPageIndex];
			if(p){
				delete inNodes[inPageIndex];
				this.removePage(inPageIndex, p);
				cleanNode(p);
				p.innerHTML = '';
			}
			return p;
		},
		// scroll control
		getPageRow: function(inPage){
			return inPage * this.rowsPerPage;
		},
		getLastPageRow: function(inPage){
			return Math.min(this.rowCount, this.getPageRow(inPage + 1)) - 1;
		},
		getFirstVisibleRow: function(inPage, inPageTop, inScrollTop){
			if(!this.pageExists(inPage)){
				return 0;
			}
			var row = this.getPageRow(inPage);
			var nodes = this.getDefaultNodes();
			var rows = divkids(nodes[inPage]);
			for(var i=0,l=rows.length; i<l && inPageTop<inScrollTop; i++, row++){
				inPageTop += rows[i].offsetHeight;
			}
			return (row ? row - 1 : row);
		},
		getLastVisibleRow: function(inPage, inBottom, inScrollBottom){
			if(!this.pageExists(inPage)){
				return 0;
			}
			var nodes = this.getDefaultNodes();
			var row = this.getLastPageRow(inPage);
			var rows = divkids(nodes[inPage]);
			for(var i=rows.length-1; i>=0 && inBottom>inScrollBottom; i--, row--){
				inBottom -= rows[i].offsetHeight;
			}
			return row + 1;
		},
		findTopRow: function(inScrollTop){
			var nodes = this.getDefaultNodes();
			var rows = divkids(nodes[this.page]);
			for(var i=0,l=rows.length,t=this.pageTop,h; i<l; i++){
				h = rows[i].offsetHeight;
				t += h;
				if(t >= inScrollTop){
					this.offset = h - (t - inScrollTop);
					return i + this.page * this.rowsPerPage;
				}
			}
			return -1;
		},
		findScrollTop: function(inRow){
			var rowPage = Math.floor(inRow / this.rowsPerPage);
			var t = 0;
			var i, l;
			for(i=0; i<rowPage; i++){
				t += this.getPageHeight(i);
			}
			this.pageTop = t;
			this.page = rowPage;//fix #10543
			this.needPage(rowPage, this.pageTop);

			var nodes = this.getDefaultNodes();
			var rows = divkids(nodes[rowPage]);
			var r = inRow - this.rowsPerPage * rowPage;
			for(i=0,l=rows.length; i<l && i<r; i++){
				t += rows[i].offsetHeight;
			}
			return t;
		},
		dummy: 0
	});
});
