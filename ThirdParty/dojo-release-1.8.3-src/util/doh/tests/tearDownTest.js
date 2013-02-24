define(["doh/runner"], function(doh) {
	doh.register("doh/tearDownTest",[
		{
			name: "sync_pass_teardown",
			pass: 1,
			runTest: function(){
				doh.debug("test sync_pass_teardown called");
				doh.t(this.pass,"teardown was called out of order???");
				doh.t(1);
			},
			tearDown: function(){
				doh.debug("teardown sync_pass_teardown called");
				this.pass=0;
			}
		},
		{
			name: "sync_fail_teardown",
			pass: 1,
			runTest: function(){
				doh.debug("test sync_fail_teardown called");
				doh.t(this.pass,"teardown was called out of order???");
				doh.t(0,"SHOULD FAIL with 'teardown sync_fail_teardown called' in log");
			},
			tearDown: function(){
				doh.debug("teardown sync_fail_teardown called");
				this.pass=0;
			}
		},
		{
			name: "async_pass_teardown",
			pass: 1,
			runTest: function(){
				doh.debug("test async_pass_teardown called");
				var d = new doh.Deferred();
				var _this=this;
				setTimeout(d.getTestCallback(function(){
					doh.t(_this.pass,"teardown was called out of order???");
				}),900);
				return d;
			},
			tearDown: function(){
				this.pass=0;
				doh.debug("teardown async_pass_teardown called");
			}
		},
		{
			name: "async_fail_teardown",
			pass: 1,
			runTest: function(){
				doh.debug("test async_fail_teardown called");
				var d = new doh.Deferred();
				var _this=this;
				setTimeout(d.getTestCallback(function(){
					doh.t(_this.pass,"teardown was called out of order???");
					doh.t(0,"SHOULD FAIL with 'teardown async_fail_teardown called' in log");
				}),900);
				return d;
			},
			tearDown: function(){
				doh.debug("teardown async_fail_teardown called");
				this.pass=0;
			}
		}
	]);
});