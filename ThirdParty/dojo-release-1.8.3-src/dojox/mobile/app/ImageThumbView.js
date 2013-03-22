dojo.provide("dojox.mobile.app.ImageThumbView");
dojo.experimental("dojox.mobile.app.ImageThumbView");

dojo.require("dijit._WidgetBase");
dojo.require("dojo.string");

dojo.declare("dojox.mobile.app.ImageThumbView", dijit._WidgetBase, {
	// summary:
	//		An image thumbnail gallery

	// items: Array
	//		The data items from which the image urls are retrieved.
	//		If an item is a string, it is expected to be a URL. Otherwise
	//		by default it is expected to have a 'url' member.  This can
	//		be configured using the 'urlParam' attribute on this widget.
	items: [],

	// urlParam: String
	//		The paramter name used to retrieve an image url from a JSON object
	urlParam: "url",

	labelParam: null,

	itemTemplate: '<div class="mblThumbInner">' +
				'<div class="mblThumbOverlay"></div>' +
				'<div class="mblThumbMask">' +
					'<div class="mblThumbSrc" style="background-image:url(${url})"></div>' +
				'</div>' +
			'</div>',

	minPadding: 4,

	maxPerRow: 3,

	maxRows: -1,

	baseClass: "mblImageThumbView",

	thumbSize: "medium",

	animationEnabled: true,

	selectedIndex: -1,

	cache: null,

	cacheMustMatch: false,

	clickEvent: "onclick",

	cacheBust: false,

	disableHide: false,

	constructor: function(params, node){
	},

	postCreate: function(){

		this.inherited(arguments);
		var _this = this;

		var hoverCls = "mblThumbHover";

		this.addThumb = dojo.hitch(this, this.addThumb);
		this.handleImgLoad = dojo.hitch(this, this.handleImgLoad);
		this.hideCached = dojo.hitch(this, this.hideCached);

		this._onLoadImages = {};

		this.cache = [];
		this.visibleImages = [];

		this._cacheCounter = 0;

		this.connect(this.domNode, this.clickEvent, function(event){
			var itemNode = _this._getItemNodeFromEvent(event);

			if(itemNode && !itemNode._cached){
				_this.onSelect(itemNode._item, itemNode._index, _this.items);
				dojo.query(".selected", this.domNode).removeClass("selected");
				dojo.addClass(itemNode, "selected");
			}
		});

		dojo.addClass(this.domNode, this.thumbSize);

		this.resize();
		this.render();
	},

	onSelect: function(item, index, items){
		// summary:
		//		Dummy function that is triggered when an image is selected.
	},

	_setAnimationEnabledAttr: function(value){
		this.animationEnabled = value;
		dojo[value ? "addClass" : "removeClass"](this.domNode, "animated");
	},

	_setItemsAttr: function(items){
		this.items = items || [];

		var urls = {};
		var i;
		for(i = 0; i < this.items.length; i++){
			urls[this.items[i][this.urlParam]] = 1;
		}

		var clearedUrls = [];
		for(var url in this._onLoadImages){
			if(!urls[url] && this._onLoadImages[url]._conn){
				dojo.disconnect(this._onLoadImages[url]._conn);
				this._onLoadImages[url].src = null;
				clearedUrls.push(url);
			}
		}

		for(i = 0; i < clearedUrls.length; i++){
			delete this._onLoadImages[url];
		}

		this.render();
	},

	_getItemNode: function(node){
		while(node && !dojo.hasClass(node, "mblThumb") && node != this.domNode){
			node = node.parentNode;
		}

		return (node == this.domNode) ? null : node;
	},

	_getItemNodeFromEvent: function(event){
		if(event.touches && event.touches.length > 0){
			event = event.touches[0];
		}
		return this._getItemNode(event.target);
	},

	resize: function(){
		this._thumbSize = null;

		this._size = dojo.contentBox(this.domNode);

		this.disableHide = true;
		this.render();
		this.disableHide = false;
	},

	hideCached: function(){
		// summary:
		//		Hides all cached nodes, so that they're no invisible and overlaying
		//		other screen elements.
		for(var i = 0; i < this.cache.length; i++){
			if (this.cache[i]) {
				dojo.style(this.cache[i], "display", "none");
			}
		}
	},

	render: function(){
		var i;
		var url;
		var item;

		var thumb;
		while(this.visibleImages && this.visibleImages.length > 0){
			thumb = this.visibleImages.pop();
			this.cache.push(thumb);

			if (!this.disableHide) {
				dojo.addClass(thumb, "hidden");
			}
			thumb._cached = true;
		}

		if(this.cache && this.cache.length > 0){
			setTimeout(this.hideCached, 1000);
		}

		if(!this.items || this.items.length == 0){
			return;
		}

		for(i = 0; i < this.items.length; i++){
			item = this.items[i];
			url = (dojo.isString(item) ? item : item[this.urlParam]);

			this.addThumb(item, url, i);

			if(this.maxRows > 0 && (i + 1) / this.maxPerRow >= this.maxRows){
				break;
			}
		}

		if(!this._thumbSize){
			return;
		}

		var column = 0;
		var row = -1;

		var totalThumbWidth = this._thumbSize.w + (this.padding * 2);
		var totalThumbHeight = this._thumbSize.h + (this.padding * 2);

		var nodes = this.thumbNodes =
			dojo.query(".mblThumb", this.domNode);

		var pos = 0;
		nodes = this.visibleImages;
		for(i = 0; i < nodes.length; i++){
			if(nodes[i]._cached){
				continue;
			}

			if(pos % this.maxPerRow == 0){
				row ++;
			}
			column = pos % this.maxPerRow;

			this.place(
				nodes[i],
				(column * totalThumbWidth) + this.padding,	// x position
				(row * totalThumbHeight) + this.padding		// y position
			);

			if(!nodes[i]._loading){
				dojo.removeClass(nodes[i], "hidden");
			}

			if(pos == this.selectedIndex){
				dojo[pos == this.selectedIndex ? "addClass" : "removeClass"]
					(nodes[i], "selected");
			}
			pos++;
		}

		var numRows = Math.ceil(pos / this.maxPerRow);

		this._numRows = numRows;

		this.setContainerHeight((numRows * (this._thumbSize.h + this.padding * 2)));
	},

	setContainerHeight: function(amount){
		dojo.style(this.domNode, "height", amount + "px");
	},

	addThumb: function(item, url, index){

		var thumbDiv;
		var cacheHit = false;
		if(this.cache.length > 0){
			// Reuse a previously created node if possible
			var found = false;
			// Search for an image with the same url first
			for(var i = 0; i < this.cache.length; i++){
				if(this.cache[i]._url == url){
					thumbDiv = this.cache.splice(i, 1)[0];
					found = true;
					break
				}
			}

			// if no image with the same url is found, just take the last one
			if(!thumbDiv && !this.cacheMustMatch){
            	thumbDiv = this.cache.pop();
				dojo.removeClass(thumbDiv, "selected");
			} else {
				cacheHit = true;
			}
		}

		if(!thumbDiv){

			// Create a new thumb
			thumbDiv = dojo.create("div", {
				"class": "mblThumb hidden",
				innerHTML: dojo.string.substitute(this.itemTemplate, {
					url: url
				}, null, this)
			}, this.domNode);
		}

		if(this.labelParam) {
			var labelNode = dojo.query(".mblThumbLabel", thumbDiv)[0];
			if(!labelNode) {
				labelNode = dojo.create("div", {
					"class": "mblThumbLabel"
				}, thumbDiv);
			}
			labelNode.innerHTML = item[this.labelParam] || "";
		}

	    dojo.style(thumbDiv, "display", "");
		if (!this.disableHide) {
			dojo.addClass(thumbDiv, "hidden");
		}

		if (!cacheHit) {
			var loader = dojo.create("img", {});
			loader._thumbDiv = thumbDiv;
			loader._conn = dojo.connect(loader, "onload", this.handleImgLoad);
			loader._url = url;
			thumbDiv._loading = true;

			this._onLoadImages[url] = loader;
			if (loader) {
				loader.src = url;
			}
		}
		this.visibleImages.push(thumbDiv);

		thumbDiv._index = index;
		thumbDiv._item = item;
		thumbDiv._url = url;
		thumbDiv._cached = false;

		if(!this._thumbSize){
			this._thumbSize = dojo.marginBox(thumbDiv);

			if(this._thumbSize.h == 0){
				this._thumbSize.h = 100;
				this._thumbSize.w = 100;
			}

			if(this.labelParam){
				this._thumbSize.h += 8;
			}

			this.calcPadding();
		}
	},

	handleImgLoad: function(event){
		var img = event.target;
		dojo.disconnect(img._conn);
		dojo.removeClass(img._thumbDiv, "hidden");
		img._thumbDiv._loading = false;
		img._conn = null;

		var url = img._url;
		if(this.cacheBust){
			url += (url.indexOf("?") > -1 ? "&" : "?")
				+ "cacheBust=" + (new Date()).getTime() + "_" + (this._cacheCounter++);
		}

		dojo.query(".mblThumbSrc", img._thumbDiv)
				.style("backgroundImage", "url(" + url + ")");

		delete this._onLoadImages[img._url];
	},

	calcPadding: function(){
		var width = this._size.w;

		var thumbWidth = this._thumbSize.w;

		var imgBounds = thumbWidth + this.minPadding;

		this.maxPerRow = Math.floor(width / imgBounds);

		this.padding = Math.floor((width - (thumbWidth * this.maxPerRow)) / (this.maxPerRow * 2));
	},

	place: function(node, x, y){
		dojo.style(node, {
			"-webkit-transform" :"translate(" + x + "px," + y + "px)"
		});
	},

	destroy: function(){
		// Stop the loading of any more images

		var img;
		var counter = 0;
		for (var url in this._onLoadImages){
			img = this._onLoadImages[url];
			if (img) {
				img.src = null;
				counter++;
			}
		}

		this.inherited(arguments);
	}
});