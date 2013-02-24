define([
	"dojo/_base/lang",
	"dojo/query",
	"dojo/_base/NodeList",	// for this.connect()
	"dojo/NodeList-traverse"
], function(lang, query) {

// module:
//		dojox/NodeList/delegate

var NodeList = query.NodeList;

lang.extend(NodeList, {
	delegate: function(/*String*/ selector, /*String*/ eventName, /*Function*/ fn){
		// summary:
		//		Monitor nodes in this NodeList for [bubbled] events on nodes that match selector.
		//		Calls fn(evt) for those events, where (inside of fn()), this == the node
		//		that matches the selector.
		// description:
		//		Sets up event handlers that can catch events on any subnodes matching a given selector,
		//		including nodes created after delegate() has been called.
		//
		//		This allows an app to setup a single event handler on a high level node, rather than many
		//		event handlers on subnodes. For example, one onclick handler for a Tree widget, rather than separate
		//		handlers for each node in the tree.
		//		Since setting up many event handlers is expensive, this can increase performance.
		//
		//		Note that delegate() will not work for events that don't bubble, like focus.
		//		onmouseenter/onmouseleave also don't currently work.
		// selector:
		//		CSS selector valid to `dojo.query`, like ".foo" or "div > span".  The
		//		selector is relative to the nodes in this NodeList, not the document root.
		//		For example myNodeList.delegate("> a", "onclick", ...) will catch events on
		//		anchor nodes which are (immediate) children of the nodes in myNodeList.
		// eventName:
		//		Standard event name used as an argument to `dojo.connect`, like "onclick".
		// fn:
		//		Callback function passed the event object, and where this == the node that matches the selector.
		//		That means that for example, after setting up a handler via
		// |		 dojo.query("body").delegate("fieldset", "onclick", ...)
		//		clicking on a fieldset or *any nodes inside of a fieldset* will be reported
		//		as a click on the fieldset itself.
		// example:
		//	|	dojo.query("navbar").delegate("a", "onclick", function(evt){
		//	|			console.log("user clicked anchor ", this.node);
		//	|	});

		// Possible future tasks:
		//	- change signature of callback to be fn(node, evt), and then have scope argument
		//		to delegate(selector, eventName, scope, fn)?
		//	- support non-bubbling events like focus
		//	- support onmouseenter/onmouseleave
		// 	- maybe should return an array of connect handles instead, to allow undelegate()?
		//	- single node version

		return this.connect(eventName, function(evt){
			var closest = query(evt.target).closest(selector, this);
			if(closest.length){
				fn.call(closest[0], evt);
			}
		}); //dojo/NodeList
	}
});

return NodeList;
});
