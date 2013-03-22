define([
	"doh/main",
	"dojo/Deferred",
	"dojo/promise/Promise",
	"dojo/errors/CancelError"
], function(doh, Deferred, Promise, CancelError){
	var tests = {
		"deferred receives result after resolving": function(t){
			var obj = {};
			var received;
			this.deferred.then(function(result){ received = result; });
			this.deferred.resolve(obj);
			t.t(received === obj);
		},

		"promise receives result after resolving": function(t){
			var obj = {};
			var received;
			this.deferred.promise.then(function(result){ received = obj; });
			this.deferred.resolve(obj);
			t.t(received === obj);
		},

		"resolve() returns promise": function(t){
			var obj = {};
			var returnedPromise = this.deferred.resolve(obj);
			t.t(returnedPromise instanceof Promise);
			t.t(returnedPromise === this.deferred.promise);
		},

		"isResolved() returns true after resolving": function(t){
			t.f(this.deferred.isResolved());
			this.deferred.resolve();
			t.t(this.deferred.isResolved());
		},

		"isFulfilled() returns true after resolving": function(t){
			t.f(this.deferred.isFulfilled());
			this.deferred.resolve();
			t.t(this.deferred.isFulfilled());
		},

		"resolve() is ignored after having been fulfilled": function(t){
			this.deferred.resolve();
			this.deferred.resolve();
		},

		"resolve() throws error after having been fulfilled and strict": function(t){
			this.deferred.resolve();
			t.e(Error, this.deferred, "resolve", [{}, true]);
		},

		"resolve() results are cached": function(t){
			var obj = {};
			var received;
			this.deferred.resolve(obj);
			this.deferred.then(function(result){ received = result; });
			t.t(received === obj);
		},

		"resolve() is already bound to the deferred": function(t){
			var obj = {};
			var received;
			this.deferred.then(function(result){ received = result; });
			var resolve = this.deferred.resolve;
			resolve(obj);
			t.t(received === obj);
		},

		"deferred receives result after rejecting": function(t){
			var obj = {};
			var received;
			this.deferred.then(null, function(result){ received = result; });
			this.deferred.reject(obj);
			t.t(received === obj);
		},

		"promise receives result after rejecting": function(t){
			var obj = {};
			var received;
			this.deferred.promise.then(null, function(result){ received = result; });
			this.deferred.reject(obj);
			t.t(received === obj);
		},

		"reject() returns promise": function(t){
			var obj = {};
			var returnedPromise = this.deferred.reject(obj);
			t.t(returnedPromise instanceof Promise);
			t.t(returnedPromise === this.deferred.promise);
		},

		"isRejected() returns true after rejecting": function(t){
			t.f(this.deferred.isRejected());
			this.deferred.reject();
			t.t(this.deferred.isRejected());
		},

		"isFulfilled() returns true after rejecting": function(t){
			t.f(this.deferred.isFulfilled());
			this.deferred.reject();
			t.t(this.deferred.isFulfilled());
		},

		"reject() is ignored after having been fulfilled": function(t){
			this.deferred.reject();
			this.deferred.reject();
		},

		"reject() throws error after having been fulfilled and strict": function(t){
			this.deferred.reject();
			t.e(Error, this.deferred, "reject", [{}, true]);
		},

		"reject() results are cached": function(t){
			var obj = {};
			var received;
			this.deferred.reject(obj);
			this.deferred.then(null, function(result){ received = result; });
			t.t(received === obj);
		},

		"reject() is already bound to the deferred": function(t){
			var obj = {};
			var received;
			this.deferred.then(null, function(result){ received = result; });
			var reject = this.deferred.reject;
			reject(obj);
			t.t(received === obj);
		},

		"deferred receives result after progress": function(t){
			var obj = {};
			var received;
			this.deferred.then(null, null, function(result){ received = result; });
			this.deferred.progress(obj);
			t.t(received === obj);
		},

		"promise receives result after progres": function(t){
			var obj = {};
			var received;
			this.deferred.promise.then(null, null, function(result){ received = result; });
			this.deferred.progress(obj);
			t.t(received === obj);
		},

		"progress() returns promise": function(t){
			var obj = {};
			var returnedPromise = this.deferred.progress(obj);
			t.t(returnedPromise instanceof Promise);
			t.t(returnedPromise === this.deferred.promise);
		},

		"isResolved() returns false after progress": function(t){
			t.f(this.deferred.isResolved());
			this.deferred.progress();
			t.f(this.deferred.isResolved());
		},

		"isRejected() returns false after progress": function(t){
			t.f(this.deferred.isRejected());
			this.deferred.progress();
			t.f(this.deferred.isRejected());
		},

		"isFulfilled() returns false after progress": function(t){
			t.f(this.deferred.isFulfilled());
			this.deferred.progress();
			t.f(this.deferred.isFulfilled());
		},

		"progress() is ignored after having been fulfilled": function(t){
			this.deferred.resolve();
			this.deferred.resolve();
		},

		"progress() throws error after having been fulfilled and strict": function(t){
			this.deferred.resolve();
			t.e(Error, this.deferred, "progress", [{}, true]);
		},

		"progress() results are not cached": function(t){
			var obj1 = {}, obj2 = {};
			var received = [];
			this.deferred.progress(obj1);
			this.deferred.then(null, null, function(result){ received.push(result); });
			this.deferred.progress(obj2);
			t.t(received[0] === obj2);
			t.is(1, received.length);
		},

		"progress() with chaining": function(t){
			var obj = {};
			var inner = new Deferred();
			var received;
			this.deferred.then(function(){ return inner; }).then(null, null, function(result){ received = result; });
			this.deferred.resolve();
			inner.progress(obj);
			t.t(received === obj);
		},

		"after progress(), the progback return value is emitted on the returned promise": function(t){
			var received;
			var promise = this.deferred.then(null, null, function(n){ return n * n; });
			promise.then(null, null, function(n){ received = n; });
			this.deferred.progress(2);
			t.is(4, received);
		},

		"progress() is already bound to the deferred": function(t){
			var obj = {};
			var received;
			this.deferred.then(null, null, function(result){ received = result; });
			var progress = this.deferred.progress;
			progress(obj);
			t.t(received === obj);
		},

		"cancel() invokes a canceler": function(t){
			var invoked;
			this.canceler = function(){ invoked = true; };
			this.deferred.cancel();
			t.t(invoked);
		},

		"isCanceled() returns true after canceling": function(t){
			t.f(this.deferred.isCanceled());
			this.deferred.cancel();
			t.t(this.deferred.isCanceled());
		},

		"isResolved() returns false after canceling": function(t){
			t.f(this.deferred.isResolved());
			this.deferred.cancel();
			t.f(this.deferred.isResolved());
		},

		"isRejected() returns true after canceling": function(t){
			t.f(this.deferred.isRejected());
			this.deferred.cancel();
			t.t(this.deferred.isRejected());
		},

		"isFulfilled() returns true after canceling": function(t){
			t.f(this.deferred.isFulfilled());
			this.deferred.cancel();
			t.t(this.deferred.isFulfilled());
		},

		"cancel() is ignored after having been fulfilled": function(t){
			var canceled = false;
			this.canceler = function(){ canceled = true; };
			this.deferred.resolve();
			this.deferred.cancel();
			t.f(canceled);
		},

		"cancel() throws error after having been fulfilled and strict": function(t){
			this.deferred.resolve();
			t.e(Error, this.deferred, "cancel", [null, true]);
		},

		"cancel() without reason results in CancelError": function(t){
			var reason = this.deferred.cancel();
			var received;
			this.deferred.then(null, function(result){ received = result; });
			t.t(received, reason);
		},

		"cancel() returns default reason": function(t){
			var reason = this.deferred.cancel();
			t.t(reason instanceof CancelError);
		},

		"reason is passed to canceler": function(t){
			var obj = {};
			var received;
			this.canceler = function(reason){ received = reason; };
			this.deferred.cancel(obj);
			t.t(received === obj);
		},

		"cancels with reason returned from canceler": function(t){
			var obj = {};
			var received;
			this.canceler = function(){ return obj; };
			var reason = this.deferred.cancel();
			this.deferred.then(null, function(reason){ received = reason; });
			t.t(received === obj);
		},

		"cancel() returns reason from canceler": function(t){
			var obj = {};
			this.canceler = function(){ return obj; };
			var reason = this.deferred.cancel();
			t.t(reason === obj);
		},

		"cancel() returns reason from canceler, if canceler rejects with reason": function(t){
			var obj = {};
			var deferred = this.deferred;
			this.canceler = function(){ deferred.reject(obj); return obj; };
			var reason = this.deferred.cancel();
			t.t(reason === obj);
		},

		"with canceler not returning anything, returns default CancelError": function(t){
			this.canceler = function(){};
			var reason = this.deferred.cancel();
			var received;
			this.deferred.then(null, function(result){ received = result; });
			t.t(received === reason);
		},

		"with canceler not returning anything, still returns passed reason": function(t){
			var obj = {};
			var received;
			this.canceler = function(){};
			var reason = this.deferred.cancel(obj);
			t.t(reason === obj);
			this.deferred.then(null, function(result){ received = result; });
			t.t(received === reason);
		},

		"cancel() doesn't reject promise if canceler resolves deferred": function(t){
			var deferred = this.deferred;
			var obj = {};
			var received;
			this.canceler = function(){ deferred.resolve(obj); };
			this.deferred.cancel();
			this.deferred.then(function(result){ received = result; });
			t.t(received === obj);
		},

		"cancel() doesn't reject promise if canceler resolves a chain of promises": function(t){
			var deferred = this.deferred;
			var obj = {};
			var received;
			this.canceler = function(){ deferred.resolve(obj); };
			var last = this.deferred.then().then().then();
			last.cancel();
			last.then(function(result){ received = result; });
			t.t(received === obj);
			t.t(this.deferred.isCanceled());
			t.t(last.isCanceled());
		},

		"cancel() returns undefined if canceler resolves deferred": function(t){
			var deferred = this.deferred;
			var obj = {};
			this.canceler = function(){ deferred.resolve(obj); };
			var result = this.deferred.cancel();
			t.t(typeof result === "undefined");
		},

		"cancel() doesn't change rejection value if canceler rejects deferred": function(t){
			var deferred = this.deferred;
			var obj = {};
			var received;
			this.canceler = function(){ deferred.reject(obj); };
			this.deferred.cancel();
			this.deferred.then(null, function(result){ received = result; });
			t.t(received === obj);
		},

		"cancel() doesn't change rejection value if canceler rejects a chain of promises": function(t){
			var deferred = this.deferred;
			var obj = {};
			var received;
			this.canceler = function(){ deferred.reject(obj); };
			var last = this.deferred.then().then().then();
			last.cancel();
			last.then(null, function(result){ received = result; });
			t.t(received === obj);
			t.t(this.deferred.isCanceled());
			t.t(last.isCanceled());
		},

		"cancel() returns undefined if canceler rejects deferred": function(t){
			var deferred = this.deferred;
			var obj = {};
			this.canceler = function(){ deferred.reject(obj); };
			var result = this.deferred.cancel();
			t.t(typeof result === "undefined");
		},

		"cancel() a promise chain": function(t){
			var obj = {};
			var received;
			this.canceler = function(reason){ received = reason; };
			this.deferred.then().then().then().cancel(obj);
			t.t(received === obj);
		},

		"cancel() a returned promise": function(t){
			var obj = {};
			var received;
			var inner = new Deferred(function(reason){ received = reason; });
			var chain = this.deferred.then(function(){
				return inner;
			});
			this.deferred.resolve();
			chain.cancel(obj, true);
			t.t(received === obj);
		},

		"cancel() is already bound to the deferred": function(t){
			var received;
			this.deferred.then(null, function(result){ received = result; });
			var cancel = this.deferred.cancel;
			cancel();
			t.t(received instanceof CancelError);
		},

		"chained then()": function(t){
			function square(n){ return n * n; }

			var result;
			this.deferred.then(square).then(square).then(function(n){
				result = n;
			});
			this.deferred.resolve(2);
			t.is(result, 16);
		},

		"asynchronously chained then()": function(t){
			function asyncSquare(n){
				var inner = new Deferred();
				setTimeout(function(){ inner.resolve(n * n); }, 0);
				return inner.promise;
			}

			var td = new doh.Deferred();
			this.deferred.then(asyncSquare).then(asyncSquare).then(function(n){
				t.is(n, 16);
				td.callback(true);
			});
			this.deferred.resolve(2);
			return td;
		},

		"then() is already bound to the deferred": function(t){
			var obj = {};
			var then = this.deferred.then;
			var received;
			then(function(result){ received = result; });
			this.deferred.resolve(obj);
			t.t(received === obj);
		},

		"then() with progback: returned promise is not fulfilled when progress is emitted": function(t){
			var progressed = false;
			var promise = this.deferred.then(null, null, function(){ progressed = true; });
			this.deferred.progress();
			t.t(progressed, "Progress was received.");
			t.f(promise.isFulfilled(), "Promise is not fulfilled.");
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
		var self = this;
		this.canceler = function(reason){};
		this.deferred = new Deferred(function(reason){ return self.canceler(reason); });
	}

	doh.register("tests.Deferred", wrapped);
});
