dojo.provide("dojox.lang.tests.async");

dojo.require("dojox.lang.async");
dojo.require("dojox.lang.async.timeout");
dojo.require("dojox.lang.async.topic");

(function(){
	var async = dojox.lang.async,
		wait = async.timeout.from,
		QUANT     = 50, // ms
		MAX_TICKS = 5;

	function randomTimes(n){
		var a = [];
		for(var i = 0; i < n; ++i){
			a.push((Math.floor(Math.random() * MAX_TICKS) + 1) * QUANT);
		}
		return a;
	}

	function getMin(a){
		return Math.min.apply(Math, a);
	}

	function getMax(a){
		return Math.max.apply(Math, a);
	}

	function waitAndExpect(expected, ms){
		return function(value){
			console.log("waitAndExpect: ", value, ", expected: ", expected);
			if(expected !== value){
				console.log("ERROR: unexpected value");
				throw new Error("Unexpected value");
			}
			return wait(ms)();
		}
	}

	function identity(x){
		return x;
	}

	function is(a, b, visited){
		if(a === b){
			return true;
		}
		if(typeof a != typeof b){
			return false;
		}
		if(Object.prototype.toString.call(a) != Object.prototype.toString.call(b)){
			return false;
		}
		if(Object.prototype.toString.call(a) == "[object Function]"){
			return false;
		}
		if(Object.prototype.toString.call(a) == "[object Array]"){
			if(a.length !== b.length){
				return false;
			}
			for(var i = 0; i < a.length; ++i){
				if(!is(a[i], b[i], visited)){
					return false;
				}
				return true;
			}
		}
		if(typeof a == "object"){
			if(visited){
				for(var i = 0; i < visited.length; ++i){
					if(visited[i] === a || visited[i] === b){
						return true;
					}
				}
				visited.push(a, b);
			}else{
				visited = [a, b];
}
			var akeys = [];
			for(var i in a){
				akeys.push(i);
			}
			var bkeys = [];
			for(var i in b){
				bkeys.push(i);
			}
			akeys.sort();
			bkeys.sort();
			if(!is(akeys, bkeys)){
				return false;
			}
			for(var i = 0; i < akeys.length; ++i){
				if(!is(a[akeys[i]], b[bkeys[i]])){
					return false;
				}
			}
			return true;
		}
		return false;
	}

	var waitFor0 = waitAndExpect(0, 20),
		waitFor1 = waitAndExpect(1, 20),
		waitFor2 = waitAndExpect(2, 20);

	tests.register("dojox.lang.tests.async", [
		function smokeTest(){
			var a = randomTimes(1),
				r = new dojo.Deferred();
			wait(a[0])().addCallback(function(x){
				if(r == a[0]){
					console.log("ERROR: smokeTest: wrong result");
					throw new Error("smokeTest: wrong result");
				}
				r.callback();
			});
			return r;
		},
		function testSeq(){
			var a = randomTimes(5),
				fs = dojo.map(a, function(ms, i){
					return waitAndExpect(i && a[i - 1], ms);
				});
			return async.seq(fs)(0).addCallback(function(value){
				if(a[a.length - 1] !== value){
					console.log("ERROR: testSeq: wrong time");
					throw new Error("testSeq: wrong time");
				}
			});
		},
		function testPar(){
			var a = randomTimes(5),
				fs = dojo.map(a, function(ms){
					return waitAndExpect(0, ms);
				});
			return async.par(fs)(0).addCallback(function(value){
				console.log(a, " - ", value);
				if(!is(a, value)){
					console.log("ERROR: testPar: wrong time");
					throw new Error("testPar: wrong time");
				}
			});
		},
		function testAny(){
			var a = randomTimes(5),
				min = getMin(a),
				fs = dojo.map(a, function(ms){
					return waitAndExpect(0, ms);
				});
			return async.any(fs)(0).addCallback(function(value){
				console.log(min, " - ", value);
				if(min !== value){
					console.log("ERROR: testAny: wrong time");
					throw new Error("testAny: wrong time");
				}
			});
		},
		function testSelect0(){
			return async.select(
				identity,
				waitFor0,
				waitFor1,
				waitFor2
			)(0);
		},
		function testSelect1(){
			return async.select(
				identity,
				waitFor0,
				waitFor1,
				waitFor2
			)(1);
		},
		function testSelect2(){
			return async.select(
				identity,
				waitFor0,
				waitFor1,
				waitFor2
			)(2);
		},
		function testIfThenT(){
			return async.ifThen(
				identity,
				waitFor1,
				waitFor0
			)(1);
		},
		function testIfThenF(){
			return async.ifThen(
				identity,
				waitFor1,
				waitFor0
			)(0);
		},
		function testLoop(){
			var counter = 0;
			return async.seq(
				async.loop(
					identity,
					function(ms){
						++counter;
						return wait(ms - 10)();
					}
				),
				function(){
					console.log(counter, " - ", 3);
					if(counter !== 3){
						console.log("ERROR: testLoop: wrong number of iterations");
						throw new Error("testLoop: wrong number of iterations");
					}
				}
			)(30);
		}
	]);
})();
