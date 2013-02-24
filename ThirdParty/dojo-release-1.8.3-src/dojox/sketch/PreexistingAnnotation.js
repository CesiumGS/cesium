define(["dojo/_base/kernel", "dojo/_base/lang", "./Annotation", "./Anchor"], function(dojo){
	dojo.getObject("sketch", true, dojox);

	var ta=dojox.sketch;
	ta.PreexistingAnnotation=function(figure, id){
		ta.Annotation.call(this, figure, id);
		this.transform={dx:0, dy:0};
		this.start={ x:0, y:0 };
		this.end={ x:200, y:200 };
		this.radius=8;
		this.textPosition={ x:196, y:196 };
		this.textOffset=4;
		this.textAlign="end";

		//this.property('label',this.id);
		this.rectShape=null;
		this.labelShape=null;

		this.anchors.start=new ta.Anchor(this, "start");
		this.anchors.end=new ta.Anchor(this, "end");
	};
	ta.PreexistingAnnotation.prototype=new ta.Annotation;
	var p=ta.PreexistingAnnotation.prototype;
	p.constructor=ta.PreexistingAnnotation;

	p.type=function(){ return 'Preexisting' };
	p.getType=function(){ return ta.PreexistingAnnotation; };

	p._pos=function(){
		var x=Math.min(this.start.x, this.end.x);
		var y=Math.min(this.start.y, this.end.y);
		var w=Math.max(this.start.x, this.end.x);
		var h=Math.max(this.start.y, this.end.y);
		this.start={ x:x, y:y };
		this.end={ x:w, y:h };
		this.textPosition={ x:this.end.x-this.textOffset, y:this.end.y-this.textOffset };
	};
	p.apply=function(obj){
		if(!obj){ return; }
		if(obj.documentElement){ obj=obj.documentElement; }
		this.readCommonAttrs(obj);
		
		for(var i=0; i<obj.childNodes.length; i++){
			var c=obj.childNodes[i];
			if(c.localName=="text"){
				this.property('label',c.childNodes.length?c.childNodes[0].nodeValue:'');
			}
			else if(c.localName=="rect"){
				if(c.getAttribute('x')!==null){ this.start.x=parseFloat(c.getAttribute('x'), 10); }
				if(c.getAttribute('width')!==null){ this.end.x=parseFloat(c.getAttribute('width'), 10)+parseFloat(c.getAttribute('x'), 10); }
				if(c.getAttribute('y')!==null){ this.start.y=parseFloat(c.getAttribute('y'), 10); }
				if(c.getAttribute('height')!==null){ this.end.y=parseFloat(c.getAttribute('height'), 10)+parseFloat(c.getAttribute('y'), 10); }
				if(c.getAttribute('r')!==null){ this.radius=parseFloat(c.getAttribute('r'),10); }
				var stroke=this.property('stroke');
				var style=c.getAttribute('style');
				var m=style.match(/stroke:([^;]+);/);
				if(m){
					stroke.color=m[1];
					this.property('fill',m[1]);
				}
				m=style.match(/stroke-width:([^;]+);/);
				if(m){
					stroke.width=m[1];
				}
				this.property('stroke',stroke);
			}
		}
	};
	p.initialize=function(obj){
		this.apply(obj);
		this._pos();

		//	create either from scratch or based on the passed node
		this.shape=this.figure.group.createGroup();
		this.shape.getEventSource().setAttribute("id", this.id);
		//if(this.transform.dx || this.transform.dy){ this.shape.setTransform(this.transform); }
		this.rectShape=this.shape.createRect({
				x:this.start.x,
				y: this.start.y,
				width: this.end.x-this.start.x,
				height:this.end.y-this.start.y,
				r:this.radius
			})
			//.setStroke({color:this.property('fill'), width:1})
			.setFill([255,255,255,0.1]);
		this.rectShape.getEventSource().setAttribute("shape-rendering","crispEdges");
		this.labelShape=this.shape.createText({
				x:this.textPosition.x,
				y:this.textPosition.y,
				text:this.property('label'),
				align:this.textAlign
			})
			//.setFont(font)
			.setFill(this.property('fill'));
		this.labelShape.getEventSource().setAttribute('id',this.id+"-labelShape");
		this.draw();
	};
	p.destroy=function(){
		if(!this.shape){ return; }
		this.shape.remove(this.rectShape);
		this.shape.remove(this.labelShape);
		this.figure.group.remove(this.shape);
		this.shape=this.rectShape=this.labelShape=null;
	};
	p.getBBox=function(){
		var x=Math.min(this.start.x, this.end.x);
		var y=Math.min(this.start.y, this.end.y);
		var w=Math.max(this.start.x, this.end.x)-x;
		var h=Math.max(this.start.y, this.end.y)-y;
		return { x:x-2, y:y-2, width:w+4, height:h+4 };
	};
	p.draw=function(obj){
		this.apply(obj);
		this._pos();
		this.shape.setTransform(this.transform);
		this.rectShape.setShape({
				x:this.start.x,
				y: this.start.y,
				width: this.end.x-this.start.x,
				height:this.end.y-this.start.y,
				r:this.radius
			})
			//.setStroke({ color:this.property('fill'), width:1 })
			.setFill([255,255,255,0.1]);

		this.labelShape.setShape({
				x:this.textPosition.x,
				y:this.textPosition.y,
				text:this.property('label')
			})
			.setFill(this.property('fill'));
		this.zoom();
	};
	p.zoom=function(pct){
		if(this.rectShape){
			pct = pct || this.figure.zoomFactor;
			ta.Annotation.prototype.zoom.call(this,pct);
			pct = dojox.gfx.renderer=='vml'?1:pct;
			this.rectShape.setStroke({color:this.property('fill'), width:1/pct});
		}
	};
	p.serialize=function(){
		var s=this.property('stroke');
		return '<g '+this.writeCommonAttrs()+'>'
			+ '<rect style="stroke:'+s.color+';stroke-width:1;fill:none;" '
			+ 'x="' + this.start.x + '" '
			+ 'width="' + (this.end.x-this.start.x) + '" '
			+ 'y="' + this.start.y + '" '
			+ 'height="' + (this.end.y-this.start.y) + '" '
			+ 'rx="' + this.radius + '" '
			+ 'ry="' + this.radius + '" '
			+ ' />'
			+ '<text style="fill:'+s.color+';text-anchor:'+this.textAlign+'" font-weight="bold" '
			+ 'x="' + this.textPosition.x + '" '
			+ 'y="' + this.textPosition.y + '">'
			+ this.property('label')
			+ '</text>'
			+ '</g>';
	};

	ta.Annotation.register("Preexisting");
	return dojox.sketch.PreexistingAnnotation;
});
