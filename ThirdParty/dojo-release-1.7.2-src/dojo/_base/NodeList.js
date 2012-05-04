define(["./kernel", "../query", "./array", "./html", "../NodeList-dom"], function(dojo, query, array){
  //  module:
  //    dojo/_base/NodeList
  //  summary:
  //    This module defines dojo.NodeList.
 
var NodeList = query.NodeList;

	/*=====
	dojo.extend(dojo.NodeList, {
		connect: function(methodName, objOrFunc, funcName){
			// summary:
			//		attach event handlers to every item of the NodeList. Uses dojo.connect()
			//		so event properties are normalized
			// methodName: String
			//		the name of the method to attach to. For DOM events, this should be
			//		the lower-case name of the event
			// objOrFunc: Object|Function|String
			//		if 2 arguments are passed (methodName, objOrFunc), objOrFunc should
			//		reference a function or be the name of the function in the global
			//		namespace to attach. If 3 arguments are provided
			//		(methodName, objOrFunc, funcName), objOrFunc must be the scope to
			//		locate the bound function in
			// funcName: String?
			//		optional. A string naming the function in objOrFunc to bind to the
			//		event. May also be a function reference.
			// example:
			//		add an onclick handler to every button on the page
			//		|	dojo.query("div:nth-child(odd)").connect("onclick", function(e){
			//		|		console.log("clicked!");
			//		|	});
			// example:
			//		attach foo.bar() to every odd div's onmouseover
			//		|	dojo.query("div:nth-child(odd)").connect("onmouseover", foo, "bar");
		},
		coords: function(){
			// summary:
			//		Deprecated: Use position() for border-box x/y/w/h
			//		or marginBox() for margin-box w/h/l/t.
			//		Returns the box objects of all elements in a node list as
			//		an Array (*not* a NodeList). Acts like `dojo.coords`, though assumes
			//		the node passed is each node in this list.

			return dojo.map(this, dojo.coords); // Array
		}
	 });

	 var NodeList = dojo.NodeList;
	=====*/
	var nlp = NodeList.prototype;

	// don't bind early to dojo.connect since we no longer explicitly depend on it
	nlp.connect = NodeList._adaptAsForEach(function(){
		return dojo.connect.apply(this, arguments);
	});
	nlp.coords = NodeList._adaptAsMap(dojo.coords);

	NodeList.events = [
		// summary:
		//		list of all DOM events used in NodeList
		"blur", "focus", "change", "click", "error", "keydown", "keypress",
		"keyup", "load", "mousedown", "mouseenter", "mouseleave", "mousemove",
		"mouseout", "mouseover", "mouseup", "submit"
	];

	// FIXME: pseudo-doc the above automatically generated on-event functions

	// syntactic sugar for DOM events
	array.forEach(NodeList.events, function(evt){
			var _oe = "on" + evt;
			nlp[_oe] = function(a, b){
				return this.connect(_oe, a, b);
			};
				// FIXME: should these events trigger publishes?
				/*
				return (a ? this.connect(_oe, a, b) :
							this.forEach(function(n){
								// FIXME:
								//		listeners get buried by
								//		addEventListener and can't be dug back
								//		out to be triggered externally.
								// see:
								//		http://developer.mozilla.org/en/docs/DOM:element

								console.log(n, evt, _oe);

								// FIXME: need synthetic event support!
								var _e = { target: n, faux: true, type: evt };
								// dojo._event_listener._synthesizeEvent({}, { target: n, faux: true, type: evt });
								try{ n[evt](_e); }catch(e){ console.log(e); }
								try{ n[_oe](_e); }catch(e){ console.log(e); }
							})
				);
				*/
		}
	);

	dojo.NodeList = NodeList;
	return dojo.NodeList;
});
