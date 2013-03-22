dojo.provide("dojo.tests._base.connect");

hub = function(){
};

failures = 0;
bad = function(){
	failures++;
};

good = function(){
};

// make 'iterations' connections to hub
// roughly half of which will be to 'good' and
// half to 'bad'
// all connections to 'bad' are disconnected
// test can then be performed on the values
// 'failures' and 'successes'
markAndSweepTest = function(iterations){
	var marked = [];
	// connections
	for(var i=0; i<iterations; i++){
		if(Math.random() < 0.5){
			marked.push(dojo.connect('hub', bad));
		}else{
			dojo.connect('hub', good);
		}
	}
	// Randomize markers (only if the count isn't very high)
	if(i < Math.pow(10, 4)){
		var rm = [ ];
		while(marked.length){
			var m = Math.floor(Math.random() * marked.length);
			rm.push(marked[m]);
			marked.splice(m, 1);
		}
		marked = rm;
	}
	for(var m=0; m<marked.length; m++){
		dojo.disconnect(marked[m]);
	}
	// test
	failures = 0;
	hub();
	// return number of disconnected functions that fired (should be 0)
	return failures;
};

markAndSweepSubscribersTest = function(iterations){
	var topic = "hubbins";
	var marked = [];
	// connections
	for(var i=0; i<iterations; i++){
		if(Math.random() < 0.5){
			marked.push(dojo.subscribe(topic, bad));
		}else{
			dojo.subscribe(topic, good);
		}
	}
	// Randomize markers (only if the count isn't very high)
	if(i < Math.pow(10, 4)){
		var rm = [ ];
		while(marked.length){
			var m = Math.floor(Math.random() * marked.length);
			rm.push(marked[m]);
			marked.splice(m, 1);
		}
		marked = rm;
	}
	for(var m=0; m<marked.length; m++){
		dojo.unsubscribe(marked[m]);
	}
	// test
	failures = 0;
	dojo.publish(topic);
	// return number of unsubscribed functions that fired (should be 0)
	return failures;
};

tests.register("tests._base.connect",
	[
		function smokeTest(t){
			// foo sets ok to false
			var ok = false;
			var foo = { "foo": function(){ ok=false; } };
			// connected function sets ok to true
			dojo.connect(foo, "foo", null, function(){ ok=true; });
			foo.foo();
			t.is(true, ok);
		},
		function basicTest(t){
			var out = '';
			var obj = {
				foo: function(){
					out += 'foo';
				},
				bar: function(){
					out += 'bar';
				},
				baz: function(){
					out += 'baz';
				}
			};
			//
			var foobar = dojo.connect(obj, "foo", obj, "bar");
			dojo.connect(obj, "bar", obj, "baz");
			//
			out = '';
			obj.foo();
			t.is('foobarbaz', out);
			//
			out = '';
			obj.bar();
			t.is('barbaz', out);
			//
			out = '';
			obj.baz();
			t.is('baz', out);
			//
			dojo.connect(obj, "foo", obj, "baz");
			dojo.disconnect(foobar);
			//
			out = '';
			obj.foo();
			t.is('foobaz', out);
			//
			out = '';
			obj.bar();
			t.is('barbaz', out);
			//
			out = '';
			obj.baz();
			t.is('baz', out);
		},
		function hubConnectDisconnect1000(t){
			t.is(0, markAndSweepTest(1000));
		},
		function args4Test(t){
			// standard 4 args test
			var ok, obj = { foo: function(){ok=false;}, bar: function(){ok=true;} };
			dojo.connect(obj, "foo", obj, "bar");
			obj.foo();
			t.is(true, ok);
		},
		function args3Test(t){
			// make some globals
			var ok;
			dojo.global["gFoo"] = function(){ok=false;};
			dojo.global["gOk"] = function(){ok=true;};
			// 3 arg shorthand for globals (a)
			var link = dojo.connect("gFoo", null, "gOk");
			gFoo();
			dojo.disconnect(link);
			t.is(true, ok);
			// 3 arg shorthand for globals (b)
			link = dojo.connect(null, "gFoo", "gOk");
			gFoo();
			dojo.disconnect(link);
			t.is(true, ok);
			// verify disconnections
			gFoo();
			t.is(false, ok);
		},
		function args2Test(t){
			// make some globals
			var ok;
			dojo.global["gFoo"] = function(){ok=false;};
			dojo.global["gOk"] = function(){ok=true;};
			// 2 arg shorthand for globals
			var link = dojo.connect("gFoo", "gOk");
			gFoo();
			dojo.disconnect(link);
			t.is(true, ok);
			// 2 arg shorthand for globals, alternate scoping
			link = dojo.connect("gFoo", gOk);
			gFoo();
			dojo.disconnect(link);
			t.is(true, ok);
		},
		function scopeTest1(t){
			var foo = { ok: true, foo: function(){this.ok=false;} };
			var bar = { ok: false, bar: function(){this.ok=true;} };
			// link foo.foo to bar.bar with natural scope
			var link = dojo.connect(foo, "foo", bar, "bar");
			foo.foo();
			t.is(false, foo.ok);
			t.is(true, bar.ok);
		},
		function scopeTest2(t){
			var foo = { ok: true, foo: function(){this.ok=false;} };
			var bar = { ok: false, bar: function(){this.ok=true;} };
			// link foo.foo to bar.bar such that scope is always 'foo'
			var link = dojo.connect(foo, "foo", bar.bar);
			foo.foo();
			t.is(true, foo.ok);
			t.is(false, bar.ok);
		},
		function pubsub(t){
			var count = 0;
			dojo.subscribe("/test/blah", function(first, second){
				t.is("first", first);
				t.is("second", second);
				count++;
			});
			dojo.publish("/test/blah", ["first", "second"]);
			t.is(1, count);
		},
		function connectPublisher(t){
			var foo = { inc: 0, foo: function(){ this.inc++; } };
			var bar = { inc: 0, bar: function(){ this.inc++; } };
			var c1h = dojo.connectPublisher("/blah", foo, "foo");
			var c2h = dojo.connectPublisher("/blah", foo, "foo");
			dojo.subscribe("/blah", bar, "bar");
			foo.foo();
			t.is(1, foo.inc);
			t.is(2, bar.inc);
			dojo.disconnect(c1h);
			foo.foo();
			t.is(2, foo.inc);
			t.is(3, bar.inc);
			dojo.disconnect(c2h);
			foo.foo();
			t.is(3, foo.inc);
			t.is(3, bar.inc);
		},
		function publishSubscribe1000(t){
			t.is(markAndSweepSubscribersTest(1000), 0);
		},
		function performanceAdd(){
			function listener(){}
			for(var i = 0;i < 1000; i++){
				var foo = {};
				dojo.connect(foo, "bar", listener);
			}
		},
		function performanceFire(){
			var foo = {};
			function listener(){}
			dojo.connect(foo, "bar", listener);
			for(var i = 0;i < 100000; i++){
				foo.bar();
			}
		}
	]
);
