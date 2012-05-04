dojo.provide("util.docscripts.tests.basic");
(function(){

	var url = dojo.moduleUrl("util.docscripts", "dumpObj.php") + "";
	function getdata(file){
		
		var r;
		dojo.xhrGet({ 
			url: url + "?f=" + file,
			sync: true,
			handleAs:"json",
			handle: function(response){
				r = response;
			}
		});
		return r;
		
	}
	
	var docs;
	function getmember(key, obj){
		obj = obj || docs;
		return obj[key];
	}
	
	doh.register("doctests.basic", [
	
		function actual_fetching(t){
			docs = getdata("util/docscripts/tests/simple.js");
			t.t(docs);
			t.t(typeof docs == "object");
			t.is(docs["#provides"], "util.docscripts.tests.simple", "provide() object found");
			t.is(docs["#resource"], "docscripts/tests/simple.js", "filename expansion");
			t.t(docs["util.docscripts.tests"], "provide() expansion");
		},
		
		function simple_requires(t){
			t.t(dojo.isArray(docs['#requires'][0]), "populated require");
			t.t(~dojo.indexOf(docs["#requires"][0], "dojo.cookie"), "found cookie require");
		},
		
		function module_level_docs(t){
			var fb = getmember("util.docscripts.tests.simple");
			t.is("Module level summary", fb.summary, "summary from psuedo on module obj");
		},
		
		function basic_class(t){
			
			var fb = getmember("dojo.FooBar");
			
			t.t(fb, "dojo.FooBar docs exist");
			t.t(fb.classlike, "classlike thinger found");
			t.is("A Class", fb.summary, "picked up summary from post-decalre docs");
			t.is("Function", fb.type, "inference");
			t.is("A Class description", fb.description, "description from post-declare docs");
			
			t.t(dojo.isArray(fb.examples), "found examples");
			t.is(1, fb.examples.length, "found one example exactly");
			
			var fbc = getmember("dojo.FooBar.constructor");
			t.is(fbc.prototype, "dojo.FooBar", "prototype binding");
			t.is(fbc.parameters.args.name, fb.parameters.args.name, "params from constructor implied on class");
			
			var mf = getmember("dojo.FooBar.memberFn");
			t.t(mf, "member function picked out of declaration");

			var params = mf.parameters;
			t.is("String", params.a.type);
			t.f(params.b.optional);
			t.is("String", params.b.type);
			t.f(params.b.optional);
			t.is("Boolean", params.c.type);
			t.t(params.c.optional, "last arg optional");
			t.is("Integer", mf.returns);
			t.is("A member function", mf.summary);
			
		},
		
		function inherited_class(t){
			var fb2 = getmember("dojo.FooBar2");
			t.t(fb2);
			// TODO:
			// check fb2.chains for dojo.FooBar
			// check fb2.inheritance
			// FIXME: 
			// what is chains v prototype
		},
		
		function mixin_docs(t){
			var mv = getmember("dojo.mixedValue");
			t.is("External doc block, mixed", mv.summary, "summary found for mixed value");
			t.is("Integer", mv.type, "type infered from mixed value");
			t.is("dojo", mv.attached, "alias lookup in d.mixin");
			
			var mf = getmember("dojo.mixedFunction");
			t.is("dojo", mf.attached, "alias lookup in d.mixin");
			t.is("Integer", mf.returns, "returns from return line");
			t.is("From mixin", mf.summary, "basic summary");
			t.is("a", mf.parameters.a.name, "parameter picked up");
			t.t(mf.parameters.a.optional, "param is optional");
			t.is(mf.parameters.a.summary, "Some number or not", "parameter description picked up");
		},
		
		function basic_function(t){
			
			var fb = getmember("dojo.thisIsAtestFunction");
			t.t(fb, "testFunction docs exist");
			t.is("Testing a function", fb.summary);
			t.is("String", fb.returns, "return value determined");
			t.is("Testing a string parameter", fb.parameters.a.summary, "parameter summary picked out");
		},
		
		function testfunction2(t){
			var tf = getmember("dojo.testFunction2");
			t.is("Simple summary", tf.summary);
			t.is("Simple Description.\nOn Multiple lines.", tf.description);
			t.t(tf.parameters.id.optional);
			t.is("Duplicate matched in signature and in line", tf.parameters.id.summary);
			t.is("String", tf.parameters.id.type);
		},
		
		function test_returner(t){

			// FIXME: the absence of a return comment populates only return_summary
			// when it's like:
			// ---
			// returns: Foo|Bar|Baz
			//		You'd expect Foo|Bar|Baz to be return value, and this to be return_summary
			// ---
			
			var r = getmember("dojo.returner");
			t.t(r);
			
			// FIXME: expected but not getting:
			// t.is("String|Integer", r.returns);
			// t.is("This should be description", r.return_summary);
			
			// FIXME: actually getting:
			t.is("String|Integer\nThis should be description", r.return_summary);
			t.f(r.returns);
		},
		
		function test_multireturner(t){
			var r = getmember("dojo.multiReturns");
			t.t(r);
			t.is("String|Integer", r.returns, "found all return statement types in block");
			t.is("Simple multireturn check", r.summary);
		},
		
		function aliased_query(t){
			var dq = getmember("dojo.query.stub");
			t.t(dq, "$ -> dojo.query unwrapped from closure");
			t.is("Integer", dq.returns);
			t.is("aliased to `dojo.query`", dq.summary, "FIX: requires undone <code>");
		},
		
		function kwarg_test(t){
			var kw = getmember("util.docscripts.tests.simple.__kwArgs");
			var args = kw.parameters;
			
			// FIXME: should this be actually mixed into something that has a type=__kwArgs?
			// eg: dojo.kwArgFunction.parameter.args object?
			var kwf = getmember("dojo.kwArgFunction");
			var kwp = kwf.parameters.args;
			
			t.is("util.docscripts.tests.simple.__kwArgs", kwp.type);
			
		},
		
//		function fetch_amd_style(t){
//			docs = getdata("util/docscripts/tests/simple_amd.js");
//			console.warn("amd-basic", docs);
//		},
//		
//		function fetch_amd_declare(t){
//			docs = getdata("util/docscripts/tests/declare_amd.js");
//			console.warn("amg-declare", docs);
//		},
		
		function functional(t){
			// refs #13345
			docs = getdata("util/docscripts/tests/functional.js");
			var hasit = getmember("util.docscripts.tests.FunctionalThinger");
			t.t(hasit, "object exists in parsed output, meaning parsing happened");
		},
		
		function raw_declare_init(t){
			docs = getdata("util/docscripts/tests/extend_declare.js");
			t.t(true);
		},
		
		function raw_declare(t){
			var barbaz = getmember("dojo.BarBaz");
			t.t(barbaz, "raw declare() call defined a named class");
		},
		
		function lang_extend(t){
			var someprop = getmember("dojo.BarBaz.someProp");
			t.t(someprop, "lang.extend worked");
			t.is("String", someprop.type, "lang.extend unwrapped innards");
		},

// FIXME; dojo.mixin(a.b.prototype, { ... }) parses, but shows up differently in the obj
// ... differently than dojo.extend(a.b, { ... }) ... the former is attached to "a.b", the
// latter attached to "a.b.prototype". no sure how this pans out for generate.php
//
//		function lang_mixin(t){
//			var someprop = getmember("dojo.BarBaz.moreProps");
//			console.log(docs, someprop);
//			t.t(someprop, "lang._mixin worked");
//			t.is("String", someprop.type, "lang._mixin unwrapped innards");
//		},
//		
		
		function winning(t){
			var prop = getmember("dojo.BarBaz.winning");
			console.warn(prop);
			t.t(prop, "aliased extend() call resolves properly");
			t.is("Boolean", prop.type);
			t.is("Always true.", prop.summary, "are we? rad.")
		}
	
	]);

})();
