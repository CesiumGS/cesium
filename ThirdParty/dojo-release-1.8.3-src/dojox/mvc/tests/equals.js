define([
	"doh",
	"dojox/mvc/getStateful",
	"dojox/mvc/equals"
], function(doh, getStateful, equals){
	var a = [
		{
			uniqueId: 0,
			Completed: false,
			Subject: "Pick up my kids",
			Due: new Date((new Date()).getTime() + 48 * 3600000),
			Priority: 1,
			Description: "At the kindergarden"
		},
		{
			uniqueId: 1,
			Completed: true,
			Subject: "Take dojox.mvc learning course",
			Due: new Date((new Date()).getTime() + 72 * 3600000),
			Priority: 2,
			Description: "Need to find course material at http://dojotoolkit.org/"
		},
		{
			uniqueId: 2,
			Completed: false,
			Subject: "Wash my car",
			Due: new Date((new Date()).getTime() + 120 * 3600000),
			Priority: 3,
			Description: "Need to buy a cleaner before that"
		}
	];

	doh.register("dojox.mvc.tests.equals", [
		function equalsSimple(){
			doh.t(equals(getStateful(a), getStateful(a)), "Two stateful object from the same data source should be equal");
		},
		function changeValue(){
			var dst = getStateful(a), src = getStateful(a);
			src[1].set("Priority", 3);
			doh.f(equals(dst, src), "equals() should catch the change");
			src[1].set("Priority", 2);
			doh.t(equals(dst, src), "equals() should catch the change in src back to original");
		},
		function changeDate(){
			var dst = getStateful(a), src = getStateful(a), d;
			(d = new Date()).setTime(src[1].get("Due").getTime() + 72 * 3600000);
			src[1].set("Due", d);
			doh.f(equals(dst, src), "equals() should catch the change");
			(d = new Date()).setTime(src[1].get("Due").getTime() - 72 * 3600000);
			src[1].set("Due", d);
			doh.t(equals(dst, src), "equals() should catch the change in src back to original");
		}
	]);
});
