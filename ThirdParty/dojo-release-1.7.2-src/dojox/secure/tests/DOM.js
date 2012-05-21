dojo.provide("dojox.secure.tests.DOM");
dojo.require("dojox.secure.DOM");

doh.register("dojox.secure.tests.DOM.good",
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
			var container = document.createElement("div");
			container.style.backgroundColor = "cyan";
			container.style.color = "black";
			div.appendChild(container);
			wrap = dojox.secure.DOM(container);
			securedElement = wrap(container);
			console.log("securedElement",securedElement);
			securedDoc = securedElement.ownerDocument;
			console.log("securedDoc",securedDoc);
		},
		function innerHTML(t){
			securedElement.innerHTML = "Hi there";
			t.assertEqual("Hi there",securedElement.data__.innerHTML);
		},
		function docWrite(t){
			securedDoc.write("<div style='color:red'>written</div>");
			console.log("wrote");
			securedDoc.close();
			t.t(securedElement.data__.innerHTML.match(/written/));
		},
		function addNode(t){
			var newDiv = securedDoc.createElement("div");
			console.log("wrapped ",newDiv.data__);
			newDiv.innerHTML = "inner div";
			console.log("style ",newDiv.style.data__);
			newDiv.style.color="blue";
			console.log('appendChild ' + securedElement.appendChild);
			securedElement.appendChild(newDiv);
			t.t(securedElement.data__.innerHTML.match(/inner/));
		},
		/*function addStyleTag(t){
			securedElement.innerHTML = "<style>div {color:green}</style><div>should be green</div>";
			console.log('after style tag' + securedElement.innerHTML);
			t.t(securedElement.innerHTML.match(/color/));
		},*/
		function addOnclickHandler(t){
			securedElement.addEventListener("click",function(event) {
				alert('proper click handler');
			});
			
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
doh.register("dojox.secure.tests.DOM.bad",
	[
		function parentNode(t){
			t.f(securedElement.parentNode);
		},
		function innerHTMLScript(t){
			try {
				securedElement.innerHTML = "<script>bad=true</script>";
			}catch(e){}
				t.t(typeof bad == 'undefined');
		},
		function innerHTMLScript2(t){
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
		/*violater(function addStyleTag(t) {
			securedElement.innerHTML = "<style>div {color:expression(alert(\"hello\")}</style><div>test</div>";
		}),
		violater(function addStyleTag2(t) {
			securedElement.innerHTML = "<style>@import 'unsafe.css'</style><div>unsafe css</div>";
		}),*/
		function addJavaScriptHref(t) {
			securedElement.innerHTML = "<a href='javascript:alert(3)'>illegal link</a>";
		},
		/*violater(function addNullCharSrc(t) {
			securedElement.innerHTML = "<a href='java&#65533;script:alert(3)'>illegal link</a>";
		}),*/
		function addOnclickHandler(t) {
			try{
				securedElement.innerHTML = "<div onclick='alert(4)'>illegal link</div>";
			}catch(e){}
			
			t.f(securedElement.innerHTML.match(/alert/));
		},
		function confusingHTML(t) {
			try {
				securedElement.innerHTML = '<div x="\"><img onload=alert(42)src=http://json.org/img/json160.gif>"></div>';
			}catch(e){}
			
			t.f(securedElement.innerHTML.match(/alert/));
		},
		function confusingHTML2(t) {
			try {
				securedElement.innerHTML = '<iframe/src="javascript:alert(42)"></iframe>';
			}catch(e){}
			
			t.f(securedElement.innerHTML.match(/alert/));
		},
		function confusingHTML2(t) {
			try{
				securedElement.innerHTML = '<iframe/ "onload=alert(/XSS/)></iframe>';
			}catch(e){}
			
			t.f(securedElement.innerHTML.match(/alert/));
		}
		
	]);
	