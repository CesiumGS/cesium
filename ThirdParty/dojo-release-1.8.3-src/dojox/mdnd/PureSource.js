define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/dom-class",
	"dojo/dnd/common",
	"dojo/dnd/Selector",
	"dojo/dnd/Manager"
],function(dojo, declare, lang, connect, array, domClass, dnd, Selector, Manager){
	return declare(
		"dojox.mdnd.PureSource",
		Selector,
	{
		// summary:
		//		A Source Object, which can be used only as a DnD source.
		//		A Source can contained several dnd items.
		//		A dnd item is not a source.
		
		horizontal: false,
		copyOnly: true,
		skipForm: false,
		withHandles: false,
		isSource: true,
		targetState: "Disabled",
		generateText: true,
		
		constructor: function(/*DOMNode|String*/node, /*dojo.dnd.__SourceArgs?*/params){
			// summary:
			//		Initialize a new PureSource.
			// node:
			//		Node or node's id to build the source on.
			// params:
			//		Any property of this class may be configured via the params
			//		object which is mixed-in to the 'dojo.dnd.Source' instance.
	
			//console.log('dojox.mdnd.PureSource ::: constructor');
			lang.mixin(this, lang.mixin({}, params));
			var type = this.accept;
			
			// class-specific variables
			this.isDragging = false;
			this.mouseDown = false;
	
			// states
			this.sourceState = "";
			domClass.add(this.node, "dojoDndSource");
			if(this.horizontal){
				domClass.add(this.node, "dojoDndHorizontal");
			}
			// set up events
			this.topics = [
				connect.subscribe("/dnd/cancel", this, "onDndCancel"),
				connect.subscribe("/dnd/drop", this, "onDndCancel")
			];
		},
		
		onDndCancel: function(){
			// summary:
			//		Topic event processor for /dnd/cancel, called to cancel the Dnd
			//		operation.
			// tags:
			//		callback
	
			//console.log('dojox.mdnd.PureSource ::: onDndCancel');
			this.isDragging = false;
			this.mouseDown = false;
			delete this.mouseButton;
		},
		
		copyState: function(/*Boolean*/keyPressed){
			// summary:
			//		Returns true, if we need to copy items, false to move.
			//		It is separated to be overwritten dynamically, if needed.
			// keyPressed:
			//		The "copy" was pressed.
			// returns:
			//		True, if we need to copy items, false to move.
	
			//console.log('dojox.mdnd.PureSource ::: copyState');
			return this.copyOnly || keyPressed;	// Boolean
		},
		
		destroy: function(){
			// summary:
			//		Prepares the object to be garbage-collected.
	
			//console.log('dojox.mdnd.PureSource ::: destroy');
			dojox.mdnd.PureSource.superclass.destroy.call(this);
			array.forEach(this.topics, connect.unsubscribe);
			this.targetAnchor = null;
		},
	
		markupFactory: function(/*Object*/params, /*DomNode*/node){
			// summary:
			//		Markup methods.
			// params:
			//		???
			// node:
			//		???
			// returns:
			//		New dojox.mdnd.PureSource instance.
	
			//console.log('dojox.mdnd.PureSource ::: markupFactory');
			params._skipStartup = true;
			return new dojox.mdnd.PureSource(node, params);
		},
	
		onMouseMove: function(/*Event*/e){
			// summary:
			//		Event processor for onmousemove.
			// e:
			//		Mouse event.
	
			//console.log('dojox.mdnd.PureSource ::: onMouseMove');
			if(this.isDragging){
				return;
			}
			dojox.mdnd.PureSource.superclass.onMouseMove.call(this, e);
			var m = Manager.manager();
			if(this.mouseDown && !this.isDragging && this.isSource){
				var nodes = this.getSelectedNodes();
				if(nodes.length){
					m.startDrag(this, nodes, this.copyState(connect.isCopyKey(e)));
					this.isDragging = true;
				}
			}
			
		},
		
		onMouseDown: function(/*Event*/e){
			// summary:
			//		Event processor for onmousedown.
			// e:
			//		Mouse event.
			// tags:
			//		callback
	
			//console.log('dojox.mdnd.PureSource ::: onMouseDown');
			if(this._legalMouseDown(e) && (!this.skipForm || !dnd.isFormElement(e))){
				this.mouseDown = true;
				this.mouseButton = e.button;
				dojox.mdnd.PureSource.superclass.onMouseDown.call(this, e);
			}
		},
		
		onMouseUp: function(/*Event*/e){
			// summary:
			//		Event processor for onmouseup.
			// e:
			//		Mouse event
			// tags:
			//		callback
	
			//console.log('.dnd.PureSource ::: onMouseUp');
			if(this.mouseDown){
				this.mouseDown = false;
				dojox.mdnd.PureSource.superclass.onMouseUp.call(this, e);
			}
		},
	
		onOverEvent: function(){
			// summary:
			//		Called once, when mouse is over our container.
			// tags:
			//		callback
	
			//console.log('dojox.mdnd.PureSource ::: onOverEvent');
			dojox.mdnd.PureSource.superclass.onOverEvent.call(this);
			Manager.manager().overSource(this);
		},
		
		onOutEvent: function(){
			// summary:
			//		Called once, when mouse is out our container.
			// tags:
			//		callback
	
			//console.log('dojox.mdnd.PureSource ::: onOutEvent');
			dojox.mdnd.PureSource.superclass.onOutEvent.call(this);
			Manager.manager().outSource(this);
		},
		
		_markDndStatus: function(/*Boolean*/copy){
			// summary:
			//		Changes source's state based on "copy" status.
			// copy:
			//		Copy status.
			// tags:
			//		protected
	
			//console.log('dojox.mdnd.PureSource ::: _markDndStatus');
			this._changeState("Source", copy ? "Copied" : "Moved");
		},
	
		_legalMouseDown: function(/*Event*/e){
			// summary:
			//		Checks if user clicked on "approved" items.
			// e:
			//		Mouse event.
			// returns:
			//		True if user clicked on "approved" items.
			// tags:
			//		protected
	
			//console.log('dojox.mdnd.PureSource ::: _legalMouseDown');
			if(!this.withHandles){ return true; }
			for(var node = e.target; node && !domClass.contains(node, "dojoDndItem"); node = node.parentNode){
				if(domClass.contains(node, "dojoDndHandle")){ return true; }
			}
			return false;	// Boolean
		}
	});
});