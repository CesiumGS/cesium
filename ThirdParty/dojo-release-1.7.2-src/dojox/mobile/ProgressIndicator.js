define([
	"dojo/_base/config",
	"dojo/_base/declare",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/has"
], function(config, declare, domConstruct, domStyle, has){

	// module:
	//		dojox/mobile/ProgressIndicator
	// summary:
	//		A progress indication widget.

	var cls = declare("dojox.mobile.ProgressIndicator", null, {
		// summary:
		//		A progress indication widget.
		// description:
		//		ProgressIndicator is a round spinning graphical representation
		//		that indicates the current task is on-going.

		// interval: Number
		//		The time interval in milliseconds for updating the spinning
		//		indicator.
		interval: 100,

		// colors: Array
		//		An array of indicator colors.
		colors: [
			"#C0C0C0", "#C0C0C0", "#C0C0C0", "#C0C0C0",
			"#C0C0C0", "#C0C0C0", "#B8B9B8", "#AEAFAE",
			"#A4A5A4", "#9A9A9A", "#8E8E8E", "#838383"
		],

		constructor: function(){
			this._bars = [];
			this.domNode = domConstruct.create("DIV");
			this.domNode.className = "mblProgContainer";
			if(config["mblAndroidWorkaround"] !== false && has('android') >= 2.2 && has('android') < 3){
				// workaround to avoid the side effects of the fixes for android screen flicker problem
				domStyle.set(this.domNode, "webkitTransform", "translate3d(0,0,0)");
			}
			this.spinnerNode = domConstruct.create("DIV", null, this.domNode);
			for(var i = 0; i < this.colors.length; i++){
				var div = domConstruct.create("DIV", {className:"mblProg mblProg"+i}, this.spinnerNode);
				this._bars.push(div);
			}
		},
	
		start: function(){
			// summary:
			//		Starts the ProgressIndicator spinning.
			if(this.imageNode){
				var img = this.imageNode;
				var l = Math.round((this.domNode.offsetWidth - img.offsetWidth) / 2);
				var t = Math.round((this.domNode.offsetHeight - img.offsetHeight) / 2);
				img.style.margin = t+"px "+l+"px";
				return;
			}
			var cntr = 0;
			var _this = this;
			var n = this.colors.length;
			this.timer = setInterval(function(){
				cntr--;
				cntr = cntr < 0 ? n - 1 : cntr;
				var c = _this.colors;
				for(var i = 0; i < n; i++){
					var idx = (cntr + i) % n;
					_this._bars[i].style.backgroundColor = c[idx];
				}
			}, this.interval);
		},
	
		stop: function(){
			// summary:
			//		Stops the ProgressIndicator spinning.
			if(this.timer){
				clearInterval(this.timer);
			}
			this.timer = null;
			if(this.domNode.parentNode){
				this.domNode.parentNode.removeChild(this.domNode);
			}
		},

		setImage: function(/*String*/file){
			// summary:
			//		Sets an indicator icon image file (typically animated GIF).
			//		If null is specified, restores the default spinner.
			if(file){
				this.imageNode = domConstruct.create("IMG", {src:file}, this.domNode);
				this.spinnerNode.style.display = "none";
			}else{
				if(this.imageNode){
					this.domNode.removeChild(this.imageNode);
					this.imageNode = null;
				}
				this.spinnerNode.style.display = "";
			}
		}
	});

	cls._instance = null;
	cls.getInstance = function(){
		if(!cls._instance){
			cls._instance = new cls();
		}
		return cls._instance;
	};

	return cls;
});
