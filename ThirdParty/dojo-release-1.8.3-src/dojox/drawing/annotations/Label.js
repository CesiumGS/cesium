define(["exports", "dojo/_base/lang", "../util/oo", "../stencil/Text"],
function(exports, lang, oo, Text){

// TODO: why not just return Label?

exports.Label = oo.declare(
	Text,
	function(/*Object*/options){
		// options: Object
		//		One key value: the stencil that called this.

		this.master = options.stencil;
		this.labelPosition = options.labelPosition || "BR"; // TL, TR, BR, BL, or function
		if(lang.isFunction(this.labelPosition)){
			this.setLabel = this.setLabelCustom;
		}
		this.setLabel(options.text || "");
		this.connect(this.master, "onTransform", this, "setLabel");
		this.connect(this.master, "destroy", this, "destroy");
		
		if(this.style.labelSameColor){
			this.connect(this.master, "attr", this, "beforeAttr");
		}
	},{
		// summary:
		//		An annotation called internally to label an Stencil.
		// description:
		//		Annotation is positioned with dojox.drawing.util.positioning.label
		//		That method should be overwritten for custom placement. Or,
		//		add a 'setLabelCustom' method to the Stencil and it will be used.

		_align:"start",
		drawingType:"label",
		
		setLabelCustom: function(/* ? String */text){
			// summary:
			//		Attaches to custom positioning within a Stencil

			var d = lang.hitch(this.master, this.labelPosition)();
			this.setData({
				x:d.x,
				y:d.y,
				width:d.w || this.style.text.minWidth,
				height:d.h || this._lineHeight
			});
			
			// is an event, not text, so keep the old label:
			if(text && !text.split){ text = this.getText(); }
			
			this.render(this.typesetter(text));
		},
		
		setLabel: function(/* String */text){
			// summary:
			//		Sets the text of the label. Not called directly. Should
			//		be called within Stencil. See stencil._Base

			// onTransform will pass an object here
			var x, y, box = this.master.getBounds();
			
			if(/B/.test(this.labelPosition)){
				y = box.y2 - this._lineHeight;
			}else{
				y = box.y1;
			}
			
			if(/R/.test(this.labelPosition)){
				x = box.x2;
			}else{
				y = box.y1;
				this._align = "end";
			}
			
			if(!this.labelWidth || (text && text.split && text != this.getText())){
				this.setData({
					x:x,
					y:y,
					height:this._lineHeight,
					width:this.style.text.minWidth
				});
				
				this.labelWidth = this.style.text.minWidth;
				this.render(this.typesetter(text));
				
			}else{
				
				this.setData({
					x:x,
					y:y,
					height:this.data.height,
					width:this.data.width
				});
				
				this.render();
			}
			
		},
		beforeAttr: function(key, value){
			if(value!==undefined){
				// make it an object
				var k = key; key = {}; key[k] = value;
			}
			delete key.x;
			delete key.y;
			delete key.width;
			delete key.height;
			this.attr(key);
			 // FIXME: this.created should already be set, shouldn't it?
			!this.created && this.render();
		}
	}

);
});
