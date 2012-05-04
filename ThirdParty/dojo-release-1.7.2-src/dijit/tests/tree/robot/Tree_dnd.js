/*
 * Helper functions for Tree_dnd.html and Tree_dnd_multiParent.html tests
 */

function setup(){
	doh.register("setup screen", function(){		
		// Hide boilerplate text so it's easier to drag on small screen
		dojo.query("h1,h2,p").style("display", "none");
	
		// Disable auto-scrolling because otherwise the viewport scrolls as doh.robot.mouseMoveAt()
		// moves the mouse, literally making the the drop target a moving target
		// (and mouseMoveAt() doesn't take this possibility into account).
		dojo.global.dojo.dnd.autoScrollNodes = function(){};
	
		// Scroll viewport to (try to) make sure that both tree and drag-source
		// are simultaneously in view.
		var scroll = dojo.position("1001").y;
		dojo.body().parentNode.scrollTop = scroll;	// works on FF
		dojo.body().scrollTop = scroll;	// works on safari
	});

	// Wait for trees to load
	doh.register("wait for load", dojo.map(["collectionsTree", "itemTree"], function(id){
		return {
			name: id,
			timeout: 10000,
			runTest: function(){
				var
					tree = dijit.byId(id),
					d, handler;
				if(!tree.rootNode){
					d = new doh.Deferred();
					handler = tree.connect(tree, "onLoad",
						function(){
							tree.disconnect(handler);
							d.callback(true);
						}
					);
					return d;
				}
			}
		};
	}));
}

function findTreeNode(/*String*/ treeId, /*String*/ label){
	// summary:
	//		Find the TreeNode with the specified label in the given tree.
	//		Assumes that there's only one TreeNode w/that label (i.e. it
	//		breaks if certain items have multiple parents and appear in the
	//		tree multiple times)
	var nodes = dojo.query(".dijitTreeLabel", treeId);
	for(var i=0; i<nodes.length; i++){
		if(innerText(nodes[i]) == label){
			return dijit.getEnclosingWidget(nodes[i]);	// TreeNode
		}
	}
	return null;
}

function findTreeNodeByPath(/*String*/ treeId, /*String[] */ path){
	// summary:
	//		Find the TreeNode with the specified path (like ["Fruits", "Apple"] in a tree like:
	//	|	* Foods
	//	|		* Vegetbles
	//	|		* Fruits
	//	|			* Orange
	//	|			* Apple
	//		Path shouldn't include the root node.

	var tree = dijit.byId(treeId);
	for(var i=0, node=tree.rootNode; i<path.length; i++){
		var pathElem = path[i], matchingChildNode;
		for(var j=0, children=node.getChildren(); j < children.length; j++){
			if(children[j].label == pathElem){
				matchingChildNode = children[j];
				break;
			}
		}
		if(!matchingChildNode){
			return null;
		}
		node = matchingChildNode;
	}
	return node;
}

function getChildrenOfItem(/*String*/ name){
	// summary:
	//		Return the children of the data store item w/the specified name
	//		Note that test_Tree_Dnd.html splits the children up into the "children"
	//		and "items" attributes.

	// Get the parent item
	// Note that the ItemFileWriteStore's callback will happen immediately.
	var myStore = dojo.global.myStore,
		parentItem;
	myStore.fetch({
		query: {name: name},
		onItem: function(item){ parentItem = item; }
	});

	// Get the children, which are stored in two separate attributes,
	// categories (like 'Fruits') and items (ie, leaf nodes)  (like 'Apple')
	return {
		categories: myStore.getValues(parentItem, 'children'),
		items: myStore.getValues(parentItem, 'items')
	};
}

function mapItemsToNames(ary){
	// summary:
	//		Convert an array of items into an array of names
	var myStore = dojo.global.myStore;
	return dojo.map(ary, function(item){
		return myStore.getValue(item, "name");
	});
}

function getNamesOfChildrenOfItem(/*String*/ name){
	// summary:
	//		Return the names of the (items that are) children of the item w/the specified name

	// Get the parent item (according to
	var obj = getChildrenOfItem(name);
	return {
		categories: mapItemsToNames(obj.categories),
		items: mapItemsToNames(obj.items)
	};
}

