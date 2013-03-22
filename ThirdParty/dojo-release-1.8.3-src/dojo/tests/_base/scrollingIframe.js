var isQuirks = document.compatMode == "BackCompat";

function runScrollingTest(resultNode){
	// reposition the absolute-positioned tag to the top/left of the static control
	//	element and check to make sure each has the same offsetLeft/Top
	if(!("dojo" in window)){
		var doc = frameElement.ownerDocument;
		var win = doc.parentWindow || doc.defaultView;
		dojo = win.dojo;
	}
	var isLtr = dojo.hitch(dojo, "withGlobal")(window, "_isBodyLtr", dojo, []);
	var root = isQuirks? document.body : document.documentElement;
	var control = document.getElementById("control");
	var clientWidth = document.getElementById("clientWidth");
	var abs1 = document.getElementById("abs1");
	window.scrollTo(0, 0); // start with standarized placement
	setTimeout(function(){
		var cw = dojo.hitch(dojo, "withGlobal")(window, "position", dojo, [clientWidth, false]);
		if(cw.x != 0){
			scrollBy(cw.x, 0); // scroll width:100% control element fully into view
		}
		var p = dojo.hitch(dojo, "withGlobal")(window, "position", dojo, [control, true]);
		abs1.style.left = p.x + "px";
		abs1.style.top = p.y + "px";
		setTimeout(function(){
			cw = dojo.hitch(dojo, "withGlobal")(window, "position", dojo, [clientWidth, false]);
			if(cw.x >= 0 || (cw.x < 0 && root.clientWidth - cw.w == cw.x)){
				if(abs1.offsetLeft == control.offsetLeft){
					if(abs1.offsetTop == control.offsetTop){
						resultNode.testResult = "EQUAL";
					}else{
						resultNode.testResult = "abs1.offsetTop="+abs1.offsetTop + " control.offsetTop="+control.offsetTop;
					}
				}else{
					resultNode.testResult = "abs1.offsetLeft="+abs1.offsetLeft + " control.offsetLeft="+control.offsetLeft;
				}
			}else{
				resultNode.testResult = "100% width element start/size=" + cw.x+'/'+cw.w + " frame client left/width="+root.clientLeft+'/'+root.clientWidth;
			}
			if(resultNode.resultReady){ resultNode.resultReady(); }
		}, 100);
	}, 100);
}

function genScrollingTestNodes(hScroll, vScroll, large){
	document.write(
		'<DIV id="abs1" style="position:absolute;background-color:red;left:0;top:0;width:1em;font-family:monospace;font-size:16px;">&nbsp;</DIV>' +
		'<DIV id="control" style="width:2em;height:2em;font-family:monospace;font-size:16px;background-color:cyan;margin:0 1em;border:0;padding:0;">&nbsp;&nbsp;</DIV>' +
		( large
			? (
				(hScroll ? '<DIV style="float:left;position:relative;width:600px;">&nbsp;</DIV>' : '') +
				(hScroll ? '<DIV style="float:right;position:relative;width:600px;">&nbsp;</DIV>' : '') +
				(vScroll ? '<CENTER style="width:1px;height:600px;">&nbsp;</CENTER>' : '')
			)
			: ''
		) +
	'');
}

function genScrollingTestBody(){
	var options = window.location.search.substr(1).toLowerCase().split(/&/);
	options.dir = "ltr";
	for(var i=0; i < options.length; i++){
		var option = options[i];
		switch(option){
			case "ltr":
			case "rtl":
				options.dir = option;
				break;
			case"both":
				options.horz = 1;
				options.vert = 1;
				break;
			default: options[option] = 1;
		}
	}
	var html = document.getElementsByTagName("HTML")[0];
	html.dir = options.dir;
	// the setTimeout in the onload allows the browser time to scroll the iframe to the previous position
	var scroll = options.large ? '' : 'scroll';
	if(!options.horz){
		html.style.overflowX = "hidden";
	}else if(!isQuirks && !options.large){
		html.style.overflowX = scroll;
	}
	if(!options.vert){
		html.style.overflowY = "hidden";
	}else if(!isQuirks && !options.large){
		html.style.overflowY = scroll;
	}
	document.write('<BODY style="height:100%;margin:0;padding:0;border:0;background-color:white;overflow-x:' + (options.horz ? (isQuirks ? scroll : '') : 'hidden') + ';overflow-y:' + (isQuirks ? (options.vert ? scroll : 'hidden') : '') + ';">');
	document.write('<DIV id="clientWidth"><CENTER>'+(isQuirks?'quirks ':'strict ')+(options.horz?'horiz ':'')+(options.vert?'vert ':'')+(options.large?'scrolling ':'')+options.dir+'</CENTER></DIV>');
	genScrollingTestNodes(options.horz, options.vert, options.large);
	document.write('</BODY>');
}

if(!document.body){
	frameElement.runScrollingTest = runScrollingTest;
	genScrollingTestBody();
}else{
	document.write('<DIV id="clientWidth" style="background-color:transparent;">&nbsp;</DIV>');
	genScrollingTestNodes();
}
