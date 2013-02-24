dojo.provide("dojox.lang.tests.declare-old");

// the old file copied and modified here for testing

// this file courtesy of the TurboAjax Group, licensed under a Dojo CLA

dojox.lang.tests.declareOld = function(/*String*/ className, /*Function|Function[]*/ superclass, /*Object*/ props){
	// summary:
	//		Create a feature-rich constructor from compact notation
	//
	// description:
	//		Create a feature-rich constructor from compact notation
	//
	// className:
	//		The name of the constructor (loosely, a "class")
	//		stored in the "declaredClass" property in the created prototype
	// superclass:
	//		May be null, a Function, or an Array of Functions. If an array,
	//		the first element is used as the prototypical ancestor and
	//		any following Functions become mixin ancestors.
	// props:
	//		An object whose properties are copied to the
	//		created prototype.
	//		Add an instance-initialization function by making it a property
	//		named "constructor".
	// description:
	//		Create a constructor using a compact notation for inheritance and
	//		prototype extension.
	//
	//		All superclasses (including mixins) must be Functions (not simple Objects).
	//
	//		Mixin ancestors provide a type of multiple inheritance. Prototypes of mixin
	//		ancestors are copied to the new class: changes to mixin prototypes will
	//		not affect classes to which they have been mixed in.
	//
	//		"className" is cached in "declaredClass" property of the new class.
	//
	// example:
	//		Declare a class with no ancestors.
	//	|	dojo.declare("my.ClassyThing", null, {
	//	|		aProperty:"string",
	//	|		constructor: function(args){
	//	|			dojo.mixin(this, args);
	//	|		}
	//	|	});
	//
	// example:
	//		Declare a class inheriting from my.classed.Foo
	//	|	dojo.declare("my.classes.Bar", my.classes.Foo, {
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
	//	|	);
	//
	// example:
	//		Declare a class inherting from two mixins, handling multiple constructor args
	//	|	dojo.declare("my.ComplexMix", [my.BaseClass, my.MixedClass],{
	//	|		constructor: function(a, b){
	//	|			// someone called `new my.ComplexMix("something", "maybesomething");`
	//	|		}
	//	|	});

	// process superclass argument
	var dd = arguments.callee, mixins;
	if(dojo.isArray(superclass)){
		mixins = superclass;
		superclass = mixins.shift();
	}
	// construct intermediate classes for mixins
	if(mixins){
		dojo.forEach(mixins, function(m, i){
			if(!m){ throw(className + ": mixin #" + i + " is null"); } // It's likely a required module is not loaded
			superclass = dd._delegate(superclass, m);
		});
	}
	// create constructor
	var ctor = dd._delegate(superclass);
	// extend with "props"
	props = props || {};
	ctor.extend(props);
	// more prototype decoration
	dojo.extend(ctor, { declaredClass: className, _constructor: props.constructor/*, preamble: null*/ });
	// special help for IE
	ctor.prototype.constructor = ctor;
	// create named reference
	return dojo.setObject(className, ctor); // Function
};

dojo.mixin(dojox.lang.tests.declareOld, {
	_delegate: function(base, mixin){
		var bp = (base || 0).prototype, mp = (mixin || 0).prototype, dd = dojox.lang.tests.declareOld;
		// fresh constructor, fresh prototype
		var ctor = dd._makeCtor();
		// cache ancestry
		dojo.mixin(ctor, { superclass: bp, mixin: mp, extend: dd._extend });
		// chain prototypes
		if(base){ ctor.prototype = dojo._delegate(bp); }
		// add mixin and core
		dojo.extend(ctor, dd._core, mp || 0, { _constructor: null, preamble: null });
		// special help for IE
		ctor.prototype.constructor = ctor;
		// name this class for debugging
		ctor.prototype.declaredClass = (bp || 0).declaredClass + '_' + (mp || 0).declaredClass;
		return ctor;
	},
	_extend: function(props){
		var i, fn;
		for(i in props){ if(dojo.isFunction(fn=props[i]) && !0[i]){fn.nom=i;fn.ctor=this;} }
		dojo.extend(this, props);
	},
	_makeCtor: function(){
		// we have to make a function, but don't want to close over anything
		return function(){ this._construct(arguments); };
	},
	_core: {
		_construct: function(args){
			var c = args.callee, s = c.superclass, ct = s && s.constructor,
				m = c.mixin, mct = m && m.constructor, a = args, ii, fn;
			// side-effect of = used on purpose here, lint may complain, don't try this at home
			if(a[0]){
				// FIXME: preambles for each mixin should be allowed
				// FIXME:
				//		should we allow the preamble here NOT to modify the
				//		default args, but instead to act on each mixin
				//		independently of the class instance being constructed
				//		(for impedence matching)?

				// allow any first argument w/ a "preamble" property to act as a
				// class preamble (not exclusive of the prototype preamble)
				if(/*dojo.isFunction*/((fn = a[0].preamble))){
					a = fn.apply(this, a) || a;
				}
			}
			// prototype preamble
			if((fn = c.prototype.preamble)){ a = fn.apply(this, a) || a; }
			// FIXME:
			//		need to provide an optional prototype-settable
			//		"_explicitSuper" property which disables this
			// initialize superclass
			if(ct && ct.apply){ ct.apply(this, a); }
			// initialize mixin
			if(mct && mct.apply){ mct.apply(this, a); }
			// initialize self
			if((ii = c.prototype._constructor)){ ii.apply(this, args); }
			// post construction
			if(this.constructor.prototype == c.prototype && (ct = this.postscript)){ ct.apply(this, args); }
		},
		_findMixin: function(mixin){
			var c = this.constructor, p, m;
			while(c){
				p = c.superclass;
				m = c.mixin;
				if(m == mixin || (m instanceof mixin.constructor)){ return p; }
				if(m && m._findMixin && (m = m._findMixin(mixin))){ return m; }
				c = p && p.constructor;
			}
		},
		_findMethod: function(name, method, ptype, has){
			// consciously trading readability for bytes and speed in this low-level method
			var p=ptype, c, m, f;
			do{
				c = p.constructor;
				m = c.mixin;
				// find method by name in our mixin ancestor
				if(m && (m = this._findMethod(name, method, m, has))){ return m; }
				// if we found a named method that either exactly-is or exactly-is-not 'method'
				if((f = p[name]) && (has == (f == method))){ return p; }
				// ascend chain
				p = c.superclass;
			}while(p);
			// if we couldn't find an ancestor in our primary chain, try a mixin chain
			return !has && (p = this._findMixin(ptype)) && this._findMethod(name, method, p, has);
		},
		inherited: function(name, args, newArgs){
			// summary:
			//		Call an inherited member function of this declared class.
			//
			// description:
			//		Call an inherited member function of this declared class, allowing advanced
			//		manipulation of passed arguments to inherited functions.
			//		Explicitly cannot handle the case of intending to pass no `newArgs`, though
			//		hoping the use in conjuction with `dojo.hitch`. Calling an inherited
			//		function directly via hitch() is not supported.
			//
			// name: String?
			//		The name of the method to call. If omitted, the special `arguments` passed is
			//		used to determine the inherited function. All subsequent positional arguments
			//		are shifted left if `name` has been omitted. (eg: args becomes name)
			//
			// args: Object
			//		An `arguments` object to pass along to the inherited function. Can be in the
			//		`name` position if `name` has been omitted. This is a literal JavaScript `arguments`
			//		object, and must be passed.
			//
			// newArgs: Array?
			//		An Array of argument values to pass to the inherited function. If omitted,
			//		the original arguments are passed (determined from the `args` variable)
			//
			// example:
			//		Simply call an inherited function with the same signature.
			//	|	this.inherited(arguments);
			// example:
			//		Call an inherited method, replacing the arguments passed with "replacement" and "args"
			//	|	this.inherited(arguments, [replacement, args]);
			// example:
			//		Call an inherited method, passing an explicit name.
			//	|	this.inherited("method", arguments);
			// example:
			//		Call an inherited method by name, replacing the arguments:
			//	|	this.inherited("method", arguments, [replacement, args]);

			var a = arguments;
			// some magic crap that alters `arguments` to shift in the case of missing `name`
			if(typeof a[0] != "string"){ // inline'd type check
				newArgs = args;
				args = name;
				name = args.callee.nom;
			}
			a = newArgs || args; // WARNING: hitch()ed functions may pass a newArgs you aren't expecting.
			var c = args.callee, p = this.constructor.prototype, fn, mp;
			// if not an instance override
			if(this[name] != c || p[name] == c){
				// start from memoized prototype, or
				// find a prototype that has property 'name' == 'c'
				mp = (c.ctor || 0).superclass || this._findMethod(name, c, p, true);
				if(!mp){ throw(this.declaredClass + ': inherited method "' + name + '" mismatch'); }
				// find a prototype that has property 'name' != 'c'
				p = this._findMethod(name, c, mp, false);
			}
			// we expect 'name' to be in prototype 'p'
			fn = p && p[name];
			if(!fn){ throw( mp.declaredClass + ': inherited method "' + name + '" not found'); }
			// if the function exists, invoke it in our scope
			return fn.apply(this, a);
		}
	}
});
