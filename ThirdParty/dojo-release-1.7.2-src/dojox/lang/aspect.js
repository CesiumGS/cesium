dojo.provide("dojox.lang.aspect");

(function(){
	var d = dojo, aop = dojox.lang.aspect, ap = Array.prototype,
		contextStack = [], context;
		
	// this class implements a topic-based double-linked list
	var Advice = function(){
		this.next_before = this.prev_before =
		this.next_around = this.prev_around =
		this.next_afterReturning = this.prev_afterReturning =
		this.next_afterThrowing = this.prev_afterThrowing =
			this;
		this.counter = 0;
	};
	d.extend(Advice, {
		add: function(advice){
			var dyn = d.isFunction(advice),
				node = {advice: advice, dynamic: dyn};
			this._add(node, "before", "", dyn, advice);
			this._add(node, "around", "", dyn, advice);
			this._add(node, "after", "Returning", dyn, advice);
			this._add(node, "after", "Throwing", dyn, advice);
			++this.counter;
			return node;
		},
		_add: function(node, topic, subtopic, dyn, advice){
			var full = topic + subtopic;
			if(dyn || advice[topic] || (subtopic && advice[full])){
				var next = "next_" + full, prev = "prev_" + full;
				(node[prev] = this[prev])[next] = node;
				(node[next] = this)[prev] = node;
			}
		},
		remove: function(node){
			this._remove(node, "before");
			this._remove(node, "around");
			this._remove(node, "afterReturning");
			this._remove(node, "afterThrowing");
			--this.counter;
		},
		_remove: function(node, topic){
			var next = "next_" + topic, prev = "prev_" + topic;
			if(node[next]){
				node[next][prev] = node[prev];
				node[prev][next] = node[next];
			}
		},
		isEmpty: function(){
			return !this.counter;
		}
	});

	var getDispatcher = function(){
	
		return function(){
			
			var self = arguments.callee,	// the join point
				advices = self.advices,		// list of advices for this joinpoint
				ret, i, a, e, t;

			// push context
			if(context){ contextStack.push(context); }
			context = {
				instance: this,					// object instance
				joinPoint: self,				// join point
				depth: contextStack.length,		// current level of depth starting from 0
				around: advices.prev_around,	// pointer to the current around advice
				dynAdvices: [],					// array of dynamic advices if any
				dynIndex: 0						// index of a dynamic advice
			};

			try{
				// process before events
				for(i = advices.prev_before; i != advices; i = i.prev_before){
					if(i.dynamic){
						// instantiate a dynamic advice
						context.dynAdvices.push(a = new i.advice(context));
						if(t = a.before){ // intentional assignment
							t.apply(a, arguments);
						}
					}else{
						t = i.advice;
						t.before.apply(t, arguments);
					}
				}

				// process around and after events
				try{
					// call the around advice or the original method
					ret = (advices.prev_around == advices ? self.target : aop.proceed).apply(this, arguments);
				}catch(e){
					// process after throwing and after events
					context.dynIndex = context.dynAdvices.length;
					for(i = advices.next_afterThrowing; i != advices; i = i.next_afterThrowing){
						a = i.dynamic ? context.dynAdvices[--context.dynIndex] : i.advice;
						if(t = a.afterThrowing){ // intentional assignment
							t.call(a, e);
						}
						if(t = a.after){ // intentional assignment
							t.call(a);
						}
					}
					// continue the exception processing
					throw e;
				}
				// process after returning and after events
				context.dynIndex = context.dynAdvices.length;
				for(i = advices.next_afterReturning; i != advices; i = i.next_afterReturning){
					a = i.dynamic ? context.dynAdvices[--context.dynIndex] : i.advice;
					if(t = a.afterReturning){ // intentional assignment
						t.call(a, ret);
					}
					if(t = a.after){ // intentional assignment
						t.call(a);
					}
				}
				// process dojo.connect() listeners
				var ls = self._listeners;
				for(i in ls){
					if(!(i in ap)){
						ls[i].apply(this, arguments);
					}
				}
			}finally{
				// destroy dynamic advices
				for(i = 0; i < context.dynAdvices.length; ++i){
					a = context.dynAdvices[i];
					if(a.destroy){
						a.destroy();
					}
				}
				// pop context
				context = contextStack.length ? contextStack.pop() : null;
			}
			
			return ret;
		};
	};

	aop.advise = function(/*Object*/ obj,
						/*String|RegExp|Array*/ method,
						/*Object|Function|Array*/ advice
						){
		// summary:
		//		Attach AOP-style advices to a method.
		//
		// description:
		//		Attaches AOP-style advices to a method. Can attach several
		//		advices at once and operate on several methods of an object.
		//		The latter is achieved when a RegExp is specified as
		//		a method name, or an array of strings and regular expressions
		//		is used. In this case all functional methods that
		//		satisfy the RegExp condition are processed. This function
		//		returns a handle, which can be used to unadvise, or null,
		//		if advising has failed.
		//
		//		This function is a convenience wrapper for
		//		dojox.lang.aspect.adviseRaw().
		//
		// obj:
		//		A source object for the advised function. Cannot be a DOM node.
		//		If this object is a constructor, its prototype is advised.
		//
		// method:
		//		A string name of the function in obj. In case of RegExp all
		//		methods of obj matching the regular expression are advised.
		//
		// advice:
		//		An object, which defines advises, or a function, which
		//		returns such object, or an array of previous items.
		//		The advice object can define following member functions:
		//		before, around, afterReturning, afterThrowing, after.
		//		If the function is supplied, it is called with a context
		//		object once per call to create a temporary advice object, which
		//		is destroyed after the processing. The temporary advice object
		//		can implement a destroy() method, if it wants to be called when
		//		not needed.
		
		if(typeof obj != "object"){
			obj = obj.prototype;
		}

		var methods = [];
		if(!(method instanceof Array)){
			method = [method];
		}
		
		// identify advised methods
		for(var j = 0; j < method.length; ++j){
			var t = method[j];
			if(t instanceof RegExp){
				for(var i in obj){
					if(d.isFunction(obj[i]) && t.test(i)){
						methods.push(i);
					}
				}
			}else{
				if(d.isFunction(obj[t])){
					methods.push(t);
				}
			}
		}

		if(!d.isArray(advice)){ advice = [advice]; }

		return aop.adviseRaw(obj, methods, advice);	// Object
	};
	
	aop.adviseRaw = function(/*Object*/ obj,
						/*Array*/ methods,
						/*Array*/ advices
						){
		// summary:
		//		Attach AOP-style advices to methods.
		//
		// description:
		//		Attaches AOP-style advices to object's methods. Can attach several
		//		advices at once and operate on several methods of the object.
		//		The latter is achieved when a RegExp is specified as
		//		a method name. In this case all functional methods that
		//		satisfy the RegExp condition are processed. This function
		//		returns a handle, which can be used to unadvise, or null,
		//		if advising has failed.
		//
		// obj:
		//		A source object for the advised function.
		//		Cannot be a DOM node.
		//
		// methods:
		//		An array of method names (strings) to be advised.
		//
		// advices:
		//		An array of advices represented by objects or functions that
		//		return such objects on demand during the event processing.
		//		The advice object can define following member functions:
		//		before, around, afterReturning, afterThrowing, after.
		//		If the function is supplied, it is called with a context
		//		object once per call to create a temporary advice object, which
		//		is destroyed after the processing. The temporary advice object
		//		can implement a destroy() method, if it wants to be called when
		//		not needed.

		if(!methods.length || !advices.length){ return null; }
		
		// attach advices
		var m = {}, al = advices.length;
		for(var i = methods.length - 1; i >= 0; --i){
			var name = methods[i], o = obj[name], ao = new Array(al), t = o.advices;
			// create a stub, if needed
			if(!t){
				var x = obj[name] = getDispatcher();
				x.target = o.target || o;
				x.targetName = name;
				x._listeners = o._listeners || [];
				x.advices = new Advice;
				t = x.advices;
			}
			// attach advices
			for(var j = 0; j < al; ++j){
				ao[j] = t.add(advices[j]);
			}
			m[name] = ao;
		}
		
		return [obj, m];	// Object
	};

	aop.unadvise = function(/*Object*/ handle){
		// summary:
		//		Detach previously attached AOP-style advices.
		//
		// handle:
		//		The object returned by dojox.lang.aspect.advise().
		
		if(!handle){ return; }
		var obj = handle[0], methods = handle[1];
		for(var name in methods){
			var o = obj[name], t = o.advices, ao = methods[name];
			for(var i = ao.length - 1; i >= 0; --i){
				t.remove(ao[i]);
			}
			if(t.isEmpty()){
				// check if we can remove all stubs
				var empty = true, ls = o._listeners;
				if(ls.length){
					for(i in ls){
						if(!(i in ap)){
							empty = false;
							break;
						}
					}
				}
				if(empty){
					// revert to the original method
					obj[name] = o.target;
				}else{
					// replace with the dojo.connect() stub
					var x = obj[name] = d._listener.getDispatcher();
					x.target = o.target;
					x._listeners = ls;
				}
			}
		}
	};
	
	aop.getContext = function(){
		// summary:
		//		Returns the context information for the advice in effect.
		
		return context;	// Object
	};
	
	aop.getContextStack = function(){
		// summary:
		//		Returns the context stack, which reflects executing advices
		//		up to this point. The array is ordered from oldest to newest.
		//		In order to get the active context use dojox.lang.aspect.getContext().
		
		return contextStack;	// Array
	};
	
	aop.proceed = function(){
		// summary:
		//		Call the original function (or the next level around advice) in an around advice code.
		//
		// description:
		//		Calls the original function (or the next level around advice).
		//		Accepts and passes on any number of arguments, and returns a value.
		//		This function is valid only in the content of around calls.
		
		var joinPoint = context.joinPoint, advices = joinPoint.advices;
		for(var c = context.around; c != advices; c = context.around){
			context.around = c.prev_around;	// advance the pointer
			if(c.dynamic){
				var a = context.dynAdvices[context.dynIndex++], t = a.around;
				if(t){
					return t.apply(a, arguments);
				}
			}else{
				return c.advice.around.apply(c.advice, arguments);
			}
		}
		return joinPoint.target.apply(context.instance, arguments);
	};
})();

/*
Aspect = {
	before: function(arguments){...},
	around: function(arguments){...returns value...},
	afterReturning: function(ret){...},
	afterThrowing: function(excp){...},
	after: function(){...}
};

Context = {
	instance:  ..., // the instance we operate on
	joinPoint: ...,	// Object (see below)
	depth:     ...	// current depth of the context stack
};

JoinPoint = {
	target:     ...,	// the original function being wrapped
	targetName: ...		// name of the method
};
*/
