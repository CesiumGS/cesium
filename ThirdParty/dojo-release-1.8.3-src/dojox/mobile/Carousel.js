define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/sniff",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/registry",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./lazyLoadUtils",
	"./CarouselItem",
	"./PageIndicator",
	"./SwapView",
	"require"
], function(array, connect, declare, event, has, domClass, domConstruct, domStyle, registry, Contained, Container, WidgetBase, lazyLoadUtils, CarouselItem, PageIndicator, SwapView, require){

	// module:
	//		dojox/mobile/Carousel

	return declare("dojox.mobile.Carousel", [WidgetBase, Container, Contained], {
		// summary:
		//		A carousel widget that manages a list of images.
		// description:
		//		The carousel widget manages a list of images that can be
		//		displayed horizontally, and allows the user to scroll through
		//		the list and select a single item.
		//
		//		This widget itself has no data store support, but there are two
		//		subclasses, dojox/mobile/DataCarousel and dojox/mobile/StoreCarousel,
		//		available for generating the contents from a data store.
		//		To feed data into a Carousel through a dojo/data, use DataCarousel.
		//		To feed data into a Carousel through a dojo/store, use StoreCarousel.
		//
		//		The Carousel widget loads and instantiates its item contents in
		//		a lazy manner. For example, if the number of visible items
		//		(see the property numVisible) is 2, the widget creates 4 items, 2 for the
		//		initial pane and 2 for the next page, at startup time. If you
		//		swipe the page to open the second page, the widget creates 2 more
		//		items for the third page. If the item to create is a dojo widget,
		//		its module is dynamically loaded automatically before instantiation.

		// numVisible: Number
		//		The number of visible items.
		numVisible: 2,

		// itemWidth: Number
		//		The number of visible items (=numVisible) is determined by
		//		(carousel_width / itemWidth).
		//		If itemWidth is specified, numVisible is automatically calculated.
		//		If resize() is called, numVisible is recalculated and the layout
		//		is changed accordingly.
		itemWidth: 0,

		// title: String
		//		A title of the carousel to be displayed on the title bar.
		title: "",

		// pageIndicator: Boolean
		//		If true, a page indicator, a series of small dots that indicate
		//		the current page, is displayed on the title bar.
		pageIndicator: true,

		// navButton: Boolean
		//		If true, navigation buttons are displyed on the title bar.
		navButton: false,

		// height: String
		//		Explicitly specified height of the widget (ex. "300px"). If
		//		"inherit" is specified, the height is inherited from its offset
		//		parent.
		height: "",

		// selectable: Boolean
		//		If true, an item can be selected by clicking it.
		selectable: true,

		/* internal properties */	
		
		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblCarousel",

		buildRendering: function(){
			this.containerNode = domConstruct.create("div", {className: "mblCarouselPages"});
			this.inherited(arguments);
			if(this.srcNodeRef){
				// reparent
				for(var i = 0, len = this.srcNodeRef.childNodes.length; i < len; i++){
					this.containerNode.appendChild(this.srcNodeRef.firstChild);
				}
			}

			this.headerNode = domConstruct.create("div", {className: "mblCarouselHeaderBar"}, this.domNode);

			if(this.navButton){
				this.btnContainerNode = domConstruct.create("div", {
					className: "mblCarouselBtnContainer"
				}, this.headerNode);
				domStyle.set(this.btnContainerNode, "float", "right"); // workaround for webkit rendering problem
				this.prevBtnNode = domConstruct.create("button", {
					className: "mblCarouselBtn",
					title: "Previous",
					innerHTML: "&lt;"
				}, this.btnContainerNode);
				this.nextBtnNode = domConstruct.create("button", {
					className: "mblCarouselBtn",
					title: "Next",
					innerHTML: "&gt;"
				}, this.btnContainerNode);
				this._prevHandle = this.connect(this.prevBtnNode, "onclick", "onPrevBtnClick");
				this._nextHandle = this.connect(this.nextBtnNode, "onclick", "onNextBtnClick");
			}

			if(this.pageIndicator){
				if(!this.title){
					this.title = "&nbsp;";
				}
				this.piw = new PageIndicator();
				domStyle.set(this.piw, "float", "right"); // workaround for webkit rendering problem
				this.headerNode.appendChild(this.piw.domNode);
			}

			this.titleNode = domConstruct.create("div", {
				className: "mblCarouselTitle"
			}, this.headerNode);

			this.domNode.appendChild(this.containerNode);
			this.subscribe("/dojox/mobile/viewChanged", "handleViewChanged");
			this._clickHandle = this.connect(this.domNode, "onclick", "_onClick");
			this._keydownHandle = this.connect(this.domNode, "onkeydown", "_onClick");
			this._dragstartHandle = this.connect(this.domNode, "ondragstart", event.stop);
			this.selectedItemIndex = -1;
			this.items = [];
		},

		startup: function(){
			if(this._started){ return; }

			var h;
			if(this.height === "inherit"){
				if(this.domNode.offsetParent){
					h = this.domNode.offsetParent.offsetHeight + "px";
				}
			}else if(this.height){
				h = this.height;
			}
			if(h){
				this.domNode.style.height = h;
			}

			if(this.store){
				if(!this.setStore){
					throw new Error("Use StoreCarousel or DataCarousel instead of Carousel.");
				}
				var store = this.store;
				this.store = null;
				this.setStore(store, this.query, this.queryOptions);
			}else{
				this.resizeItems();
			}
			this.inherited(arguments);

			this.currentView = array.filter(this.getChildren(), function(view){
				return view.isVisible();
			})[0];
		},

		resizeItems: function(){
			// summary:
			//		Resizes the child items of the carousel.
			var idx = 0;
			var h = this.domNode.offsetHeight - (this.headerNode ? this.headerNode.offsetHeight : 0);
			var m = has("ie") ? 5 / this.numVisible-1 : 5 / this.numVisible;
			array.forEach(this.getChildren(), function(view){
				if(!(view instanceof SwapView)){ return; }
				if(!(view.lazy || view.domNode.getAttribute("lazy"))){
					view._instantiated = true;
				}
				var ch = view.containerNode.childNodes;
				for(var i = 0, len = ch.length; i < len; i++){
					var node = ch[i];
					if(node.nodeType !== 1){ continue; }
					var item = this.items[idx] || {};
					domStyle.set(node, {
						width: item.width || (90 / this.numVisible + "%"),
						height: item.height || h + "px",
						margin: "0 " + (item.margin || m + "%")
					});
					domClass.add(node, "mblCarouselSlot");
					idx++;
				}
			}, this);

			if(this.piw){
				this.piw.refId = this.containerNode.firstChild;
				this.piw.reset();
			}
		},

		resize: function(){
			if(!this.itemWidth){ return; }
			var num = Math.floor(this.domNode.offsetWidth / this.itemWidth);
			if(num === this.numVisible){ return; }
			this.selectedItemIndex = this.getIndexByItemWidget(this.selectedItem);
			this.numVisible = num;
			if(this.items.length > 0){
				this.onComplete(this.items);
				this.select(this.selectedItemIndex);
			}
		},

		fillPages: function(){
			array.forEach(this.getChildren(), function(child, i){
				var s = "";
				for(var j = 0; j < this.numVisible; j++){
					var type, props = "", mixins;
					var idx = i * this.numVisible + j;
					var item = {};
					if(idx < this.items.length){
						item = this.items[idx];
						type = this.store.getValue(item, "type");
						if(type){
							props = this.store.getValue(item, "props");
							mixins = this.store.getValue(item, "mixins");
						}else{
							type = "dojox.mobile.CarouselItem";
							array.forEach(["alt", "src", "headerText", "footerText"], function(p){
								var v = this.store.getValue(item, p);
								if(v !== undefined){
									if(props){ props += ','; }
									props += p + ':"' + v + '"';
								}
							}, this);
						}
					}else{
						type = "dojox.mobile.CarouselItem";
						props = 'src:"' + require.toUrl("dojo/resources/blank.gif") + '"' +
							', className:"mblCarouselItemBlank"';
					}

					s += '<div data-dojo-type="' + type + '"';
					if(props){
						s += ' data-dojo-props=\'' + props + '\'';
					}
					if(mixins){
						s += ' data-dojo-mixins=\'' + mixins + '\'';
					}
					s += '></div>';
				}
				child.containerNode.innerHTML = s;
			}, this);
		},

		onComplete: function(/*Array*/items){
			// summary:
			//		A handler that is called after the fetch completes.
			array.forEach(this.getChildren(), function(child){
				if(child instanceof SwapView){
					child.destroyRecursive();
				}
			});
			this.selectedItem = null;
			this.items = items;
			var nPages = Math.ceil(items.length / this.numVisible),
				i, h = this.domNode.offsetHeight - this.headerNode.offsetHeight,
				idx = this.selectedItemIndex === -1 ? 0 : this.selectedItemIndex;
				pg = Math.floor(idx / this.numVisible); // current page
			for(i = 0; i < nPages; i++){
				var w = new SwapView({height: h + "px", lazy:true});
				this.addChild(w);
				if(i === pg){
					w.show();
					this.currentView = w;
				}else{
					w.hide();
				}
			}
			this.fillPages();
			this.resizeItems();
			var children = this.getChildren();
			var from = pg - 1 < 0 ? 0 : pg - 1;
			var to = pg + 1 > nPages - 1 ? nPages - 1 : pg + 1;
			for(i = from; i <= to; i++){
				this.instantiateView(children[i]);
			}
		},

		onError: function(/*String*/ /*===== errText =====*/){
			// summary:
			//		An error handler.
		},

		onUpdate: function(/*Object*/ /*===== item, =====*/ /*Number*/ /*===== insertedInto =====*/){
			// summary:
			//		Adds a new item or updates an existing item.
		},

		onDelete: function(/*Object*/ /*===== item, =====*/ /*Number*/ /*===== removedFrom =====*/){
			// summary:
			//		Deletes an existing item.
		},

		onSet: function(item, attribute, oldValue, newValue){
		},

		onNew: function(newItem, parentInfo){
		},

		onStoreClose: function(request){
			// summary:
			//		Called when the store is closed.
		},

		getParentView: function(/*DomNode*/node){
			// summary:
			//		Returns the parent view of the given DOM node.
			for(var w = registry.getEnclosingWidget(node); w; w = w.getParent()){
				if(w.getParent() instanceof SwapView){ return w; }
			}
			return null;
		},

		getIndexByItemWidget: function(/*Widget*/w){
			// summary:
			//		Returns the index of a given item widget.
			if(!w){ return -1; }
			var view = w.getParent();
			return array.indexOf(this.getChildren(), view) * this.numVisible +
				array.indexOf(view.getChildren(), w);
		},

		getItemWidgetByIndex: function(/*Number*/index){
			// summary:
			//		Returns the index of an item widget at a given index.
			if(index === -1){ return null; }
			var view = this.getChildren()[Math.floor(index / this.numVisible)];
			return view.getChildren()[index % this.numVisible];
		},

		onPrevBtnClick: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		Called when the "previous" button is clicked.
			if(this.currentView){
				this.currentView.goTo(-1);
			}
		},

		onNextBtnClick: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		Called when the "next" button is clicked.
			if(this.currentView){
				this.currentView.goTo(1);
			}
		},

		_onClick: function(e){
			// summary:
			//		Internal handler for click events.
			// tags:
			//		private
			if(this.onClick(e) === false){ return; } // user's click action
			if(e && e.type === "keydown"){ // keyboard navigation for accessibility
				if(e.keyCode === 39){ // right arrow
					this.onNextBtnClick();
				}else if(e.keyCode === 37){ // left arrow
					this.onPrevBtnClick();
				}else if(e.keyCode !== 13){ // !Enter
					return;
				}
			}

			var w;
			for(w = registry.getEnclosingWidget(e.target); ; w = w.getParent()){
				if(!w){ return; }
				if(w.getParent() instanceof SwapView){ break; }
			}
			this.select(w);
			var idx = this.getIndexByItemWidget(w);
			connect.publish("/dojox/mobile/carouselSelect", [this, w, this.items[idx], idx]);
		},

		select: function(/*Widget|Number*/itemWidget){
			// summary:
			//		Selects the given widget.
			if(typeof(itemWidget) === "number"){
				itemWidget = this.getItemWidgetByIndex(itemWidget);
			}
			if(this.selectable){
				if(this.selectedItem){
					this.selectedItem.set("selected", false);
					domClass.remove(this.selectedItem.domNode, "mblCarouselSlotSelected");
				}
				if(itemWidget){
					itemWidget.set("selected", true);
					domClass.add(itemWidget.domNode, "mblCarouselSlotSelected");
				}
				this.selectedItem = itemWidget;
			}
		},

		onClick: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		User-defined function to handle clicks.
			// tags:
			//		callback
		},

		instantiateView: function(view){
			// summary:
			//		Instantiates the given view.
			if(view && !view._instantiated){
				var isHidden = (domStyle.get(view.domNode, "display") === "none");
				if(isHidden){
					domStyle.set(view.domNode, {visibility:"hidden", display:""});
				}
				lazyLoadUtils.instantiateLazyWidgets(view.containerNode, null, function(root){
					if(isHidden){
						domStyle.set(view.domNode, {visibility:"visible", display:"none"});
					}
				});
				view._instantiated = true;
			}
		},

		handleViewChanged: function(view){
			// summary:
			//		Listens to "/dojox/mobile/viewChanged" events.
			if(view.getParent() !== this){ return; }
			if(this.currentView.nextView(this.currentView.domNode) === view){
				this.instantiateView(view.nextView(view.domNode));
			}else{
				this.instantiateView(view.previousView(view.domNode));
			}
			this.currentView = view;
		},

		_setTitleAttr: function(/*String*/title){
			// tags:
			//		private
			this.titleNode.innerHTML = this._cv ? this._cv(title) : title;
			this._set("title", title);
		}
	});
});
