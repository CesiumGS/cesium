define([
	"dojo/_base/lang",
	"./_base"
], function(lang,dd){
	/*=====
		dd = dojox.dtl;
	=====*/
	
	/*=====
	 dd.Context = function(dict){
	 	// summary: Represents a runtime context used by DTL templates.
	 }
	 
	=====*/
	dd.Context = lang.extend(function(dict){
		this._this = {};
		dd._Context.call(this, dict);
	}, dd._Context.prototype,
	{
		getKeys: function(){
			// summary: Returns the set of keys exported by this context.
			var keys = [];
			for(var key in this){
				if(this.hasOwnProperty(key) && key != "_this"){
					keys.push(key);
				}
			}
			return keys;
		},
		extend: function(/*dojox.dtl.Context|Object*/ obj){
			// summary: Returns a clone of this context object, with the items from the
			//		passed objecct mixed in.
			return  lang.delegate(this, obj);
		},
		filter: function(/*dojox.dtl.Context|Object|String...*/ filter){
			// summary: Returns a clone of this context, only containing the items
			//		defined in the filter.
			var context = new dd.Context();
			var keys = [];
			var i, arg;
			if(filter instanceof dd.Context){
				keys = filter.getKeys();
			}else if(typeof filter == "object"){
				for(var key in filter){
					keys.push(key);
				}
			}else{
				for(i = 0; arg = arguments[i]; i++){
					if(typeof arg == "string"){
						keys.push(arg);
					}
				}
			}

			for(i = 0, key; key = keys[i]; i++){
				context[key] = this[key];
			}

			return context;
		},
		setThis: function(/*Object*/ _this){
			// summary: Sets the object on which to perform operations. 
			// _this: the this ref.
			this._this = _this;
		},
		getThis: function(){
			// summary: Gets the object on which to perform operations. 
			return this._this;
		},
		hasKey: function(/*String*/key){
			// summary: Indicates whether the specified key is defined on this context.
			// key: The key to look up.
			if(this._getter){
				var got = this._getter(key);
				if(typeof got != "undefined"){
					return true;
				}
			}

			if(typeof this[key] != "undefined"){
				return true;
			}

		return false;
	}
});
return dojox.dtl.Context; 
});