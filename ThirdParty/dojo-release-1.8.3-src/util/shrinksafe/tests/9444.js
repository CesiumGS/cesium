(function(){
	
	var someComplicatedStuff = function(){
		debugger;
	}
	
	for(var i = 0; i < 10; i++){
		if(i % 2 === 0) someComplicatedStuff();
	}
	
})()