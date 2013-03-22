dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("FlickrImageViewAssistant", dojox.mobile.app.SceneAssistant, {
  
	apiKey: "8c6803164dbc395fb7131c9d54843627",
	
	setup: function(){
	
		// Instantiate widgets in the template HTML.
		this.controller.parse();
		
		var viewer = this.viewer = dijit.byId("flickrImageView");
		
		var _this = this;
		
		this.handlePhotoLoad = dojo.hitch(this, this.handlePhotoLoad);
		
		var loadingDiv = this.controller.query(".loading")[0];
		
		// When the first image loads, hide the loading indicator.
		var loadConn = dojo.connect(viewer, "onLoad", function(type, url, isSmall){
			if(type == "center"){
				dojo.disconnect(loadConn);
				dojo.destroy(loadingDiv);
				loadingDiv = null;
			}
		});
		
		var reportDiv = this.controller.query(".report")[0];
		
		this.connect(viewer, "onChange", function(direction){
			_this.index += direction;
			
			// If we are not at the first image, set the leftUrl attribute
			if(_this.index > 0){
				viewer.set("leftUrl", _this.urls[_this.index - 1]);
			}
		
			// If we are not at the last image, set the rightUrl attribute
			if(_this.index < _this.urls.length - 1){
				viewer.set("rightUrl", _this.urls[_this.index + 1]);
			}
			
			reportDiv.innerHTML =
				(_this.index + 1) + " of " + _this.urls.length
				+ " " + _this.urls[_this.index].title;
		});
	},
  
	activate: function(options){
		
		this.dataType = (options && options.type ? options.type : "interesting");
		console.log("In main assistant activate, dataType = ", this.dataType, options);
		
		switch(this.dataType){
			case "interesting":
				this.loadInteresting();
				break;
			case "group":
				this.loadGroup(options);
				break;
			case "data":
				// Another scene has passed in a list of images
				// and an initial index
				this.useData(options.images, options.index || 0);
				break;
				
		}
	},
	
	useData: function(images, startIndex){
		this.urls = images;
		this.index = Math.min(images.length - 1, Math.max(0, startIndex));
	
		if (this.index > 0) {
			this.viewer.set("leftUrl", images[this.index - 1]);
		}
		this.viewer.set("centerUrl", images[this.index]);
		
		if (this.index < images.length) {
			this.viewer.set("rightUrl", images[this.index + 1]);
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
				format: "json"
			},
			jsonp: "jsoncallback"
		});
		deferred.addBoth(this.handlePhotoLoad);
	},

	loadGroup: function(groupData){
		console.log("loading group ", groupData);

		var url = "http://api.flickr.com/services/rest/?method=" +
					"flickr.groups.pools.getPhotos";
					
//		"http://api.flickr.com/services/rest/?method=flickr.groups.pools.getPhotos"
//		+ "&api_key=" + lib.API_KEY
//		+ "&group_id=" + group.id
//		+ "&extras=owner_name"
//		+ "&per_page=" + (perPage || 10)
//		+ "&format=json&nojsoncallback=1"

		var deferred = dojo.io.script.get({
			url: url,
			content: {
				api_key: this.apiKey,
				format: "json",
				group_id: groupData.nsid,
				per_page: 20
			},
			jsonp: "jsoncallback"
		});
		deferred.addBoth(this.handlePhotoLoad);
	},
	
	
	
	handlePhotoLoad: function(res){
		
		if(res && res.photos && res.photos.photo){
			var images = res.photos.photo;
			
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
					large: baseUrl + "_m.jpg",
					small: baseUrl + "_t.jpg",
					title: images[i].title
				});
			}
			this.urls = urls;
			this.index = 0;
		
			this.viewer.set("centerUrl", urls[0]);
			this.viewer.set("rightUrl", urls[1]);
		}else{
			console.log("didn't get photos");
		}
	}
  
});