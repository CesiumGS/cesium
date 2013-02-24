define(["../buildControl"], function(bc){
	//
	// For and feature, "x", in bc.staticHasFeatures, replace the string has("x") with the value as provided by bc.staticHasFeatures.
	//
	// For example, consider the following code
	//
	// if(has("feature-a")){
	//   //...
	// }
	//
	// if(has("feature-b")>=7){
	//   //...
	// }
	//
	// if(has("feature-c")){
	//   //...
	// }
	//
	// if(has("feature-d")){
	//   //...
	// }
	//
	// if(has("feature-e")=="goodbye"){
	//   //...
	// }
	//
	// Then, given bc.staticHasFeatures of
	//
	//   {
	//		"feature-a":undefined,
	//		"feature-b":7,
	//		"feature-c":true,
	//		"feature-d":false,
	//		"feature-e":"'hello, world'"
	//   }
	//
	// The source is modified as follows:
	// if(undefined){
	//   //...
	// }
	//
	// if(7>=7){
	//   //...
	// }
	//
	// if(true){
	//   //...
	// }
	//
	// if(false){
	//   //...
	// }
	//
	// if('hello, world'=="goodbye"){
	//   //...
	// }
	//
	// Recall that has.add has a now parameter that causes the test to be executed immediately and return the value.
	// If a static has value is truthy, then using || causes the first truthy operand to be returned...the truthy static value.
	// If a static value is falsy, then using && causes the first falsy operand to be returned...the falsy static value.
	//
	// For example:
	//
	// if(has.add("feature-a", function(global, doc, element){
	//   //some really long, painful has test
	// }, true)){
	//   //...
	// }
	//
	// Consider static has values for feature-a of undefined, 7, true, false, "'hello, world'"
	//
	//
	// if(undefined && has.add("feature-a", function(global, doc, element){ // NOTE: the value of the if conditional is static undefined
	//   //some really long, painful has test
	// }, true)){
	//   //...
	// }
	//
	// if(7 || has.add("feature-a", function(global, doc, element){ // NOTE: the value of the if conditional is static 7
	//   //some really long, painful has test
	// }, true)){
	//   //...
	// }
	//
	// if(true || has.add("feature-a", function(global, doc, element){ // NOTE: the value of the if conditional is static true
	//   //some really long, painful has test
	// }, true)){
	//   //...
	// }
	//
	// if(false && has.add("feature-a", function(global, doc, element){ // NOTE: the value of the if conditional is static false
	//   //some really long, painful has test
	// }, true)){
	//   //...
	// }
	//
	// if('hello, world' || has.add("feature-a", function(global, doc, element){ // NOTE: the value of the if conditional is static 'hello, world'
	//   //some really long, painful has test
	// }, true)){
	//   //...
	// }
	//
	// This technique is employed to avoid attempting to parse and find the boundaries of "some really long painful has test" with regexs.
	// Instead, this is left to an optimizer like the the closure compiler or uglify etc.

	function stringifyString(s){
		return typeof s === "string" ? '"' + s + '"' : s;
	}

	return function(resource){
		resource.text = resource.text.replace(/([^\w\.])has\s*\(\s*["']([^'"]+)["']\s*\)/g, function(match, prefix, featureName){
			if(featureName in bc.staticHasFeatures){
				return prefix + " " + bc.staticHasFeatures[featureName] + " ";
			}else{
				return match;
			}
		}).replace(/([^\w\.])((has.add\s*\(\s*)["']([^'"]+)["'])/g, function(match, prefix, hasAdd, notUsed, featureName){
			if(featureName in bc.staticHasFeatures){
				return prefix + " " + stringifyString(bc.staticHasFeatures[featureName]) + (bc.staticHasFeatures[featureName] ? " || " : " && " ) + hasAdd;
			}else{
				return match;
			}
		});
		return 0;
	};

});
