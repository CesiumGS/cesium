dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("FlickrSearchGroupAssistant", dojox.mobile.app.SceneAssistant, {
  
	setup: function(){
    
		// Instantiate widgets in the template HTML.
		this.controller.parse();
		
		// This api key should not be reused. You should get your own
		// free api key from Flickr.
		this.apiKey = "8c6803164dbc395fb7131c9d54843627";
		
		this.listWidget = dijit.byId("searchList");
		this.textWidget = dijit.byId("searchTextInput");
		
		this.listWidget.set("items", []);
		
		var _this = this;
		
		this.search = dojo.hitch(this, this.search);
		this.handleGroupResults = dojo.hitch(this, this.handleGroupResults);
		
		// Listen for changes to the text widget.
		// To ensure that onChange is called on every letter change,
		// intermediateChanges is set to true on the widget
		this.connect(this.textWidget, "onChange", function(value){
		//		console.log("search value = ", value);
			
			if(!value || value.length == 0){
				_this.listWidget.set("items", []);
				return;
			}
			
			if(!_this.timer){
				_this.timer = setTimeout(_this.search, 300);
			}
		});
		
		this.connect(this.listWidget, "onSelect", function(item, index, node){
			console.log("select", arguments);
			
			_this.controller.stageController.pushScene("flickr-image-view",
				dojo.mixin({type: "group"}, item));
		});
	},
  
	activate: function(searchType){
    
		this.searchType = searchType;
		
		// Set the title of the screen based on the type of the search
		if(searchType){
			var sceneHeader = dijit.byId("searchHeader");
			switch(searchType){
				case "group":
					sceneHeader.setLabel("Search Flickr Groups");
					break;
				case "user":
					sceneHeader.setLabel("Search Flickr People");
					break;
				case "tag":
					sceneHeader.setLabel("Search Flickr Tags");
					break;
			}
		}
		// Focus in the search text input
		this.textWidget.focus();
		
		if(this.textWidget.set("value")){
			this.search();
		}
	},
  
	search: function(){
	  	// summary:
		//		Perform a search. Switch between group, user and tag search
		
	  	if(this.timer){
			clearTimeout(this.timer);
			this.timer = null;
		}
		
		var searchText = this.textWidget.set("value");
		
		if(!searchText || dojo.trim(searchText).length < 1){
			this.listWidget.set("items", []);
			
			console.log("NOT SEARCHING");
			return;
		}
		
		var url = "http://api.flickr.com/services/rest/?method=flickr.groups.search";
		
		var deferred = dojo.io.script.get({
			url: url,
			content: {
				api_key: this.apiKey,
				format: "json",
				text: searchText,
				perPage: 10
			},
			jsonp: "jsoncallback"
		});
		deferred.addBoth(this.handleGroupResults);
	},
  
	handleGroupResults: function(res){
		var groups;
		if(res && res.groups && res.groups.group){
			groups = res.groups.group;
			
			for(var i = 0; i < groups.length; i++){
				groups[i].label = groups[i].name;
			}
		}else{
			groups = [];
		}
		this.listWidget.set("items", groups);
	}
  
});