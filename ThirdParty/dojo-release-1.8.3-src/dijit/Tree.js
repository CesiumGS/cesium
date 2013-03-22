define([
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/_base/connect",	// connect.isCopyKey()
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/Deferred", // Deferred
	"dojo/DeferredList", // DeferredList
	"dojo/dom", // dom.isDescendant
	"dojo/dom-class", // domClass.add domClass.remove domClass.replace domClass.toggle
	"dojo/dom-geometry", // domGeometry.setMarginBox domGeometry.position
	"dojo/dom-style",// domStyle.set
	"dojo/_base/event", // event.stop
	"dojo/errors/create",	// createError
	"dojo/fx", // fxUtils.wipeIn fxUtils.wipeOut
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys",	// arrows etc.
	"dojo/_base/lang", // lang.getObject lang.mixin lang.hitch
	"dojo/on",		// on(), on.selector()
	"dojo/topic",
	"dojo/touch",
	"dojo/when",
	"./focus",
	"./registry",	// registry.byNode(), registry.getEnclosingWidget()
	"./_base/manager",	// manager.defaultDuration
	"./_Widget",
	"./_TemplatedMixin",
	"./_Container",
	"./_Contained",
	"./_CssStateMixin",
	"dojo/text!./templates/TreeNode.html",
	"dojo/text!./templates/Tree.html",
	"./tree/TreeStoreModel",
	"./tree/ForestStoreModel",
	"./tree/_dndSelector"
], function(array, connect, cookie, declare, Deferred, DeferredList,
			dom, domClass, domGeometry, domStyle, event, createError, fxUtils, kernel, keys, lang, on, topic, touch, when,
			focus, registry, manager, _Widget, _TemplatedMixin, _Container, _Contained, _CssStateMixin,
			treeNodeTemplate, treeTemplate, TreeStoreModel, ForestStoreModel, _dndSelector){

// module:
//		dijit/Tree

// Back-compat shim
Deferred = declare(Deferred, {
	addCallback: function(callback){ this.then(callback); },
	addErrback: function(errback){ this.then(null, errback); }
});

var TreeNode = declare(
	"dijit._TreeNode",
	[_Widget, _TemplatedMixin, _Container, _Contained, _CssStateMixin],
{
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
	_setLabelAttr: {node: "labelNode", type: "innerText"},

	// isExpandable: [private] Boolean
	//		This node has children, so show the expando node (+ sign)
	isExpandable: null,

	// isExpanded: [readonly] Boolean
	//		This node is currently expanded (ie, opened)
	isExpanded: false,

	// state: [private] String
	//		Dynamic loading-related stuff.
	//		When an empty folder node appears, it is "UNCHECKED" first,
	//		then after dojo.data query it becomes "LOADING" and, finally "LOADED"
	state: "UNCHECKED",

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
		domStyle.set(this.indentNode, this.isLeftToRight() ? "paddingLeft" : "paddingRight", pixels);

		array.forEach(this.getChildren(), function(child){
			child.set("indent", indent+1);
		});

		this._set("indent", indent);
	},

	markProcessing: function(){
		// summary:
		//		Visually denote that tree is loading data, etc.
		// tags:
		//		private
		this.state = "LOADING";
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
		var parent = this.getParent();
		if(!parent || !parent.rowNode || parent.rowNode.style.display == "none"){
			/* if we are hiding the root node then make every first level child look like a root node */
			domClass.add(this.domNode, "dijitTreeIsRoot");
		}else{
			domClass.toggle(this.domNode, "dijitTreeIsLast", !this.getNextSibling());
		}
	},

	_setExpando: function(/*Boolean*/ processing){
		// summary:
		//		Set the right image for the expando node
		// tags:
		//		private

		var styles = ["dijitTreeExpandoLoading", "dijitTreeExpandoOpened",
						"dijitTreeExpandoClosed", "dijitTreeExpandoLeaf"],
			_a11yStates = ["*","-","+","*"],
			idx = processing ? 0 : (this.isExpandable ?	(this.isExpanded ? 1 : 2) : 3);

		// apply the appropriate class to the expando node
		domClass.replace(this.expandoNode, styles[idx], styles);

		// provide a non-image based indicator for images-off mode
		this.expandoNodeText.innerHTML = _a11yStates[idx];

	},

	expand: function(){
		// summary:
		//		Show my children
		// returns:
		//		Deferred that fires when expansion is complete

		// If there's already an expand in progress or we are already expanded, just return
		if(this._expandDeferred){
			return this._expandDeferred;		// dojo/_base/Deferred
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
		domClass.add(this.contentNode,'dijitTreeContentExpanded');
		this._setExpando();
		this._updateItemClasses(this.item);
		
		if(this == this.tree.rootNode && this.tree.showRoot){
			this.tree.domNode.setAttribute("aria-expanded", "true");
		}

		var def,
			wipeIn = fxUtils.wipeIn({
				node: this.containerNode,
				duration: manager.defaultDuration,
				onEnd: function(){
					def.resolve(true);
				}
			});

		// Deferred that fires when expand is complete
		def = (this._expandDeferred = new Deferred(function(){
			// Canceller
			wipeIn.stop();
		}));

		wipeIn.play();

		return def;		// dojo/_base/Deferred
	},

	collapse: function(){
		// summary:
		//		Collapse this node (if it's expanded)

		if(this._collapseDeferred){
			// Node is already collapsed, or there's a collapse in progress, just return that Deferred
			return this._collapseDeferred;
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
		domClass.remove(this.contentNode,'dijitTreeContentExpanded');
		this._setExpando();
		this._updateItemClasses(this.item);

		var def,
			wipeOut = fxUtils.wipeOut({
				node: this.containerNode,
				duration: manager.defaultDuration,
				onEnd: function(){
					def.resolve(true);
				}
			});

		// Deferred that fires when expand is complete
		def = (this._collapseDeferred = new Deferred(function(){
			// Canceller
			wipeOut.stop();
		}));

		wipeOut.play();

		return def;		// dojo/_base/Deferred
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
		//		Deferred object that fires after all previously opened children
		//		have been expanded again (or fires instantly if there are no such children).

		var tree = this.tree,
			model = tree.model,
			defs = [];	// list of deferreds that need to fire before I am complete


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

					// Deregister mapping from item id --> this node
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

					// And finally we can destroy the node
					node.destroyRecursive();
				}
			});
		});

		this.state = "LOADED";

		if(items && items.length > 0){
			this.isExpandable = true;

			// Create _TreeNode widget for each specified tree node, unless one already
			// exists and isn't being used (presumably it's from a DnD move and was recently
			// released
			array.forEach(items, function(item){	// MARKER: REUSE NODE
				var id = model.getIdentity(item),
					existingNodes = tree._itemNodesMap[id],
					node;
				if(existingNodes){
					for(var i=0;i<existingNodes.length;i++){
						if(existingNodes[i] && !existingNodes[i].getParent()){
							node = existingNodes[i];
							node.set('indent', this.indent+1);
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
			this.isExpandable=false;
		}

		if(this._setExpando){
			// change expando to/from dot or + icon, as appropriate
			this._setExpando(false);
		}

		// Set leaf icon or folder icon, as appropriate
		this._updateItemClasses(this.item);

		// On initial tree show, make the selected TreeNode as either the root node of the tree,
		// or the first child, if the root node is hidden
		if(this == tree.rootNode){
			var fc = this.tree.showRoot ? this : this.getChildren()[0];
			if(fc){
				fc.setFocusable(true);
				tree.lastFocused = fc;
			}else{
				// fallback: no nodes in tree so focus on Tree <div> itself
				tree.domNode.setAttribute("tabIndex", "0");
			}
		}

		var def =  new DeferredList(defs);
		this.tree._startPaint(def);		// to reset TreeNode widths after an item is added/removed from the Tree
		return def;		// dojo/_base/Deferred
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

	setFocusable: function(/*Boolean*/ selected){
		// summary:
		//		A Tree has a (single) node that's focusable.
		//		Mark that this node is/isn't that currently focsuable node.
		// description:
		//		In particular, setting a node as selected involves setting tabIndex
		//		so that when user tabs to the tree, focus will go to that node (only).

		this.labelNode.setAttribute("tabIndex", selected ? "0" : "-1");
	},


	_setTextDirAttr: function(textDir){
		if(textDir &&((this.textDir != textDir) || !this._created)){
			this._set("textDir", textDir);
			this.applyTextDir(this.labelNode, this.labelNode.innerText || this.labelNode.textContent || "");
			array.forEach(this.getChildren(), function(childNode){
				childNode.set("textDir", textDir);
			}, this);
		}
	}
});

var Tree = declare("dijit.Tree", [_Widget, _TemplatedMixin], {
	// summary:
	//		This widget displays hierarchical data from a store.

	// store: [deprecated] String|dojo/data/Store
	//		Deprecated.  Use "model" parameter instead.
	//		The store to get data to display in the tree.
	store: null,

	// model: dijit/tree/model
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
	//		returns a Deferred to indicate when the set is complete.
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
	persist: true,

	// autoExpand: Boolean
	//		Fully expand the tree on load.   Overrides `persist`.
	autoExpand: false,

	// dndController: [protected] Function|String
	//		Class to use as as the dnd controller.  Specifying this class enables DnD.
	//		Generally you should specify this as dijit/tree/dndSource.
	//		Setting of dijit/tree/_dndSelector handles selection only (no actual DnD).
	dndController: _dndSelector,

	// parameters to pull off of the tree and pass on to the dndController as its params
	dndParams: ["onDndDrop","itemCreator","onDndCancel","checkAcceptance", "checkItemAcceptance", "dragThreshold", "betweenThreshold"],

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

		// Deferred that fires when all the children have loaded.
		this.expandChildrenDeferred  = new Deferred();

		// Deferred that fires when all pending operations complete.
		this.pendingCommandsDeferred = this.expandChildrenDeferred;

		this.inherited(arguments);
	},

	postCreate: function(){
		this._initState();

		// Catch events on TreeNodes
		var self = this;
		this.own(
			on(this.domNode, on.selector(".dijitTreeNode", touch.enter), function(evt){
				self._onNodeMouseEnter(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeNode", touch.leave), function(evt){
				self._onNodeMouseLeave(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeNode", "click"), function(evt){
				self._onClick(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeNode", "dblclick"), function(evt){
				self._onDblClick(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeNode", "keypress"), function(evt){
				self._onKeyPress(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeNode", "keydown"), function(evt){
				self._onKeyDown(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeRow", "focusin"), function(evt){
				self._onNodeFocus(registry.getEnclosingWidget(this), evt);
			})
		);

		// Create glue between store and Tree, if not specified directly by user
		if(!this.model){
			this._store2model();
		}

		// monitor changes to items
		this.connect(this.model, "onChange", "_onItemChange");
		this.connect(this.model, "onChildrenChange", "_onItemChildrenChange");
		this.connect(this.model, "onDelete", "_onItemDelete");

		this.inherited(arguments);

		if(this.dndController){
			if(lang.isString(this.dndController)){
				this.dndController = lang.getObject(this.dndController);
			}
			var params={};
			for(var i=0; i<this.dndParams.length;i++){
				if(this[this.dndParams[i]]){
					params[this.dndParams[i]] = this[this.dndParams[i]];
				}
			}
			this.dndController = new this.dndController(this, params);
		}

		this._load();

		// If no path was specified to the constructor, use path saved in cookie
		if(!this.params.path && !this.params.paths && this.persist){
			this.set("paths", this.dndController._getSavedPaths());
		}

		// onLoadDeferred should fire when all commands that are part of initialization have completed.
		// It will include all the set("paths", ...) commands that happen during initialization.
		this.onLoadDeferred = this.pendingCommandsDeferred;
				
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
					textDir: this.textDir,
					indent: this.showRoot ? 0 : -1
				}));
				
				if(!this.showRoot){
					rn.rowNode.style.display="none";
					// if root is not visible, move tree role to the invisible
					// root node's containerNode, see #12135
					this.domNode.setAttribute("role", "presentation");
					this.domNode.removeAttribute("aria-expanded");
					this.domNode.removeAttribute("aria-multiselectable");
					
					rn.labelNode.setAttribute("role", "presentation");
					rn.containerNode.setAttribute("role", "tree");
					rn.containerNode.setAttribute("aria-expanded","true");
					rn.containerNode.setAttribute("aria-multiselectable", !this.dndController.singular);
				}else{
				  this.domNode.setAttribute("aria-multiselectable", !this.dndController.singular);
				}
				
				this.domNode.appendChild(rn.domNode);
				var identity = this.model.getIdentity(item);
				if(this._itemNodesMap[identity]){
					this._itemNodesMap[identity].push(rn);
				}else{
					this._itemNodesMap[identity] = [rn];
				}

				rn._updateLayout();		// sets "dijitTreeIsRoot" CSS classname

				// Load top level children, and if persist==true, all nodes that were previously opened
				this._expandNode(rn).then(lang.hitch(this, function(){
					// Then, select the nodes that were selected last time, or
					// the ones specified by params.paths[].

					this.expandChildrenDeferred.resolve(true);
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

		if(!item){ return []; }
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
		return this.pendingCommandsDeferred = this.pendingCommandsDeferred.then( lang.hitch(this, function(){
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
			return this.set("paths", [path]);
		}else{
			// Empty list is interpreted as "select nothing"
			return this.set("paths", []);
		}
	},

	_setPathsAttr: function(/*Item[][]|String[][]*/ paths){
		// summary:
		//		Select the tree nodes identified by passed paths.
		// paths:
		//		Array of arrays of items or item id's
		// returns:
		//		Deferred to indicate when the set is complete

		var tree = this;

		// Let any previous set("path", ...) commands complete before this one starts.
		return this.pendingCommandsDeferred = this.pendingCommandsDeferred.then(function(){
			// We may need to wait for some nodes to expand, so setting
			// each path will involve a Deferred. We bring those deferreds
			// together with a DeferredList.
			return new DeferredList(array.map(paths, function(path){
				var d = new Deferred();

				// normalize path to use identity
				path = array.map(path, function(item){
					return lang.isString(item) ? item : tree.model.getIdentity(item);
				});

				if(path.length){
					// Wait for the tree to load, if it hasn't already.
					selectPath(path, [tree.rootNode], d);
				}else{
					d.reject(new Tree.PathError("Empty path"));
				}
				return d;
			}));
		}).then(setNodes);

		function selectPath(path, nodes, def){
			// Traverse path; the next path component should be among "nodes".
			var nextPath = path.shift();
			var nextNode = array.filter(nodes, function(node){
				return node.getIdentity() == nextPath;
			})[0];
			if(!!nextNode){
				if(path.length){
					tree._expandNode(nextNode).then(function(){ selectPath(path, nextNode.getChildren(), def); });
				}else{
					// Successfully reached the end of this path
					def.resolve(nextNode);
				}
			}else{
				def.reject(new Tree.PathError("Could not expand path at " + nextPath));
			}
		}

		function setNodes(newNodes){
			// After all expansion is finished, set the selection to
			// the set of nodes successfully found.
			tree.set("selectedNodes", array.map(
				array.filter(newNodes,function(x){return x[0];}),
				function(x){return x[1];}));
		}
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
		//		Deferred that fires when all nodes have expanded

		var _this = this;

		function expand(node){
			var def = new dojo.Deferred();

			// Expand the node
			_this._expandNode(node).then(function(){
				// When node has expanded, call expand() recursively on each non-leaf child
				var childBranches = array.filter(node.getChildren() || [], function(node){
						return node.isExpandable;
					}),
					defs = array.map(childBranches, expand);

				// And when all those recursive calls finish, signal that I'm finished
				new dojo.DeferredList(defs).then(function(){
					def.resolve(true);
				});
			});

			return def;
		}

		return expand(this.rootNode);
	},

	collapseAll: function(){
		// summary:
		//		Collapse all nodes in the tree
		// returns:
		//		Deferred that fires when all nodes have collapsed

		var _this = this;

		function collapse(node){
			var def = new dojo.Deferred();
			def.label = "collapseAllDeferred";

			// Collapse children first
			var childBranches = array.filter(node.getChildren() || [], function(node){
					return node.isExpandable;
				}),
				defs = array.map(childBranches, collapse);

			// And when all those recursive calls finish, collapse myself, unless I'm the invisible root node,
			// in which case collapseAll() is finished
			new dojo.DeferredList(defs).then(function(){
				if(!node.isExpanded || (node == _this.rootNode && !_this.showRoot)){
					def.resolve(true);
				}else{
					_this._collapseNode(node).then(function(){
						// When node has collapsed, signal that call is finished
						def.resolve(true);
					});
				}
			});


			return def;
		}

		return collapse(this.rootNode);
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

	_onKeyPress: function(/*TreeNode*/ treeNode, /*Event*/ e){
		// summary:
		//		Handles keystrokes for printable keys, doing search navigation

		if(e.charCode <= 32){
			// Avoid duplicate events on firefox (this is an arrow key that will be handled by keydown handler)
			return;
		}

		if(!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey){
			var c = String.fromCharCode(e.charCode);
			this._onLetterKeyNav( { node: treeNode, key: c.toLowerCase() } );
			event.stop(e);
		}
	},

	_onKeyDown: function(/*TreeNode*/ treeNode, /*Event*/ e){
		// summary:
		//		Handles arrow, space, and enter keys

		var key = e.keyCode;

		var map = this._keyHandlerMap;
		if(!map){
			// Setup table mapping keys to events.
			// On WebKit based browsers, the combination ctrl-enter does not get passed through. To allow accessible
			// multi-select on those browsers, the space key is also used for selection.
			// Therefore, also allow space key for keyboard "click" operation.
			map = {};
			map[keys.ENTER] = map[keys.SPACE] = map[" "] = "_onEnterKey";
			map[this.isLeftToRight() ? keys.LEFT_ARROW : keys.RIGHT_ARROW] = "_onLeftArrow";
			map[this.isLeftToRight() ? keys.RIGHT_ARROW : keys.LEFT_ARROW] = "_onRightArrow";
			map[keys.UP_ARROW] = "_onUpArrow";
			map[keys.DOWN_ARROW] = "_onDownArrow";
			map[keys.HOME] = "_onHomeKey";
			map[keys.END] = "_onEndKey";
			this._keyHandlerMap = map;
		}

		if(this._keyHandlerMap[key]){
			// clear record of recent printables (being saved for multi-char letter navigation),
			// because "a", down-arrow, "b" shouldn't search for "ab"
			if(this._curSearch){
				this._curSearch.timer.remove();
				delete this._curSearch;
			}

			this[this._keyHandlerMap[key]]( { node: treeNode, item: treeNode.item, evt: e } );
			event.stop(e);
		}
	},

	_onEnterKey: function(/*Object*/ message){
		this._publish("execute", { item: message.item, node: message.node } );
		this.dndController.userSelect(message.node, connect.isCopyKey( message.evt ), message.evt.shiftKey);
		this.onClick(message.item, message.node, message.evt);
	},

	_onDownArrow: function(/*Object*/ message){
		// summary:
		//		down arrow pressed; get next visible node, set focus there
		var node = this._getNextNode(message.node);
		if(node && node.isTreeNode){
			this.focusNode(node);
		}
	},

	_onUpArrow: function(/*Object*/ message){
		// summary:
		//		Up arrow pressed; move to previous visible node

		var node = message.node;

		// if younger siblings
		var previousSibling = node.getPreviousSibling();
		if(previousSibling){
			node = previousSibling;
			// if the previous node is expanded, dive in deep
			while(node.isExpandable && node.isExpanded && node.hasChildren()){
				// move to the last child
				var children = node.getChildren();
				node = children[children.length-1];
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

	_onRightArrow: function(/*Object*/ message){
		// summary:
		//		Right arrow pressed; go to child node
		var node = message.node;

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

	_onLeftArrow: function(/*Object*/ message){
		// summary:
		//		Left arrow pressed.
		//		If not collapsed, collapse, else move to parent.

		var node = message.node;

		if(node.isExpandable && node.isExpanded){
			this._collapseNode(node);
		}else{
			var parent = node.getParent();
			if(parent && parent.isTreeNode && !(!this.showRoot && parent === this.rootNode)){
				this.focusNode(parent);
			}
		}
	},

	_onHomeKey: function(){
		// summary:
		//		Home key pressed; get first visible node, and set focus there
		var node = this._getRootOrFirstNode();
		if(node){
			this.focusNode(node);
		}
	},

	_onEndKey: function(){
		// summary:
		//		End key pressed; go to last visible node.

		var node = this.rootNode;
		while(node.isExpanded){
			var c = node.getChildren();
			node = c[c.length - 1];
		}

		if(node && node.isTreeNode){
			this.focusNode(node);
		}
	},

	// multiCharSearchDuration: Number
	//		If multiple characters are typed where each keystroke happens within
	//		multiCharSearchDuration of the previous keystroke,
	//		search for nodes matching all the keystrokes.
	//
	//		For example, typing "ab" will search for entries starting with
	//		"ab" unless the delay between "a" and "b" is greater than multiCharSearchDuration.
	multiCharSearchDuration: 250,

	_onLetterKeyNav: function(message){
		// summary:
		//		Called when user presses a prinatable key; search for node starting with recently typed letters.
		// message: Object
		//		Like { node: TreeNode, key: 'a' } where key is the key the user pressed.

		// Branch depending on whether this key starts a new search, or modifies an existing search
		var cs = this._curSearch;
		if(cs){
			// We are continuing a search.  Ex: user has pressed 'a', and now has pressed
			// 'b', so we want to search for nodes starting w/"ab".
			cs.pattern = cs.pattern + message.key;
			cs.timer.remove();
		}else{
			// We are starting a new search
			cs = this._curSearch = {
					pattern: message.key,
					startNode: message.node
			};
		}

		// set/reset timer to forget recent keystrokes
		cs.timer = this.defer(function(){
			delete this._curSearch;
		}, this.multiCharSearchDuration);

		// Navigate to TreeNode matching keystrokes [entered so far].
		var node = cs.startNode;
		do{
			node = this._getNextNode(node);
			//check for last node, jump to first node if necessary
			if(!node){
				node = this._getRootOrFirstNode();
			}
		}while(node !== cs.startNode && (node.label.toLowerCase().substr(0, cs.pattern.length) != cs.pattern));
		if(node && node.isTreeNode){
			// no need to set focus if back where we started
			if(node !== cs.startNode){
				this.focusNode(node);
			}
		}
	},

	isExpandoNode: function(node, widget){
		// summary:
		//		check whether a dom node is the expandoNode for a particular TreeNode widget
		return dom.isDescendant(node, widget.expandoNode) || dom.isDescendant(node, widget.expandoNodeText);
	},

	_onClick: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
		// summary:
		//		Translates click events into commands for the controller to process

		var domElement = e.target,
			isExpandoClick = this.isExpandoNode(domElement, nodeWidget);

		if( (this.openOnClick && nodeWidget.isExpandable) || isExpandoClick ){
			// expando node was clicked, or label of a folder node was clicked; open it
			if(nodeWidget.isExpandable){
				this._onExpandoClick({node:nodeWidget});
			}
		}else{
			this._publish("execute", { item: nodeWidget.item, node: nodeWidget, evt: e } );
			this.onClick(nodeWidget.item, nodeWidget, e);
			this.focusNode(nodeWidget);
		}
		event.stop(e);
	},
	_onDblClick: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
		// summary:
		//		Translates double-click events into commands for the controller to process

		var domElement = e.target,
			isExpandoClick = (domElement == nodeWidget.expandoNode || domElement == nodeWidget.expandoNodeText);

		if( (this.openOnDblClick && nodeWidget.isExpandable) ||isExpandoClick ){
			// expando node was clicked, or label of a folder node was clicked; open it
			if(nodeWidget.isExpandable){
				this._onExpandoClick({node:nodeWidget});
			}
		}else{
			this._publish("execute", { item: nodeWidget.item, node: nodeWidget, evt: e } );
			this.onDblClick(nodeWidget.item, nodeWidget, e);
			this.focusNode(nodeWidget);
		}
		event.stop(e);
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

	_getRootOrFirstNode: function(){
		// summary:
		//		Get first visible node
		return this.showRoot ? this.rootNode : this.rootNode.getChildren()[0];
	},

	_collapseNode: function(/*TreeNode*/ node){
		// summary:
		//		Called when the user has requested to collapse the node
		// returns:
		//		Deferred that fires when the node is closed

		if(node._expandNodeDeferred){
			delete node._expandNodeDeferred;
		}

		if(node.state == "LOADING"){
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
		//		Deferred that fires when the node is loaded and opened and (if persist=true) all it's descendants
		//		that were previously opened too

		// Signal that this call is complete
		var def = new Deferred();

		if(node._expandNodeDeferred){
			// there's already an expand in progress, or completed, so just return
			return node._expandNodeDeferred;	// dojo/_base/Deferred
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
		node._loadDeferred.then(lang.hitch(this, function(){
			node.expand().then(function(){
				def.resolve(true);	// signal that this _expandNode() call is complete
			});

			// seems like these should be inside of then(), but left here for back-compat about
			// when this.isOpen flag gets set (ie, at the beginning of the animation)
			this.onOpen(node.item, node);
			this._state(node, true);
		}));

		this._startPaint(def);	// after this finishes, need to reset widths of TreeNodes

		return def;	// dojo/_base/Deferred
	},

	////////////////// Miscellaneous functions ////////////////

	focusNode: function(/* _tree.Node */ node){
		// summary:
		//		Focus on the specified node (which must be visible)
		// tags:
		//		protected

		// set focus so that the label will be voiced using screen readers
		focus.focus(node.labelNode);
	},

	_onNodeFocus: function(/*dijit/_WidgetBase*/ node){
		// summary:
		//		Called when a TreeNode gets focus, either by user clicking
		//		it, or programatically by arrow key handling code.
		// description:
		//		It marks that the current node is the selected one, and the previously
		//		selected node no longer is.

		if(node && node != this.lastFocused){
			if(this.lastFocused && !this.lastFocused._destroyed){
				// mark that the previously focsable node is no longer focusable
				this.lastFocused.setFocusable(false);
			}

			// mark that the new node is the currently selected one
			node.setFocusable(true);
			this.lastFocused = node;
		}
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
					item: item,		// theoretically could be new JS Object representing same item
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
			array.forEach(parentNodes,function(parentNode){
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
			array.forEach(nodes,function(node){
				// Remove node from set of selected nodes (if it's selected)
				this.dndController.removeTreeNode(node);

				var parent = node.getParent();
				if(parent){
					// if node has not already been orphaned from a _onSetItem(parent, "children", ..) call...
					parent.removeChild(node);
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
		var path = array.map(node.getTreePath(), function(item){
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
			if(this.persist && this.cookieName){
				var ary = [];
				for(var id in this._openedNodes){
					ary.push(id);
				}
				cookie(this.cookieName, ary.join(","), {expires:365});
			}
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
		//		Get width of widest TreeNode, or the width of the Tree itself, whichever is greater,
		//		and then set all TreeNodes to that width, so that selection/hover highlighting
		//		extends to the edge of the Tree (#13141)

		if(this._adjustWidthsTimer){
			this._adjustWidthsTimer.remove();
			delete this._adjustWidthsTimer;
		}

		var maxWidth = 0,
			nodes = [];
		function collect(/*TreeNode*/ parent){
			var node = parent.rowNode;
			node.style.width = "auto";		// erase setting from previous run
			maxWidth = Math.max(maxWidth, node.clientWidth);
			nodes.push(node);
			if(parent.isExpanded){
				array.forEach(parent.getChildren(), collect);
			}
		}
		collect(this.rootNode);
		maxWidth = Math.max(maxWidth, domGeometry.getContentBox(this.domNode).w);	// do after node.style.width="auto"
		array.forEach(nodes, function(node){
			node.style.width = maxWidth + "px";		// assumes no horizontal padding, border, or margin on rowNode
		});
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

	_setTextDirAttr: function(textDir){
		if(textDir && this.textDir!= textDir){
			this._set("textDir",textDir);
			this.rootNode.set("textDir", textDir);
		}
	}
});

Tree.PathError = createError("TreePathError");
Tree._TreeNode = TreeNode;	// for monkey patching or creating subclasses of TreeNode

return Tree;
});
