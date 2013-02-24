define([
	"doh/main",
	"dojo/Deferred",
	"dojo/promise/all"
], function(doh, Deferred, all){
	var tests = {
		"all() with array argument": function(t){
			var obj1 = {}, obj2 = {}, obj3 = {};
			var received;
			all([this.deferred, new Deferred().resolve(obj2), obj3]).then(function(result){ received = result; });
			this.deferred.resolve(obj1);
			t.t(received[0] === obj1);
			t.t(received[1] === obj2);
			t.t(received[2] === obj3);
		},

		"all() with object argument": function(t){
			var obj1 = {}, obj2 = {}, obj3 = {};
			var received;
			all({ a: this.deferred, b: new Deferred().resolve(obj2), c: obj3 }).then(function(result){ received = result; });
			this.deferred.resolve(obj1);
			t.t(received.a === obj1);
			t.t(received.b === obj2);
			t.t(received.c === obj3);
		},

		"all() without arguments": function(t){
			var received;
			all().then(function(){ received = arguments; });
			t.is(received.length, 1);
			t.t(typeof received[0] === "undefined");
		},

		"all() with single non-object argument": function(t){
			var received;
			all(null).then(function(){ received = arguments; });
			t.is(received.length, 1);
			t.t(typeof received[0] === "undefined");
		},

		"all() with empty array": function(t){
			var received;
			all([]).then(function(result){ received = result; });
			t.is(received, []);
		},

		"all() with empty object": function(t){
			var received;
			all({}).then(function(result){ received = result; });
			t.is(received, {});
		},

		"all() with one rejected promise": function(t){
			var obj = {};
			var received;
			all([this.deferred, new Deferred().reject(obj), {}]).then(null, function(result){ received = result; });
			t.t(received === obj);
		},

		"all() with one promise rejected later": function(t){
			var obj = {};
			var received;
			all([this.deferred, new Deferred(), new Deferred()]).then(null, function(result){ received = result; });
			this.deferred.reject(obj);
			t.t(received === obj);
		},

		"all() with multiple promises rejected later": function(t){
			var obj = {};
			var deferred2 = new Deferred();
			var received;
			all([this.deferred, deferred2, new Deferred()]).then(null, function(result){ received = result; });
			this.deferred.reject(obj);
			deferred2.reject({});
			t.t(received === obj);
		},

		"all() cancel only affects returned promise, not those we're waiting for": function(t){
			var obj = {};
			var canceled = false;
			var deferred2 = new Deferred(function(){ canceled = true; });
			var received;
			var promise = all([this.deferred, deferred2, new Deferred()]).then(null, function(result){ received = result; });
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

	doh.register("tests.promise.all", wrapped);
});
