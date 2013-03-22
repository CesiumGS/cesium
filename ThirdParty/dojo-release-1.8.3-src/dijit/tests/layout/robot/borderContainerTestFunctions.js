define(["dojo/_base/kernel", "dojo/_base/array", "dojo/dom-geometry", "dojo/json"], function(dojo, array, geom, json){

	function dijitById(id){
		return dojo.global.require("dijit/registry").byId(id);
	}

	var exports = {
		checkInside: function(/*Widget*/ child, /*Widget*/ parent, /*String?*/ comment){
			// summary:
			//		Test that child is fully inside of parent
	
			child = dijitById(child);
			parent = dijitById(parent);
	
			var cp = geom.position(child.domNode, true),
				pp = geom.position(parent.domNode, true);
	
			doh.t(
				cp.y >= pp.y && cp.y+cp.h <= pp.y+pp.h &&
				cp.x >= pp.x && cp.x+cp.w <= pp.x+pp.w,
				(comment ? comment + ": " : "") + child.region + " inside " + parent.id + json.stringify(cp) + json.stringify(pp)
			);
		},

		checkAbove: function(/*String*/ comment, /*Widget*/ above, /*Widget*/ below){
			// summary:
			//		Test that child is fully above parent
	
			above = dijitById(above);
			below = dijitById(below);
	
			var ap = geom.position(above.domNode, true),
				bp = geom.position(below.domNode, true);
	
			doh.t(ap.y+ap.h < bp.y,
				comment + " " + above.region + " above " + below.region + json.stringify(ap) + json.stringify(bp)
			);
		},

		checkLeft: function(/*String*/ comment, /*Widget*/ left, /*Widget*/ right){
			// summary:
			//		Test that child is fully left of parent
	
			left = dijitById(left);
			right = dijitById(right);
	
			var lp = geom.position(left.domNode, true),
				rp = geom.position(right.domNode, true);
	
			doh.t(lp.x+lp.w < rp.x,
				comment + " " + left.region + " to left of " + right.region + json.stringify(lp) + json.stringify(rp)
			);
		},

		checkBCpanes: function(/*BorderContainer*/ bc, /*String*/ comment){
			// summary:
			//		Check that all the panes in this BorderContainer are in sane
			//		positions relative to each other.   Assumes at most one pane
			//		in each region.
			var children = bc.getChildren(),
				regions = {};
	
			// Check all panes inside BorderContainer
			array.forEach(children, function(child, comment){
				exports.checkInside(child, bc, comment);
				regions[child.region] = child;
			});
	
			// Check pane positions relative to each other
			array.forEach(children, function(child){
				switch(child.region){
					case "top":
						array.forEach(bc.design == "sidebar" ? ["center", "bottom"] : ["left", "center", "right", "bottom"], function(region){
							if(regions[region]){
								exports.checkAbove(bc.id, child, regions[region], comment);
							}
						});
						break;
					case "bottom":
						array.forEach(bc.design == "sidebar" ? ["center", "top"] : ["left", "center", "right", "top"], function(region){
							if(regions[region]){
								exports.checkAbove(bc.id, regions[region], child, comment);
							}
						});
						break;
					case "left":
						array.forEach(bc.design == "sidebar" ? ["top", "center", "bottom", "right"] : ["right"], function(region){
							if(regions[region]){
								exports.checkLeft(bc.id, child, regions[region], comment);
							}
						});
						break;
					case "right":
						array.forEach(bc.design == "sidebar" ? ["top", "center", "bottom", "left"] : ["left"], function(region){
							if(regions[region]){
								exports.checkLeft(bc.id, regions[region], child, comment);
							}
						});
						break;
				}
			});
		},

		within: function(/*Number*/ a, /*Number*/ b, /*Number*/ range){
			// summary:
			//		Returns true if a and b are within range
			return Math.abs(a-b) <= range;
		}
	};

	return exports;
});