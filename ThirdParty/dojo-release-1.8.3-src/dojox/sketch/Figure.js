define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/_base/html",
	"../gfx",
	"../xml/DomParser",
	"./UndoStack"
], function(dojo){
	dojo.experimental("dojox.sketch");

	var ta=dojox.sketch;
	ta.tools={};
	ta.registerTool=function(type, fn){ ta.tools[type]=fn; };
	ta.Figure = function(mixin){
		var self=this;
		this.annCounter=1;

		this.shapes=[];
		this.image=null;
		this.imageSrc=null;
		this.size={ w:0, h:0 };
		this.surface=null;
		this.group=null;
		//node should have tabindex set, otherwise keyboard action does not work
		this.node=null;

		this.zoomFactor=1;	//	multiplier for zooming.
		
		this.tools=null;	//	toolbar reference.

		this.obj={};		//	lookup table for shapes.  Not keen on this solution.

		dojo.mixin(this,mixin);

		//	what is selected.
		this.selected=[];
		this.hasSelections=function(){ return this.selected.length>0 };
		this.isSelected=function(obj){
			for(var i=0; i<self.selected.length; i++){
				if(self.selected[i]==obj){ return true; }
			}
			return false;
		};
		this.select=function(obj){
			//	TODO: deal with multiple vs. single selections.
			if(!self.isSelected(obj)){
				//	force single select
				self.clearSelections();
				self.selected=[ obj ];
			}
			//	force a bbox update, regardless
			obj.setMode(ta.Annotation.Modes.View);
			obj.setMode(ta.Annotation.Modes.Edit);
		};
		this.deselect=function(obj){
			var idx=-1;
			for(var i=0; i<self.selected.length; i++){
				if(self.selected[i]==obj){
					idx=i;
					break;
				}
			}
			if(idx>-1){
				obj.setMode(ta.Annotation.Modes.View);
				self.selected.splice(idx,1);
			}
			return obj;
		};
		this.clearSelections=function(){
			for(var i=0; i<self.selected.length; i++){
				self.selected[i].setMode(ta.Annotation.Modes.View);
			}
			self.selected=[];
		};
		this.replaceSelection=function(n, o){
			if(!self.isSelected(o)){
				self.select(n);
				return;
			}
			var idx=-1;
			for(var i=0; i<self.selected.length; i++){
				if(self.selected[i]==o){
					idx=i;
					break;
				}
			}
			if(idx>-1){
				self.selected.splice(idx,1,n);
			}
		};

		//	for the drag and drop handlers.
		this._c=null;		//	current shape
		this._ctr=null;	//	container measurements
		this._lp=null;		//	last position
		this._action=null;
		this._prevState=null;
		this._startPoint=null;	//	test to record a move.

		//	if an object isn't selected and we're dragging anyways.
		this._ctool=null;	//	hard code it.
		this._start=null;
		this._end=null;
		this._absEnd=null;
		this._cshape=null;

		this._dblclick=function(e){
			var o=self._fromEvt(e);
			if(o){
				self.onDblClickShape(o,e);
			}
		};

		this._keydown=function(e){
			var prevent=false;
			if(e.ctrlKey){
				if(e.keyCode===90 || e.keyCode===122){ //ctrl+z
					self.undo();
					prevent = true;
				}
				else if(e.keyCode===89 || e.keyCode===121){ //ctrl+y
					self.redo();
					prevent = true;
				}
			}

			if(e.keyCode===46 || e.keyCode===8){ //delete or backspace
				self._delete(self.selected);
				prevent = true;
			}

			if(prevent){
				dojo.stopEvent(e);
			}
		};
	
		//	drag handlers.
		this._md=function(e){
			//in IE, when clicking into the drawing canvas, the node does not get focused,
			//do it manually here to force it, otherwise the keydown event listener is
			//never triggered in IE.
			if(dojox.gfx.renderer=='vml'){
				self.node.focus();
			}
			var o=self._fromEvt(e);
			self._startPoint={ x:e.pageX, y:e.pageY };

			self._ctr=dojo.position(self.node);
			//	figure out the coordinates taking scroll into account
			var scroll={x:self.node.scrollLeft,y:self.node.scrollTop};
			//var win = dojo.window.get(self.node.ownerDocument);
			//var scroll=dojo.withGlobal(win,dojo._docScroll);
			self._ctr={x:self._ctr.x-scroll.x, y:self._ctr.y-scroll.y};
			var X=e.clientX-self._ctr.x, Y=e.clientY-self._ctr.y;
			self._lp={ x:X, y:Y };

			//	capture it separately
			self._start={ x:X, y:Y };
			self._end={ x:X, y:Y };
			self._absEnd={ x:X, y:Y };
			if(!o){
				self.clearSelections();
				self._ctool.onMouseDown(e);
			}else{
				if(o.type && o.type()!="Anchor"){
					if(!self.isSelected(o)){
						self.select(o);
						self._sameShapeSelected=false;
					}else{
						self._sameShapeSelected=true;
					}
				}
				o.beginEdit();
				self._c=o;
			}
		};
		this._mm=function(e){
			if(!self._ctr){ return; }
			if(self._c && !self._c.shape){
				//the selected item is gone, cancel editing mode
				self._clearMouse();
				return;
			}
			var x=e.clientX-self._ctr.x;
			var y=e.clientY-self._ctr.y;
			var dx=x-self._lp.x;
			var dy=y-self._lp.y;
			self._absEnd={x:x, y:y};
			if(self._c){
				//self._c.doChange({dx:dx, dy:dy});
				self._c.setBinding({dx:dx/self.zoomFactor, dy:dy/self.zoomFactor});
				self._lp={x:x, y:y};
			} else {
				self._end={x:dx, y:dy};
				var rect={
					x:Math.min(self._start.x,self._absEnd.x),
					y:Math.min(self._start.y,self._absEnd.y),
					width:Math.abs(self._start.x-self._absEnd.x),
					height:Math.abs(self._start.y-self._absEnd.y)
				}
				if(rect.width && rect.height){
					self._ctool.onMouseMove(e,rect);
				}
			}
		};
		this._mu=function(e){
			if(self._c){
				//	record the event.
				if(self._c.shape){
					self._c.endEdit(); //make sure it's not deleted
				}
			}else{
				self._ctool.onMouseUp(e);
			}
			self._clearMouse();
		};
		this._clearMouse=function(){
			//	clear the stuff out.
			self._c=self._ctr=self._lp=self._action=self._prevState=self._startPoint=null;
			self._cshape=self._start=self._end=self._absEnd=null;
		};

		this.initUndoStack();
	};

	var p=ta.Figure.prototype;
	p.initUndoStack=function(){
		this.history=new ta.UndoStack(this);
	};
	p.setTool=function(/*dojox.sketch._Plugin*/t){
		this._ctool=t;
	};
    //gridSize: int
    //		if it is greater than 0, all new shapes placed on the drawing will have coordinates
    //		snapped to the gridSize. For example, if gridSize is set to 10, all coordinates
    //		(only including coordinates which specifies the x/y position of shape are affected
    //		by this parameter) will be dividable by 10
    p.gridSize=0;
    p._calCol=function(v){
        return this.gridSize?(Math.round(v/this.gridSize)*this.gridSize):v;
    };
	p._delete=function(arr,noundo){
		for(var i=0; i<arr.length; i++){
			//var before=arr[i].serialize();
			arr[i].setMode(ta.Annotation.Modes.View);
			arr[i].destroy(noundo);
			this.remove(arr[i]);
			this._remove(arr[i]);
			if(!noundo){
				arr[i].onRemove();
			}
		}
		arr.splice(0,arr.length);
	};
	p.onDblClickShape=function(shape,e){
		if(shape['onDblClick']){
			shape.onDblClick(e);
		}
	};

	p.onCreateShape=function(shape){};
	p.onBeforeCreateShape=function(shape){};
	p.initialize=function(node){
		this.node=node;
		this.surface=dojox.gfx.createSurface(node, this.size.w, this.size.h);
		//this.backgroundRect=this.surface.createRect({ x:0, y:0, width:this.size.w, height:this.size.h })
		//	.setFill("white");
		this.group=this.surface.createGroup();

		this._cons=[];
		var es=this.surface.getEventSource();
		this._cons.push(
			//	kill any dragging events.
			//		for FF
			dojo.connect(es, "ondraggesture", dojo.stopEvent),
			dojo.connect(es, "ondragenter", dojo.stopEvent),
			dojo.connect(es, "ondragover", dojo.stopEvent),
			dojo.connect(es, "ondragexit", dojo.stopEvent),
			dojo.connect(es, "ondragstart", dojo.stopEvent),
			//		for IE
			dojo.connect(es, "onselectstart", dojo.stopEvent),
			//	hook up the drag system.
			dojo.connect(es, 'onmousedown', this._md),
			dojo.connect(es, 'onmousemove', this._mm),
			dojo.connect(es, 'onmouseup', this._mu),
			// misc hooks
			dojo.connect(es, 'onclick', this, 'onClick'),
			dojo.connect(es, 'ondblclick', this._dblclick),
			dojo.connect(node, 'onkeydown', this._keydown));
		
		this.image=this.group.createImage({ width:this.imageSize.w, height:this.imageSize.h, src:this.imageSrc });
	};

	p.destroy=function(isLoading){
		if(!this.node){ return; }
		if(!isLoading){
			if(this.history){ this.history.destroy(); }
			if(this._subscribed){
				dojo.unsubscribe(this._subscribed);
				delete this._subscribed;
			}
		}
		dojo.forEach(this._cons, dojo.disconnect);
		this._cons=[];

		//TODO: how to destroy a surface properly?
		dojo.empty(this.node);

		//this.node.removeChild(this.surface.getEventSource());
		this.group=this.surface=null;
		this.obj={};
		this.shapes=[];
	};
	p.nextKey=function(){ return "annotation-"+this.annCounter++; };
	p.draw=function(){ };
	p.zoom=function(pct){
		//	first get the new dimensions
		this.zoomFactor=pct/100;
		var w=this.size.w*this.zoomFactor;
		var h=this.size.h*this.zoomFactor;
		this.surface.setDimensions(w, h);
		//	then scale it.
		this.group.setTransform(dojox.gfx.matrix.scale(this.zoomFactor, this.zoomFactor));

		for(var i=0; i<this.shapes.length; i++){
			this.shapes[i].zoom(this.zoomFactor);
		}
	};
	p.getFit=function(){
		//	assume fitting the parent node.
//		var box=dojo.html.getContentBox(this.node.parentNode);
		//the following should work under IE and FF, not sure about others though
		var wF=(this.node.parentNode.offsetWidth-5)/this.size.w;
		var hF=(this.node.parentNode.offsetHeight-5)/this.size.h;
		return Math.min(wF, hF)*100;
	};
	p.unzoom=function(){
		//	restore original size.
		this.zoomFactor=1;
		this.surface.setDimensions(this.size.w, this.size.h);
		this.group.setTransform();
	};

	//	object registry for drag handling.
	p._add=function(obj){ this.obj[obj._key]=obj; };
	p._remove=function(obj){
		if(this.obj[obj._key]){
			delete this.obj[obj._key];
		}
	};
	p._get=function(key){
		if(key&&key.indexOf("bounding")>-1){
			key=key.replace("-boundingBox","");
		}else if(key&&key.indexOf("-labelShape")>-1){
			key=key.replace("-labelShape","");
		}
		return this.obj[key];
	};
	p._keyFromEvt=function(e){
		var key=e.target.id+"";
		if(key.length==0){
			//	ancestor tree until you get to the end (meaning this.surface)
			var p=e.target.parentNode;
			var node=this.surface.getEventSource();
			while(p && p.id.length==0 && p!=node){
				p=p.parentNode;
			}
			key=p.id;
		}
		return key;
	};
	p._fromEvt=function(e){
		return this._get(this._keyFromEvt(e));
	};

	p.add=function(annotation){
		for(var i=0; i<this.shapes.length; i++){
			if(this.shapes[i]==annotation){ return true; }
		}
		this.shapes.push(annotation);
		return true;
	};
	p.remove=function(annotation){
		var idx=-1;
		for(var i=0; i<this.shapes.length; i++){
			if(this.shapes[i]==annotation){
				idx=i;
				break;
			}
		}
		if(idx>-1){ this.shapes.splice(idx, 1); }
		return annotation;
	};
	p.getAnnotator=function(id){
		for(var i=0; i<this.shapes.length; i++){
			if(this.shapes[i].id==id) {
				return this.shapes[i];
			}
		}
		return null;
	};

	p.convert=function(ann, t){
		//	convert an existing annotation to a different kind of annotation
		var ctor=t+"Annotation";
		if(!ta[ctor]){ return; }
		var type=ann.type(), id=ann.id, label=ann.label, mode=ann.mode, tokenId=ann.tokenId;
		var start, end, control, transform;
		switch(type){
			case "Preexisting":
			case "Lead":{
				transform={dx:ann.transform.dx, dy:ann.transform.dy };
				start={x:ann.start.x, y:ann.start.y};
				end={x:ann.end.x, y:ann.end.y };
				var cx=end.x-((end.x-start.x)/2);
				var cy=end.y-((end.y-start.y)/2);
				control={x:cx, y:cy};
				break;
			}
			case "SingleArrow":
			case "DoubleArrow":{
				transform={dx:ann.transform.dx, dy:ann.transform.dy };
				start={x:ann.start.x, y:ann.start.y};
				end={x:ann.end.x, y:ann.end.y };
				control={x:ann.control.x, y:ann.control.y};
				break;
			}
			case "Underline":{
				transform={dx:ann.transform.dx, dy:ann.transform.dy };
				start={x:ann.start.x, y:ann.start.y};
				control={x:start.x+50, y:start.y+50 };
				end={x:start.x+100, y:start.y+100 };
				break;
			}
			case "Brace":{ }
		}
		var n=new ta[ctor](this, id);

		if(n.type()=="Underline"){
			//	special handling, since we never move the start point.
			n.transform={dx:transform.dx+start.x, dy:transform.dy+start.y };
		} else {
			if(n.transform){ n.transform=transform; }
			if(n.start){ n.start=start; }
		}
		if(n.end){ n.end=end; }
		if(n.control){ n.control=control; }
		n.label=label;
		n.token=dojo.lang.shallowCopy(ann.token);
		n.initialize();

		this.replaceSelection(n, ann);
		this._remove(ann);
		this.remove(ann);
		ann.destroy();

		//	this should do all the things we need it to do for getting it registered.
		n.setMode(mode);
	};
	p.setValue=function(text){
		var obj=dojox.xml.DomParser.parse(text);
		var node=this.node;
		this.load(obj,node);
		//this.zoom(this.zoomFactor*100); //zoom to orignal scale
	};
	p.load=function(obj, n){
		//	create from pseudo-DOM
		if(this.surface){ this.destroy(true); }
		var node=obj.documentElement;	//	should be either the document or the docElement
		this.size={
			w:parseFloat(node.getAttribute('width'),10),
			h:parseFloat(node.getAttribute('height'),10)
		};
		var g=node.childrenByName("g")[0];
		var img=g.childrenByName("image")[0];
		this.imageSize={
			w:parseFloat(img.getAttribute('width'),10),
			h:parseFloat(img.getAttribute('height'),10)
		};
		this.imageSrc=img.getAttribute("xlink:href");
		this.initialize(n);

		//	now let's do the annotations.
		var ann=g.childrenByName("g");
		for(var i=0; i<ann.length; i++){ this._loadAnnotation(ann[i]); }
		if(this._loadDeferred){
			this._loadDeferred.callback(this);
			this._loadDeferred=null;
		}
		this.onLoad();
	};
	p.onLoad=function(){};
	p.onClick=function(){};
	p._loadAnnotation=function(obj){
		var ctor=obj.getAttribute('dojoxsketch:type')+"Annotation";
		if(ta[ctor]){
			var a=new ta[ctor](this, obj.id);
			a.initialize(obj);
			this.nextKey();
			a.setMode(ta.Annotation.Modes.View);
			this._add(a);
			return a;
		}
		return null;
	};
	
	p.onUndo=function(){};
	p.onBeforeUndo=function(){};
	p.onRedo=function(){};
	p.onBeforeRedo=function(){};
	p.undo=function(){
		if(this.history){
			this.onBeforeUndo();
			this.history.undo();
			this.onUndo();
		}
	};
	p.redo=function(){
		if(this.history){
			this.onBeforeRedo();
			this.history.redo();
			this.onRedo();
		}
	};
	p.serialize=function(){
		var s='<svg xmlns="http://www.w3.org/2000/svg" '
			+ 'xmlns:xlink="http://www.w3.org/1999/xlink" '
			+ 'xmlns:dojoxsketch="http://dojotoolkit.org/dojox/sketch" '
			+ 'width="' + this.size.w + '" height="' + this.size.h + '">'
			+ '<g>'
			+ '<image xlink:href="' + this.imageSrc + '" x="0" y="0" width="'
			+ this.size.w + '" height="' + this.size.h + '" />';
		for(var i=0; i<this.shapes.length; i++){ s+= this.shapes[i].serialize(); }
		s += '</g></svg>';
		return s;
	};
	p.getValue=p.serialize;

	return dojox.sketch.Figure;
});
