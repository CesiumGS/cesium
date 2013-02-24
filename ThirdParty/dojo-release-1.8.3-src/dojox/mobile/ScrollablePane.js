define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-style",
	"./_ScrollableMixin",
	"./Pane"
], function(array, declare, has, win, dom, domConstruct, domStyle, ScrollableMixin, Pane){

	// module:
	//		dojox/mobile/ScrollablePane

	return declare("dojox.mobile.ScrollablePane", [Pane, ScrollableMixin], {
		// summary:
		//		A pane that has the touch-scrolling capability.

		// roundCornerMask: Boolean
		//		If true, creates a rounded corner mask to clip corners of a 
		//		child widget or DOM node. Works only on WebKit-based browsers.
		roundCornerMask: false,

		// radius: Number
		//		Radius of the rounded corner mask.
		radius: 0,

		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblScrollablePane",

		buildRendering: function(){
			var c = this.containerNode = domConstruct.create("div", {
				className: "mblScrollableViewContainer",
				style: {
					width: this.scrollDir === "v" ? "100%" : ""
				}
			});
			this.inherited(arguments);

			if(this.srcNodeRef){
				// reparent
				for(var i = 0, len = this.srcNodeRef.childNodes.length; i < len; i++){
					this.containerNode.appendChild(this.srcNodeRef.firstChild);
				}
			}

			if(this.roundCornerMask && has("webkit")){
				var node = this.containerNode;
				var mask = this.maskNode = domConstruct.create("div", {
					className: "mblScrollablePaneMask",
					style: {
						webkitMaskImage: "-webkit-canvas(" + this.id + "_mask)"
					}
				});
				mask.appendChild(node);
				c = mask;
			}

			this.domNode.appendChild(c);
			dom.setSelectable(this.containerNode, false);
		},

		resize: function(){
			// summary:
			//		Calls resize() of each child widget.
			this.inherited(arguments); // scrollable#resize() will be called
			if(this.roundCornerMask){
				this.createRoundMask();
			}
			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		},

		isTopLevel: function(e){
			// summary:
			//		Returns true if this is a top-level widget.
			//		Overrides dojox/mobile/scrollable.
			var parent = this.getParent && this.getParent();
			return (!parent || !parent.resize); // top level widget
		},

		createRoundMask: function(){
			// summary:
			//		Creates a rounded corner rectangle mask.
			// description:
			//		Creates a rounded corner rectangle mask.
			//		This function works only on WebKit-based browsers.
			if(has("webkit")){
				if(this.domNode.offsetHeight == 0){ return; } // in a hidden view
				this.maskNode.style.height = this.domNode.offsetHeight + "px";
				var child = this.getChildren()[0],
					c = this.containerNode,
					node = child ? child.domNode :
						(c.childNodes.length > 0 && (c.childNodes[0].nodeType === 1 ? c.childNodes[0] : c.childNodes[1]));

				var r = this.radius;
				if(!r){
					var getRadius = function(n){ return parseInt(domStyle.get(n, "borderTopLeftRadius")); };
					if(child){
						r = getRadius(child.domNode);
						if(!r){
							var item = child.getChildren()[0];
							r = item ? getRadius(item.domNode) : 0;
						}
					}else{
						r = getRadius(node);
					}
				}

				var pw = this.domNode.offsetWidth, // pane width
					w = node.offsetWidth,
					h = this.domNode.offsetHeight,
					t = domStyle.get(node, "marginTop"),
					b = domStyle.get(node, "marginBottom"),
					l = domStyle.get(node, "marginLeft");

				var ctx = win.doc.getCSSCanvasContext("2d", this.id + "_mask", pw, h);
				ctx.fillStyle = "#000000";
				ctx.beginPath();
				ctx.moveTo(l + r, t);
				ctx.arcTo(l + w, t, l + w, h - b - r, r);
				ctx.arcTo(l + w, h - b, l + r, h - b, r);
				ctx.arcTo(l, h - b, l, t  +  r, r);
				ctx.arcTo(l, t, l + r, t, r);
				ctx.closePath();
				ctx.fill();
			}
		}
	});
});
