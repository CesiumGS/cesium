define("dojox/html/ellipsis",["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/Color", "dojo/colors"], function(d){
	/*=====
	return {
		// summary:
		//		offers cross-browser support for text-overflow: ellipsis
		// description:
		//		Add "dojoxEllipsis" on any node that you want to ellipsis-ize. In order to function properly,
		//		the node with the dojoxEllipsis class set on it should be a child of a node with a defined width.
		//		It should also be a block-level element (i.e. `<div>`) - it will not work on td elements.
		//		NOTE: When using the dojoxEllipsis class within tables, the table needs to have the table-layout: fixed style
	};
	=====*/
	
	if(d.isFF < 7){ //TODO: feature detect text-overflow in computed style?
		// The delay (in ms) to wait so that we don't keep querying when many
		// changes happen at once - set config "dojoxFFEllipsisDelay" if you
		// want a different value
		var delay = 1;
		if("dojoxFFEllipsisDelay" in d.config){
			delay = Number(d.config.dojoxFFEllipsisDelay);
			if(isNaN(delay)){
				delay = 1;
			}
		}
		try{
			var createXULEllipsis = (function(){
				// Create our stub XUL elements for cloning later
				// NOTE: this no longer works as of FF 4.0:
				// https://developer.mozilla.org/En/Firefox_4_for_developers#Remote_XUL_support_removed
				var sNS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
				var xml = document.createElementNS(sNS, 'window');
				var label = document.createElementNS(sNS, 'description');
				label.setAttribute('crop', 'end');
				xml.appendChild(label);

				return function(/* Node */ n){
					// Summary:
					//		Given a node, it creates the XUL and sets its
					//		content so that it will have an ellipsis
					var x = xml.cloneNode(true);
					x.firstChild.setAttribute('value', n.textContent);
					n.innerHTML = '';
					n.appendChild(x);
				};
			})();
		}catch(e){}
		
		// Create our iframe elements for cloning later
		var create = d.create;
		var dd = d.doc;
		var dp = d.place;
		var iFrame = create("iframe", {className: "dojoxEllipsisIFrame",
					src: "javascript:'<html><head><script>if(\"loadFirebugConsole\" in window){window.loadFirebugConsole();}</script></head><body></body></html>'", style: {display: "none"}});
		var rollRange = function(/* W3C Range */ r, /* int? */ cnt){
			// summary:
			//		Rolls the given range back one character from the end
			// r: W3C Range
			//		The range to roll back
			// cnt: int?
			//		An optional number of times to roll back (defaults 1)
			if(r.collapsed){
				// Do nothing - we are already collapsed
				return;
			}
			if(cnt > 0){
				do{
					rollRange(r);
					cnt--;
				}while(cnt);
				return;
			}
			if(r.endContainer.nodeType == 3 && r.endOffset > 0){
				r.setEnd(r.endContainer, r.endOffset - 1);
			}else if(r.endContainer.nodeType == 3){
				r.setEndBefore(r.endContainer);
				rollRange(r);
				return;
			}else if(r.endOffset && r.endContainer.childNodes.length >= r.endOffset){
				var nCont = r.endContainer.childNodes[r.endOffset - 1];
				if(nCont.nodeType == 3){
					r.setEnd(nCont, nCont.length - 1);
				}else if(nCont.childNodes.length){
					r.setEnd(nCont, nCont.childNodes.length);
					rollRange(r);
					return;
				}else{
					r.setEndBefore(nCont);
					rollRange(r);
					return;
				}
			}else{
				r.setEndBefore(r.endContainer);
				rollRange(r);
				return;
			}
		};
		var createIFrameEllipsis = function(/* Node */ n){
			// summary:
			//		Given a node, it creates an iframe and and ellipsis div and
			//		sets up the connections so that they will work correctly.
			//		This function is used when createXULEllipsis is not able
			//		to be used (because there is markup within the node) - it's
			//		a bit slower, but does the trick
			var c = create("div", {className: "dojoxEllipsisContainer"});
			var e = create("div", {className: "dojoxEllipsisShown", style: {display: "none"}});
			n.parentNode.replaceChild(c, n);
			c.appendChild(n);
			c.appendChild(e);
			var i = iFrame.cloneNode(true);
			var ns = n.style;
			var es = e.style;
			var ranges;
			var resizeNode = function(){
				ns.display = "";
				es.display = "none";
				if(n.scrollWidth <= n.offsetWidth){ return; }
				var r = dd.createRange();
				r.selectNodeContents(n);
				ns.display = "none";
				es.display = "";
				var done = false;
				do{
					var numRolls = 1;
					dp(r.cloneContents(), e, "only");
					var sw = e.scrollWidth, ow = e.offsetWidth;
					done = (sw <= ow);
					var pct = (1 - ((ow * 1) / sw));
					if(pct > 0){
						numRolls = Math.max(Math.round(e.textContent.length * pct) - 1, 1);
					}
					rollRange(r, numRolls);
				}while(!r.collapsed && !done);
			};
			i.onload = function(){
				i.contentWindow.onresize = resizeNode;
				resizeNode();
			};
			c.appendChild(i);
		};

		// Function for updating the ellipsis
		var hc = d.hasClass;
		var doc = d.doc;
		var s, fn, opt;
		if(doc.querySelectorAll){
			s = doc;
			fn = "querySelectorAll";
			opt = ".dojoxEllipsis";
		}else if(doc.getElementsByClassName){
			s = doc;
			fn = "getElementsByClassName";
			opt = "dojoxEllipsis";
		}else{
			s = d;
			fn = "query";
			opt = ".dojoxEllipsis";
		}
		fx = function(){
			d.forEach(s[fn].apply(s, [opt]), function(n){
				if(!n || n._djx_ellipsis_done){ return; }
				n._djx_ellipsis_done = true;
				if(createXULEllipsis && n.textContent == n.innerHTML && !hc(n, "dojoxEllipsisSelectable")){
					// We can do the faster XUL version, instead of calculating
					createXULEllipsis(n);
				}else{
					createIFrameEllipsis(n);
				}
			});
		};
		
		d.addOnLoad(function(){
			// Apply our initial stuff
			var t = null;
			var c = null;
			var connFx = function(){
				if(c){
					// disconnect us - so we don't fire anymore
					d.disconnect(c);
					c = null;
				}
				if(t){ clearTimeout(t); }
				t = setTimeout(function(){
					t = null;
					fx();
					// Connect to the modified function so that we can catch
					// our next change
					c = d.connect(d.body(), "DOMSubtreeModified", connFx);
				}, delay);
			};
			connFx();
		});
	}
});
