define(["../../_base/declare"], function(declare){

// module:
//		dojo/data/api/Request

return declare("dojo.data.api.Request", null, {
	// summary:
	//		This class defines out the semantics of what a 'Request' object looks like
	//		when returned from a fetch() method.  In general, a request object is
	//		nothing more than the original keywordArgs from fetch with an abort function
	//		attached to it to allow users to abort a particular request if they so choose.
	//		No other functions are required on a general Request object return.  That does not
	//		inhibit other store implementations from adding extensions to it, of course.
	//
	//		This is an abstract API that data provider implementations conform to.
	//		This file defines methods signatures and intentionally leaves all the
	//		methods unimplemented.
	//
	//		For more details on fetch, see dojo/data/api/Read.fetch().

	abort: function(){
		// summary:
		//		This function is a hook point for stores to provide as a way for
		//		a fetch to be halted mid-processing.
		// description:
		//		This function is a hook point for stores to provide as a way for
		//		a fetch to be halted mid-processing.  For more details on the fetch() api,
		//		please see dojo/data/api/Read.fetch().
		throw new Error('Unimplemented API: dojo.data.api.Request.abort');
	}
});

});
