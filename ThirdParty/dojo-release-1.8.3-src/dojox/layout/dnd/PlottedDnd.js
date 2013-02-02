dojo.provide("dojox.layout.dnd.PlottedDnd");

dojo.require("dojo.dnd.Source");
dojo.require("dojo.dnd.Manager");
dojo.require("dojox.layout.dnd.Avatar");

dojo.declare("dojox.layout.dnd.PlottedDnd", [dojo.dnd.Source], {
	// summary:
	//		dnd source handling plotted zone to show the dropping area
	GC_OFFSET_X: dojo.dnd.manager().OFFSET_X,
	GC_OFFSET_Y: dojo.dnd.manager().OFFSET_Y,
	
	constructor: function(/*Node*/node, /*Object*/params){
		
		this.childBoxes 		= null;
		this.dropIndicator		= new dojox.layout.dnd.DropIndicator("dndDropIndicator", "div");
		this.withHandles 		= params.withHandles;
		this.handleClasses	 	= params.handleClasses;
		this.opacity 			= params.opacity;
		this.allowAutoScroll	= params.allowAutoScroll;//MODIF MYS
		this.dom                = params.dom;
		this.singular			= true;
		this.skipForm 			= true;
		this._over 				= false;
		this.defaultHandleClass = "GcDndHandle";
		this.isDropped			= false;
		this._timer				= null;
		//Initialize the params to calculate offset
  		this.isOffset = (params.isOffset)?true:false;
  		this.offsetDrag = (params.offsetDrag) ? params.offsetDrag : {x:0,y:0};
		this.hideSource = params.hideSource ? params.hideSource : true;
		this._drop = this.dropIndicator.create();
		
	},
	
	_calculateCoords : function(/*Boolean*/height){
		// summary:
		//		Calculate each position of children
		dojo.forEach(this.node.childNodes, function(child){
			var c = dojo.coords(child, true);
			child.coords = {
				xy: c,
				w: child.offsetWidth / 2,
				h: child.offsetHeight / 2,
				mw: c.w
			};
			if(height){
				child.coords.mh = c.h;
			}
		}, this);
	},
	
	_legalMouseDown: function(/*Event*/e){
		// summary:
		//		Checks if user clicked on "approved" items.
		if(!this.withHandles){ return true; }
		for(var node = (e.target); node && node != this.node; node = node.parentNode){
			if(dojo.hasClass(node, this.defaultHandleClass)){
				return true;
			}
		}
		return false;	// Boolean
	},
	
	setDndItemSelectable: function(/*Node*/node, /*Boolean*/isSelectable) {
		// summary:
		//		set an item as selectable
		for(var _node = node; _node && node != this.node; _node = _node.parentNode) {
			if (dojo.hasClass(_node,"dojoDndItem")) {
				dojo.setSelectable(_node, isSelectable);
				return;
			}
		}
	},
	
	getDraggedWidget: function(/*Node*/node) {
		// summary:
		//		Return one or more widget selected during the drag.
		var _node = node;
		while (_node && _node.nodeName.toLowerCase()!="body" && !dojo.hasClass(_node,"dojoDndItem")) {
			_node = _node.parentNode;
		}
		return (_node) ? dijit.byNode(_node) : null;
	},
	
	isAccepted: function(/*Node*/ node) {
		// summary:
		//		test if this node can be accepted
		var _dndType = (node) ? node.getAttribute("dndtype") : null;
		return (_dndType && _dndType in this.accept);
	},
	
	onDndStart:function(/*Object*/source, /*Array*/nodes, /*Object*/copy){
		// summary:
		//		Called to initiate the DnD operation.

		this.firstIndicator = (source == this);
		this._calculateCoords(true);
		//this.isDropped = true;
		var m = dojo.dnd.manager();
		if(nodes[0].coords){
			this._drop.style.height = nodes[0].coords.mh + "px";
			dojo.style(m.avatar.node, "width", nodes[0].coords.mw + "px");
		}else{
			this._drop.style.height = m.avatar.node.clientHeight+"px";
		}
		this.dndNodes = nodes;
		dojox.layout.dnd.PlottedDnd.superclass.onDndStart.call(this,source, nodes, copy);
		if(source == this && this.hideSource){
			dojo.forEach(nodes, function(n){
				dojo.style(n, "display","none");
			});
		}
			
	},

	onDndCancel:function(){
		// summary:
		//		Called to cancel the DnD operation.
		var m = dojo.dnd.manager();
		if(m.source == this && this.hideSource){
			var nodes = this.getSelectedNodes();
			dojo.forEach(nodes, function(n){
				dojo.style(n, "display","");
			});
		}
		dojox.layout.dnd.PlottedDnd.superclass.onDndCancel.call(this);
		this.deleteDashedZone();
	},
	
	onDndDrop: function(source,nodes,copy,target) {
		// summary:
		//		Called to finish the DnD operation
		try{
			if(!this.isAccepted(nodes[0])){
				this.onDndCancel();
			}else{
				if(source == this && this._over && this.dropObject){
					this.current = this.dropObject.c;
				}
				dojox.layout.dnd.PlottedDnd.superclass.onDndDrop.call(this, source, nodes, copy, target);
				this._calculateCoords(true);
			}
		}catch(e){
			console.warn(e);
		}
	},
			
	onMouseDown: function(/*Event*/e) {
		// summary:
		//		Event processor for onmousedown.
		if(this.current == null){
			this.selection = {};
		}else{
			if(this.current == this.anchor){
				this.anchor = null;
			}
		}
		if(this.current !== null){
			var c = dojo.coords(this.current, true);
			this.current.coords = {
				xy: c,
				w: this.current.offsetWidth / 2,
				h: this.current.offsetHeight / 2,
				mh: c.h,
				mw: c.w
			};
			this._drop.style.height = this.current.coords.mh + "px";
			
			if(this.isOffset){
				if(this.offsetDrag.x == 0 && this.offsetDrag.y == 0){
					var NoOffsetDrag = true;
					var coords = dojo.coords(this._getChildByEvent(e));
					this.offsetDrag.x = coords.x - e.pageX;
					this.offsetDrag.y = coords.y - e.clientY;
				}
				if(this.offsetDrag.y < 16 && this.current != null){
					this.offsetDrag.y = this.GC_OFFSET_Y;
				}

				var m = dojo.dnd.manager();
				m.OFFSET_X = this.offsetDrag.x;
				m.OFFSET_Y = this.offsetDrag.y;
				if (NoOffsetDrag) {
					this.offsetDrag.x = 0;
					this.offsetDrag.y = 0;
				}
			}
		}
		
		if(dojo.dnd.isFormElement(e)){
			this.setDndItemSelectable(e.target,true);
		}else{
			this.containerSource = true;
			var _draggedWidget = this.getDraggedWidget(e.target);
			if(_draggedWidget && _draggedWidget.dragRestriction){
			// FIXME: not clear what this was supposed to mean ... this code needs more cleanups.
			//	dragRestriction = true;
			}else{
				dojox.layout.dnd.PlottedDnd.superclass.onMouseDown.call(this,e);
			}
		}
	},

	onMouseUp: function(/*Event*/e) {
		// summary:
		//		Event processor for onmouseup.
		dojox.layout.dnd.PlottedDnd.superclass.onMouseUp.call(this,e);
		this.containerSource = false;
		if (!dojo.isIE && this.mouseDown){
			this.setDndItemSelectable(e.target,true);
		}
		var m = dojo.dnd.manager();
		m.OFFSET_X = this.GC_OFFSET_X;
		m.OFFSET_Y = this.GC_OFFSET_Y;
	},
	
	onMouseMove: function(e) {
		// summary:
		//		Event processor for onmousemove
		var m = dojo.dnd.manager();
		if(this.isDragging) {
			var before = false;
			if(this.current != null || (this.current == null && !this.dropObject)){
				if(this.isAccepted(m.nodes[0]) || this.containerSource){
					before = this.setIndicatorPosition(e);
				}
			}
			if(this.current != this.targetAnchor || before != this.before){
				this._markTargetAnchor(before);
				m.canDrop(!this.current || m.source != this || !(this.current.id in this.selection));
			}

			if(this.allowAutoScroll){
				this._checkAutoScroll(e);
			}
		}else{
			if(this.mouseDown && this.isSource){
				var nodes = this.getSelectedNodes();
				if(nodes.length){
					m.startDrag(this, nodes, this.copyState(dojo.isCopyKey(e)));
				}
			}

			if(this.allowAutoScroll){
				this._stopAutoScroll();
			}
		}
	},
	
	_markTargetAnchor: function(/*Boolean*/before){
		// summary:
		//		Assigns a class to the current target anchor based on "before" status
		if(this.current == this.targetAnchor && this.before == before){ return; }
		this.targetAnchor = this.current;
		this.targetBox = null;
		this.before = before;
	},
	
	_unmarkTargetAnchor: function(){
		// summary:
		//		Removes a class of the current target anchor based on "before" status.
		if(!this.targetAnchor){ return; }
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;
	},
	
	setIndicatorPosition: function(/*Event*/e) {
		// summary:
		//		set the position of the drop indicator
		var before = false;
		if(this.current){
			if (!this.current.coords || this.allowAutoScroll) {
				this.current.coords = {
					xy: dojo.coords(this.current, true),
					w: this.current.offsetWidth / 2,
					h: this.current.offsetHeight / 2
				};
			}
			before = this.horizontal ?
				(e.pageX - this.current.coords.xy.x) < this.current.coords.w :
				(e.pageY - this.current.coords.xy.y) < this.current.coords.h
			this.insertDashedZone(before);
		}else{
			if(!this.dropObject /*|| dojo.isIE*/){ this.insertDashedZone(false); }
		}
		return before;
	},
	

	onOverEvent:function(){
		this._over = true;
		dojox.layout.dnd.PlottedDnd.superclass.onOverEvent.call(this);
		if (this.isDragging) {
			var m = dojo.dnd.manager();
			if (!this.current && !this.dropObject && this.getSelectedNodes()[0] && this.isAccepted(m.nodes[0]))
				this.insertDashedZone(false);
		}
	},
	
	onOutEvent: function() {
		this._over = false;
		this.containerSource = false;
		dojox.layout.dnd.PlottedDnd.superclass.onOutEvent.call(this);
		if (this.dropObject) this.deleteDashedZone();
	},
	
	deleteDashedZone: function() {
		// summary:
		//		hide the dashed zone
		this._drop.style.display = "none";
			var next = this._drop.nextSibling;
			while (next != null) {
				next.coords.xy.y -= parseInt(this._drop.style.height);
				next = next.nextSibling;
			}
		delete this.dropObject;
	},
	
	insertDashedZone: function(/*Boolean*/before) {
		// summary:
		//		Insert the dashed zone at the right place
		if(this.dropObject){
			if( before == this.dropObject.b &&
				((this.current && this.dropObject.c == this.current.id) ||
				(!this.current && !this.dropObject.c))
			){
				return;
			}else{
				this.deleteDashedZone();
			}
		}
		this.dropObject = { n: this._drop, c: this.current ? this.current.id : null, b: before};
		if(this.current){
			dojo.place(this._drop, this.current, before ? "before" : "after");
			if(!this.firstIndicator){
				var next = this._drop.nextSibling;
				while(next != null){
					next.coords.xy.y += parseInt(this._drop.style.height);
					next = next.nextSibling;
				}
			}else{
				this.firstIndicator = false;
			}
		}else{
			this.node.appendChild(this._drop);
		}
		this._drop.style.display = "";
	},
	
	insertNodes: function(/*Boolean*/addSelected, /*Array*/data, /*Boolean*/before, /*Node*/anchor){
		// summary:
		//		Inserts new data items (see Dojo Container's insertNodes method for details).
		if(this.dropObject){
			dojo.style(this.dropObject.n,"display","none");
			dojox.layout.dnd.PlottedDnd.superclass.insertNodes.call(this,true,data,true,this.dropObject.n);
			this.deleteDashedZone();
		}else{
			 return dojox.layout.dnd.PlottedDnd.superclass.insertNodes.call(this,addSelected,data,before,anchor);
		}
		var _widget = dijit.byId(data[0].getAttribute("widgetId"));
		if (_widget) {
			dojox.layout.dnd._setGcDndHandle(_widget, this.withHandles, this.handleClasses);
			if(this.hideSource)
				dojo.style(_widget.domNode, "display", "");
		}
	},
	
	_checkAutoScroll: function(e){
		if(this._timer){
			clearTimeout(this._timer);
		}
		this._stopAutoScroll();
		var node = this.dom,
			y = this._sumAncestorProperties(node,"offsetTop")
		;
		//Down
		if( (e.pageY - node.offsetTop +30 ) > node.clientHeight ){
			this.autoScrollActive = true;
			this._autoScrollDown(node);
		} else if ( (node.scrollTop > 0) && (e.pageY - y) < 30){
			//Up
			this.autoScrollActive = true;
			this._autoScrollUp(node);
		}
	},

	_autoScrollUp: function(node){
		if( this.autoScrollActive && node.scrollTop > 0) {
			node.scrollTop -= 30;
			this._timer = setTimeout(dojo.hitch(this,"_autoScrollUp",node), 100);
		}
	},

	_autoScrollDown: function(node){
		if( this.autoScrollActive && (node.scrollTop < (node.scrollHeight-node.clientHeight))){
			node.scrollTop += 30;
			this._timer = setTimeout(dojo.hitch(this, "_autoScrollDown",node), 100);
		}
	},

	_stopAutoScroll: function(){
		this.autoScrollActive = false;
	},

	_sumAncestorProperties: function(node, prop){
		// summary:
		//		Returns the sum of the passed property on all ancestors of node.
		node = dojo.byId(node);
		if(!node){ return 0; }
		
		var retVal = 0;
		while(node){
			var val = node[prop];
			if(val){
				retVal += val - 0;
				if(node == dojo.body()){ break; }// opera and khtml #body & #html has the same values, we only need one value
			}
			node = node.parentNode;
		}
		return retVal;	//	integer
	}
	
});

dojox.layout.dnd._setGcDndHandle = function(service,withHandles,handleClasses, first) {
	var cls = "GcDndHandle";
	if(!first){
		dojo.query(".GcDndHandle", service.domNode).removeClass(cls);
	}
	if(!withHandles){
		dojo.addClass(service.domNode, cls);
	}else{
		var _hasHandle = false;
		for(var i = handleClasses.length - 1; i >= 0; i--){
			var _node = dojo.query("." + handleClasses[i], service.domNode)[0];
			if(_node){
				_hasHandle = true;
				if(handleClasses[i] != cls){
					var _gripNode = dojo.query("." + cls, service.domNode);
					if(_gripNode.length == 0){
						dojo.removeClass(service.domNode, cls);
					}else{
						_gripNode.removeClass(cls);
					}
					dojo.addClass(_node, cls);
				}
			}
		}
		if(!_hasHandle){
			dojo.addClass(service.domNode, cls);
		}
	}
};

dojo.declare("dojox.layout.dnd.DropIndicator", null, {
	// summary:
	//		An empty widget to show at the user the drop zone of the widget.
	constructor: function(/*String*/cn, /*String*/tag) {
		this.tag = tag || "div";
		this.style = cn || null;
	},

	isInserted : function(){
		return (this.node.parentNode && this.node.parentNode.nodeType==1);
	},

	create : function(/*Node*//*nodeRef*/){
		if(this.node && this.isInserted()){ return this.node; }
		var h = "90px",
			el = dojo.doc.createElement(this.tag);
			
		if(this.style){
			el.className = this.style;
			el.style.height = h;
		}else{
			// FIXME: allow this to be done mostly in CSS?
			dojo.style(el, {
				position:"relative",
				border:"1px dashed #F60",
				margin:"2px",
				height: h
			})
		}
		this.node = el;
		return el;
	},
	
	destroy : function(){
		if(!this.node || !this.isInserted()){ return; }
		this.node.parentNode.removeChild(this.node);
		this.node = null;
	}
});

dojo.extend(dojo.dnd.Manager, {
	
	canDrop: function(flag){
		var canDropFlag = this.target && flag;
		if(this.canDropFlag != canDropFlag){
			this.canDropFlag = canDropFlag;
			if(this.avatar){ this.avatar.update(); }
		}
		
	},
	
	makeAvatar: function(){
		// summary:
		//		Makes the avatar, it is separate to be overwritten dynamically, if needed.
		return (this.source.declaredClass == "dojox.layout.dnd.PlottedDnd") ?
			new dojox.layout.dnd.Avatar(this, this.source.opacity) :
			new dojo.dnd.Avatar(this)
		;
	}
});

if(dojo.isIE){
	dojox.layout.dnd.handdleIE = [
		dojo.subscribe("/dnd/start", null, function(){
			IEonselectstart = document.body.onselectstart;
			document.body.onselectstart = function(){ return false; };
		}),
		dojo.subscribe("/dnd/cancel", null, function(){
			document.body.onselectstart = IEonselectstart;
		}),
		dojo.subscribe("/dnd/drop", null, function(){
			document.body.onselectstart = IEonselectstart;
		})
	];
	dojo.addOnWindowUnload(function(){
		dojo.forEach(dojox.layout.dnd.handdleIE, dojo.unsubscribe);
	});
}
