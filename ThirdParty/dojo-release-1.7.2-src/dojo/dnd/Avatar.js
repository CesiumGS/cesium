define(["../main", "./common"], function(dojo) {
	// module:
	//		dojo/dnd/Avatar
	// summary:
	//		TODOC


dojo.declare("dojo.dnd.Avatar", null, {
	// summary:
	//		Object that represents transferred DnD items visually
	// manager: Object
	//		a DnD manager object

	constructor: function(manager){
		this.manager = manager;
		this.construct();
	},

	// methods
	construct: function(){
		// summary:
		//		constructor function;
		//		it is separate so it can be (dynamically) overwritten in case of need
		this.isA11y = dojo.hasClass(dojo.body(),"dijit_a11y");
		var a = dojo.create("table", {
				"class": "dojoDndAvatar",
				style: {
					position: "absolute",
					zIndex:   "1999",
					margin:   "0px"
				}
			}),
			source = this.manager.source, node,
			b = dojo.create("tbody", null, a),
			tr = dojo.create("tr", null, b),
			td = dojo.create("td", null, tr),
			icon = this.isA11y ? dojo.create("span", {
						id : "a11yIcon",
						innerHTML : this.manager.copy ? '+' : "<"
					}, td) : null,
			span = dojo.create("span", {
				innerHTML: source.generateText ? this._generateText() : ""
			}, td),
			k = Math.min(5, this.manager.nodes.length), i = 0;
		// we have to set the opacity on IE only after the node is live
		dojo.attr(tr, {
			"class": "dojoDndAvatarHeader",
			style: {opacity: 0.9}
		});
		for(; i < k; ++i){
			if(source.creator){
				// create an avatar representation of the node
				node = source._normalizedCreator(source.getItem(this.manager.nodes[i].id).data, "avatar").node;
			}else{
				// or just clone the node and hope it works
				node = this.manager.nodes[i].cloneNode(true);
				if(node.tagName.toLowerCase() == "tr"){
					// insert extra table nodes
					var table = dojo.create("table"),
						tbody = dojo.create("tbody", null, table);
					tbody.appendChild(node);
					node = table;
				}
			}
			node.id = "";
			tr = dojo.create("tr", null, b);
			td = dojo.create("td", null, tr);
			td.appendChild(node);
			dojo.attr(tr, {
				"class": "dojoDndAvatarItem",
				style: {opacity: (9 - i) / 10}
			});
		}
		this.node = a;
	},
	destroy: function(){
		// summary:
		//		destructor for the avatar; called to remove all references so it can be garbage-collected
		dojo.destroy(this.node);
		this.node = false;
	},
	update: function(){
		// summary:
		//		updates the avatar to reflect the current DnD state
		dojo[(this.manager.canDropFlag ? "add" : "remove") + "Class"](this.node, "dojoDndAvatarCanDrop");
		if (this.isA11y){
			var icon = dojo.byId("a11yIcon");
			var text = '+';   // assume canDrop && copy
			if (this.manager.canDropFlag && !this.manager.copy) {
				text = '< '; // canDrop && move
			}else if (!this.manager.canDropFlag && !this.manager.copy) {
				text = "o"; //!canDrop && move
			}else if(!this.manager.canDropFlag){
				text = 'x';  // !canDrop && copy
			}
			icon.innerHTML=text;
		}
		// replace text
		dojo.query(("tr.dojoDndAvatarHeader td span" +(this.isA11y ? " span" : "")), this.node).forEach(
			function(node){
				node.innerHTML = this._generateText();
			}, this);
	},
	_generateText: function(){
		// summary: generates a proper text to reflect copying or moving of items
		return this.manager.nodes.length.toString();
	}
});

return dojo.dnd.Avatar;
});
