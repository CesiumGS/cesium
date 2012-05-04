dojo.provide("dojox.drawing.ui.Button");

dojox.drawing.ui.Button =  dojox.drawing.util.oo.declare(
	// summary:
	//		Creates a clickable button in "UI" mode of the drawing.
	// description:
	//		Creates a 4-state button: normal, hover, active, selected.
	//		Optionally may include button text or an icon.
	function(options){
		options.subShape = true;
		dojo.mixin(this, options);
		//console.log("  button:", this);
		this.width = options.data.width || options.data.rx*2;
		this.height = options.data.height || options.data.ry*2;
		this.y = options.data.y || options.data.cy - options.data.ry;
		//
		this.id = this.id || this.util.uid(this.type);
		this.util.attr(this.container, "id", this.id);
		if(this.callback){
			this.hitched = dojo.hitch(this.scope || window, this.callback, this);
		}
		
		// Rectangle itself must be "ui" for radio buttons to work.
		// This is a work-around for messy code associated with drawingType;
		// see http://www.andestutor.org/bugzilla/show_bug.cgi?id=1745
		options.drawingType="ui";
		// Choose between rectangle and ellipse based on options
		if(options.data.width && options.data.height){
			this.shape = new dojox.drawing.stencil.Rect(options);
		}else{
			this.shape = new dojox.drawing.stencil.Ellipse(options);
		}
		
		var setGrad = function(s, p, v){
			dojo.forEach(["norm", "over", "down", "selected"], function(nm){
				s[nm].fill[p] = v;
			});
		};
		// for button backs, not for icons
		setGrad(this.style.button, "y2", this.height + this.y);
		setGrad(this.style.button, "y1", this.y);
		
		if(options.icon && !options.icon.text){
			var constr = this.drawing.getConstructor(options.icon.type);
			var o = this.makeOptions(options.icon);
			o.data = dojo.mixin(o.data, this.style.button.icon.norm);
			
			if(o.data && o.data.borderWidth===0){
				o.data.fill = this.style.button.icon.norm.fill = o.data.color;
			}else if(options.icon.type=="line" || (options.icon.type=="path" && !options.icon.closePath)){
				this.style.button.icon.selected.color = this.style.button.icon.selected.fill;
			}else{
				//o.data.fill = this.style.button.icon.norm.fill = o.data.color;
			}
			this.icon = new constr(o);
			//console.log("  button:", this.toolType, this.style.button.icon)
		}else if(options.text || (options.icon && options.icon.text)){
			//console.warn("button text:", options.text || options.icon.text)
			o = this.makeOptions(options.text || options.icon.text);
			o.data.color = this.style.button.icon.norm.color; //= o.data.fill;
			this.style.button.icon.selected.color = this.style.button.icon.selected.fill;
			this.icon = new dojox.drawing.stencil.Text(o);
			this.icon.attr({
				height:	this.icon._lineHeight,
				y:((this.height-this.icon._lineHeight)/2)+this.y
			});
		}
		
		var c = this.drawing.getConstructor(this.toolType);
		if(c){
			this.drawing.addUI("tooltip", {data:{text:c.setup.tooltip}, button:this});
		}
		
		this.onOut();
		
	},{
		
		callback:null,
		scope:null,
		hitched:null,
		toolType:"",
		
		onClick: function(/*Object*/button){
			// summary:
			//		Stub to connect. Event is 'this'
			//		Alternatively can pass in a scope and a callback
			//		on creation.
		},
		
		makeOptions: function(/*Object*/d, /*Float*/s){
			
			s = s || 1;
			d = dojo.clone(d);
			var o = {
				util: this.util,
				mouse: this.mouse,
				container: this.container,
				subShape:true
			};
			
			if(typeof(d)=="string"){
				
				o.data = {
					x:this.data.x - 5,
					y: this.data.y + 2,
					width:this.data.width,
					height:this.data.height,
					text:d,
					makeFit:true
				};
			
			}else if(d.points){
				//console.warn("points")
				dojo.forEach(d.points, function(pt){
					pt.x = pt.x * this.data.width * .01 * s + this.data.x;
					pt.y = pt.y * this.data.height * .01 * s + this.data.y;
				}, this);
				o.data = {};
				for(var n in d){
					if(n!="points"){
						o.data[n] = d[n];
					}
				}
				o.points = d.points;
				
			}else{
				//console.warn("data")
				for(n in d){
					if(/x|width/.test(n)){
						d[n] = d[n] * this.data.width * .01 * s;
					}else if(/y|height/.test(n)){
						d[n] = d[n] * this.data.height * .01 * s;
					}
					if(/x/.test(n) && !/r/.test(n)){
						d[n] += this.data.x;
					}else if(/y/.test(n) && !/r/.test(n)){
						d[n] += this.data.y;
					}
				}
				delete d.type;
				o.data = d;
				
			}
			o.drawingType = "ui";
			return o;
		
			// do style
			if(d.borderWidth!==undefined){
				//console.log(" -------- bw data:", o.data)
				o.data.borderWidth = d.borderWidth;
			}
			
			return o;
		},
		
		enabled:true,
		selected:false,
		type:"drawing.library.UI.Button",
		
		// note:
		//	need to move the Stencil's shape to front, not
		// its container. Therefore we can't use the Stencil's
		// moveTo.. methods.
		select: function(){
			this.selected = true;
			if(this.icon){this.icon.attr(this.style.button.icon.selected);}
			this._change(this.style.button.selected);
			this.shape.shadow && this.shape.shadow.hide();
		},
		deselect: function(){
			this.selected = false;
			if(this.icon){this.icon.attr(this.style.button.icon.norm);}
			this.shape.shadow && this.shape.shadow.show();
			this._change(this.style.button.norm);
			
		},
		disable: function(){
			if(!this.enabled){ return; }
			this.enabled = false;
			this._change(this.style.button.disabled);
			this.icon.attr({color:this.style.button.norm.color});
		},
		enable: function(){
			if(this.enabled){ return; }
			this.enabled = true;
			this._change(this.style.button.norm);
			this.icon.attr({color:this.style.button.icon.norm.color});
		},
		
		_change: function(/*Object*/sty){
			this.shape.attr(sty);
			this.shape.shadow && this.shape.shadow.container.moveToBack();
			if(this.icon){this.icon.shape.moveToFront();};
		},
		onOver: function(){
			//console.log("BUTTON OVER")
			if(this.selected || !this.enabled){ return; }
			this._change(this.style.button.over);
		},
		onOut: function(){
			if(this.selected){ return; }
			this._change(this.style.button.norm);
		},
		onDown: function(){
			if(this.selected || !this.enabled){ return; }
			this._change(this.style.button.selected);
		},
		onUp: function(){
			//console.log("BUTTON UP")
			if(!this.enabled){ return; }
			this._change(this.style.button.over);
			if(this.hitched){
				this.hitched();
			}
			this.onClick(this);
		},
		attr: function(options){
			if(this.icon){this.icon.attr(options);}
		}
	}
	
);

dojox.drawing.register({
	name:"dojox.drawing.ui.Button"
}, "stencil");