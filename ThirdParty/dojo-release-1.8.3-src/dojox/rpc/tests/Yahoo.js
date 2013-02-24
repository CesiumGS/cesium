dojo.provide("dojox.rpc.tests.Yahoo");
dojo.require("dojo.io.script");
dojo.require("dojox.rpc.Service");

dojox.rpc.tests.yahooService = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.SMDLibrary", "yahoo.smd"));

dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT = 8000;
dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT = 30000;

dojox.rpc.tests.yahooService._testMethod = function(method){
	return function(m){
		var d = new doh.Deferred();

		if (method.name && method.parameters && method.expectedResult) {
			var yd = dojox.rpc.tests.yahooService[method.name](method.parameters);
			yd.addCallback(this, function(result){
				if (result[method.expectedResult]){
					d.callback(true);
				}else{
					d.errback(new Error("Unexpected Return Value: ", result));
				}
			});
		}

		return d;
	}
};

doh.register("dojox.rpc.tests.yahoo",
	[
		{
			name: "#1, Yahoo Answers::questionSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "questionSearch",
				parameters: {query: "dojo toolkit"},
				expectedResult: "all"
			})
		},
		{
			name: "#2, Yahoo Answers::getByCategory",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "getByCategory",
				parameters: {category_name: "Computers+%26+Internet%3ESoftware"},
				expectedResult: "all"
			})
		},
		{
			name: "#3, Yahoo Answers::getQuestion",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "getQuestion",
				parameters: {question_id: "1005120800412"},
				expectedResult: "all"
			})
		},
		{
			name: "#4, Yahoo Answers::getByUser",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "getByUser",
				parameters: {user_id: "AA10001397"},
				expectedResult: "all"
			})
		},
		{
			name: "#5, Yahoo Audio::artistSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "artistSearch",
				parameters: {artist: "The Beatles"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#6, Yahoo Audio::albumSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "albumSearch",
				parameters: {artist: "The Beatles", album: "Magical Mystery Tour"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#7, Yahoo Audio::songSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "songSearch",
				parameters: {artist: "The Beatles", album: "Magical Mystery Tour", song: "Penny Lane"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#8, Yahoo Audio::songDownloadLocation",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "songDownloadLocation",
				parameters: {songid: "XXXXXXT000995691"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#9, Yahoo ContentAnalysis::contextSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "contextSearch",
				parameters: {
					context: "Welcome to the Book of Dojo. This book covers both versions 0.9 and 1.0, and all 1.0 extensions and changes are clearly marked for your enjoyment. Please use the forums for support questions, but if you see something missing, incomplete, or just plain wrong in this book, please leave a comment.",
					query: "dojo"
				},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#10, Yahoo Image::imageSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "imageSearch",
				parameters: {query: "dojo"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#11, Yahoo Local::localSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "localSearch",
				parameters: {query: "pizza", zip: "98201"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#12, Yahoo Local::collectionSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "collectionSearch",
				parameters: {query: "dojo"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#13, Yahoo Local::getCollection",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				expectedResult: "getCollection",
				parameters: {collection_id: "1000031487"},
				expectedResult: "Result"
			})
		},
		{
			name: "#14, Yahoo Local::trafficData",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "trafficData",
				parameters: {street: "1600 Pennsylvania Ave", city: "Washington, DC"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#15, Yahoo MyWebs::urlSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "urlSearch",
				parameters: {tag: "javascript"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#16, Yahoo MyWebs::tagSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "tagSearch",
				parameters: {url: "dojotoolkit.org"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#17, Yahoo MyWebs::relatedTags",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_LONG_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "relatedTags",
				parameters: {tag: "javascript"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#18, Yahoo NewsSearch::newsSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "newsSearch",
				parameters: {query: "dojo toolkit"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#19, Yahoo Shopping::catalogListing",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "catalogListing",
				parameters: {idtype: "brand,partnum", idvalue: "canon,1079B001", getspec: 1},
				expectedResult: "Catalog"
			})
		},
		{
			name: "#20, Yahoo Shopping::merchantSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "merchantSearch",
				parameters: {merchantid: "1021849"},
				expectedResult: "Merchant"
			})
		},
		{
			name: "#21, Yahoo Shopping::productSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "productSearch",
				parameters: {query: "dojo"},
				expectedResult: "Categories"
			})
		},
		{
			name: "#22, Yahoo SiteExplorer::inlinkData",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "inlinkData",
				parameters: {query: "dojotoolkit.org"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#23, Yahoo SiteExplorer::pageData",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "pageData",
				parameters: {query: "dojotoolkit.org"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#24, Yahoo SiteExplorer::ping",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "ping",
				parameters: {sitemap: "http://www.yahoo.com"},
				expectedResult: "Success"
			})
		},
		{
			name: "#25, Yahoo SiteExplorer::updateNotification",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "updateNotification",
				parameters: {url: "http://www.yahoo.com"},
				expectedResult: "Success"
			})
		},
		{
			name: "#26, Yahoo Trip::tripSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "tripSearch",
				parameters: {query: "eiffel tower"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#27, Yahoo Trip::getTrip",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "getTrip",
				parameters: {id: "546303"},
				expectedResult: "Result"
			})
		},
		{
			name: "#28, Yahoo Video::videoSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "videoSearch",
				parameters: {query: "star wars kid"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#29, Yahoo Web::webSearch",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "webSearch",
				parameters: {query: "dojo toolkit"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#30, Yahoo Web::spellingSuggestion",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "spellingSuggestion",
				parameters: {query: "beatls"},
				expectedResult: "ResultSet"
			})
		},
		{
			name: "#31, Yahoo Web::relatedSuggestion",
			timeout: dojox.rpc.tests.yahooService.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests.yahooService._testMethod({
				name: "relatedSuggestion",
				parameters: {query: "dojo toolkit"},
				expectedResult: "ResultSet"
			})
		}
]);
