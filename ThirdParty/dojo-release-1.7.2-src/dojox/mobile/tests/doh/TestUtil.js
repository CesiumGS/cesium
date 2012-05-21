dojo.require("doh.runner");

function fireOnClick(obj){
	var anchorNode;
	if(typeof obj === "string"){
		var demoWidget = dijit.byId(obj);
		anchorNode = demoWidget.anchorNode;
	}else{
		anchorNode = obj;
	}
	if(dojo.isIE<9){
		anchorNode.fireEvent( "onclick" );
	}else{
		var e = document.createEvent('Events');
		e.initEvent('click', true, true);
		anchorNode.dispatchEvent(e);
	}
}


function verifyListItem(id, text, rightText, domButtonType, hasIcon, hasRightIcon, hasIcon2, hasVariableHeight, regExp, hasSelected) {
	demoWidget = dijit.byId(id);
	doh.assertEqual('mblListItem' + (hasVariableHeight ?" mblVariableHeight":"") + (hasSelected ?" mblItemSelected":""), demoWidget.domNode.className);
	var childNodes = demoWidget.domNode.childNodes;
	doh.assertEqual('mblListItemAnchor' + (hasIcon?'':' mblListItemAnchorNoIcon'), childNodes[0].className);
	
	doh.assertEqual('A', childNodes[0].tagName);
	
	childNodes = childNodes[0].childNodes;

	var i=0;
	if(hasIcon){
		if(!dojo.isIE && regExp){
			doh.assertTrue(childNodes[i].childNodes[0].src.search(regExp) != -1, "search " + regExp.toString());
		}
		doh.assertEqual('mblListItemIcon', childNodes[i++].className);
	}

	if(hasRightIcon){
		if(domButtonType){
			doh.assertEqual(domButtonType + ' mblDomButton', childNodes[i].childNodes[0].className);
		}
		doh.assertEqual('mblListItemRightIcon', childNodes[i++].className);
	}

	if(hasIcon2){
		doh.assertEqual('mblListItemRightIcon2', childNodes[i++].className);
	}

	if(rightText){
		doh.assertEqual(rightText, dojo.isFF ==3.6 ? childNodes[i].childNodes[0].innerHTML : childNodes[i].innerHTML); //2 0r 3
		doh.assertEqual('mblListItemRightText', childNodes[i++].className);
	}
	doh.assertEqual('mblListItemTextBox', childNodes[i].className);
	doh.assertEqual('DIV', childNodes[i].tagName);

	try{
		doh.assertEqual(text, dojo.trim(childNodes[i].childNodes[0].innerHTML.replace(/\r\n/g,"")));
	} catch (e) {
		if(dojo.isFF ==3.6){
			doh.assertEqual(text, dojo.trim(childNodes[i].childNodes[0].childNodes[0].innerHTML.replace(/\r\n/g,"")));
		}else{
			throw e;
		}
	}

}

function verifyListItemPos(id, rTop, rRight, rBottom, rLeft, sTop, sLeft) {
	var demoWidget = dijit.byId(id);
	verifyRect(demoWidget.domNode.childNodes[0].childNodes[0].childNodes[0], rTop, rRight, rBottom, rLeft);

	doh.assertEqual(sTop, demoWidget.domNode.childNodes[0].childNodes[0].childNodes[0].style.top);
	doh.assertEqual(sLeft, demoWidget.domNode.childNodes[0].childNodes[0].childNodes[0].style.left);
}

function verifyRect(node, rTop, rRight, rBottom, rLeft) {
	var rectArray = node.style.clip.split(/[, ]+/);
	doh.assertEqual("rect("+rTop, rectArray[0]);
	doh.assertEqual(rRight, rectArray[1]);
	doh.assertEqual(rBottom, rectArray[2]);
	doh.assertEqual(rLeft+")", rectArray[3]);
}
