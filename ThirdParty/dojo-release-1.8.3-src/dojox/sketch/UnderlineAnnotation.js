define(["./Annotation", "./Anchor"], function(){
	var ta=dojox.sketch;
	ta.UnderlineAnnotation=function(figure, id){
		ta.Annotation.call(this, figure, id);
		this.transform={dx:0, dy:0};
		this.start={x:0, y:0};
		this.property('label','#');
		this.labelShape=null;
		this.lineShape=null;
		//this.anchors.start=new ta.Anchor(this, "start");
	};
	ta.UnderlineAnnotation.prototype=new ta.Annotation;
	var p=ta.UnderlineAnnotation.prototype;
	p.constructor=ta.UnderlineAnnotation;

	p.type=function(){ return 'Underline'; };
	p.getType=function(){ return ta.UnderlineAnnotation; };

	p.apply=function(obj){
		if(!obj){ return; }
		if(obj.documentElement){ obj=obj.documentElement; }
		this.readCommonAttrs(obj);
		
		for(var i=0; i<obj.childNodes.length; i++){
			var c=obj.childNodes[i];
			if(c.localName=="text"){
				this.property('label',c.childNodes[0].nodeValue);
				var style=c.getAttribute('style');
				var m=style.match(/fill:([^;]+);/);
				if(m){
					var stroke=this.property('stroke');
					stroke.collor=m[1];
					this.property('stroke',stroke);
					this.property('fill',stroke.collor);
				}
			}/*else if(c.localName=="line"){
				var stroke=this.property('stroke');
				var style=c.getAttribute('style');
				var m=style.match(/stroke:([^;]+);/)[1];
				if(m){
					stroke.color=m;
					this.property('fill',m);
				}
				m=style.match(/stroke-width:([^;]+);/)[1];
				if(m){
					stroke.width=m;
				}
				this.property('stroke',stroke);
			}*/
		}
	};
	
	p.initialize=function(obj){
		//var font=(ta.Annotation.labelFont)?ta.Annotation.labelFont:{family:"Times", size:"16px"};
		this.apply(obj);

		//	create either from scratch or based on the passed node
		this.shape=this.figure.group.createGroup();
		this.shape.getEventSource().setAttribute("id", this.id);
		//if(this.transform.dx || this.transform.dy){ this.shape.setTransform(this.transform); }

		this.labelShape=this.shape.createText({
				x:0,
				y:0,
				text:this.property('label'),
				decoration:"underline",
				align:"start"
			})
			//.setFont(font)
			//.setFill(this.property('fill'));
		this.labelShape.getEventSource().setAttribute('id',this.id+"-labelShape");

		this.lineShape=this.shape.createLine({
				x1:1,
				x2:this.labelShape.getTextWidth(),
				y1:2,
				y2:2
			})
			//.setStroke({ color:this.property('fill'), width:1 });
		this.lineShape.getEventSource().setAttribute("shape-rendering","crispEdges");
		this.draw();
	};
	p.destroy=function(){
		if(!this.shape){ return; }
		this.shape.remove(this.labelShape);
		this.shape.remove(this.lineShape);
		this.figure.group.remove(this.shape);
		this.shape=this.lineShape=this.labelShape=null;
	};
	p.getBBox=function(){
		var b=this.getTextBox();
		var z=this.figure.zoomFactor;

		return { x:0, y:(b.h*-1+4)/z, width:(b.w+2)/z, height:b.h/z };
	};
	p.draw=function(obj){
		this.apply(obj);
		this.shape.setTransform(this.transform);
		this.labelShape.setShape({ x:0, y:0, text:this.property('label') })
			.setFill(this.property('fill'));
		this.zoom();
	};
	p.zoom=function(pct){
		if(this.labelShape){
			pct = pct || this.figure.zoomFactor;
			var textwidthadj=dojox.gfx.renderer=='vml'?0:2/pct;
			ta.Annotation.prototype.zoom.call(this,pct);
			pct = dojox.gfx.renderer=='vml'?1:pct;
			this.lineShape.setShape({ x1:0, x2:this.getBBox().width-textwidthadj, y1:2, y2:2 })
				.setStroke({ color:this.property('fill'), width:1/pct });
			if(this.mode==ta.Annotation.Modes.Edit){
				this.drawBBox(); //the bbox is dependent on the size of the text, so need to update it here
			}
		}
	};
	p.serialize=function(){
		var s=this.property('stroke');
		return '<g '+this.writeCommonAttrs()+'>'
			//+ '<line x1="1" x2="'+this.labelShape.getTextWidth()+1+'" y1="5" y2="5" style="stroke:'+s.color+';stroke-width:'+s.width+';" />'
			+ '<text style="fill:'+this.property('fill')+';" font-weight="bold" text-decoration="underline" '
			+ 'x="0" y="0">'
			+ this.property('label')
			+ '</text>'
			+ '</g>';
	};
    
    //customize AnnotationTool to place a underlilne shape onmouseup, no need
	//to drag a box (like other shapes)
    dojo.declare("dojox.sketch.UnderlineAnnotationTool", ta.AnnotationTool, {
		onMouseDown: function(){},
		onMouseUp: function(){
			var f=this.figure;
			if(!f._start){
				return;
			}
			//zero out end so that the clickover is shown at the right pos
			f._end={x:0,y:0};
			this._create(f._start,{x:f._start.x+10,y:f._start.y+10});
		},
		onMouseMove: function(){}
	});
	ta.Annotation.register("Underline", ta.UnderlineAnnotationTool);
	return dojox.sketch.UnderlineAnnotation;
});
