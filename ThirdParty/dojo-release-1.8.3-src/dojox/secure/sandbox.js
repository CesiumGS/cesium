dojo.provide("dojox.secure.sandbox");
dojo.require("dojox.secure.DOM");
dojo.require("dojox.secure.capability");
dojo.require("dojo.NodeList-fx");
dojo.require("dojo._base.url");

(function() {
	var oldTimeout = setTimeout;
	var oldInterval = setInterval;
	if({}.__proto__){
		// mozilla has unsafe methods on array
		var fixMozArrayFunction = function (name) {
			var method = Array.prototype[name];
			if(method && !method.fixed){
				(Array.prototype[name] = function () {
					if (this == window) {
						throw new TypeError("Called with wrong this");
					}
					return method.apply(this, arguments);
				}).fixed = true;
			}
		};
		// these are not safe in mozilla
		fixMozArrayFunction('concat');
		fixMozArrayFunction('reverse');
		fixMozArrayFunction('sort');
		fixMozArrayFunction("slice");
		fixMozArrayFunction("forEach");
		fixMozArrayFunction("filter");
		fixMozArrayFunction("reduce");
		fixMozArrayFunction("reduceRight");
		fixMozArrayFunction("every");
		fixMozArrayFunction("map");
		fixMozArrayFunction("some");
	}
	var xhrGet = function(){
		return dojo.xhrGet.apply(dojo,arguments);
	};
	dojox.secure.sandbox = function(element) {
		// summary:
		//		Creates a secure sandbox from which scripts and HTML can be loaded that
		//		will only be able to access the provided element and it's descendants, the
		//		rest of the DOM and JS environment will not be accessible to the sandboxed
		//		scripts and HTML.
		//
		// element:
		//		The DOM element to use as the container for the sandbox
		//
		// description:
		//		This function will create and return a sandbox object (see dojox.secure.__Sandbox)
		//		for the provided element.
		var wrap = dojox.secure.DOM(element);
		element = wrap(element);
		var document = element.ownerDocument;
		var mixin, dojo = dojox.secure._safeDojoFunctions(element,wrap);
		var imports= [];
		var safeCalls = ["isNaN","isFinite","parseInt","parseFloat","escape","unescape",
										"encodeURI","encodeURIComponent","decodeURI","decodeURIComponent",
										"alert","confirm","prompt", // some people may not want to allow these to be called, but they don't break capability-limiting
										"Error","EvalError","RangeError","ReferenceError","SyntaxError","TypeError",
										"Date","RegExp","Number","Object","Array","String","Math",
										//"ADSAFE", // not using ADSAFE runtime for the time being
										"setTimeout","setInterval","clearTimeout","clearInterval", // we make these safe below
										"dojo","get","set","forEach","load","evaluate"];
	   	for(var i in dojo){
	   		safeCalls.push(i); // add the safe dojo functions to as available global top level functions
	    	imports.push("var " + i + "=dojo." + i); // add to the list of imports
	    }
		// open the dojo namespace (namespaces are pretty silly in an environment where you can't set globals)
	   	eval(imports.join(";"));
		function get(obj,prop) {
			// basic access by index function
			prop = '' + prop;
			if(dojox.secure.badProps.test(prop)) {
				throw new Error("bad property access");
			}
			if(obj.__get__) {
				return obj.__get__(prop);
			}
			return obj[prop];
		}
		function set(obj,prop,value) {
			// basic set by index function
			prop = '' + prop;
			get(obj,prop); // test it
			if(obj.__set) {
				return obj.__set(prop);
			}
			obj[prop] = value;
			return value;
		}
		function forEach(obj,fun) {
			//	short syntax iterator function
			if(typeof fun != "function"){
				throw new TypeError();
			}
			if("length" in obj) {
				// do arrays the fast way
				if(obj.__get__) {
					// use the catch getter
					var len = obj.__get__('length');
					for (var i = 0; i < len; i++) {
						if(i in obj) {
							fun.call(obj, obj.__get__(i), i, obj);
						}
					}
				}
				else {
					// fast
					len = obj.length;
					for (i = 0; i < len; i++) {
						if(i in obj) {
							fun.call(obj, obj[i], i, obj);
						}
					}
				}
			}
			else {
				// for each an object
				for (i in obj) {
					fun.call(obj, get(obj,i), i, obj);
				}
			}
		}
		function Class(/*Function*/superclass, /*Object*/properties, /*Object*/classProperties) {
			// summary:
			//		A safe class constructor
			//
			// superclass:
			//		There may be zero or more superclass arguments. The constructed class
			//		will inherit from any provided superclasses, protypically from the first,
			//		via mixin for the subsequent. Later arguments
			//		will override properties/methods from earlier arguments
			//
			// properties:
			//		The constructed
			//		"class" will also have the methods/properties defined in this argument.
			//		These methods may utilize the <em>this</em> operator, and they
			//		are only the code that has access to <em>this</em>. Inner functions
			//		are also prohibited from using <em>this</em>.
			//
			//		If no superclasses are provided, this object will be the prototype of the
			//		constructed class (no copying
			//		will be done). Consequently you can "beget" by calling new (Class(obj)).
			//		All methods are "bound", each call results in |this| safety checking call.
			//
			// classProperties:
			//		This properties will be copied to the new class function.
			//
			//		Note that neither dojo.declare nor dojo.extend are acceptable class constructors as
			//		they are completely unsecure. This class constructor is conceptually based on declare
			//		but also somewhat influenced by base2, prototype, YUI, resig's patterns, etc.
			//
			// example:
			// |	var Car = Class({drive:function(speed) { ... } ); // create a Car class with a "drive" method
			// |	var FastCar = Class(Car,{driveFast: function(speed) { return this.drive(2 * speed); } }); // create a FastCar that extends Car
			// |	var fastCar = new FastCar; // instantiate
			// |	fastCar.driveFast(50); // call a method
			// |	var driveFast = fastCar.driveFast;
			// |	var driveFast(50); // this will throw an error, the method can be used with an object that is not an instance of FastCar
			var proto,superConstructor,ourConstructor;
			var arg;
			for (var i = 0, l = arguments.length; typeof (arg = arguments[i]) == 'function' && i < l; i++) {
				// go through each superclass argument
				if(proto) { // we have a prototype now, we must mixin now
					mixin(proto,arg.prototype);
				}
				else {
					// this is the first argument, so we can define the prototype ourselves
					// link up the prototype chain to the superclass's prototype, so we are a subtype
					superConstructor = arg;
					var F = function() {};
					F.prototype = arg.prototype;
					proto = new F;
				}
			}

			if(arg) { // the next object should be the properties
				// apply binding checking on all the functions
				for (var j in arg) {
					// TODO: check on non-enumerables?
					var value = arg[j];
					if(typeof value == 'function') {
						arg[j] = function() {
							if(this instanceof Class){
								return arguments.callee.__rawMethod__.apply(this,arguments);
							}
							throw new Error("Method called on wrong object");
						};
						arg[j].__rawMethod__ = value; // may want to use this for reconstruction and toString,valueOf
					}
				}
				if(arg.hasOwnProperty('constructor')) {
					ourConstructor = arg.constructor;
				}
			}
			proto = proto ? mixin(proto,arg) : arg; // if there is no proto yet, we can use the provided object
			function Class() {
				// the super class may not have been constructed using the same technique, we will just call the constructor
				if(superConstructor){
					superConstructor.apply(this,arguments);
				}
				if(ourConstructor){
					ourConstructor.apply(this,arguments);
				}
			}
			mixin(Class,arguments[i]); // the optional second object adds properties to the class
			proto.constructor = Class;
			Class.prototype = proto;
			return Class;
		}
		function checkString(func){
			if(typeof func != 'function') {
				throw new Error("String is not allowed in setTimeout/setInterval");
			}
		}
		function setTimeout(func,time) {
			// sandboxed setTimeout
			checkString(func);
			return oldTimeout(func,time);
		}
		function setInterval(func,time) {
			// sandboxed setInterval
			checkString(func);
			return oldInterval(func,time);
		}
		function evaluate(script){
			// sandboxed eval
			return wrap.evaluate(script);
		}
		var load = wrap.load = function(url){
			// provides a loader function for the sandbox
			if (url.match(/^[\w\s]*:/)){
				throw new Error("Access denied to cross-site requests");
			}
			return xhrGet({url:(new dojo._Url(wrap.rootUrl,url))+'',secure:true});
		}
		wrap.evaluate = function(script){
			//if(!alreadyValidated) {
			dojox.secure.capability.validate(script,safeCalls, // the safe dojo library and standard operators
											{document:1,element:1}); // these are secured DOM starting points

			//}
			if(script.match(/^\s*[\[\{]/)) {
				var result = eval('(' + script + ')');
				// TODO: call render on result?
			}
			else {
				eval(script);
			}
			//eval('wrap.evaluate=('+arguments.callee.toString()+')'); // yeah, recursive scoping;
		};
		return /*===== dojo.declare("dojox.secure.__Sandbox", null, =====*/ { // dojox.secure.__Sandbox
			loadJS : function(url){
				// summary:
				//		Loads the script from the given URL using XHR (assuming
				//		a plugin system is in place for cross-site requests) within the sandbox
				//
				// url:
				//		The url of the script to load
				wrap.rootUrl = url;
				return xhrGet({url:url,secure:true}).addCallback(function(result) {
					evaluate(result,element /*If we get the results with a secure proxy, we would call put true here */);
				});
			},
			loadHTML : function(url){
				// summary:
				//		Loads the web page from the provided URL using XHR (assuming the
				//		plugin system is in place) within the sandbox. All scripts within the web
				//		page will also be sandboxed.
				//
				// url:
				//		The url of the web page to load

				wrap.rootUrl = url;
				return xhrGet({url:url,secure:true}).addCallback(function(result){
					element.innerHTML = result;
				});
			},
			evaluate : function(script){
				// summary:
				//		Evaluates the given script within the sandbox
				//
				// script:
				//		The JavaScript text to evaluate
				return wrap.evaluate(script);
			}
			// TODO: could add something for pre-validated scripts
		}/*===== ) =====*/;
	};
})();
dojox.secure._safeDojoFunctions = function(element,wrap) {
	//	Creates a safe subset of Dojo core library
	var safeFunctions = ["mixin","require","isString","isArray","isFunction","isObject","isArrayLike","isAlien",
	"hitch","delegate","partial","trim","disconnect","subscribe","unsubscribe","Deferred","toJson","style","attr"];
	//var domFunctions = ["clone","byId"];
	var doc = element.ownerDocument;
	var unwrap = dojox.secure.unwrap;
	dojo.NodeList.prototype.addContent.safetyCheck = function(content){
		wrap.safeHTML(content);
	};
	dojo.NodeList.prototype.style.safetyCheck = function(name,value){
		if(name=='behavior'){
			throw new Error("Can not set behavior");
		}
		wrap.safeCSS(value);
	};
	dojo.NodeList.prototype.attr.safetyCheck = function(name,value){
		if (value && (name == 'src' || name == 'href' || name=='style')){
			throw new Error("Illegal to set " + name);
		}
	};
	var safe = {
		query : function(query,root) {
			return wrap(dojo.query(query,unwrap(root || element))); // wrap the NodeList
		},
		connect: function(el,event) {
			var obj = el;
			arguments[0] = unwrap(el);
			if(obj!=arguments[0] && event.substring(0,2) != 'on'){
				// it is probably an element, and it doesn't look like an event handler, probably not safe
				throw new Error("Invalid event name for element");
			}
			return dojo.connect.apply(dojo,arguments);
		},
		body : function() {
			return element;
		},
		byId : function(id) {
			return element.ownerDocument.getElementById(id); // use the safe document
		},
		fromJson : function(str) {
			// make sure it is safe before passing it to the unsafe dojo.fromJson
			dojox.secure.capability.validate(str,[],{});
			return dojo.fromJson(str);
		}
	};
	for (var i = 0; i < safeFunctions.length; i++) {
		safe[safeFunctions[i]] = dojo[safeFunctions[i]];
	}
	return safe;
};

