define(["dojo/dom", "dojo/_base/lang", "dojo/_base/html", "dojo/_base/array",  "dojo/_base/connect", "dojo/query",
	"dijit/_BidiSupport", "../BidiSupport", "dijit/registry", "./Chart", "./Legend"], 
	function(dom, lang, html, arrayUtil, hub, query, dBidi, cBidi, widgetManager, Chart, Legend){

	// patch only if present
	if( Legend ){
		lang.extend(Legend, {
			// summary:
			//		Add support for bidi scripts in legend.
			// description:
			//		Since dojox.charting.widget.Legend inherits from _Widget use the bidi support
			//		that introduced there.

			postMixInProperties: function(){
				// summary:
				//		Connect the setter of textDir legend to setTextDir of the chart,
				//		so _setTextDirAttr of the legend will be called after setTextDir of the chart is called.
				// tags:
				//		private

				// find the chart that is the owner of this legend, use it's 
				// textDir
				if(!this.chart){
					if(!this.chartRef){ return; }
					var chart = widgetManager.byId(this.chartRef);
					if(!chart){
						var node = dom.byId(this.chartRef);
						if(node){
							chart = widgetManager.byNode(node);
						}else{
							return;
						}
					}
					this.textDir = chart.chart.textDir;
					hub.connect(chart.chart, "setTextDir", this, "_setTextDirAttr");

				}else{
					this.textDir = this.chart.textDir;
					hub.connect(this.chart, "setTextDir", this, "_setTextDirAttr");

				}
			},

			_setTextDirAttr: function(/*String*/ textDir){
				// summary:
				//		Setter for textDir. 
				// description:
				//		Users shouldn't call this function; they should be calling
				//		set('textDir', value)
				// tags:
				//		private
				
				// only if new textDir is different from the old one
				if(validateTextDir(textDir) != null){
					if(this.textDir != textDir){
						this._set("textDir", textDir);
						// get array of all the labels
						var legendLabels = query(".dojoxLegendText", this._tr);
							// for every label calculate it's new dir.
							arrayUtil.forEach(legendLabels, function(label){
								label.dir = this.getTextDir(label.innerHTML, label.dir);
						}, this);					
					}
				}
			}
		});
	}
	
	// patch only if present
	if( Chart ){
		lang.extend( Chart ,{
			postMixInProperties: function(){
				// set initial textDir of the chart, if passed in the creation use that value
				// else use default value, following the GUI direction, this.chart doesn't exist yet
				// so can't use set("textDir", textDir). This passed to this.chart in it's future creation.
				this.textDir = this.params["textDir"] ? this.params["textDir"] : this.params["dir"];
			},

			_setTextDirAttr: function(/*String*/ textDir){
				if(validateTextDir(textDir) != null){
					this._set("textDir", textDir);
					this.chart.setTextDir(textDir);
				}
			}
		});
	}

	function validateTextDir(textDir){
		return /^(ltr|rtl|auto)$/.test(textDir) ? textDir : null;
	}
		
});
