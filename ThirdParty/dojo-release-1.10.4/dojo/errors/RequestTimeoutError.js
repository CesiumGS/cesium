define(['./create', './RequestError'], function(create, RequestError){
	// module:
	//		dojo/errors/RequestTimeoutError

	/*=====
	 return function(){
		 // summary:
		 //		TODOC
	 };
	 =====*/

	return create("RequestTimeoutError", null, RequestError, {
		dojoType: "timeout"
	});
});
