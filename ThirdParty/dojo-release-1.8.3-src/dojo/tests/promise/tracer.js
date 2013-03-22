define([
	"doh/main",
	"dojo/Deferred",
	"dojo/promise/tracer"
], function(doh, Deferred, tracer){
	var tests = {
		"trace() resolved": function(t){
			var td = new doh.Deferred;
			var obj = {};
			this.handles.push(tracer.on("resolved", function(value){
				t.t(value === obj);
				td.callback(true);
			}));
			this.deferred.promise.trace();
			this.deferred.resolve(obj);
			return td;
		},

		"trace() rejected": function(t){
			var td = new doh.Deferred;
			var obj = {};
			this.handles.push(tracer.on("rejected", function(error){
				t.t(error === obj);
				td.callback(true);
			}));
			this.deferred.promise.trace();
			this.deferred.reject(obj);
			return td;
		},

		"trace() progress": function(t){
			var td = new doh.Deferred;
			var obj = {};
			this.handles.push(tracer.on("progress", function(update){
				t.t(update === obj);
				td.callback(true);
			}));
			this.deferred.promise.trace();
			this.deferred.progress(obj);
			return td;
		},

		"passing extra arguments to trace()": function(t){
			var td = new doh.Deferred;
			var obj = {};
			this.handles.push(tracer.on("resolved", function(value, arg1, arg2){
				t.t(value === obj);
				t.is(arg1, "test");
				t.t(arg2 === obj);
				td.callback(true);
			}));
			this.deferred.promise.trace("test", obj);
			this.deferred.resolve(obj);
			return td;
		},

		"traceRejected()": function(t){
			var td = new doh.Deferred;
			var obj = {};
			this.handles.push(tracer.on("rejected", function(error){
				t.t(error === obj);
				td.callback(true);
			}));
			this.deferred.promise.traceRejected();
			this.deferred.reject(obj);
			return td;
		},

		"passing extra arguments": function(t){
			var td = new doh.Deferred;
			var obj = {};
			this.handles.push(tracer.on("rejected", function(error, arg1, arg2){
				t.t(error === obj);
				t.is(arg1, "test");
				t.t(arg2 === obj);
				td.callback(true);
			}));
			this.deferred.promise.traceRejected("test", obj);
			this.deferred.reject(obj);
			return td;
		}
	};

	var wrapped = [];
	for(var name in tests){
		wrapped.push({
			name: name,
			setUp: setUp,
			tearDown: tearDown,
			runTest: tests[name]
		});
	}

	function setUp(){
		this.handles = [];
		this.deferred = new Deferred;
	}

	function tearDown(){
		while(this.handles.length){
			this.handles.pop().remove();
		}
	}

	doh.register("tests.promise.tracer", wrapped);
});
