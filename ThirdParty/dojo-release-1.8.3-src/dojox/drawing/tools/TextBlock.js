define(["dojo", "dijit/registry", "../util/oo", "../manager/_registry", "../stencil/Text"],
function(dojo, dijit, oo, registry, StencilText){

	var conEdit;
	dojo.addOnLoad(function(){
		//		In order to use VML in IE, it's necessary to remove the
		//		DOCTYPE. But this has the side effect that causes a bug
		//		where contenteditable divs cannot be made dynamically.
		//		The solution is to include one in the main document
		//		that can be appended and removed as necessary:
		//		<div id="conEdit" contenteditable="true"></div>

		// console.log("Removing conedit");
		conEdit = dojo.byId("conEdit");
		if(!conEdit){
			console.error("A contenteditable div is missing from the main document. See 'dojox.drawing.tools.TextBlock'")
		}else{
			conEdit.parentNode.removeChild(conEdit);
		}
	});
	
	var TextBlock = oo.declare(
		// TODO - disable zoom while showing?

		// FIXME:
		//		Handles width: auto, align:middle, etc. but for
		//		display only, edit is out of whack

		StencilText,
		function(options){
			// summary:
			//		constructor

			if(options.data){
				var d = options.data;
				var text = d.text ? this.typesetter(d.text) : d.text;
				var w = !d.width ? this.style.text.minWidth : d.width=="auto" ? "auto" : Math.max(d.width, this.style.text.minWidth);
				var h = this._lineHeight;
				
				if(text && w=="auto"){
					var o = this.measureText(this.cleanText(text, false), w);
					w = o.w;
					h = o.h;
				}else{
					// w = this.style.text.minWidth;
					this._text = "";
				}
				
				this.points = [
					{x:d.x, y:d.y},
					{x:d.x+w, y:d.y},
					{x:d.x+w, y:d.y+h},
					{x:d.x, y:d.y+h}
				];
				
				if(d.showEmpty || text){
					this.editMode = true;
					
				
					dojo.disconnect(this._postRenderCon);
					this._postRenderCon = null;
					this.connect(this, "render", this, "onRender", true);
					
					if(d.showEmpty){
						this._text = text || "";
						this.edit();
					}else if(text && d.editMode){
						this._text = "";
						this.edit();
					}else if(text){
						this.render(text);
					}
					setTimeout(dojo.hitch(this, function(){
						this.editMode = false;
					}),100)
					
				}else{
					// Why make it if it won't render...
					this.render();
				}
				
			}else{
				this.connectMouse();
				this._postRenderCon = dojo.connect(this, "render", this, "_onPostRender");
			}
			//console.log("TextBlock:", this.id)
		},
		{
			// summary:
			//		A tool to create text fields on a canvas.
			// description:
			//		Extends stencil.Text by adding an HTML layer that
			//		can be dragged out to a certain size, and accept
			//		a text entry. Will wrap text to the width of the
			//		html field.
			//		When created programmtically, use 'auto' to shrink
			//		the width to the size of the text. Use line breaks
			//		( \n ) to create new lines.

			draws:true,
			baseRender:false,
			type:"dojox.drawing.tools.TextBlock",
			_caretStart: 0,
			_caretEnd: 0,
			_blockExec: false,
			
/*=====
StencilData: {
	// summary:
	//		The data used to create the dojox.gfx Text
	// x: Number
	//		Left point x
	// y: Number
	//		Top point y
	// width: Number|String?
	//		Optional width of Text. Not required but recommended.
	//		for auto-sizing, use 'auto'
	// height: Number?
	//		Optional height of Text. If not provided, _lineHeight is used.
	// text: String
	//		The string content. If not provided, may auto-delete depending on defaults.
},
=====*/
			
			// selectOnExec: Boolean
			//		Whether the Stencil is selected when the text field
			//		is executed or not
			selectOnExec:true,

			// showEmpty: Boolean
			//		If true and there is no text in the data, the TextBlock
			//		Is displayed and focused and awaits input.
			showEmpty: false,
			
			onDrag: function(/*EventObject*/obj){
				if(!this.parentNode){
					this.showParent(obj);
				}
				var s = this._startdrag, e = obj.page;
				this._box.left = (s.x < e.x ? s.x : e.x);
				this._box.top = s.y;
				this._box.width = (s.x < e.x ? e.x-s.x : s.x-e.x) + this.style.text.pad;
				
				dojo.style(this.parentNode, this._box.toPx());
			},
			
			onUp: function(/*EventObject*/obj){
				if(!this._downOnCanvas){ return; }
				this._downOnCanvas = false;
				
				var c = dojo.connect(this, "render", this, function(){
					dojo.disconnect(c);
					this.onRender(this);
					
				});
				this.editMode = true;
				this.showParent(obj);
				this.created = true;
				this.createTextField();
				this.connectTextField();
			},
			
			showParent: function(/*EventObject*/obj){
				// summary:
				//		Internal. Builds the parent node for the
				//		contenteditable HTML node.

				if(this.parentNode){ return; }
				var x = obj.pageX || 10;
				var y = obj.pageY || 10;
				this.parentNode = dojo.doc.createElement("div");
				this.parentNode.id = this.id;
				var d = this.style.textMode.create;
				this._box = {
					left:x,
					top:y,
					width:obj.width || 1,
					height:obj.height && obj.height>8 ? obj.height : this._lineHeight,
					border:d.width+"px "+d.style+" "+d.color,
					position:"absolute",
					zIndex:500,
					toPx: function(){
						var o = {};
						for(var nm in this){
							o[nm] = typeof(this[nm])=="number" && nm!="zIndex" ? this[nm] + "px" : this[nm];
						}
						return o;
					}
				};
				
				dojo.style(this.parentNode, this._box);
				
				document.body.appendChild(this.parentNode);
			},
			createTextField: function(/*String*/txt){
				// summary:
				//		Internal. Inserts the contenteditable HTML node
				//		into its parent node, and styles it.

				// style parent
				var d = this.style.textMode.edit;
				this._box.border = d.width+"px "+d.style+" "+d.color;
				this._box.height = "auto";
				this._box.width = Math.max(this._box.width, this.style.text.minWidth*this.mouse.zoom);
				dojo.style(this.parentNode, this._box.toPx());
				// style input
				this.parentNode.appendChild(conEdit);
				dojo.style(conEdit, {
					height: txt ? "auto" : this._lineHeight+"px",
					fontSize:(this.textSize/this.mouse.zoom)+"px",
					fontFamily:this.style.text.family
				});
				// FIXME:
				// In Safari, if the txt ends with '&' it gets stripped
				conEdit.innerHTML = txt || "";
				
				return conEdit; //HTMLNode
			},
			connectTextField: function(){
				// summary:
				//		Internal. Creates the connections to the
				//		contenteditable HTML node.

				if(this._textConnected){ return; } // good ol' IE and its double events
				// FIXME:
				// Ouch-getting greekPalette by id.  At the minimum this should
				// be from the plugin manager
				var greekPalette = dijit.byId("greekPalette");
				var greekHelp = greekPalette==undefined ? false : true;
				if(greekHelp){
					//set it up
					dojo.mixin(greekPalette,{
						_pushChangeTo: conEdit,
						_textBlock: this
					});
				};
				
				this._textConnected = true;
				this._dropMode = false;
				this.mouse.setEventMode("TEXT");
				this.keys.editMode(true);
				var kc1, kc2, kc3, kc4, self = this, _autoSet = false,
					exec = function(){
						if(self._dropMode){ return; }
						dojo.forEach([kc1,kc2,kc3,kc4], function(c){
							dojo.disconnect(c)
						});
						self._textConnected = false;
						self.keys.editMode(false);
						self.mouse.setEventMode();
						self.execText();
					};
					
				kc1 = dojo.connect(conEdit, "keyup", this, function(evt){
					// 	if text is empty, we need a height so the field's height
					//	doesn't collapse
					if(dojo.trim(conEdit.innerHTML) && !_autoSet){
						dojo.style(conEdit, "height", "auto"); _autoSet = true;
					}else if(dojo.trim(conEdit.innerHTML).length<2 && _autoSet){
						dojo.style(conEdit, "height", this._lineHeight+"px"); _autoSet = false;
					}
					
					if(!this._blockExec){
						if(evt.keyCode==13 || evt.keyCode==27){
							dojo.stopEvent(evt);
							exec();
						}
					} else {
						if(evt.keyCode==dojo.keys.SPACE){
							dojo.stopEvent(evt);
							greekHelp && greekPalette.onCancel();
						}
					}
				});
				kc2 = dojo.connect(conEdit, "keydown", this, function(evt){
					if(evt.keyCode==13 || evt.keyCode==27){ // TODO: make escape an option
						dojo.stopEvent(evt);
					}
					// if backslash, user is inputting a special character
					// This gives popup help.
					if(evt.keyCode==220){
						if(!greekHelp){
							console.info("For greek letter assistance instantiate: dojox.drawing.plugins.drawing.GreekPalette");
							return;
						}
						dojo.stopEvent(evt);
						this.getSelection(conEdit);
						// Differences in how browsers handle events made it necessary
						// to stop the evt and add the backslash here.
						this.insertText(conEdit,"\\");
						this._dropMode = true;
						this._blockExec = true;
						greekPalette.show({
							around:this.parentNode,
							orient:{'BL':'TL'}
						});
					}
					if(!this._dropMode){
						this._blockExec = false;
					} else {
						// Controls for when we have a character helper and it's active
						switch(evt.keyCode){
							case dojo.keys.UP_ARROW:
							case dojo.keys.DOWN_ARROW:
							case dojo.keys.LEFT_ARROW:
							case dojo.keys.RIGHT_ARROW:
								dojo.stopEvent(evt);
								greekPalette._navigateByArrow(evt);
								break;
							case dojo.keys.ENTER:
								dojo.stopEvent(evt);
								greekPalette._onCellClick(evt);
								break;
							case dojo.keys.BACKSPACE:
							case dojo.keys.DELETE:
								dojo.stopEvent(evt);
								greekPalette.onCancel();
								break;
						}
					}
					
				});
				
				kc3 = dojo.connect(document, "mouseup", this, function(evt){
					// note: _onAnchor means an anchor has been clicked upon
					if(!this._onAnchor && evt.target.id != "conEdit"){
						dojo.stopEvent(evt);
						exec();
					}else if(evt.target.id == "conEdit" && conEdit.innerHTML == ""){
						// wonky stuff happens when you click on the
						// field when its empty.
						conEdit.blur();
						setTimeout(function(){
							conEdit.focus();
						},200)
					}
				});
				
				this.createAnchors();
				
				kc4 = dojo.connect(this.mouse, "setZoom", this, function(evt){
					exec();
				});
				
				
				conEdit.focus();
				
				this.onDown = function(){};
				this.onDrag = function(){};
				
				setTimeout(dojo.hitch(this, function(){
					// once again for Silverlight:
					conEdit.focus();
					
					// this is a pretty odd chunk of code here.
					// specifcally need to overwrite old onUp
					// however, this still gets called. its
					// not disconnecting.
					this.onUp = function(){
						if(!self._onAnchor && this.parentNode){
							self.disconnectMouse();
							exec();
							self.onUp = function(){}
						}
					}
				}), 500);
			},
			
			
			execText: function(){
				// summary:
				//		Internal. Method fired when text is executed,
				//		via mouse-click-off, ESC key or Enter key.

				var d = dojo.marginBox(this.parentNode);
				var w = Math.max(d.w, this.style.text.minWidth);
				
				var txt = this.cleanText(conEdit.innerHTML, true);
				conEdit.innerHTML = "";
				conEdit.blur();
				this.destroyAnchors();

				// need to convert characters before measuring width.
				txt = this.typesetter(txt);
				
				var o = this.measureText(txt, w);
				var sc = this.mouse.scrollOffset();
				var org = this.mouse.origin;
				
				var x = this._box.left + sc.left - org.x;
				var y = this._box.top + sc.top - org.y;
				
				x *= this.mouse.zoom;
				y *= this.mouse.zoom;
				w *= this.mouse.zoom;
				o.h *= this.mouse.zoom;
				
				
				this.points = [
					{x:x, y:y},
					{x:x+w, y:y},
					{x:x+w, y:y+o.h},
					{x:x, y:y+o.h}
				];
				this.editMode = false;
				
				
				console.log("EXEC TEXT::::", this._postRenderCon);
				
				if(!o.text){
					this._text = "";
					this._textArray = [];
				}
				// Only for Combo objects (vectors, rectangle, or ellipse).
				this.render(o.text);
				this.onChangeText(this.getText());
			},
			
			edit: function(){
				// summary:
				//		Internal?
				//		Method used to instantiate the contenteditable HTML node.

				this.editMode = true;
				var text = this.getText() || "";
				console.log("EDIT TEXT:",text, " ",text.replace("/n", " "));
				// NOTE: no mouse obj
				if(this.parentNode || !this.points){ return; }
				var d = this.pointsToData();
				
				var sc = this.mouse.scrollOffset();
				var org = this.mouse.origin;
				
				var obj = {
					pageX: (d.x  ) / this.mouse.zoom - sc.left + org.x,
					pageY: (d.y  ) / this.mouse.zoom- sc.top + org.y,
					width:d.width / this.mouse.zoom,
					height:d.height / this.mouse.zoom
				};
				
				this.remove(this.shape, this.hit);
				this.showParent(obj);
				this.createTextField(text.replace("/n", " "));
				this.connectTextField();
				if(text){
					//setTimeout(dojo.hitch(this, function(){
					this.setSelection(conEdit, "end");
					//}), 500)
				}
			},
			cleanText: function(/*String*/txt, /*Boolean*/removeBreaks){
				// summary:
				//		Cleans text. Strings HTML chars and double spaces
				//		and optionally removes line breaks.
				var replaceHtmlCodes = function(str){
					var chars = {
						"&lt;":"<",
						"&gt;":">",
						"&amp;":"&"
					};
					for(var nm in chars){
						str = str.replace(new RegExp(nm, "gi"), chars[nm])
					}
					return str
				};

				if(removeBreaks){
					dojo.forEach(['<br>', '<br/>', '<br />', '\\n', '\\r'], function(br){
						txt = txt.replace(new RegExp(br, 'gi'), " ");
					});
				}
				txt = txt.replace(/&nbsp;/g, " ");
				txt = replaceHtmlCodes(txt);
				txt = dojo.trim(txt);
				// remove double spaces, since SVG doesn't show them anyway
				txt = txt.replace(/\s{2,}/g, " ");
				return txt; //String
			},
			
			measureText: function(/* String */ str, /* ? Number */width){
				// summary:
				//		Mechanism for measuring text.
				//		SVG nor VML have a way of determining the width or
				//		height of a block of text. This method creates an
				//		HTML text block and those measurements are used for
				//		displaying the SVG/VML text.
				// str: String
				//		The text to display and measure.
				// width: [optional] Number
				//		If the width is not provided, it will be assumed
				//		that the text is one line and the width will be
				//		measured and the _lineHeight used for th height.
				//		If width is provided, word-wrap is assumed, and
				//		line breaks will be inserted into the text at each
				//		point where a word wraps in the HTML. The height is
				//		then measured.

				var r = "(<br\\s*/*>)|(\\n)|(\\r)";
				this.showParent({width:width || "auto", height:"auto"});
				this.createTextField(str);
				var txt = "";
				var el = conEdit;
				el.innerHTML = "X";
				var h = dojo.marginBox(el).h;
				
				el.innerHTML = str;
				
				if(!width || new RegExp(r, "gi").test(str)){
					// has line breaks in text
					txt = str.replace(new RegExp(r, "gi"), "\n");
					el.innerHTML = str.replace(new RegExp(r, "gi"), "<br/>");
				
				}else if(dojo.marginBox(el).h == h){
					// one line
					txt = str;
					
				}else{
					// text wraps
					var ar = str.split(" ");
					var strAr = [[]];
					var line = 0;
					el.innerHTML = "";
					while(ar.length){
						var word = ar.shift();
						el.innerHTML += word+" "; //urk, always an extra space
						if(dojo.marginBox(el).h > h){
							line++;
							strAr[line] = [];
							el.innerHTML = word+" ";
						}
						strAr[line].push(word)
					}
					
					dojo.forEach(strAr, function(ar, i){
						strAr[i] = ar.join(" ");
					});
					txt = strAr.join("\n");
					
					// get the resultant height
					el.innerHTML = txt.replace("\n", "<br/>");
					
				}
				
				var dim = dojo.marginBox(el);
				
				conEdit.parentNode.removeChild(conEdit);
				dojo.destroy(this.parentNode);
				this.parentNode = null;
				
				return {h:dim.h, w:dim.w, text:txt}; //Object
			},
			
			_downOnCanvas:false,
			onDown: function(/*EventObject*/obj){
				this._startdrag = {
					x: obj.pageX,
					y: obj.pageY
				};
				dojo.disconnect(this._postRenderCon);
				this._postRenderCon = null;
				this._downOnCanvas = true;
			},
			
			createAnchors: function(){
				// summary:
				//		Internal. Creates HTML nodes at each corner
				//		of the contenteditable div. These nodes are
				//		draggable and will resize the div horizontally.

				this._anchors = {};
				var self = this;
				var d = this.style.anchors,
					b = d.width,
					w = d.size-b*2,
					h = d.size-b*2,
					p = (d.size)/2*-1 + "px";
				
				var s = {
					position:"absolute",
					width:w+"px",
					height:h+"px",
					backgroundColor:d.fill,
					border:b+"px " + d.style + " "+d.color
				};
				if(dojo.isIE){
					s.paddingLeft = w + "px";
					s.fontSize = w + "px"
				}
				var ss = [
					{top: p, left:p},
					{top:p, right:p},
					{bottom:p, right:p},
					{bottom:p,left:p}
				];
				for(var i=0;i<4;i++){
					var isLeft = (i==0) || (i==3);
					var id = this.util.uid(isLeft ? "left_anchor" : "right_anchor");
					
					var a = dojo.create("div", {id:id}, this.parentNode);
					dojo.style(a, dojo.mixin(dojo.clone(s), ss[i]));
					
					var md, mm, mu;
					var md = dojo.connect(a, "mousedown", this, function(evt){
						isLeft = evt.target.id.indexOf("left")>-1;
						self._onAnchor = true;
						var orgX = evt.pageX;
						var orgW = this._box.width;
						dojo.stopEvent(evt);
						
							
						mm = dojo.connect(document, "mousemove", this, function(evt){
							var x = evt.pageX;
							if(isLeft){
								this._box.left = x;
								this._box.width = orgW + orgX - x;
							}else{
								this._box.width = x + orgW - orgX;
							}
							dojo.style(this.parentNode, this._box.toPx());
						});
						
						mu = dojo.connect(document, "mouseup", this, function(evt){
							orgX = this._box.left;
							orgW = this._box.width;
							dojo.disconnect(mm);
							dojo.disconnect(mu);
							self._onAnchor = false;
							conEdit.focus();
							dojo.stopEvent(evt);
						});
					});
					
					this._anchors[id] = {
						a:a,
						cons:[md]
					}
				}
			},
			
			destroyAnchors: function(){
				// summary:
				//		Internal. Destroys HTML anchors.
				for(var n in this._anchors){
					dojo.forEach(this._anchors[n].con, dojo.disconnect, dojo);
					dojo.destroy(this._anchors[n].a);
				};
			},
			
			setSavedCaret: function(val){
				// summary:
				//		Internal, called when caret needs to
				//		be moved into position after text is added
				this._caretStart = this._caretEnd = val;
			},
			
			getSavedCaret: function(){
				return {start: this._caretStart, end: this._caretEnd}
			},
			
			insertText: function(node,val){
				// summary:
				//		Uses saved caret position to insert text
				//		into position and place caret at the end of
				//		insertion

				var t, text = node.innerHTML;
				var caret = this.getSavedCaret();
				
				text = text.replace(/&nbsp;/g, " ");
				t = text.substr(0,caret.start) + val + text.substr(caret.end);
				t = this.cleanText(t,true);
				this.setSavedCaret(Math.min(t.length,(caret.end + val.length)));
				node.innerHTML = t;
				this.setSelection(node,"stored");
			},
			
			getSelection: function(node){
				// summary:
				//		This gets and stores the caret position
				//		in the contentEditable div (conEdit).
				//		NOTE: Doesn't work with html nodes inside
				//		the div.

				var start, end;
				if(dojo.doc.selection){
					var r = dojo.doc.selection.createRange();
					var rs = dojo.body().createTextRange();
					rs.moveToElementText(node);
					var re = rs.duplicate();
					rs.moveToBookmark(r.getBookmark());
					re.setEndPoint('EndToStart', rs);
					start = this._caretStart = re.text.length;
					end = this._caretEnd = re.text.length+r.text.length;
					console.warn("Caret start: ",start," end: ",end," length: ",re.text.length," text: ",re.text);
				} else {
					this._caretStart = dojo.global.getSelection().getRangeAt(node).startOffset;
					this._caretEnd = dojo.global.getSelection().getRangeAt(node).endOffset;
					console.log("Caret start: ", this._caretStart," end: ", this._caretEnd);
				}
			},
			
			setSelection: function(node, what){
				// summary:
				//		Used for placing the cursor during edits and character help.
				//		Takes the values: end, beg, start, all or any numerical value
				//		(in which case the number will constitute the caret position)

				console.warn("setSelection:");
				if(dojo.doc.selection){ // IE
					var rs = dojo.body().createTextRange();
					rs.moveToElementText(node);
					
					switch(what){
						case "end":
							rs.collapse(false);
							break;
						case "beg" || "start":
							rs.collapse();
							break;
						case "all":
							rs.collapse();
							rs.moveStart("character", 0);
							rs.moveEnd("character",node.text.length);
							break;
						case "stored":
							rs.collapse();
							var dif = this._caretStart-this._caretEnd;
							//console.log("start: ",this._caretStart, " end: ",this._caretEnd," dif: ",dif);
							rs.moveStart("character",this._caretStart);
							rs.moveEnd("character",dif);
							break;
					}
					rs.select();
					
				}else{
					var getAllChildren = function(node, children){
						children = children || [];
						for(var i=0;i<node.childNodes.length; i++){
							var n = node.childNodes[i];
							if(n.nodeType==3){
								children.push(n);
							}else if(n.tagName && n.tagName.toLowerCase()=="img"){
								children.push(n);
							}
								
							if(n.childNodes && n.childNodes.length){
								getAllChildren(n, children);
							}
						}
						return children;
					};
					console.log("ff node:", node);
					node.focus();
					var selection = dojo.global.getSelection();
					selection.removeAllRanges();
					var r = dojo.doc.createRange();
					var nodes = getAllChildren(node);
					switch(what){
						case "end":
							console.log("len:", nodes[nodes.length - 1].textContent.length);
							r.setStart(nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length);
							r.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length);
							break;
						case "beg" || "start":
							r.setStart(nodes[0], 0);
							r.setEnd(nodes[0], 0);
							break;
						case "all":
							r.setStart(nodes[0], 0);
							r.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length);
							break;
						case "stored":
							console.log("Caret start: ",this._caretStart," caret end: ",this._caretEnd);
							r.setStart(nodes[0], this._caretStart);
							r.setEnd(nodes[0], this._caretEnd);
					}
					selection.addRange(r);
					console.log("sel ", what, " on ", node);
				}
			}
		}
	);
	dojo.setObject("dojox.drawing.tools.TextBlock", TextBlock);
	TextBlock.setup = {
		name:"dojox.drawing.tools.TextBlock",
		tooltip:"Text Tool",
		iconClass:"iconText"
	};
	registry.register(TextBlock.setup, "tool");

	return TextBlock;
});
