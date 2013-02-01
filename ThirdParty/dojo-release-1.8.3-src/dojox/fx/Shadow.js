define(["dojo/_base/kernel", "dojo/_base/query" ,"dojo/_base/lang", "dojo/_base/declare", "dojo/_base/sniff",
		"dojo/dom-construct", "dojo/dom-class", "dojo/dom-geometry", "dojo/_base/fx", "dojo/fx", "dijit/_Widget",
		"dojo/NodeList-fx"], 
  function(kernel, query, lang, declare, has, domConstruct, domClass, domGeom, baseFx, coreFx, Widget, NodeListFx){
kernel.experimental("dojox.fx.Shadow");
declare("dojox.fx.Shadow", Widget,{
		// summary:
		//		Adds a drop-shadow to a node.
		// example:
		// |	// add drop shadows to all nodes with class="hasShadow"
		// |	dojo.query(".hasShadow").forEach(function(n){
		// |		var foo = new dojox.fx.Shadow({ node: n });
		// |		foo.startup();
		// |	});

		// shadowPng: String
		//		Base location for drop-shadow images
		shadowPng: kernel.moduleUrl("dojox.fx", "resources/shadow"),
	
		// shadowThickness: Integer
		//		How wide (in px) to make the shadow
		shadowThickness: 7,
	
		// shadowOffset: Integer
		//		How deep to make the shadow appear to be
		shadowOffset: 3,
	
		// opacity: Float
		//		Overall opacity of the shadow
		opacity: 0.75,
	
		// animate: Boolean
		//		A toggle to disable animated transitions
		animate: false,
	
		// node: DomNode
		//		The node we will be applying this shadow to
		node: null,
	
		startup: function(){
			// summary:
			//		Initializes the shadow.
	
			this.inherited(arguments);
			this.node.style.position = "relative";
			// make all the pieces of the shadow, and position/size them as much
			// as possible (but a lot of the coordinates are set in sizeShadow
			this.pieces={};
			var x1 = -1 * this.shadowThickness;
			var y0 = this.shadowOffset;
			var y1 = this.shadowOffset + this.shadowThickness;
			this._makePiece("tl", "top", y0, "left", x1);
			this._makePiece("l", "top", y1, "left", x1, "scale");
			this._makePiece("tr", "top", y0, "left", 0);
			this._makePiece("r", "top", y1, "left", 0, "scale");
			this._makePiece("bl", "top", 0, "left", x1);
			this._makePiece("b", "top", 0, "left", 0, "crop");
			this._makePiece("br", "top", 0, "left", 0);
	
			this.nodeList = query(".shadowPiece",this.node);
	
			this.setOpacity(this.opacity);
			this.resize();
		},
	
		_makePiece: function(name, vertAttach, vertCoord, horzAttach, horzCoord, sizing){
			// summary:
			//		append a shadow pieces to the node, and position it
			var img;
			var url = this.shadowPng + name.toUpperCase() + ".png";
			if(has("ie") < 7){
				img = domConstruct.create("div");
				img.style.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+url+"'"+
					(sizing?", sizingMethod='"+sizing+"'":"") + ")";
			}else{
				img = domConstruct.create("img", { src:url });
			}
	
			img.style.position="absolute";
			img.style[vertAttach]=vertCoord+"px";
			img.style[horzAttach]=horzCoord+"px";
			img.style.width=this.shadowThickness+"px";
			img.style.height=this.shadowThickness+"px";
			domClass.add(img,"shadowPiece");
			this.pieces[name]=img;
			this.node.appendChild(img);
	
		},
	
		setOpacity: function(/* Float */n,/* Object? */animArgs){
			// summary:
			//		set the opacity of the underlay

			// note: does not work in IE? FIXME.

			if(has("ie")){ return; }
			if(!animArgs){ animArgs = {}; }
			if(this.animate){
				var _anims = [];
				this.nodeList.forEach(function(node){
					_anims.push(baseFx._fade(lang.mixin(animArgs,{ node: node, end: n })));
				});
				coreFx.combine(_anims).play();
			}else{
				this.nodeList.style("opacity",n);
			}
	
		},
	
		setDisabled: function(/* Boolean */disabled){
			// summary:
			//		enable / disable the shadow
			if(disabled){
				if(this.disabled){ return; }
				if(this.animate){ this.nodeList.fadeOut().play();
				}else{ this.nodeList.style("visibility","hidden"); }
				this.disabled = true;
			}else{
				if(!this.disabled){ return; }
				if(this.animate){ this.nodeList.fadeIn().play();
				}else{ this.nodeList.style("visibility","visible"); }
				this.disabled = false;
			}
		},
	
		resize: function(/* dojox.fx._arg.ShadowResizeArgs */args){
			// summary:
			//		Resizes the shadow based on width and height.
			var x; var y;
			if(args){ x = args.x; y = args.y;
			}else{
				var co = domGeom.position(this.node);
				x = co.w; y = co.h;
			}
			var sideHeight = y - (this.shadowOffset+this.shadowThickness);
			if (sideHeight < 0) { sideHeight = 0; }
			if (y < 1) { y = 1; }
			if (x < 1) { x = 1; }
			with(this.pieces){
				l.style.height = sideHeight+"px";
				r.style.height = sideHeight+"px";
				b.style.width = x+"px";
				bl.style.top = y+"px";
				b.style.top = y+"px";
				br.style.top = y+"px";
				tr.style.left = x+"px";
				r.style.left = x+"px";
				br.style.left = x+"px";
			}
		}
	});
	return dojox.fx.Shadow;
});
