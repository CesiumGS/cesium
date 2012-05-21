dojo.provide("dojox.drawing.plugins._Plugin");

dojox.drawing.plugins._Plugin = dojox.drawing.util.oo.declare(
	// summary:
	//		Base class for plugins.
	// description:
	//		When creating a plugin, use this class as the
	//		base to ensure full functionality.
	function(options){
		this._cons = [];
		dojo.mixin(this, options);
		if(this.button && this.onClick){
			this.connect(this.button, "onClick", this, "onClick")
		}
	},
	{
		util:null,
		keys:null,
		mouse:null,
		drawing:null,
		stencils:null,
		anchors:null,
		canvas:null,
		node:null,
		button:null,//gfx button
		type:"dojox.drawing.plugins._Plugin",
		connect: function(){
			this._cons.push(dojo.connect.apply(dojo, arguments));
		},
		disconnect: function(/*handle | Array*/handles){
			// summary:
			//		Removes connections based on passed
			//		handles arguments
			if(!handles){ return };
			if(!dojo.isArray(handles)){ handles=[handles]; }
			dojo.forEach(handles, dojo.disconnect, dojo);
		}
	}
);