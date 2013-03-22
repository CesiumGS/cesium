define(["dojo", "dojox/main", "dojox/image/Badge", "dojox/data/FlickrRestStore"], function(dojo, dojox){
	
	dojo.getObject("image", true, dojox);
	return dojo.declare("dojox.image.FlickrBadge", dojox.image.Badge, {
		children: "a.flickrImage",

		// userid: String
		//		If you know your Flickr userid, you can set it to prevent a call to fetch the id
		userid: "",

		// username: String
		//		Your Flickr username
		username: "",

		// setid: String
		//		The id of the set to display
		setid: "",

		// tags: String|Array
		//		A comma separated list of tags or an array of tags to grab from Flickr
		tags: "",

		// searchText: String
		//		Free text search.  Photos who's title, description, or tags contain the text will be displayed
		searchText: "",

		// target: String
		//		Where to display the pictures when clicked on.  Valid values are the same as the target attribute
		//		of the A tag.
		target: "",

		apikey: "8c6803164dbc395fb7131c9d54843627",
		_store: null,

		postCreate: function(){
			if(this.username && !this.userid){
				var def = dojo.io.script.get({
					url: "http://www.flickr.com/services/rest/",
					preventCache: true,
					content: {
						format: "json",
						method: "flickr.people.findByUsername",
						api_key: this.apikey,
						username: this.username
					},
					callbackParamName: "jsoncallback"
				});
				def.addCallback(this, function(data){
					if(data.user && data.user.nsid){
						this.userid = data.user.nsid;
						if(!this._started){
							this.startup();
						}
					}
				});
			}
		},

		startup: function(){
			if(this._started){ return; }
			if(this.userid){
				var query = {
					userid: this.userid
				};
				if(this.setid){
					query["setid"] = this.setid;
				}
				if(this.tags){
					query.tags = this.tags;
				}
				if(this.searchText){
					query.text = this.searchText;
				}
				var args = arguments;
				this._store = new dojox.data.FlickrRestStore({ apikey: this.apikey });
				this._store.fetch({
					count: this.cols * this.rows,
					query: query,
					onComplete: dojo.hitch(this, function(items){
						dojo.forEach(items, function(item){
							var a = dojo.doc.createElement("a");
							dojo.addClass(a, "flickrImage");
							a.href = this._store.getValue(item, "link");
							if(this.target){
								a.target = this.target;
							}

							var img = dojo.doc.createElement("img");
							img.src = this._store.getValue(item, "imageUrlThumb");
							dojo.style(img, {
								width: "100%",
								height: "100%"
							});

							a.appendChild(img);
							this.domNode.appendChild(a);
						}, this);
						dojox.image.Badge.prototype.startup.call(this, args);
					})
				});
			}
		}
	});
});

