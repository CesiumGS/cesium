define([
	"doh/main",
	"dojo/Deferred",
	"dojo/promise/Promise",
	"dojo/when"
], function(doh, Deferred, Promise, when){
	var tests = {
		"when() returns the same promise without callbacks": function(t){
			var obj = {};
			var promise1 = when(obj);
			t.t(promise1 instanceof Promise);
			var promise2 = when(this.deferred.promise);
			t.t(promise2 instanceof Promise);
			t.t(this.deferred.promise === promise2);
		},

		"when() with a result value": function(t){
			var obj = {};
			var received;
			when(obj, function(result){ received = result; });
			t.t(received === obj);
		},

		"when() with a result value, returns result of callback": function(t){
			var obj1 = {}, obj2 = {};
			var received;
			var returned = when(obj1, function(result){
				received = result;
				return obj2;
			});
			t.t(received === obj1);
			t.t(returned === obj2);
		},

		"when() with a promise that gets resolved": function(t){
			var obj = {};
			var received;
			when(this.deferred.promise, function(result){ received = result; });
			this.deferred.resolve(obj);
			t.t(received === obj);
		},

		"when() with a promise that gets rejected": function(t){
			var obj = {};
			var received;
			when(this.deferred.promise, null, function(result){ received = result; });
			this.deferred.reject(obj);
			t.t(received === obj);
		},

		"when() with a promise that gets progress": function(t){
			var obj = {};
			var received;
			when(this.deferred.promise, null, null, function(result){ received = result; });
			this.deferred.progress(obj);
			t.t(received === obj);
		},

		"when() with chaining of the result": function(t){
			function square(n){ return n * n; }

			var received;
			when(2).then(square).then(square).then(function(n){ received = n; });
			t.is(received, 16);
		},

		"when() converts foreign promises": function(t){
			var _callback;
			var foreign = { then: function(cb){ _callback = cb; } };
			var promise = when(foreign);

			var obj = {};
			var received;
			promise.then(function(result){ received = result; });
			_callback(obj);
			t.t(promise instanceof Promise);
			t.t(received === obj);
		}
	};

	var wrapped = [];
	for(var name in tests){
		wrapped.push({
			name: name,
			setUp: setUp,
			runTest: tests[name]
		});
	}

	function setUp(){
		this.deferred = new Deferred;
	}

	doh.register("tests.when", wrapped);
});
