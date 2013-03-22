define([
	"../errors/create",
	"doh"
], function(create, doh){
	var TestError = create("TestError", function(message, foo){
		this.foo = foo;
	});

	var OtherError = create("OtherError", function(message, foo, bar){
		this.bar = bar;
	}, TestError, {
		getBar: function(){
			return this.bar;
		}
	});

	var testError = new TestError("hello", "asdf"),
		otherError = new OtherError("goodbye", "qwerty", "blah");

	doh.register("tests.errors", [
		{
			name: "TestError",
			runTest: function(t){
				t.t(testError instanceof Error, "testError should be an instance of Error");
				t.t(testError instanceof TestError, "testError should be an instance of TestError");
				t.f(testError instanceof OtherError, "testError should not be an instance of OtherError");
				t.f("getBar" in testError, "testError should not have a 'getBar' property");
				t.is("hello", testError.message, "testError's message property should be 'hello'");
				if((new Error()).stack){
					t.t(!!testError.stack, "custom error should have stack set");
				}
			}
		},
		{
			name: "OtherError",
			runTest: function(t){
				t.t(otherError instanceof Error, "otherError should be an instance of Error");
				t.t(otherError instanceof TestError, "otherError should be an instance of TestError");
				t.t(otherError instanceof OtherError, "otherError should be an instance of OtherError");
				t.t("getBar" in otherError, "otherError should have a 'getBar' property");
				t.f(otherError.hasOwnProperty("getBar"), "otherError should not have a 'getBar' own property");
				t.is("blah", otherError.getBar(), "otherError should return 'blah' from getBar()");
				t.is("goodbye", otherError.message, "otherError's message property should be 'goodbye'");
			}
		}
	]);
});
