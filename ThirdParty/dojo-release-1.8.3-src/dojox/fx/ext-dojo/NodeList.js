define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/fx", "dojox/fx","dojo/NodeList-fx"],
	function(kernel, lang, baseFx, CoreFx, NodeList){
kernel.experimental("dojox.fx.ext-dojo.NodeList");

/*=====
return {
	// summary:
	//		Core extensions to dojo/NodeList providing additional fx to dojo.NodeList-fx
	// description:
	//		A Package to extend dojo base NodeList with fx provided by the dojox.fx project.
	//		These are experimental animations, in an experimental
};
=====*/

lang.extend(NodeList, {

	sizeTo: function(args){
		// summary:
		//		size all elements of this NodeList. Returns an instance of dojo.Animation
		// example:
		//	|	// size all divs with class "blah"
		//	|	dojo.query("div.blah").sizeTo({
		//	|		width:50,
		//	|		height:50
		//	|	}).play();
		return this._anim(CoreFx, "sizeTo", args); // dojo.Animation
	},

	slideBy: function(args){
		// summary:
		//		slide all elements of this NodeList. Returns an instance of dojo.Animation
		// example:
		//	|	// slide all tables with class "blah" 10 px
		//	|	dojo.query("table.blah").slideBy({ top:10, left:10 }).play();
		return this._anim(CoreFx, "slideBy", args); // dojo.Animation
	},

	highlight: function(args){
		// summary:
		//		highlight all elements of the node list.
		//		Returns an instance of dojo.Animation
		// example:
		//	|	// highlight all links with class "foo"
		//	|	dojo.query("a.foo").hightlight().play();
		return this._anim(CoreFx, "highlight", args); // dojo.Animation
	},

	fadeTo: function(args){
		// summary:
		//		fade all elements of the node list to a specified opacity
		// example:
		//	|	// fade all elements with class "bar" to to 50% opacity
		//	|	dojo.query(".bar").fadeTo({ end: 0.5 }).play();
		return this._anim(baseFx,"_fade",args);
	},
	
	wipeTo: function(args){
		// summary:
		//		Wipe all elements of the NodeList to a specified width: or height:
		// example:
		//	| dojo.query(".box").wipeTo({ width: 300px }).play();
		return this._anim(CoreFx, "wipeTo", args);
	}

});
return NodeList;
});
