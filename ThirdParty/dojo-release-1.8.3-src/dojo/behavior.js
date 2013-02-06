define(["./_base/kernel", "./_base/lang", "./_base/array", "./_base/connect", "./query", "./ready"],
function(dojo, lang, darray, connect, query, ready){

// module:
//		dojo/behavior

dojo.deprecated("dojo.behavior", "Use dojo/on with event delegation (on.selector())");

var Behavior = function(){
	// summary:
	//		Deprecated.   dojo/behavior's functionality can be achieved using event delegation using dojo/on
	//		and on.selector().
	// description:
	//		A very simple, lightweight mechanism for applying code to
	//		existing documents, based around `dojo/query` (CSS3 selectors) for node selection,
	//		and a simple two-command API: `add()` and `apply()`;
	//
	//		Behaviors apply to a given page, and are registered following the syntax
	//		options described by `add()` to match nodes to actions, or "behaviors".
	//
	//		Added behaviors are applied to the current DOM when .apply() is called,
	//		matching only new nodes found since .apply() was last called.

	function arrIn(obj, name){
		if(!obj[name]){ obj[name] = []; }
		return obj[name];
	}

	var _inc = 0;

	function forIn(obj, scope, func){
		var tmpObj = {};
		for(var x in obj){
			if(typeof tmpObj[x] == "undefined"){
				if(!func){
					scope(obj[x], x);
				}else{
					func.call(scope, obj[x], x);
				}
			}
		}
	}

	// FIXME: need a better test so we don't exclude nightly Safari's!
	this._behaviors = {};
	this.add = function(/* Object */behaviorObj){
		// summary:
		//		Add the specified behavior to the list of behaviors, ignoring existing
		//		matches.
		// behaviorObj: Object
		//		The behavior object that will be added to behaviors list. The behaviors
		//		in the list will be applied the next time apply() is called.
		// description:
		//		Add the specified behavior to the list of behaviors which will
		//		be applied the next time apply() is called. Calls to add() for
		//		an already existing behavior do not replace the previous rules,
		//		but are instead additive. New nodes which match the rule will
		//		have all add()-ed behaviors applied to them when matched.
		//
		//		The "found" method is a generalized handler that's called as soon
		//		as the node matches the selector. Rules for values that follow also
		//		apply to the "found" key.
		//
		//		The "on*" handlers are attached with `dojo.connect()`, using the
		//		matching node
		//
		//		If the value corresponding to the ID key is a function and not a
		//		list, it's treated as though it was the value of "found".
		//
		//		dojo/behavior.add() can be called any number of times before
		//		the DOM is ready. `dojo/behavior.apply()` is called automatically
		//		by `dojo.addOnLoad`, though can be called to re-apply previously added
		//		behaviors anytime the DOM changes.
		//
		//		There are a variety of formats permitted in the behaviorObject
		//
		// example:
		//		Simple list of properties. "found" is special. "Found" is assumed if
		//		no property object for a given selector, and property is a function.
		//
		//	|	behavior.add({
		//	|		"#id": {
		//	|			"found": function(element){
		//	|				// node match found
		//	|			},
		//	|			"onclick": function(evt){
		//	|				// register onclick handler for found node
		//	|			}
		//	|		},
		// 	|		"#otherid": function(element){
		//	|			// assumes "found" with this syntax
		//	|		}
		//	|	});
		//
		// example:
		//		 If property is a string, a dojo.publish will be issued on the channel:
		//
		//	|	behavior.add({
		//	|		// topic.publish() whenever class="noclick" found on anchors
		//	|		"a.noclick": "/got/newAnchor",
		//	|		"div.wrapper": {
		//	|			"onclick": "/node/wasClicked"
		//	|		}
		//	|	});
		//	|	topic.subscribe("/got/newAnchor", function(node){
		//	|		// handle node finding when dojo/behavior.apply() is called,
		//	|		// provided a newly matched node is found.
		//	|	});
		//
		// example:
		//		Scoping can be accomplished by passing an object as a property to
		//		a connection handle (on*):
		//
		//	|	behavior.add({
		//	|		 	"#id": {
		//	|				// like calling dojo.hitch(foo,"bar"). execute foo.bar() in scope of foo
		//	|				"onmouseenter": { targetObj: foo, targetFunc: "bar" },
		//	|				"onmouseleave": { targetObj: foo, targetFunc: "baz" }
		//	|			}
		//	|	});
		//
		// example:
		//		Behaviors match on CSS3 Selectors, powered by dojo/query. Example selectors:
		//
		//	|	behavior.add({
		//	|		// match all direct descendants
		//	|		"#id4 > *": function(element){
		//	|			// ...
		//	|		},
		//	|
		//	|		// match the first child node that's an element
		//	|		"#id4 > :first-child": { ... },
		//	|
		//	|		// match the last child node that's an element
		//	|		"#id4 > :last-child":  { ... },
		//	|
		//	|		// all elements of type tagname
		//	|		"tagname": {
		//	|			// ...
		//	|		},
		//	|
		//	|		"tagname1 tagname2 tagname3": {
		//	|			// ...
		//	|		},
		//	|
		//	|		".classname": {
		//	|			// ...
		//	|		},
		//	|
		//	|		"tagname.classname": {
		//	|			// ...
		//	|		}
		//	|	});
		//

		forIn(behaviorObj, this, function(behavior, name){
			var tBehavior = arrIn(this._behaviors, name);
			if(typeof tBehavior["id"] != "number"){
				tBehavior.id = _inc++;
			}
			var cversion = [];
			tBehavior.push(cversion);
			if((lang.isString(behavior))||(lang.isFunction(behavior))){
				behavior = { found: behavior };
			}
			forIn(behavior, function(rule, ruleName){
				arrIn(cversion, ruleName).push(rule);
			});
		});
	};

	var _applyToNode = function(node, action, ruleSetName){
		if(lang.isString(action)){
			if(ruleSetName == "found"){
				connect.publish(action, [ node ]);
			}else{
				connect.connect(node, ruleSetName, function(){
					connect.publish(action, arguments);
				});
			}
		}else if(lang.isFunction(action)){
			if(ruleSetName == "found"){
				action(node);
			}else{
				connect.connect(node, ruleSetName, action);
			}
		}
	};

	this.apply = function(){
		// summary:
		//		Applies all currently registered behaviors to the document.
		//
		// description:
		//		Applies all currently registered behaviors to the document,
		//		taking care to ensure that only incremental updates are made
		//		since the last time add() or apply() were called.
		//
		//		If new matching nodes have been added, all rules in a behavior will be
		//		applied to that node. For previously matched nodes, only
		//		behaviors which have been added since the last call to apply()
		//		will be added to the nodes.
		//
		//		apply() is called once automatically by `dojo.addOnLoad`, so
		//		registering behaviors with `dojo/behavior.add()` before the DOM is
		//		ready is acceptable, provided the dojo.behavior module is ready.
		//
		//		Calling appy() manually after manipulating the DOM is required
		//		to rescan the DOM and apply newly .add()ed behaviors, or to match
		//		nodes that match existing behaviors when those nodes are added to
		//		the DOM.
		//
		forIn(this._behaviors, function(tBehavior, id){
			query(id).forEach(
				function(elem){
					var runFrom = 0;
					var bid = "_dj_behavior_"+tBehavior.id;
					if(typeof elem[bid] == "number"){
						runFrom = elem[bid];
						if(runFrom == (tBehavior.length)){
							return;
						}
					}
					// run through the versions, applying newer rules at each step

					for(var x=runFrom, tver; tver = tBehavior[x]; x++){
						forIn(tver, function(ruleSet, ruleSetName){
							if(lang.isArray(ruleSet)){
								darray.forEach(ruleSet, function(action){
									_applyToNode(elem, action, ruleSetName);
								});
							}
						});
					}

					// ensure that re-application only adds new rules to the node
					elem[bid] = tBehavior.length;
				}
			);
		});
	};
};

dojo.behavior = new Behavior();

ready(dojo.behavior, "apply"); // FIXME: should this use a priority? before/after parser priority?

return dojo.behavior;
});
