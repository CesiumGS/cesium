dojo.provide("dojox.rpc.tests.Geonames");
dojo.require("dojo.io.script");
dojo.require("dojox.rpc.Service");

dojox.rpc.tests.service = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.SMDLibrary", "geonames.smd"));

dojox.rpc.tests.TEST_METHOD_TIMEOUT = 20000;
dojox.rpc.tests.TEST_METHOD_LONG_TIMEOUT = 30000;

dojox.rpc.tests._testMethod = function(method){

        return function(m){
                var d = new doh.Deferred();

                if (method.name && method.parameters) {
                        var def = dojox.rpc.tests.service[method.name](method.parameters);
                        def.addCallback(this, function(result){
				if (method.debugTest) {
					console.log("Results: ", dojo.toJson(result));
				}
				var testType = method.testType || "compare";
				switch(testType){
					case "compare":
						console.log("Comparison Test");
		                                if (dojo.toJson(result)==method.expectedResult){
                                        		d.callback(true);
						}else{
							d.errback(new Error("Unexpected Return Value in comparison: ", result));
						}
						break;
					case "result":
						console.log("Result Test");
						if (result && dojo.toJson(result)){
							d.callback(true);
						}else{
							d.errback(new Error("Unexpected Return Value, no result or not valid json: ", result));

						}
						break;
					default:
						d.errback(new Error("Unknown test type"));
						break;
				}
                        });
                }

                return d;
        }
};

doh.register("dojox.rpc.tests.geonames",
	[
		{
			name: "#1, getCities()",
			timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
			runTest: dojox.rpc.tests._testMethod({
				name: "getCities",
                                parameters: {north: 44.1, south:-9.9, east: -22.4, west: 55.2},
                                expectedResult: dojo.toJson({"geonames":[{"fcodeName":"capital of a political entity","countrycode":"MX","fcl":"P","fclName":"city, village,...","name":"Mexico City","wikipedia":"en.wikipedia.org/wiki/Mexico_City","lng":-99.1386111,"fcode":"PPLC","geonameId":3530597,"lat":19.4341667,"population":11285654},{"fcodeName":"capital of a political entity","countrycode":"PH","fcl":"P","fclName":"city, village,...","name":"Manila","wikipedia":"","lng":120.9822222,"fcode":"PPLC","geonameId":1701668,"lat":14.6041667,"population":10444527},{"fcodeName":"capital of a political entity","countrycode":"BD","fcl":"P","fclName":"city, village,...","name":"Dhaka","wikipedia":"en.wikipedia.org/wiki/Dhaka","lng":90.4086111,"fcode":"PPLC","geonameId":1185241,"lat":23.7230556,"population":10356500},{"fcodeName":"capital of a political entity","countrycode":"KR","fcl":"P","fclName":"city, village,...","name":"Seoul","wikipedia":"en.wikipedia.org/wiki/Seoul","lng":126.9997222,"fcode":"PPLC","geonameId":1835848,"lat":37.5663889,"population":10349312},{"fcodeName":"capital of a political entity","countrycode":"ID","fcl":"P","fclName":"city, village,...","name":"Jakarta","wikipedia":"en.wikipedia.org/wiki/Jakarta","lng":106.8294444,"fcode":"PPLC","geonameId":1642911,"lat":-6.1744444,"population":8540121},{"fcodeName":"capital of a political entity","countrycode":"JP","fcl":"P","fclName":"city, village,...","name":"Tokyo","wikipedia":"en.wikipedia.org/wiki/Tokyo","lng":139.7513889,"fcode":"PPLC","geonameId":1850147,"lat":35.685,"population":8336599},{"fcodeName":"capital of a political entity","countrycode":"TW","fcl":"P","fclName":"city, village,...","name":"Taipei","wikipedia":"en.wikipedia.org/wiki/Taipei","lng":121.525,"fcode":"PPLC","geonameId":1668341,"lat":25.0391667,"population":7871900},{"fcodeName":"capital of a political entity","countrycode":"CN","fcl":"P","fclName":"city, village,...","name":"Beijing","wikipedia":"en.wikipedia.org/wiki/Beijing","lng":116.3883333,"fcode":"PPLC","geonameId":1816670,"lat":39.9288889,"population":7480601},{"fcodeName":"capital of a political entity","countrycode":"CO","fcl":"P","fclName":"city, village,...","name":"Bogotá","wikipedia":"en.wikipedia.org/wiki/Bogot%C3%A1","lng":-74.0833333,"fcode":"PPLC","geonameId":3688689,"lat":4.6,"population":7102602},{"fcodeName":"capital of a political entity","countrycode":"HK","fcl":"P","fclName":"city, village,...","name":"Hong Kong","wikipedia":"","lng":114.15007352829,"fcode":"PPLC","geonameId":1819729,"lat":22.2840136009625,"population":7012738}]})
			})
		},
                {
                        name: "#2, getQuakes()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getQuakes",
                                parameters: {north: 44.1, south:-9.9, east: -22.4, west: 55.2, "date": "2007-07-31", maxRows: 1},
                                expectedResult: dojo.toJson({"earthquakes":[{"eqid":"2007flce","magnitude":6.1,"lng":-17.7996,"src":"us","datetime":"2007-07-31 22:55:31","depth":10,"lat":-0.095}]})
                        })
                },
                {
                        name: "#3, getWeather()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getWeather",
				testType:'result',
                                parameters: {north: 44.1, south:-9.9, east: -22.4, west: 55.2, "date": "2007-07-31", maxRows: 1}
                        })
                },

                {
                        name: "#4, getWeatherByICAO()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getWeatherByICAO",
				testType:'result',
                                parameters: {ICAO:"LSZH"}
                        })
                },

                {
                        name: "#5, getWeatherByCoords()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getWeatherByCoords",
				testType:'result',
                                parameters: {lat:43,lng:-2}
                        })
                },

                {
                        name: "#6, getChildren()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getChildren",
                                parameters: {geonameId:3175395},
				testType: 'result'
                        })
                },

                {
                        name: "#7, getHeirarchy()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getHierarchy",
                                parameters: {geonameId:3175395},
				testType: 'result'
                        })
                },
                {
                        name: "#8, getNeighbours()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getNeighbours",
                                parameters: {geonameId:3175395},
				testType: 'result'
                        })
                },

                {
                        name: "#9, getNeighbourhood()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getNeighbourhood",
                                parameters: {lat:40.78343, lng:-73.96625},
				expectedResult: dojo.toJson({"neighbourhood":{"adminName2":"New York County","adminCode2":"061","adminCode1":"NY","countryName":"United States","name":"Central Park","countryCode":"US","city":"New York City-Manhattan","adminName1":"New York"}})
                        })
                },

                {
                        name: "#10, getSiblings()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getSiblings",
                                parameters: {geonameId:3175395},
				testType: 'result'
                        })
                },

                {
                        name: "#11, getCountryCode()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getCountryCode",
                                parameters:{lat:40.78343, lng:-73.96625},
				expectedResult: dojo.toJson({"distance":0,"countryName":"United States","countryCode":"US"})
                        })
                },
                {
                        name: "#12, getCountrySubdivision()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getCountrySubdivision",
                                parameters:{lat:40.78343, lng:-73.96625},
				expectedResult: dojo.toJson({"distance":0,"adminCode1":"NY","countryName":"United States","countryCode":"US","codes":[{"code":"36","type":"FIPS10-4"},{"code":"NY","type":"ISO3166-2"}],"adminName1":"New York"})
                        })
                },
                {
                        name: "#13, getWikipediaBoundingBox()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getWikipediaBoundingBox",
                                parameters:{north: "44.1", "south": "-9.9", "east": "-22.4", "west": "55.2", "maxRows": "1"},
				testType: 'result'
                        })
                },
                 {
                        name: "#14, searchWikipedia()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "searchWikipedia",
                                parameters:{q: "dojo", maxRows: 1},
				expectedResult: dojo.toJson({"geonames":[{"summary":"which is an umbrella organisation of various national, as well as smaller, aikido organisations. Although the name strictly refers only to the main training hall (''dojo''), it is often used by extension to refer to the Aikikai organisation itself. The dojo was founded by Morihei Ueshiba in 1931 under the name ''Kobukan'' (...)","title":"Aikikai Hombu Dojo","wikipediaUrl":"en.wikipedia.org/wiki/Aikikai_Hombu_Dojo","elevation":0,"countryCode":"JP","lng":139.714305555556,"feature":"landmark","lang":"en","lat":35.6991388888889,"population":0}]})
                        })
                },
                {
                        name: "#15, getTimezone()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "getTimezone",
                                parameters:{lat:40.78343,lng:-73.96625},
				expectedResult: dojo.toJson({"countryName":"United States","dstOffset":-4,"countryCode":"US","gmtOffset":-5,"lng":-73.96625,"timezoneId":"America/New_York","lat":40.78343})
                        })
                },
 
                {
                        name: "#16, search()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "search",
                                parameters:{q: "dojo", maxRows: 1},
				testType: 'result'
                        })
                },

                 {
                        name: "#17, postalCodeLookup()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "postcalCodeLookup",
				debugTest: true,
                                parameters:{postalcode: "24060"},
				expectedResult: dojo.toJson({})
                        })
                },
 
                {
                        name: "#18, postalCodeSearch()",
                        timeout: dojox.rpc.tests.TEST_METHOD_TIMEOUT,
                        runTest: dojox.rpc.tests._testMethod({
                                name: "postalCodeSearch",
                                parameters:{placename: "blacksburg"},
				expectedResult: dojo.toJson({})
                        })
                }
	]
);
