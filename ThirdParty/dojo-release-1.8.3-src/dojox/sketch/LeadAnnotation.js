define(["dojo/_base/kernel", "dojo/_base/lang", "./Annotation", "./Anchor"], function(dojo){
	dojo.getObject("sketch", true, dojox);

	var ta=dojox.sketch;
	ta.LeadAnnotation=function(figure, id){
		ta.Annotation.call(this, figure, id);
		this.transform={dx:0, dy:0 };
		this.start={ x:0, y:0 };
		this.control={x:100, y:-50};
		this.end={ x:200, y:0 };
		this.textPosition={ x:0, y:0 };
		this.textOffset=4;
		//this.textAlign="middle";
		this.textYOffset=10;

//		this.property('label',this.id);
		this.pathShape=null;
		this.labelShape=null;

		this.anchors.start=new ta.Anchor(this, "start");
		this.anchors.control=new ta.Anchor(this, "control");
		this.anchors.end=new ta.Anchor(this, "end");
	};
	ta.LeadAnnotation.prototype=new ta.Annotation;
	var p=ta.LeadAnnotation.prototype;
	p.constructor=ta.LeadAnnotation;

	p.type=function(){ return 'Lead'; }
	p.getType=function(){ return ta.LeadAnnotation; };

	p._pos=function(){
		var offset=this.textOffset, x=0, y=0;
		var slope=this.calculate.slope(this.control, this.end);
		this.textAlign="middle";
		if(Math.abs(slope)>=1){
			x=this.end.x+this.calculate.dx(this.control, this.end, offset);
			if(this.control.y>this.end.y){
				y=this.end.y-offset;
			} else {
				y=this.end.y+offset+this.textYOffset;
			}
		} else if(slope==0){
			x=this.end.x+offset;
			y=this.end.y+this.textYOffset;
		} else {
			if(this.start.x>this.end.x){
				x=this.end.x-offset;
				this.textAlign="end";
			} else {
				x=this.end.x+offset;
				this.textAlign="start";
			}
			if(this.start.y<this.end.y){
				y=this.end.y+this.calculate.dy(this.control, this.end, offset)+this.textYOffset;
			} else {
				y=this.end.y+this.calculate.dy(this.control, this.end, -offset);
			}
		}
		this.textPosition={ x:x, y:y };
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
			else if(c.localName=="path"){
				//	the line
				var d=c.getAttribute('d').split(" ");
				var s=d[0].split(",");
				this.start.x=parseFloat(s[0].substr(1),10);
				this.start.y=parseFloat(s[1],10);
				s=d[1].split(",");
				this.control.x=parseFloat(s[0].substr(1),10);
				this.control.y=parseFloat(s[1],10);
				s=d[2].split(",");
				this.end.x=parseFloat(s[0],10);
				this.end.y=parseFloat(s[1],10);
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
		this.pathShape=this.shape.createPath("M"+this.start.x+","+this.start.y+" Q"+this.control.x+","+this.control.y+" "+this.end.x+","+this.end.y+" l0,0");
		this.labelShape=this.shape.createText({
				x:this.textPosition.x,
				y:this.textPosition.y,
				text:this.property('label'),
				align:this.textAlign
			});
		this.labelShape.getEventSource().setAttribute('id',this.id+"-labelShape");
		this.draw();
	};
	p.destroy=function(){
		if(!this.shape){ return; }
		this.shape.remove(this.pathShape);
		this.shape.remove(this.labelShape);
		this.figure.group.remove(this.shape);
		this.shape=this.pathShape=this.labelShape=null;
	};
	p.getBBox=function(){
		var x=Math.min(this.start.x, this.control.x, this.end.x);
		var y=Math.min(this.start.y, this.control.y, this.end.y);
		var w=Math.max(this.start.x, this.control.x, this.end.x)-x;
		var h=Math.max(this.start.y, this.control.y, this.end.y)-y;
		return { x:x, y:y, width:w, height:h };
	};
	p.draw=function(obj){
		this.apply(obj);
		this._pos();
		this.shape.setTransform(this.transform);
		this.pathShape.setShape("M"+this.start.x+","+this.start.y+" Q"+this.control.x+","+this.control.y+" "+this.end.x+","+this.end.y+" l0,0");
		this.labelShape.setShape({
				x:this.textPosition.x,
				y:this.textPosition.y,
				text:this.property('label')
			})
			.setFill(this.property('fill'));
		this.zoom();
	};
	p.serialize=function(){
		var stroke=this.property('stroke');
		return '<g '+this.writeCommonAttrs()+'>'
			+ '<path style="stroke:'+stroke.color+';stroke-width:'+stroke.width+';fill:none;" d="'
			+ "M"+this.start.x+","+this.start.y+" "
			+ "Q"+this.control.x+","+this.control.y+" "
			+ this.end.x+","+this.end.y
			+ '" />'
			+ '<text style="fill:'+stroke.color+';text-anchor:'+this.textAlign+'" font-weight="bold" '
			+ 'x="' + this.textPosition.x + '" '
			+ 'y="' + this.textPosition.y + '">'
			+ this.property('label')
			+ '</text>'
			+ '</g>';
	};

	ta.Annotation.register("Lead");
	return dojox.sketch.LeadAnnotation;
});
