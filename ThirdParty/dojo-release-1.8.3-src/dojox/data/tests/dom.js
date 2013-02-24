dojo.provide("dojox.data.tests.dom");
dojo.require("dojox.data.dom");

tests.register("dojox.data.tests.dom",
	[
		function testCreateDocument(t){
			var document = dojox.data.dom.createDocument();
			t.assertTrue(document !== null);
		},
		function testCreateDocumentFromText(t){
			var simpleXml = "<parentNode><childNode><grandchildNode/></childNode><childNode/></parentNode>";
			var document = dojox.data.dom.createDocument(simpleXml, "text/xml");
			
			var parent = document.firstChild;
			t.assertTrue(parent !== null);
			t.assertTrue(parent.tagName === "parentNode");
			t.assertTrue(parent.childNodes.length == 2);
			
			var firstChild = parent.firstChild;
			t.assertTrue(firstChild !== null);
			t.assertTrue(firstChild.tagName === "childNode");
			t.assertTrue(firstChild.childNodes.length == 1);
			
			var secondChild = firstChild.nextSibling;
			t.assertTrue(secondChild !== null);
			t.assertTrue(secondChild.tagName === "childNode");

			var grandChild = firstChild.firstChild;
			t.assertTrue(grandChild !== null);
			t.assertTrue(grandChild.tagName === "grandchildNode");

		},
		function testCreateDocumentEmptyString(t){
			var simpleXml = "";
			var document = dojox.data.dom.createDocument(simpleXml, "text/xml");
			
			t.assertTrue(typeof document != "undefined");

			var parent = document.firstChild;
			t.assertTrue(parent === null);
		},
		function testCreateDocumentEmpty(t){
			var simpleXml;
			var document = dojox.data.dom.createDocument();
			
			t.assertTrue(typeof document != "undefined");

			var parent = document.firstChild;
			t.assertTrue(parent === null);
		},
		function testReadTextContent(t){
			var text = "This is a bunch of child text on the node";
			var simpleXml = "<parentNode>" + text + "</parentNode>";
			var document = dojox.data.dom.createDocument(simpleXml, "text/xml");
            
			var topNode = document.firstChild;
			t.assertTrue(topNode !== null);
			t.assertTrue(topNode.tagName === "parentNode");
			t.assertTrue(text === dojox.data.dom.textContent(topNode));
			dojo.destroy(topNode);
			t.assertTrue(document.firstChild === null);
		},
		function testSetTextContent(t){
			var text = "This is a bunch of child text on the node";
			var text2 = "This is the new text";
			var simpleXml = "<parentNode>" + text + "</parentNode>";
			var document = dojox.data.dom.createDocument(simpleXml, "text/xml");
            
			var topNode = document.firstChild;
			t.assertTrue(topNode !== null);
			t.assertTrue(topNode.tagName === "parentNode");
			t.assertTrue(text === dojox.data.dom.textContent(topNode));
			dojox.data.dom.textContent(topNode, text2);
			t.assertTrue(text2 === dojox.data.dom.textContent(topNode));
			dojo.destroy(topNode);
			t.assertTrue(document.firstChild === null);

		},
		function testReplaceChildrenArray(t){
			var simpleXml1 = "<parentNode><child1/><child2/><child3/></parentNode>";
			var simpleXml2 = "<parentNode><child4/><child5/><child6/><child7/></parentNode>";
			var doc1 = dojox.data.dom.createDocument(simpleXml1, "text/xml");
			var doc2 = dojox.data.dom.createDocument(simpleXml2, "text/xml");
            
			var topNode1 = doc1.firstChild;
			var topNode2 = doc2.firstChild;
			t.assertTrue(topNode1 !== null);
			t.assertTrue(topNode1.tagName === "parentNode");
			t.assertTrue(topNode2 !== null);
			t.assertTrue(topNode2.tagName === "parentNode");
			dojox.data.dom.removeChildren(topNode1);
			var newChildren=[];
			for(var i=0;i<topNode2.childNodes.length;i++){
				newChildren.push(topNode2.childNodes[i]);
			}
			dojox.data.dom.removeChildren(topNode2);
			dojox.data.dom.replaceChildren(topNode1,newChildren);
			t.assertTrue(topNode1.childNodes.length === 4);
			t.assertTrue(topNode1.firstChild.tagName === "child4");
			t.assertTrue(topNode1.lastChild.tagName === "child7");

		},
		function testReplaceChildrenSingle(t){
			var simpleXml1 = "<parentNode><child1/><child2/><child3/></parentNode>";
			var simpleXml2 = "<parentNode><child4/></parentNode>";
			var doc1 = dojox.data.dom.createDocument(simpleXml1, "text/xml");
			var doc2 = dojox.data.dom.createDocument(simpleXml2, "text/xml");
            
			var topNode1 = doc1.firstChild;
			var topNode2 = doc2.firstChild;
			t.assertTrue(topNode1 !== null);
			t.assertTrue(topNode1.tagName === "parentNode");
			t.assertTrue(topNode2 !== null);
			t.assertTrue(topNode2.tagName === "parentNode");
			dojox.data.dom.removeChildren(topNode1);
			
			var newChildren = topNode2.firstChild;
			dojox.data.dom.removeChildren(topNode2);
			dojox.data.dom.replaceChildren(topNode1,newChildren);
			t.assertTrue(topNode1.childNodes.length === 1);
			t.assertTrue(topNode1.firstChild.tagName === "child4");
			t.assertTrue(topNode1.lastChild.tagName === "child4");
		},
		function testRemoveChildren(t){
			var simpleXml1 = "<parentNode><child1/><child2/><child3/></parentNode>";
			var doc1 = dojox.data.dom.createDocument(simpleXml1, "text/xml");
            
			var topNode1 = doc1.firstChild;
			t.assertTrue(topNode1 !== null);
			t.assertTrue(topNode1.tagName === "parentNode");
			dojox.data.dom.removeChildren(topNode1);
			t.assertTrue(topNode1.childNodes.length === 0);
			t.assertTrue(topNode1.firstChild === null);
		},
		function testInnerXML(t){
			var simpleXml1 = "<parentNode><child1/><child2/><child3/></parentNode>";
			var doc1 = dojox.data.dom.createDocument(simpleXml1, "text/xml");
            
			var topNode1 = doc1.firstChild;
			t.assertTrue(topNode1 !== null);
			t.assertTrue(topNode1.tagName === "parentNode");

			var innerXml = dojox.data.dom.innerXML(topNode1);
			t.assertTrue(simpleXml1 === innerXml);
		}
	]
);
