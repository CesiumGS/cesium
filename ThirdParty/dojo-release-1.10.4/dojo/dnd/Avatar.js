define([
	"../_base/declare",
	"../_base/window",
	"../dom",
	"../dom-attr",
	"../dom-class",
	"../dom-construct",
	"../hccss",
	"../query"
], function(declare, win, dom, domAttr, domClass, domConstruct, has, query){

// module:
//		dojo/dnd/Avatar

return declare("dojo.dnd.Avatar", null, {
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

		var a = domConstruct.create("table", {
				"class": "dojoDndAvatar",
				style: {
					position: "absolute",
					zIndex:   "1999",
					margin:   "0px"
				}
			}),
			source = this.manager.source, node,
			b = domConstruct.create("tbody", null, a),
			tr = domConstruct.create("tr", null, b),
			td = domConstruct.create("td", null, tr),
			k = Math.min(5, this.manager.nodes.length), i = 0;

		if(has("highcontrast")){
			domConstruct.create("span", {
				id : "a11yIcon",
				innerHTML : this.manager.copy ? '+' : "<"
			}, td)
		}
		domConstruct.create("span", {
			innerHTML: source.generateText ? this._generateText() : ""
		}, td);

		// we have to set the opacity on IE only after the node is live
		domAttr.set(tr, {
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
					var table = domConstruct.create("table"),
						tbody = domConstruct.create("tbody", null, table);
					tbody.appendChild(node);
					node = table;
				}
			}
			node.id = "";
			tr = domConstruct.create("tr", null, b);
			td = domConstruct.create("td", null, tr);
			td.appendChild(node);
			domAttr.set(tr, {
				"class": "dojoDndAvatarItem",
				style: {opacity: (9 - i) / 10}
			});
		}
		this.node = a;
	},
	destroy: function(){
		// summary:
		//		destructor for the avatar; called to remove all references so it can be garbage-collected
		domConstruct.destroy(this.node);
		this.node = false;
	},
	update: function(){
		// summary:
		//		updates the avatar to reflect the current DnD state
		domClass.toggle(this.node, "dojoDndAvatarCanDrop", this.manager.canDropFlag);
		if(has("highcontrast")){
			var icon = dom.byId("a11yIcon");
			var text = '+';   // assume canDrop && copy
			if (this.manager.canDropFlag && !this.manager.copy){
				text = '< '; // canDrop && move
			}else if (!this.manager.canDropFlag && !this.manager.copy){
				text = "o"; //!canDrop && move
			}else if(!this.manager.canDropFlag){
				text = 'x';  // !canDrop && copy
			}
			icon.innerHTML=text;
		}
		// replace text
		query(("tr.dojoDndAvatarHeader td span" +(has("highcontrast") ? " span" : "")), this.node).forEach(
			function(node){
				node.innerHTML = this.manager.source.generateText ? this._generateText() : "";
			}, this);
	},
	_generateText: function(){
		// summary:
		//		generates a proper text to reflect copying or moving of items
		return this.manager.nodes.length.toString();
	}
});

});
