// testing a simple var list with embedded things.
var result = 0;

(function(){
	var a = 2,
		b = 3,
		superLong = 4,
		aFunction = function(arg){
			var inList = superLong;
			result = inList;
		}
	;
	
	aFunction(superLong);
	
})();