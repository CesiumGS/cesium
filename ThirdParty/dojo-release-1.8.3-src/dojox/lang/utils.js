define(["..", "dojo/_base/lang"], 
  function(dojox, lang){
	var du = lang.getObject("lang.utils", true, dojox);
	
	var empty = {}, opts = Object.prototype.toString;

	var clone = function(o){
		if(o){
			switch(opts.call(o)){
				case "[object Array]":
					return o.slice(0);
				case "[object Object]":
					return lang.delegate(o);
			}
		}
		return o;
	}
	
	lang.mixin(du, {
		coerceType: function(target, source){
			// summary:
			//		Coerces one object to the type of another.
			// target: Object
			//		object, which typeof result is used to coerce "source" object.
			// source: Object
			//		object, which will be forced to change type.
			switch(typeof target){
				case "number":	return Number(eval("(" + source + ")"));
				case "string":	return String(source);
				case "boolean":	return Boolean(eval("(" + source + ")"));
			}
			return eval("(" + source + ")");
		},
		
		updateWithObject: function(target, source, conv){
			// summary:
			//		Updates an existing object in place with properties from an "source" object.
			// target: Object
			//		the "target" object to be updated
			// source: Object
			//		the "source" object, whose properties will be used to source the existed object.
			// conv: Boolean?
			//		force conversion to the original type
			if(!source){ return target; }
			for(var x in target){
				if(x in source && !(x in empty)){
					var t = target[x];
					if(t && typeof t == "object"){
						du.updateWithObject(t, source[x], conv);
					}else{
						target[x] = conv ? du.coerceType(t, source[x]) : clone(source[x]);
					}
				}
			}
			return target;	// Object
		},
	
		updateWithPattern: function(target, source, pattern, conv){
			// summary:
			//		Updates an existing object in place with properties from an "source" object.
			// target: Object
			//		the "target" object to be updated
			// source: Object
			//		the "source" object, whose properties will be used to source the existed object.
			// pattern: Object
			//		object, whose properties will be used to pull values from the "source"
			// conv: Boolean?
			//		force conversion to the original type
			if(!source || !pattern){ return target; }
			for(var x in pattern){
				if(x in source && !(x in empty)){
					target[x] = conv ? du.coerceType(pattern[x], source[x]) : clone(source[x]);
				}
			}
			return target;	// Object
		},
		
		merge: function(object, mixin){
			// summary:
			//		Merge two objects structurally, mixin properties will override object's properties.
			// object: Object
			//		original object.
			// mixin: Object
			//		additional object, which properties will override object's properties.
			if(mixin){
				var otype = opts.call(object), mtype = opts.call(mixin), t, i, l, m;
				switch(mtype){
					case "[object Array]":
						if(mtype == otype){
							t = new Array(Math.max(object.length, mixin.length));
							for(i = 0, l = t.length; i < l; ++i){
								t[i] = du.merge(object[i], mixin[i]);
							}
							return t;
						}
						return mixin.slice(0);
					case "[object Object]":
						if(mtype == otype && object){
							t = lang.delegate(object);
							for(i in mixin){
								if(i in object){
									l = object[i];
									m = mixin[i];
									if(m !== l){
										t[i] = du.merge(l, m);
									}
								}else{
									t[i] = lang.clone(mixin[i]);
								}
							}
							return t;
						}
						return lang.clone(mixin);
				}
			}
			return mixin;
		}
	});
	
	return du;
});
