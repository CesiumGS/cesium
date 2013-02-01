define("doh/runner", ["dojo/main"], function(dojo){

var doh = {
	// summary:
	//		Functions for registering and running automated tests.
};

// Remove for 2.0
dojo.mixin(doh, dojo);

// intentionally define global tests and global doh symbols
// TODO: scrub these globals from tests and remove this pollution for 2.0
tests = doh;
this.doh = doh;

doh._line = "------------------------------------------------------------";

doh.debug = function(){
	// summary:
	//		takes any number of arguments and sends them to whatever debugging
	//		or logging facility is available in this environment

	// YOUR TEST RUNNER NEEDS TO IMPLEMENT THIS
};

doh.error = function(){
	// summary:
	//		logging method to be used to send Error objects, so that
	//		whatever debugging or logging facility you have can decide to treat it
	//		as an Error object and show additional information - such as stack trace

	// YOUR TEST RUNNER NEEDS TO IMPLEMENT THIS
};

doh._AssertFailure = function(msg, hint){
	if (doh.breakOnError) {
		debugger;
	}
	if(!(this instanceof doh._AssertFailure)){
		return new doh._AssertFailure(msg, hint);
	}
	if(hint){
		msg = (new String(msg||""))+" with hint: \n\t\t"+(new String(hint)+"\n");
	}
	this.message = new String(msg||"");
	return this;
};
doh._AssertFailure.prototype = new Error();
doh._AssertFailure.prototype.constructor = doh._AssertFailure;
doh._AssertFailure.prototype.name = "doh._AssertFailure";

doh.Deferred = function(canceller){
	this.chain = [];
	this.id = this._nextId();
	this.fired = -1;
	this.paused = 0;
	this.results = [null, null];
	this.canceller = canceller;
	this.silentlyCancelled = false;
};

doh.extend(doh.Deferred, {
	getTestErrback: function(cb, scope){
		// summary:
		//		Replaces outer getTextCallback's in nested situations to avoid multiple callback(true)'s
		var _this = this;
		return function(){
			try{
				cb.apply(scope||doh.global||_this, arguments);
			}catch(e){
				_this.errback(e);
			}
		};
	},

	getTestCallback: function(cb, scope){
		var _this = this;
		return function(){
			try{
				cb.apply(scope||doh.global||_this, arguments);
			}catch(e){
				_this.errback(e);
				return;
			}
			_this.callback(true);
		};
	},

	getFunctionFromArgs: function(){
		// TODO: this looks like dojo.hitch? remove and replace?
		var a = arguments;
		if((a[0])&&(!a[1])){
			if(typeof a[0] == "function"){
				return a[0];
			}else if(typeof a[0] == "string"){
				return doh.global[a[0]];
			}
		}else if((a[0])&&(a[1])){
			return doh.hitch(a[0], a[1]);
		}
		return null;
	},

	_nextId: (function(){
		var n = 1;
		return function(){ return n++; };
	})(),

	cancel: function(){
		if(this.fired == -1){
			if (this.canceller){
				this.canceller(this);
			}else{
				this.silentlyCancelled = true;
			}
			if(this.fired == -1){
				this.errback(new Error("Deferred(unfired)"));
			}
		}else if(this.fired == 0 && this.results[0] && this.results[0].cancel){
			this.results[0].cancel();
		}
	},

	_pause: function(){
		this.paused++;
	},

	_unpause: function(){
		this.paused--;
		if ((this.paused == 0) && (this.fired >= 0)) {
			this._fire();
		}
	},

	_continue: function(res){
		this._resback(res);
		this._unpause();
	},

	_resback: function(res){
		this.fired = ((res instanceof Error) ? 1 : 0);
		this.results[this.fired] = res;
		this._fire();
	},

	_check: function(){
		if(this.fired != -1){
			if(!this.silentlyCancelled){
				throw new Error("already called!");
			}
			this.silentlyCancelled = false;
		}
	},

	callback: function(res){
		this._check();
		this._resback(res);
	},

	errback: function(res){
		this._check();
		if(!(res instanceof Error)){
			res = new Error(res);
		}
		this._resback(res);
	},

	addBoth: function(cb, cbfn){
		// TODO: this looks like dojo.hitch? remove and replace?
		var enclosed = this.getFunctionFromArgs(cb, cbfn);
		if(arguments.length > 2){
			enclosed = doh.hitch(null, enclosed, arguments, 2);
		}
		return this.addCallbacks(enclosed, enclosed);
	},

	addCallback: function(cb, cbfn){
		// TODO: this looks like dojo.hitch? remove and replace?
		var enclosed = this.getFunctionFromArgs(cb, cbfn);
		if(arguments.length > 2){
			enclosed = doh.hitch(null, enclosed, arguments, 2);
		}
		return this.addCallbacks(enclosed, null);
	},

	addErrback: function(cb, cbfn){
		// TODO: this looks like dojo.hitch? remove and replace?
		var enclosed = this.getFunctionFromArgs(cb, cbfn);
		if(arguments.length > 2){
			enclosed = doh.hitch(null, enclosed, arguments, 2);
		}
		return this.addCallbacks(null, enclosed);
	},

	addCallbacks: function(cb, eb){
		this.chain.push([cb, eb]);
		if(this.fired >= 0){
			this._fire();
		}
		return this;
	},

	_fire: function(){
		var chain = this.chain;
		var fired = this.fired;
		var res = this.results[fired];
		var self = this;
		var cb = null;
		while(chain.length > 0 && this.paused == 0){
			// Array
			var pair = chain.shift();
			var f = pair[fired];
			if(f == null){
				continue;
			}
			try {
				res = f(res);
				fired = ((res instanceof Error) ? 1 : 0);
				if(res && res.addCallback){
					cb = function(res){
						self._continue(res);
					};
					this._pause();
				}
			}catch(err){
				fired = 1;
				res = err;
			}
		}
		this.fired = fired;
		this.results[fired] = res;
		if((cb)&&(this.paused)){
			res.addBoth(cb);
		}
	}
});

//
// State Keeping and Reporting
//

doh._testCount = 0;
doh._groupCount = 0;
doh._errorCount = 0;
doh._failureCount = 0;
doh._currentGroup = null;
doh._currentTest = null;
doh._paused = true;

doh._init = function(){
	this._currentGroup = null;
	this._currentTest = null;
	this._errorCount = 0;
	this._failureCount = 0;
	this.debug(this._testCount, "tests to run in", this._groupCount, "groups");
};

doh._groups = {};

//
// Test Types
//
doh._testTypes= {};

doh.registerTestType= function(name, initProc){
	// summary:
	//		Adds a test type and associates a function used to initialize each test of the given type
	// name: String
	//		The name of the type.
	// initProc: Function
	//		Type specific test initializer; called after the test object is created.
	doh._testTypes[name]= initProc;
};

doh.registerTestType("perf", function(group, tObj, type){
	// Augment the test with some specific options to make it identifiable as a
	// particular type of test so it can be executed properly.
	if(type === "perf" || tObj.testType === "perf"){
		tObj.testType = "perf";

		// Build an object on the root DOH class to contain all the test results.
		// Cache it on the test object for quick lookup later for results storage.
		if(!doh.perfTestResults){
			doh.perfTestResults = {};
			doh.perfTestResults[group] = {};
		}
		if(!doh.perfTestResults[group]){
			doh.perfTestResults[group] = {};
		}
		if(!doh.perfTestResults[group][tObj.name]){
			doh.perfTestResults[group][tObj.name] = {};
		}
		tObj.results = doh.perfTestResults[group][tObj.name];

		// If it's not set, then set the trial duration; default to 100ms.
		if(!("trialDuration" in tObj)){
			tObj.trialDuration = 100;
		}

		// If it's not set, then set the delay between trial runs to 100ms
		// default to 100ms to allow for GC and to make IE happy.
		if(!("trialDelay" in tObj)){
			tObj.trialDelay = 100;
		}

		// If it's not set, then set number of times a trial is run to 10.
		if(!("trialIterations" in tObj)){
			tObj.trialIterations = 10;
		}
	}
});


//
// Test Registration
//
var
	createFixture= function(group, test, type){
		// test is a function, string, or fixture object
		var tObj = test;
		if(dojo.isString(test)){
			tObj = {
				name: test.replace("/\s/g", "_"), // FIXME: bad escapement
				runTest: new Function("t", test)
			};
		}else if(dojo.isFunction(test)){
			// if we didn't get a fixture, wrap the function
			tObj = { "runTest": test };
			if(test["name"]){
				tObj.name = test.name;
			}else{
				try{
					var fStr = "function ";
					var ts = tObj.runTest+"";
					if(0 <= ts.indexOf(fStr)){
						tObj.name = ts.split(fStr)[1].split("(", 1)[0];
					}
					// doh.debug(tObj.runTest.toSource());
				}catch(e){
				}
			}
			// FIXME: try harder to get the test name here
		}else if(dojo.isString(tObj.runTest)){
			tObj.runTest= new Function("t", tObj.runTest);
		}
		if(!tObj.runTest){
			return 0;
		}

		// if the test is designated as a particular type, do type-specific initialization
		var testType= doh._testTypes[type] || doh._testTypes[tObj.testType];
		if(testType){
			testType(group, tObj);
		}

		// add the test to this group
		doh._groups[group].push(tObj);
		doh._testCount++;
		doh._testRegistered(group, tObj);

		return tObj;
	},

	dumpArg= function(arg){
		if(dojo.isString(arg)){
			return "string(" + arg + ")";
		} else {
			return typeof arg;
		}
	},

	illegalRegister= function(args, testArgPosition){
		var hint= "\targuments: ";
		for(var i= 0; i<5; i++){
			hint+= dumpArg(args[i]);
		}
		doh.debug("ERROR:");
		if(testArgPosition){
			doh.debug("\tillegal arguments provided to dojo.register; the test at argument " + testArgPosition + " wasn't a test.");
		}else{
			doh.debug("\tillegal arguments provided to dojo.register");
		}
		doh.debug(hint);
	};

doh._testRegistered = function(group, fixture){
	// slot to be filled in
};

doh._groupStarted = function(group){
	// slot to be filled in
};

doh._groupFinished = function(group, success){
	// slot to be filled in
};

doh._testStarted = function(group, fixture){
	// slot to be filled in
};

doh._testFinished = function(group, fixture, success){
	// slot to be filled in
};

doh._registerTest = function(group, test, type){
	// summary:
	//		add the provided test function or fixture object to the specified
	//		test group.
	// group: String
	//		string name of the group to add the test to
	// test: Function||String||Object
	//		TODOC
	// type: String?
	//		An identifier denoting the type of testing that the test performs, such
	//		as a performance test. If falsy, defaults to test.type.

	// get, possibly create, the group object

	var groupObj = this._groups[group];
	if(!groupObj){
		this._groupCount++;
		groupObj = this._groups[group] = [];
		groupObj.inFlight = 0;
	}
	if(!test){
		return groupObj;
	}

	// create the test fixture
	var tObj;
	if(dojo.isFunction(test) || dojo.isString(test) || "runTest" in test){
		return createFixture(group, test, type) ? groupObj : 0;
	}else if(dojo.isArray(test)){
		// a vector of tests...
		for(var i=0; i<test.length; i++){
			tObj = createFixture(group, test[i], type);
			if(!tObj){
				this.debug("ERROR:");
				this.debug("\tillegal test is test array; more information follows...");
				return null;
			}
		}
		return groupObj;
	}else{
		// a hash of tests...
		for(var testName in test){
			var theTest = test[testName];
			if(dojo.isFunction(theTest) || dojo.isString(theTest)){
				tObj = createFixture(group, {name: testName, runTest: theTest}, type);
			}else{
				// should be an object
				theTest.name = theTest.name || testName;
				tObj = createFixture(group, theTest, type);
			}
			if(!tObj){
				this.debug("ERROR:");
				this.debug("\tillegal test is test hash; more information follows...");
				return null;
			}
		}
		return groupObj;
	}
};

doh._registerTestAndCheck = function(groupId, test, type, testArgPosition, args, setUp, tearDown){
	var amdMid = 0;
	if(groupId){
		if(type){
			// explicitly provided type; therefore don't try to get type from groupId
			var match = groupId.match(/([^\!]+)\!(.+)/);
			if(match){
				amdMid = match[1];
				groupId = match[2];
			}
		}else{
			var parts = groupId && groupId.split("!");
			if(parts.length == 3){
				amdMid = parts[0];
				groupId = parts[1];
				type = parts[2];
			}else if(parts.length == 2){
				// either (amdMid, group) or (group, type)
				if(parts[1] in doh._testTypes){
					groupId = parts[0];
					type = parts[1];
				}else{
					amdMid = parts[0];
					groupId = parts[1];
				}
			} // else, no ! and just a groupId
		}
	}

	var group = doh._registerTest(groupId, test, type);
	if(group){
		if(amdMid){
			group.amdMid = amdMid;
		}
		if(setUp){
			group.setUp = setUp;
		}
		if(tearDown){
			group.tearDown = tearDown;
		}
	}else{
		illegalRegister(arguments, testArgPosition);
	}
};

doh._registerUrl = function(/*String*/ group, /*String*/ url, /*Integer*/ timeout, /*String*/ type, /*object*/ dohArgs){
	// slot to be filled in
	this.debug("ERROR:");
	this.debug("\tNO registerUrl() METHOD AVAILABLE.");
};

var typeSigs = (function(){
	// Generate machinery to decode the many register signatures; these are the possible signatures.

	var sigs = [
		// note: to===timeout, up===setUp, down===tearDown

		// 1 arg
		"test", function(args, a1){doh._registerTestAndCheck("ungrouped", a1, 0, 0, args, 0, 0);},
		"url", function(args, a1){doh._registerUrl("ungrouped", a1);},

		// 2 args
		"group-test", function(args, a1, a2){doh._registerTestAndCheck(a1, a2, 0, 0, args, 0, 0);},
		"test-type", function(args, a1, a2){doh._registerTestAndCheck("ungrouped", a1, a2, 1, args, 0, 0);},
		"test-up", function(args, a1, a2){doh._registerTestAndCheck("ungrouped", a1, 0, 0, args, a2, 0);},
		"group-url", function(args, a1, a2){doh._registerUrl(a1, a2);},
		"url-to", function(args, a1, a2){doh._registerUrl("ungrouped", a1, a2);},
		"url-type", function(args, a1, a2){doh._registerUrl("ungrouped", a1, undefined, a2);},
		"url-args", function(args, a1, a2){doh._registerUrl("ungrouped", a1, undefined, 0, a2);},

		// 3 args
		"group-test-type", function(args, a1, a2, a3){doh._registerTestAndCheck(a1, a2, a3, 2, args, 0, 0);},
		"group-test-up", function(args, a1, a2, a3){doh._registerTestAndCheck(a1, a2, 0, 2, args, a3, 0);},
		"test-type-up", function(args, a1, a2, a3){doh._registerTestAndCheck("ungrouped", a1, a2, 0, args, a3, 0);},
		"test-up-down", function(args, a1, a2, a3){doh._registerTestAndCheck("ungrouped", a1, 0, 0, args, a2, a3);},
		"group-url-to", function(args, a1, a2, a3){doh._registerUrl(a1, a2, a3);},
		"group-url-type", function(args, a1, a2, a3){doh._registerUrl(a1, a2, undefined, a3);},
		"group-url-args", function(args, a1, a2, a3){doh._registerUrl(a1, a2, undefined, 0, a3);},
		"url-to-type", function(args, a1, a2, a3){doh._registerUrl("ungrouped", a1, a2, a3);},
		"url-to-args", function(args, a1, a2, a3){doh._registerUrl("ungrouped", a1, a2, 0, a3);},
		"url-type-args", function(args, a1, a2, a3){doh._registerUrl("ungrouped", a1, undefined, a2, a3);},

		// 4 args
		"group-test-type-up", function(args, a1, a2, a3, a4){doh._registerTestAndCheck(a1, a2, a3, 2, args, a4, 0);},
		"group-test-up-down", function(args, a1, a2, a3, a4){doh._registerTestAndCheck(a1, a2, 0, 2, args, a3, a4);},
		"test-type-up-down", function(args, a1, a2, a3, a4){doh._registerTestAndCheck("ungrouped", a1, 2, 0, args, a3, a4);},
		"group-url-to-type", function(args, a1, a2, a3, a4){doh._registerUrl(a1, a2, a3, a4);},
		"group-url-to-args", function(args, a1, a2, a3, a4){doh._registerUrl(a1, a2, a3, 0, a4);},
		"group-url-type-args", function(args, a1, a2, a3, a4){doh._registerUrl(a1, a2, undefined, a3, a4);},
		"url-to-type-args", function(args, a1, a2, a3, a4){doh._registerUrl("ungrouped", a1, a2, a3, a4);},

		// 5 args
		"group-test-type-up-down", function(args, a1, a2, a3, a4, a5){doh._registerTestAndCheck(a1, a2, a3, 2, args, a4, a5);},
		"group-url-to-type-args", function(args, a1, a2, a3, a4, a5){doh._registerUrl(a1, a2, a3, a4, a5);}
	];

	// type-ids
	// a - array
	// st - string, possible type
	// sf - string, possible function
	// s - string not a type or function
	// o - object
	// f - function
	// n - number
    // see getTypeId inside doh.register
	var argTypes = {
		group:"st.sf.s",
		test:"a.sf.o.f",
		type:"st",
		up:"f",
		down:"f",
		url:"s",
		to:"n",
		args:"o"
	};
	for(var p in argTypes){
		argTypes[p]= argTypes[p].split(".");
	}

	function generateTypeSignature(sig, pattern, dest, func){
		for(var nextPattern, reducedSig= sig.slice(1), typeList= argTypes[sig[0]], i=0; i<typeList.length; i++){
			nextPattern =  pattern + (pattern ? "-" : "") + typeList[i];
			if(reducedSig.length){
				generateTypeSignature(reducedSig, nextPattern, dest, func);
			}else{
				dest.push(nextPattern, func);
			}
		}
	}

	var typeSigs = [];
	for(var sig, func, dest, i = 0; i<sigs.length; i++){
		sig = sigs[i++].split("-");
		func = sigs[i];
		dest = typeSigs[sig.length-1] || (typeSigs[sig.length-1]= []);
		generateTypeSignature(sig, "", dest, func);
	}
	return typeSigs;
})();


doh.register = function(a1, a2, a3, a4, a5){
	/*=====
	doh.register = function(groupId, testOrTests, timeoutOrSetUp, tearDown){
	// summary:
	//		Add a test or group of tests.
	// description:
	//		Adds the test or tests given by testsOrUrl to the group given by group (if any). For URL tests, unless
	//		a group is explicitly provided the group given by the URL until the document arrives at which
	//		point the group is renamed to the title of the document. For non-URL tests, if groupId is
	//		not provided, then tests are added to the group "ungrouped"; otherwise if the given groupId does not
	//		exist, it is created; otherwise, tests are added to the already-existing group.
	//
	//		groupIds may contain embedded AMD module identifiers as prefixes and/or test types as suffixes. Prefixes
	//		and suffixes are denoted by a "!". For example
	// groupId: String?
	//		The name of the group, optionally with an AMD module identifier prefix and/or
	//		test type suffix. The value character set for group names and AMD module indentifiers
	//		is given by [A-Za-z0-9_/.-]. If provided, prefix and suffix are denoted by "!". If
	//		provided, type must be a valid test type.
	// testOrTests: Array||Function||Object||String||falsy
	//		When a function, implies a function that defines a single test. DOH passes the
	//		DOH object to the function as the sole argument when the test is executed. When
	//		a string, implies the definition of a single test given by `new Function("t", testOrTests)`.
	//		When an object that contains the method `runTest` (which *must* be a function),
	//		implies a single test given by the value of the property `runTest`. In this case,
	//		the object may also contain the methods `setup` and `tearDown`, and, if provided, these
	//		will be invoked on either side of the test function. Otherwise when an object (that is,
	//		an object that does not contain the method `runTest`), then a hash from test name to
	//		test function (either a function or string as described above); any names that begin
	//		with "_" are ignored. When an array, the array must exclusively contain functions,
	//		strings, and/or objects as described above and each item is added to the group as
	//		per the items semantics.
	// timeoutOrSetUp: integer||Function?
	//		If tests is a URL, then must be an integer giving the number milliseconds to wait for the test
	//		page to load before signaling an error; otherwise, a function for initializing the test group.
	//		If a tearDown function is given, then a setup function must also be given.
	// tearDown: Function?
	//		A function for deinitializing the test group.
	// example:
	// | `"myTest/MyGroup"`							// just a group, group ids need not include a slash
	// | `"myTest/MyGroup!perf"`					// group with test type
	// | `"path/to/amd/module!myTest/MyGroup"`		// group with AMD module identifier
	// | `"path/to/amd/module!myTest/MyGroup!perf"`	// group with both AMD module identifier and test type
	//
	//		Groups associated with AMD module identifiers may be unloaded/reloaded if using an AMD loader with
	//		reload support (dojo's AMD loader includes such support). If no AMD module identifier is given,
	//		the loader supports reloading, and the user demands a reload, then the groupId will be used
	//		as the AMD module identifier.
	//
	//		For URL tests, the groupId is changed to the document title (if any) upon document arrival. The
	//		title may include a test type suffix denoted with a "!" as described above.
	//
	//		For URL tests, if timeout is a number, then sets the timeout for loading
	//		the particular URL; otherwise, timeout is set to DOH.iframeTimeout.
	//
	//		For non-URL tests, if setUp and/or tearDown are provided, then any previous setUp and/or
	//		tearDown functions for the group are replaced as given. You may affect just setUp and/or tearDown
	//		for a group and not provide/add any tests by providing falsy for the test argument.
	// example:
	// | var
	// |	t1= function(t) {
	// |		// this is a test
	// |		// t will be set to DOH when the test is executed by DOH
	// |		// etc.
	// |	},
	// |
	// |	t2= {
	// |		// this is a test fixture and may be passed as a test
	// |
	// |		// runTest is always required...
	// |		runTest: function(t){
	// |			// the test...
	// |		},
	// |
	// |		// name is optional, but recommended...
	// |		name:"myTest",
	// |
	// |		// preamble is optional...
	// |		setUp: function(){
	// |			// will be executed by DOH prior to executing the test
	// |		},
	// |
	// |		// postscript is optional...
	// |		tearDown: function(){ // op
	// |			// will be executed by DOH after executing the test
	// |		}
	// |	}
	// |
	// |	t3= [
	// |		// this is a vector of tests...
	// |		t1, t2
	// |	],
	// |
	// |	t4= {
	// |		// this is a map from test name to test or test fixture
	// |		t5: function(t){
	// |			// etc.
	// |		},
	// |
	// |		t6: {
	// |			runTest: function(t){
	// |			// etc.
	// |			}
	// |			// name will be automatically added as "t6"
	// |		}
	// |	},
	// |
	// |	aSetup: function(){
	// |		// etc.
	// |	},
	// |
	// |	aTearDown: function(){
	// |		// etc.
	// |	};
	// | // (test); note, can't provide setup/tearDown without a group
	// | doh.register(t1);
	// |
	// | // (group, test, setUp, tearDown) test and/or setUp and/or tearDown can be missing
	// | doh.register("myGroup", 0, aSetUp, aTearDown);
	// | doh.register("myGroup", t1, aSetUp, aTearDown);
	// | doh.register("myGroup", t1, aSetUp);
	// | doh.register("myGroup", t1, 0, aTearDown);
	// | doh.register("myGroup", t1);
	// |
	// | // various kinds of test arguments are allowed
	// | doh.register("myGroup", t2);
	// | doh.register("myGroup", t3);
	// | doh.register("myGroup", t4);
	// |
	// | // add a perf test
	// | doh.register("myGroup!perf", t1);
	// |
	// | // add a perf test with an AMD module identifier
	// | doh.register("path/to/my/module!myGroup!perf", t1);
	//
	//	doh.register also supports Dojo, v1.6- signature (group, test, type), although this signature is deprecated.
	};
	=====*/

	function getTypeId(a){
		if(a instanceof Array){
			return "a";
		}else if(typeof a == "function"){
			return "f";
		}else if(typeof a == "number"){
			return "n";
		}else if(typeof a == "string"){
			if(a in doh._testTypes){
				return "st";
			}else if(/\(/.test(a)){
				return "sf";
			}else{
				return "s";
			}
		}else{
			return "o";
		}
	}

	var
		arity = arguments.length,
		search = typeSigs[arity-1],
		sig = [],
		i;
	for(i =0; i<arity; i++){
		sig.push(getTypeId(arguments[i]));
	}
	sig = sig.join("-");
	for(i=0; i<search.length; i+= 2){
		if(search[i]==sig){
			search[i+1](arguments, a1, a2, a3, a4, a5);
			return;
		}
	}
	illegalRegister(arguments);
};

doh.registerDocTests = function(module){
	// summary:
	//		Get all the doctests from the given module and register each of them
	//		as a single test case here.

	var docTest = new dojox.testing.DocTest();
	var docTests = docTest.getTests(module);
	var len = docTests.length;
	var tests = [];
	for (var i=0; i<len; i++){
		var test = docTests[i];
		// Extract comment on first line and add to test name.
		var comment = "";
		if (test.commands.length && test.commands[0].indexOf("//")!=-1) {
			var parts = test.commands[0].split("//");
			comment = ", "+parts[parts.length-1]; // Get all after the last //, so we don't get trapped by http:// or alikes :-).
		}
		tests.push({
			runTest: (function(test){
				return function(t){
					var r = docTest.runTest(test.commands, test.expectedResult);
					t.assertTrue(r.success);
				};
			})(test),
			name:"Line "+test.line+comment
		}
		);
	}
	this.register("DocTests: "+module, tests);
};

//
// deprecated v1.6- register API follows
//

doh.registerTest = function(/*String*/ group, /*Array||Function||Object*/ test, /*String*/ type){
	// summary:
	//		Deprecated.  Use doh.register(group/type, test) instead
	doh.register(group + (type ? "!" + type : ""), test);
};

doh.registerGroup = function(/*String*/ group, /*Array||Function||Object*/ tests, /*Function*/ setUp, /*Function*/ tearDown, /*String*/ type){
	// summary:
	//		Deprecated.  Use doh.register(group/type, tests, setUp, tearDown) instead
	var args = [(group ? group : "") + (type ? "!" + type : ""), tests];
	setUp && args.push(setUp);
	tearDown && args.push(tearDown);
	doh.register.apply(doh, args);
};

doh.registerTestNs = function(/*String*/ group, /*Object*/ ns){
	// summary:
	//		Deprecated.  Use doh.register(group, ns) instead
	doh.register(group, ns);
};

doh.registerTests = function(/*String*/ group, /*Array*/ testArr, /*String*/ type){
	// summary:
	//		Deprecated.  Use doh.register(group/type, testArr) instead
	doh.register(group + (type ? "!" + type : ""), testArr);
};

doh.registerUrl = function(/*String*/ group, /*String*/ url, /*Integer*/ timeout, /*String*/ type, /*Object*/ args){
	// summary:
	//		Deprecated.  Use doh.register(group/type, url, timeout) instead
	doh.register(group + (type ? "!" + type : ""), url+"", timeout || 10000, args || {});
};

//
// Assertions and In-Test Utilities
//
doh.t = doh.assertTrue = function(/*Object*/ condition, /*String?*/ hint){
	// summary:
	//		is the passed item "truthy"?
	if(arguments.length < 1){
		throw new doh._AssertFailure("assertTrue failed because it was not passed at least 1 argument");
	}
	//if(dojo.isString(condition) && condition.length){
	//	return true;
	//}
	if(!eval(condition)){
		throw new doh._AssertFailure("assertTrue('" + condition + "') failed", hint);
	}
};

doh.f = doh.assertFalse = function(/*Object*/ condition, /*String?*/ hint){
	// summary:
	//		is the passed item "falsey"?
	if(arguments.length < 1){
		throw new doh._AssertFailure("assertFalse failed because it was not passed at least 1 argument");
	}
	if(eval(condition)){
		throw new doh._AssertFailure("assertFalse('" + condition + "') failed", hint);
	}
};

doh.e = doh.assertError = function(/*Error object*/expectedError, /*Object*/scope, /*String*/functionName, /*Array*/args, /*String?*/ hint){
	// summary:
	//		Test for a certain error to be thrown by the given function.
	// example:
	//		t.assertError(dojox.data.QueryReadStore.InvalidAttributeError, store, "getValue", [item, "NOT THERE"]);
	//		t.assertError(dojox.data.QueryReadStore.InvalidItemError, store, "getValue", ["not an item", "NOT THERE"]);
	try{
		scope[functionName].apply(scope, args);
	}catch (e){
		if(e instanceof expectedError){

			return true;
		}else{
			throw new doh._AssertFailure("assertError() failed:\n\texpected error\n\t\t"+expectedError+"\n\tbut got\n\t\t"+e+"\n\n", hint);
		}
	}
	throw new doh._AssertFailure("assertError() failed:\n\texpected error\n\t\t"+expectedError+"\n\tbut no error caught\n\n", hint);
};

doh.is = doh.assertEqual = function(/*Object*/ expected, /*Object*/ actual, /*String?*/ hint, doNotThrow){
	// summary:
	//		are the passed expected and actual objects/values deeply
	//		equivalent?

	// Compare undefined always with three equal signs, because undefined==null
	// is true, but undefined===null is false.
	if((expected === undefined)&&(actual === undefined)){
		return true;
	}
	if(arguments.length < 2){
		throw doh._AssertFailure("assertEqual failed because it was not passed 2 arguments");
	}
	if((expected === actual)||(expected == actual)||
				( typeof expected == "number" && typeof actual == "number" && isNaN(expected) && isNaN(actual) )){

		return true;
	}
	if( (this.isArray(expected) && this.isArray(actual))&&
		(this._arrayEq(expected, actual)) ){
		return true;
	}
	if( ((typeof expected == "object")&&((typeof actual == "object")))&&
		(this._objPropEq(expected, actual)) ){
		return true;
	}
	if (doNotThrow) {
		return false;
	}
	throw new doh._AssertFailure("assertEqual() failed:\n\texpected\n\t\t"+expected+"\n\tbut got\n\t\t"+actual+"\n\n", hint);
};

doh.isNot = doh.assertNotEqual = function(/*Object*/ notExpected, /*Object*/ actual, /*String?*/ hint){
	// summary:
	//		are the passed notexpected and actual objects/values deeply
	//		not equivalent?

	// Compare undefined always with three equal signs, because undefined==null
	// is true, but undefined===null is false.
	if((notExpected === undefined)&&(actual === undefined)){
				throw new doh._AssertFailure("assertNotEqual() failed: not expected |"+notExpected+"| but got |"+actual+"|", hint);
	}
	if(arguments.length < 2){
		throw doh._AssertFailure("assertEqual failed because it was not passed 2 arguments");
	}
	if((notExpected === actual)||(notExpected == actual)){
				throw new doh._AssertFailure("assertNotEqual() failed: not expected |"+notExpected+"| but got |"+actual+"|", hint);
	}
	if( (this.isArray(notExpected) && this.isArray(actual))&&
		(this._arrayEq(notExpected, actual)) ){
		throw new doh._AssertFailure("assertNotEqual() failed: not expected |"+notExpected+"| but got |"+actual+"|", hint);
	}
	if( ((typeof notExpected == "object")&&((typeof actual == "object"))) ){
		var isequal = false;
		try{
			isequal = this._objPropEq(notExpected, actual);
		}catch(e){
			if(!(e instanceof doh._AssertFailure)){
				throw e; // other exceptions, just throw it
			}
		}
		if(isequal){
				throw new doh._AssertFailure("assertNotEqual() failed: not expected |"+notExpected+"| but got |"+actual+"|", hint);
		}
	}
	return true;
};

doh._arrayEq = function(expected, actual){
	if(expected.length != actual.length){ return false; }
	// FIXME: we're not handling circular refs. Do we care?
	for(var x=0; x<expected.length; x++){
		if(!doh.assertEqual(expected[x], actual[x], 0, true)){ return false; }
	}
	return true;
};

doh._objPropEq = function(expected, actual){
	// Degenerate case: if they are both null, then their "properties" are equal.
	if(expected === null && actual === null){
		return true;
	}
	// If only one is null, they aren't equal.
	if(expected === null || actual === null){
		return false;
	}
	if(expected instanceof Date){
		return actual instanceof Date && expected.getTime()==actual.getTime();
	}
	var x;
	// Make sure ALL THE SAME properties are in both objects!
	for(x in actual){ // Lets check "actual" here, expected is checked below.
		if(expected[x] === undefined){
			return false;
		}
	}

	for(x in expected){
		if(!doh.assertEqual(expected[x], actual[x], 0, true)){
			return false;
		}
	}
	return true;
};

//
// Runner-Wrapper
//

doh._setupGroupForRun = function(/*String*/ groupName){
	var tg = this._groups[groupName];
	this.debug(this._line);
	this.debug("GROUP", "\""+groupName+"\"", "has", tg.length, "test"+((tg.length > 1) ? "s" : "")+" to run");
	doh._groupStarted(groupName);
};

doh._handleFailure = function(groupName, fixture, e){
	// this.debug("FAILED test:", fixture.name);
	// mostly borrowed from JUM
	this._groups[groupName].failures++;
	var out = "";
	if(e instanceof this._AssertFailure){
		this._failureCount++;
		if(e["fileName"]){ out += e.fileName + ':'; }
		if(e["lineNumber"]){ out += e.lineNumber + ' '; }
		out += e.message;
		this.error("\t_AssertFailure:", out);
	}else{
		this._errorCount++;
		this.error("\tError:", e.message || e); // printing Error on IE9 (and other browsers?) yields "[Object Error]"
	}
	if(fixture.runTest["toSource"]){
		var ss = fixture.runTest.toSource();
		this.debug("\tERROR IN:\n\t\t", ss);
	}else{
		this.debug("\tERROR IN:\n\t\t", fixture.runTest);
	}
	if(e.rhinoException){
		e.rhinoException.printStackTrace();
	}else if(e.javaException){
		e.javaException.printStackTrace();
	}
};

doh._runPerfFixture = function(/*String*/groupName, /*Object*/fixture){
	// summary:
	//		This function handles how to execute a 'performance' test
	//		which is different from a straight UT style test.  These
	//		will often do numerous iterations of the same operation and
	//		gather execution statistics about it, like max, min, average,
	//		etc.	It makes use of the already in place DOH deferred test
	//		handling since it is a good idea to put a pause in between each
	//		iteration to allow for GC cleanup and the like.
	// groupName:
	//		The test group that contains this performance test.
	// fixture:
	//		The performance test fixture.
	var tg = this._groups[groupName];
	fixture.startTime = new Date();

	// Perf tests always need to act in an async manner as there is a
	// number of iterations to flow through.
	var def = new doh.Deferred();
	tg.inFlight++;
	def.groupName = groupName;
	def.fixture = fixture;

	var threw = false;
	def.addErrback(function(err){
		doh._handleFailure(groupName, fixture, err);
		threw = true;
	});

	// Set up the finalizer.
	var retEnd = function(){
		if(fixture["tearDown"]){ fixture.tearDown(doh); }
		tg.inFlight--;
		if((!tg.inFlight)&&(tg.iterated)){
			doh._groupFinished(groupName, !tg.failures);
		}
		doh._testFinished(groupName, fixture, !threw);
		if(doh._paused){
			doh.run();
		}
	};

	// Since these can take who knows how long, we don't want to timeout
	// unless explicitly set
	var timer;
	var to = fixture.timeout;
	if(to > 0) {
		timer = setTimeout(function(){
			def.errback(new Error("test timeout in "+fixture.name.toString()));
		}, to);
	}

	// Set up the end calls to the test into the deferred we'll return.
	def.addBoth(function(){
		if(timer){
			clearTimeout(timer);
		}
		retEnd();
	});

	// Okay, now set up the timing loop for the actual test.
	// This is down as an async type test where there is a delay
	// between each execution to allow for GC time, etc, so the GC
	// has less impact on the tests.
	var res = fixture.results;
	res.trials = [];

	// Try to figure out how many calls are needed to hit a particular threshold.
	var itrDef = doh._calcTrialIterations(groupName, fixture);
	itrDef.addErrback(function(err){
		fixture.endTime = new Date();
		def.errback(err);
	});

	// Blah, since tests can be deferred, the actual run has to be deferred until after
	// we know how many iterations to run.  This is just plain ugly.
	itrDef.addCallback(function(iterations){
		if(iterations){
			var countdown = fixture.trialIterations;
			doh.debug("TIMING TEST: [" + fixture.name +
						"]\n\t\tITERATIONS PER TRIAL: " +
						iterations + "\n\tTRIALS: " +
						countdown);

			// Figure out how many times we want to run our 'trial'.
			// Where each trial consists of 'iterations' of the test.

			var trialRunner = function() {
				// Set up our function to execute a block of tests
				var start = new Date();
				var tTimer = new doh.Deferred();

				var tState = {
					countdown: iterations
				};
				var testRunner = function(state){
					while(state){
						try{
							state.countdown--;
							if(state.countdown){
								var ret = fixture.runTest(doh);
								if(ret && ret.addCallback){
									// Deferreds have to be handled async,
									// otherwise we just keep looping.
									var atState = {
										countdown: state.countdown
									};
									ret.addCallback(function(){
										testRunner(atState);
									});
									ret.addErrback(function(err) {
										doh._handleFailure(groupName, fixture, err);
										fixture.endTime = new Date();
										def.errback(err);
									});
									state = null;
								}
							}else{
								tTimer.callback(new Date());
								state = null;
							}
						}catch(err){
							fixture.endTime = new Date();
							tTimer.errback(err);
						}
					}
				};
				tTimer.addCallback(function(end){
					// Figure out the results and try to factor out function call costs.
					var tResults = {
						trial: (fixture.trialIterations - countdown),
						testIterations: iterations,
						executionTime: (end.getTime() - start.getTime()),
						average: (end.getTime() - start.getTime())/iterations
					};
					res.trials.push(tResults);
					doh.debug("\n\t\tTRIAL #: " +
								tResults.trial + "\n\tTIME: " +
								tResults.executionTime + "ms.\n\tAVG TEST TIME: " +
								(tResults.executionTime/tResults.testIterations) + "ms.");

					// Okay, have we run all the trials yet?
					countdown--;
					if(countdown){
						setTimeout(trialRunner, fixture.trialDelay);
					}else{
						// Okay, we're done, lets compute some final performance results.
						var t = res.trials;



						// We're done.
						fixture.endTime = new Date();
						def.callback(true);
					}
				});
				tTimer.addErrback(function(err){
					fixture.endTime = new Date();
					def.errback(err);
				});
				testRunner(tState);
			};
			trialRunner();
		}
	});

	// Set for a pause, returned the deferred.
	if(def.fired < 0){
		doh.pause();
	}
	return def;
};

doh._calcTrialIterations =	function(/*String*/ groupName, /*Object*/ fixture){
	// summary:
	//		This function determines the rough number of iterations to
	//		use to reach a particular MS threshold.  This returns a deferred
	//		since tests can theoretically by async.  Async tests aren't going to
	//		give great perf #s, though.
	//		The callback is passed the # of iterations to hit the requested
	//		threshold.
	// fixture:
	//		The test fixture we want to calculate iterations for.
	var def = new doh.Deferred();
	var calibrate = function () {
		var testFunc = doh.hitch(fixture, fixture.runTest);

		// Set the initial state.	We have to do this as a loop instead
		// of a recursive function.	Otherwise, it blows the call stack
		// on some browsers.
		var iState = {
			start: new Date(),
			curIter: 0,
			iterations: 5
		};
		var handleIteration = function(state){
			while(state){
				if(state.curIter < state.iterations){
					try{
						var ret = testFunc(doh);
						if(ret && ret.addCallback){
							var aState = {
								start: state.start,
								curIter: state.curIter + 1,
								iterations: state.iterations
							};
							ret.addCallback(function(){
								handleIteration(aState);
							});
							ret.addErrback(function(err) {
								fixture.endTime = new Date();
								def.errback(err);
							});
							state = null;
						}else{
							state.curIter++;
						}
					}catch(err){
						fixture.endTime = new Date();
						def.errback(err);
						return;
					}
				}else{
					var end = new Date();
					var totalTime = (end.getTime() - state.start.getTime());
					if(totalTime < fixture.trialDuration){
						var nState = {
							iterations: state.iterations * 2,
							curIter: 0
						};
						state = null;
						setTimeout(function(){
							nState.start = new Date();
							handleIteration(nState);
						}, 50);
					}else{
						var itrs = state.iterations;
						setTimeout(function(){def.callback(itrs)}, 50);
						state = null;
					}
				}
			}
		};
		handleIteration(iState);
	};
	setTimeout(calibrate, 10);
	return def;
};

doh._runRegFixture = function(/*String*/groupName, /*Object*/fixture){
	// summary:
	//		Function to run a generic doh test.  These are not
	//		specialized tests, like performance groups and such.
	// groupName:
	//		The groupName of the test.
	// fixture:
	//		The test fixture to execute.
	var tg = this._groups[groupName];
	fixture.startTime = new Date();
	var ret = fixture.runTest(this);
	fixture.endTime = new Date();
	// if we get a deferred back from the test runner, we know we're
	// gonna wait for an async result. It's up to the test code to trap
	// errors and give us an errback or callback.
	if(ret && ret.addCallback){
		tg.inFlight++;
		ret.groupName = groupName;
		ret.fixture = fixture;

		var threw = false;
		ret.addErrback(function(err){
			doh._handleFailure(groupName, fixture, err);
			threw = true;
		});

		var retEnd = function(){

			if(fixture["tearDown"]){ fixture.tearDown(doh); }
			tg.inFlight--;
			doh._testFinished(groupName, fixture, !threw);
			if((!tg.inFlight)&&(tg.iterated)){
				doh._groupFinished(groupName, !tg.failures);
			}
			if(doh._paused){
				doh.run();
			}
		};

		var timeoutFunction = function(){
			fixture.endTime = new Date();
			ret.errback(new Error("test timeout in "+fixture.name.toString()));
		};

		var timer = setTimeout(function(){ timeoutFunction(); }, fixture["timeout"]||1000);

		ret.addBoth(function(){
			timeoutFunction = function(){}; // in IE8, the clearTimeout does not always stop the timer, so clear the function as well
			clearTimeout(timer);
			fixture.endTime = new Date();
			retEnd();
		});
		if(ret.fired < 0){
			doh.pause();
		}
		return ret;
	}
};

doh._runFixture = function(groupName, fixture){
	var tg = this._groups[groupName];
	this._testStarted(groupName, fixture);
	var threw = false;
	var err = null;
	// run it, catching exceptions and reporting them
	try{
		// let doh reference "this.group.thinger..." which can be set by
		// another test or group-level setUp function
		fixture.group = tg;
		// only execute the parts of the fixture we've got

		if(fixture["setUp"]){ fixture.setUp(this); }
		if(fixture["runTest"]){		// should we error out of a fixture doesn't have a runTest?
			if(fixture.testType === "perf"){
				// Always async deferred, so return it.
				return doh._runPerfFixture(groupName, fixture);
			}else{
				// May or may not by async.
				var ret = doh._runRegFixture(groupName, fixture);
				if(ret){
					return ret;
				}
			}
		}
		if(fixture["tearDown"]){ fixture.tearDown(this); }
	}catch(e){
		// should try to tear down regardless whether test passed or failed...
		try{
			if(fixture["tearDown"]){ fixture.tearDown(this); }
		}catch(e){
			this.debug("Error tearing down test: "+e.message);
		}
		threw = true;
		err = e;
		if(!fixture.endTime){
			fixture.endTime = new Date();
		}
	}
	var d = new doh.Deferred();
	setTimeout(this.hitch(this, function(){
		if(threw){
			this._handleFailure(groupName, fixture, err);
		}
		this._testFinished(groupName, fixture, !threw);

		if((!tg.inFlight)&&(tg.iterated)){
			doh._groupFinished(groupName, !tg.failures);
		}else if(tg.inFlight > 0){
			setTimeout(this.hitch(this, function(){
				doh.runGroup(groupName);
			}), 100);
			this._paused = true;
		}
		if(doh._paused){
			doh.run();
		}
	}), 30);
	doh.pause();
	return d;
};

doh.runGroup = function(/*String*/ groupName, /*Integer*/ idx){
	// summary:
	//		runs the specified test group

	// the general structure of the algorithm is to run through the group's
	// list of doh, checking before and after each of them to see if we're in
	// a paused state. This can be caused by the test returning a deferred or
	// the user hitting the pause button. In either case, we want to halt
	// execution of the test until something external to us restarts it. This
	// means we need to pickle off enough state to pick up where we left off.

	// FIXME: need to make fixture execution async!!

	idx = idx || 0;
	var tg = this._groups[groupName];
	if(tg.skip === true){ return; }
	if(this.isArray(tg)){
		if(tg.iterated===undefined){
			tg.iterated = false;
			tg.inFlight = 0;
			tg.failures = 0;
			this._setupGroupForRun(groupName);
			if(tg["setUp"]){ tg.setUp(this); }
		}
		for(var y=idx; y<tg.length; y++){
			if(this._paused){
				this._currentTest = y;
				// this.debug("PAUSED at:", tg[y].name, this._currentGroup, this._currentTest);
				return;
			}
			doh._runFixture(groupName, tg[y]);
			if(this._paused){
				this._currentTest = y+1;
				if(this._currentTest == tg.length){ // RCG--don't think we need this; the next time through it will be taken care of
					tg.iterated = true;
				}
				// this.debug("PAUSED at:", tg[y].name, this._currentGroup, this._currentTest);
				return;
			}
		}
		tg.iterated = true;
		if(!tg.inFlight){
			if(tg["tearDown"]){ tg.tearDown(this); }
			doh._groupFinished(groupName, !tg.failures);
		}
	}
};

doh._onEnd = function(){};

doh._report = function(){
	// summary:
	//		a private method to be implemented/replaced by the "locally
	//		appropriate" test runner

	// this.debug("ERROR:");
	// this.debug("\tNO REPORTING OUTPUT AVAILABLE.");
	// this.debug("\tIMPLEMENT doh._report() IN YOUR TEST RUNNER");

	this.debug(this._line);
	this.debug("| TEST SUMMARY:");
	this.debug(this._line);
	this.debug("\t", this._testCount, "tests in", this._groupCount, "groups");
	this.debug("\t", this._errorCount, "errors");
	this.debug("\t", this._failureCount, "failures");
};

doh.togglePaused = function(){
	this[(this._paused) ? "run" : "pause"]();
};

doh.pause = function(){
	// summary:
	//		halt test run. Can be resumed.
	this._paused = true;
};

doh.run = function(){
	// summary:
	//		begins or resumes the test process.
	
	this._paused = false;
	var cg = this._currentGroup;
	var ct = this._currentTest;
	var found = false;
	if(!cg){
		this._init(); // we weren't paused
		found = true;
	}
	this._currentGroup = null;
	this._currentTest = null;
	for(var x in this._groups){
		if(
			( (!found)&&(x == cg) )||( found )
		){
			if(this._paused){ return; }
			this._currentGroup = x;
			if(!found){
				found = true;
				this.runGroup(x, ct);
			}else{
				this.runGroup(x);
			}
			if(this._paused){ return; }
		}
	}
	this._currentGroup = null;
	this._currentTest = null;
	this._paused = false;
	this._onEnd();
	this._report();
};

doh.runOnLoad = function(){
	dojo.ready(doh, "run");
};

return doh;

});

// backcompat hack: if in the browser, then loading doh/runner implies loading doh/_browserRunner. This is the
// behavior of 1.6- and is leveraged on many test documents that dojo.require("doh.runner"). Note that this
// hack will only work in synchronous mode; but if you're not in synchronous mode, you don't care about this.
// Remove for 2.0.
if (typeof window!="undefined" && typeof location!="undefined" && typeof document!="undefined" && window.location==location && window.document==document) {
	require(["doh/_browserRunner"]);
}
