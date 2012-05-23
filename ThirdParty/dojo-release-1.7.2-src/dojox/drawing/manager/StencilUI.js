dojo.provide("dojox.drawing.manager.StencilUI");

(function(){
	var surface, surfaceNode;
	dojox.drawing.manager.StencilUI = dojox.drawing.util.oo.declare(
		// summary:
		//		Used for handling Stencils as UI components.
		// description:
		//		Replaces manager.Stencil. Handles basic UI mouse
		//		events like onmouseover. Does not handle selections
		//		or support delete, etc.
		//
		function(options){
			//
			// TODO: mixin props
			//
			surface = options.surface;
			this.canvas = options.canvas;
			
			this.defaults = dojox.drawing.defaults.copy();
			this.mouse = options.mouse;
			this.keys = options.keys;
			this._mouseHandle = this.mouse.register(this);
			this.stencils = {};
		},
		{
			register: function(/*Object*/stencil){
				this.stencils[stencil.id] = stencil;
				return stencil;
			},
			onUiDown: function(/*EventObject*/obj){
				// summary:
				//		Event fired on mousedown on a stencil
				//
				if(!this._isStencil(obj)){ return; }
				this.stencils[obj.id].onDown(obj);
			},
			onUiUp: function(/*EventObject*/obj){
				// summary:
				//		Event fired on mousedown on a stencil
				//
				if(!this._isStencil(obj)){ return; }
				this.stencils[obj.id].onUp(obj);
			},
			onOver: function(/*EventObject*/obj){
				// summary:
				//		Event fired on mousedown on a stencil
				//
				if(!this._isStencil(obj)){ return; }
				this.stencils[obj.id].onOver(obj);
			},
			onOut: function(/*EventObject*/obj){
				// summary:
				//		Event fired on mousedown on a stencil
				//
				if(!this._isStencil(obj)){ return; }
				this.stencils[obj.id].onOut(obj);
			},
			_isStencil: function(/*EventObject*/obj){
				return !!obj.id && !!this.stencils[obj.id] && this.stencils[obj.id].type == "drawing.library.UI.Button";
			}
		}
	);
	
})();