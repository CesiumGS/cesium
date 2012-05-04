define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./PageIndicator",
	"./SwapView",
	"require"
], function(kernel, array, connect, declare, event, lang, has, domClass, domConstruct, domStyle, Contained, Container, WidgetBase, PageIndicator, SwapView, require){

/*=====
	var Contained = dijit._Contained;
	var Container = dijit._Container;
	var WidgetBase = dijit._WidgetBase;
	var PageIndicator = dojox.mobile.PageIndicator;
	var SwapView = dojox.mobile.SwapView;
=====*/

	// module:
	//		dojox/mobile/Carousel
	// summary:
	//		A carousel widget that manages a list of images

	kernel.experimental("dojox.mobile.Carousel");

	return declare("dojox.mobile.Carousel", [WidgetBase, Container, Contained], {
		// summary:
		//		A carousel widget that manages a list of images
		// description:
		//		The carousel widget manages a list of images that can be
		//		displayed horizontally, and allows the user to scroll through
		//		the list and select a single item.

		// numVisible: Number
		//		The number of visible items.
		numVisible: 3,

		// title: String
		//		A title of the carousel to be displayed on the title bar.
		title: "",

		// pageIndicator: Boolean
		//		If true, a page indicator, a series of small dots that indicate
		//		the current page, is displayed on the title bar.
		pageIndicator: true,

		// navButton: Boolean
		//		If true, navigation buttons are displyaed on the title bar.
		navButton: false,

		// height: String
		//		Explicitly specified height of the widget (ex. "300px"). If
		//		"inherit" is specified, the height is inherited from its offset
		//		parent.
		height: "300px",

		// store: Object
		//		Reference to data provider object used by this widget.
		store: null,

		// query: Object
		//		A query that can be passed to 'store' to initially filter the
		//		items.
		query: null,

		// queryOptions: Object
		//		An optional parameter for the query.
		queryOptions: null,

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.className = "mblCarousel";
			var h;
			if(this.height === "inherit"){
				if(this.domNode.offsetParent){
					h = this.domNode.offsetParent.offsetHeight + "px";
				}
			}else if(this.height){
				h = this.height;
			}
			this.domNode.style.height = h;
			this.headerNode = domConstruct.create("DIV", {className:"mblCarouselHeaderBar"}, this.domNode);

			if(this.navButton){
				this.btnContainerNode = domConstruct.create("DIV", {
					className: "mblCarouselBtnContainer"
				}, this.headerNode);
				domStyle.set(this.btnContainerNode, "float", "right"); // workaround for webkit rendering problem
				this.prevBtnNode = domConstruct.create("BUTTON", {
					className: "mblCarouselBtn",
					title: "Previous",
					innerHTML: "&lt;"
				}, this.btnContainerNode);
				this.nextBtnNode = domConstruct.create("BUTTON", {
					className: "mblCarouselBtn",
					title: "Next",
					innerHTML: "&gt;"
				}, this.btnContainerNode);
				this.connect(this.prevBtnNode, "onclick", "onPrevBtnClick");
				this.connect(this.nextBtnNode, "onclick", "onNextBtnClick");
			}

			if(this.pageIndicator){
				if(!this.title){
					this.title = "&nbsp;";
				}
				this.piw = new PageIndicator();
				domStyle.set(this.piw, "float", "right"); // workaround for webkit rendering problem
				this.headerNode.appendChild(this.piw.domNode);
			}

			this.titleNode = domConstruct.create("DIV", {
				className: "mblCarouselTitle"
			}, this.headerNode);

			this.containerNode = domConstruct.create("DIV", {className:"mblCarouselPages"}, this.domNode);
			connect.subscribe("/dojox/mobile/viewChanged", this, "handleViewChanged");
		},

		startup: function(){
			if(this._started){ return; }
			if(this.store){
				var store = this.store;
				this.store = null;
				this.setStore(store, this.query, this.queryOptions);
			}
			this.inherited(arguments);
		},

		setStore: function(store, query, queryOptions){
			// summary:
			//		Sets the store to use with this widget.
			if(store === this.store){ return; }
			this.store = store;
			this.query = query;
			this.queryOptions = queryOptions;
			this.refresh();
		},

		refresh: function(){
			if(!this.store){ return; }
			this.store.fetch({
				query: this.query,
				queryOptions: this.queryOptions,
				onComplete: lang.hitch(this, "generate"),
				onError: lang.hitch(this, "onError")
			});
		},

		generate: function(/*Array*/items, /*Object*/ dataObject){
			array.forEach(this.getChildren(), function(child){
				if(child instanceof SwapView){
					child.destroyRecursive();
				}
			});
			this.items = items;
			this.swapViews = [];
			this.images = [];
			var nPages = Math.ceil(items.length / this.numVisible);
			var h = this.domNode.offsetHeight - this.headerNode.offsetHeight;
			for(var i = 0; i < nPages; i++){
				var w = new SwapView({height:h+"px"});
				this.addChild(w);
				this.swapViews.push(w);
				w._carouselImages = [];
				if(i === 0 && this.piw){
					this.piw.refId = w.id;
				}
				for(var j = 0; j < this.numVisible; j++){
					var idx = i * this.numVisible + j;
					var item = idx < items.length ? items[idx] :
						{src:require.toUrl("dojo/resources/blank.gif"), height:"1px"};
					var disp = w.domNode.style.display;
					w.domNode.style.display = ""; // need to be visible during the size calculation
					var box = this.createBox(item, h);
					w.containerNode.appendChild(box);
					box.appendChild(this.createHeaderText(item));
					var img = this.createContent(item, idx);
					box.appendChild(img);
					box.appendChild(this.createFooterText(item));
					this.resizeContent(item, box, img);
					w.domNode.style.display = disp;

					if(item.height !== "1px"){
						this.images.push(img);
						w._carouselImages.push(img);
					}
				}
			}
			if(this.swapViews[0]){
				this.loadImages(this.swapViews[0]);
			}
			if(this.swapViews[1]){
				this.loadImages(this.swapViews[1]); // pre-fetch the next view images
			}
			this.currentView = this.swapViews[0];
			if(this.piw){
				this.piw.reset();
			}
		},

		createBox: function(item, h){
			var width = item.width || (90/this.numVisible + "%");
			var height = item.height || h + "px";
			var m = has("ie") ? 5/this.numVisible-1 : 5/this.numVisible;
			var margin = item.margin || (m + "%");
			var box = domConstruct.create("DIV", {
				className: "mblCarouselBox"
			});
			domStyle.set(box, {
				margin: "0px " + margin,
				width: width,
				height: height
			});
			return box;
		},

		createHeaderText: function(item){
			this.headerTextNode = domConstruct.create("DIV", {
				className: "mblCarouselImgHeaderText",
				innerHTML: item.headerText ? item.headerText : "&nbsp;"
			});
			return this.headerTextNode;
		},

		createContent: function(item, idx){
			var props = {
				alt: item.alt || "",
				tabIndex: "0", // for keyboard navigation on a desktop browser
				className: "mblCarouselImg"
			};
			var img = domConstruct.create("IMG", props);
			img._idx = idx;
			if(item.height !== "1px"){
				this.connect(img, "onclick", "onClick");
				this.connect(img, "onkeydown", "onClick");
				connect.connect(img, "ondragstart", event.stop);
			}else{
				img.style.visibility = "hidden";
			}
			return img;
		},

		createFooterText: function(item){
			this.footerTextNode = domConstruct.create("DIV", {
				className: "mblCarouselImgFooterText",
				innerHTML: item.footerText ? item.footerText : "&nbsp;"
			});
			return this.footerTextNode;
		},

		resizeContent: function(item, box, img){
			if(item.height !== "1px"){
				img.style.height = (box.offsetHeight  - this.headerTextNode.offsetHeight - this.footerTextNode.offsetHeight) + "px";
			}
		},

		onError: function(errText){
		},

		onPrevBtnClick: function(e){
			if(this.currentView){
				this.currentView.goTo(-1);
			}
		},

		onNextBtnClick: function(e){
			if(this.currentView){
				this.currentView.goTo(1);
			}
		},

		onClick: function(e){
			if(e && e.type === "keydown" && e.keyCode !== 13){ return; }
			var img = e.currentTarget;
			for(var i = 0; i < this.images.length; i++){
				if(this.images[i] === img){
					domClass.add(img, "mblCarouselImgSelected");
				}else{
					domClass.remove(this.images[i], "mblCarouselImgSelected");
				}
			}
			domStyle.set(img, "opacity", 0.4);
			setTimeout(function(){
				domStyle.set(img, "opacity", 1);
			}, 1000);
			connect.publish("/dojox/mobile/carouselSelect", [this, img, this.items[img._idx], img._idx]);
		},

		loadImages: function(view){
			if(!view){ return; }
			var imgs = view._carouselImages;
			array.forEach(imgs, function(img){
				if(!img.src){
					var item = this.items[img._idx];
					img.src = item.src;
				}
			}, this);
		},

		handleViewChanged: function(view){
			if(view.getParent() !== this){ return; }
			this.currentView = view;
			// lazy-load images in the next view
			this.loadImages(view.nextView(view.domNode));
		},

		_setTitleAttr: function(/*String*/title){
			this.title = title;
			this.titleNode.innerHTML = this._cv ? this._cv(title) : title;
		}
	});
});
