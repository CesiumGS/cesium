define(["dojo/_base/lang","dojo/fx/easing","dojo/_base/fx","dojo/dom","./_base","dojo/_base/connect",
		"dojo/_base/html", "dojo/_base/array","dojo/_base/Color"],
 function(lang, easingUtil, baseFx, dom, dojoxFx, connectUtil, htmlUtil, arrayUtil, Color){

dojoxFx.animateTimeline = function(options, node){
	// summary:
	//		An add-on to dojo.fx that provides the ability to create
	//		a complex property animation based on an array of "keyframes".
	// description:
	//		The Timeline is a replacement for the default dojo._Line.
	//		Instead of _Line.getValue returning a float between 0-1,
	//		_Timeline.getValue returns an object with all properties and
	//		their current values.
	//		A property does not have to appear in every keyframe.
	//		As in the example below, "height" is transitioned from the first
	//		keyframe to the third. "width" is transitioned from the first
	//		to the second to the third.
	//		Each keyframe can accept the following custom properties:
	//
	//		- step: String:
	//		  The start, finish or percentage that this keyframe represents.
	//		  Allowed parameters are:
	//			- 0%-100%
	//			- from (same as 0%, used to conform with the Webkit animation spec)
	//			- to (same as 100%, used to conform with the Webkit animation spec)
	//		- ease: String:
	//		  The string name of a dojo.fx.easing ease. Defaults to "linear". Use
	//		  the suffix name of the ease, like: "quadIn", not: "dojo.fx.quadIn".
	// options: Object
	//		The parameters passed to the timeline animation. Includes:
	//
	//		- keys: Array: An array of objects, with style properties and values.
	//		- duration: Duration of the animation in milliseconds.  Defaults to 1000.
	// node: DomNode|String
	//		The DomNode or id to be animated.
	// example:
	//	|	var keys = [
	//	|	{
	//	|		step:"0px",
	//	|		ease:"quadInOut",
	//	|		width:"50px",
	//	|		height:"50px",
	//	|	},{
	//	|		step:"25%",
	//	|		width:"190px"
	//	|	},{
	//	|		step:"100%",
	//	|		width:"10px",
	//	|		height:"200px",
	//	|	}
	//	|	];
	//	|	ani = dojox.fx.animateTimeline({keys:keys, duration:2000}, "myDiv").play();

	var _curve = new Timeline(options.keys);
	var ani = baseFx.animateProperty({
		node:dom.byId(node || options.node),
		duration:options.duration || 1000,
		properties:_curve._properties,
		// don't change! This easing is for the timeline,
		// not individual properties
		easing:easingUtil.linear,
		onAnimate: function(v){
			//console.log("   ani:", v);
		}
	});
	connectUtil.connect(ani, "onEnd", function(node){
		// Setting the final style. Hiccups in the browser
		// can cause the animation to lose track. This ensures
		// that it finishes in the proper location.
		var sty = ani.curve.getValue(ani.reversed ? 0 : 1);
		htmlUtil.style(node, sty);
	});
	connectUtil.connect(ani, "beforeBegin", function(){
		// remove default curve and replace it with Timeline
		if(ani.curve){ delete ani.curve; }
		ani.curve = _curve;
		_curve.ani = ani;
	})
	return ani; // dojo.Animation
};

var Timeline = function(/* Array */keys){
	// summary:
	//		The dojox.fx._Timeline object from which an instance
	//		is created
	// tags:
	//		private
	this.keys = lang.isArray(keys) ? this.flatten(keys) : keys;
};

Timeline.prototype.flatten = function(keys){
	// summary:
	//		An internally used function that converts the keyframes
	//		as used in the example above into a series of key values
	//		which is what is used in the animation parsing.
	var getPercent = function(str, idx){
		if(str == "from"){ return 0; }
		if(str == "to"){ return 1; }
		if(str === undefined){
			return idx==0 ? 0 : idx / (keys.length - 1)
		}
		return parseInt(str, 10) * .01
	};
	var p = {}, o = {};
	arrayUtil.forEach(keys, function(k, i){
		var step = getPercent(k.step, i);
		var ease = easingUtil[k.ease] || easingUtil.linear;
		
		for(var nm in k){
			if(nm == "step" || nm == "ease" || nm == "from" || nm == "to"){ continue; }
			if(!o[nm]){
				o[nm] = {
					steps:[],
					values:[],
					eases:[],
					ease:ease
				};
				p[nm] = {};
				if(!/#/.test(k[nm])){
					p[nm].units = o[nm].units = /\D{1,}/.exec(k[nm]).join("");
				}else{
					p[nm].units = o[nm].units = "isColor";
				}
			}
			
			o[nm].eases.push(easingUtil[k.ease || "linear"]);
			
			o[nm].steps.push(step);
			if(p[nm].units == "isColor"){
				o[nm].values.push(new Color(k[nm]));
			}else{
				o[nm].values.push(parseInt(/\d{1,}/.exec(k[nm]).join("")));
			}
			
			if(p[nm].start === undefined){
				p[nm].start = o[nm].values[o[nm].values.length-1];
			}else{
				p[nm].end = o[nm].values[o[nm].values.length-1]
			}
		}
	});
	
	
	this._properties = p;
	return o; // Object
	
};

Timeline.prototype.getValue = function(/*float*/ p){
	// summary:
	//		Replaces the native getValue in dojo.fx.Animation.
	//		Returns an object with all propeties used in the animation
	//		and the property's current value
	p = this.ani._reversed ? 1-p : p;
	var o = {}, self = this;
	
	var getProp = function(nm, i){
		return self._properties[nm].units!="isColor" ?
			self.keys[nm].values[i] + self._properties[nm].units :
			self.keys[nm].values[i].toCss();
	};
	
	for(var nm in this.keys){
		var k = this.keys[nm];
		for(var i=0; i<k.steps.length; i++){
			
			var step = k.steps[i];
			var ns = k.steps[i+1];
			var next = i < k.steps.length ? true : false;
			var ease = k.eases[i] || function(n){return n;};
			
			if(p == step){
				// first or last
				o[nm] = getProp(nm, i);
				if(!next || (next &&  this.ani._reversed)) break;
			
			}else if(p > step){
				
				if(next && p < k.steps[i+1]){
					// inbetween steps
					var end = k.values[i+1];
					var beg = k.values[i];
					
					var seg = (1 / (ns - step)) * (p - step);
					seg = ease(seg);
					
					if(beg instanceof Color){
						o[nm] = Color.blendColors(beg, end, seg).toCss(false);
					}else{
						var df = end - beg;
						o[nm] = beg + seg * df + this._properties[nm].units;
					}
					break;
				
				}else{
					// completed keys before 100%
					o[nm] = getProp(nm, i);
				}
				
			}else if((next && !this.ani._reversed) || (!next && this.ani._reversed)){
				o[nm] = getProp(nm, i);
			}
		}
	}
	return o; // Object
};
dojoxFx._Timeline = Timeline;
return dojoxFx;
});
