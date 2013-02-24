define([
	"doh/main",
	"dojo/Deferred",
	"dojo/promise/first"
], function(doh, Deferred, first){
	var tests = {
		"first() with array argument": function(t){
			var obj = {};
			var received;
			first([this.deferred, new Deferred().resolve(obj), {}]).then(function(result){ received = result; });
			this.deferred.resolve({});
			t.t(received === obj);
		},

		"with object argument": function(t){
			var obj = {};
			var received;
			first({ a: this.deferred, b: new Deferred().resolve(obj), c: {} }).then(function(result){ received = result; });
			this.deferred.resolve({});
			t.t(received === obj);
		},

		"first() without arguments": function(t){
			var received;
			first().then(function(){ received = arguments; });
			t.is(received.length, 1);
			t.t(typeof received[0] === "undefined");
		},

		"first() with single non-object argument": function(t){
			var received;
			first(null).then(function(){ received = arguments; });
			t.is(received.length, 1);
			t.t(typeof received[0] === "undefined");
		},

		"first() with empty array": function(t){
			var received = false;
			first([]).then(function(result){ received = result; });
			t.t(typeof received === "undefined");
		},

		"first() with empty object": function(t){
			var received = false;
			first({}).then(function(result){ received = result; });
			t.t(typeof received === "undefined");
		},

		"first() with one rejected promise": function(t){
			var obj = {};
			var received;
			first([this.deferred, new Deferred().reject(obj), {}]).then(null, function(result){ received = result; });
			t.t(received === obj);
		},

		"first() with one promise rejected later": function(t){
			var obj = {};
			var received;
			first([this.deferred, new Deferred(), new Deferred()]).then(null, function(result){ received = result; });
			this.deferred.reject(obj);
			t.t(received === obj);
		},

		"first() with multiple promises rejected later": function(t){
			var obj = {};
			var deferred2 = new Deferred();
			var received;
			first([this.deferred, deferred2, new Deferred()]).then(null, function(result){ received = result; });
			this.deferred.reject(obj);
			deferred2.reject({});
			t.t(received === obj);
		},

		"first() cancel only affects returned promise, not those we're waiting for": function(t){
			var obj = {};
			var canceled = false;
			var deferred2 = new Deferred(function(){ canceled = true; });
			var received;
			var promise = first([this.deferred, deferred2, new Deferred()]).then(null, function(result){ received = result; });
			promise.cancel(obj);
			t.t(received === obj);
			t.f(canceled);
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

	doh.register("tests.promise.first", wrapped);
});
