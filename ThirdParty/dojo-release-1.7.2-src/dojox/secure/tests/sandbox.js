dojo.provide("dojox.secure.tests.sandbox");

doh.register("dojox.secure.tests.sandbox.good",
	[
		function setup(){
			var div = document.createElement("div");
			document.body.appendChild(div);
			div.innerHTML = "Sandboxed div:";
			div.style.position = "absolute";
			div.style.top = "100px";
			div.style.left = "100px";
			div.style.backgroundColor = "red";
			div.style.color = "white";
			container = document.createElement("div");
			container.style.backgroundColor = "cyan";
			container.style.color = "black";
			div.appendChild(container);
		},
		function innerHTML(t){
			dojox.secure.evaluate("element.innerHTML = 'Hi there';",container);
			t.assertEqual("Hi there",container.innerHTML);
		},
		function docWrite(t){
			dojox.secure.evaluate("document.write(\"<div style='color:red'>written</div>\");",container);
			t.t(container.innerHTML.match(/written/));
		}
	]);

function violater(func) {
	return {name: func.name,
	runTest: function(t) {
		var insecure;
		try {
			func(t);
			insecure = true;
		}catch(e){
			console.log("successfully threw error",e);
		}
		t.f(insecure);
	}};
}
doh.register("dojox.secure.tests.sandbox.bad",
	[
		function parentNode(t){
			t.f(dojox.secure.evaluate("document.body",container));
		},
		function innerHTMLScript(t){
			try {
				dojox.secure.evaluate("bad = true",container);
			}catch(e){}
				t.t(typeof bad == 'undefined');
		}
		/*function innerHTMLScript2(t){
			try{
				securedElement.innerHTML = '</script><script>bad=true;//';
			}catch(e){}
				t.t(typeof bad == 'undefined');
		},
		function writeScript(t){
			try{
				securedDoc.write("<script>bad=true;</script>");
			}catch(e){}
				t.t(typeof bad == 'undefined');
		},
		function appendScript(t){
			try {
				var script = securedDoc.createElement('script');
				script.appendChild(securedDoc.createTextNode(
				        'bad=true'));
				securedElement.appendChild(script);
			}
			catch(e) {
				
			}
				t.t(typeof bad == 'undefined');
		},
		function cssExpression(t) {
			if (dojo.isIE) {
				securedElement.innerHTML = '<div id="oDiv" style="left:expression((bad=true), 0)">Example DIV</div>';
				t.t(typeof bad == 'undefined');
			}
			else {
				try{
					securedElement.innerHTML = '<input style=\'-moz-binding: url("http://www.mozilla.org/xbl/htmlBindings.xml#checkbox");\'>';
				}catch(e){}
				
				t.f(securedElement.innerHTML.match(/mozilla/))
			}
				
		},
		function cssExpression2(t) {
			if (dojo.isIE) {
				securedElement.style.left = 'expression(alert("hello"), 0)';
				t.f(securedElement.style.left.match(/alert/));
			}
			else {
				try {
					securedElement.style.MozBinding = 'url("http://www.mozilla.org/xbl/htmlBindings.xml#checkbox")';
				}catch(e){}
					
			}
		},
		function cssExpression3(t) {
			if (dojo.isIE) {
				securedElement.style.behavior = 'url(a1.htc)';
				t.f(securedElement.style.behavior);
			}
			else {
				
			}
		},
		violater(function addStyleTag(t) {
			securedElement.innerHTML = "<style>div {color:expression(alert(\"hello\")}</style><div>test</div>";
		}),
		violater(function addStyleTag2(t) {
			securedElement.innerHTML = "<style>@import 'unsafe.css'</style><div>unsafe css</div>";
		})*/
	]);
	