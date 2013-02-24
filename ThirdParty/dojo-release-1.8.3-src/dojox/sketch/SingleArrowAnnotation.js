define(["dojo/_base/kernel", "dojo/_base/lang", "./Annotation", "./Anchor"], function(dojo){
	dojo.getObject("sketch", true, dojox);

	var ta=dojox.sketch;
	ta.SingleArrowAnnotation=function(figure, id){
		ta.Annotation.call(this, figure, id);
		this.transform={ dx:0, dy:0 };
		this.start={x:0, y:0};
		this.control={x:100, y:-50};
		this.end={x:200, y:0};
		this.textPosition={ x:0, y:0 };
		this.textOffset=4;
		//this.textAlign="middle";
		this.textYOffset=10;
		this.rotation=0;

//		this.property('label',this.id);
//		this.label=this.id;
		this.pathShape=null;
		this.arrowhead=null;
		this.arrowheadGroup=null;
		this.labelShape=null;

		this.anchors.start=new ta.Anchor(this, "start");
		this.anchors.control=new ta.Anchor(this, "control");
		this.anchors.end=new ta.Anchor(this, "end");
	};
	ta.SingleArrowAnnotation.prototype=new ta.Annotation;
	var p=ta.SingleArrowAnnotation.prototype;
	p.constructor=ta.SingleArrowAnnotation;

	p.type=function(){ return 'SingleArrow'; };
	p.getType=function(){ return ta.SingleArrowAnnotation; };

	//	helper functions
	p._rot=function(){
		//	arrowhead rotation
		var opp=this.control.y-this.start.y;
		var adj=this.control.x-this.start.x;
		//if(!adj){ adj=1; }
		this.rotation=Math.atan2(opp,adj);
	};
	p._pos=function(){
		//	text position
		var offset=this.textOffset, x=0, y=0;
		var slope=this.calculate.slope(this.control, this.end);
		this.textAlign="middle";
		if(Math.abs(slope)>=1){
			x=this.end.x+this.calculate.dx(this.control, this.end, offset);
			if(this.control.y>this.end.y){ y=this.end.y-offset; }
			else{ y=this.end.y+offset+this.textYOffset; }
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
		//	create, based on passed DOM node if available.
		var font=(ta.Annotation.labelFont)?ta.Annotation.labelFont:{family:"Times", size:"16px"};
		this.apply(obj);

		//	calculate the other positions
		this._rot();
		this._pos();

		//	rotation matrix
		var rot=this.rotation;
		var tRot=dojox.gfx.matrix.rotate(rot);

		//	draw the shapes
		this.shape=this.figure.group.createGroup();
		this.shape.getEventSource().setAttribute("id", this.id);
		//if(this.transform.dx||this.transform.dy){ this.shape.setTransform(this.transform); }

		this.pathShape=this.shape.createPath("M"+this.start.x+","+this.start.y+" Q"+this.control.x+","+this.control.y+" "+this.end.x+","+this.end.y+" l0,0")
			//.setStroke(this.property('stroke'));

		this.arrowheadGroup=this.shape.createGroup();//.setTransform({ dx:this.start.x, dy:this.start.y }).applyTransform(tRot);
		this.arrowhead=this.arrowheadGroup.createPath();//"M0,0 l50,-10 -6,10 6,10 Z").setFill(this.property('fill'));

		this.labelShape=this.shape.createText({
				x:this.textPosition.x,
				y:this.textPosition.y,
				text:this.property('label'),
				align:this.textAlign
			})
			//.setFont(font)
			//.setFill(this.property('fill'));
		this.labelShape.getEventSource().setAttribute('id',this.id+"-labelShape");
		this.draw();
	};

	p.destroy=function(){
		if(!this.shape){ return; }
		this.arrowheadGroup.remove(this.arrowhead);
		this.shape.remove(this.arrowheadGroup);
		this.shape.remove(this.pathShape);
		this.shape.remove(this.labelShape);
		this.figure.group.remove(this.shape);
		this.shape=this.pathShape=this.labelShape=this.arrowheadGroup=this.arrowhead=null;
	};

	p.draw=function(obj){
		this.apply(obj);
		this._rot();
		this._pos();

		//	rotation matrix
		var rot=this.rotation;
		var tRot=dojox.gfx.matrix.rotate(rot);

		this.shape.setTransform(this.transform);
		this.pathShape.setShape("M"+this.start.x+","+this.start.y+" Q"+this.control.x+","+this.control.y+" "+this.end.x+","+this.end.y+" l0,0")
			//.setStroke(this.property('stroke'));

		this.arrowheadGroup.setTransform({dx:this.start.x,dy:this.start.y}).applyTransform(tRot);
		this.arrowhead.setFill(this.property('fill'));

		this.labelShape.setShape({
				x:this.textPosition.x,
				y:this.textPosition.y,
				text:this.property('label'),
				align:this.textAlign
			})
			.setFill(this.property('fill'));
		this.zoom();
	};

	p.zoom=function(pct){
		if(this.arrowhead){
			pct = pct || this.figure.zoomFactor;
			ta.Annotation.prototype.zoom.call(this,pct);
			//pct = dojox.gfx.renderer=='vml'?1:pct;
			if(this._curPct!==pct){
				this._curPct=pct;
				var l=pct>1?20:Math.floor(20/pct), w=pct>1?5:Math.floor(5/pct),h=pct>1?3:Math.floor(3/pct);
				this.arrowhead.setShape("M0,0 l"+l+",-"+w+" -"+h+","+w+" "+h+","+w+" Z");
			}
		}
	};

	p.getBBox=function(){
		var x=Math.min(this.start.x, this.control.x, this.end.x);
		var y=Math.min(this.start.y, this.control.y, this.end.y);
		var w=Math.max(this.start.x, this.control.x, this.end.x)-x;
		var h=Math.max(this.start.y, this.control.y, this.end.y)-y;
		return { x:x, y:y, width:w, height:h };
	};

	p.serialize=function(){
		var s=this.property('stroke');
		var r=this.rotation*(180/Math.PI);
		r=Math.round(r*Math.pow(10,4))/Math.pow(10,4);
		return '<g '+this.writeCommonAttrs()+'>'
			+ '<path style="stroke:'+s.color+';stroke-width:'+s.width+';fill:none;" d="'
			+ "M"+this.start.x+","+this.start.y+" "
			+ "Q"+this.control.x+","+this.control.y+" "
			+ this.end.x+","+this.end.y
			+ '" />'
			+ '<g transform="translate(' + this.start.x + "," + this.start.y + ") "
			+ 'rotate(' + r + ')">'
			+ '<path style="fill:'+s.color+';" d="M0,0 l20,-5, -3,5, 3,5 Z" />'
			+ '</g>'
			+ '<text style="fill:'+s.color+';text-anchor:'+this.textAlign+'" font-weight="bold" '
			+ 'x="' + this.textPosition.x + '" '
			+ 'y="' + this.textPosition.y + '">'
			+ this.property('label')
			+ '</text>'
			+ '</g>';
	};

	ta.Annotation.register("SingleArrow");
	return dojox.sketch.SingleArrowAnnotation;
});
