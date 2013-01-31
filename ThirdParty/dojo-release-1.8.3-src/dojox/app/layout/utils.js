define([
	"dojo/_base/array", // array.filter array.forEach
	"dojo/dom-class", // domClass.add domClass.remove
	"dojo/dom-geometry", // domGeometry.marginBox
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/_base/lang" // lang.mixin
], function(array, domClass, domGeometry, domStyle, lang){

	// module:
	//		dijit/layout/utils
	// summary:
	//		marginBox2contentBox() and layoutChildren()

	var layout = {};
	/*===== layout = dijit/layout =====*/

	layout.marginBox2contentBox = function(/*DomNode*/ node, /*Object*/ mb){
		// summary:
		//		Given the margin-box size of a node, return its content box size.
		//		Functions like domGeometry.contentBox() but is more reliable since it doesn't have
		//		to wait for the browser to compute sizes.
		var cs = domStyle.getComputedStyle(node);
		var me = domGeometry.getMarginExtents(node, cs);
		var pb = domGeometry.getPadBorderExtents(node, cs);
		return {
			l: domStyle.toPixelValue(node, cs.paddingLeft),
			t: domStyle.toPixelValue(node, cs.paddingTop),
			w: mb.w - (me.w + pb.w),
			h: mb.h - (me.h + pb.h)
		};
	};

	function capitalize(word){
		return word.substring(0,1).toUpperCase() + word.substring(1);
	}

	function size(widget, dim){
		// size the child
		var newSize = widget.resize ? widget.resize(dim) : domGeometry.setMarginBox(widget.domNode, dim);

		// record child's size
		if(newSize){
			// if the child returned it's new size then use that
			lang.mixin(widget, newSize);
		}else{
			// otherwise, call getMarginBox(), but favor our own numbers when we have them.
			// the browser lies sometimes
			lang.mixin(widget, domGeometry.getMarginBox(widget.domNode));
			lang.mixin(widget, dim);
		}
	}

	layout.layoutChildren = function(/*DomNode*/ container, /*Object*/ dim, /*Widget[]*/ children,
			/*String?*/ changedRegionId, /*Number?*/ changedRegionSize){
		// summary:
		//		Layout a bunch of child dom nodes within a parent dom node
		// container:
		//		parent node
		// dim:
		//		{l, t, w, h} object specifying dimensions of container into which to place children
		// children:
		//		An array of Widgets or at least objects containing:
		//
		//		- domNode: pointer to DOM node to position
		//		- region or layoutAlign: position to place DOM node
		//		- resize(): (optional) method to set size of node
		//		- id: (optional) Id of widgets, referenced from resize object, below.
		// changedRegionId:
		//		If specified, the slider for the region with the specified id has been dragged, and thus
		//		the region's height or width should be adjusted according to changedRegionSize
		// changedRegionSize:
		//		See changedRegionId.

		// copy dim because we are going to modify it
		dim = lang.mixin({}, dim);

		domClass.add(container, "dijitLayoutContainer");

		// Move "client" elements to the end of the array for layout.  a11y dictates that the author
		// needs to be able to put them in the document in tab-order, but this algorithm requires that
		// client be last.    TODO: move these lines to LayoutContainer?   Unneeded other places I think.
		children = array.filter(children, function(item){ return item.region != "center" && item.layoutAlign != "client"; })
			.concat(array.filter(children, function(item){ return item.region == "center" || item.layoutAlign == "client"; }));

		// set positions/sizes
		array.forEach(children, function(child){
			var elm = child.domNode,
				pos = (child.region || child.layoutAlign);
			if(!pos){
				throw new Error("No region setting for " + child.id)
			}

			// set elem to upper left corner of unused space; may move it later
			var elmStyle = elm.style;
			elmStyle.left = dim.l+"px";
			elmStyle.top = dim.t+"px";
			elmStyle.position = "absolute";

			domClass.add(elm, "dijitAlign" + capitalize(pos));

			// Size adjustments to make to this child widget
			var sizeSetting = {};

			// Check for optional size adjustment due to splitter drag (height adjustment for top/bottom align
			// panes and width adjustment for left/right align panes.
			if(changedRegionId && changedRegionId == child.id){
				sizeSetting[child.region == "top" || child.region == "bottom" ? "h" : "w"] = changedRegionSize;
			}

			// set size && adjust record of remaining space.
			// note that setting the width of a <div> may affect its height.
			if(pos == "top" || pos == "bottom"){
				sizeSetting.w = dim.w;
				size(child, sizeSetting);
				dim.h -= child.h;
				if(pos == "top"){
					dim.t += child.h;
				}else{
					elmStyle.top = dim.t + dim.h + "px";
				}
			}else if(pos == "left" || pos == "right"){
				sizeSetting.h = dim.h;
				size(child, sizeSetting);
				dim.w -= child.w;
				if(pos == "left"){
					dim.l += child.w;
				}else{
					elmStyle.left = dim.l + dim.w + "px";
				}
			}else if(pos == "client" || pos == "center"){
				size(child, dim);
			}
		});
	};


	return {
		marginBox2contentBox: layout.marginBox2contentBox,
		layoutChildren: layout.layoutChildren
	};
});
