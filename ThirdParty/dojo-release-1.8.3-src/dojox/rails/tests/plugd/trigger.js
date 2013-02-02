dojo.provide("dojox.rails.tests.plugd.trigger");
(function(d){
	
	var isfn = d.isFunction,
		leaveRe = /mouse(enter|leave)/,
		_fix = function(_, p){
			return "mouse" + (p == "enter" ? "over" : "out");
		},
		mix = d._mixin,
		
		// the guts of the node triggering logic:
		// the function accepts node (not string|node), "on"-less event name,
		// and an object of args to mix into the event.
		realTrigger = d.doc.createEvent ?
			function(n, e, a){
				// the sane branch
				var ev = d.doc.createEvent("HTMLEvents");
				e = e.replace(leaveRe, _fix);
				ev.initEvent(e, true, true);
				a && mix(ev, a);
				n.dispatchEvent(ev);
			} :
			function(n, e, a){
				// the janktastic branch
				var ev = "on" + e, stop = false, lc = e.toLowerCase(), node = n;
				try{
// FIXME: is this worth it? for mixed-case native event support:? Opera ends up in the
//	createEvent path above, and also fails on _some_ native-named events.
//					if(lc !== e && d.indexOf(d.NodeList.events, lc) >= 0){
//						// if the event is one of those listed in our NodeList list
//						// in lowercase form but is mixed case, throw to avoid
//						// fireEvent. /me sighs. http://gist.github.com/315318
//						throw("janktastic");
//					}
					n.fireEvent(ev);
				}catch(er){
                    console.warn("in catch", er);
					// a lame duck to work with. we're probably a 'custom event'
					var evdata = mix({
						type: e, target: n, faux: true,
						// HACK: [needs] added support for customStopper to _base/event.js
						// some tests will fail until del._stopPropagation has support.
						_stopper: function(){ stop = this.cancelBubble; }
					}, a);
				
					isfn(n[ev]) && n[ev](evdata);
				
					// handle bubbling of custom events, unless the event was stopped.
					while(!stop && n !== d.doc && n.parentNode){
						n = n.parentNode;
						isfn(n[ev]) && n[ev](evdata);
					}
				}
			}
	;
	
	d._trigger = function(/* DomNode|String */node, /* String */event, extraArgs){
		// summary:
		//		Helper for `dojo.trigger`, which handles the DOM cases. We should never
		//		be here without a domNode reference and a string eventname.
		var n = d.byId(node), ev = event && event.slice(0, 2) == "on" ? event.slice(2) : event;
		realTrigger(n, ev, extraArgs);

	};
		
	d.trigger = function(obj, event, extraArgs){
		// summary:
		//		Trigger some event. It can be either a Dom Event, Custom Event,
		//		or direct function call.
		//
		// description:
		//		Trigger some event. It can be either a Dom Event, Custom Event,
		//		or direct function call. NOTE: This function does not trigger
		//		default behavior, only triggers bound event listeneres. eg:
		//		one cannot trigger("anchorNode", "onclick") and expect the browser
		//		to follow the href="" attribute naturally.
		//
		// obj: String|DomNode|Object|Function
		//		An ID, or DomNode reference, from which to trigger the event.
		//		If an Object, fire the `event` in the scope of this object,
		//		similar to calling dojo.hitch(obj, event)(). The return value
		//		in this case is returned from `dojo.trigger`
		//
		// event: String|Function
		//		The name of the event to trigger. Can be any DOM level 2 event
		//		and can be in either form: "onclick" or "click" for instance.
		//		In the object-firing case, this method can be a function or
		//		a string version of a member function, just like `dojo.hitch`.
		//
		// extraArgs: Object?
		//		An object to mix into the `event` object passed to any bound
		//		listeners. Be careful not to override important members, like
		//		`type`, or `preventDefault`. It will likely error.
		//
		//		Additionally, extraArgs is moot in the object-triggering case,
		//		as all arguments beyond the `event` are curried onto the triggered
		//		function.
		//
		// example:
		//	|	dojo.connect(node, "onclick", function(e){ /* stuff */ });
		//	|	// later:
		//	|	dojo.trigger(node, "onclick");
		//
		// example:
		//	|	// or from within dojo.query: (requires dojo.NodeList)
		//	|	dojo.query("a").onclick(function(){}).trigger("onclick");
		//
		// example:
		//	|	// fire obj.method() in scope of obj
		//	|	dojo.trigger(obj, "method");
		//
		// example:
		//	|	// fire an anonymous function:
		//	|	dojo.trigger(d.global, function(){ /* stuff */ });
		//
		// example:
		//	|	// fire and anonymous function in the scope of obj
		//	|	dojo.trigger(obj, function(){ this == obj; });
		//
		// example:
		//	|	// with a connected function like:
		//	|	dojo.connect(dojo.doc, "onclick", function(e){
		//	|		if(e && e.manuallydone){
		//	|			console.log("this was a triggered onclick, not natural");
		//	|		}
		//	|	});
		//	|	// fire onclick, passing in a custom bit of info
		//	|	dojo.trigger("someId", "onclick", { manuallydone:true });
		//
		// returns: Anything
		//		Will not return anything in the Dom event case, but will return whatever
		//		return value is received from the triggered event.
		return (isfn(obj) || isfn(event) || isfn(obj[event])) ?
			d.hitch.apply(d, arguments)() : d._trigger.apply(d, arguments);
	};
	
	// adapt for dojo.query:
	/*=====
	dojo.extend(dojo.NodeList, {
		trigger: function(event, data){
			// summary:
			//		Trigger some Event originating from each of the nodes in this
			//		`dojo.NodeList`.
			//
			// event: String
			//		Any strig identifier for the event.type to be triggered.
			//
			// data: Object
			//		Just like `extraArgs` for `dojo.trigger`, additional data
			//		to mix into the event object.
			//
			// example:
			//	|	dojo.query("a").trigger("onclick");
			
			return this; // dojo.NodeList
		}
	});
	=====*/
	d.NodeList.prototype.trigger = d.NodeList._adaptAsForEach(d._trigger);

	// if the node.js module is available, extend trigger into that.
	if(d._Node && !d._Node.prototype.trigger){
		d.extend(d._Node, {
			trigger: function(ev, data){
				// summary:
				//		Fire some some event originating from this node.
				//		Only available if both the `dojo.trigger` and `dojo.node` plugin
				//		are enabled. Allows chaining as all `dojo._Node` methods do.
				//
				// ev: String
				//		Some string event name to fire. eg: "onclick", "submit"
				//
				// data: Object
				//		Just like `extraArgs` for `dojo.trigger`, additional data
				//		to mix into the event object.
				//
				// example:
				//	|	// fire onlick orginiating from a node with id="someAnchorId"
				//	|	dojo.node("someAnchorId").trigger("click");

				d._trigger(this, ev, data);
				return this; // dojo._Node
			}
		});
	}
	
})(dojo);
