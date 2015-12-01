define([
	"dojo/_base/array",
	"dojo/_base/declare", // declare
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/_base/lang",
	"../_WidgetBase",
	"./_LayoutWidget",
	"./utils" // layoutUtils.layoutChildren
], function(array, declare, domClass, domStyle, lang, _WidgetBase, _LayoutWidget, layoutUtils){

	// module:
	//		dijit/layout/LayoutContainer

	var LayoutContainer = declare("dijit.layout.LayoutContainer", _LayoutWidget, {
		// summary:
		//		A LayoutContainer is a box with a specified size, such as style="width: 500px; height: 500px;",
		//		that contains a child widget marked region="center" and optionally children widgets marked
		//		region equal to "top", "bottom", "leading", "trailing", "left" or "right".
		//		Children along the edges will be laid out according to width or height dimensions. The remaining
		//		space is designated for the center region.
		//
		//		The outer size must be specified on the LayoutContainer node.  Width must be specified for the sides
		//		and height for the top and bottom, respectively.  No dimensions should be specified on the center;
		//		it will fill the remaining space.  Regions named "leading" and "trailing" may be used just like
		//		"left" and "right" except that they will be reversed in right-to-left environments.
		//
		//		For complex layouts, multiple children can be specified for a single region.   In this case, the
		//		layoutPriority flag on the children determines which child is closer to the edge (low layoutPriority)
		//		and which child is closer to the center (high layoutPriority).   layoutPriority can also be used
		//		instead of the design attribute to control layout precedence of horizontal vs. vertical panes.
		//
		//		See `LayoutContainer.ChildWidgetProperties` for details on the properties that can be set on
		//		children of a `LayoutContainer`.
		//
		//		If layoutPriority is not set, lays out each child in the natural order the children occur in.
		//		Basically each child is laid out into the "remaining space", where "remaining space" is initially
		//		the content area of this widget, but is reduced to a smaller rectangle each time a child is added.

		// design: String
		//		Which design is used for the layout:
		//
		//		- "headline" (default) where the top and bottom extend the full width of the container
		//		- "sidebar" where the left and right sides extend from top to bottom.
		//
		//		However, a `layoutPriority` setting on child panes overrides the `design` attribute on the parent.
		//		In other words, if the top and bottom sections have a lower `layoutPriority` than the left and right
		//		panes, the top and bottom panes will extend the entire width of the box.
		design: "headline",

		baseClass: "dijitLayoutContainer",

		startup: function(){
			if(this._started){
				return;
			}
			array.forEach(this.getChildren(), this._setupChild, this);
			this.inherited(arguments);
		},

		_setupChild: function(/*dijit/_WidgetBase*/ child){
			// Override _LayoutWidget._setupChild().

			this.inherited(arguments);

			var region = child.region;
			if(region){
				domClass.add(child.domNode, this.baseClass + "Pane");
			}
		},

		_getOrderedChildren: function(){
			// summary:
			//		Return list of my children in the order that I want layoutChildren()
			//		to process them (i.e. from the outside to the inside)

			var wrappers = array.map(this.getChildren(), function(child, idx){
				return {
					pane: child,
					weight: [
						child.region == "center" ? Infinity : 0,
						child.layoutPriority,
						(this.design == "sidebar" ? 1 : -1) * (/top|bottom/.test(child.region) ? 1 : -1),
						idx
					]
				};
			}, this);
			wrappers.sort(function(a, b){
				var aw = a.weight, bw = b.weight;
				for(var i = 0; i < aw.length; i++){
					if(aw[i] != bw[i]){
						return aw[i] - bw[i];
					}
				}
				return 0;
			});

			return array.map(wrappers, function(w){ return w.pane; });
		},

		layout: function(){
			layoutUtils.layoutChildren(this.domNode, this._contentBox, this._getOrderedChildren());
		},

		addChild: function(/*dijit/_WidgetBase*/ child, /*Integer?*/ insertIndex){
			this.inherited(arguments);
			if(this._started){
				this.layout();
			}
		},

		removeChild: function(/*dijit/_WidgetBase*/ child){
			this.inherited(arguments);
			if(this._started){
				this.layout();
			}

			// Clean up whatever style changes we made to the child pane.
			// Unclear how height and width should be handled.
			domClass.remove(child.domNode, this.baseClass + "Pane");
			domStyle.set(child.domNode, {
				top: "auto",
				bottom: "auto",
				left: "auto",
				right: "auto",
				position: "static"
			});
			domStyle.set(child.domNode, /top|bottom/.test(child.region) ? "width" : "height", "auto");
		}
	});

	LayoutContainer.ChildWidgetProperties = {
		// summary:
		//		These properties can be specified for the children of a LayoutContainer.

		// region: [const] String
		//		Values: "top", "bottom", "leading", "trailing", "left", "right", "center".
		//		See the `dijit/layout/LayoutContainer` description for details.
		region: '',

		// layoutAlign: [const deprecated] String
		//		Synonym for region, except using "client" instead of "center".  Deprecated; use region instead.
		layoutAlign: '',

		// layoutPriority: [const] Number
		//		Children with a higher layoutPriority will be placed closer to the LayoutContainer center,
		//		between children with a lower layoutPriority.
		layoutPriority: 0
	};

	// Since any widget can be specified as a LayoutContainer child, mix it
	// into the base widget class.  (This is a hack, but it's effective.)
	// This is for the benefit of the parser.   Remove for 2.0.  Also, hide from doc viewer.
	lang.extend(_WidgetBase, /*===== {} || =====*/ LayoutContainer.ChildWidgetProperties);

	return LayoutContainer;
});
