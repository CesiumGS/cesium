dojo.provide("dojox.drawing.util.common");
dojo.require("dojox.math.round");

(function(){
	
	var uidMap = {};
	var start = 0;
	dojox.drawing.util.common	= {
		// summary:
		//		A collection of common methods used for DojoX Drawing.
		//		This singleton is accessible in most Drawing classes
		//		as this.util
		//
		// NOTE:
		//		A lot of functions use a EventObject
		//		as an argument. An attempt was made to accept
		//		either that object or a list of numbers. That wasn't
		//		finished (it didn't work well in all cases) but is
		//		likely to happen in the future.
		//		In cases where you are not sending a Mouse object,
		//		form your argument like so:
		//		var obj = {
		//			start:{
		//					x:Number,  	// start x
		//					y:Number	// start y
		//				},
		//				x: Number,		// end x
		//				y:Number		// end y
		//			}
		//
		//
		radToDeg: function(/*Numer*/n){
			// summary:
			//		Convert the passed number to degrees.
			return (n*180)/Math.PI;	//	Number
		},
		
		degToRad: function(/*Numer*/n){
			// summary:
			//		Convert the passed number to radians.
			return (n*Math.PI)/180;	// Number
		},
		
		angle: function(/*EventObject*/obj, /* ? Float */snap){
			// summary:
			//		Return angle based on mouse object
			// arguments:
			//		obj: EventObject
			//			Manager.Mouse event.
			// 		snap: Float
			//			Returns nearest angle within snap limits
			//
			//obj = this.argsToObj.apply(this, arguments);
			if(snap){
				snap = snap/180;
				var radians = this.radians(obj),
					seg = Math.PI * snap,
					rnd = dojox.math.round(radians/seg),
					new_radian = rnd*seg;
				return dojox.math.round(this.radToDeg(new_radian)); // Whole Number
			
			}else{
				return this.radToDeg(this.radians(obj)); // Float
			}
		},
		
		oppAngle: function(/*Angle*/ang){
			(ang+=180) > 360 ? ang = ang - 360 : ang;
			return ang;
		},
		
		radians: function(/*EventObject*/o){
			// summary:
			//		Return the radians derived from the coordinates
			//		in the Mouse object.
			//
			//var o = this.argsToObj.apply(this, arguments);
			return Math.atan2(o.start.y-o.y,o.x-o.start.x);
		},
		
		length: function(/*EventObject*/o){
			// summary:
			//		Return the length derived from the coordinates
			//		in the Mouse object.
			//
			return Math.sqrt(Math.pow(o.start.x-o.x, 2)+Math.pow(o.start.y-o.y, 2));
		},
		
		lineSub: function(/*Number*/x1, /*Number*/y1, /*Number*/x2, /*Number*/y2, /*Number*/amt){
			// summary:
			//		Subtract an amount from a line
			// description:
			//		x1,y1,x2,y2 represents the Line. 'amt' represents the amount
			//		to subtract from it.
			//
			var len = this.distance(this.argsToObj.apply(this, arguments));
			len = len < amt ? amt : len;
			var pc = (len-amt)/len;
			var x = x1 - (x1-x2) * pc;
			var y = y1 - (y1-y2) * pc;
			return {x:x, y:y}; // Object
		},
		
		argsToObj: function(){
			// summary:
			//		Attempts to determine in a Mouse Object
			//		was passed or indiviual numbers. Returns
			//		an object.
			//
			var a = arguments;
			if(a.length < 4){ return a[0]; }
			return {
				start:{
					x:a[0],
					y:a[1]
				},
				x:a[2],
				y:a[3]//,
				//snap:a[4]
			}; // Object
		},
		
		distance: function(/*EventObject or x1,y1,x2,y2*/){
			// summary:
			//		Return the length derived from the coordinates
			//		in the Mouse object. Different from util.length
			//		in that this always returns an absolute value.
			//
			var o = this.argsToObj.apply(this, arguments);
			return Math.abs(Math.sqrt(Math.pow(o.start.x-o.x, 2)+Math.pow(o.start.y-o.y, 2))); // Number
		},
		
		slope:function(/*Object*/p1, /*Object*/p2){
			// summary:
			//		Given two poits of a line, returns the slope.
			if(!(p1.x-p2.x)){ return 0; }
			return ((p1.y-p2.y)/(p1.x-p2.x)); // Number
		},
		
		pointOnCircle: function(/*Number*/cx, /*Number*/cy, /*Number*/radius, /*Number*/angle){
			// summary:
			//		A *very* helpful method. If you know the center
			//		(or starting) point, length and angle, find the
			//		x,y point at the end of that line.
			//
			var radians =  angle * Math.PI / 180.0;
			var x = radius * Math.cos(radians);
			var y = radius * Math.sin(radians);
			return {
				x:cx+x,
				y:cy-y
			}; // Object
		},
		
		constrainAngle: function(/*EventObject*/obj, /*Number*/min, /*Number*/max){
			// summary:
			//		Ensures the angle in the Mouse Object is within the
			//		min and max limits. If not one of those limits is used.
			//		Returns an x,y point for the angle used.
			//
			var angle = this.angle(obj);
			if(angle >= min && angle <= max){
				return obj;	 // Object
			}
			var radius = this.length(obj);
			var new_angle = angle > max ? max : min - angle < 100 ? min : max;
			return this.pointOnCircle(obj.start.x,obj.start.y,radius, new_angle); // Object
		},
		
		snapAngle: function(/*EventObject*/obj, /*Float*/ca){
			// summary:
			//		Snaps a line to the nearest angle
			//			obj: Mouse object (see dojox.drawing.Mouse)
			//			ca: Fractional amount to snap to
			//				A decimal number fraction of a half circle
			//				.5 would snap to 90 degrees
			//				.25  would snap to 45 degrees
			//				.125 would snap to 22.5 degrees, etc.
			//
			var radians = this.radians(obj),
				radius = this.length(obj),
				seg = Math.PI * ca,
				rnd = Math.round(radians/seg),
				new_radian = rnd*seg,
				new_angle = this.radToDeg(new_radian),
				pt = this.pointOnCircle(obj.start.x,obj.start.y,radius,new_angle);
			return pt;  // Object
		},
		
		// helpers
		idSetStart: function(num){
			start=num;
		},
		
		uid: function(/* ? String */str){
			// summary:
			//		Creates a unique ID.
			// arguments:
			//		str: String
			//			If provided, kept in a map, incremented
			//			and used in the id. Otherwise 'shape' is used.
			//
			str = str || "shape";
			uidMap[str] = uidMap[str]===undefined ? start : uidMap[str] + 1;
			return str + uidMap[str]; // String
		},
		
		abbr: function(type){
			// summary:
			//		Converts a namespace (typically a tool or a stencil) into
			//		an abbreviation
			return type.substring(type.lastIndexOf(".")+1).charAt(0).toLowerCase()
				+ type.substring(type.lastIndexOf(".")+2);
		},
		mixin: function(o1, o2){
			// TODO: make faster
			//return dojo.mixin(dojo.clone(o1), dojo.clone(o2));
		},
		
		objects:{}, //private?
		register: function(/*Object*/obj){
			// summary:
			//		Since util is the only Singleton in Drawing (besides
			//		keys) it is used to help connect the Drawing object
			//		the Toolbar. Since multiple drawings can be on one
			//		page, this function serves a little more use than
			//		on first apearance.
			this.objects[obj.id] = obj;
		},
		byId: function(/*String*/id){
			// summary:
			//		Get an object that was registered with util.register
			//
			return this.objects[id];
		},
		attr: function(/* Object */ elem, /* property */ prop, /* ? value */ value, squelchErrors){
			// summary:
			//		Helper function to attach attributes to SVG and VML raw nodes.
			//
			
			if(!elem){ return false; }
			try{
				
				// util is a crappy check, but we need to tell the diff
				// between a Drawing shape and a GFX shape
				if(elem.shape && elem.util){
					elem = elem.shape;
				}
				
				if(!value && prop=="id" && elem.target){
			
					var n = elem.target;
					while(!dojo.attr(n, "id")){
						n = n.parentNode;
					}
					return dojo.attr(n, "id");
				}
				
				if(elem.rawNode || elem.target){
					var args = Array.prototype.slice.call(arguments);
					args[0] = elem.rawNode || elem.target;
					return dojo.attr.apply(dojo, args);
				}
				return dojo.attr(elem, "id");
				
				
				
			}catch(e){
				if(!squelchErrors){
					// For debugging only. These errors actually cause errors in IE's console
					//console.error("BAD ATTR: prop:", prop, "el:", elem)
					//console.error(e)
					//console.trace();
				}
				return false;
			}
		}
	};
	
})();