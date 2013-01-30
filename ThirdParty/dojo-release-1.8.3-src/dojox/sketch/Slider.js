define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dijit/form/HorizontalSlider",
	"./_Plugin"
], function(dojo){
	dojo.getObject("sketch", true, dojox);
	dojo.declare("dojox.sketch.Slider", dojox.sketch._Plugin,{
		_initButton: function(){
			this.slider=new dijit.form.HorizontalSlider({minimum:5,maximum:100,style:"width:100px;",baseClass:'dijitInline dijitSlider'});
			this.slider._movable.node.title='Double Click to "Zoom to Fit"'; //I18N
			this.connect(this.slider,'onChange','_setZoom');
			this.connect(this.slider.sliderHandle,'ondblclick','_zoomToFit');
		},
		_zoomToFit: function(){
			var r=this.figure.getFit();
			this.slider.attr('value',this.slider.maximum<r?this.slider.maximum:(this.slider.minimum>r?this.slider.minimum:r));
		},
		_setZoom: function(v){
			if(v && this.figure){
				this.figure.zoom(v);
			}
		},
		reset: function(){
			//reset slider to maximum so that onChange will be fired when _zoomToFit is called
			this.slider.attr('value',this.slider.maximum);
			this._zoomToFit();
		},
		setToolbar: function(t){
			this._initButton();
			t.addChild(this.slider);
			if(!t._reset2Zoom){
				t._reset2Zoom=true;
				this.connect(t,'reset','reset');
			}
		}
	});

	dojox.sketch.registerTool("Slider", dojox.sketch.Slider);
	return dojox.sketch.Slider;
});
