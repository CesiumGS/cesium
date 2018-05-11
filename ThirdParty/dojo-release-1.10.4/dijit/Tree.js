define([
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/aspect",
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/Deferred", // Deferred
	"dojo/promise/all",
	"dojo/dom", // dom.isDescendant
	"dojo/dom-class", // domClass.add domClass.remove domClass.replace domClass.toggle
	"dojo/dom-geometry", // domGeometry.setMarginBox domGeometry.position
	"dojo/dom-style", // domStyle.set
	"dojo/errors/create", // createError
	"dojo/fx", // fxUtils.wipeIn fxUtils.wipeOut
	"dojo/has",
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys", // arrows etc.
	"dojo/_base/lang", // lang.getObject lang.mixin lang.hitch
	"dojo/on", // on(), on.selector()
	"dojo/topic",
	"dojo/touch",
	"dojo/when",
	"./a11yclick",
	"./focus",
	"./registry", // registry.byNode(), registry.getEnclosingWidget()
	"./_base/manager", // manager.defaultDuration
	"./_Widget",
	"./_TemplatedMixin",
	"./_Container",
	"./_Contained",
	"./_CssStateMixin",
	"./_KeyNavMixin",
	"dojo/text!./templates/TreeNode.html",
	"dojo/text!./templates/Tree.html",
	"./tree/TreeStoreModel",
	"./tree/ForestStoreModel",
	"./tree/_dndSelector",
	"dojo/query!css2"	// needed when on.selector() used with a string for the selector
], function(array, aspect, cookie, declare, Deferred, all,
			dom, domClass, domGeometry, domStyle, createError, fxUtils, has, kernel, keys, lang, on, topic, touch, when,
			a11yclick, focus, registry, manager, _Widget, _TemplatedMixin, _Container, _Contained, _CssStateMixin, _KeyNavMixin,
			treeNodeTemplate, treeTemplate, TreeStoreModel, ForestStoreModel, _dndSelector){

	// module:
	//		dijit/Tree

	function shimmedPromise(/*Deferred|Promise*/ d){
		// summary:
		//		Return a Promise based on given Deferred or Promise, with back-compat addCallback() and addErrback() shims
		//		added (TODO: remove those back-compat shims, and this method, for 2.0)

		return lang.delegate(d.promise || d, {
			addCallback: function(callback){
				this.then(callback);
			},
			addErrback: function(errback){
				this.otherwise(errback);
			}
		});
	}

	var TreeNode = declare("dijit._TreeNode", [_Widget, _TemplatedMixin, _Container, _Contained, _CssStateMixin], {
		// summary:
		//		Single node within a tree.   This class is used internally
		//		by Tree and should not be accessed directly.
		// tags:
		//		private

		// item: [const] Item
		//		the dojo.data entry this tree represents
		item: null,

		// isTreeNode: [protected] Boolean
		//		Indicates that this is a TreeNode.   Used by `dijit.Tree` only,
		//		should not be accessed directly.
		isTreeNode: true,

		// label: String
		//		Text of this tree node
		label: "",
		_setLabelAttr: function(val){
			this.labelNode[this.labelType == "html" ? "innerHTML" : "innerText" in this.labelNode ?
				"innerText" : "textContent"] = val;
			this._set("label", val);
		},

		// labelType: [const] String
		//		Specifies how to interpret the label.  Can be "html" or "text".
		labelType: "text",

		// isExpandable: [private] Boolean
		//		This node has children, so show the expando node (+ sign)
		isExpandable: null,

		// isExpanded: [readonly] Boolean
		//		This node is currently expanded (ie, opened)
		isExpanded: false,

		// state: [private] String
		//		Dynamic loading-related stuff.
		//		When an empty folder node appears, it is "NotLoaded" first,
		//		then after dojo.data query it becomes "Loading" and, finally "Loaded"
		state: "NotLoaded",

		templateString: treeNodeTemplate,

		baseClass: "dijitTreeNode",

		// For hover effect for tree node, and focus effect for label
		cssStateNodes: {
			rowNode: "dijitTreeRow"
		},

		// Tooltip is defined in _WidgetBase but we need to handle the mapping to DOM here
		_setTooltipAttr: {node: "rowNode", type: "attribute", attribute: "title"},

		buildRendering: function(){
			this.inherited(arguments);

			// set expand icon for leaf
			this._setExpando();

			// set icon and label class based on item
			this._updateItemClasses(this.item);

			if(this.isExpandable){
				this.labelNode.setAttribute("aria-expanded", this.isExpanded);
			}

			//aria-selected should be false on all selectable elements.
			this.setSelected(false);
		},

		_setIndentAttr: function(indent){
			// summary:
			//		Tell this node how many levels it should be indented
			// description:
			//		0 for top level nodes, 1 for their children, 2 for their
			//		grandchildren, etc.

			// Math.max() is to prevent negative padding on hidden root node (when indent == -1)
			var pixels = (Math.max(indent, 0) * this.tree._nodePixelIndent) + "px";

			domStyle.set(this.domNode, "backgroundPosition", pixels + " 0px");	// TODOC: what is this for???
			domStyle.set(this.rowNode, this.isLeftToRight() ? "paddingLeft" : "paddingRight", pixels);

			array.forEach(this.getChildren(), function(child){
				child.set("indent", indent + 1);
			});

			this._set("indent", indent);
		},

		markProcessing: function(){
			// summary:
			//		Visually denote that tree is loading data, etc.
			// tags:
			//		private
			this.state = "Loading";
			this._setExpando(true);
		},

		unmarkProcessing: function(){
			// summary:
			//		Clear markup from markProcessing() call
			// tags:
			//		private
			this._setExpando(false);
		},

		_updateItemClasses: function(item){
			// summary:
			//		Set appropriate CSS classes for icon and label dom node
			//		(used to allow for item updates to change respective CSS)
			// tags:
			//		private
			var tree = this.tree, model = tree.model;
			if(tree._v10Compat && item === model.root){
				// For back-compat with 1.0, need to use null to specify root item (TODO: remove in 2.0)
				item = null;
			}
			this._applyClassAndStyle(item, "icon", "Icon");
			this._applyClassAndStyle(item, "label", "Label");
			this._applyClassAndStyle(item, "row", "Row");

			this.tree._startPaint(true);		// signifies paint started and finished (synchronously)
		},

		_applyClassAndStyle: function(item, lower, upper){
			// summary:
			//		Set the appropriate CSS classes and styles for labels, icons and rows.
			//
			// item:
			//		The data item.
			//
			// lower:
			//		The lower case attribute to use, e.g. 'icon', 'label' or 'row'.
			//
			// upper:
			//		The upper case attribute to use, e.g. 'Icon', 'Label' or 'Row'.
			//
			// tags:
			//		private

			var clsName = "_" + lower + "Class";
			var nodeName = lower + "Node";
			var oldCls = this[clsName];

			this[clsName] = this.tree["get" + upper + "Class"](item, this.isExpanded);
			domClass.replace(this[nodeName], this[clsName] || "", oldCls || "");

			domStyle.set(this[nodeName], this.tree["get" + upper + "Style"](item, this.isExpanded) || {});
		},

		_updateLayout: function(){
			// summary:
			//		Set appropriate CSS classes for this.domNode
			// tags:
			//		private

			// if we are hiding the root node then make every first level child look like a root node
			var parent = this.getParent(),
				markAsRoot = !parent || !parent.rowNode || parent.rowNode.style.display == "none";
			domClass.toggle(this.domNode, "dijitTreeIsRoot", markAsRoot);

			domClass.toggle(this.domNode, "dijitTreeIsLast", !markAsRoot && !this.getNextSibling());
		},

		_setExpando: function(/*Boolean*/ processing){
			// summary:
			//		Set the right image for the expando node
			// tags:
			//		private

			var styles = ["dijitTreeExpandoLoading", "dijitTreeExpandoOpened",
					"dijitTreeExpandoClosed", "dijitTreeExpandoLeaf"],
				_a11yStates = ["*", "-", "+", "*"],
				idx = processing ? 0 : (this.isExpandable ? (this.isExpanded ? 1 : 2) : 3);

			// apply the appropriate class to the expando node
			domClass.replace(this.expandoNode, styles[idx], styles);

			// provide a non-image based indicator for images-off mode
			this.expandoNodeText.innerHTML = _a11yStates[idx];

		},

		expand: function(){
			// summary:
			//		Show my children
			// returns:
			//		Promise that resolves when expansion is complete

			// If there's already an expand in progress or we are already expanded, just return
			if(this._expandDeferred){
				return shimmedPromise(this._expandDeferred);		// dojo/promise/Promise
			}

			// cancel in progress collapse operation
			if(this._collapseDeferred){
				this._collapseDeferred.cancel();
				delete this._collapseDeferred;
			}

			// All the state information for when a node is expanded, maybe this should be
			// set when the animation completes instead
			this.isExpanded = true;
			this.labelNode.setAttribute("aria-expanded", "true");
			if(this.tree.showRoot || this !== this.tree.rootNode){
				this.containerNode.setAttribute("role", "group");
			}
			domClass.add(this.contentNode, 'dijitTreeContentExpanded');
			this._setExpando();
			this._updateItemClasses(this.item);

			if(this == this.tree.rootNode && this.tree.showRoot){
				this.tree.domNode.setAttribute("aria-expanded", "true");
			}

			var wipeIn = fxUtils.wipeIn({
				node: this.containerNode,
				duration: manager.defaultDuration
			});

			// Deferred that fires when expand is complete
			var def = (this._expandDeferred = new Deferred(function(){
				// Canceller
				wipeIn.stop();
			}));

			aspect.after(wipeIn, "onEnd", function(){
				def.resolve(true);
			}, true);

			wipeIn.play();

			return shimmedPromise(def);		// dojo/promise/Promise
		},

		collapse: function(){
			// summary:
			//		Collapse this node (if it's expanded)
			// returns:
			//		Promise that resolves when collapse is complete

			if(this._collapseDeferred){
				// Node is already collapsed, or there's a collapse in progress, just return that Deferred
				return shimmedPromise(this._collapseDeferred);
			}

			// cancel in progress expand operation
			if(this._expandDeferred){
				this._expandDeferred.cancel();
				delete this._expandDeferred;
			}

			this.isExpanded = false;
			this.labelNode.setAttribute("aria-expanded", "false");
			if(this == this.tree.rootNode && this.tree.showRoot){
				this.tree.domNode.setAttribute("aria-expanded", "false");
			}
			domClass.remove(this.contentNode, 'dijitTreeContentExpanded');
			this._setExpando();
			this._updateItemClasses(this.item);

			var wipeOut = fxUtils.wipeOut({
				node: this.containerNode,
				duration: manager.defaultDuration
			});

			// Deferred that fires when expand is complete
			var def = (this._collapseDeferred = new Deferred(function(){
				// Canceller
				wipeOut.stop();
			}));

			aspect.after(wipeOut, "onEnd", function(){
				def.resolve(true);
			}, true);

			wipeOut.play();

			return shimmedPromise(def);		// dojo/promise/Promise
		},

		// indent: Integer
		//		Levels from this node to the root node
		indent: 0,

		setChildItems: function(/* Object[] */ items){
			// summary:
			//		Sets the child items of this node, removing/adding nodes
			//		from current children to match specified items[] array.
			//		Also, if this.persist == true, expands any children that were previously
			//		opened.
			// returns:
			//		Promise that resolves after all previously opened children
			//		have been expanded again (or fires instantly if there are no such children).

			var tree = this.tree,
				model = tree.model,
				defs = [];	// list of deferreds that need to fire before I am complete


			var focusedChild = tree.focusedChild;

			// Orphan all my existing children.
			// If items contains some of the same items as before then we will reattach them.
			// Don't call this.removeChild() because that will collapse the tree etc.
			var oldChildren = this.getChildren();
			array.forEach(oldChildren, function(child){
				_Container.prototype.removeChild.call(this, child);
			}, this);

			// All the old children of this TreeNode are subject for destruction if
			//		1) they aren't listed in the new children array (items)
			//		2) they aren't immediately adopted by another node (DnD)
			this.defer(function(){
				array.forEach(oldChildren, function(node){
					if(!node._destroyed && !node.getParent()){
						// If node is in selection then remove it.
						tree.dndController.removeTreeNode(node);

						// Deregister mapping from item id --> this node and its descendants
						function remove(node){
							var id = model.getIdentity(node.item),
								ary = tree._itemNodesMap[id];
							if(ary.length == 1){
								delete tree._itemNodesMap[id];
							}else{
								var index = array.indexOf(ary, node);
								if(index != -1){
									ary.splice(index, 1);
								}
							}
							array.forEach(node.getChildren(), remove);
						}

						remove(node);

						// Remove any entries involving this node from cookie tracking expanded nodes
						if(tree.persist){
							var destroyedPath = array.map(node.getTreePath(),function(item){
								return tree.model.getIdentity(item);
							}).join("/");
							for(var path in tree._openedNodes){
								if(path.substr(0, destroyedPath.length) == destroyedPath){
									delete tree._openedNodes[path];
								}
							}
							tree._saveExpandedNodes();
						}

						// If we've orphaned the focused node then move focus to the root node
						if(tree.lastFocusedChild && !dom.isDescendant(tree.lastFocusedChild, tree.domNode)){
							delete tree.lastFocusedChild;
						}
						if(focusedChild && !dom.isDescendant(focusedChild, tree.domNode)){
							tree.focus();	// could alternately focus this node (parent of the deleted node)
						}

						// And finally we can destroy the node
						node.destroyRecursive();
					}
				});

			});

			this.state = "Loaded";

			if(items && items.length > 0){
				this.isExpandable = true;

				// Create _TreeNode widget for each specified tree node, unless one already
				// exists and isn't being used (presumably it's from a DnD move and was recently
				// released
				array.forEach(items, function(item){    // MARKER: REUSE NODE
					var id = model.getIdentity(item),
						existingNodes = tree._itemNodesMap[id],
						node;
					if(existingNodes){
						for(var i = 0; i < existingNodes.length; i++){
							if(existingNodes[i] && !existingNodes[i].getParent()){
								node = existingNodes[i];
								node.set('indent', this.indent + 1);
								break;
							}
						}
					}
					if(!node){
						node = this.tree._createTreeNode({
							item: item,
							tree: tree,
							isExpandable: model.mayHaveChildren(item),
							label: tree.getLabel(item),
							labelType: (tree.model && tree.model.labelType) || "text",
							tooltip: tree.getTooltip(item),
							ownerDocument: tree.ownerDocument,
							dir: tree.dir,
							lang: tree.lang,
							textDir: tree.textDir,
							indent: this.indent + 1
						});
						if(existingNodes){
							existingNodes.push(node);
						}else{
							tree._itemNodesMap[id] = [node];
						}
					}
					this.addChild(node);

					// If node was previously opened then open it again now (this may trigger
					// more data store accesses, recursively)
					if(this.tree.autoExpand || this.tree._state(node)){
						defs.push(tree._expandNode(node));
					}
				}, this);

				// note that updateLayout() needs to be called on each child after
				// _all_ the children exist
				array.forEach(this.getChildren(), function(child){
					child._updateLayout();
				});
			}else{
				this.isExpandable = false;
			}

			if(this._setExpando){
				// change expando to/from dot or + icon, as appropriate
				this._setExpando(false);
			}

			// Set leaf icon or folder icon, as appropriate
			this._updateItemClasses(this.item);

			var def = all(defs);
			this.tree._startPaint(def);		// to reset TreeNode widths after an item is added/removed from the Tree
			return shimmedPromise(def);		// dojo/promise/Promise
		},

		getTreePath: function(){
			var node = this;
			var path = [];
			while(node && node !== this.tree.rootNode){
				path.unshift(node.item);
				node = node.getParent();
			}
			path.unshift(this.tree.rootNode.item);

			return path;
		},

		getIdentity: function(){
			return this.tree.model.getIdentity(this.item);
		},

		removeChild: function(/* treeNode */ node){
			this.inherited(arguments);

			var children = this.getChildren();
			if(children.length == 0){
				this.isExpandable = false;
				this.collapse();
			}

			array.forEach(children, function(child){
				child._updateLayout();
			});
		},

		makeExpandable: function(){
			// summary:
			//		if this node wasn't already showing the expando node,
			//		turn it into one and call _setExpando()

			// TODO: hmm this isn't called from anywhere, maybe should remove it for 2.0

			this.isExpandable = true;
			this._setExpando(false);
		},

		setSelected: function(/*Boolean*/ selected){
			// summary:
			//		A Tree has a (single) currently selected node.
			//		Mark that this node is/isn't that currently selected node.
			// description:
			//		In particular, setting a node as selected involves setting tabIndex
			//		so that when user tabs to the tree, focus will go to that node (only).
			this.labelNode.setAttribute("aria-selected", selected ? "true" : "false");
			domClass.toggle(this.rowNode, "dijitTreeRowSelected", selected);
		},

		focus: function(){
			focus.focus(this.focusNode);
		}
	});

	if(has("dojo-bidi")){
		TreeNode.extend({
			_setTextDirAttr: function(textDir){
				if(textDir && ((this.textDir != textDir) || !this._created)){
					this._set("textDir", textDir);
					this.applyTextDir(this.labelNode);
					array.forEach(this.getChildren(), function(childNode){
						childNode.set("textDir", textDir);
					}, this);
				}
			}
		});
	}

	var Tree = declare("dijit.Tree", [_Widget, _KeyNavMixin, _TemplatedMixin, _CssStateMixin], {
		// summary:
		//		This widget displays hierarchical data from a store.

		baseClass: "dijitTree",

		// store: [deprecated] String|dojo/data/Store
		//		Deprecated.  Use "model" parameter instead.
		//		The store to get data to display in the tree.
		store: null,

		// model: [const] dijit/tree/model
		//		Interface to read tree data, get notifications of changes to tree data,
		//		and for handling drop operations (i.e drag and drop onto the tree)
		model: null,

		// query: [deprecated] anything
		//		Deprecated.  User should specify query to the model directly instead.
		//		Specifies datastore query to return the root item or top items for the tree.
		query: null,

		// label: [deprecated] String
		//		Deprecated.  Use dijit/tree/ForestStoreModel directly instead.
		//		Used in conjunction with query parameter.
		//		If a query is specified (rather than a root node id), and a label is also specified,
		//		then a fake root node is created and displayed, with this label.
		label: "",

		// showRoot: [const] Boolean
		//		Should the root node be displayed, or hidden?
		showRoot: true,

		// childrenAttr: [deprecated] String[]
		//		Deprecated.   This information should be specified in the model.
		//		One ore more attributes that holds children of a tree node
		childrenAttr: ["children"],

		// paths: String[][] or Item[][]
		//		Full paths from rootNode to selected nodes expressed as array of items or array of ids.
		//		Since setting the paths may be asynchronous (because of waiting on dojo.data), set("paths", ...)
		//		returns a Promise to indicate when the set is complete.
		paths: [],

		// path: String[] or Item[]
		//		Backward compatible singular variant of paths.
		path: [],

		// selectedItems: [readonly] Item[]
		//		The currently selected items in this tree.
		//		This property can only be set (via set('selectedItems', ...)) when that item is already
		//		visible in the tree.   (I.e. the tree has already been expanded to show that node.)
		//		Should generally use `paths` attribute to set the selected items instead.
		selectedItems: null,

		// selectedItem: [readonly] Item
		//		Backward compatible singular variant of selectedItems.
		selectedItem: null,

		// openOnClick: Boolean
		//		If true, clicking a folder node's label will open it, rather than calling onClick()
		openOnClick: false,

		// openOnDblClick: Boolean
		//		If true, double-clicking a folder node's label will open it, rather than calling onDblClick()
		openOnDblClick: false,

		templateString: treeTemplate,

		// persist: Boolean
		//		Enables/disables use of cookies for state saving.
		persist: false,

		// autoExpand: Boolean
		//		Fully expand the tree on load.   Overrides `persist`.
		autoExpand: false,

		// dndController: [protected] Function|String
		//		Class to use as as the dnd controller.  Specifying this class enables DnD.
		//		Generally you should specify this as dijit/tree/dndSource.
		//		Setting of dijit/tree/_dndSelector handles selection only (no actual DnD).
		dndController: _dndSelector,

		// parameters to pull off of the tree and pass on to the dndController as its params
		dndParams: ["onDndDrop", "itemCreator", "onDndCancel", "checkAcceptance", "checkItemAcceptance", "dragThreshold", "betweenThreshold"],

		//declare the above items so they can be pulled from the tree's markup

		// onDndDrop: [protected] Function
		//		Parameter to dndController, see `dijit/tree/dndSource.onDndDrop()`.
		//		Generally this doesn't need to be set.
		onDndDrop: null,

		itemCreator: null,
		/*=====
		itemCreator: function(nodes, target, source){
			// summary:
			//		Returns objects passed to `Tree.model.newItem()` based on DnD nodes
			//		dropped onto the tree.   Developer must override this method to enable
			//		dropping from external sources onto this Tree, unless the Tree.model's items
			//		happen to look like {id: 123, name: "Apple" } with no other attributes.
			//
			//		For each node in nodes[], which came from source, create a hash of name/value
			//		pairs to be passed to Tree.model.newItem().  Returns array of those hashes.
			// nodes: DomNode[]
			//		The DOMNodes dragged from the source container
			// target: DomNode
			//		The target TreeNode.rowNode
			// source: dojo/dnd/Source
			//		The source container the nodes were dragged from, perhaps another Tree or a plain dojo/dnd/Source
			// returns: Object[]
			//		Array of name/value hashes for each new item to be added to the Tree, like:
			// |	[
			// |		{ id: 123, label: "apple", foo: "bar" },
			// |		{ id: 456, label: "pear", zaz: "bam" }
			// |	]
			// tags:
			//		extension
			return [{}];
		},
		=====*/

		// onDndCancel: [protected] Function
		//		Parameter to dndController, see `dijit/tree/dndSource.onDndCancel()`.
		//		Generally this doesn't need to be set.
		onDndCancel: null,

		/*=====
		checkAcceptance: function(source, nodes){
			// summary:
			//		Checks if the Tree itself can accept nodes from this source
			// source: dijit/tree/dndSource
			//		The source which provides items
			// nodes: DOMNode[]
			//		Array of DOM nodes corresponding to nodes being dropped, dijitTreeRow nodes if
			//		source is a dijit/Tree.
			// tags:
			//		extension
			return true;	// Boolean
		},
		=====*/
		checkAcceptance: null,

		/*=====
		checkItemAcceptance: function(target, source, position){
			// summary:
			//		Stub function to be overridden if one wants to check for the ability to drop at the node/item level
			// description:
			//		In the base case, this is called to check if target can become a child of source.
			//		When betweenThreshold is set, position="before" or "after" means that we
			//		are asking if the source node can be dropped before/after the target node.
			// target: DOMNode
			//		The dijitTreeRoot DOM node inside of the TreeNode that we are dropping on to
			//		Use registry.getEnclosingWidget(target) to get the TreeNode.
			// source: dijit/tree/dndSource
			//		The (set of) nodes we are dropping
			// position: String
			//		"over", "before", or "after"
			// tags:
			//		extension
			return true;	// Boolean
		},
		=====*/
		checkItemAcceptance: null,

		// dragThreshold: Integer
		//		Number of pixels mouse moves before it's considered the start of a drag operation
		dragThreshold: 5,

		// betweenThreshold: Integer
		//		Set to a positive value to allow drag and drop "between" nodes.
		//
		//		If during DnD mouse is over a (target) node but less than betweenThreshold
		//		pixels from the bottom edge, dropping the the dragged node will make it
		//		the next sibling of the target node, rather than the child.
		//
		//		Similarly, if mouse is over a target node but less that betweenThreshold
		//		pixels from the top edge, dropping the dragged node will make it
		//		the target node's previous sibling rather than the target node's child.
		betweenThreshold: 0,

		// _nodePixelIndent: Integer
		//		Number of pixels to indent tree nodes (relative to parent node).
		//		Default is 19 but can be overridden by setting CSS class dijitTreeIndent
		//		and calling resize() or startup() on tree after it's in the DOM.
		_nodePixelIndent: 19,

		_publish: function(/*String*/ topicName, /*Object*/ message){
			// summary:
			//		Publish a message for this widget/topic
			topic.publish(this.id, lang.mixin({tree: this, event: topicName}, message || {}));	// publish
		},

		postMixInProperties: function(){
			this.tree = this;

			if(this.autoExpand){
				// There's little point in saving opened/closed state of nodes for a Tree
				// that initially opens all it's nodes.
				this.persist = false;
			}

			this._itemNodesMap = {};

			if(!this.cookieName && this.id){
				this.cookieName = this.id + "SaveStateCookie";
			}

			// Deferred that resolves when all the children have loaded.
			this.expandChildrenDeferred = new Deferred();

			// Promise that resolves when all pending operations complete.
			this.pendingCommandsPromise = this.expandChildrenDeferred.promise;

			this.inherited(arguments);
		},

		postCreate: function(){
			this._initState();

			// Catch events on TreeNodes
			var self = this;
			this.own(
				on(this.containerNode, on.selector(".dijitTreeNode", touch.enter), function(evt){
					self._onNodeMouseEnter(registry.byNode(this), evt);
				}),
				on(this.containerNode, on.selector(".dijitTreeNode", touch.leave), function(evt){
					self._onNodeMouseLeave(registry.byNode(this), evt);
				}),
				on(this.containerNode, on.selector(".dijitTreeRow", a11yclick.press), function(evt){
					self._onNodePress(registry.getEnclosingWidget(this), evt);
				}),
				on(this.containerNode, on.selector(".dijitTreeRow", a11yclick), function(evt){
					self._onClick(registry.getEnclosingWidget(this), evt);
				}),
				on(this.containerNode, on.selector(".dijitTreeRow", "dblclick"), function(evt){
					self._onDblClick(registry.getEnclosingWidget(this), evt);
				})
			);

			// Create glue between store and Tree, if not specified directly by user
			if(!this.model){
				this._store2model();
			}

			// monitor changes to items
			this.own(
				aspect.after(this.model, "onChange", lang.hitch(this, "_onItemChange"), true),
				aspect.after(this.model, "onChildrenChange", lang.hitch(this, "_onItemChildrenChange"), true),
				aspect.after(this.model, "onDelete", lang.hitch(this, "_onItemDelete"), true)
			);

			this.inherited(arguments);

			if(this.dndController){
				// TODO: remove string support in 2.0.
				if(lang.isString(this.dndController)){
					this.dndController = lang.getObject(this.dndController);
				}
				var params = {};
				for(var i = 0; i < this.dndParams.length; i++){
					if(this[this.dndParams[i]]){
						params[this.dndParams[i]] = this[this.dndParams[i]];
					}
				}
				this.dndController = new this.dndController(this, params);
			}

			this._load();

			// onLoadDeferred should fire when all commands that are part of initialization have completed.
			// It will include all the set("paths", ...) commands that happen during initialization.
			this.onLoadDeferred = shimmedPromise(this.pendingCommandsPromise);

			this.onLoadDeferred.then(lang.hitch(this, "onLoad"));
		},

		_store2model: function(){
			// summary:
			//		User specified a store&query rather than model, so create model from store/query
			this._v10Compat = true;
			kernel.deprecated("Tree: from version 2.0, should specify a model object rather than a store/query");

			var modelParams = {
				id: this.id + "_ForestStoreModel",
				store: this.store,
				query: this.query,
				childrenAttrs: this.childrenAttr
			};

			// Only override the model's mayHaveChildren() method if the user has specified an override
			if(this.params.mayHaveChildren){
				modelParams.mayHaveChildren = lang.hitch(this, "mayHaveChildren");
			}

			if(this.params.getItemChildren){
				modelParams.getChildren = lang.hitch(this, function(item, onComplete, onError){
					this.getItemChildren((this._v10Compat && item === this.model.root) ? null : item, onComplete, onError);
				});
			}
			this.model = new ForestStoreModel(modelParams);

			// For backwards compatibility, the visibility of the root node is controlled by
			// whether or not the user has specified a label
			this.showRoot = Boolean(this.label);
		},

		onLoad: function(){
			// summary:
			//		Called when tree finishes loading and expanding.
			// description:
			//		If persist == true the loading may encompass many levels of fetches
			//		from the data store, each asynchronous.   Waits for all to finish.
			// tags:
			//		callback
		},

		_load: function(){
			// summary:
			//		Initial load of the tree.
			//		Load root node (possibly hidden) and it's children.
			this.model.getRoot(
				lang.hitch(this, function(item){
					var rn = (this.rootNode = this.tree._createTreeNode({
						item: item,
						tree: this,
						isExpandable: true,
						label: this.label || this.getLabel(item),
						labelType: this.model.labelType || "text",
						textDir: this.textDir,
						indent: this.showRoot ? 0 : -1
					}));

					if(!this.showRoot){
						rn.rowNode.style.display = "none";
						// if root is not visible, move tree role to the invisible
						// root node's containerNode, see #12135
						this.domNode.setAttribute("role", "presentation");
						this.domNode.removeAttribute("aria-expanded");
						this.domNode.removeAttribute("aria-multiselectable");

						// move the aria-label or aria-labelledby to the element with the role
						if(this["aria-label"]){
							rn.containerNode.setAttribute("aria-label", this["aria-label"]);
							this.domNode.removeAttribute("aria-label");
						}else if(this["aria-labelledby"]){
							rn.containerNode.setAttribute("aria-labelledby", this["aria-labelledby"]);
							this.domNode.removeAttribute("aria-labelledby");
						}
						rn.labelNode.setAttribute("role", "presentation");
						rn.containerNode.setAttribute("role", "tree");
						rn.containerNode.setAttribute("aria-expanded", "true");
						rn.containerNode.setAttribute("aria-multiselectable", !this.dndController.singular);
					}else{
						this.domNode.setAttribute("aria-multiselectable", !this.dndController.singular);
						this.rootLoadingIndicator.style.display = "none";
					}

					this.containerNode.appendChild(rn.domNode);
					var identity = this.model.getIdentity(item);
					if(this._itemNodesMap[identity]){
						this._itemNodesMap[identity].push(rn);
					}else{
						this._itemNodesMap[identity] = [rn];
					}

					rn._updateLayout();		// sets "dijitTreeIsRoot" CSS classname

					// Load top level children, and if persist==true, all nodes that were previously opened
					this._expandNode(rn).then(lang.hitch(this, function(){
						// Then, select the nodes specified by params.paths[], assuming Tree hasn't been deleted.
						if(!this._destroyed){
							this.rootLoadingIndicator.style.display = "none";
							this.expandChildrenDeferred.resolve(true);
						}
					}));
				}),
				lang.hitch(this, function(err){
					console.error(this, ": error loading root: ", err);
				})
			);
		},

		getNodesByItem: function(/*Item or id*/ item){
			// summary:
			//		Returns all tree nodes that refer to an item
			// returns:
			//		Array of tree nodes that refer to passed item

			if(!item){
				return [];
			}
			var identity = lang.isString(item) ? item : this.model.getIdentity(item);
			// return a copy so widget don't get messed up by changes to returned array
			return [].concat(this._itemNodesMap[identity]);
		},

		_setSelectedItemAttr: function(/*Item or id*/ item){
			this.set('selectedItems', [item]);
		},

		_setSelectedItemsAttr: function(/*Items or ids*/ items){
			// summary:
			//		Select tree nodes related to passed items.
			//		WARNING: if model use multi-parented items or desired tree node isn't already loaded
			//		behavior is undefined. Use set('paths', ...) instead.
			var tree = this;
			return this.pendingCommandsPromise = this.pendingCommandsPromise.always(lang.hitch(this, function(){
				var identities = array.map(items, function(item){
					return (!item || lang.isString(item)) ? item : tree.model.getIdentity(item);
				});
				var nodes = [];
				array.forEach(identities, function(id){
					nodes = nodes.concat(tree._itemNodesMap[id] || []);
				});
				this.set('selectedNodes', nodes);
			}));
		},

		_setPathAttr: function(/*Item[]|String[]*/ path){
			// summary:
			//		Singular variant of _setPathsAttr
			if(path.length){
				return shimmedPromise(this.set("paths", [path]).then(function(paths){ return paths[0]; }));
			}else{
				// Empty list is interpreted as "select nothing"
				return shimmedPromise(this.set("paths", []).then(function(paths){ return paths[0]; }));
			}
		},

		_setPathsAttr: function(/*Item[][]|String[][]*/ paths){
			// summary:
			//		Select the tree nodes identified by passed paths.
			// paths:
			//		Array of arrays of items or item id's
			// returns:
			//		Promise to indicate when the set is complete

			var tree = this;

			function selectPath(path, nodes){
				// Traverse path, returning Promise for node at the end of the path.
				// The next path component should be among "nodes".
				var nextPath = path.shift();
				var nextNode = array.filter(nodes, function(node){
					return node.getIdentity() == nextPath;
				})[0];
				if(!!nextNode){
					if(path.length){
						return tree._expandNode(nextNode).then(function(){
							return selectPath(path, nextNode.getChildren());
						});
					}else{
						// Successfully reached the end of this path
						return nextNode;
					}
				}else{
					throw new Tree.PathError("Could not expand path at " + nextPath);
				}
			}

			// Let any previous set("path", ...) commands complete before this one starts.
			// TODO for 2.0: make the user do this wait themselves?
			return shimmedPromise(this.pendingCommandsPromise = this.pendingCommandsPromise.always(function(){
				// We may need to wait for some nodes to expand, so setting
				// each path will involve a Deferred. We bring those deferreds
				// together with a dojo/promise/all.
				return all(array.map(paths, function(path){
					// normalize path to use identity
					path = array.map(path, function(item){
						return lang.isString(item) ? item : tree.model.getIdentity(item);
					});

					if(path.length){
						return selectPath(path, [tree.rootNode]);
					}else{
						throw new Tree.PathError("Empty path");
					}
				}));
			}).then(function setNodes(newNodes){
				// After all expansion is finished, set the selection to last element from each path
				tree.set("selectedNodes", newNodes);
				return tree.paths;
			}));
		},

		_setSelectedNodeAttr: function(node){
			this.set('selectedNodes', [node]);
		},
		_setSelectedNodesAttr: function(nodes){
			// summary:
			//		Marks the specified TreeNodes as selected.
			// nodes: TreeNode[]
			//		TreeNodes to mark.
			this.dndController.setSelection(nodes);
		},


		expandAll: function(){
			// summary:
			//		Expand all nodes in the tree
			// returns:
			//		Promise that resolves when all nodes have expanded

			var _this = this;

			function expand(node){
				// Expand the node
				return _this._expandNode(node).then(function(){
					// When node has expanded, call expand() recursively on each non-leaf child
					var childBranches = array.filter(node.getChildren() || [], function(node){
						return node.isExpandable;
					});

					// And when all those recursive calls finish, signal that I'm finished
					return all(array.map(childBranches, expand));
				});
			}

			return shimmedPromise(expand(this.rootNode));
		},

		collapseAll: function(){
			// summary:
			//		Collapse all nodes in the tree
			// returns:
			//		Promise that resolves when all nodes have collapsed

			var _this = this;

			function collapse(node){
				// Collapse children first
				var childBranches = array.filter(node.getChildren() || [], function(node){
						return node.isExpandable;
					}),
					defs = all(array.map(childBranches, collapse));

				// And when all those recursive calls finish, collapse myself, unless I'm the invisible root node,
				// in which case collapseAll() is finished
				if(!node.isExpanded || (node == _this.rootNode && !_this.showRoot)){
					return defs;
				}else{
					// When node has collapsed, signal that call is finished
					return defs.then(function(){
						return _this._collapseNode(node);
					});
				}
			}

			return shimmedPromise(collapse(this.rootNode));
		},

		////////////// Data store related functions //////////////////////
		// These just get passed to the model; they are here for back-compat

		mayHaveChildren: function(/*dojo/data/Item*/ /*===== item =====*/){
			// summary:
			//		Deprecated.   This should be specified on the model itself.
			//
			//		Overridable function to tell if an item has or may have children.
			//		Controls whether or not +/- expando icon is shown.
			//		(For efficiency reasons we may not want to check if an element actually
			//		has children until user clicks the expando node)
			// tags:
			//		deprecated
		},

		getItemChildren: function(/*===== parentItem, onComplete =====*/){
			// summary:
			//		Deprecated.   This should be specified on the model itself.
			//
			//		Overridable function that return array of child items of given parent item,
			//		or if parentItem==null then return top items in tree
			// tags:
			//		deprecated
		},

		///////////////////////////////////////////////////////
		// Functions for converting an item to a TreeNode
		getLabel: function(/*dojo/data/Item*/ item){
			// summary:
			//		Overridable function to get the label for a tree node (given the item)
			// tags:
			//		extension
			return this.model.getLabel(item);	// String
		},

		getIconClass: function(/*dojo/data/Item*/ item, /*Boolean*/ opened){
			// summary:
			//		Overridable function to return CSS class name to display icon
			// tags:
			//		extension
			return (!item || this.model.mayHaveChildren(item)) ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "dijitLeaf"
		},

		getLabelClass: function(/*===== item, opened =====*/){
			// summary:
			//		Overridable function to return CSS class name to display label
			// item: dojo/data/Item
			// opened: Boolean
			// returns: String
			//		CSS class name
			// tags:
			//		extension
		},

		getRowClass: function(/*===== item, opened =====*/){
			// summary:
			//		Overridable function to return CSS class name to display row
			// item: dojo/data/Item
			// opened: Boolean
			// returns: String
			//		CSS class name
			// tags:
			//		extension
		},

		getIconStyle: function(/*===== item, opened =====*/){
			// summary:
			//		Overridable function to return CSS styles to display icon
			// item: dojo/data/Item
			// opened: Boolean
			// returns: Object
			//		Object suitable for input to dojo.style() like {backgroundImage: "url(...)"}
			// tags:
			//		extension
		},

		getLabelStyle: function(/*===== item, opened =====*/){
			// summary:
			//		Overridable function to return CSS styles to display label
			// item: dojo/data/Item
			// opened: Boolean
			// returns:
			//		Object suitable for input to dojo.style() like {color: "red", background: "green"}
			// tags:
			//		extension
		},

		getRowStyle: function(/*===== item, opened =====*/){
			// summary:
			//		Overridable function to return CSS styles to display row
			// item: dojo/data/Item
			// opened: Boolean
			// returns:
			//		Object suitable for input to dojo.style() like {background-color: "#bbb"}
			// tags:
			//		extension
		},

		getTooltip: function(/*dojo/data/Item*/ /*===== item =====*/){
			// summary:
			//		Overridable function to get the tooltip for a tree node (given the item)
			// tags:
			//		extension
			return "";	// String
		},

		/////////// Keyboard and Mouse handlers ////////////////////


		_onDownArrow: function(/*Event*/ evt, /*TreeNode*/ node){
			// summary:
			//		down arrow pressed; get next visible node, set focus there

			var nextNode = this._getNext(node);
			if(nextNode && nextNode.isTreeNode){
				this.focusNode(nextNode);
			}
		},

		_onUpArrow: function(/*Event*/ evt, /*TreeNode*/ node){
			// summary:
			//		Up arrow pressed; move to previous visible node

			// if younger siblings
			var previousSibling = node.getPreviousSibling();
			if(previousSibling){
				node = previousSibling;
				// if the previous node is expanded, dive in deep
				while(node.isExpandable && node.isExpanded && node.hasChildren()){
					// move to the last child
					var children = node.getChildren();
					node = children[children.length - 1];
				}
			}else{
				// if this is the first child, return the parent
				// unless the parent is the root of a tree with a hidden root
				var parent = node.getParent();
				if(!(!this.showRoot && parent === this.rootNode)){
					node = parent;
				}
			}

			if(node && node.isTreeNode){
				this.focusNode(node);
			}
		},

		_onRightArrow: function(/*Event*/ evt, /*TreeNode*/ node){
			// summary:
			//		Right arrow pressed; go to child node

			// if not expanded, expand, else move to 1st child
			if(node.isExpandable && !node.isExpanded){
				this._expandNode(node);
			}else if(node.hasChildren()){
				node = node.getChildren()[0];
				if(node && node.isTreeNode){
					this.focusNode(node);
				}
			}
		},

		_onLeftArrow: function(/*Event*/ evt, /*TreeNode*/ node){
			// summary:
			//		Left arrow pressed.
			//		If not collapsed, collapse, else move to parent.

			if(node.isExpandable && node.isExpanded){
				this._collapseNode(node);
			}else{
				var parent = node.getParent();
				if(parent && parent.isTreeNode && !(!this.showRoot && parent === this.rootNode)){
					this.focusNode(parent);
				}
			}
		},

		focusLastChild: function(){
			// summary:
			//		End key pressed; go to last visible node.

			var node = this._getLast();
			if(node && node.isTreeNode){
				this.focusNode(node);
			}
		},

		_getFirst: function(){
			// summary:
			//		Returns the first child.
			// tags:
			//		abstract extension
			return this.showRoot ? this.rootNode : this.rootNode.getChildren()[0];
		},

		_getLast: function(){
			// summary:
			//		Returns the last descendant.
			// tags:
			//		abstract extension
			var node = this.rootNode;
			while(node.isExpanded){
				var c = node.getChildren();
				if(!c.length){
					break;
				}
				node = c[c.length - 1];
			}
			return node;
		},

		// Tree only searches forward so dir parameter is unused
		_getNext: function(node){
			// summary:
			//		Returns the next descendant, compared to "child".
			// node: Widget
			//		The current widget
			// tags:
			//		abstract extension

			if(node.isExpandable && node.isExpanded && node.hasChildren()){
				// if this is an expanded node, get the first child
				return node.getChildren()[0];		// TreeNode
			}else{
				// find a parent node with a sibling
				while(node && node.isTreeNode){
					var returnNode = node.getNextSibling();
					if(returnNode){
						return returnNode;		// TreeNode
					}
					node = node.getParent();
				}
				return null;
			}
		},

		// Implement _KeyNavContainer.childSelector, to identify which nodes are navigable
		childSelector: ".dijitTreeRow",

		isExpandoNode: function(node, widget){
			// summary:
			//		check whether a dom node is the expandoNode for a particular TreeNode widget
			return dom.isDescendant(node, widget.expandoNode) || dom.isDescendant(node, widget.expandoNodeText);
		},

		_onNodePress: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
			// Touching a node should focus it, even if you touch the expando node or the edges rather than the label.
			// Especially important to avoid _KeyNavMixin._onContainerFocus() causing the previously focused TreeNode
			// to get focus
			this.focusNode(nodeWidget);
		},

		__click: function(/*TreeNode*/ nodeWidget, /*Event*/ e, /*Boolean*/doOpen, /*String*/func){
			var domElement = e.target,
				isExpandoClick = this.isExpandoNode(domElement, nodeWidget);

			if(nodeWidget.isExpandable && (doOpen || isExpandoClick)){
				// expando node was clicked, or label of a folder node was clicked; open it
				this._onExpandoClick({node: nodeWidget});
			}else{
				this._publish("execute", { item: nodeWidget.item, node: nodeWidget, evt: e });
				this[func](nodeWidget.item, nodeWidget, e);
				this.focusNode(nodeWidget);
			}
			e.stopPropagation();
			e.preventDefault();
		},
		_onClick: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
			// summary:
			//		Translates click events into commands for the controller to process
			this.__click(nodeWidget, e, this.openOnClick, 'onClick');
		},
		_onDblClick: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
			// summary:
			//		Translates double-click events into commands for the controller to process
			this.__click(nodeWidget, e, this.openOnDblClick, 'onDblClick');
		},

		_onExpandoClick: function(/*Object*/ message){
			// summary:
			//		User clicked the +/- icon; expand or collapse my children.
			var node = message.node;

			// If we are collapsing, we might be hiding the currently focused node.
			// Also, clicking the expando node might have erased focus from the current node.
			// For simplicity's sake just focus on the node with the expando.
			this.focusNode(node);

			if(node.isExpanded){
				this._collapseNode(node);
			}else{
				this._expandNode(node);
			}
		},

		onClick: function(/*===== item, node, evt =====*/){
			// summary:
			//		Callback when a tree node is clicked
			// item: Object
			//		Object from the dojo/store corresponding to this TreeNode
			// node: TreeNode
			//		The TreeNode itself
			// evt: Event
			//		The event
			// tags:
			//		callback
		},
		onDblClick: function(/*===== item, node, evt =====*/){
			// summary:
			//		Callback when a tree node is double-clicked
			// item: Object
			//		Object from the dojo/store corresponding to this TreeNode
			// node: TreeNode
			//		The TreeNode itself
			// evt: Event
			//		The event
			// tags:
			//		callback
		},
		onOpen: function(/*===== item, node =====*/){
			// summary:
			//		Callback when a node is opened
			// item: dojo/data/Item
			// node: TreeNode
			// tags:
			//		callback
		},
		onClose: function(/*===== item, node =====*/){
			// summary:
			//		Callback when a node is closed
			// item: Object
			//		Object from the dojo/store corresponding to this TreeNode
			// node: TreeNode
			//		The TreeNode itself
			// tags:
			//		callback
		},

		_getNextNode: function(node){
			// summary:
			//		Get next visible node

			kernel.deprecated(this.declaredClass + "::_getNextNode(node) is deprecated. Use _getNext(node) instead.", "", "2.0");
			return this._getNext(node);
		},

		_getRootOrFirstNode: function(){
			// summary:
			//		Get first visible node
			kernel.deprecated(this.declaredClass + "::_getRootOrFirstNode() is deprecated. Use _getFirst() instead.", "", "2.0");
			return this._getFirst();
		},

		_collapseNode: function(/*TreeNode*/ node){
			// summary:
			//		Called when the user has requested to collapse the node
			// returns:
			//		Promise that resolves when the node has finished closing

			if(node._expandNodeDeferred){
				delete node._expandNodeDeferred;
			}

			if(node.state == "Loading"){
				// ignore clicks while we are in the process of loading data
				return;
			}

			if(node.isExpanded){
				var ret = node.collapse();

				this.onClose(node.item, node);
				this._state(node, false);

				this._startPaint(ret);	// after this finishes, need to reset widths of TreeNodes

				return ret;
			}
		},

		_expandNode: function(/*TreeNode*/ node){
			// summary:
			//		Called when the user has requested to expand the node
			// returns:
			//		Promise that resolves when the node is loaded and opened and (if persist=true) all it's descendants
			//		that were previously opened too

			if(node._expandNodeDeferred){
				// there's already an expand in progress, or completed, so just return
				return node._expandNodeDeferred;	// dojo/Deferred
			}

			var model = this.model,
				item = node.item,
				_this = this;

			// Load data if it's not already loaded
			if(!node._loadDeferred){
				// need to load all the children before expanding
				node.markProcessing();

				// Setup deferred to signal when the load and expand are finished.
				// Save that deferred in this._expandDeferred as a flag that operation is in progress.
				node._loadDeferred = new Deferred();

				// Get the children
				model.getChildren(
					item,
					function(items){
						node.unmarkProcessing();

						// Display the children and also start expanding any children that were previously expanded
						// (if this.persist == true).   The returned Deferred will fire when those expansions finish.
						node.setChildItems(items).then(function(){
							node._loadDeferred.resolve(items);
						});
					},
					function(err){
						console.error(_this, ": error loading " + node.label + " children: ", err);
						node._loadDeferred.reject(err);
					}
				);
			}

			// Expand the node after data has loaded
			var def = node._loadDeferred.then(lang.hitch(this, function(){
				var def2 = node.expand();

				// seems like these should delayed until node.expand() completes, but left here for back-compat about
				// when this.isOpen flag gets set (ie, at the beginning of the animation)
				this.onOpen(node.item, node);
				this._state(node, true);

				return def2;
			}));

			this._startPaint(def);	// after this finishes, need to reset widths of TreeNodes

			return def;	// dojo/promise/Promise
		},

		////////////////// Miscellaneous functions ////////////////

		focusNode: function(/* _tree.Node */ node){
			// summary:
			//		Focus on the specified node (which must be visible)
			// tags:
			//		protected

			var scrollLeft = this.domNode.scrollLeft;
			this.focusChild(node);
			this.domNode.scrollLeft = scrollLeft;
		},

		_onNodeMouseEnter: function(/*dijit/_WidgetBase*/ /*===== node =====*/){
			// summary:
			//		Called when mouse is over a node (onmouseenter event),
			//		this is monitored by the DND code
		},

		_onNodeMouseLeave: function(/*dijit/_WidgetBase*/ /*===== node =====*/){
			// summary:
			//		Called when mouse leaves a node (onmouseleave event),
			//		this is monitored by the DND code
		},

		//////////////// Events from the model //////////////////////////

		_onItemChange: function(/*Item*/ item){
			// summary:
			//		Processes notification of a change to an item's scalar values like label
			var model = this.model,
				identity = model.getIdentity(item),
				nodes = this._itemNodesMap[identity];

			if(nodes){
				var label = this.getLabel(item),
					tooltip = this.getTooltip(item);
				array.forEach(nodes, function(node){
					node.set({
						item: item, // theoretically could be new JS Object representing same item
						label: label,
						tooltip: tooltip
					});
					node._updateItemClasses(item);
				});
			}
		},

		_onItemChildrenChange: function(/*dojo/data/Item*/ parent, /*dojo/data/Item[]*/ newChildrenList){
			// summary:
			//		Processes notification of a change to an item's children
			var model = this.model,
				identity = model.getIdentity(parent),
				parentNodes = this._itemNodesMap[identity];

			if(parentNodes){
				array.forEach(parentNodes, function(parentNode){
					parentNode.setChildItems(newChildrenList);
				});
			}
		},

		_onItemDelete: function(/*Item*/ item){
			// summary:
			//		Processes notification of a deletion of an item.
			//		Not called from new dojo.store interface but there's cleanup code in setChildItems() instead.

			var model = this.model,
				identity = model.getIdentity(item),
				nodes = this._itemNodesMap[identity];

			if(nodes){
				array.forEach(nodes, function(node){
					// Remove node from set of selected nodes (if it's selected)
					this.dndController.removeTreeNode(node);

					var parent = node.getParent();
					if(parent){
						// if node has not already been orphaned from a _onSetItem(parent, "children", ..) call...
						parent.removeChild(node);
					}

					// If we've orphaned the focused node then move focus to the root node
					if(this.lastFocusedChild && !dom.isDescendant(this.lastFocusedChild, this.domNode)){
						delete this.lastFocusedChild;
					}
					if(this.focusedChild && !dom.isDescendant(this.focusedChild, this.domNode)){
						this.focus();
					}

					node.destroyRecursive();
				}, this);
				delete this._itemNodesMap[identity];
			}
		},

		/////////////// Miscellaneous funcs

		_initState: function(){
			// summary:
			//		Load in which nodes should be opened automatically
			this._openedNodes = {};
			if(this.persist && this.cookieName){
				var oreo = cookie(this.cookieName);
				if(oreo){
					array.forEach(oreo.split(','), function(item){
						this._openedNodes[item] = true;
					}, this);
				}
			}
		},

		_state: function(node, expanded){
			// summary:
			//		Query or set expanded state for an node
			if(!this.persist){
				return false;
			}
			var path = array.map(node.getTreePath(),function(item){
				return this.model.getIdentity(item);
			}, this).join("/");
			if(arguments.length === 1){
				return this._openedNodes[path];
			}else{
				if(expanded){
					this._openedNodes[path] = true;
				}else{
					delete this._openedNodes[path];
				}
				this._saveExpandedNodes();
			}
		},

		_saveExpandedNodes: function(){
			if(this.persist && this.cookieName){
				var ary = [];
				for(var id in this._openedNodes){
					ary.push(id);
				}
				cookie(this.cookieName, ary.join(","), {expires: 365});
			}
		},

		destroy: function(){
			if(this._curSearch){
				this._curSearch.timer.remove();
				delete this._curSearch;
			}
			if(this.rootNode){
				this.rootNode.destroyRecursive();
			}
			if(this.dndController && !lang.isString(this.dndController)){
				this.dndController.destroy();
			}
			this.rootNode = null;
			this.inherited(arguments);
		},

		destroyRecursive: function(){
			// A tree is treated as a leaf, not as a node with children (like a grid),
			// but defining destroyRecursive for back-compat.
			this.destroy();
		},

		resize: function(changeSize){
			if(changeSize){
				domGeometry.setMarginBox(this.domNode, changeSize);
			}

			// The main JS sizing involved w/tree is the indentation, which is specified
			// in CSS and read in through this dummy indentDetector node (tree must be
			// visible and attached to the DOM to read this).
			// If the Tree is hidden domGeometry.position(this.tree.indentDetector).w will return 0, in which case just
			// keep the default value.
			this._nodePixelIndent = domGeometry.position(this.tree.indentDetector).w || this._nodePixelIndent;

			// resize() may be called before this.rootNode is created, so wait until it's available
			this.expandChildrenDeferred.then(lang.hitch(this, function(){
				// If tree has already loaded, then reset indent for all the nodes
				this.rootNode.set('indent', this.showRoot ? 0 : -1);

				// Also, adjust widths of all rows to match width of Tree
				this._adjustWidths();
			}));
		},

		_outstandingPaintOperations: 0,
		_startPaint: function(/*Promise|Boolean*/ p){
			// summary:
			//		Called at the start of an operation that will change what's displayed.
			// p:
			//		Promise that tells when the operation will complete.  Alternately, if it's just a Boolean, it signifies
			//		that the operation was synchronous, and already completed.

			this._outstandingPaintOperations++;
			if(this._adjustWidthsTimer){
				this._adjustWidthsTimer.remove();
				delete this._adjustWidthsTimer;
			}

			var oc = lang.hitch(this, function(){
				this._outstandingPaintOperations--;

				if(this._outstandingPaintOperations <= 0 && !this._adjustWidthsTimer && this._started){
					// Use defer() to avoid a width adjustment when another operation will immediately follow,
					// such as a sequence of opening a node, then it's children, then it's grandchildren, etc.
					this._adjustWidthsTimer = this.defer("_adjustWidths");
				}
			});
			when(p, oc, oc);
		},

		_adjustWidths: function(){
			// summary:
			//		Size container to match widest TreeNode, so that highlighting with scrolling works (#13141, #16132)

			if(this._adjustWidthsTimer){
				this._adjustWidthsTimer.remove();
				delete this._adjustWidthsTimer;
			}

			this.containerNode.style.width = "auto";
			this.containerNode.style.width = this.domNode.scrollWidth > this.domNode.offsetWidth ? "auto" : "100%";
		},

		_createTreeNode: function(/*Object*/ args){
			// summary:
			//		creates a TreeNode
			// description:
			//		Developers can override this method to define their own TreeNode class;
			//		However it will probably be removed in a future release in favor of a way
			//		of just specifying a widget for the label, rather than one that contains
			//		the children too.
			return new TreeNode(args);
		},

		focus: function(){
			// summary:
			//		Default focus() implementation: focus the previously focused child, or first child.
			//		Some applications may want to change this method to focus the [first] selected child.

			if(this.lastFocusedChild){
				this.focusNode(this.lastFocusedChild);
			}else{
				this.focusFirstChild();
			}
		}
	});

	if(has("dojo-bidi")){
		Tree.extend({
			_setTextDirAttr: function(textDir){
				if(textDir && this.textDir != textDir){
					this._set("textDir", textDir);
					this.rootNode.set("textDir", textDir);
				}
			}
		});
	}

	Tree.PathError = createError("TreePathError");
	Tree._TreeNode = TreeNode;	// for monkey patching or creating subclasses of TreeNode

	return Tree;
});
