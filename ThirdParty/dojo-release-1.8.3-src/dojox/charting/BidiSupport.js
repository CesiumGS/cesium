define(["../main", "dojo/_base/lang", "dojo/dom-style", "dojo/_base/array", "dojo/_base/sniff",
	"dojo/dom","dojo/dom-construct",
	"dojox/gfx", "dojox/gfx/_gfxBidiSupport", "./Chart", "./axis2d/common", "dojox/string/BidiEngine", "dojox/lang/functional"], 
	function(dojox, lang, domStyle, arr, has, dom, domConstruct, g, gBidi, Chart, da, BidiEngine, df){

	var bidiEngine = new BidiEngine();

	var dc = lang.getObject("charting", true, dojox);
	
	lang.extend(Chart, {
		// summary:
		//		Add support for bidi scripts to dojox/charting classes.
		// description:
		//		Bidi stands for support for languages with a bidirectional script. 
		//		There's a special need for displaying BIDI text in rtl direction 
		//		in ltr GUI, sometimes needed auto support.
		//		dojox.charting does not support control over base text direction provided in Dojo.

		// textDir: String
		//		Bi-directional support,	the main variable which is responsible for the direction of the text.
		//		The text direction can be different than the GUI direction by using this parameter.
		//		Allowed values:
		//
		//		1. "ltr"
		//		2. "rtl"
		//		3. "auto" - contextual the direction of a text defined by first strong letter.
		//
		//		By default is as the page direction.
		textDir:"",
		
		getTextDir: function(/*String*/text){
			// summary:
			//		Return direction of the text. 
			// description:
			//		If textDir is ltr or rtl returns the value.
			//		If it's auto, calls to another function that responsible 
			//		for checking the value, and defining the direction.			
			// text:
			//		Used in case textDir is "auto", this case the direction is according to the first
			//		strong (directionally - which direction is strong defined) letter.
			// tags:
			//		protected.
			var textDir = this.textDir == "auto" ? bidiEngine.checkContextual(text) : this.textDir;
			// providing default value
			if(!textDir){
				textDir = domStyle.get(this.node, "direction");
			}
			return textDir;
		},

		postscript: function(node,args){
			// summary:
			//		Kicks off chart instantiation.
			// description:
			//		Used for setting the textDir of the chart. 
			// tags:
			//		private

			// validate textDir
			var textDir = args ? (args["textDir"] ? validateTextDir(args["textDir"]) : "") : "";
			// if textDir wasn't defined or was defined wrong, apply default value
			textDir = textDir ? textDir : domStyle.get(this.node, "direction");
			this.textDir = textDir;

			this.surface.textDir = textDir;
			
			// two data structures, used for storing data for further enablement to change
			// textDir dynamically
			this.htmlElementsRegistry = [];
			this.truncatedLabelsRegistry = [];
		},

		setTextDir: function(/*String*/ newTextDir, obj){
			// summary:
			//		Setter for the textDir attribute.
			// description:
			//		Allows dynamically set the textDir, goes over all the text-children and  
			//		updates their base text direction.
			// tags:
			//		public
		
			if(newTextDir == this.textDir){
				return this;
			}
			if(validateTextDir(newTextDir) != null){
				this.textDir = newTextDir;
				
				// set automatically all the gfx objects that were created by this surface
				// (groups, text objects)
				this.surface.setTextDir(newTextDir);
			
				// truncated labels that were created with gfx creator need to recalculate dir
				// for case like: "111111A" (A stands for bidi character) and the truncation
				// is "111..." If the textDir is auto, the display should be: "...111" but in gfx
				// case we will get "111...". Because this.surface.setTextDir will calculate the dir of truncated
				// label, which value is "111..." but th real is "111111A".
				// each time we created a gfx truncated label we stored it in the truncatedLabelsRegistry, so update now 
				// the registry.
				if(this.truncatedLabelsRegistry && newTextDir == "auto"){
					arr.forEach(this.truncatedLabelsRegistry, function(elem){
						var tDir = this.getTextDir(elem["label"]);
						if(elem["element"].textDir != tDir){
							elem["element"].setShape({textDir: tDir});
						}
					}, this);
				}
				
				// re-render axes with html labels. for recalculation of the labels
				// positions etc.
				// create array of keys for all the axis in chart 
				var axesKeyArr = df.keys(this.axes);
				if(axesKeyArr.length > 0){
					// iterate over the axes, and for each that have html labels render it.
					arr.forEach(axesKeyArr, function(key, index, arr){
						// get the axis 
						var axis = this.axes[key];
						// if the axis has html labels 
						if(axis.htmlElements[0]){
							axis.dirty = true;
							axis.render(this.dim, this.offsets);
						}
					},this);
					
					// recreate title
					if(this.title){
						var forceHtmlLabels = (g.renderer == "canvas"),
							labelType = forceHtmlLabels || !has("ie") && !has("opera") ? "html" : "gfx",
							tsize = g.normalizedLength(g.splitFontString(this.titleFont).size);
						// remove the title
						domConstruct.destroy(this.chartTitle);
						this.chartTitle =null;
						// create the new title
						this.chartTitle = da.createText[labelType](
							this,
							this.surface,
							this.dim.width/2,
							this.titlePos=="top" ? tsize + this.margins.t : this.dim.height - this.margins.b,
							"middle",
							this.title,
							this.titleFont,
							this.titleFontColor
						);
					}				
				}else{
				// case of pies, spiders etc.
					arr.forEach(this.htmlElementsRegistry, function(elem, index, arr){
						var tDir = newTextDir == "auto" ? this.getTextDir(elem[4]) : newTextDir;
						if(elem[0].children[0] && elem[0].children[0].dir != tDir){
							dom.destroy(elem[0].children[0]);
							elem[0].children[0] = da.createText["html"]
									(this, this.surface, elem[1], elem[2], elem[3], elem[4], elem[5], elem[6]).children[0];
						}
					},this);
				}
			}
		},

		truncateBidi: function(elem, label, labelType){
			// summary:
			//		Enables bidi support for truncated labels.
			// description:
			//		Can be two types of labels: html or gfx.
			//
			//		####gfx labels:
			//
			//		Need to be stored in registry to be used when the textDir will be set dynamically.
			//		Additional work on truncated labels is needed for case as 111111A (A stands for "bidi" character rtl directioned).
			//		let's say in this case the truncation is "111..." If the textDir is auto, the display should be: "...111" but in gfx
			//		case we will get "111...". Because this.surface.setTextDir will calculate the dir of truncated
			//		label, which value is "111..." but th real is "111111A".
			//		each time we created a gfx truncated label we store it in the truncatedLabelsRegistry.
			//
			//		####html labels:
			//
			//		no need for repository (stored in another place). Here we only need to update the current dir according to textDir.
			// tags:
			//		private
		
			if(labelType == "gfx"){
				// store truncated gfx labels in the data structure.
				this.truncatedLabelsRegistry.push({element: elem, label: label});
				if(this.textDir == "auto"){
					elem.setShape({textDir: this.getTextDir(label)});
				}
			}
			if(labelType == "html" && this.textDir == "auto"){
				elem.children[0].dir = this.getTextDir(label);
			}
		}
	});

	var extendMethod = function(obj, method, bundleByPrototype, before, after){
		// Some helper function. Used for extending method of obj.
		// obj: Object
		//		The obj we overriding it's method.
		// method: String
		//		The method that is extended, the original method is called before or after
		//		functions that passed to extendMethod.
		// bundleByPrototype: boolean
		//		There's two methods to extend, using prototype or not.
		// before: function
		//		If defined this function will be executed before the original method.
		// after: function
		//		If defined this function will be executed after the original method.
		if(bundleByPrototype){
			var old = obj.prototype[method];
			obj.prototype[method] = 
				function(){
					var rBefore;
					if (before){
						rBefore = before.apply(this, arguments);
					}
					var r = old.apply(this, rBefore);
					if (after){
						r = after.call(this, r, arguments);
					}
					return r;
				};
		}else{
			var old = lang.clone(obj[method]);
			obj[method] = 
				function(){
					var rBefore;
					if (before){
						rBefore = before.apply(this, arguments);
					}
					var r = old.apply(this, arguments);
					if (after){
						after(r, arguments);
					}
					return r;
				};		
		}
	};

	var labelPreprocess = function(elem, chart, label, truncatedLabel, font, elemType){
		// aditional preprocessing of the labels, needed for rtl base text direction in LTR 
		// GUI, or for ltr base text direction for RTL GUI.

		var isChartDirectionRtl = (domStyle.get(chart.node,"direction") == "rtl");
		var isBaseTextDirRtl = (chart.getTextDir(label) == "rtl");

		if(isBaseTextDirRtl && !isChartDirectionRtl){
			label = "<span dir='rtl'>" + label +"</span>";
		}
		if(!isBaseTextDirRtl && isChartDirectionRtl){
			label = "<span dir='ltr'>" + label +"</span>";
		}

		return arguments;
	};

	// connect labelPreprocess to run before labelTooltip.
	// patch it only is available
	if(dc.axis2d && dc.axis2d.Default){
		extendMethod(dc.axis2d.Default, "labelTooltip", true, labelPreprocess, null);
		//extendMethod(dijit,"showTooltip",false, labelPreprocess, null);
	}

	function htmlCreateText(r, agumentsArr){
		// function to register HTML elements that created by html.createText, this array
		// needed for allowing to change textDir dynamically.
		agumentsArr[0].htmlElementsRegistry.push([r, agumentsArr[2], agumentsArr[3], agumentsArr[4], agumentsArr[5], agumentsArr[6], agumentsArr[7]]);
	}

	extendMethod(da.createText,"html", false, null, htmlCreateText);

	function validateTextDir(textDir){
		return /^(ltr|rtl|auto)$/.test(textDir) ? textDir : null;
	}

	/*=====
	return {
		// summary:
		//		Add support to dojox/charting for bidi scripts.
		// description:
		//		Bidi stands for support for languages with a bidirectional script.
		//		There's a special need for displaying BIDI text in rtl direction
		//		in ltr GUI, sometimes needed auto support.
		//		dojox.charting does not support control over base text direction provided in Dojo.
	};
	=====*/

	return Chart;
		
});
