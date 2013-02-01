dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("FlickrImageThumbViewAssistant", dojox.mobile.app.SceneAssistant, {

	apiKey: "8c6803164dbc395fb7131c9d54843627",

	setup: function(){

		// Instantiate widgets in the template HTML.
		this.controller.parse();

		this.handlePhotoLoad = dojo.hitch(this, this.handlePhotoLoad);
		this.search = dojo.hitch(this, this.search);
		this.resizeViewer = dojo.hitch(this, this.resizeViewer);

		this.textWidget = dijit.byId("searchTextThumbInput");

		var viewer = this.viewer = dijit.byId("flickrImageThumbView");

		// Set the parameter from which to retrieve the owner name
		viewer.labelParam = "ownername";

		var _this = this;

		this.connect(viewer, "onSelect", function(item, index){
			console.log("selected ", item, index);

			_this.controller.stageController.pushScene("flickr-image-view",{
				type: "data",
				images: _this.urls,
				index: index
			});
		});

		this.connect(this.textWidget, "onChange", function(value){
			if(!value || value.length == 0){
				_this.viewer.set("items", []);
				return;
			}

			if(!_this.timer){
				_this.timer = setTimeout(_this.search, 1000);
			}
		});

		this.connect(dijit.byId("btnSmall"), "onClick", function(){
			_this.setThumbSize("small");
		});
		this.connect(dijit.byId("btnMedium"), "onClick", function(){
			_this.setThumbSize("medium");
		});
		this.connect(dijit.byId("btnLarge"), "onClick", function(){
			_this.setThumbSize("large");
		});

		var resizeTimer;
		// Listen to the resize event on the window to make
		// the thumbnails fill the horizontal space
		// This is fairly pointless for mobile, but makes it work
		// better in desktop browsers
		this.connect(window, "resize", function(){
			if(resizeTimer){
				clearTimeout(resizeTimer);
			}
			resizeTimer = setTimeout(_this.resizeViewer, 300);
		});
	},

	activate: function(options){

		// If this is the first time this view is activated, then do the initial
		// load of images
		if (!this.dataType) {

			this.dataType = (options ? options.type : "interesting");

			switch (this.dataType) {
				case "interesting":
					// Hide the search text box
					dojo.style(this.textWidget.domNode, "display", "none");
					this.loadInteresting();
					break;
				case "text":
					dojo.style(this.textWidget.domNode, "visibility", "visible");
					this.loadText(this.textWidget.set("value"));
					break;
				case "tag":
					// Another scene has passed in a list of images
					// and an initial index
					dojo.style(this.textWidget.domNode, "visibility", "visible");
					this.loadTags(this.textWidget.set("value"));
					break;
				default:
					console.log("unknown type " + this.dataType, options);
			}
		}
	},

	setThumbSize: function(cls){
		dojo.removeClass(this.viewer.domNode, ["small", "medium", "large"]);
		dojo.addClass(this.viewer.domNode, cls);
		this.resizeViewer();
	},

	resizeViewer: function(){
		this.viewer.resize();
	},

	search: function(){
		if(this.timer){
			clearTimeout(this.timer);
			this.timer = null;
		}

		var searchText = this.textWidget.set("value");

		if(!searchText || dojo.trim(searchText).length < 1){
			this.viewer.set("items", []);

			console.log("NOT SEARCHING");
			return;
		}

		console.log("search", searchText);
		switch(this.dataType){
			case "text":
				this.loadText(searchText);
				break;
			case "tag":
				// Another scene has passed in a list of images
				// and an initial index
				this.loadTags(searchText);
				break;
		}
	},

	loadInteresting: function(){
		console.log("loading interesting");

		var url = "http://api.flickr.com/services/rest/?method=" +
					"flickr.interestingness.getList";

		var deferred = dojo.io.script.get({
			url: url,
			content: {
				api_key: this.apiKey,
				format: "json",
				per_page: 20
			},
			jsonp: "jsoncallback"
		});
		deferred.addBoth(this.handlePhotoLoad);
	},

	loadText: function(text){
		console.log("loading text ", text);

		var url = "http://api.flickr.com/services/rest/?method=" +
					"flickr.photos.search";

		var deferred = dojo.io.script.get({
			url: url,
			content: {
				api_key: this.apiKey,
				format: "json",
				text: text,
				extras: "owner_name",
				per_page: 20
			},
			jsonp: "jsoncallback"
		});
		deferred.addBoth(this.handlePhotoLoad);
	},

	loadTags: function(text){
		console.log("loading tags ", text);

		var url = "http://api.flickr.com/services/rest/?method=" +
					"flickr.photos.search";

		var deferred = dojo.io.script.get({
			url: url,
			content: {
				api_key: this.apiKey,
				format: "json",
				tags: text,
				per_page: 20
			},
			jsonp: "jsoncallback"
		});
		deferred.addBoth(this.handlePhotoLoad);
	},

	handlePhotoLoad: function(res){
		console.log("got photos", res);
		if(res && res.photos && res.photos.photo){
			var images = this.images = res.photos.photo;

			var urls = [];

			var baseUrl;

			for(var i = 0; i < images.length; i++){
				baseUrl = "http://farm"
							+ images[i].farm
							+ ".static.flickr.com/"
							+ images[i].server
							+ "/"
							+ images[i].id
							+ "_"
							+ images[i].secret;
				urls.push({
					large: baseUrl + ".jpg",
					small: baseUrl + "_t.jpg",
					thumb: baseUrl + "_s.jpg",
					ownername: images[i].ownername,
					title: images[i].title
				});
			}
			this.urls = urls;
			this.index = 0;
			this.viewer.set("selectedIndex", this.index);

			this.viewer.set("items", urls);
		}else{
			this.viewer.set("items", []);
			console.log("didn't get photos");
		}
	}

});