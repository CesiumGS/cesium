define(["../main", "doh/main", "require", "../rpc/RpcService", "../rpc/JsonService", "../rpc/JsonpService"], function(dojo, doh, require){

	doh.register("tests.rpc", [
		{
			name: "JsonRPC-EchoTest",
			timeout: 2000,
			setUp: function(){

				var testSmd = {
					serviceURL:"../../dojo/tests/resources/test_JsonRPCMediator.php",
					methods:[
						{
							name:"myecho",
							parameters:[
								{
									name:"somestring",
									type:"STRING"
								}
							]
						}
					]
				};

				this.svc = new dojo.rpc.JsonService(testSmd);
			},
			runTest: function(){
				var d = new doh.Deferred();
				var td = this.svc.myecho("RPC TEST");

				if (window.location.protocol=="file:"){
					var err= new Error("This Test requires a webserver and PHP and will fail intentionally if loaded from file://");
					d.errback(err);
					return d;
				}

				td.addCallbacks(function(result){
					if(result=="<P>RPC TEST</P>"){
						return true;
					}else{
						return new Error("JsonRpc-EchoTest test failed, resultant content didn't match");
					}
				}, function(result){
					return new Error(result);
				});

				td.addBoth(d, "callback");

				return d;
			}

		},

		{
			name: "JsonRPC-EmptyParamTest",
			timeout: 2000,
			setUp: function(){
				var testSmd={
					serviceURL:"../../dojo/tests/resources/test_JsonRPCMediator.php",
					methods:[ { name:"contentB" } ]
				};

				this.svc = new dojo.rpc.JsonService(testSmd);
			},
			runTest: function(){
				var d = new doh.Deferred();
				var td = this.svc.contentB();

				if (window.location.protocol=="file:"){
					var err= new Error("This Test requires a webserver and PHP and will fail intentionally if loaded from file://");
					d.errback(err);
					return d;
				}

				td.addCallbacks(function(result){
					if(result=="<P>Content B</P>"){
						return true;
					}else{
						return new Error("JsonRpc-EmpytParamTest test failed, resultant content didn't match");
					}
				}, function(result){
					return new Error(result);
				});

				td.addBoth(d, "callback");

				return d;
			}
		},

		{
			name: "JsonRPC_SMD_Loading_test",
			setUp: function(){
				this.svc = new dojo.rpc.JsonService("../../dojo/tests/resources/testClass.smd");
			},
			runTest: function(){

				if (this.svc.objectName=="testClass"){
					return true;
				}else{
					return new Error("Error loading and/or parsing an smd file");
				}
			}
		},

		{
			name: "JsonP_test",
			timeout: 10000,
			setUp: function(){
				this.svc = new dojo.rpc.JsonpService(require.toUrl("dojo/tests/resources/yahoo_smd_v1.smd"), {appid: "foo"});
			},
			runTest: function(){
				var d = new doh.Deferred();

				if (window.location.protocol=="file:"){
					var err= new Error("This Test requires a webserver and will fail intentionally if loaded from file://");
					d.errback(err);
					return d;
				}

				var td = this.svc.webSearch({query:"dojotoolkit"});

				td.addCallbacks(function(result){
					return true;
					if (result["ResultSet"]["Result"][0]["DisplayUrl"]=="dojotoolkit.org/"){
						return true;
					}else{
						return new Error("JsonRpc_SMD_Loading_Test failed, resultant content didn't match");
					}
				}, function(result){
					return new Error(result);
				});

				td.addBoth(d, "callback");

				return d;
			}
		}
	]);

});
