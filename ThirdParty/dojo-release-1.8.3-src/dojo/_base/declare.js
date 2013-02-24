define(["./kernel", "../has", "./lang"], function(dojo, has, lang){
	// module:
	//		dojo/_base/declare

	var mix = lang.mixin, op = Object.prototype, opts = op.toString,
		xtor = new Function, counter = 0, cname = "constructor";

	function err(msg, cls){ throw new Error("declare" + (cls ? " " + cls : "") + ": " + msg); }

	// C3 Method Resolution Order (see http://www.python.org/download/releases/2.3/mro/)
	function c3mro(bases, className){
		var result = [], roots = [{cls: 0, refs: []}], nameMap = {}, clsCount = 1,
			l = bases.length, i = 0, j, lin, base, top, proto, rec, name, refs;

		// build a list of bases naming them if needed
		for(; i < l; ++i){
			base = bases[i];
			if(!base){
				err("mixin #" + i + " is unknown. Did you use dojo.require to pull it in?", className);
			}else if(opts.call(base) != "[object Function]"){
				err("mixin #" + i + " is not a callable constructor.", className);
			}
			lin = base._meta ? base._meta.bases : [base];
			top = 0;
			// add bases to the name map
			for(j = lin.length - 1; j >= 0; --j){
				proto = lin[j].prototype;
				if(!proto.hasOwnProperty("declaredClass")){
					proto.declaredClass = "uniqName_" + (counter++);
				}
				name = proto.declaredClass;
				if(!nameMap.hasOwnProperty(name)){
					nameMap[name] = {count: 0, refs: [], cls: lin[j]};
					++clsCount;
				}
				rec = nameMap[name];
				if(top && top !== rec){
					rec.refs.push(top);
					++top.count;
				}
				top = rec;
			}
			++top.count;
			roots[0].refs.push(top);
		}

		// remove classes without external references recursively
		while(roots.length){
			top = roots.pop();
			result.push(top.cls);
			--clsCount;
			// optimization: follow a single-linked chain
			while(refs = top.refs, refs.length == 1){
				top = refs[0];
				if(!top || --top.count){
					// branch or end of chain => do not end to roots
					top = 0;
					break;
				}
				result.push(top.cls);
				--clsCount;
			}
			if(top){
				// branch
				for(i = 0, l = refs.length; i < l; ++i){
					top = refs[i];
					if(!--top.count){
						roots.push(top);
					}
				}
			}
		}
		if(clsCount){
			err("can't build consistent linearization", className);
		}

		// calculate the superclass offset
		base = bases[0];
		result[0] = base ?
			base._meta && base === result[result.length - base._meta.bases.length] ?
				base._meta.bases.length : 1 : 0;

		return result;
	}

	function inherited(args, a, f){
		var name, chains, bases, caller, meta, base, proto, opf, pos,
			cache = this._inherited = this._inherited || {};

		// crack arguments
		if(typeof args == "string"){
			name = args;
			args = a;
			a = f;
		}
		f = 0;

		caller = args.callee;
		name = name || caller.nom;
		if(!name){
			err("can't deduce a name to call inherited()", this.declaredClass);
		}

		meta = this.constructor._meta;
		bases = meta.bases;

		pos = cache.p;
		if(name != cname){
			// method
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				base = bases[0];
				meta = base._meta;
				if(meta.hidden[name] !== caller){
					// error detection
					chains = meta.chains;
					if(chains && typeof chains[name] == "string"){
						err("calling chained method with inherited: " + name, this.declaredClass);
					}
					// find caller
					do{
						meta = base._meta;
						proto = base.prototype;
						if(meta && (proto[name] === caller && proto.hasOwnProperty(name) || meta.hidden[name] === caller)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
					pos = base ? pos : -1;
				}
			}
			// find next
			base = bases[++pos];
			if(base){
				proto = base.prototype;
				if(base._meta && proto.hasOwnProperty(name)){
					f = proto[name];
				}else{
					opf = op[name];
					do{
						proto = base.prototype;
						f = proto[name];
						if(f && (base._meta ? proto.hasOwnProperty(name) : f !== opf)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
				}
			}
			f = base && f || op[name];
		}else{
			// constructor
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				meta = bases[0]._meta;
				if(meta && meta.ctor !== caller){
					// error detection
					chains = meta.chains;
					if(!chains || chains.constructor !== "manual"){
						err("calling chained constructor with inherited", this.declaredClass);
					}
					// find caller
					while(base = bases[++pos]){ // intentional assignment
						meta = base._meta;
						if(meta && meta.ctor === caller){
							break;
						}
					}
					pos = base ? pos : -1;
				}
			}
			// find next
			while(base = bases[++pos]){	// intentional assignment
				meta = base._meta;
				f = meta ? meta.ctor : base;
				if(f){
					break;
				}
			}
			f = base && f;
		}

		// cache the found super method
		cache.c = f;
		cache.p = pos;

		// now we have the result
		if(f){
			return a === true ? f : f.apply(this, a || args);
		}
		// intentionally no return if a super method was not found
	}

	function getInherited(name, args){
		if(typeof name == "string"){
			return this.__inherited(name, args, true);
		}
		return this.__inherited(name, true);
	}

	function inherited__debug(args, a1, a2){
		var f = this.getInherited(args, a1);
		if(f){ return f.apply(this, a2 || a1 || args); }
		// intentionally no return if a super method was not found
	}

	var inheritedImpl = dojo.config.isDebug ? inherited__debug : inherited;

	// emulation of "instanceof"
	function isInstanceOf(cls){
		var bases = this.constructor._meta.bases;
		for(var i = 0, l = bases.length; i < l; ++i){
			if(bases[i] === cls){
				return true;
			}
		}
		return this instanceof cls;
	}

	function mixOwn(target, source){
		// add props adding metadata for incoming functions skipping a constructor
		for(var name in source){
			if(name != cname && source.hasOwnProperty(name)){
				target[name] = source[name];
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				if(name != cname && source.hasOwnProperty(name)){
					  target[name] = source[name];
				}
			}
		}
	}

	// implementation of safe mixin function
	function safeMixin(target, source){
		// summary:
		//		Mix in properties skipping a constructor and decorating functions
		//		like it is done by declare().
		// target: Object
		//		Target object to accept new properties.
		// source: Object
		//		Source object for new properties.
		// description:
		//		This function is used to mix in properties like lang.mixin does,
		//		but it skips a constructor property and decorates functions like
		//		declare() does.
		//
		//		It is meant to be used with classes and objects produced with
		//		declare. Functions mixed in with dojo.safeMixin can use
		//		this.inherited() like normal methods.
		//
		//		This function is used to implement extend() method of a constructor
		//		produced with declare().
		//
		// example:
		//	|	var A = declare(null, {
		//	|		m1: function(){
		//	|			console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("B.m1");
		//	|		}
		//	|	});
		//	|	B.extend({
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	dojo.safeMixin(x, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("X.m1");
		//	|		},
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("X.m2");
		//	|		}
		//	|	});
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m1
		//	|	// B.m1
		//	|	// X.m1

		var name, t;
		// add props adding metadata for incoming functions skipping a constructor
		for(name in source){
			t = source[name];
			if((t !== op[name] || !(name in op)) && name != cname){
				if(opts.call(t) == "[object Function]"){
					// non-trivial function method => attach its name
					t.nom = name;
				}
				target[name] = t;
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				t = source[name];
				if((t !== op[name] || !(name in op)) && name != cname){
					if(opts.call(t) == "[object Function]"){
						// non-trivial function method => attach its name
						  t.nom = name;
					}
					target[name] = t;
				}
			}
		}
		return target;
	}

	function extend(source){
		declare.safeMixin(this.prototype, source);
		return this;
	}

	function createSubclass(mixins){
		return declare([this].concat(mixins));
	}

	// chained constructor compatible with the legacy declare()
	function chainedConstructor(bases, ctorSpecial){
		return function(){
			var a = arguments, args = a, a0 = a[0], f, i, m,
				l = bases.length, preArgs;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial && (a0 && a0.preamble || this.preamble)){
				// full blown ritual
				preArgs = new Array(bases.length);
				// prepare parameters
				preArgs[0] = a;
				for(i = 0;;){
					// process the preamble of the 1st argument
					a0 = a[0];
					if(a0){
						f = a0.preamble;
						if(f){
							a = f.apply(this, a) || a;
						}
					}
					// process the preamble of this class
					f = bases[i].prototype;
					f = f.hasOwnProperty("preamble") && f.preamble;
					if(f){
						a = f.apply(this, a) || a;
					}
					// one peculiarity of the preamble:
					// it is called if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
					if(++i == l){
						break;
					}
					preArgs[i] = a;
				}
			}
			// 2) call all non-trivial constructors using prepared arguments
			for(i = l - 1; i >= 0; --i){
				f = bases[i];
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, preArgs ? preArgs[i] : a);
				}
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, args);
			}
		};
	}


	// chained constructor compatible with the legacy declare()
	function singleConstructor(ctor, ctorSpecial){
		return function(){
			var a = arguments, t = a, a0 = a[0], f;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial){
				// full blown ritual
				if(a0){
					// process the preamble of the 1st argument
					f = a0.preamble;
					if(f){
						t = f.apply(this, t) || t;
					}
				}
				f = this.preamble;
				if(f){
					// process the preamble of this class
					f.apply(this, t);
					// one peculiarity of the preamble:
					// it is called even if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
				}
			}
			// 2) call a constructor
			if(ctor){
				ctor.apply(this, a);
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	// plain vanilla constructor (can use inherited() to call its base constructor)
	function simpleConstructor(bases){
		return function(){
			var a = arguments, i = 0, f, m;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) do not call the preamble
			// 2) call the top constructor (it can use this.inherited())
			for(; f = bases[i]; ++i){ // intentional assignment
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, a);
					break;
				}
			}
			// 3) call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	function chain(name, bases, reversed){
		return function(){
			var b, m, f, i = 0, step = 1;
			if(reversed){
				i = bases.length - 1;
				step = -1;
			}
			for(; b = bases[i]; i += step){ // intentional assignment
				m = b._meta;
				f = (m ? m.hidden : b.prototype)[name];
				if(f){
					f.apply(this, arguments);
				}
			}
		};
	}

	// forceNew(ctor)
	// return a new object that inherits from ctor.prototype but
	// without actually running ctor on the object.
	function forceNew(ctor){
		// create object with correct prototype using a do-nothing
		// constructor
		xtor.prototype = ctor.prototype;
		var t = new xtor;
		xtor.prototype = null;	// clean up
		return t;
	}

	// applyNew(args)
	// just like 'new ctor()' except that the constructor and its arguments come
	// from args, which must be an array or an arguments object
	function applyNew(args){
		// create an object with ctor's prototype but without
		// calling ctor on it.
		var ctor = args.callee, t = forceNew(ctor);
		// execute the real constructor on the new object
		ctor.apply(t, args);
		return t;
	}

	function declare(className, superclass, props){
		// summary:
		//		Create a feature-rich constructor from compact notation.
		// className: String?
		//		The optional name of the constructor (loosely, a "class")
		//		stored in the "declaredClass" property in the created prototype.
		//		It will be used as a global name for a created constructor.
		// superclass: Function|Function[]
		//		May be null, a Function, or an Array of Functions. This argument
		//		specifies a list of bases (the left-most one is the most deepest
		//		base).
		// props: Object
		//		An object whose properties are copied to the created prototype.
		//		Add an instance-initialization function by making it a property
		//		named "constructor".
		// returns: dojo/_base/declare.__DeclareCreatedObject
		//		New constructor function.
		// description:
		//		Create a constructor using a compact notation for inheritance and
		//		prototype extension.
		//
		//		Mixin ancestors provide a type of multiple inheritance.
		//		Prototypes of mixin ancestors are copied to the new class:
		//		changes to mixin prototypes will not affect classes to which
		//		they have been mixed in.
		//
		//		Ancestors can be compound classes created by this version of
		//		declare(). In complex cases all base classes are going to be
		//		linearized according to C3 MRO algorithm
		//		(see http://www.python.org/download/releases/2.3/mro/ for more
		//		details).
		//
		//		"className" is cached in "declaredClass" property of the new class,
		//		if it was supplied. The immediate super class will be cached in
		//		"superclass" property of the new class.
		//
		//		Methods in "props" will be copied and modified: "nom" property
		//		(the declared name of the method) will be added to all copied
		//		functions to help identify them for the internal machinery. Be
		//		very careful, while reusing methods: if you use the same
		//		function under different names, it can produce errors in some
		//		cases.
		//
		//		It is possible to use constructors created "manually" (without
		//		declare()) as bases. They will be called as usual during the
		//		creation of an instance, their methods will be chained, and even
		//		called by "this.inherited()".
		//
		//		Special property "-chains-" governs how to chain methods. It is
		//		a dictionary, which uses method names as keys, and hint strings
		//		as values. If a hint string is "after", this method will be
		//		called after methods of its base classes. If a hint string is
		//		"before", this method will be called before methods of its base
		//		classes.
		//
		//		If "constructor" is not mentioned in "-chains-" property, it will
		//		be chained using the legacy mode: using "after" chaining,
		//		calling preamble() method before each constructor, if available,
		//		and calling postscript() after all constructors were executed.
		//		If the hint is "after", it is chained as a regular method, but
		//		postscript() will be called after the chain of constructors.
		//		"constructor" cannot be chained "before", but it allows
		//		a special hint string: "manual", which means that constructors
		//		are not going to be chained in any way, and programmer will call
		//		them manually using this.inherited(). In the latter case
		//		postscript() will be called after the construction.
		//
		//		All chaining hints are "inherited" from base classes and
		//		potentially can be overridden. Be very careful when overriding
		//		hints! Make sure that all chained methods can work in a proposed
		//		manner of chaining.
		//
		//		Once a method was chained, it is impossible to unchain it. The
		//		only exception is "constructor". You don't need to define a
		//		method in order to supply a chaining hint.
		//
		//		If a method is chained, it cannot use this.inherited() because
		//		all other methods in the hierarchy will be called automatically.
		//
		//		Usually constructors and initializers of any kind are chained
		//		using "after" and destructors of any kind are chained as
		//		"before". Note that chaining assumes that chained methods do not
		//		return any value: any returned value will be discarded.
		//
		// example:
		//	|	declare("my.classes.bar", my.classes.foo, {
		//	|		// properties to be added to the class prototype
		//	|		someValue: 2,
		//	|		// initialization function
		//	|		constructor: function(){
		//	|			this.myComplicatedObject = new ReallyComplicatedObject();
		//	|		},
		//	|		// other functions
		//	|		someMethod: function(){
		//	|			doStuff();
		//	|		}
		//	|	});
		//
		// example:
		//	|	var MyBase = declare(null, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass1 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass2 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyDiamond = declare([MyClass1, MyClass2], {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//
		// example:
		//	|	var F = function(){ console.log("raw constructor"); };
		//	|	F.prototype.method = function(){
		//	|		console.log("raw method");
		//	|	};
		//	|	var A = declare(F, {
		//	|		constructor: function(){
		//	|			console.log("A.constructor");
		//	|		},
		//	|		method: function(){
		//	|			console.log("before calling F.method...");
		//	|			this.inherited(arguments);
		//	|			console.log("...back in A");
		//	|		}
		//	|	});
		//	|	new A().method();
		//	|	// will print:
		//	|	// raw constructor
		//	|	// A.constructor
		//	|	// before calling F.method...
		//	|	// raw method
		//	|	// ...back in A
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			destroy: "before"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			console.log("B.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			console.log("B.destroy");
		//	|		}
		//	|	});
		//	|	var C = declare(B, {
		//	|		constructor: function(){
		//	|			console.log("C.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			console.log("C.destroy");
		//	|		}
		//	|	});
		//	|	new C().destroy();
		//	|	// prints:
		//	|	// B.constructor
		//	|	// C.constructor
		//	|	// C.destroy
		//	|	// B.destroy
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			constructor: "manual"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			// ...
		//	|			// call the base constructor with new parameters
		//	|			this.inherited(arguments, [1, 2, 3]);
		//	|			// ...
		//	|		}
		//	|	});
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			m1: "before"
		//	|		},
		//	|		m1: function(){
		//	|			console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		"-chains-": {
		//	|			m2: "after"
		//	|		},
		//	|		m1: function(){
		//	|			console.log("B.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	x.m1();
		//	|	// prints:
		//	|	// B.m1
		//	|	// A.m1
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m2
		//	|	// B.m2

		// crack parameters
		if(typeof className != "string"){
			props = superclass;
			superclass = className;
			className = "";
		}
		props = props || {};

		var proto, i, t, ctor, name, bases, chains, mixins = 1, parents = superclass;

		// build a prototype
		if(opts.call(superclass) == "[object Array]"){
			// C3 MRO
			bases = c3mro(superclass, className);
			t = bases[0];
			mixins = bases.length - t;
			superclass = bases[mixins];
		}else{
			bases = [0];
			if(superclass){
				if(opts.call(superclass) == "[object Function]"){
					t = superclass._meta;
					bases = bases.concat(t ? t.bases : superclass);
				}else{
					err("base class is not a callable constructor.", className);
				}
			}else if(superclass !== null){
				err("unknown base class. Did you use dojo.require to pull it in?", className);
			}
		}
		if(superclass){
			for(i = mixins - 1;; --i){
				proto = forceNew(superclass);
				if(!i){
					// stop if nothing to add (the last base)
					break;
				}
				// mix in properties
				t = bases[i];
				(t._meta ? mixOwn : mix)(proto, t.prototype);
				// chain in new constructor
				ctor = new Function;
				ctor.superclass = superclass;
				ctor.prototype = proto;
				superclass = proto.constructor = ctor;
			}
		}else{
			proto = {};
		}
		// add all properties
		declare.safeMixin(proto, props);
		// add constructor
		t = props.constructor;
		if(t !== op.constructor){
			t.nom = cname;
			proto.constructor = t;
		}

		// collect chains and flags
		for(i = mixins - 1; i; --i){ // intentional assignment
			t = bases[i]._meta;
			if(t && t.chains){
				chains = mix(chains || {}, t.chains);
			}
		}
		if(proto["-chains-"]){
			chains = mix(chains || {}, proto["-chains-"]);
		}

		// build ctor
		t = !chains || !chains.hasOwnProperty(cname);
		bases[0] = ctor = (chains && chains.constructor === "manual") ? simpleConstructor(bases) :
			(bases.length == 1 ? singleConstructor(props.constructor, t) : chainedConstructor(bases, t));

		// add meta information to the constructor
		ctor._meta  = {bases: bases, hidden: props, chains: chains,
			parents: parents, ctor: props.constructor};
		ctor.superclass = superclass && superclass.prototype;
		ctor.extend = extend;
		ctor.createSubclass = createSubclass;
		ctor.prototype = proto;
		proto.constructor = ctor;

		// add "standard" methods to the prototype
		proto.getInherited = getInherited;
		proto.isInstanceOf = isInstanceOf;
		proto.inherited    = inheritedImpl;
		proto.__inherited  = inherited;

		// add name if specified
		if(className){
			proto.declaredClass = className;
			lang.setObject(className, ctor);
		}

		// build chains and add them to the prototype
		if(chains){
			for(name in chains){
				if(proto[name] && typeof chains[name] == "string" && name != cname){
					t = proto[name] = chain(name, bases, chains[name] === "after");
					t.nom = name;
				}
			}
		}
		// chained methods do not return values
		// no need to chain "invisible" functions

		return ctor;	// Function
	}

	/*=====
	declare.__DeclareCreatedObject = {
		// summary:
		//		dojo/_base/declare() returns a constructor `C`.   `new C()` returns an Object with the following
		//		methods, in addition to the methods and properties specified via the arguments passed to declare().

		inherited: function(name, args, newArgs){
			// summary:
			//		Calls a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// newArgs: Object?
			//		If "true", the found function will be returned without
			//		executing it.
			//		If Array, it will be used to call a super method. Otherwise
			//		"args" will be used.
			// returns:
			//		Whatever is returned by a super method, or a super method itself,
			//		if "true" was specified as newArgs.
			// description:
			//		This method is used inside method of classes produced with
			//		declare() to call a super method (next in the chain). It is
			//		used for manually controlled chaining. Consider using the regular
			//		chaining, because it is faster. Use "this.inherited()" only in
			//		complex cases.
			//
			//		This method cannot me called from automatically chained
			//		constructors including the case of a special (legacy)
			//		constructor chaining. It cannot be called from chained methods.
			//
			//		If "this.inherited()" cannot find the next-in-chain method, it
			//		does nothing and returns "undefined". The last method in chain
			//		can be a default method implemented in Object, which will be
			//		called last.
			//
			//		If "name" is specified, it is assumed that the method that
			//		received "args" is the parent method for this call. It is looked
			//		up in the chain list and if it is found the next-in-chain method
			//		is called. If it is not found, the first-in-chain method is
			//		called.
			//
			//		If "name" is not specified, it will be derived from the calling
			//		method (using a methoid property "nom").
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method1: function(a, b, c){
			//	|			this.inherited(arguments);
			//	|		},
			//	|		method2: function(a, b){
			//	|			return this.inherited(arguments, [a + b]);
			//	|		}
			//	|	});
			//	|	// next method is not in the chain list because it is added
			//	|	// manually after the class was created.
			//	|	B.prototype.method3 = function(){
			//	|		console.log("This is a dynamically-added method.");
			//	|		this.inherited("method3", arguments);
			//	|	};
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.inherited(arguments, true);
			//	|			// ...
			//	|			if(!super){
			//	|				console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		getInherited: function(name, args){
			// summary:
			//		Returns a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// returns:
			//		Returns a super method (Function) or "undefined".
			// description:
			//		This method is a convenience method for "this.inherited()".
			//		It uses the same algorithm but instead of executing a super
			//		method, it returns it, or "undefined" if not found.
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.getInherited(arguments);
			//	|			// ...
			//	|			if(!super){
			//	|				console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		isInstanceOf: function(cls){
			// summary:
			//		Checks the inheritance chain to see if it is inherited from this
			//		class.
			// cls: Function
			//		Class constructor.
			// returns:
			//		"true", if this object is inherited from this class, "false"
			//		otherwise.
			// description:
			//		This method is used with instances of classes produced with
			//		declare() to determine of they support a certain interface or
			//		not. It models "instanceof" operator.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var B = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var C = declare([A, B], {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var D = declare(A, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|
			//	|	var a = new A(), b = new B(), c = new C(), d = new D();
			//	|
			//	|	console.log(a.isInstanceOf(A)); // true
			//	|	console.log(b.isInstanceOf(A)); // false
			//	|	console.log(c.isInstanceOf(A)); // true
			//	|	console.log(d.isInstanceOf(A)); // true
			//	|
			//	|	console.log(a.isInstanceOf(B)); // false
			//	|	console.log(b.isInstanceOf(B)); // true
			//	|	console.log(c.isInstanceOf(B)); // true
			//	|	console.log(d.isInstanceOf(B)); // false
			//	|
			//	|	console.log(a.isInstanceOf(C)); // false
			//	|	console.log(b.isInstanceOf(C)); // false
			//	|	console.log(c.isInstanceOf(C)); // true
			//	|	console.log(d.isInstanceOf(C)); // false
			//	|
			//	|	console.log(a.isInstanceOf(D)); // false
			//	|	console.log(b.isInstanceOf(D)); // false
			//	|	console.log(c.isInstanceOf(D)); // false
			//	|	console.log(d.isInstanceOf(D)); // true
			return	{};	// Object
		},

		extend: function(source){
			// summary:
			//		Adds all properties and methods of source to constructor's
			//		prototype, making them available to all instances created with
			//		constructor. This method is specific to constructors created with
			//		declare().
			// source: Object
			//		Source object which properties are going to be copied to the
			//		constructor's prototype.
			// description:
			//		Adds source properties to the constructor's prototype. It can
			//		override existing properties.
			//
			//		This method is similar to dojo.extend function, but it is specific
			//		to constructors produced by declare(). It is implemented
			//		using dojo.safeMixin, and it skips a constructor property,
			//		and properly decorates copied functions.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "Popokatepetl"
			//	|	});
			//	|	A.extend({
			//	|		m1: function(){},
			//	|		m2: function(){},
			//	|		f1: true,
			//	|		d1: 42
			//	|	});
		}
	};
	=====*/

	// For back-compat, remove for 2.0
	dojo.safeMixin = declare.safeMixin = safeMixin;
	dojo.declare = declare;

	return declare;
});
