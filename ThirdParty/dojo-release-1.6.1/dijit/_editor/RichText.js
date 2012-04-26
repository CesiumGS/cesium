/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.RichText"]){
dojo._hasResource["dijit._editor.RichText"]=true;
dojo.provide("dijit._editor.RichText");
dojo.require("dijit._Widget");
dojo.require("dijit._CssStateMixin");
dojo.require("dijit._editor.selection");
dojo.require("dijit._editor.range");
dojo.require("dijit._editor.html");
if(!dojo.config["useXDomain"]||dojo.config["allowXdRichTextSave"]){
if(dojo._postLoad){
(function(){
var _1=dojo.doc.createElement("textarea");
_1.id=dijit._scopeName+"._editor.RichText.value";
dojo.style(_1,{display:"none",position:"absolute",top:"-100px",height:"3px",width:"3px"});
dojo.body().appendChild(_1);
})();
}else{
try{
dojo.doc.write("<textarea id=\""+dijit._scopeName+"._editor.RichText.value\" "+"style=\"display:none;position:absolute;top:-100px;left:-100px;height:3px;width:3px;overflow:hidden;\"></textarea>");
}
catch(e){
}
}
}
dojo.declare("dijit._editor.RichText",[dijit._Widget,dijit._CssStateMixin],{constructor:function(_2){
this.contentPreFilters=[];
this.contentPostFilters=[];
this.contentDomPreFilters=[];
this.contentDomPostFilters=[];
this.editingAreaStyleSheets=[];
this.events=[].concat(this.events);
this._keyHandlers={};
if(_2&&dojo.isString(_2.value)){
this.value=_2.value;
}
this.onLoadDeferred=new dojo.Deferred();
},baseClass:"dijitEditor",inheritWidth:false,focusOnLoad:false,name:"",styleSheets:"",height:"300px",minHeight:"1em",isClosed:true,isLoaded:false,_SEPARATOR:"@@**%%__RICHTEXTBOUNDRY__%%**@@",_NAME_CONTENT_SEP:"@@**%%:%%**@@",onLoadDeferred:null,isTabIndent:false,disableSpellCheck:false,postCreate:function(){
if("textarea"==this.domNode.tagName.toLowerCase()){
console.warn("RichText should not be used with the TEXTAREA tag.  See dijit._editor.RichText docs.");
}
this.contentPreFilters=[dojo.hitch(this,"_preFixUrlAttributes")].concat(this.contentPreFilters);
if(dojo.isMoz){
this.contentPreFilters=[this._normalizeFontStyle].concat(this.contentPreFilters);
this.contentPostFilters=[this._removeMozBogus].concat(this.contentPostFilters);
}
if(dojo.isWebKit){
this.contentPreFilters=[this._removeWebkitBogus].concat(this.contentPreFilters);
this.contentPostFilters=[this._removeWebkitBogus].concat(this.contentPostFilters);
}
if(dojo.isIE){
this.contentPostFilters=[this._normalizeFontStyle].concat(this.contentPostFilters);
}
this.inherited(arguments);
dojo.publish(dijit._scopeName+"._editor.RichText::init",[this]);
this.open();
this.setupDefaultShortcuts();
},setupDefaultShortcuts:function(){
var _3=dojo.hitch(this,function(_4,_5){
return function(){
return !this.execCommand(_4,_5);
};
});
var _6={b:_3("bold"),i:_3("italic"),u:_3("underline"),a:_3("selectall"),s:function(){
this.save(true);
},m:function(){
this.isTabIndent=!this.isTabIndent;
},"1":_3("formatblock","h1"),"2":_3("formatblock","h2"),"3":_3("formatblock","h3"),"4":_3("formatblock","h4"),"\\":_3("insertunorderedlist")};
if(!dojo.isIE){
_6.Z=_3("redo");
}
for(var _7 in _6){
this.addKeyHandler(_7,true,false,_6[_7]);
}
},events:["onKeyPress","onKeyDown","onKeyUp"],captureEvents:[],_editorCommandsLocalized:false,_localizeEditorCommands:function(){
if(dijit._editor._editorCommandsLocalized){
this._local2NativeFormatNames=dijit._editor._local2NativeFormatNames;
this._native2LocalFormatNames=dijit._editor._native2LocalFormatNames;
return;
}
dijit._editor._editorCommandsLocalized=true;
dijit._editor._local2NativeFormatNames={};
dijit._editor._native2LocalFormatNames={};
this._local2NativeFormatNames=dijit._editor._local2NativeFormatNames;
this._native2LocalFormatNames=dijit._editor._native2LocalFormatNames;
var _8=["div","p","pre","h1","h2","h3","h4","h5","h6","ol","ul","address"];
var _9="",_a,i=0;
while((_a=_8[i++])){
if(_a.charAt(1)!=="l"){
_9+="<"+_a+"><span>content</span></"+_a+"><br/>";
}else{
_9+="<"+_a+"><li>content</li></"+_a+"><br/>";
}
}
var _b={position:"absolute",top:"0px",zIndex:10,opacity:0.01};
var _c=dojo.create("div",{style:_b,innerHTML:_9});
dojo.body().appendChild(_c);
var _d=dojo.hitch(this,function(){
var _e=_c.firstChild;
while(_e){
try{
dijit._editor.selection.selectElement(_e.firstChild);
var _f=_e.tagName.toLowerCase();
this._local2NativeFormatNames[_f]=document.queryCommandValue("formatblock");
this._native2LocalFormatNames[this._local2NativeFormatNames[_f]]=_f;
_e=_e.nextSibling.nextSibling;
}
catch(e){
}
}
_c.parentNode.removeChild(_c);
_c.innerHTML="";
});
setTimeout(_d,0);
},open:function(_10){
if(!this.onLoadDeferred||this.onLoadDeferred.fired>=0){
this.onLoadDeferred=new dojo.Deferred();
}
if(!this.isClosed){
this.close();
}
dojo.publish(dijit._scopeName+"._editor.RichText::open",[this]);
if(arguments.length==1&&_10.nodeName){
this.domNode=_10;
}
var dn=this.domNode;
var _11;
if(dojo.isString(this.value)){
_11=this.value;
delete this.value;
dn.innerHTML="";
}else{
if(dn.nodeName&&dn.nodeName.toLowerCase()=="textarea"){
var ta=(this.textarea=dn);
this.name=ta.name;
_11=ta.value;
dn=this.domNode=dojo.doc.createElement("div");
dn.setAttribute("widgetId",this.id);
ta.removeAttribute("widgetId");
dn.cssText=ta.cssText;
dn.className+=" "+ta.className;
dojo.place(dn,ta,"before");
var _12=dojo.hitch(this,function(){
dojo.style(ta,{display:"block",position:"absolute",top:"-1000px"});
if(dojo.isIE){
var s=ta.style;
this.__overflow=s.overflow;
s.overflow="hidden";
}
});
if(dojo.isIE){
setTimeout(_12,10);
}else{
_12();
}
if(ta.form){
var _13=ta.value;
this.reset=function(){
var _14=this.getValue();
if(_14!=_13){
this.replaceValue(_13);
}
};
dojo.connect(ta.form,"onsubmit",this,function(){
dojo.attr(ta,"disabled",this.disabled);
ta.value=this.getValue();
});
}
}else{
_11=dijit._editor.getChildrenHtml(dn);
dn.innerHTML="";
}
}
var _15=dojo.contentBox(dn);
this._oldHeight=_15.h;
this._oldWidth=_15.w;
this.value=_11;
if(dn.nodeName&&dn.nodeName=="LI"){
dn.innerHTML=" <br>";
}
this.header=dn.ownerDocument.createElement("div");
dn.appendChild(this.header);
this.editingArea=dn.ownerDocument.createElement("div");
dn.appendChild(this.editingArea);
this.footer=dn.ownerDocument.createElement("div");
dn.appendChild(this.footer);
if(!this.name){
this.name=this.id+"_AUTOGEN";
}
if(this.name!==""&&(!dojo.config["useXDomain"]||dojo.config["allowXdRichTextSave"])){
var _16=dojo.byId(dijit._scopeName+"._editor.RichText.value");
if(_16&&_16.value!==""){
var _17=_16.value.split(this._SEPARATOR),i=0,dat;
while((dat=_17[i++])){
var _18=dat.split(this._NAME_CONTENT_SEP);
if(_18[0]==this.name){
_11=_18[1];
_17=_17.splice(i,1);
_16.value=_17.join(this._SEPARATOR);
break;
}
}
}
if(!dijit._editor._globalSaveHandler){
dijit._editor._globalSaveHandler={};
dojo.addOnUnload(function(){
var id;
for(id in dijit._editor._globalSaveHandler){
var f=dijit._editor._globalSaveHandler[id];
if(dojo.isFunction(f)){
f();
}
}
});
}
dijit._editor._globalSaveHandler[this.id]=dojo.hitch(this,"_saveContent");
}
this.isClosed=false;
var ifr=(this.editorObject=this.iframe=dojo.doc.createElement("iframe"));
ifr.id=this.id+"_iframe";
this._iframeSrc=this._getIframeDocTxt();
ifr.style.border="none";
ifr.style.width="100%";
if(this._layoutMode){
ifr.style.height="100%";
}else{
if(dojo.isIE>=7){
if(this.height){
ifr.style.height=this.height;
}
if(this.minHeight){
ifr.style.minHeight=this.minHeight;
}
}else{
ifr.style.height=this.height?this.height:this.minHeight;
}
}
ifr.frameBorder=0;
ifr._loadFunc=dojo.hitch(this,function(win){
this.window=win;
this.document=this.window.document;
if(dojo.isIE){
this._localizeEditorCommands();
}
this.onLoad(_11);
});
var s="javascript:parent."+dijit._scopeName+".byId(\""+this.id+"\")._iframeSrc";
ifr.setAttribute("src",s);
this.editingArea.appendChild(ifr);
if(dojo.isSafari<=4){
var src=ifr.getAttribute("src");
if(!src||src.indexOf("javascript")==-1){
setTimeout(function(){
ifr.setAttribute("src",s);
},0);
}
}
if(dn.nodeName=="LI"){
dn.lastChild.style.marginTop="-1.2em";
}
dojo.addClass(this.domNode,this.baseClass);
},_local2NativeFormatNames:{},_native2LocalFormatNames:{},_getIframeDocTxt:function(){
var _19=dojo.getComputedStyle(this.domNode);
var _1a="";
var _1b=true;
if(dojo.isIE||dojo.isWebKit||(!this.height&&!dojo.isMoz)){
_1a="<div id='dijitEditorBody'></div>";
_1b=false;
}else{
if(dojo.isMoz){
this._cursorToStart=true;
_1a="&nbsp;";
}
}
var _1c=[_19.fontWeight,_19.fontSize,_19.fontFamily].join(" ");
var _1d=_19.lineHeight;
if(_1d.indexOf("px")>=0){
_1d=parseFloat(_1d)/parseFloat(_19.fontSize);
}else{
if(_1d.indexOf("em")>=0){
_1d=parseFloat(_1d);
}else{
_1d="normal";
}
}
var _1e="";
var _1f=this;
this.style.replace(/(^|;)\s*(line-|font-?)[^;]+/ig,function(_20){
_20=_20.replace(/^;/ig,"")+";";
var s=_20.split(":")[0];
if(s){
s=dojo.trim(s);
s=s.toLowerCase();
var i;
var sC="";
for(i=0;i<s.length;i++){
var c=s.charAt(i);
switch(c){
case "-":
i++;
c=s.charAt(i).toUpperCase();
default:
sC+=c;
}
}
dojo.style(_1f.domNode,sC,"");
}
_1e+=_20+";";
});
var _21=dojo.query("label[for=\""+this.id+"\"]");
return [this.isLeftToRight()?"<html>\n<head>\n":"<html dir='rtl'>\n<head>\n",(dojo.isMoz&&_21.length?"<title>"+_21[0].innerHTML+"</title>\n":""),"<meta http-equiv='Content-Type' content='text/html'>\n","<style>\n","\tbody,html {\n","\t\tbackground:transparent;\n","\t\tpadding: 1px 0 0 0;\n","\t\tmargin: -1px 0 0 0;\n",((dojo.isWebKit)?"\t\twidth: 100%;\n":""),((dojo.isWebKit)?"\t\theight: 100%;\n":""),"\t}\n","\tbody{\n","\t\ttop:0px;\n","\t\tleft:0px;\n","\t\tright:0px;\n","\t\tfont:",_1c,";\n",((this.height||dojo.isOpera)?"":"\t\tposition: fixed;\n"),"\t\tmin-height:",this.minHeight,";\n","\t\tline-height:",_1d,";\n","\t}\n","\tp{ margin: 1em 0; }\n",(!_1b&&!this.height?"\tbody,html {overflow-y: hidden;}\n":""),"\t#dijitEditorBody{overflow-x: auto; overflow-y:"+(this.height?"auto;":"hidden;")+" outline: 0px;}\n","\tli > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; }\n",(!dojo.isIE?"\tli{ min-height:1.2em; }\n":""),"</style>\n",this._applyEditingAreaStyleSheets(),"\n","</head>\n<body ",(_1b?"id='dijitEditorBody' ":""),"onload='frameElement._loadFunc(window,document)' style='"+_1e+"'>",_1a,"</body>\n</html>"].join("");
},_applyEditingAreaStyleSheets:function(){
var _22=[];
if(this.styleSheets){
_22=this.styleSheets.split(";");
this.styleSheets="";
}
_22=_22.concat(this.editingAreaStyleSheets);
this.editingAreaStyleSheets=[];
var _23="",i=0,url;
while((url=_22[i++])){
var _24=(new dojo._Url(dojo.global.location,url)).toString();
this.editingAreaStyleSheets.push(_24);
_23+="<link rel=\"stylesheet\" type=\"text/css\" href=\""+_24+"\"/>";
}
return _23;
},addStyleSheet:function(uri){
var url=uri.toString();
if(url.charAt(0)=="."||(url.charAt(0)!="/"&&!uri.host)){
url=(new dojo._Url(dojo.global.location,url)).toString();
}
if(dojo.indexOf(this.editingAreaStyleSheets,url)>-1){
return;
}
this.editingAreaStyleSheets.push(url);
this.onLoadDeferred.addCallback(dojo.hitch(this,function(){
if(this.document.createStyleSheet){
this.document.createStyleSheet(url);
}else{
var _25=this.document.getElementsByTagName("head")[0];
var _26=this.document.createElement("link");
_26.rel="stylesheet";
_26.type="text/css";
_26.href=url;
_25.appendChild(_26);
}
}));
},removeStyleSheet:function(uri){
var url=uri.toString();
if(url.charAt(0)=="."||(url.charAt(0)!="/"&&!uri.host)){
url=(new dojo._Url(dojo.global.location,url)).toString();
}
var _27=dojo.indexOf(this.editingAreaStyleSheets,url);
if(_27==-1){
return;
}
delete this.editingAreaStyleSheets[_27];
dojo.withGlobal(this.window,"query",dojo,["link:[href=\""+url+"\"]"]).orphan();
},disabled:false,_mozSettingProps:{"styleWithCSS":false},_setDisabledAttr:function(_28){
_28=!!_28;
this._set("disabled",_28);
if(!this.isLoaded){
return;
}
if(dojo.isIE||dojo.isWebKit||dojo.isOpera){
var _29=dojo.isIE&&(this.isLoaded||!this.focusOnLoad);
if(_29){
this.editNode.unselectable="on";
}
this.editNode.contentEditable=!_28;
if(_29){
var _2a=this;
setTimeout(function(){
_2a.editNode.unselectable="off";
},0);
}
}else{
try{
this.document.designMode=(_28?"off":"on");
}
catch(e){
return;
}
if(!_28&&this._mozSettingProps){
var ps=this._mozSettingProps;
for(var n in ps){
if(ps.hasOwnProperty(n)){
try{
this.document.execCommand(n,false,ps[n]);
}
catch(e2){
}
}
}
}
}
this._disabledOK=true;
},onLoad:function(_2b){
if(!this.window.__registeredWindow){
this.window.__registeredWindow=true;
this._iframeRegHandle=dijit.registerIframe(this.iframe);
}
if(!dojo.isIE&&!dojo.isWebKit&&(this.height||dojo.isMoz)){
this.editNode=this.document.body;
}else{
this.editNode=this.document.body.firstChild;
var _2c=this;
if(dojo.isIE){
this.tabStop=dojo.create("div",{tabIndex:-1},this.editingArea);
this.iframe.onfocus=function(){
_2c.editNode.setActive();
};
}
}
this.focusNode=this.editNode;
var _2d=this.events.concat(this.captureEvents);
var ap=this.iframe?this.document:this.editNode;
dojo.forEach(_2d,function(_2e){
this.connect(ap,_2e.toLowerCase(),_2e);
},this);
this.connect(ap,"onmouseup","onClick");
if(dojo.isIE){
this.connect(this.document,"onmousedown","_onIEMouseDown");
this.editNode.style.zoom=1;
}else{
this.connect(this.document,"onmousedown",function(){
delete this._cursorToStart;
});
}
if(dojo.isWebKit){
this._webkitListener=this.connect(this.document,"onmouseup","onDisplayChanged");
this.connect(this.document,"onmousedown",function(e){
var t=e.target;
if(t&&(t===this.document.body||t===this.document)){
setTimeout(dojo.hitch(this,"placeCursorAtEnd"),0);
}
});
}
if(dojo.isIE){
try{
this.document.execCommand("RespectVisibilityInDesign",true,null);
}
catch(e){
}
}
this.isLoaded=true;
this.set("disabled",this.disabled);
var _2f=dojo.hitch(this,function(){
this.setValue(_2b);
if(this.onLoadDeferred){
this.onLoadDeferred.callback(true);
}
this.onDisplayChanged();
if(this.focusOnLoad){
dojo.addOnLoad(dojo.hitch(this,function(){
setTimeout(dojo.hitch(this,"focus"),this.updateInterval);
}));
}
this.value=this.getValue(true);
});
if(this.setValueDeferred){
this.setValueDeferred.addCallback(_2f);
}else{
_2f();
}
},onKeyDown:function(e){
if(e.keyCode===dojo.keys.TAB&&this.isTabIndent){
dojo.stopEvent(e);
if(this.queryCommandEnabled((e.shiftKey?"outdent":"indent"))){
this.execCommand((e.shiftKey?"outdent":"indent"));
}
}
if(dojo.isIE){
if(e.keyCode==dojo.keys.TAB&&!this.isTabIndent){
if(e.shiftKey&&!e.ctrlKey&&!e.altKey){
this.iframe.focus();
}else{
if(!e.shiftKey&&!e.ctrlKey&&!e.altKey){
this.tabStop.focus();
}
}
}else{
if(e.keyCode===dojo.keys.BACKSPACE&&this.document.selection.type==="Control"){
dojo.stopEvent(e);
this.execCommand("delete");
}else{
if((65<=e.keyCode&&e.keyCode<=90)||(e.keyCode>=37&&e.keyCode<=40)){
e.charCode=e.keyCode;
this.onKeyPress(e);
}
}
}
}
return true;
},onKeyUp:function(e){
return;
},setDisabled:function(_30){
dojo.deprecated("dijit.Editor::setDisabled is deprecated","use dijit.Editor::attr(\"disabled\",boolean) instead",2);
this.set("disabled",_30);
},_setValueAttr:function(_31){
this.setValue(_31);
},_setDisableSpellCheckAttr:function(_32){
if(this.document){
dojo.attr(this.document.body,"spellcheck",!_32);
}else{
this.onLoadDeferred.addCallback(dojo.hitch(this,function(){
dojo.attr(this.document.body,"spellcheck",!_32);
}));
}
this._set("disableSpellCheck",_32);
},onKeyPress:function(e){
var c=(e.keyChar&&e.keyChar.toLowerCase())||e.keyCode,_33=this._keyHandlers[c],_34=arguments;
if(_33&&!e.altKey){
dojo.some(_33,function(h){
if(!(h.shift^e.shiftKey)&&!(h.ctrl^(e.ctrlKey||e.metaKey))){
if(!h.handler.apply(this,_34)){
e.preventDefault();
}
return true;
}
},this);
}
if(!this._onKeyHitch){
this._onKeyHitch=dojo.hitch(this,"onKeyPressed");
}
setTimeout(this._onKeyHitch,1);
return true;
},addKeyHandler:function(key,_35,_36,_37){
if(!dojo.isArray(this._keyHandlers[key])){
this._keyHandlers[key]=[];
}
this._keyHandlers[key].push({shift:_36||false,ctrl:_35||false,handler:_37});
},onKeyPressed:function(){
this.onDisplayChanged();
},onClick:function(e){
this.onDisplayChanged(e);
},_onIEMouseDown:function(e){
if(!this._focused&&!this.disabled){
this.focus();
}
},_onBlur:function(e){
this.inherited(arguments);
var _38=this.getValue(true);
if(_38!=this.value){
this.onChange(_38);
}
this._set("value",_38);
},_onFocus:function(e){
if(!this.disabled){
if(!this._disabledOK){
this.set("disabled",false);
}
this.inherited(arguments);
}
},blur:function(){
if(!dojo.isIE&&this.window.document.documentElement&&this.window.document.documentElement.focus){
this.window.document.documentElement.focus();
}else{
if(dojo.doc.body.focus){
dojo.doc.body.focus();
}
}
},focus:function(){
if(!this.isLoaded){
this.focusOnLoad=true;
return;
}
if(this._cursorToStart){
delete this._cursorToStart;
if(this.editNode.childNodes){
this.placeCursorAtStart();
return;
}
}
if(!dojo.isIE){
dijit.focus(this.iframe);
}else{
if(this.editNode&&this.editNode.focus){
this.iframe.fireEvent("onfocus",document.createEventObject());
}
}
},updateInterval:200,_updateTimer:null,onDisplayChanged:function(e){
if(this._updateTimer){
clearTimeout(this._updateTimer);
}
if(!this._updateHandler){
this._updateHandler=dojo.hitch(this,"onNormalizedDisplayChanged");
}
this._updateTimer=setTimeout(this._updateHandler,this.updateInterval);
},onNormalizedDisplayChanged:function(){
delete this._updateTimer;
},onChange:function(_39){
},_normalizeCommand:function(cmd,_3a){
var _3b=cmd.toLowerCase();
if(_3b=="formatblock"){
if(dojo.isSafari&&_3a===undefined){
_3b="heading";
}
}else{
if(_3b=="hilitecolor"&&!dojo.isMoz){
_3b="backcolor";
}
}
return _3b;
},_qcaCache:{},queryCommandAvailable:function(_3c){
var ca=this._qcaCache[_3c];
if(ca!==undefined){
return ca;
}
return (this._qcaCache[_3c]=this._queryCommandAvailable(_3c));
},_queryCommandAvailable:function(_3d){
var ie=1;
var _3e=1<<1;
var _3f=1<<2;
var _40=1<<3;
function _41(_42){
return {ie:Boolean(_42&ie),mozilla:Boolean(_42&_3e),webkit:Boolean(_42&_3f),opera:Boolean(_42&_40)};
};
var _43=null;
switch(_3d.toLowerCase()){
case "bold":
case "italic":
case "underline":
case "subscript":
case "superscript":
case "fontname":
case "fontsize":
case "forecolor":
case "hilitecolor":
case "justifycenter":
case "justifyfull":
case "justifyleft":
case "justifyright":
case "delete":
case "selectall":
case "toggledir":
_43=_41(_3e|ie|_3f|_40);
break;
case "createlink":
case "unlink":
case "removeformat":
case "inserthorizontalrule":
case "insertimage":
case "insertorderedlist":
case "insertunorderedlist":
case "indent":
case "outdent":
case "formatblock":
case "inserthtml":
case "undo":
case "redo":
case "strikethrough":
case "tabindent":
_43=_41(_3e|ie|_40|_3f);
break;
case "blockdirltr":
case "blockdirrtl":
case "dirltr":
case "dirrtl":
case "inlinedirltr":
case "inlinedirrtl":
_43=_41(ie);
break;
case "cut":
case "copy":
case "paste":
_43=_41(ie|_3e|_3f);
break;
case "inserttable":
_43=_41(_3e|ie);
break;
case "insertcell":
case "insertcol":
case "insertrow":
case "deletecells":
case "deletecols":
case "deleterows":
case "mergecells":
case "splitcell":
_43=_41(ie|_3e);
break;
default:
return false;
}
return (dojo.isIE&&_43.ie)||(dojo.isMoz&&_43.mozilla)||(dojo.isWebKit&&_43.webkit)||(dojo.isOpera&&_43.opera);
},execCommand:function(_44,_45){
var _46;
this.focus();
_44=this._normalizeCommand(_44,_45);
if(_45!==undefined){
if(_44=="heading"){
throw new Error("unimplemented");
}else{
if((_44=="formatblock")&&dojo.isIE){
_45="<"+_45+">";
}
}
}
var _47="_"+_44+"Impl";
if(this[_47]){
_46=this[_47](_45);
}else{
_45=arguments.length>1?_45:null;
if(_45||_44!="createlink"){
_46=this.document.execCommand(_44,false,_45);
}
}
this.onDisplayChanged();
return _46;
},queryCommandEnabled:function(_48){
if(this.disabled||!this._disabledOK){
return false;
}
_48=this._normalizeCommand(_48);
if(dojo.isMoz||dojo.isWebKit){
if(_48=="unlink"){
return this._sCall("hasAncestorElement",["a"]);
}else{
if(_48=="inserttable"){
return true;
}
}
}
if(dojo.isWebKit){
if(_48=="cut"||_48=="copy"){
var sel=this.window.getSelection();
if(sel){
sel=sel.toString();
}
return !!sel;
}else{
if(_48=="paste"){
return true;
}
}
}
var _49=dojo.isIE?this.document.selection.createRange():this.document;
try{
return _49.queryCommandEnabled(_48);
}
catch(e){
return false;
}
},queryCommandState:function(_4a){
if(this.disabled||!this._disabledOK){
return false;
}
_4a=this._normalizeCommand(_4a);
try{
return this.document.queryCommandState(_4a);
}
catch(e){
return false;
}
},queryCommandValue:function(_4b){
if(this.disabled||!this._disabledOK){
return false;
}
var r;
_4b=this._normalizeCommand(_4b);
if(dojo.isIE&&_4b=="formatblock"){
r=this._native2LocalFormatNames[this.document.queryCommandValue(_4b)];
}else{
if(dojo.isMoz&&_4b==="hilitecolor"){
var _4c;
try{
_4c=this.document.queryCommandValue("styleWithCSS");
}
catch(e){
_4c=false;
}
this.document.execCommand("styleWithCSS",false,true);
r=this.document.queryCommandValue(_4b);
this.document.execCommand("styleWithCSS",false,_4c);
}else{
r=this.document.queryCommandValue(_4b);
}
}
return r;
},_sCall:function(_4d,_4e){
return dojo.withGlobal(this.window,_4d,dijit._editor.selection,_4e);
},placeCursorAtStart:function(){
this.focus();
var _4f=false;
if(dojo.isMoz){
var _50=this.editNode.firstChild;
while(_50){
if(_50.nodeType==3){
if(_50.nodeValue.replace(/^\s+|\s+$/g,"").length>0){
_4f=true;
this._sCall("selectElement",[_50]);
break;
}
}else{
if(_50.nodeType==1){
_4f=true;
var tg=_50.tagName?_50.tagName.toLowerCase():"";
if(/br|input|img|base|meta|area|basefont|hr|link/.test(tg)){
this._sCall("selectElement",[_50]);
}else{
this._sCall("selectElementChildren",[_50]);
}
break;
}
}
_50=_50.nextSibling;
}
}else{
_4f=true;
this._sCall("selectElementChildren",[this.editNode]);
}
if(_4f){
this._sCall("collapse",[true]);
}
},placeCursorAtEnd:function(){
this.focus();
var _51=false;
if(dojo.isMoz){
var _52=this.editNode.lastChild;
while(_52){
if(_52.nodeType==3){
if(_52.nodeValue.replace(/^\s+|\s+$/g,"").length>0){
_51=true;
this._sCall("selectElement",[_52]);
break;
}
}else{
if(_52.nodeType==1){
_51=true;
if(_52.lastChild){
this._sCall("selectElement",[_52.lastChild]);
}else{
this._sCall("selectElement",[_52]);
}
break;
}
}
_52=_52.previousSibling;
}
}else{
_51=true;
this._sCall("selectElementChildren",[this.editNode]);
}
if(_51){
this._sCall("collapse",[false]);
}
},getValue:function(_53){
if(this.textarea){
if(this.isClosed||!this.isLoaded){
return this.textarea.value;
}
}
return this._postFilterContent(null,_53);
},_getValueAttr:function(){
return this.getValue(true);
},setValue:function(_54){
if(!this.isLoaded){
this.onLoadDeferred.addCallback(dojo.hitch(this,function(){
this.setValue(_54);
}));
return;
}
this._cursorToStart=true;
if(this.textarea&&(this.isClosed||!this.isLoaded)){
this.textarea.value=_54;
}else{
_54=this._preFilterContent(_54);
var _55=this.isClosed?this.domNode:this.editNode;
if(_54&&dojo.isMoz&&_54.toLowerCase()=="<p></p>"){
_54="<p>&nbsp;</p>";
}
if(!_54&&dojo.isWebKit){
_54="&nbsp;";
}
_55.innerHTML=_54;
this._preDomFilterContent(_55);
}
this.onDisplayChanged();
this._set("value",this.getValue(true));
},replaceValue:function(_56){
if(this.isClosed){
this.setValue(_56);
}else{
if(this.window&&this.window.getSelection&&!dojo.isMoz){
this.setValue(_56);
}else{
if(this.window&&this.window.getSelection){
_56=this._preFilterContent(_56);
this.execCommand("selectall");
if(!_56){
this._cursorToStart=true;
_56="&nbsp;";
}
this.execCommand("inserthtml",_56);
this._preDomFilterContent(this.editNode);
}else{
if(this.document&&this.document.selection){
this.setValue(_56);
}
}
}
}
this._set("value",this.getValue(true));
},_preFilterContent:function(_57){
var ec=_57;
dojo.forEach(this.contentPreFilters,function(ef){
if(ef){
ec=ef(ec);
}
});
return ec;
},_preDomFilterContent:function(dom){
dom=dom||this.editNode;
dojo.forEach(this.contentDomPreFilters,function(ef){
if(ef&&dojo.isFunction(ef)){
ef(dom);
}
},this);
},_postFilterContent:function(dom,_58){
var ec;
if(!dojo.isString(dom)){
dom=dom||this.editNode;
if(this.contentDomPostFilters.length){
if(_58){
dom=dojo.clone(dom);
}
dojo.forEach(this.contentDomPostFilters,function(ef){
dom=ef(dom);
});
}
ec=dijit._editor.getChildrenHtml(dom);
}else{
ec=dom;
}
if(!dojo.trim(ec.replace(/^\xA0\xA0*/,"").replace(/\xA0\xA0*$/,"")).length){
ec="";
}
dojo.forEach(this.contentPostFilters,function(ef){
ec=ef(ec);
});
return ec;
},_saveContent:function(e){
var _59=dojo.byId(dijit._scopeName+"._editor.RichText.value");
if(_59.value){
_59.value+=this._SEPARATOR;
}
_59.value+=this.name+this._NAME_CONTENT_SEP+this.getValue(true);
},escapeXml:function(str,_5a){
str=str.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
if(!_5a){
str=str.replace(/'/gm,"&#39;");
}
return str;
},getNodeHtml:function(_5b){
dojo.deprecated("dijit.Editor::getNodeHtml is deprecated","use dijit._editor.getNodeHtml instead",2);
return dijit._editor.getNodeHtml(_5b);
},getNodeChildrenHtml:function(dom){
dojo.deprecated("dijit.Editor::getNodeChildrenHtml is deprecated","use dijit._editor.getChildrenHtml instead",2);
return dijit._editor.getChildrenHtml(dom);
},close:function(_5c){
if(this.isClosed){
return;
}
if(!arguments.length){
_5c=true;
}
if(_5c){
this._set("value",this.getValue(true));
}
if(this.interval){
clearInterval(this.interval);
}
if(this._webkitListener){
this.disconnect(this._webkitListener);
delete this._webkitListener;
}
if(dojo.isIE){
this.iframe.onfocus=null;
}
this.iframe._loadFunc=null;
if(this._iframeRegHandle){
dijit.unregisterIframe(this._iframeRegHandle);
delete this._iframeRegHandle;
}
if(this.textarea){
var s=this.textarea.style;
s.position="";
s.left=s.top="";
if(dojo.isIE){
s.overflow=this.__overflow;
this.__overflow=null;
}
this.textarea.value=this.value;
dojo.destroy(this.domNode);
this.domNode=this.textarea;
}else{
this.domNode.innerHTML=this.value;
}
delete this.iframe;
dojo.removeClass(this.domNode,this.baseClass);
this.isClosed=true;
this.isLoaded=false;
delete this.editNode;
delete this.focusNode;
if(this.window&&this.window._frameElement){
this.window._frameElement=null;
}
this.window=null;
this.document=null;
this.editingArea=null;
this.editorObject=null;
},destroy:function(){
if(!this.isClosed){
this.close(false);
}
this.inherited(arguments);
if(dijit._editor._globalSaveHandler){
delete dijit._editor._globalSaveHandler[this.id];
}
},_removeMozBogus:function(_5d){
return _5d.replace(/\stype="_moz"/gi,"").replace(/\s_moz_dirty=""/gi,"").replace(/_moz_resizing="(true|false)"/gi,"");
},_removeWebkitBogus:function(_5e){
_5e=_5e.replace(/\sclass="webkit-block-placeholder"/gi,"");
_5e=_5e.replace(/\sclass="apple-style-span"/gi,"");
_5e=_5e.replace(/<meta charset=\"utf-8\" \/>/gi,"");
return _5e;
},_normalizeFontStyle:function(_5f){
return _5f.replace(/<(\/)?strong([ \>])/gi,"<$1b$2").replace(/<(\/)?em([ \>])/gi,"<$1i$2");
},_preFixUrlAttributes:function(_60){
return _60.replace(/(?:(<a(?=\s).*?\shref=)("|')(.*?)\2)|(?:(<a\s.*?href=)([^"'][^ >]+))/gi,"$1$4$2$3$5$2 _djrealurl=$2$3$5$2").replace(/(?:(<img(?=\s).*?\ssrc=)("|')(.*?)\2)|(?:(<img\s.*?src=)([^"'][^ >]+))/gi,"$1$4$2$3$5$2 _djrealurl=$2$3$5$2");
},_inserthorizontalruleImpl:function(_61){
if(dojo.isIE){
return this._inserthtmlImpl("<hr>");
}
return this.document.execCommand("inserthorizontalrule",false,_61);
},_unlinkImpl:function(_62){
if((this.queryCommandEnabled("unlink"))&&(dojo.isMoz||dojo.isWebKit)){
var a=this._sCall("getAncestorElement",["a"]);
this._sCall("selectElement",[a]);
return this.document.execCommand("unlink",false,null);
}
return this.document.execCommand("unlink",false,_62);
},_hilitecolorImpl:function(_63){
var _64;
if(dojo.isMoz){
this.document.execCommand("styleWithCSS",false,true);
_64=this.document.execCommand("hilitecolor",false,_63);
this.document.execCommand("styleWithCSS",false,false);
}else{
_64=this.document.execCommand("hilitecolor",false,_63);
}
return _64;
},_backcolorImpl:function(_65){
if(dojo.isIE){
_65=_65?_65:null;
}
return this.document.execCommand("backcolor",false,_65);
},_forecolorImpl:function(_66){
if(dojo.isIE){
_66=_66?_66:null;
}
return this.document.execCommand("forecolor",false,_66);
},_inserthtmlImpl:function(_67){
_67=this._preFilterContent(_67);
var rv=true;
if(dojo.isIE){
var _68=this.document.selection.createRange();
if(this.document.selection.type.toUpperCase()=="CONTROL"){
var n=_68.item(0);
while(_68.length){
_68.remove(_68.item(0));
}
n.outerHTML=_67;
}else{
_68.pasteHTML(_67);
}
_68.select();
}else{
if(dojo.isMoz&&!_67.length){
this._sCall("remove");
}else{
rv=this.document.execCommand("inserthtml",false,_67);
}
}
return rv;
},_boldImpl:function(_69){
if(dojo.isIE){
this._adaptIESelection();
}
return this.document.execCommand("bold",false,_69);
},_italicImpl:function(_6a){
if(dojo.isIE){
this._adaptIESelection();
}
return this.document.execCommand("italic",false,_6a);
},_underlineImpl:function(_6b){
if(dojo.isIE){
this._adaptIESelection();
}
return this.document.execCommand("underline",false,_6b);
},_strikethroughImpl:function(_6c){
if(dojo.isIE){
this._adaptIESelection();
}
return this.document.execCommand("strikethrough",false,_6c);
},getHeaderHeight:function(){
return this._getNodeChildrenHeight(this.header);
},getFooterHeight:function(){
return this._getNodeChildrenHeight(this.footer);
},_getNodeChildrenHeight:function(_6d){
var h=0;
if(_6d&&_6d.childNodes){
var i;
for(i=0;i<_6d.childNodes.length;i++){
var _6e=dojo.position(_6d.childNodes[i]);
h+=_6e.h;
}
}
return h;
},_isNodeEmpty:function(_6f,_70){
if(_6f.nodeType==1){
if(_6f.childNodes.length>0){
return this._isNodeEmpty(_6f.childNodes[0],_70);
}
return true;
}else{
if(_6f.nodeType==3){
return (_6f.nodeValue.substring(_70)=="");
}
}
return false;
},_removeStartingRangeFromRange:function(_71,_72){
if(_71.nextSibling){
_72.setStart(_71.nextSibling,0);
}else{
var _73=_71.parentNode;
while(_73&&_73.nextSibling==null){
_73=_73.parentNode;
}
if(_73){
_72.setStart(_73.nextSibling,0);
}
}
return _72;
},_adaptIESelection:function(){
var _74=dijit.range.getSelection(this.window);
if(_74&&_74.rangeCount&&!_74.isCollapsed){
var _75=_74.getRangeAt(0);
var _76=_75.startContainer;
var _77=_75.startOffset;
while(_76.nodeType==3&&_77>=_76.length&&_76.nextSibling){
_77=_77-_76.length;
_76=_76.nextSibling;
}
var _78=null;
while(this._isNodeEmpty(_76,_77)&&_76!=_78){
_78=_76;
_75=this._removeStartingRangeFromRange(_76,_75);
_76=_75.startContainer;
_77=0;
}
_74.removeAllRanges();
_74.addRange(_75);
}
}});
}
