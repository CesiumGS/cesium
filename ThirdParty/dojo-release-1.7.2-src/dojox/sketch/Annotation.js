define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/json",
	"./Anchor",
	"./_Plugin"
], function(dojo){
	dojo.declare("dojox.sketch.AnnotationTool", dojox.sketch._Plugin, {
		onMouseDown: function(e){
			this._omd=true;
		},
		onMouseMove: function(e,rect){
			if(!this._omd){
				return;
			}
			if(this._cshape){
				this._cshape.setShape(rect);
			} else {
				this._cshape=this.figure.surface.createRect(rect)
					.setStroke({color:"#999", width:1, style:"ShortDot"})
					.setFill([255,255,255,0.7]);
				this._cshape.getEventSource().setAttribute("shape-rendering","crispEdges");
			}
		},
		onMouseUp: function(e){
			if(!this._omd){
				return;
			}
			this._omd=false;
			var f=this.figure;
			if(this._cshape){
				f.surface.remove(this._cshape);
				delete this._cshape;
			}
			if(!(f._startPoint.x==e.pageX&&f._startPoint.y==e.pageY)){
				//	The minimum number of pixels one has to travel before a shape
				//		gets drawn.
				var limit=10;
				if(Math.max(
					limit,
					Math.abs(f._absEnd.x-f._start.x),
					Math.abs(f._absEnd.y-f._start.y)
				)>limit){
					this._create(f._start, f._end);
				}
			}
		},
		_create: function(start,end){
			//	create a new shape, needs to be accessible from the
			//		dragging functions.
			var f=this.figure;
			var _=f.nextKey();
			var a=new (this.annotation)(f, _);
			a.transform={
				dx:f._calCol(start.x/f.zoomFactor),
				dy:f._calCol(start.y/f.zoomFactor)
			};
			a.end={
				x:f._calCol(end.x/f.zoomFactor),
				y:f._calCol(end.y/f.zoomFactor)
			};
			if(a.control){
				a.control={
					x:f._calCol((end.x/2)/f.zoomFactor),
					y:f._calCol((end.y/2)/f.zoomFactor)
				};
			}
			f.onBeforeCreateShape(a);
			a.initialize();
			f.select(a);
			f.onCreateShape(a);
			f.history.add(dojox.sketch.CommandTypes.Create,a);
		}
	});

	dojox.sketch.Annotation=function(figure, id){
		//	for editing stuff.
		this.id=this._key=id;
		this.figure=figure;
		this.mode=dojox.sketch.Annotation.Modes.View;
		this.shape=null;	// dojox.gfx.Group
		this.boundingBox=null;	// rect for boundaries
		this.hasAnchors=true;
		this.anchors={};	//	dojox.sketch.Anchor
		this._properties={
			'stroke':{ color:"blue", width:2 },
			'font': {family:"Arial", size:16, weight:"bold"},
			'fill': "blue",
			'label': ""
		};

		if(this.figure){
			this.figure.add(this);
		}
	};

	var p=dojox.sketch.Annotation.prototype;
	p.constructor=dojox.sketch.Annotation;
	p.type=function(){ return ''; };
	p.getType=function(){ return dojox.sketch.Annotation; };
	p.onRemove=function(noundo){
		//this.figure._delete([this],noundo);
		this.figure.history.add(dojox.sketch.CommandTypes.Delete, this, this.serialize());
	};
	p.property=function(name,/*?*/value){
		var r;
		name=name.toLowerCase();
		if(this._properties[name]!==undefined){
			r=this._properties[name];
		}
		if(arguments.length>1){
			this._properties[name]=value;
			if(r!=value){
				this.onPropertyChange(name,r);
			}
		}
		return r;
	};
	p.onPropertyChange=function(name,oldvalue){};
	p.onCreate=function(){
		this.figure.history.add(dojox.sketch.CommandTypes.Create,this);
	}
	p.onDblClick=function(e){
		var l=prompt('Set new text:',this.property('label'));
		if(l!==false){
			this.beginEdit(dojox.sketch.CommandTypes.Modify);
			this.property('label',l);
			this.draw();
			this.endEdit();
		}
	}
	p.initialize=function(){ };
	p.destroy=function(){ };
	p.draw=function(){ };
	p.apply=function(obj){ };
	p.serialize=function(){ };
	p.getBBox=function(){ };
	p.beginEdit=function(type){
		if(!this._type){
			this._type=type||dojox.sketch.CommandTypes.Move;
			this._prevState=this.serialize();
		}
	};
	p.endEdit=function(){
		if(this._prevState!=this.serialize()){
			this.figure.history.add(this._type,this,this._prevState);
		}
		this._type=this._prevState='';
	};
	p.calculate={
		slope:function(p1, p2){
			if(!(p1.x-p2.x)){ return 0; }
			return ((p1.y-p2.y)/(p1.x-p2.x));
		},
		dx:function(p1, p2, dy){
			var s=this.slope(p1,p2);
			if(s==0){ return s; }
			return dy/s;
		},
		dy:function(p1, p2, dx){
			return this.slope(p1,p2)*dx;
		}
	};
	p.drawBBox=function(){
		var r=this.getBBox();
		if(!this.boundingBox){
			this.boundingBox=this.shape.createRect(r)
				.moveToBack()
				.setStroke({color:"#999", width:1, style:"Dash"})
				.setFill([238,238,238,0.3]);
			this.boundingBox.getEventSource().setAttribute("id",this.id+"-boundingBox");
			this.boundingBox.getEventSource().setAttribute("shape-rendering","crispEdges");
			this.figure._add(this);
		} else {
			this.boundingBox.setShape(r);
		}
	};
	p.setBinding=function(pt){
		this.transform.dx+=pt.dx;
		this.transform.dy+=pt.dy;
		this.draw();
	};
	//p.doChange=function(pt){ };
	p.getTextBox=function(zoomfactor){
		var fp=this.property('font');
		//_getTextBox expect style camlCase properties, do it manually here
		var f = {fontFamily:fp.family,fontSize:fp.size,fontWeight:fp.weight};
		if(zoomfactor){
			f.fontSize = Math.floor(f.fontSize/zoomfactor);
		}
		return dojox.gfx._base._getTextBox(this.property('label'),f);
	};
	p.setMode=function(m){
		if(this.mode==m){ return; }
		this.mode=m;
		var method="disable";
		if(m==dojox.sketch.Annotation.Modes.Edit){ method="enable"; }
		if(method=="enable"){
			//	draw the bounding box
			this.drawBBox();
			this.figure._add(this);
		} else {
			if(this.boundingBox){
				if(this.shape){ this.shape.remove(this.boundingBox); }
				this.boundingBox=null;
			}
		}
		for(var p in this.anchors){
			this.anchors[p][method]();
		}
	};
	p.zoom=function(pct){
		pct = pct || this.figure.zoomFactor;
		if(this.labelShape){
			var f=dojo.clone(this.property('font'));
			f.size=Math.ceil(f.size/pct)+"px";
			this.labelShape.setFont(f);
		}
		
		for(var n in this.anchors){
			this.anchors[n].zoom(pct);
		}
		
		//In VML, path are always the same width no matter scaling factors,
		//so aways use 1 for VML
		if(dojox.gfx.renderer=='vml'){
        	pct=1;
        }
		if(this.pathShape){
			var s=dojo.clone(this.property('stroke'));
			s.width=pct>1?s.width:Math.ceil(s.width/pct)+"px";
			this.pathShape.setStroke(s);
		}
	};
	p.writeCommonAttrs=function(){
		return 'id="' + this.id + '" dojoxsketch:type="' + this.type() + '"'
			+ ' transform="translate('+ this.transform.dx + "," + this.transform.dy + ')"'
			+ (this.data?(' ><![CDATA[data:'+dojo.toJson(this.data)+']]'):'');
	};
	p.readCommonAttrs=function(obj){
		var i=0,cs=obj.childNodes,c;
		while((c=cs[i++])){
			if(c.nodeType==4){ //CDATA
				if(c.nodeValue.substr(0,11)=='properties:'){
					this._properties=dojo.fromJson(c.nodeValue.substr(11));
				}else if(c.nodeValue.substr(0,5)=='data:'){
					this.data=dojo.fromJson(c.nodeValue.substr(5));
				}else{
					console.error('unknown CDATA node in node ',obj);
				}
			}
		}

		if(obj.getAttribute('transform')){
			var t=obj.getAttribute('transform').replace("translate(","");
			var pt=t.split(",");
			this.transform.dx=parseFloat(pt[0],10);
			this.transform.dy=parseFloat(pt[1],10);
		}
	};
	dojox.sketch.Annotation.Modes={ View:0, Edit:1 };
	dojox.sketch.Annotation.register=function(name,toolclass){
		var cls=dojox.sketch[name+'Annotation'];
		dojox.sketch.registerTool(name, function(p){
			dojo.mixin(p, {
				shape: name,
				annotation:cls
			});
			return new (toolclass || dojox.sketch.AnnotationTool)(p);
		});
	};

	return dojox.sketch.Annotation;
});
