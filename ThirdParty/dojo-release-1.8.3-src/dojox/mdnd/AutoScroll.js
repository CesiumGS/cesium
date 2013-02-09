define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/connect",
	"dojo/_base/sniff",
	"dojo/ready",
	"dojo/_base/window"
],function(dojo, declare, lang, connect, sniff, ready){
	var as = declare(
		"dojox.mdnd.AutoScroll",
		null,
	{
		// summary:
		//		Activate scrolling while dragging a widget.
	
		// interval: Integer
		//		default mouse move offset
		interval: 3,
	
		// recursiveTimer: Integer
		recursiveTimer: 10,
	
		// marginMouse: Integer
		//		Default mouse margin
		marginMouse: 50,
	
		constructor: function(){
			//console.log("dojox.mdnd.AutoScroll ::: constructor ");
			this.resizeHandler = connect.connect(dojo.global,"onresize", this, function(){
				this.getViewport();
			});
			ready(lang.hitch(this, "init"));
		},
	
		init: function(){
			//console.log("dojox.mdnd.AutoScroll ::: init ");
			this._html = (sniff("webkit"))? dojo.body() : dojo.body().parentNode;
			this.getViewport();
		},
	
		getViewport:function(){
			// summary:
			//		Set the visible part of the window. Varies accordion to Navigator.
	
			//console.log("dojox.mdnd.AutoScroll ::: getViewport ");
			var d = dojo.doc, dd = d.documentElement, w = window, b = dojo.body();
			if(dojo.isMozilla){
				this._v = { 'w': dd.clientWidth, 'h': w.innerHeight };	// Object
			}
			else if(!dojo.isOpera && w.innerWidth){
				this._v = { 'w': w.innerWidth, 'h': w.innerHeight };		// Object
			}
			else if(!dojo.isOpera && dd && dd.clientWidth){
				this._v = { 'w': dd.clientWidth, 'h': dd.clientHeight };	// Object
			}
			else if(b.clientWidth){
				this._v = { 'w': b.clientWidth, 'h': b.clientHeight };	// Object
			}
		},
	
		setAutoScrollNode: function(/*Node*/node){
			// summary:
			//		set the node which is dragged
			// node:
			//		node to scroll
	
			//console.log("dojox.mdnd.AutoScroll ::: setAutoScrollNode ");
			this._node = node;
		},
	
		setAutoScrollMaxPage: function(){
			// summary:
			//		Set the hightest heigh and width authorized scroll.
	
			//console.log("dojox.mdnd.AutoScroll ::: setAutoScrollMaxPage ");
			this._yMax = this._html.scrollHeight;
			this._xMax = this._html.scrollWidth;
		},
	
		checkAutoScroll: function(/*Event*/e){
			// summary:
			//		Check if an autoScroll have to be launched.
	
			//console.log("dojox.mdnd.AutoScroll ::: checkAutoScroll");
			if(this._autoScrollActive){
				this.stopAutoScroll();
			}
			this._y = e.pageY;
			this._x = e.pageX;
			if(e.clientX < this.marginMouse){
				this._autoScrollActive = true;
				this._autoScrollLeft(e);
			}
			else if(e.clientX > this._v.w - this.marginMouse){
				this._autoScrollActive = true;
				this._autoScrollRight(e);
			}
			if(e.clientY < this.marginMouse){
				this._autoScrollActive = true;
				this._autoScrollUp(e);
				
			}
			else if(e.clientY > this._v.h - this.marginMouse){
				this._autoScrollActive = true;
				this._autoScrollDown();
			}
		},
	
		_autoScrollDown: function(){
			// summary:
			//		Manage the down autoscroll.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.AutoScroll ::: _autoScrollDown ");
			if(this._timer){
				clearTimeout(this._timer);
			}
			if(this._autoScrollActive && this._y + this.marginMouse < this._yMax){
				this._html.scrollTop += this.interval;
				this._node.style.top = (parseInt(this._node.style.top) + this.interval) + "px";
				this._y += this.interval;
				this._timer = setTimeout(lang.hitch(this, "_autoScrollDown"), this.recursiveTimer);
			}
		},
	
		_autoScrollUp: function(){
			// summary:
			//		Manage the up autoscroll.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.AutoScroll ::: _autoScrollUp ");
			if(this._timer){
				clearTimeout(this._timer);
			}
			if(this._autoScrollActive && this._y - this.marginMouse > 0){
				this._html.scrollTop -= this.interval;
				this._node.style.top = (parseInt(this._node.style.top) - this.interval) + "px";
				this._y -= this.interval;
				this._timer = setTimeout(lang.hitch(this, "_autoScrollUp"),this.recursiveTimer);
			}
		},
	
		_autoScrollRight: function(){
			// summary:
			//		Manage the right autoscroll.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.AutoScroll ::: _autoScrollRight ");
			if(this._timer){
				clearTimeout(this._timer);
			}
			if(this._autoScrollActive && this._x + this.marginMouse < this._xMax){
				this._html.scrollLeft += this.interval;
				this._node.style.left = (parseInt(this._node.style.left) + this.interval) + "px";
				this._x += this.interval;
				this._timer = setTimeout(lang.hitch(this, "_autoScrollRight"), this.recursiveTimer);
			}
		},
	
		_autoScrollLeft: function(/*Event*/e){
			// summary:
			//		Manage the left autoscroll.
			// tags:
			//		protected
	
			//console.log("dojox.mdnd.AutoScroll ::: _autoScrollLeft ");
			if(this._timer){
				clearTimeout(this._timer);
			}
			if(this._autoScrollActive && this._x - this.marginMouse > 0){
				this._html.scrollLeft -= this.interval;
				this._node.style.left = (parseInt(this._node.style.left) - this.interval) + "px";
				this._x -= this.interval;
				this._timer = setTimeout(lang.hitch(this, "_autoScrollLeft"),this.recursiveTimer);
			}
		},
	
		stopAutoScroll: function(){
			// summary:
			//		Stop the autoscroll.
			
			//console.log("dojox.mdnd.AutoScroll ::: stopAutoScroll ");
			if(this._timer){
				clearTimeout(this._timer);
			}
			this._autoScrollActive = false;
		},
	
		destroy: function(){
			//console.log("dojox.mdnd.AutoScroll ::: destroy ");
			connect.disconnect(this.resizeHandler);
		}
	});
	
	dojox.mdnd.autoScroll = null;
	
	dojox.mdnd.autoScroll = new dojox.mdnd.AutoScroll();
	return as;
});
