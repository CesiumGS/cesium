//dojo.require("dojo.has");

require([
	"dijit/_base/manager",  // dijit.byId
	"doh/runner"	//doh functions
]);

function fireOnClick(obj){
	var anchorNode;
	if(typeof obj === "string"){
		var demoWidget = dijit.byId(obj);
		anchorNode = demoWidget.domNode;
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

function fireOnMouseDown(obj){
	var anchorNode;
	if(typeof obj === "string"){
		var demoWidget = dijit.byId(obj);
		anchorNode = demoWidget.domNode;
	}else{
		anchorNode = obj;
	}
	if(dojo.isIE<9){
		anchorNode.fireEvent( "onmousedown" );
	}else{
		var e = document.createEvent('Events');
		e.initEvent('mousedown', true, true);
		anchorNode.dispatchEvent(e);
	}
}
function fireOnMouseUp(obj){
	var anchorNode;
	if(typeof obj === "string"){
		var demoWidget = dijit.byId(obj);
		anchorNode = demoWidget.domNode;
	}else{
		anchorNode = obj;
	}
	if(dojo.isIE<9){
		anchorNode.fireEvent( "onmouseup" );
	}else{
		var e = document.createEvent('Events');
		e.initEvent('mouseup', true, true);
		anchorNode.dispatchEvent(e);
	}
}

function fireTouchEvent(eventtype, node, x, y){
	if(dojo.isIE<9){
		var e = document.createEventObject(window.event);
		e.button = 1;
		e.pageX = x;
		e.pageY = y;
		node.fireEvent( "on" + eventtype[1], e );
	}else{
		var e = document.createEvent('Events');
		e.initEvent( dojo.has('touch') ? eventtype[0] : eventtype[1], true, true);
		e.touches = [ { pageX: x, pageY: y } ];
		e.pageX = x;
		e.pageY = y;
		e.changedTouches = e.touches;
		node.dispatchEvent(e);
	}
}

/*
function fireTouchStart(node, x, y){
	fireTouchEvent(["touchstart", "mousedown"], node, x, y);
}

function fireTouchEnd(node, x, y){
	fireTouchEvent(["touchend", "mouseup"], node, x, y);
}

function fireTouchMove(node, x, y){
	fireTouchEvent(["touchmove", "mousemove"], node, x, y);
}
*/

function verifyListItem(id, text, rightText, domButtonType, hasIcon, hasRightIcon, hasIcon2, hasVariableHeight, regExp, hasSelected, isSprite){
	var demoWidget = dijit.byId(id);
	doh.assertNotEqual(null, demoWidget, "ListItem: Did not instantiate. id=" + id);
	doh.assertEqual('mblListItem' + (hasVariableHeight ?" mblVariableHeight":"") + (hasSelected ?" mblListItemSelected":""), demoWidget.domNode.className, "id=" + id);
	var childNodes = demoWidget.domNode.children;
//	doh.assertEqual('mblListItemAnchor' + (hasIcon?'':' mblListItemAnchorNoIcon'), childNodes[0].className);
	
//	doh.assertEqual('A', childNodes[0].tagName);
	
//	childNodes = childNodes[0].childNodes;

	var i=0;
	if(hasIcon){
		if(!dojo.isIE && regExp){
			if(isSprite){
				doh.assertTrue(childNodes[i].childNodes[0].src.search(regExp) != -1, "search " + regExp.toString());
			}else{
				doh.assertTrue(childNodes[i].src.search(regExp) != -1, "search " + regExp.toString());
			}
		}
		doh.assertTrue(dojo.hasClass(childNodes[i], 'mblListItemIcon'), 'mblListItemIcon id=' + id + " got: " + childNodes[i].className);
		i++;
	}

	if(hasRightIcon){
		if(domButtonType){
			doh.assertEqual(domButtonType + ' mblDomButton', childNodes[i].childNodes[0].className, "id=" + id);
		}
		doh.assertTrue(dojo.hasClass(childNodes[i], 'mblListItemRightIcon'), 'mblListItemRightIcon id=' + id + " got: " + childNodes[i].className);
		i++;
	}

	if(hasIcon2){
		doh.assertTrue(dojo.hasClass(childNodes[i], 'mblListItemRightIcon2'), 'mblListItemRightIcon2 id=' + id + " got: " + childNodes[i].className);
		i++;
	}

	if(rightText){
		doh.assertEqual(rightText, dojo.isFF ==3.6 ? childNodes[i].childNodes[0].innerHTML : childNodes[i].innerHTML, "id=" + id); //2 0r 3
		doh.assertEqual('mblListItemRightText', childNodes[i++].className, "id=" + id);
	}
	if(!hasVariableHeight){
		doh.assertEqual('mblListItemLabel', childNodes[i].className, "id=" + id);
		doh.assertEqual('DIV', childNodes[i].tagName, "id=" + id);
	}else{
		doh.assertEqual('mblListItemLabel', childNodes[i+1].className, "id=" + id);
		doh.assertEqual('DIV', childNodes[i+1].tagName, "id=" + id);
	}

	try{
		doh.assertEqual(text, dojo.trim(childNodes[i].innerHTML.replace(/\r\n|\n|\t/g,"")), "id=" + id);
	} catch (e) {
		if(dojo.isFF ==3.6){
			doh.assertEqual(text, dojo.trim(childNodes[i].childNodes[0].innerHTML.replace(/\r\n|\n|\t/g,"")), "id=" + id);
		}else{
			throw e;
		}
	}

}

function verifyListItemPos(id, rTop, rRight, rBottom, rLeft, sTop, sLeft, isSprite) {
	var demoWidget = dijit.byId(id);
	var node;
	if(isSprite){
		node = demoWidget.domNode.childNodes[0].childNodes[0];
	}else{
		node = demoWidget.domNode.childNodes[0].childNodes[0].childNodes[0];
	}
	verifyRect(node, rTop, rRight, rBottom, rLeft);

	doh.assertEqual(sTop, node.style.top);
	doh.assertEqual(sLeft, node.style.left);
}

function verifyRect(node, rTop, rRight, rBottom, rLeft) {
	var rectArray = node.style.clip.split(/[, ]+/);
	doh.assertEqual("rect("+rTop, rectArray[0]);
	doh.assertEqual(rRight, rectArray[1]);
	doh.assertEqual(rBottom, rectArray[2]);
	doh.assertEqual(rLeft+")", rectArray[3]);
}

function verifyIconItem(id, text, display, regExp, isSprite){
	var demoWidget = dijit.byId(id);
	if(!dojo.isIE && !dojo.isFF) {
		if(isSprite){
			doh.assertTrue(demoWidget.domNode.childNodes[0].childNodes[0].childNodes[0].childNodes[0].src.search(regExp) != -1, "search " + regExp.toString() + " id=" +id);
		}else{
			doh.assertTrue(demoWidget.domNode.childNodes[0].childNodes[0].childNodes[0].src.search(regExp) != -1, "search " + regExp.toString() + " id=" +id);
		}
	}
	doh.assertEqual(text, demoWidget.domNode.childNodes[0].childNodes[1].childNodes[0].nodeValue, "id=" +id);
	doh.assertEqual(display, demoWidget.paneWidget.domNode.style.display, "id=" +id);
	doh.assertEqual('mblIconItemPaneHeading', demoWidget.paneWidget.domNode.childNodes[0].className, "id=" +id);
	doh.assertEqual('mblDomButtonBlueMinus mblDomButton', demoWidget.paneWidget.domNode.childNodes[0].childNodes[0].childNodes[0].className, "id=" +id);
	doh.assertEqual(text, demoWidget.paneWidget.domNode.childNodes[0].childNodes[1].childNodes[0].nodeValue, "id=" +id);
}

function verifyTabBarButton(id, text, classNames, visibility1, visibility2, regExp1, regExp2, isSprite){
	var demoWidget = dijit.byId(id);
	for(var i = 0; i < classNames.length;i++){
		doh.assertTrue(dojo.hasClass(demoWidget.domNode, classNames[i]), classNames[i] + " id=" +id + " className:"+demoWidget.domNode.className);
	}
	doh.assertEqual('mblTabBarButtonIconArea', demoWidget.domNode.childNodes[0].className, "id=" +id);
	doh.assertEqual('mblTabBarButtonLabel', demoWidget.domNode.childNodes[1].className, "id=" +id);
	if(demoWidget.iconNode1){
		if(!dojo.isIE) {
			if(isSprite){
				doh.assertTrue(demoWidget.iconNode1.childNodes[0].src.search(regExp1) != -1, "search " + regExp1.toString() + " id=" +id);
			}else{
				doh.assertTrue(demoWidget.iconNode1.src.search(regExp1) != -1, "search " + regExp1.toString() + " id=" +id);
			}
		}
//		doh.assertEqual(visibility1, demoWidget.iconNode1.style.visibility, "id=" +id);
	}else{
		console.log("There is no iconNode1. id=" + id);
	}
	if(demoWidget.iconNode2){
		if(!dojo.isIE){
			if(isSprite){
				doh.assertTrue(demoWidget.iconNode2.childNodes[0].src.search(regExp2) != -1, "search " + regExp2.toString() + " id=" +id);
			}else{
				doh.assertTrue(demoWidget.iconNode2.src.search(regExp2) != -1, "search " + regExp2.toString() + " id=" +id);
			}
		}
		doh.assertEqual(visibility2, demoWidget.iconNode2.style.visibility, "id=" +id);
	}else{
		console.log("There is no iconNode2. id=" + id);
	}
	doh.assertEqual(text, dojo.trim(demoWidget.labelNode.innerHTML), "id=" +id);
}
