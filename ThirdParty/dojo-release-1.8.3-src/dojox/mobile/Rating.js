define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-construct",
	"dijit/_WidgetBase",
	"./iconUtils"
], function(declare, lang, domConstruct, WidgetBase, iconUtils){

	// module:
	//		dojox/mobile/Rating

	return declare("dojox.mobile.Rating", WidgetBase, {
		// summary:
		//		A widget that shows rating with stars.
		// description:
		//		This widget simply shows the specified number of stars. It is a
		//		read-only widget, and has no editing capability.

		// image: String
		//		Path to a star image, which includes three stars, full star,
		//		empty star, and half star, from left to right.
		image: "",

		// numStars: Number
		//		The number of stars to show.
		numStars: 5,

		// value: Number
		//		The current value of the Rating.
		value: 0,

		// alt: String
		//		An alternate text for the icon image.
		alt: "",

		/* internal properties */
		
		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblRating",

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.style.display = "inline-block";
			var img = this.imgNode = domConstruct.create("img");
			this.connect(img, "onload",
				lang.hitch(this, function(){ this.set("value", this.value); }));
			iconUtils.createIcon(this.image, null, img);
		},

		_setValueAttr: function(/*Number*/value){
			// summary:
			//		Sets the value of the Rating.
			// tags:
			//		private
			this._set("value", value);
			var h = this.imgNode.height;
			if(h == 0){ return; } // loading of image has not been completed yet
			domConstruct.empty(this.domNode);
			var i, left, w = this.imgNode.width / 3;
			for(i = 0; i < this.numStars; i++){
				if(i <= value - 1){
					left = 0; // full
				}else if(i >= value){
					left = w; // empty
				}else{
					left = w * 2; // half
				}
				var parent = domConstruct.create("div", {
					style: {"float": "left"}
				}, this.domNode);
				iconUtils.createIcon(this.image,
					"0," + left + "," + w + "," + h, null, this.alt, parent);
			}
		}
	});
});
