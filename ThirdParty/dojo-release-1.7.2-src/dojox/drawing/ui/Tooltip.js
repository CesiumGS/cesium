dojo.provide("dojox.drawing.ui.Tooltip");
dojo.require("dojox.drawing.plugins._Plugin");


(function(){
	
	//	summary:
	//		Used for UI tooltips. Buttons in the toolbar.
	// 		This file is not complete.
	//
	var master = null;
	var MasterC = dojox.drawing.util.oo.declare(
		
		dojox.drawing.plugins._Plugin,
		function(options){
			this.createDom();
		},
		{
			show: function(button, text){
				this.domNode.innerHTML = text;
				
				var dx = 30;
				var px = button.data.x + button.data.width;
				var py = button.data.y + button.data.height;
				var x =  px + this.mouse.origin.x + dx;
				var y = py + this.mouse.origin.y + dx;
				
				dojo.style(this.domNode, {
					display: "inline",
					left:x +"px",
					top:y+"px"
				});
				
				var box = dojo.marginBox(this.domNode);
				
				this.createShape(x-this.mouse.origin.x, y-this.mouse.origin.y, box.w, box.h);
			},
			
			
			createShape: function(x,y,w,h){
				this.balloon && this.balloon.destroy();
				var r = 5, x2 = x+w, y2 = y+h, points = [];
				var add = function(){
					for(var i=0;i<arguments.length;i++){
						points.push(arguments[i]);
					}
				};
				
				add({x:x,y:y+5},
					{t:"Q", x:x,y:y},
					{x:x+r,y:y});
				
				add({t:"L", x:x2-r,y:y});
				
				add({t:"Q", x:x2,y:y},
					{x:x2,y:y+r});
					
				add({t:"L", x:x2,y:y2-r});
					
				add({t:"Q", x:x2,y:y2},
					{x:x2-r,y:y2});
				
				add({t:"L", x:x+r,y:y2});
				
				add({t:"Q", x:x,y:y2},
					{x:x,y:y2-r});
					
				add({t:"L", x:x,y:y+r});
				
				this.balloon = this.drawing.addUI("path", {points:points});
			},
			
			createDom: function(){
				this.domNode = dojo.create('span', {"class":"drawingTooltip"}, document.body);
				dojo.style(this.domNode, {
					display: "none",
					position:"absolute"
				});
			}
		}
	);
	
	dojox.drawing.ui.Tooltip =  dojox.drawing.util.oo.declare(
		
		dojox.drawing.plugins._Plugin,
		function(options){
			if(!master){
				master = new MasterC(options);
			}
			if(options.stencil){
				//todo
			}else if(this.button){
				this.connect(this.button, "onOver", this, "onOver");
				this.connect(this.button, "onOut", this, "onOut");
			}
			
		},
		{
			width:300,
			height:200,
			onOver: function(){
				//console.log("   tooltip over", this.data.text)
				master.show(this.button, this.data.text);
			},
			
			onOut: function(){
				//console.log("   tooltip out")
			}
		}
	);
	
	dojox.drawing.register({
		name:"dojox.drawing.ui.Tooltip"
	}, "stencil");
})();