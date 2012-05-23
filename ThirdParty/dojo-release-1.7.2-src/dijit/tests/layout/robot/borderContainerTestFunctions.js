			function checkInside(/*Widget*/ child, /*Widget*/ parent, /*String?*/ comment){
				// summary:
				//		Test that child is fully inside of parent

				child = dijit.byId(child);
				parent = dijit.byId(parent);

				var cp = dojo.position(child.domNode, true),
					pp = dojo.position(parent.domNode, true);

				doh.t(
					cp.y >= pp.y && cp.y+cp.h <= pp.y+pp.h &&
					cp.x >= pp.x && cp.x+cp.w <= pp.x+pp.w,
					(comment ? comment + ": " : "") + child.region + " inside " + parent.id + dojo.toJson(cp) + dojo.toJson(pp)
				);
			}
			function checkAbove(/*String*/ comment, /*Widget*/ above, /*Widget*/ below){
				// summary:
				//		Test that child is fully above parent

				above = dijit.byId(above);
				below = dijit.byId(below);

				var ap = dojo.position(above.domNode, true),
					bp = dojo.position(below.domNode, true);

				doh.t(ap.y+ap.h < bp.y,
					comment + " " + above.region + " above " + below.region + dojo.toJson(ap) + dojo.toJson(bp)
				);
			}
			function checkLeft(/*String*/ comment, /*Widget*/ left, /*Widget*/ right){
				// summary:
				//		Test that child is fully left of parent

				left = dijit.byId(left);
				right = dijit.byId(right);

				var lp = dojo.position(left.domNode, true),
					rp = dojo.position(right.domNode, true);

				doh.t(lp.x+lp.w < rp.x,
					comment + " " + left.region + " to left of " + right.region + dojo.toJson(lp) + dojo.toJson(rp)
				);
			}

			function checkBCpanes(/*BorderContainer*/ bc){
				// summary:
				//		Check that all the panes in this BorderContainer are in sane
				//		positions relative to each other.   Assumes at most one pane
				//		in each region.
				var children = bc.getChildren(),
					regions = {};

				// Check all panes inside BorderContainer
				dojo.forEach(children, function(child){
					checkInside(child, bc);
					regions[child.region] = child;
				});

				// Check pane positions relative to each other
				dojo.forEach(children, function(child){
					switch(child.region){
						case "top":
							dojo.forEach(bc.design == "sidebar" ? ["center", "bottom"] : ["left", "center", "right", "bottom"], function(region){
								if(regions[region]){
									checkAbove(bc.id, child, regions[region]);
								}
							});
							break;
						case "bottom":
							dojo.forEach(bc.design == "sidebar" ? ["center", "top"] : ["left", "center", "right", "top"], function(region){
								if(regions[region]){
									checkAbove(bc.id, regions[region], child);
								}
							});
							break;
						case "left":
							dojo.forEach(bc.design == "sidebar" ? ["top", "center", "bottom", "right"] : ["right"], function(region){
								if(regions[region]){
									checkLeft(bc.id, child, regions[region]);
								}
							});
							break;
						case "right":
							dojo.forEach(bc.design == "sidebar" ? ["top", "center", "bottom", "left"] : ["left"], function(region){
								if(regions[region]){
									checkLeft(bc.id, regions[region], child);
								}
							});
							break;
					}
				});
			}
			
			function within(/*Number*/ a, /*Number*/ b, /*Number*/ range){
				// summary:
				//		Returns true if a and b are within range
				return Math.abs(a-b) <= range;
			}
