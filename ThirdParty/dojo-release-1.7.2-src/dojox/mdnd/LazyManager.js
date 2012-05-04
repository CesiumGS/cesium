define([
	"dojo/_base/kernel",	// dojo.addOnUnload
	"dojo/_base/lang",	// dojo.hitch
	"dojo/_base/declare",
	"dojo/_base/html",	// dojo.create, dojo.attr, dojo.addClass
	"dojo/dnd/Manager",
	"./PureSource"
],function(dojo){
	return dojo.declare(
		"dojox.mdnd.LazyManager",
		null,
	{
		// summary:
		//		This class allows to launch a drag and drop dojo on the fly.
		
		constructor: function(){
			//console.log("dojox.mdnd.LazyManager ::: constructor");
			this._registry = {};
			// initialization of the _fakeSource to enabled DragAndDrop :
			this._fakeSource = new dojox.mdnd.PureSource(dojo.create("div"), {
				'copyOnly': false
			});
			this._fakeSource.startup();
			dojo.addOnUnload(dojo.hitch(this, "destroy"));
			this.manager = dojo.dnd.manager();
		},
		
		getItem: function(/*DOMNode*/draggedNode){
			//console.log("dojox.mdnd.LazyManager ::: getItem");
			var type = draggedNode.getAttribute("dndType");
			return {
				'data' : draggedNode.getAttribute("dndData") || draggedNode.innerHTML,
				'type' : type ? type.split(/\s*,\s*/) : ["text"]
			}
		},
		
		startDrag: function(/*Event*/e, /*DOMNode?*/draggedNode){
			// summary:
			//		launch a dojo drag and drop on the fly.
	
			//console.log("dojox.mdnd.LazyManager ::: startDrag");
			draggedNode = draggedNode || e.target;
			if(draggedNode){
				var m = this.manager,
					object = this.getItem(draggedNode);
				if(draggedNode.id == ""){
					dojo.attr(draggedNode, "id", dojo.dnd.getUniqueId());
				}
				dojo.addClass(draggedNode, "dojoDndItem");
				this._fakeSource.setItem(draggedNode.id, object);
				m.startDrag(this._fakeSource, [draggedNode], false);
				m.onMouseMove(e);
			}
		},
		
		cancelDrag: function(){
			// summary:
			//		cancel a drag and drop dojo on the fly.
	
			//console.log("dojox.mdnd.LazyManager ::: cancelDrag");
			var m = this.manager;
			m.target = null;
			m.onMouseUp();
		},
		
		
		destroy: function(){
			//console.log("dojox.mdnd.LazyManager ::: destroy");
			this._fakeSource.destroy();
		}
	});
});
