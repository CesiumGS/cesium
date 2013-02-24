define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/config",
	"dojo/_base/window",
	"dojo/_base/Deferred",
	"dojo/ready"
], function(dojo, array, config, win, Deferred, ready){

	// module:
	//		dojox/mobile/lazyLoadUtils

	var LazyLoadUtils = function(){
		// summary:
		//		Utilities to lazy-loading of Dojo widgets.

		this._lazyNodes = [];
		var _this = this;
		if(config.parseOnLoad){
			ready(90, function(){
				var lazyNodes = array.filter(win.body().getElementsByTagName("*"), // avoid use of dojo.query
					function(n){ return n.getAttribute("lazy") === "true" || (n.getAttribute("data-dojo-props")||"").match(/lazy\s*:\s*true/); });
				var i, j, nodes, s, n;
				for(i = 0; i < lazyNodes.length; i++){
					array.forEach(["dojoType", "data-dojo-type"], function(a){
						nodes = array.filter(lazyNodes[i].getElementsByTagName("*"),
											function(n){ return n.getAttribute(a); });
						for(j = 0; j < nodes.length; j++){
							n = nodes[j];
							n.setAttribute("__" + a, n.getAttribute(a));
							n.removeAttribute(a);
							_this._lazyNodes.push(n);
						}
					});
				}
			});
		}

		ready(function(){
			for(var i = 0; i < _this._lazyNodes.length; i++){ /* 1.8 */
				var n = _this._lazyNodes[i];
				array.forEach(["dojoType", "data-dojo-type"], function(a){
					if(n.getAttribute("__" + a)){
						n.setAttribute(a, n.getAttribute("__" + a));
						n.removeAttribute("__" + a);
					}
				});
			}
			delete _this._lazyNodes;

		});

		this.instantiateLazyWidgets = function(root, requires, callback){
			// summary:
			//		Instantiates dojo widgets under the root node.
			// description:
			//		Finds DOM nodes that have the dojoType or data-dojo-type attributes,
			//		requires the found Dojo modules, and runs the parser.
			var d = new Deferred();
			var req = requires ? requires.split(/,/) : [];
			var nodes = root.getElementsByTagName("*"); // avoid use of dojo.query
			var len = nodes.length;
			for(var i = 0; i < len; i++){
				var s = nodes[i].getAttribute("dojoType") || nodes[i].getAttribute("data-dojo-type");
				if(s){
					req.push(s);
					var m = nodes[i].getAttribute("data-dojo-mixins"),
						mixins = m ? m.split(/, */) : [];
					req = req.concat(mixins);
				}
			}
			if(req.length === 0){ return true; }

			if(dojo.require){
				array.forEach(req, function(c){
					dojo["require"](c);
				});
				dojo.parser.parse(root);
				if(callback){ callback(root); }
				return true;
			}else{
				req = array.map(req, function(s){ return s.replace(/\./g, "/"); });
				require(req, function(){
					dojo.parser.parse(root);
					if(callback){ callback(root); }
					d.resolve(true);
				});
			}
			return d;
		}	
	};

	// Return singleton.  (TODO: can we replace LazyLoadUtils class and singleton w/a simple hash of functions?)
	return new LazyLoadUtils();
});

