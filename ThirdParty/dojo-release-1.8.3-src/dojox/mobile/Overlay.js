define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/window",
	"dijit/_WidgetBase",
	"dojo/_base/array",
	"dijit/registry"
], function(declare, lang, has, win, domClass, domGeometry, domStyle, windowUtils, WidgetBase, array, registry){

	return declare("dojox.mobile.Overlay", WidgetBase, {
		// summary:
		//		A non-templated widget that animates up from the bottom, 
		//		overlaying the current content.

		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblOverlay mblOverlayHidden",

		_reposition: function(){
			// summary:
			//		Position the overlay at the bottom
			// tags:
			//		private
			var popupPos = domGeometry.position(this.domNode);
			var vp = windowUtils.getBox();
			if((popupPos.y+popupPos.h) != vp.h // TODO: should be a has() test for position:fixed not scrolling
				|| (domStyle.get(this.domNode, 'position') != 'absolute' && has('android') < 3)){ // android 2.x supports position:fixed but child transforms don't persist
				popupPos.y = vp.t + vp.h - popupPos.h;
				domStyle.set(this.domNode, { position: "absolute", top: popupPos.y + "px", bottom: "auto" });
			}
			return popupPos;
		},

		show: function(/*DomNode?*/aroundNode){
			// summary:
			//		Scroll the overlay up into view
			array.forEach(registry.findWidgets(this.domNode), function(w){
				if(w && w.height == "auto" && typeof w.resize == "function"){
					w.resize();
				}
			});
			var popupPos = this._reposition();
			if(aroundNode){
				var aroundPos = domGeometry.position(aroundNode);
				if(popupPos.y < aroundPos.y){ // if the aroundNode is under the popup, try to scroll it up
					win.global.scrollBy(0, aroundPos.y + aroundPos.h - popupPos.y);
					this._reposition();
				}
			}
			var _domNode = this.domNode;
			domClass.replace(_domNode, ["mblCoverv", "mblIn"], ["mblOverlayHidden", "mblRevealv", "mblOut", "mblReverse", "mblTransition"]);
			setTimeout(lang.hitch(this, function(){
				var handler = this.connect(_domNode, "webkitTransitionEnd", function(){
					this.disconnect(handler);
					domClass.remove(_domNode, ["mblCoverv", "mblIn", "mblTransition"]);
					this._reposition();
				});
				domClass.add(_domNode, "mblTransition");
			}), 100);
			var skipReposition = false;

			this._moveHandle = this.connect(win.doc.documentElement, has('touch') ? "ontouchmove" : "onmousemove",
				function(){
					skipReposition = true;
				}
			);
			this._repositionTimer = setInterval(lang.hitch(this, function(){
				if(skipReposition){ // don't reposition if busy
					skipReposition = false;
					return;
				}
				this._reposition();
			}), 50); // yield a short time to allow for consolidation for better CPU throughput
			return popupPos;
		},

		hide: function(){
			// summary:
			//		Scroll the overlay down and then make it invisible
			var _domNode = this.domNode;
			if(this._moveHandle){
				this.disconnect(this._moveHandle);
				this._moveHandle = null;
				clearInterval(this._repositionTimer);
				this._repositionTimer = null;
			}
			if(has("webkit")){
				domClass.replace(_domNode, ["mblRevealv", "mblOut", "mblReverse"], ["mblCoverv", "mblIn", "mblOverlayHidden", "mblTransition"]);
				setTimeout(lang.hitch(this, function(){
					var handler = this.connect(_domNode, "webkitTransitionEnd", function(){
						this.disconnect(handler);
						domClass.replace(_domNode, ["mblOverlayHidden"], ["mblRevealv", "mblOut", "mblReverse", "mblTransition"]);
					});
					domClass.add(_domNode, "mblTransition");
				}), 100);
			}else{
				domClass.replace(_domNode, ["mblOverlayHidden"], ["mblCoverv", "mblIn", "mblRevealv", "mblOut", "mblReverse"]);
			}
		},

		onBlur: function(/*Event*/e){
			return false; // touching outside the overlay area does not call hide()
		}
	});
});
