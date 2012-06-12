define([
	"dojo/_base/kernel",
	"dojo/_base/declare",	// dojo.declare
	"dojo/dom-geometry",
	"dijit/_Widget",
	"./Flash",
	"./Quicktime"
], function (dojo, declare, domGeometry, _Widget, Flash, Quicktime) {
dojo.experimental("dojox.embed.Object");

return dojo.declare("dojox.embed.Object", _Widget, {
	//	summary:
	//		A widget you can use to embed either a Flash or Quicktime
	//		movie.
	//
	//	example:
	//	From markup:
	//	|	<div dojoType="dojox.embed.Object" src="path/to/movie.swf"></div>
	//
	//	example:
	//	Programmatic:
	//	|	var mov=new dojox.embed.Object({
	//	|		src: "path/to/movie.swf"
	//	|	}, node);
	//
	//	width: Number?
	//		The width of the movie. If not provided, the width of this.domNode is used.
	//	height: Number?
	//		The height of the movie. If not provided, the height of this.domNode is used.
	//	src: String
	//		The URL of the movie to embed.
	//	movie: HTMLEmbed
	//		The eventual reference to the movie embedded.  If you are looking to script
	//		control over the movie, you'd access it this way.
	//	params: Object
	//		A property bag that is created postCreate.  Any additional attributes you
	//		define on your domNode will be collected and placed into this, which will
	//		then be passed to the movie constructor.
	//	reFlash: RegExp
	//		Expression used on the src property to determine if this is Flash or Quicktime.
	//	reQtMovie: RegExp
	//		Expression used on the src property to determine if this is Flash or Quicktime.
	//	reQtAudio: RegExp
	//		Expression used on the src property to determine if this is Flash or Quicktime.
	
	width: 0,
	height: 0,
	src: "",
	movie: null,
	params: null,

	reFlash: /\.swf|\.flv/gi,
	reQtMovie: /\.3gp|\.avi|\.m4v|\.mov|\.mp4|\.mpg|\.mpeg|\.qt/gi,
	reQtAudio:/\.aiff|\.aif|\.m4a|\.m4b|\.m4p|\.midi|\.mid|\.mp3|\.mpa|\.wav/gi,
	
	postCreate: function(){
		//	summary
		//		Constructs the movie and places it in the document.
		if(!this.width || !this.height){
			//	get the width and height from the domNode
			var box=domGeometry.getMarginBox(this.domNode);
			this.width=box.w, this.height=box.h;
		}

		//	the default embed constructor.
		var em=Flash;

		//	figure out what kind of movie this is.
		if(this.src.match(this.reQtMovie) || this.src.match(this.reQtAudio)){
			em=Quicktime;
		}

		//	loop through any attributes and set up our params object.
		if(!this.params){
			this.params={};
			if(this.domNode.hasAttributes()){
				// ignore list
				var ignore = {
					dojoType: "",
					width: "",
					height: "",
					"class": "",
					style: "",
					id: "",
					src: ""
				};

				var attrs=this.domNode.attributes;
				for(var i=0, l=attrs.length; i<l; i++){
					if(!ignore[attrs[i].name]){
						this.params[attrs[i].name]=attrs[i].value;
					}
				}
			}
		}

		//	set up our arguments.
		var kwArgs={
			path: this.src,
			width: this.width,
			height: this.height,
			params: this.params
		};

		//	set up the movie.
		this.movie=new (em)(kwArgs, this.domNode);
	}
});
});
