define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/dom-class",
	"dojo/dom-construct",
	"./AreaManager"
], function(dojo, declare, domClass, domConstruct){
	var di = declare(
		"dojox.mdnd.DropIndicator",
		null,
	{
		// summary:
		//		DropIndicator managment for DnD.
	
		// node: DOMNode
		//		the drop indicator node
		node : null,
			
		constructor: function(){
			//console.log("dojox.mdnd.DropIndicator ::: constructor");
			var dropIndicator = document.createElement("div");
			var subDropIndicator = document.createElement("div");
			dropIndicator.appendChild(subDropIndicator);
			domClass.add(dropIndicator, "dropIndicator");
			this.node = dropIndicator;
		},
		
		place: function(/*Node*/area, /*Node*/nodeRef, /*Object*/size){
			// summary:
			//		Place the DropIndicator in the right place
			// area:
			//		the dnd targer area node
			// nodeRef:
			//		node where the dropIndicator have to be placed into the area
			// dragNode:
			//		the node which is dragged
			// returns:
			//		the node inserted or null if it crashes
	
			//console.log("dojox.mdnd.DropIndicator ::: place");
			if(size){
				this.node.style.height = size.h + "px";
			}
			try{
				if(nodeRef){
					area.insertBefore(this.node, nodeRef);
				}
				else{
					// empty target area or last node => appendChild
					area.appendChild(this.node);
				}
				return this.node;	// DOMNode
			}catch(e){
				return null;
			}
		},
		
		remove: function(){
			// summary:
			//		remove the DropIndicator (not destroy)
	
			//console.log("dojox.mdnd.DropIndicator ::: remove");
			if(this.node){
				//FIX : IE6 problem
				this.node.style.height = "";
				if(this.node.parentNode){
					this.node.parentNode.removeChild(this.node);
				}
			}
		},
		 
		destroy: function(){
			// summary:
			//		destroy the dropIndicator
	
			//console.log("dojox.mdnd.DropIndicator ::: destroy");
			if(this.node){
				if(this.node.parentNode){
					this.node.parentNode.removeChild(this.node);
				}
				domConstruct.destroy(this.node);
				delete this.node;
			}
		}
	});

	dojox.mdnd.areaManager()._dropIndicator = new dojox.mdnd.DropIndicator();
	
	return di;
});
