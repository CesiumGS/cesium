// TODO: FIXME: Refactor this to use D.O.H. instead of its own assertions

dojo.require("dojox.flash");

var flashLoaded = false;
var pageLoaded = false;
var testXML = testBook = null;

function flashReady(){
	console.debug("flashReady");
	if (flashLoaded) {
	  return; // prevent double loads
	}
	
	flashLoaded = true;
	
	if(isReady()){
		run();
	}
}

function pageReady(){
	console.debug("pageReady");
	if (pageLoaded) {
	  return; // prevent double loads
	}
	
	pageLoaded = true;
	
	loadResources();
	
	if(isReady()){
		run();
	}
}

function isReady(){
	return testXML && testBook && pageLoaded && flashLoaded;
}

function loadResources(){
	console.debug("Trying to load resources");
	
	var d = dojo.xhrGet({
		url: "../../storage/tests/resources/testXML.xml",
		handleAs: "text"
	});

	d.addCallback(function(results){
		console.debug("testXML loaded");
		testXML = results;
		if(isReady()){
			run();
		}
	});

	d.addErrback(function(error){
		console.debug("Unable to load testXML.xml: " + error);
	});
	
	d = dojo.xhrGet({
		url: "../../storage/tests/resources/testBook.txt",
		handleAs: "text"
	});

	d.addCallback(function(results){
		console.debug("testBook loaded");
		testBook = results;
		if(isReady()){
			run();
		}
	});

	d.addErrback(function(error){
		console.debug("Unable to load testXML.xml: " + error);
	});
}

function run(){
	console.debug("run");
	try{
		var correct, actual;
		
		console.debug("Setting simple message...");
		correct = "hello world";
		dojox.flash.comm.setMessage(correct);
		actual = dojox.flash.comm.getMessage();
		assert(correct, actual, "Setting/getting simple message did not work");
		chop(correct);
	
		console.debug("Setting message with evil characters...");
		// our correct and actual values get tricky when we have double back
		// slashes; do a trick so that they can be compared easier
		var doubleSlash = "\\";
		doubleSlash = doubleSlash.charAt(0);
		correct = "hello world\n\n\nasdfasdf!@#$@#%^[]{}&amp;<xml>" + doubleSlash
						+ "<div>$%^&%^&*^&()<><><>,./;\0\r\f\'][`~=\"+-]\\0MORE!\n\rLESS";
		var putSize = dojox.flash.comm.setMessage(correct);
		assert(putSize, correct.length, "Failed putting. Correct length = "
						+ correct.length + ", Flash length = " + putSize);
		dojox.flash.comm.setMessage(correct);
		actual = dojox.flash.comm.getMessage();
		assert(correct, actual, "Setting/getting message with evil characters did not work");
		chop(correct);
	
		console.debug("Setting testXML...");
		correct = testXML;
		dojox.flash.comm.setMessage(correct);
		actual = dojox.flash.comm.getMessage();
		assert(correct, actual, "Setting/getting testXML did not work");
		chop(correct);
		
		console.debug("Setting testBook(~300K)...");
		correct = testBook;
		dojox.flash.comm.setMessage(correct);
		actual = dojox.flash.comm.getMessage();
		assert(correct, actual, "Setting/getting testBook did not work");
	
		console.debug("Setting testBook 3 times (~900K)...");
		correct = testBook + testBook + testBook;
		dojox.flash.comm.setMessage(correct);
		actual = dojox.flash.comm.getMessage();
		assert(correct, actual, "Setting/getting testBook X 3 did not work");
		
		console.debug("Setting JSON...");
		var obj = {type: "car", color: "red", model: "Ford", year: "2008",
					features: ["A/C", "automatic", "4-wheel drive"]};
		correct = dojo.toJson(obj, true);
		dojox.flash.comm.setMessage(correct);
		actual = dojox.flash.comm.getMessage();
		assert(correct, actual, "Setting/getting JSON did not work");
		chop(correct);
		
		console.debug("Calling method that takes multiple values...");
		actual = dojox.flash.comm.multipleValues("key", "value", "namespace");
		assert("namespacekeyvalue", actual, "Setting/getting multiple values did not work");
		
		var allPassed = document.createElement("p");
		allPassed.style.backgroundColor = "green";
		allPassed.style.color = "white";
		allPassed.style.fontSize = "24pt";
		allPassed.appendChild(document.createTextNode("All tests passed"));
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(allPassed);
	}catch(e){
		console.debug(e.message || e);
	}
}

function chop(testString){
	console.debug("chopping '" + testString + "'");
	for(var i = 0; i < Math.min(testString.length, 100); i++){
		//console.debug("index = " + i);
		testSlice(testString, 0, i+1);
	}
}
 
function testSlice( testString, from, to){
	var putSize = dojox.flash.comm.setMessageSlice( testString, from, to);
	var actual = dojox.flash.comm.getMessage();
	var correct = testString.slice(from, to);
	
	var msg = "Put a string with " + testString.length
					+ " chars, but it got with " + putSize + " chars in the Flash layer";
	assert(putSize, testString.length, msg);
	
	msg = "I got '" + actual + "' instead of '" + correct +"'";
	assert(correct, actual, msg);
}

function assert(correct, actual, msg){
	//alert("correct="+correct+",\n\nactual="+actual);
	if(correct != actual){
	  var failed = document.createElement("p");
		failed.style.backgroundColor = "red";
		failed.style.color = "white";
		failed.style.fontSize = "24pt";
		failed.appendChild(document.createTextNode("Test failed: " + msg));
		var body = document.getElementsByTagName("body")[0];
		body.appendChild(failed);
		
		throw new Error("ASSERTION FAILED: " + msg);
	}else{
		//console.debug("Assertion passed");
	}
}

console.debug("adding listeners...");
dojox.flash.addLoadedListener(flashReady);
dojox.flash.setSwf("TestFlash.swf", false);
dojo.connect(dojo, "loaded", pageReady);