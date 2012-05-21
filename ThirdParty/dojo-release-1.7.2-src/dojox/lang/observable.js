dojo.provide("dojox.lang.observable");
// Used to create a wrapper object with monitored reads and writes
//
dojo.experimental("dojox.lang.observable");
// IMPORTANT DISCLAIMER:
// This is experimental and based on hideous hacks.
// There are severe limitations on the ability of wrapper objects:
// Only properties that have vbscript-legal names are accessible (similar to JavaScript, but they can't start with an underscore).
// The wrapper objects are not expando in IE, because they are built
// from VBScript objects. This means you can't add new properties after an object is created.
// The wrapper objects can not be used a prototype for other objects.
// Only properties with primitive values can be wrapped.
// This has performance implications as well.
dojox.lang.observable = function(/*Object*/wrapped,/*function*/onRead,/*function*/onWrite,/*function*/onInvoke){
	// 	summary:
	// 		Creates a wrapper object, which can be observed. The wrapper object
	// 		is a proxy to the wrapped object. If you will be making multiple wrapper
	// 		objects with the same set of listeners, it is recommended that you
	// 		use makeObservable, as it is more memory efficient.
	//
	// 	wrapped:
	// 		The object to be wrapped and monitored for property access and modification
	//
	// onRead:
	//		See dojox.lang.makeObservable.onRead
	// onWrite:
	//		See dojox.lang.makeObservable.onWrite
	// onInvoke:
	//		See dojox.lang.makeObservable.onInvoke
	
	return dojox.lang.makeObservable(onRead,onWrite,onInvoke)(wrapped);
}
dojox.lang.makeObservable = function(/*function*/onRead,/*function*/onWrite,/*function*/onInvoke,/*Object*/hiddenFunctions){
		
	// 	summary:
	// 		Creates and returns an observable creator function. All the objects that
	// 		are created with the returned constructor will use the provided onRead and
	// 		onWrite listeners.
	// 		The created constructor should be called with a single argument,
	// 		the object that will be wrapped to be observed. The constructor will
	// 		return the wrapper object.
	//
	// onRead:
	// 		This is called whenever one of the wrapper objects created
	// 		from the constructor has a property that is accessed. onRead
	// 		will be called with two arguments, the first being the wrapped object,
	// 		and the second is the name of property that is being accessed.
	// 		The value that onRead returns will be used as the value returned
	// 		by the property access
	//
	// onWrite:
	// 		This is called whenever one of the wrapper objects created
	// 		from the constructor has a property that is modified. onWrite
	// 		will be called with three arguments, the first being the wrapped object,
	// 		the second is the name of property that is being modified, and the
	// 		third is the value that is being set on the property.
	//
	// 	onInvoke:
	// 		This is called when a method on the object is invoked. The first
	// 		argument is the wrapper object, the second is the original wrapped object,
	// 		the third is the method name, and the fourth is the arguments.
	//
	// hiddenFunctions:
	// 		allows you to define functions that should be delegated
	// 		but may not be enumerable on the wrapped objects, so they must be
	// 		explicitly included
	//
	// example:
	// 		The following could be used to create a wrapper that would
	// 		prevent functions from being accessed on an object:
	// 	|	function onRead(obj,prop){
	//	|		return typeof obj[prop] == 'function' ? null : obj[prop];
	//	|	}
	//	|	var observable = dojox.lang.makeObservable(onRead,onWrite);
	//	|	var obj = {foo:1,bar:function(){}};
	//	|	obj = observable(obj);
	//	|	obj.foo -> 1
	//	|	obj.bar -> null
	//
	hiddenFunctions = hiddenFunctions || {};
	onInvoke = onInvoke || function(scope,obj,method,args){
		// default implementation for onInvoke, just passes the call through
		return obj[method].apply(scope,args);
	};
	function makeInvoker(scope,wrapped,i){
		return function(){
			// this is function used for all methods in the wrapper object
			return onInvoke(scope,wrapped,i,arguments);
		};
	}
	
	if(dojox.lang.lettableWin){ // create the vb class
		var factory = dojox.lang.makeObservable;
		factory.inc = (factory.inc || 0) + 1;
		// create globals for the getters and setters so they can be accessed from the vbscript
		var getName = "gettable_"+factory.inc;
		dojox.lang.lettableWin[getName] = onRead;
		var setName = "settable_"+factory.inc;
		dojox.lang.lettableWin[setName] = onWrite;
		var cache = {};
		return function(wrapped){
			if(wrapped.__observable){ // if it already has an observable, use that
				return wrapped.__observable;
			}
			if(wrapped.data__){
				throw new Error("Can wrap an object that is already wrapped");
			}
			// create the class
			var props = [], i, l;
			for(i in hiddenFunctions){
				props.push(i);
			}
			var vbReservedWords = {type:1,event:1};
			// find the unique signature for the class so we can reuse it if possible
			for(i in wrapped){
				if(i.match(/^[a-zA-Z][\w\$_]*$/) && !(i in hiddenFunctions) && !(i in vbReservedWords)){ //can only do properties with valid vb names/tokens and primitive values
					props.push(i);
				}
			}
			var signature = props.join(",");
			var prop,clazz = cache[signature];
			if(!clazz){
				var tname = "dj_lettable_"+(factory.inc++);
				var gtname = tname+"_dj_getter";
				var cParts = [
					"Class "+tname,
					"	Public data__" // this our reference to the original object
				];
				for(i=0, l=props.length; i<l; i++){
					prop = props[i];
					var type = typeof wrapped[prop];
					if(type == 'function' || hiddenFunctions[prop]){ // functions must go in regular properties for delegation:/
						cParts.push("  Public " + prop);
					}else if(type != 'object'){ // the getters/setters can only be applied to primitives
						cParts.push(
							"	Public Property Let "+prop+"(val)",
							"		Call "+setName+"(me.data__,\""+prop+"\",val)",
							"	End Property",
							"	Public Property Get "+prop,
							"		"+prop+" = "+getName+"(me.data__,\""+prop+"\")",
							"	End Property");
					}
				}
				cParts.push("End Class");
				cParts.push(
					"Function "+gtname+"()",
					"	Dim tmp",
					"	Set tmp = New "+tname,
					"	Set "+gtname+" = tmp",
					"End Function");
				dojox.lang.lettableWin.vbEval(cParts.join("\n"));
					
				// Put the new class in the cache
				cache[signature] = clazz = function(){
					return dojox.lang.lettableWin.construct(gtname); // the class can't be accessed, only called, so we have to wrap it with a function
				};
			}
			console.log("starting5");
			var newObj = clazz();
			newObj.data__ = wrapped;
			console.log("starting6");
			try {
				wrapped.__observable = newObj;
			} catch(e){ // some objects are not expando
			}
			for(i = 0,  l = props.length; i < l; i++){
				prop = props[i];
				try {
				var val = wrapped[prop];
				}
				catch(e){
					console.log("error ",prop,e);
				}
				if(typeof val == 'function' || hiddenFunctions[prop]){ // we can make a delegate function here
					newObj[prop] = makeInvoker(newObj,wrapped,prop);
				}
			}
			return newObj;
		};
	}else{
		return function(wrapped){ // do it with getters and setters
			if(wrapped.__observable){ // if it already has an observable, use that
				return wrapped.__observable;
			}
			var newObj = wrapped instanceof Array ? [] : {};
			newObj.data__ = wrapped;
			for(var i in wrapped){
				if(i.charAt(0) != '_'){
					if(typeof wrapped[i] == 'function'){
						newObj[i] = makeInvoker(newObj,wrapped,i); // TODO: setup getters and setters so we can detect when this changes
					}else if(typeof wrapped[i] != 'object'){
						(function(i){
							newObj.__defineGetter__(i,function(){
								return onRead(wrapped,i);
							});
							newObj.__defineSetter__(i,function(value){
								return onWrite(wrapped,i,value);
							});
						})(i);
					}
				}
			}
			for(i in hiddenFunctions){
				newObj[i] = makeInvoker(newObj,wrapped,i);
			}
			wrapped.__observable = newObj;
			return newObj;
		};
	}
};
if(!{}.__defineGetter__){
	if(dojo.isIE){
		// to setup the crazy lettable hack we need to
		// introduce vb script eval
		// the only way that seems to work for adding a VBScript to the page is with a document.write
		// document.write is not always available, so we use an iframe to do the document.write
		// the iframe also provides a good hiding place for all the global variables that we must
		// create in order for JScript and VBScript to interact.
		var frame;
		if(document.body){ // if the DOM is ready we can add it
			frame = document.createElement("iframe");
			document.body.appendChild(frame);
		}else{ // other we have to write it out
			document.write("<iframe id='dj_vb_eval_frame'></iframe>");
			frame = document.getElementById("dj_vb_eval_frame");
		}
		frame.style.display="none";
		var doc = frame.contentWindow.document;
		dojox.lang.lettableWin = frame.contentWindow;
		doc.write('<html><head><script language="VBScript" type="text/VBScript">' +
			'Function vb_global_eval(code)' +
				'ExecuteGlobal(code)' +
			'End Function' +
			'</script>' +
			'<script type="text/javascript">' +
			'function vbEval(code){ \n' + // this has to be here to call it from another frame
				'return vb_global_eval(code);' +
			'}' +
			'function construct(name){ \n' + // and this too
				'return window[name]();' +
			'}' +
			'</script>' +
			'</head><body>vb-eval</body></html>');
		doc.close();
	}else{
		throw new Error("This browser does not support getters and setters");
	}
}

dojox.lang.ReadOnlyProxy =
// summary:
// 		Provides a read only proxy to another object, this can be
// 		very useful in object-capability systems
// example:
// 	|	var obj = {foo:"bar"};
// 	|	var readonlyObj = dojox.lang.ReadOnlyProxy(obj);
// 	|	readonlyObj.foo = "test" // throws an error
// 	|	obj.foo = "new bar";
// 	|	readonlyObj.foo -> returns "new bar", always reflects the current value of the original (it is not just a copy)
dojox.lang.makeObservable(function(obj,i){
		return obj[i];
	},function(obj,i,value){
		// just ignore, exceptions don't seem to propagate through the VB stack.
});
