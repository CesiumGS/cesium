define(["doh", "../hash", "../router"], function(doh, hash, router){
	var count = 0,
		handle, foo;

	doh.register("tests.router", [
		{
			name: "Router API",
			runTest: function(t){
				t.t(router.register, "Router has a register");
				t.t(router.go, "Router has a go");
				t.t(router.startup, "Router has a startup");
			}
		},
		{
			name: "Registering a route by string",
			runTest: function(t){
				handle = router.register("/foo", function(){
					count++;
					console.log("/foo fired! New count:", count);
				});

				// Make sure it looks right
				t.t(handle.remove, "Handle has a remove");
				t.t(handle.register, "Handle has a register");
			}
		},
		{
			name: "Ensuring routes don't fire before startup",
			setUp: function(){
				count = 0;
			},
			runTest: function(t){
				hash("/foo");
				t.t(count === 0, "Count should have been 0, was " + count);
			}
		},
		{
			name: "Ensuring routes do fire after startup",
			runTest: function(t){
				router.startup();
				t.t(count === 1, "Count should have been 1, was " + count);
			}
		},
		{
			name: "Ensuring that hash changes fire routes",
			runTest: function(t){
				// Due to the nature of the hashchange event,
				// this test is going to be async - but we have to nest it,
				// sadly.

				var d = new doh.Deferred();

				// Reset the hash
				hash("");

				setTimeout(function(){
					// As soon as possible, set it back to our test...
					hash("/foo");
					console.log("Setting hash");

					// ... and then check to make sure the events fired
					setTimeout(d.getTestCallback(function(){
						console.log("Checking count, current hash:", hash());
						t.t(count === 2, "Count should have been 2, was " + count);
					}), 50);
				}, 0);

				return d;
			}
		},
		{
			name: "Ensuring that router.go fires changes",
			runTest: function(t){
				var d = new doh.Deferred();

				// Since router.go fires off routes immediately, this should
				// kick off changes!
				router.go("");
				router.go("/foo");

				t.t(count === 3, "Count should have been 3, was " + count);
			}
		},
		{
			name: "Ensuring route doesn't fire after removal",
			runTest: function(t){
				handle.remove();
				router.go("");
				router.go("/foo");

				t.t(count === 3, "Count should have been 3, was " + count);
			}
		},
		{
			name: "Registering a route by regexp",
			runTest: function(t){
				router.register(/^\/bar$/, function(){
					count++;
				});
				router.go("/bar");

				t.t(count === 4, "Count should have been 4, was " + count);
			}
		},
		{
			name: "Checking event object",
			runTest: function(t){
				var oldPath, newPath, params, stopImmediatePropagation, preventDefault;

				router.go("");

				router.register("/checkEventObject/:foo", function(e){
					console.log("e:",e);
					oldPath = e.oldPath;
					newPath = e.newPath;
					params = e.params;
					stopImmediatePropagation = typeof e.stopImmediatePropagation;
					preventDefault = typeof e.preventDefault;
				});

				router.go("/checkEventObject/bar");

				t.t(oldPath === "", "oldPath should be empty string, was " + oldPath);
				t.t(newPath === "/checkEventObject/bar", "newPath should be '/checkEventObject/bar', was " + newPath);
				t.t(params, "params should be a truthy value, was " + params);
				t.t(params.hasOwnProperty("foo"), "params should have a .foo property");
				t.t(params.foo === "bar", "params.foo should be bar, was " + params.foo);
				t.t(stopImmediatePropagation === "function", "stopImmediatePropagation should be a function, was " + stopImmediatePropagation);
				t.t(preventDefault === "function", "preventDefault should be a function, was " + preventDefault);
			}
		},
		{
			name: "Registering long routes with placeholders",
			runTest: function(t){
				var testObject;

				router.register("/path/:to/:some/:long/*thing", function(e){
					testObject = e.params;
				});

				router.go("/path/to/some/long/thing/this/is/in/splat");

				t.t(testObject instanceof Object, "testObject should have been an object, but wasn't");
				t.t(testObject.to === "to", "testObject.to should have been 'to', was " + testObject.to);
				t.t(testObject.some === "some", "testObject.some should have been 'some', was " + testObject.some);
				t.t(testObject["long"] === "long", "testObject.long should have been 'long', was " + testObject["long"]);
				t.t(testObject.thing === "thing/this/is/in/splat", "testObject.thing should have been 'thing/this/is/in/splat', was " + testObject.thing);

				testObject = null;

				router.go("/path/1/2/3/4/5/6");

				t.t(testObject instanceof Object, "testObject should have been an object, but wasn't");
				t.t(testObject.to === "1", "testObject.to should have been '1', was " + testObject.to);
				t.t(testObject.some === "2", "testObject.some should have been '2', was " + testObject.some);
				t.t(testObject["long"] === "3", "testObject.long should have been '3', was " + testObject["long"]);
				t.t(testObject.thing === "4/5/6", "testObject.thing should have been '4/5/6', was " + testObject.thing);
			}
		},
		{
			name: "Using capture groups in a regex route",
			runTest: function(t){
				var testObject;

				router.register(/^\/path\/(\w+)\/(\d+)$/, function(e){
					testObject = e.params;
				});

				router.go("/path/abcdef/1234");

				t.t(testObject instanceof Array, "testObject should have been an array, but wasn't");
				t.t(testObject[0] === "abcdef", "testObject[0] should have been 'abcdef', was " + testObject[0]);
				t.t(testObject[1] === "1234", "testObject[1] should have been '1234', was " + testObject[1]);

				testObject = null;

				router.go("/path/abc/def");

				t.t(testObject === null, "testObject should have been null, but wasn't");

				router.go("/path/abc123/456def");

				t.t(testObject === null, "testObject should have been null, but wasn't");

				router.go("/path/abc123/456");

				t.t(testObject instanceof Array, "testObject should have been an array, but wasn't");
				t.t(testObject[0] === "abc123", "testObject[0] should have been 'abc123', was " + testObject[0]);
				t.t(testObject[1] === "456", "testObject[1] should have been '456', was " + testObject[1]);
			}
		},
		{
			name: "Testing registerBefore",
			runTest: function(t){
				var test = "";

				router.register("/isBefore", function(){
					test += "1";
				});

				router.registerBefore("/isBefore", function(){
					test += "2";
				});

				router.register("/isBefore", function(){
					test += "3";
				});

				router.registerBefore("/isBefore", function(){
					test += "4";
				});

				router.register("/isBefore", function(){
					test += "5";
				});

				router.go("/isBefore");

				t.t(test === "42135", "test should have been '42135', was " + test);
			}
		},
		{
			name: "Stopping propagation",
			runTest: function(t){
				var test = "";

				router.register("/stopImmediatePropagation", function(){ test += "A"; });
				router.register("/stopImmediatePropagation", function(){ test += "B"; });

				router.register("/stopImmediatePropagation", function(e){
					e.stopImmediatePropagation();
					test += "C";
				});

				router.register("/stopImmediatePropagation", function(){ test += "D"; });
				router.register("/stopImmediatePropagation", function(){ test += "E"; });

				router.go("/stopImmediatePropagation");

				t.t(test === "ABC", "test should have been 'ABC', was " + test);
			}
		},
		{
			name: "Preventing default (change)",
			runTest: function(t){
				var prevented = false, goResult;

				hash("");

				t.t(hash() === "", "hash should be empty");

				router.register("/preventDefault", function(e){
					e.preventDefault();
				});

				goResult = router.go("/preventDefault");

				t.t(hash() === "", "hash should still be empty");
				t.t(goResult === false, "goResult should be false");

				goResult = router.go("/someOtherPath");

				t.t(hash() === "/someOtherPath", "hash should be '/someOtherPath'");
				t.t(goResult === true, "goResult should be true");

				router.register("/allowDefault", function(e){
					console.log("Doing something here without explicitly stopping");
				});
			}
		}
	]);
});
