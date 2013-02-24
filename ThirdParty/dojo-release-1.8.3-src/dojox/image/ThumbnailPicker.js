dojo.provide("dojox.image.ThumbnailPicker");
dojo.experimental("dojox.image.ThumbnailPicker");
//
// dojox.image.ThumbnailPicker courtesy Shane O Sullivan, licensed under a Dojo CLA
//
// For a sample usage, see http://www.skynet.ie/~sos/photos.php
//
//	document topics.

dojo.require("dojox.fx.scroll"); // is optional, but don't want to dojo[require] it
dojo.require("dojo.fx.easing");

dojo.require("dojo.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

// FIXME: use CSS for size, thumbHeight, and thumbWidth

dojo.declare("dojox.image.ThumbnailPicker",
	[dijit._Widget, dijit._Templated],
	{
	// summary:
	//		A scrolling Thumbnail Picker widget

	// imageStore: Object
	//		A data store that implements the dojo.data Read API.
	imageStore: null,

	// request: Object
	//		A dojo.data Read API Request object.
	request: null,

	// size: Number
	//		Width or height in pixels, depending if horizontal or vertical.
	size: 500, 

	// thumbHeight: Number
	//		Default height of a thumbnail image
	thumbHeight: 75, 

	// thumbWidth: Number
	//		Default width of an image
	thumbWidth: 100, 

	// useLoadNotifier: Boolean
	//		Setting useLoadNotifier to true makes a colored DIV appear under each
	//		thumbnail image, which is used to display the loading status of each
	//		image in the data store.
	useLoadNotifier: false,

	// useHyperlink: boolean
	//		Setting useHyperlink to true causes a click on a thumbnail to open a link.
	useHyperlink: false,

	// hyperlinkTarget: String
	//		If hyperlinkTarget is set to "new", clicking on a thumb will open a new window
	//		If it is set to anything else, clicking a thumbnail will open the url in the
	//		current window.
	hyperlinkTarget: "new",

	// isClickable: Boolean
	//		When set to true, the cursor over a thumbnail changes.
	isClickable: true,

	// isScrollable: Boolean
	//		When true, uses smoothScroll to move between pages
	isScrollable: true,

	// isHorizontal: Boolean
	//		If true, the thumbnails are displayed horizontally. Otherwise they are displayed
	//		vertically
	isHorizontal: true,

	// autoLoad: Boolean
	autoLoad: true,

	// linkAttr: String
	//		The attribute name for accessing the url from the data store
	linkAttr: "link",
	
	// imageThumbAttr: String
	//		The attribute name for accessing the thumbnail image url from the data store
	imageThumbAttr: "imageUrlThumb",
	
	// imageLargeAttr: String
	//		The attribute name for accessing the large image url from the data store
	imageLargeAttr: "imageUrl",
	
	// pageSize: Number
	//		The number of images to request each time.
	pageSize: 20,
	
	// titleAttr: String
	//		The attribute name for accessing the title from the data store
	titleAttr: "title",
	
	templateString: dojo.cache("dojox.image", "resources/ThumbnailPicker.html"),
	
	// thumbs: Array
	//		Stores the image nodes for the thumbnails.
	_thumbs: [],
	
	// _thumbIndex: Number
	//		The index of the first thumbnail shown
	_thumbIndex: 0,
	
	// _maxPhotos: Number
	//		The total number of photos in the image store
	_maxPhotos: 0,
	
	// _loadedImages: Object
	//		Stores the indices of images that have been marked as loaded using the
	//		markImageLoaded function.
	_loadedImages: {},

	baseClass: "ThumbnailPicker",

	cellClass: "Thumbnail",

	postCreate: function(){
		// summary:
		//		Initializes styles and listeners

		this.inherited(arguments);
		
		this.pageSize = Number(this.pageSize);

		this._scrollerSize = this.size - (51 * 2);
		
		var sizeProp = this._sizeProperty = this.isHorizontal ? "width" : "height";
	
		// FIXME: do this via css? calculate the correct width for the widget
		dojo.style(this.outerNode, "textAlign","center");
		dojo.style(this.outerNode, sizeProp, this.size+"px");
	
		dojo.style(this.thumbScroller, sizeProp, this._scrollerSize + "px");
	
		//If useHyperlink is true, then listen for a click on a thumbnail, and
		//open the link
		if(this.useHyperlink){
			dojo.subscribe(this.getClickTopicName(), this, function(packet){
				var index = packet.index;
				var url = this.imageStore.getValue(packet.data,this.linkAttr);
				
				//If the data item doesn't contain a URL, do nothing
				if(!url){return;}
				
				if(this.hyperlinkTarget == "new"){
					window.open(url);
				}else{
					window.location = url;
				}
			});
		}
	
		if(this.isClickable){
			dojo.addClass(this.thumbsNode, "thumbClickable");
		}
		this._totalSize = 0;
		this.init();
	},

	init: function(){
		// summary:
		//		Creates DOM nodes for thumbnail images and initializes their listeners
		if(this.isInitialized) {return false;}
	
		var classExt = this.isHorizontal ? "Horiz" : "Vert";
	
		// FIXME: can we setup a listener around the whole element and determine based on e.target?
		dojo.addClass(this.navPrev, "prev" + classExt);
		dojo.addClass(this.navNext, "next" + classExt);
		dojo.addClass(this.thumbsNode, "thumb"+classExt);
		dojo.addClass(this.outerNode, "thumb"+classExt);
	
		dojo.attr(this.navNextImg, "src", this._blankGif);
		dojo.attr(this.navPrevImg, "src", this._blankGif);
		
		this.connect(this.navPrev, "onclick", "_prev");
		this.connect(this.navNext, "onclick", "_next");
		this.isInitialized = true;
		
		if(this.isHorizontal){
			this._offsetAttr = "offsetLeft";
			this._sizeAttr = "offsetWidth";
			this._scrollAttr = "scrollLeft";
		}else{
			this._offsetAttr = "offsetTop";
			this._sizeAttr = "offsetHeight";
			this._scrollAttr = "scrollTop";
		}
	
		this._updateNavControls();
		if(this.imageStore && this.request){this._loadNextPage();}
		return true;
	},

	getClickTopicName: function(){
		// summary:
		//		Returns the name of the dojo topic that can be
		//		subscribed to in order to receive notifications on
		//		which thumbnail was selected.
		return this.id + "/select"; // String
	},

	getShowTopicName: function(){
		// summary:
		//		Returns the name of the dojo topic that can be
		//		subscribed to in order to receive notifications on
		//		which thumbnail is now visible
		return this.id + "/show"; // String
	},

	setDataStore: function(dataStore, request, /*optional*/paramNames){
		// summary:
		//		Sets the data store and request objects to read data from.
		// dataStore:
		//		An implementation of the dojo/data/api/Read API. This accesses the image
		//		data.
		// request:
		//		An implementation of the dojo/data/api/Request API. This specifies the
		//		query and paging information to be used by the data store
		// paramNames:
		//		An object defining the names of the item attributes to fetch from the
		//		data store.  The four attributes allowed are 'linkAttr', 'imageLargeAttr',
		//		'imageThumbAttr' and 'titleAttr'
		this.reset();
	
		this.request = {
			query: {},
			start: request.start || 0,
			count: request.count || 10,
			onBegin: dojo.hitch(this, function(total){
				this._maxPhotos = total;
			})
		};
	
		if(request.query){ dojo.mixin(this.request.query, request.query);}
	
		if(paramNames){
			dojo.forEach(["imageThumbAttr", "imageLargeAttr", "linkAttr", "titleAttr"], function(attrName){
				if(paramNames[attrName]){ this[attrName] = paramNames[attrName]; }
			}, this);
		}
		
		this.request.start = 0;
		this.request.count = this.pageSize;
		this.imageStore = dataStore;
		this._loadInProgress = false;
		if(!this.init()){this._loadNextPage();}
	},

	reset: function(){
		// summary:
		//		Resets the widget back to its original state.
		this._loadedImages = {};
		dojo.forEach(this._thumbs, function(img){
			if(img && img.parentNode){
				dojo.destroy(img);
			}
		});
	
		this._thumbs = [];
		this.isInitialized = false;
		this._noImages = true;
	},
	
	isVisible: function(index) {
		// summary:
		//		Returns true if the image at the specified index is currently visible. False otherwise.
		var img = this._thumbs[index];
		if(!img){return false;}
		var pos = this.isHorizontal ? "offsetLeft" : "offsetTop";
		var size = this.isHorizontal ? "offsetWidth" : "offsetHeight";
		var scrollAttr = this.isHorizontal ? "scrollLeft" : "scrollTop";
		var offset = img[pos] - this.thumbsNode[pos];
		return (offset >= this.thumbScroller[scrollAttr]
			&& offset + img[size] <= this.thumbScroller[scrollAttr] + this._scrollerSize);
	},
	
	resize: function(dim){
		var sizeParam = this.isHorizontal ? "w": "h";

		var total = 0;

		if(this._thumbs.length > 0 && dojo.marginBox(this._thumbs[0]).w == 0){
			// Skip the resize if the widget is not visible
			return;
		}

		// Calculate the complete size of the thumbnails
		dojo.forEach(this._thumbs, dojo.hitch(this, function(imgContainer){
			var mb = dojo.marginBox(imgContainer.firstChild);
			var size = mb[sizeParam];
			total += (Number(size) + 10);
			
			if(this.useLoadNotifier && mb.w > 0){
				dojo.style(imgContainer.lastChild, "width", (mb.w - 4) + "px");
			}
			dojo.style(imgContainer, "width", mb.w + "px");
		}));

		dojo.style(this.thumbsNode, this._sizeProperty, total + "px");
		this._updateNavControls();
	},
	
	_next: function() {
		// summary:
		//		Displays the next page of images
		var pos = this.isHorizontal ? "offsetLeft" : "offsetTop";
		var size = this.isHorizontal ? "offsetWidth" : "offsetHeight";
		var baseOffset = this.thumbsNode[pos];
		var firstThumb = this._thumbs[this._thumbIndex];
		var origOffset = firstThumb[pos] - baseOffset;
	
		var index = -1, img;
	
		for(var i = this._thumbIndex + 1; i < this._thumbs.length; i++){
			img = this._thumbs[i];
			if(img[pos] - baseOffset + img[size] - origOffset > this._scrollerSize){
				this._showThumbs(i);
				return;
			}
		}
	},

	_prev: function(){
		// summary:
		//		Displays the next page of images
		if(this.thumbScroller[this.isHorizontal ? "scrollLeft" : "scrollTop"] == 0){return;}
		var pos = this.isHorizontal ? "offsetLeft" : "offsetTop";
		var size = this.isHorizontal ? "offsetWidth" : "offsetHeight";
	
		var firstThumb = this._thumbs[this._thumbIndex];
		var origOffset = firstThumb[pos] - this.thumbsNode[pos];
	
		var index = -1, img;
	
		for(var i = this._thumbIndex - 1; i > -1; i--) {
			img = this._thumbs[i];
			if(origOffset - img[pos] > this._scrollerSize){
				this._showThumbs(i + 1);
				return;
			}
		}
		this._showThumbs(0);
	},

	_checkLoad: function(img, index){
		// summary:
		//		Checks if an image is loaded.
		dojo.publish(this.getShowTopicName(), [{index:index}]);
		this._updateNavControls();
		this._loadingImages = {};
	
		this._thumbIndex = index;
	
		//If we have not already requested the data from the store, do so.
		if(this.thumbsNode.offsetWidth - img.offsetLeft < (this._scrollerSize * 2)){
			this._loadNextPage();
		}
	},

	_showThumbs: function(index){
		// summary:
		//		Displays thumbnail images, starting at position 'index'
		// index: Number
		//		The index of the first thumbnail

//FIXME: When is this be called with an invalid index?  Do we need this check at all?
//		if(typeof index != "number"){ index = this._thumbIndex; }
		index = Math.min(Math.max(index, 0), this._maxPhotos);
		
		if(index >= this._maxPhotos){ return; }
		
		var img = this._thumbs[index];
		if(!img){ return; }
		
		var left = img.offsetLeft - this.thumbsNode.offsetLeft;
		var top = img.offsetTop - this.thumbsNode.offsetTop;
		var offset = this.isHorizontal ? left : top;
				
		if(	(offset >= this.thumbScroller[this._scrollAttr]) &&
			(offset + img[this._sizeAttr] <= this.thumbScroller[this._scrollAttr] + this._scrollerSize)
		){
			// FIXME: WTF is this checking for?
			return;
		}
		
		
		if(this.isScrollable){
			var target = this.isHorizontal ? {x: left, y: 0} : { x:0, y:top};
			dojox.fx.smoothScroll({
				target: target,
				win: this.thumbScroller,
				duration:300,
				easing:dojo.fx.easing.easeOut,
				onEnd: dojo.hitch(this, "_checkLoad", img, index)
			}).play(10);
		}else{
			if(this.isHorizontal){
				this.thumbScroller.scrollLeft = left;
			}else{
				this.thumbScroller.scrollTop = top;
			}
			this._checkLoad(img, index);
		}
	},
	
	markImageLoaded: function(index){
		// summary:
		//		Changes a visual cue to show the image is loaded
		// description:
		//		If 'useLoadNotifier' is set to true, then a visual cue is
		//		given to state whether the image is loaded or not.	Calling this function
		//		marks an image as loaded.
		var thumbNotifier = dojo.byId("loadingDiv_"+this.id+"_"+index);
		if(thumbNotifier){this._setThumbClass(thumbNotifier, "thumbLoaded");}
		this._loadedImages[index] = true;
	},

	_setThumbClass: function(thumb, className){
		// summary:
		//		Adds a CSS class to a thumbnail, only if 'autoLoad' is true
		// thumb: DomNode
		//		The thumbnail DOM node to set the class on
		// className: String
		//		The CSS class to add to the DOM node.
		if(!this.autoLoad){ return; }
		dojo.addClass(thumb, className);
	},
                                                 
	_loadNextPage: function(){
		// summary:
		//		Loads the next page of thumbnail images
		if(this._loadInProgress){return;}
		this._loadInProgress = true;
		var start = this.request.start + (this._noImages ? 0 : this.pageSize);
		
		var pos = start;
		while(pos < this._thumbs.length && this._thumbs[pos]){pos ++;}
		
		var store = this.imageStore;
		
		//Define the function to call when the items have been
		//returned from the data store.
		var complete = function(items, request){
			if(store != this.imageStore){
				// If the store has been changed, ignore this callback.
				return;
			}
			if(items && items.length){
				var itemCounter = 0;
				var loadNext = dojo.hitch(this, function(){
					if(itemCounter >= items.length){
						this._loadInProgress = false;
						return;
					}
					var counter = itemCounter++;

					this._loadImage(items[counter], pos + counter, loadNext);
				});
				loadNext();

				//Show or hide the navigation arrows on the thumbnails,
				//depending on whether or not the widget is at the start,
				//end, or middle of the list of images.
				this._updateNavControls();
			}else{
				this._loadInProgress = false;
			}
		};
	
		//Define the function to call if the store reports an error.
		var error = function(){
			this._loadInProgress = false;
			console.log("Error getting items");
		};

		this.request.onComplete = dojo.hitch(this, complete);
		this.request.onError = dojo.hitch(this, error);
	
		//Increment the start parameter. This is the dojo.data API's
		//version of paging.
		this.request.start = start;
		this._noImages = false;
		
		//Execute the request for data.
		this.imageStore.fetch(this.request);
	},

	_loadImage: function(data, index, callback){
		// summary:
		//		Loads an image.

		var store = this.imageStore;
		var url = store.getValue(data,this.imageThumbAttr);
		
		var imgContainer = dojo.create("div", {
			id: "img_" + this.id + "_" + index,
			"class": this.cellClass
		});
		
		var img = dojo.create("img", {}, imgContainer);
		img._index = index;
		img._data = data;
	
		this._thumbs[index] = imgContainer;
		var loadingDiv;
		if(this.useLoadNotifier){
			loadingDiv = dojo.create("div", {
				id: "loadingDiv_" + this.id+"_" + index
			}, imgContainer);
	
			//If this widget was previously told that the main image for this
			//thumb has been loaded, make the loading indicator transparent.
			this._setThumbClass(loadingDiv,
				this._loadedImages[index] ? "thumbLoaded":"thumbNotifier");
		}
		var size = dojo.marginBox(this.thumbsNode);
		var defaultSize;
		var sizeParam;
		if(this.isHorizontal){
			defaultSize = this.thumbWidth;
			sizeParam = 'w';
		} else{
			defaultSize = this.thumbHeight;
			sizeParam = 'h';
		}
		size = size[sizeParam];
		var sl = this.thumbScroller.scrollLeft, st = this.thumbScroller.scrollTop;

		dojo.style(this.thumbsNode, this._sizeProperty, (size + defaultSize + 20) + "px");

		//Remember the scroll values, as changing the size can alter them
		this.thumbScroller.scrollLeft = sl;
		this.thumbScroller.scrollTop = st;
		this.thumbsNode.appendChild(imgContainer);
	
		dojo.connect(img, "onload", this, dojo.hitch(this, function(){
			if(store != this.imageStore){
				// If the store has changed, ignore this load event
				return false;
			}
			this.resize();
						
			// Have to use a timeout here to prevent a call stack that gets
			// so deep that IE throws stack overflow errors
			setTimeout(callback, 0);
			return false;
		}));
	
		dojo.connect(img, "onclick", this, function(evt){
			dojo.publish(this.getClickTopicName(),	[{
				index: evt.target._index,
				data: evt.target._data,
				url: img.getAttribute("src"),
				largeUrl: this.imageStore.getValue(data,this.imageLargeAttr),
				title: this.imageStore.getValue(data,this.titleAttr),
				link: this.imageStore.getValue(data,this.linkAttr)
			}]);
			//
			dojo.query("." + this.cellClass, this.thumbsNode).removeClass(this.cellClass + "Selected");
			dojo.addClass(evt.target.parentNode, this.cellClass + "Selected");
			return false;
		});
		dojo.addClass(img, "imageGalleryThumb");
		img.setAttribute("src", url);
		var title = this.imageStore.getValue(data, this.titleAttr);
		if(title){ img.setAttribute("title",title); }
		this._updateNavControls();
	
	},

	_updateNavControls: function(){
		// summary:
		//		Updates the navigation controls to hide/show them when at
		//		the first or last images.
		var change = function(node, add){
			var fn = add ? "addClass" : "removeClass";
			dojo[fn](node,"enabled");
			dojo[fn](node,"thumbClickable");
		};
		
		var pos = this.isHorizontal ? "scrollLeft" : "scrollTop";
		var size = this.isHorizontal ? "offsetWidth" : "offsetHeight";
		change(this.navPrev, (this.thumbScroller[pos] > 0));
		
		var addClass = (this.thumbScroller[pos] + this._scrollerSize < this.thumbsNode[size]);
		change(this.navNext, addClass);
	}
});
