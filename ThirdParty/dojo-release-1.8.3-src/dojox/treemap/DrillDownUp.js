define(["dojo/_base/lang", "dojo/_base/event", "dojo/_base/declare", "dojo/dom-geometry", "dojo/dom-construct",
	"dojo/dom-style", "dojo/_base/fx", "dojo/has!touch?dojox/gesture/tap"],
	function(lang, event, declare, domGeom, domConstruct, domStyle, fx, tap){

	return declare("dojox.treemap.DrillDownUp", null, {
		// summary:
		//		Specializes TreeMap to support drill down and up operations.

		postCreate: function(){
			this.inherited(arguments);
			this.connect(this.domNode, "dblclick", this._onDoubleClick);
			if(tap){
				this.connect(this.domNode, tap.doubletap, this._onDoubleClick);
			}
		},

		_onDoubleClick: function(e){
			var renderer = this._getRendererFromTarget(e.target);
			if(renderer.item){
				var item = renderer.item;
				if(this._isLeaf(item)){
					// walk up
					item = renderer.parentItem;
					renderer = this.itemToRenderer[this.getIdentity(item)];
					// our leaf parent is the root, we can't do much...
					if(renderer == null){
						return;
					}
				}
				// Drill up
				if(this.rootItem == item){
					this.drillUp(renderer);
				}else{
					this.drillDown(renderer);
				}
				event.stop(e);
			}
		},

		drillUp: function(renderer){
			// summary:
			//		Drill up from the given renderer.
			// renderer: DomNode
			//		The item renderer.
			var item = renderer.item;

			// Remove the current rootItem renderer
			// rebuild the tree map
			// and animate the old renderer before deleting it.

			this.domNode.removeChild(renderer);
			var parent = this._getRenderer(item).parentItem;
			this.set("rootItem", parent);
			this.validateRendering(); // Must call this to create the treemap now

			// re-add the old renderer to show the animation
			domConstruct.place(renderer, this.domNode);

			domStyle.set(renderer, "zIndex", 40);

			var finalBox = domGeom.position(this._getRenderer(item), true);
			var corner = domGeom.getMarginBox(this.domNode);

			fx.animateProperty({
				node: renderer, duration: 500, properties: {
					left: {
						end: finalBox.x - corner.l
					}, top: {
						end: finalBox.y - corner.t
					}, height: {
						end: finalBox.h
					}, width: {
						end: finalBox.w
					}
				}, onAnimate: lang.hitch(this, function(values){
					var box = domGeom.getContentBox(renderer);
					this._layoutGroupContent(renderer, box.w, box.h, renderer.level + 1, false, true);
				}), onEnd: lang.hitch(this, function(){
					this.domNode.removeChild(renderer);
				})
			}).play();
		},

		drillDown: function(renderer){
			// summary:
			//		Drill up from the given renderer.
			// renderer: DomNode
			//		The item renderer.
			var box = domGeom.getMarginBox(this.domNode);
			var item = renderer.item;

			// Set the new root item into the rootPanel to make it appear on top
			// of the other nodes, and keep the same global location
			var parentNode = renderer.parentNode;
			var spanInfo = domGeom.position(renderer, true);
			parentNode.removeChild(renderer);
			domConstruct.place(renderer, this.domNode);
			domStyle.set(renderer, {
				left: (spanInfo.x - box.l)+ "px", top: (spanInfo.y - box.t)+ "px"
			});
			var zIndex = domStyle.get(renderer, "zIndex");
			domStyle.set(renderer, "zIndex", 40);

			fx.animateProperty({
				node: renderer, duration: 500, properties: {
					left: {
						end: box.l
					}, top: {
						end: box.t
					}, height: {
						end: box.h
					}, width: {
						end: box.w
					}
				}, onAnimate: lang.hitch(this, function(values){
					var box2 = domGeom.getContentBox(renderer);
					this._layoutGroupContent(renderer, box2.w, box2.h, renderer.level + 1, false);
				}), onEnd: lang.hitch(this, function(){
					domStyle.set(renderer, "zIndex", zIndex);
					this.set("rootItem", item);
				})
			}).play();
		}
	});
});