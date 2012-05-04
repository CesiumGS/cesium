dojo.provide("dojox.image.Gallery");
dojo.experimental("dojox.image.Gallery");
//
// dojox.image.Gallery courtesy Shane O Sullivan, licensed under a Dojo CLA
//
// For a sample usage, see http://www.skynet.ie/~sos/photos.php
//
//	TODO: Make public, document params and privitize non-API conformant methods.
//	document topics.

dojo.require("dojo.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.image.ThumbnailPicker");
dojo.require("dojox.image.SlideShow");

dojo.declare("dojox.image.Gallery",
	[dijit._Widget, dijit._Templated],
	{
	// summary:
	//		Gallery widget that wraps a dojox.image.ThumbnailPicker and dojox.image.SlideShow widget
	//
	// imageHeight: Number
	//		Maximum height of an image in the SlideShow widget
	imageHeight: 375,
	
	// imageWidth: Number
	//		Maximum width of an image in the SlideShow widget
	imageWidth: 500,
		
	// pageSize: Number
	//		The number of records to retrieve from the data store per request.
	pageSize: dojox.image.SlideShow.prototype.pageSize,
	
	// autoLoad: Boolean
	//		If true, images are loaded before the user views them. If false, an
	//		image is loaded when the user displays it.
	autoLoad: true,
	
	// linkAttr: String
	//		Defines the name of the attribute to request from the store to retrieve the
	//		URL to link to from an image, if any.
	linkAttr: "link",
	
	// imageThumbAttr: String
	//		Defines the name of the attribute to request from the store to retrieve the
	//		URL to the thumbnail image.
	imageThumbAttr: "imageUrlThumb",
	
	// imageLargeAttr: String
	//		Defines the name of the attribute to request from the store to retrieve the
	//		URL to the image.
	imageLargeAttr: "imageUrl",
	
	// titleAttr: String
	//		Defines the name of the attribute to request from the store to retrieve the
	//		title of the picture, if any.
	titleAttr: "title",
 
	// slideshowInterval: Integer
	//		Time, in seconds, between image changes in the slide show.
	slideshowInterval: 3,
	
	templateString: dojo.cache("dojox.image", "resources/Gallery.html"),

	postCreate: function(){
		// summary:
		//		Initializes the widget, creates the ThumbnailPicker and SlideShow widgets
		this.widgetid = this.id;
		this.inherited(arguments)
		
		this.thumbPicker = new dojox.image.ThumbnailPicker({
			linkAttr: this.linkAttr,
			imageLargeAttr: this.imageLargeAttr,
			imageThumbAttr: this.imageThumbAttr,
			titleAttr: this.titleAttr,
			useLoadNotifier: true,
			size: this.imageWidth
		}, this.thumbPickerNode);
		
		
		this.slideShow = new dojox.image.SlideShow({
			imageHeight: this.imageHeight,
			imageWidth: this.imageWidth,
			autoLoad: this.autoLoad,
			linkAttr: this.linkAttr,
			imageLargeAttr: this.imageLargeAttr,
			titleAttr: this.titleAttr,
			slideshowInterval: this.slideshowInterval,
			pageSize: this.pageSize
		}, this.slideShowNode);
		
		var _this = this;
		//When an image is shown in the Slideshow, make sure it is visible
		//in the ThumbnailPicker
		dojo.subscribe(this.slideShow.getShowTopicName(), function(packet){
			_this.thumbPicker._showThumbs(packet.index);
		});
		//When the user clicks a thumbnail, show that image
		dojo.subscribe(this.thumbPicker.getClickTopicName(), function(evt){
			_this.slideShow.showImage(evt.index);
		});
		//When the ThumbnailPicker moves to show a new set of pictures,
		//make the Slideshow start loading those pictures first.
		dojo.subscribe(this.thumbPicker.getShowTopicName(), function(evt){
			_this.slideShow.moveImageLoadingPointer(evt.index);
		});
		//When an image finished loading in the slideshow, update the loading
		//notification in the ThumbnailPicker
		dojo.subscribe(this.slideShow.getLoadTopicName(), function(index){
			_this.thumbPicker.markImageLoaded(index);
		});
		this._centerChildren();
	},
	  
  	setDataStore: function(dataStore, request, /*optional*/paramNames){
		// summary:
		//		Sets the data store and request objects to read data from.
		// dataStore:
		//		An implementation of the dojo.data.api.Read API. This accesses the image
		//		data.
		// request:
		//		An implementation of the dojo.data.api.Request API. This specifies the
		//		query and paging information to be used by the data store
		// paramNames:
		//		An object defining the names of the item attributes to fetch from the
		//		data store.  The four attributes allowed are 'linkAttr', 'imageLargeAttr',
		//		'imageThumbAttr' and 'titleAttr'
		this.thumbPicker.setDataStore(dataStore, request, paramNames);
		this.slideShow.setDataStore(dataStore, request, paramNames);
  	},
  
  	reset: function(){
		// summary:
		//		Resets the widget to its initial state
		this.slideShow.reset();
		this.thumbPicker.reset();
  	},
  
	showNextImage: function(inTimer){
		// summary:
		//		Changes the image being displayed in the SlideShow to the next
		//		image in the data store
		// inTimer: Boolean
		//		If true, a slideshow is active, otherwise the slideshow is inactive.
		this.slideShow.showNextImage();
	},

	toggleSlideshow: function(){
		dojo.deprecated("dojox.widget.Gallery.toggleSlideshow is deprecated.  Use toggleSlideShow instead.", "", "2.0");
		this.toggleSlideShow();
	},

	toggleSlideShow: function(){
		// summary:
		//		Switches the slideshow mode on and off.
		this.slideShow.toggleSlideShow();
	},

	showImage: function(index, /*optional*/callback){
		// summary:
		//		Shows the image at index 'idx'.
		// idx: Number
		//		The position of the image in the data store to display
		// callback: Function
		//		Optional callback function to call when the image has finished displaying.
		this.slideShow.showImage(index, callback);
	},
	
	resize: function(dim){
		this.thumbPicker.resize(dim);
	},
	
	_centerChildren: function() {
		// summary:
		//		Ensures that the ThumbnailPicker and the SlideShow widgets
		//		are centered.
		var thumbSize = dojo.marginBox(this.thumbPicker.outerNode);
		var slideSize = dojo.marginBox(this.slideShow.outerNode);
		
		var diff = (thumbSize.w - slideSize.w) / 2;
		
		if(diff > 0) {
			dojo.style(this.slideShow.outerNode, "marginLeft", diff + "px");
		} else if(diff < 0) {
			dojo.style(this.thumbPicker.outerNode, "marginLeft", (diff * -1) + "px");
		}
	}
});
