dojo.provide("dojox.layout.dnd.Avatar");

dojo.require("dojo.dnd.Avatar");
dojo.require("dojo.dnd.common");

dojo.declare("dojox.layout.dnd.Avatar", dojo.dnd.Avatar, {
	// summary:
	//      An Object, which represents the object being moved in a GridContainer
	constructor: function(manager, opacity){
		this.opacity = opacity || 0.9;
	},

	construct: function(){
		// summary:
		//		A constructor function. it is separate so it can be (dynamically)
		//		overwritten in case of need.
		
		var source = this.manager.source,
			node = source.creator ?
				// create an avatar representation of the node
				source._normalizedCreator(source.getItem(this.manager.nodes[0].id).data, "avatar").node :
				// or just clone the node and hope it works
				this.manager.nodes[0].cloneNode(true)
		;

		dojo.addClass(node, "dojoDndAvatar");
		
		node.id = dojo.dnd.getUniqueId();
		node.style.position = "absolute";
		node.style.zIndex = 1999;
		node.style.margin = "0px"
		node.style.width = dojo.marginBox(source.node).w + "px"
		
		// add contructor object params to define it
		dojo.style(node, "opacity", this.opacity);
		this.node = node;
	},

	update: function(){
		// summary: Updates the avatar to reflect the current DnD state.
		dojo.toggleClass(this.node, "dojoDndAvatarCanDrop", this.manager.canDropFlag);
	},

	_generateText: function(){ /* nada. */ }

});
