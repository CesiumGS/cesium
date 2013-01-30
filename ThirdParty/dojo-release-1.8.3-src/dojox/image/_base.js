define(["dojo", "dojox"], function(dojo, dojox){
	
	dojo.getObject("image", true, dojox);
	var d = dojo;
	
	var cacheNode;
	dojox.image.preload = function(/* Array */urls){
		// summary:
		//		Preload a list of images in the dom.
		// urls: Array
		//		The list of urls to load. Can be any valid .src attribute.
		// example:
		//		Load two images into cache:
		//	|	dojox.image.preload(["foo.png", "bar.gif"]);
		// example:
		//		Using djConfig:
		//	|	var djConfig = {
		//	|		preloadImages:["bar.png", "baz.png", "http://example.com/icon.gif"]
		//	|	};
		// returns: Array
		//		An Array of DomNodes that have been cached.
		
		if(!cacheNode){
			cacheNode = d.create("div", {
				style:{ position:"absolute", top:"-9999px", height:"1px", overflow:"hidden" }
			}, d.body());
		}

		// place them in the hidden cachenode
		return d.map(urls, function(url){
			return d.create("img", { src: url }, cacheNode);
		});
	
	};
	
	/*=====
	dojo.mixin(djConfig, {
		// preloadImages: Array?
		//		An optional array of urls to preload immediately upon
		//		page load. Uses `dojox.image`, and is unused if not present.
		preloadImages: []
	});
	=====*/
	
	if(d.config.preloadImages){
		d.addOnLoad(function(){
			dojox.image.preload(d.config.preloadImages);
		});
	}
		
//	dojo.declare("dojox.image.Image", dijit._Widget, {
//		// summary:
//		//		an Image widget
//		// example:
//		//	| new dojox.Image({ src:"foo.png", id:"bar" });
//
//		alt: "",
//		src: dojo._blankGif,
//		title: "",
//
//		onLoad: function(e){
//			// summary:
//			//		Stub fired when this image is really ready.
//		},
//
//		_onLoad: function(e){
//			// summary:
//			//		private function to normalize `onLoad` for this
//			//		instance.
//			this.onLoad(e);
//		},
//
//		_setSrcAttr: function(newSrc){
//			// summary:
//			//		Function so widget.attr('src', someUrl) works
//
//			var ts = this.domNode, os = td.src;
//			if(os !== newSrc){
//				td.src = newSrc;
//			}
//		},
//
//		/* Sugar Functions: */
//
//		crossFade: function(newSrc){
//			// summary:
//			//		Set this Image to a new src with crossfading
//			// example:
//			// |	dijit.byId("bar").crossFade("/images/newImage.png");
//			//
//
//			d.fadeOut({
//				node: this.domNode,
//				onEnd: d.hitch(this, function(){
//					this.attr('src', newSrc);
//					d.fadeIn({
//						node: this.domNode,
//						delay: 75
//					}).play();
//				})
//			}).play();
//		},
//
//		/* Overrides */
//
//		buildRendering: function(){
//			// override buildrendering to create a real "img" instead of a div
//			// when no srcNodeRef is passed. also wire up single onload.
//			this.domNode = this.srcNodeRef || d.create('img');
//			this.connect(this.domNode, "onload", "_onload");
//		}
//
//	});
		
});