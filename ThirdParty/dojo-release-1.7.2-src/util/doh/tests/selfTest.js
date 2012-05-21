define(["doh/runner"], function(doh) {


	doh.register("doh/selftest/lastTest", function(t){
		t.assertTrue(true);
	});

	var
	tObj1 = { a:0, b:1, c:true, d:false, e:{}, f:{a:"x"}, g:"", h:"hellp", i:null},
	tObj2 = { a:0, b:1, c:true, d:false, e:{}, f:{a:"x"}, g:"", h:"hellp", i:null}, // equal
	tObja = { a:1, b:1, c:true, d:false, e:{}, f:{a:"x"}, g:"", h:"hellp", i:null}, // delta a
	tObjb = { a:0, b:2, c:true, d:false, e:{}, f:{a:"x"}, g:"", h:"hellp", i:null}, // delta b
	tObjc = { a:0, b:1, c:false, d:false, e:{}, f:{a:"x"}, g:"", h:"hellp", i:null}, // delta c
	tObjd = { a:0, b:1, c:true, d:true, e:{}, f:{a:"x"}, g:"", h:"hellp", i:null}, // delta d
	tObje = { a:0, b:1, c:true, d:false, e:{a:"x"}, f:{a:"x"}, g:"", h:"hellp", i:null}, // delta e
	tObjf1= { a:0, b:1, c:true, d:false, e:{}, f:{a:"y"}, g:"", h:"hellp", i:null}, // delta f.a
	tObjf2= { a:0, b:1, c:true, d:false, e:{}, f:{b:"x"}, g:"", h:"hellp", i:null}, // delta f, property
	tObjg = { a:0, b:1, c:true, d:false, e:{}, f:{}, g:"x", h:"hellp", i:null}, // delta g
	tObjh = { a:0, b:1, c:true, d:false, e:{}, f:{}, g:"", h:"hello", i:null}, // delta h
	tObji = { a:0, b:1, c:true, d:false, e:{}, f:{}, g:"", h:"hellp", i:0}, // delta i

	tArray1 = [0, 1, true,	false, {},		{a:"x"}, "",  "hello", null],
	tArray2 = [0, 1, true,	false, {},		{a:"x"}, "",  "hello", null],
	tArraya = [1, 1, true,	false, {},		{a:"x"}, "",  "hellp", null], // delta a
	tArrayb = [0, 2, true,	false, {},		{a:"x"}, "",  "hellp", null], // delta b
	tArrayc = [0, 1, false, false, {},		{a:"x"}, "",  "hellp", null], // delta c
	tArrayd = [0, 1, true,	true,  {},		{a:"x"}, "",  "hellp", null], // delta d
	tArraye = [0, 1, true,	false, {a:"x"}, {a:"x"}, "",  "hellp", null], // delta e
	tArrayf1= [0, 1, true,	false, {},		{a:"y"}, "",  "hellp", null], // delta f.a
	tArrayf2= [0, 1, true,	false, {},		{b:"x"}, "",  "hellp", null], // delta f, property
	tArrayg = [0, 1, true,	false, {},		{},		 "x", "hellp", null], // delta g
	tArrayh = [0, 1, true,	false, {},		{},		 "",  "hello", null], // delta h
	tArrayi = [0, 1, true,	false, {},		{},		 "",  "hellp", 0]; // delta i


	doh.register("doh/asserts/pass", function(t){
		function check(method, args){
			t[method].apply(t, args);
		};

		check("assertTrue", [true]);
		check("assertTrue", [{}]);
		check("assertTrue", [1]);
		//check("assertTrue", ["hello"]);

		check("assertFalse", [false]);
		check("assertFalse", [0]);
		check("assertFalse", [null]);
		check("assertFalse", [undefined]);
		check("assertFalse", [(function(){})()]);

		check("assertEqual", [[], []]);
		check("assertEqual", [[1], [1]]);
		check("assertEqual", [[1,2], [1,2]]);
		check("assertEqual", [[1,2,3], [1,2,3]]);
		check("assertEqual", [tObj1, tObj1]);
		check("assertEqual", [tObj1, tObj2]);
		check("assertEqual", [tArray1, tArray2]);

		check("assertNotEqual", [tObj1, tObja]);
		check("assertNotEqual", [tObj1, tObjb]);
		check("assertNotEqual", [tObj1, tObjc]);
		check("assertNotEqual", [tObj1, tObjd]);
		check("assertNotEqual", [tObj1, tObje]);
		check("assertNotEqual", [tObj1, tObjf1]);
		check("assertNotEqual", [tObj1, tObjf2]);
		check("assertNotEqual", [tObj1, tObjg]);
		check("assertNotEqual", [tObj1, tObjh]);
		check("assertNotEqual", [tObj1, tObji]);

		check("assertNotEqual", [tArray1, tArraya]);
		check("assertNotEqual", [tArray1, tArrayb]);
		check("assertNotEqual", [tArray1, tArrayc]);
		check("assertNotEqual", [tArray1, tArrayd]);
		check("assertNotEqual", [tArray1, tArraye]);
		check("assertNotEqual", [tArray1, tArrayf1]);
		check("assertNotEqual", [tArray1, tArrayf2]);
		check("assertNotEqual", [tArray1, tArrayg]);
		check("assertNotEqual", [tArray1, tArrayh]);
		check("assertNotEqual", [tArray1, tArrayi]);
	});

	doh.register("doh/asserts/fail", function(t){
		function check(method, args){
			try{
				t[method].apply(t, args);
			}catch(e){
				t.assertTrue(true);
				return;
			}
			throw new doh._AssertFailure("failed: " + method);
		}
		check("assertFalse", [true]);
		check("assertFalse", [{}]);
		check("assertFalse", [1]);
		//check("assertFalse", ["hello"]);

		check("assertTrue", [false]);
		check("assertTrue", [0]);
		check("assertTrue", [null]);
		check("assertTrue", [undefined]);
		check("assertTrue", [(function(){})()]);

		check("assertNotEqual", [[], []]);
		check("assertNotEqual", [[1], [1]]);
		check("assertNotEqual", [[1,2], [1,2]]);
		check("assertNotEqual", [[1,2,3], [1,2,3]]);
		check("assertNotEqual", [tObj1, tObj1]);
		check("assertNotEqual", [tObj1, tObj2]);
		check("assertNotEqual", [tArray1, tArray2]);

		check("assertEqual", [tObj1, tObja]);
		check("assertEqual", [tObj1, tObjb]);
		check("assertEqual", [tObj1, tObjc]);
		check("assertEqual", [tObj1, tObjd]);
		check("assertEqual", [tObj1, tObje]);
		check("assertEqual", [tObj1, tObjf1]);
		check("assertEqual", [tObj1, tObjf2]);
		check("assertEqual", [tObj1, tObjg]);
		check("assertEqual", [tObj1, tObjh]);
		check("assertEqual", [tObj1, tObji]);

		check("assertEqual", [tArray1, tArraya]);
		check("assertEqual", [tArray1, tArrayb]);
		check("assertEqual", [tArray1, tArrayc]);
		check("assertEqual", [tArray1, tArrayd]);
		check("assertEqual", [tArray1, tArraye]);
		check("assertEqual", [tArray1, tArrayf1]);
		check("assertEqual", [tArray1, tArrayf2]);
		check("assertEqual", [tArray1, tArrayg]);
		check("assertEqual", [tArray1, tArrayh]);
		check("assertEqual", [tArray1, tArrayi]);
	});

	// test the highly overloaded doh.register signature
	var currentFixture;
	dojo.connect(doh, "_testStarted", function(groupId, fixture){
		currentFixture= fixture;
	});

	var lastId;
	function f(id, tid) {
		return function() {
			if(tid){
				doh.assertTrue(currentFixture.name==tid);
			}
			if(id){
				doh.assertTrue(lastId+1==id);
				lastId= id;
			}
		};
	};

	var hijack= doh._setupGroupForRun;
	doh._setupGroupForRun= function(groupName){
		lastId= 0;
		hijack.call(doh, groupName);
	};

	// note: the tests that are commented out below all have zero for the setup function
	// and a real teardown function. For now, this is


	doh.register("myGroup2-1", f(2), f(1), f(3));
	doh.register("myGroup2-2", f(2), f(1));
	doh.register("myGroup2-4", f(1));

	dohSelfTestLog5= f(2);
	dohSelfTestLog6= f(2);
	dohSelfTestLog7= f(1);
	dohSelfTestLog8= f(1);

	doh.register("myGroup2-5", "dohSelfTestLog5();", f(1), f(3));
	doh.register("myGroup2-6", "dohSelfTestLog6();", f(1));
	doh.register("myGroup2-8", "dohSelfTestLog8();");

	doh.register("myGroup2-9", [f(2), f(3)], f(1), f(4));
	doh.register("myGroup2-10", [f(2), f(3)], f(1));
	doh.register("myGroup2-12", [f(1), f(2)]);

	doh.register("myGroup2-13", {t1:f(0, "t1"), t2:f(0, "t2")}, f(1), f(2));
	doh.register("myGroup2-14", {t3:f(0, "t3"), t4:f(0, "t4")}, f(1));
	doh.register("myGroup2-16", {t7:f(0, "t7"), t8:f(0, "t8")});

	doh.register("myGroup2-17", {name:"t9", runTest:f(2, "t9")}, f(1), f(3));
	doh.register("myGroup2-18", {name:"t10", runTest:f(2, "t10")}, f(1));
	doh.register("myGroup2-20", {name:"t12", runTest:f(1, "t12")});

	doh.register("myGroup2-21", {name:"tx", runTest:f(3), setUp:f(2)}, f(1), f(4));
	doh.register("myGroup2-22", {name:"tx", runTest:f(3), setUp:f(2)}, f(1));
	doh.register("myGroup2-24", {name:"tx", runTest:f(2), setUp:f(1)});

	doh.register("myGroup2-25", {name:"tx", runTest:f(2), tearDown:f(3)}, f(1), f(4));
	doh.register("myGroup2-26", {name:"tx", runTest:f(2), tearDown:f(3)}, f(1));
	doh.register("myGroup2-28", {name:"tx", runTest:f(1), tearDown:f(2)});

	doh.register("myGroup2-29", {name:"tx", runTest:f(3), setUp:f(2), tearDown:f(4)}, f(1), f(5));
	doh.register("myGroup2-30", {name:"tx", runTest:f(3), setUp:f(2), tearDown:f(4)}, f(1));
	doh.register("myGroup2-32", {name:"tx", runTest:f(2), setUp:f(1), tearDown:f(3)});

	//v1.6- signatures
	//TODO

	doh.registerTestType("dohSelfTest", function(group, fixture){
	});
	// a stone-stupid async test
	doh.register("doh/async", [{
		name: "deferredSuccess",
		runTest: function(t){
			var d = new doh.Deferred();
			setTimeout(d.getTestCallback(function(){
				t.assertTrue(true);
				t.assertFalse(false);
			}), 50);
			return d;
		}
	},{
		name: "deferredFailure--SHOULD FAIL",
		runTest: function(t){
			console.log("running test that SHOULD FAIL");
			var d = new doh.Deferred();
			setTimeout(function(){
				d.errback(new Error("hrm..."));
			}, 50);
			return d;
		}
	},{
		name: "timeoutFailure--SHOULD FAIL",
		timeout: 50,
		runTest: function(t){
			console.log("running test that SHOULD FAIL");
			// timeout of 50
			var d = new doh.Deferred();
			setTimeout(function(){
				d.callback(true);
			}, 100);
			return d;
		}
	}]);

	doh.register("doh/selftest/lastTest", function(t){
		t.assertTrue(true);
	});
});
