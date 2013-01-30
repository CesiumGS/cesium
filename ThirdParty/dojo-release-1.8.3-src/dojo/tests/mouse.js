dojo.provide("dojo.tests.mouse");

var on = dojo.require("dojo.on");
var mouse = dojo.require("dojo.mouse");
doh.register("tests.on",
	[
		function mouseenter(t){
			var order = [];
			var div = document.body.appendChild(document.createElement("div"));
			div2 = div.appendChild(document.createElement("div"));
			div2.className = "item two";
			div2.id = 2;
			div3 = div.appendChild(document.createElement("div"));
			div3.className = "item three";
			div3.id = 3;
			div4 = div2.appendChild(document.createElement("div"));
			on(div, on.selector(".item", mouse.enter), function(){
				order.push(this.id);
			})
			on.emit(div, "mouseover", {
				bubbles: true,
				relatedTarget: document.body
			});
			on.emit(div3, "mouseover", {
				bubbles: true,
				relatedTarget: div
			});
			on.emit(div3, "mouseover", {
				bubbles: true,
				relatedTarget: div3
			});
			on.emit(div2, "mouseover", {
				bubbles: true,
				relatedTarget: div3
			});
			on.emit(div4, "mouseover", {
				bubbles: true,
				relatedTarget: div2
			});
			on.emit(div2, "mouseover", {
				bubbles: true,
				relatedTarget: div4
			});
			on.emit(div, "mouseover", {
				bubbles: true,
				relatedTarget: div2
			});
			on.emit(div4, "mouseover", {
				bubbles: true,
				relatedTarget: div
			});
			t.is(order, [3, 2, 2]);
			
		}
	]
);
