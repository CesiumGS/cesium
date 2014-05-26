//>>built
define("dijit/_editor/RichText",["dojo/_base/array","dojo/_base/config","dojo/_base/declare","dojo/_base/Deferred","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/dom-geometry","dojo/dom-style","dojo/_base/kernel","dojo/keys","dojo/_base/lang","dojo/on","dojo/query","dojo/domReady","dojo/sniff","dojo/topic","dojo/_base/unload","dojo/_base/url","dojo/window","../_Widget","../_CssStateMixin","../selection","./range","./html","../focus","../main"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,on,_e,_f,has,_10,_11,_12,_13,_14,_15,_16,_17,_18,_19,_1a){
var _1b=_3("dijit._editor.RichText",[_14,_15],{constructor:function(_1c){
this.contentPreFilters=[];
this.contentPostFilters=[];
this.contentDomPreFilters=[];
this.contentDomPostFilters=[];
this.editingAreaStyleSheets=[];
this.events=[].concat(this.events);
this._keyHandlers={};
if(_1c&&_d.isString(_1c.value)){
this.value=_1c.value;
}
this.onLoadDeferred=new _4();
},baseClass:"dijitEditor",inheritWidth:false,focusOnLoad:false,name:"",styleSheets:"",height:"300px",minHeight:"1em",isClosed:true,isLoaded:false,_SEPARATOR:"@@**%%__RICHTEXTBOUNDRY__%%**@@",_NAME_CONTENT_SEP:"@@**%%:%%**@@",onLoadDeferred:null,isTabIndent:false,disableSpellCheck:false,postCreate:function(){
if("textarea"===this.domNode.tagName.toLowerCase()){
console.warn("RichText should not be used with the TEXTAREA tag.  See dijit._editor.RichText docs.");
}
this.contentPreFilters=[_d.trim,_d.hitch(this,"_preFixUrlAttributes")].concat(this.contentPreFilters);
if(has("mozilla")){
this.contentPreFilters=[this._normalizeFontStyle].concat(this.contentPreFilters);
this.contentPostFilters=[this._removeMozBogus].concat(this.contentPostFilters);
}
if(has("webkit")){
this.contentPreFilters=[this._removeWebkitBogus].concat(this.contentPreFilters);
this.contentPostFilters=[this._removeWebkitBogus].concat(this.contentPostFilters);
}
if(has("ie")||has("trident")){
this.contentPostFilters=[this._normalizeFontStyle].concat(this.contentPostFilters);
this.contentDomPostFilters=[_d.hitch(this,"_stripBreakerNodes")].concat(this.contentDomPostFilters);
}
this.contentDomPostFilters=[_d.hitch(this,"_stripTrailingEmptyNodes")].concat(this.contentDomPostFilters);
this.inherited(arguments);
_10.publish(_1a._scopeName+"._editor.RichText::init",this);
},startup:function(){
this.inherited(arguments);
this.open();
this.setupDefaultShortcuts();
},setupDefaultShortcuts:function(){
var _1d=_d.hitch(this,function(cmd,arg){
return function(){
return !this.execCommand(cmd,arg);
};
});
var _1e={b:_1d("bold"),i:_1d("italic"),u:_1d("underline"),a:_1d("selectall"),s:function(){
this.save(true);
},m:function(){
this.isTabIndent=!this.isTabIndent;
},"1":_1d("formatblock","h1"),"2":_1d("formatblock","h2"),"3":_1d("formatblock","h3"),"4":_1d("formatblock","h4"),"\\":_1d("insertunorderedlist")};
if(!has("ie")){
_1e.Z=_1d("redo");
}
var key;
for(key in _1e){
this.addKeyHandler(key,true,false,_1e[key]);
}
},events:["onKeyDown","onKeyUp"],captureEvents:[],_editorCommandsLocalized:false,_localizeEditorCommands:function(){
if(_1b._editorCommandsLocalized){
this._local2NativeFormatNames=_1b._local2NativeFormatNames;
this._native2LocalFormatNames=_1b._native2LocalFormatNames;
return;
}
_1b._editorCommandsLocalized=true;
_1b._local2NativeFormatNames={};
_1b._native2LocalFormatNames={};
this._local2NativeFormatNames=_1b._local2NativeFormatNames;
this._native2LocalFormatNames=_1b._native2LocalFormatNames;
var _1f=["div","p","pre","h1","h2","h3","h4","h5","h6","ol","ul","address"];
var _20="",_21,i=0;
while((_21=_1f[i++])){
if(_21.charAt(1)!=="l"){
_20+="<"+_21+"><span>content</span></"+_21+"><br/>";
}else{
_20+="<"+_21+"><li>content</li></"+_21+"><br/>";
}
}
var _22={position:"absolute",top:"0px",zIndex:10,opacity:0.01};
var div=_8.create("div",{style:_22,innerHTML:_20});
this.ownerDocumentBody.appendChild(div);
var _23=_d.hitch(this,function(){
var _24=div.firstChild;
while(_24){
try{
this.selection.selectElement(_24.firstChild);
var _25=_24.tagName.toLowerCase();
this._local2NativeFormatNames[_25]=document.queryCommandValue("formatblock");
this._native2LocalFormatNames[this._local2NativeFormatNames[_25]]=_25;
_24=_24.nextSibling.nextSibling;
}
catch(e){
}
}
_8.destroy(div);
});
this.defer(_23);
},open:function(_26){
if(!this.onLoadDeferred||this.onLoadDeferred.fired>=0){
this.onLoadDeferred=new _4();
}
if(!this.isClosed){
this.close();
}
_10.publish(_1a._scopeName+"._editor.RichText::open",this);
if(arguments.length===1&&_26.nodeName){
this.domNode=_26;
}
var dn=this.domNode;
var _27;
if(_d.isString(this.value)){
_27=this.value;
dn.innerHTML="";
}else{
if(dn.nodeName&&dn.nodeName.toLowerCase()=="textarea"){
var ta=(this.textarea=dn);
this.name=ta.name;
_27=ta.value;
dn=this.domNode=this.ownerDocument.createElement("div");
dn.setAttribute("widgetId",this.id);
ta.removeAttribute("widgetId");
dn.cssText=ta.cssText;
dn.className+=" "+ta.className;
_8.place(dn,ta,"before");
var _28=_d.hitch(this,function(){
_a.set(ta,{display:"block",position:"absolute",top:"-1000px"});
if(has("ie")){
var s=ta.style;
this.__overflow=s.overflow;
s.overflow="hidden";
}
});
if(has("ie")){
this.defer(_28,10);
}else{
_28();
}
if(ta.form){
var _29=ta.value;
this.reset=function(){
var _2a=this.getValue();
if(_2a!==_29){
this.replaceValue(_29);
}
};
on(ta.form,"submit",_d.hitch(this,function(){
_6.set(ta,"disabled",this.disabled);
ta.value=this.getValue();
}));
}
}else{
_27=_18.getChildrenHtml(dn);
dn.innerHTML="";
}
}
this.value=_27;
if(dn.nodeName&&dn.nodeName==="LI"){
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
if(this.name!==""&&(!_2["useXDomain"]||_2["allowXdRichTextSave"])){
var _2b=_5.byId(_1a._scopeName+"._editor.RichText.value");
if(_2b&&_2b.value!==""){
var _2c=_2b.value.split(this._SEPARATOR),i=0,dat;
while((dat=_2c[i++])){
var _2d=dat.split(this._NAME_CONTENT_SEP);
if(_2d[0]===this.name){
_27=_2d[1];
_2c=_2c.splice(i,1);
_2b.value=_2c.join(this._SEPARATOR);
break;
}
}
}
if(!_1b._globalSaveHandler){
_1b._globalSaveHandler={};
_11.addOnUnload(function(){
var id;
for(id in _1b._globalSaveHandler){
var f=_1b._globalSaveHandler[id];
if(_d.isFunction(f)){
f();
}
}
});
}
_1b._globalSaveHandler[this.id]=_d.hitch(this,"_saveContent");
}
this.isClosed=false;
var ifr=(this.editorObject=this.iframe=this.ownerDocument.createElement("iframe"));
ifr.id=this.id+"_iframe";
ifr.style.border="none";
ifr.style.width="100%";
if(this._layoutMode){
ifr.style.height="100%";
}else{
if(has("ie")>=7){
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
ifr._loadFunc=_d.hitch(this,function(w){
this.window=w;
this.document=w.document;
this.selection=new _16.SelectionManager(w);
if(has("ie")){
this._localizeEditorCommands();
}
this.onLoad(_27);
});
var src=this._getIframeDocTxt().replace(/\\/g,"\\\\").replace(/'/g,"\\'"),s;
if(has("ie")<11){
s="javascript:document.open();try{parent.window;}catch(e){document.domain=\""+document.domain+"\";}"+"document.write('"+src+"');document.close()";
}else{
s="javascript: '"+src+"'";
}
if(has("ie")==9){
this.editingArea.appendChild(ifr);
ifr.src=s;
}else{
ifr.setAttribute("src",s);
this.editingArea.appendChild(ifr);
}
if(dn.nodeName==="LI"){
dn.lastChild.style.marginTop="-1.2em";
}
_7.add(this.domNode,this.baseClass);
},_local2NativeFormatNames:{},_native2LocalFormatNames:{},_getIframeDocTxt:function(){
var _2e=_a.getComputedStyle(this.domNode);
var _2f="<div id='dijitEditorBody'></div>";
var _30=[_2e.fontWeight,_2e.fontSize,_2e.fontFamily].join(" ");
var _31=_2e.lineHeight;
if(_31.indexOf("px")>=0){
_31=parseFloat(_31)/parseFloat(_2e.fontSize);
}else{
if(_31.indexOf("em")>=0){
_31=parseFloat(_31);
}else{
_31="normal";
}
}
var _32="";
var _33=this;
this.style.replace(/(^|;)\s*(line-|font-?)[^;]+/ig,function(_34){
_34=_34.replace(/^;/ig,"")+";";
var s=_34.split(":")[0];
if(s){
s=_d.trim(s);
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
_a.set(_33.domNode,sC,"");
}
_32+=_34+";";
});
var _35=_e("label[for=\""+this.id+"\"]");
var _36="";
if(_35.length){
_36=_35[0].innerHTML;
}else{
if(this["aria-label"]){
_36=this["aria-label"];
}else{
if(this["aria-labelledby"]){
_36=_5.byId(this["aria-labelledby"]).innerHTML;
}
}
}
this.iframe.setAttribute("title",_36);
return ["<!DOCTYPE html>",this.isLeftToRight()?"<html lang='"+this.lang+"'>\n<head>\n":"<html dir='rtl' lang='"+this.lang+"'>\n<head>\n",_36?"<title>"+_36+"</title>":"","<meta http-equiv='Content-Type' content='text/html'>\n","<style>\n","\tbody,html {\n","\t\tbackground:transparent;\n","\t\tpadding: 1px 0 0 0;\n","\t\tmargin: -1px 0 0 0;\n","\t}\n","\tbody,html,#dijitEditorBody { outline: none; }","html { height: 100%; width: 100%; overflow: hidden; }\n",this.height?"\tbody,#dijitEditorBody { height: 100%; width: 100%; overflow: auto; }\n":"\tbody,#dijitEditorBody { min-height: "+this.minHeight+"; width: 100%; overflow-x: auto; overflow-y: hidden; }\n","\tbody{\n","\t\ttop:0px;\n","\t\tleft:0px;\n","\t\tright:0px;\n","\t\tfont:",_30,";\n",((this.height||has("opera"))?"":"\t\tposition: fixed;\n"),"\t\tline-height:",_31,";\n","\t}\n","\tp{ margin: 1em 0; }\n","\tli > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; }\n",(!has("ie")?"\tli{ min-height:1.2em; }\n":""),"</style>\n",this._applyEditingAreaStyleSheets(),"\n","</head>\n<body role='main' ","onload='frameElement && frameElement._loadFunc(window,document)' ","style='"+_32+"'>",_2f,"</body>\n</html>"].join("");
},_applyEditingAreaStyleSheets:function(){
var _37=[];
if(this.styleSheets){
_37=this.styleSheets.split(";");
this.styleSheets="";
}
_37=_37.concat(this.editingAreaStyleSheets);
this.editingAreaStyleSheets=[];
var _38="",i=0,url,_39=_13.get(this.ownerDocument);
while((url=_37[i++])){
var _3a=(new _12(_39.location,url)).toString();
this.editingAreaStyleSheets.push(_3a);
_38+="<link rel=\"stylesheet\" type=\"text/css\" href=\""+_3a+"\"/>";
}
return _38;
},addStyleSheet:function(uri){
var url=uri.toString(),_3b=_13.get(this.ownerDocument);
if(url.charAt(0)==="."||(url.charAt(0)!=="/"&&!uri.host)){
url=(new _12(_3b.location,url)).toString();
}
if(_1.indexOf(this.editingAreaStyleSheets,url)>-1){
return;
}
this.editingAreaStyleSheets.push(url);
this.onLoadDeferred.then(_d.hitch(this,function(){
if(this.document.createStyleSheet){
this.document.createStyleSheet(url);
}else{
var _3c=this.document.getElementsByTagName("head")[0];
var _3d=this.document.createElement("link");
_3d.rel="stylesheet";
_3d.type="text/css";
_3d.href=url;
_3c.appendChild(_3d);
}
}));
},removeStyleSheet:function(uri){
var url=uri.toString(),_3e=_13.get(this.ownerDocument);
if(url.charAt(0)==="."||(url.charAt(0)!=="/"&&!uri.host)){
url=(new _12(_3e.location,url)).toString();
}
var _3f=_1.indexOf(this.editingAreaStyleSheets,url);
if(_3f===-1){
return;
}
delete this.editingAreaStyleSheets[_3f];
_e("link[href=\""+url+"\"]",this.window.document).orphan();
},disabled:false,_mozSettingProps:{"styleWithCSS":false},_setDisabledAttr:function(_40){
_40=!!_40;
this._set("disabled",_40);
if(!this.isLoaded){
return;
}
var _41=has("ie")&&(this.isLoaded||!this.focusOnLoad);
if(_41){
this.editNode.unselectable="on";
}
this.editNode.contentEditable=!_40;
this.editNode.tabIndex=_40?"-1":this.tabIndex;
if(_41){
this.defer(function(){
if(this.editNode){
this.editNode.unselectable="off";
}
});
}
if(has("mozilla")&&!_40&&this._mozSettingProps){
var ps=this._mozSettingProps;
var n;
for(n in ps){
if(ps.hasOwnProperty(n)){
try{
this.document.execCommand(n,false,ps[n]);
}
catch(e2){
}
}
}
}
this._disabledOK=true;
},onLoad:function(_42){
if(!this.window.__registeredWindow){
this.window.__registeredWindow=true;
this._iframeRegHandle=_19.registerIframe(this.iframe);
}
this.editNode=this.document.body.firstChild;
var _43=this;
this.beforeIframeNode=_8.place("<div tabIndex=-1></div>",this.iframe,"before");
this.afterIframeNode=_8.place("<div tabIndex=-1></div>",this.iframe,"after");
this.iframe.onfocus=this.document.onfocus=function(){
_43.editNode.focus();
};
this.focusNode=this.editNode;
var _44=this.events.concat(this.captureEvents);
var ap=this.iframe?this.document:this.editNode;
this.own(_1.map(_44,function(_45){
var _46=_45.toLowerCase().replace(/^on/,"");
on(ap,_46,_d.hitch(this,_45));
},this));
this.own(on(ap,"mouseup",_d.hitch(this,"onClick")));
if(has("ie")){
this.own(on(this.document,"mousedown",_d.hitch(this,"_onIEMouseDown")));
this.editNode.style.zoom=1;
}else{
this.own(on(this.document,"mousedown",_d.hitch(this,function(){
delete this._cursorToStart;
})));
}
if(has("webkit")){
this._webkitListener=this.own(on(this.document,"mouseup",_d.hitch(this,"onDisplayChanged")))[0];
this.own(on(this.document,"mousedown",_d.hitch(this,function(e){
var t=e.target;
if(t&&(t===this.document.body||t===this.document)){
this.defer("placeCursorAtEnd");
}
})));
}
if(has("ie")){
try{
this.document.execCommand("RespectVisibilityInDesign",true,null);
}
catch(e){
}
}
this.isLoaded=true;
this.set("disabled",this.disabled);
var _47=_d.hitch(this,function(){
this.setValue(_42);
if(this.onLoadDeferred){
this.onLoadDeferred.resolve(true);
}
this.onDisplayChanged();
if(this.focusOnLoad){
_f(_d.hitch(this,"defer","focus",this.updateInterval));
}
this.value=this.getValue(true);
});
if(this.setValueDeferred){
this.setValueDeferred.then(_47);
}else{
_47();
}
},onKeyDown:function(e){
if(e.keyCode===_c.SHIFT||e.keyCode===_c.ALT||e.keyCode===_c.META||e.keyCode===_c.CTRL){
return true;
}
if(e.keyCode===_c.TAB&&this.isTabIndent){
e.stopPropagation();
e.preventDefault();
if(this.queryCommandEnabled((e.shiftKey?"outdent":"indent"))){
this.execCommand((e.shiftKey?"outdent":"indent"));
}
}
if(e.keyCode==_c.TAB&&!this.isTabIndent&&!e.ctrlKey&&!e.altKey){
if(e.shiftKey){
this.beforeIframeNode.focus();
}else{
this.afterIframeNode.focus();
}
return true;
}
if(has("ie")<9&&e.keyCode===_c.BACKSPACE&&this.document.selection.type==="Control"){
e.stopPropagation();
e.preventDefault();
this.execCommand("delete");
}
if(has("ff")){
if(e.keyCode===_c.PAGE_UP||e.keyCode===_c.PAGE_DOWN){
if(this.editNode.clientHeight>=this.editNode.scrollHeight){
e.preventDefault();
}
}
}
var _48=this._keyHandlers[e.keyCode],_49=arguments;
if(_48&&!e.altKey){
_1.some(_48,function(h){
if(!(h.shift^e.shiftKey)&&!(h.ctrl^(e.ctrlKey||e.metaKey))){
if(!h.handler.apply(this,_49)){
e.preventDefault();
}
return true;
}
},this);
}
this.defer("onKeyPressed",1);
return true;
},onKeyUp:function(){
},setDisabled:function(_4a){
_b.deprecated("dijit.Editor::setDisabled is deprecated","use dijit.Editor::attr(\"disabled\",boolean) instead",2);
this.set("disabled",_4a);
},_setValueAttr:function(_4b){
this.setValue(_4b);
},_setDisableSpellCheckAttr:function(_4c){
if(this.document){
_6.set(this.document.body,"spellcheck",!_4c);
}else{
this.onLoadDeferred.then(_d.hitch(this,function(){
_6.set(this.document.body,"spellcheck",!_4c);
}));
}
this._set("disableSpellCheck",_4c);
},addKeyHandler:function(key,_4d,_4e,_4f){
if(typeof key=="string"){
key=key.toUpperCase().charCodeAt(0);
}
if(!_d.isArray(this._keyHandlers[key])){
this._keyHandlers[key]=[];
}
this._keyHandlers[key].push({shift:_4e||false,ctrl:_4d||false,handler:_4f});
},onKeyPressed:function(){
this.onDisplayChanged();
},onClick:function(e){
this.onDisplayChanged(e);
},_onIEMouseDown:function(){
if(!this.focused&&!this.disabled){
this.focus();
}
},_onBlur:function(e){
if(has("ie")||has("trident")){
this.defer(function(){
if(!_19.curNode){
this.ownerDocumentBody.focus();
}
});
}
this.inherited(arguments);
var _50=this.getValue(true);
if(_50!==this.value){
this.onChange(_50);
}
this._set("value",_50);
},_onFocus:function(e){
if(!this.disabled){
if(!this._disabledOK){
this.set("disabled",false);
}
this.inherited(arguments);
}
},blur:function(){
if(!has("ie")&&this.window.document.documentElement&&this.window.document.documentElement.focus){
this.window.document.documentElement.focus();
}else{
if(this.ownerDocumentBody.focus){
this.ownerDocumentBody.focus();
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
if(has("ie")<9){
this.iframe.fireEvent("onfocus",document.createEventObject());
}else{
this.editNode.focus();
}
},updateInterval:200,_updateTimer:null,onDisplayChanged:function(){
if(this._updateTimer){
this._updateTimer.remove();
}
this._updateTimer=this.defer("onNormalizedDisplayChanged",this.updateInterval);
},onNormalizedDisplayChanged:function(){
delete this._updateTimer;
},onChange:function(){
},_normalizeCommand:function(cmd,_51){
var _52=cmd.toLowerCase();
if(_52==="formatblock"){
if(has("safari")&&_51===undefined){
_52="heading";
}
}else{
if(_52==="hilitecolor"&&!has("mozilla")){
_52="backcolor";
}
}
return _52;
},_qcaCache:{},queryCommandAvailable:function(_53){
var ca=this._qcaCache[_53];
if(ca!==undefined){
return ca;
}
return (this._qcaCache[_53]=this._queryCommandAvailable(_53));
},_queryCommandAvailable:function(_54){
var ie=1;
var _55=1<<1;
var _56=1<<2;
var _57=1<<3;
function _58(_59){
return {ie:Boolean(_59&ie),mozilla:Boolean(_59&_55),webkit:Boolean(_59&_56),opera:Boolean(_59&_57)};
};
var _5a=null;
switch(_54.toLowerCase()){
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
_5a=_58(_55|ie|_56|_57);
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
_5a=_58(_55|ie|_57|_56);
break;
case "blockdirltr":
case "blockdirrtl":
case "dirltr":
case "dirrtl":
case "inlinedirltr":
case "inlinedirrtl":
_5a=_58(ie);
break;
case "cut":
case "copy":
case "paste":
_5a=_58(ie|_55|_56|_57);
break;
case "inserttable":
_5a=_58(_55|ie);
break;
case "insertcell":
case "insertcol":
case "insertrow":
case "deletecells":
case "deletecols":
case "deleterows":
case "mergecells":
case "splitcell":
_5a=_58(ie|_55);
break;
default:
return false;
}
return ((has("ie")||has("trident"))&&_5a.ie)||(has("mozilla")&&_5a.mozilla)||(has("webkit")&&_5a.webkit)||(has("opera")&&_5a.opera);
},execCommand:function(_5b,_5c){
var _5d;
if(this.focused){
this.focus();
}
_5b=this._normalizeCommand(_5b,_5c);
if(_5c!==undefined){
if(_5b==="heading"){
throw new Error("unimplemented");
}else{
if(_5b==="formatblock"&&(has("ie")||has("trident"))){
_5c="<"+_5c+">";
}
}
}
var _5e="_"+_5b+"Impl";
if(this[_5e]){
_5d=this[_5e](_5c);
}else{
_5c=arguments.length>1?_5c:null;
if(_5c||_5b!=="createlink"){
_5d=this.document.execCommand(_5b,false,_5c);
}
}
this.onDisplayChanged();
return _5d;
},queryCommandEnabled:function(_5f){
if(this.disabled||!this._disabledOK){
return false;
}
_5f=this._normalizeCommand(_5f);
var _60="_"+_5f+"EnabledImpl";
if(this[_60]){
return this[_60](_5f);
}else{
return this._browserQueryCommandEnabled(_5f);
}
},queryCommandState:function(_61){
if(this.disabled||!this._disabledOK){
return false;
}
_61=this._normalizeCommand(_61);
try{
return this.document.queryCommandState(_61);
}
catch(e){
return false;
}
},queryCommandValue:function(_62){
if(this.disabled||!this._disabledOK){
return false;
}
var r;
_62=this._normalizeCommand(_62);
if((has("ie")||has("trident"))&&_62==="formatblock"){
r=this._native2LocalFormatNames[this.document.queryCommandValue(_62)];
}else{
if(has("mozilla")&&_62==="hilitecolor"){
var _63;
try{
_63=this.document.queryCommandValue("styleWithCSS");
}
catch(e){
_63=false;
}
this.document.execCommand("styleWithCSS",false,true);
r=this.document.queryCommandValue(_62);
this.document.execCommand("styleWithCSS",false,_63);
}else{
r=this.document.queryCommandValue(_62);
}
}
return r;
},_sCall:function(_64,_65){
return this.selection[_64].apply(this.selection,_65);
},placeCursorAtStart:function(){
this.focus();
var _66=false;
if(has("mozilla")){
var _67=this.editNode.firstChild;
while(_67){
if(_67.nodeType===3){
if(_67.nodeValue.replace(/^\s+|\s+$/g,"").length>0){
_66=true;
this.selection.selectElement(_67);
break;
}
}else{
if(_67.nodeType===1){
_66=true;
var tg=_67.tagName?_67.tagName.toLowerCase():"";
if(/br|input|img|base|meta|area|basefont|hr|link/.test(tg)){
this.selection.selectElement(_67);
}else{
this.selection.selectElementChildren(_67);
}
break;
}
}
_67=_67.nextSibling;
}
}else{
_66=true;
this.selection.selectElementChildren(this.editNode);
}
if(_66){
this.selection.collapse(true);
}
},placeCursorAtEnd:function(){
this.focus();
var _68=false;
if(has("mozilla")){
var _69=this.editNode.lastChild;
while(_69){
if(_69.nodeType===3){
if(_69.nodeValue.replace(/^\s+|\s+$/g,"").length>0){
_68=true;
this.selection.selectElement(_69);
break;
}
}else{
if(_69.nodeType===1){
_68=true;
this.selection.selectElement(_69.lastChild||_69);
break;
}
}
_69=_69.previousSibling;
}
}else{
_68=true;
this.selection.selectElementChildren(this.editNode);
}
if(_68){
this.selection.collapse(false);
}
},getValue:function(_6a){
if(this.textarea){
if(this.isClosed||!this.isLoaded){
return this.textarea.value;
}
}
return this.isLoaded?this._postFilterContent(null,_6a):this.value;
},_getValueAttr:function(){
return this.getValue(true);
},setValue:function(_6b){
if(!this.isLoaded){
this.onLoadDeferred.then(_d.hitch(this,function(){
this.setValue(_6b);
}));
return;
}
this._cursorToStart=true;
if(this.textarea&&(this.isClosed||!this.isLoaded)){
this.textarea.value=_6b;
}else{
_6b=this._preFilterContent(_6b);
var _6c=this.isClosed?this.domNode:this.editNode;
_6c.innerHTML=_6b;
this._preDomFilterContent(_6c);
}
this.onDisplayChanged();
this._set("value",this.getValue(true));
},replaceValue:function(_6d){
if(this.isClosed){
this.setValue(_6d);
}else{
if(this.window&&this.window.getSelection&&!has("mozilla")){
this.setValue(_6d);
}else{
if(this.window&&this.window.getSelection){
_6d=this._preFilterContent(_6d);
this.execCommand("selectall");
this.execCommand("inserthtml",_6d);
this._preDomFilterContent(this.editNode);
}else{
if(this.document&&this.document.selection){
this.setValue(_6d);
}
}
}
}
this._set("value",this.getValue(true));
},_preFilterContent:function(_6e){
var ec=_6e;
_1.forEach(this.contentPreFilters,function(ef){
if(ef){
ec=ef(ec);
}
});
return ec;
},_preDomFilterContent:function(dom){
dom=dom||this.editNode;
_1.forEach(this.contentDomPreFilters,function(ef){
if(ef&&_d.isFunction(ef)){
ef(dom);
}
},this);
},_postFilterContent:function(dom,_6f){
var ec;
if(!_d.isString(dom)){
dom=dom||this.editNode;
if(this.contentDomPostFilters.length){
if(_6f){
dom=_d.clone(dom);
}
_1.forEach(this.contentDomPostFilters,function(ef){
dom=ef(dom);
});
}
ec=_18.getChildrenHtml(dom);
}else{
ec=dom;
}
if(!_d.trim(ec.replace(/^\xA0\xA0*/,"").replace(/\xA0\xA0*$/,"")).length){
ec="";
}
_1.forEach(this.contentPostFilters,function(ef){
ec=ef(ec);
});
return ec;
},_saveContent:function(){
var _70=_5.byId(_1a._scopeName+"._editor.RichText.value");
if(_70){
if(_70.value){
_70.value+=this._SEPARATOR;
}
_70.value+=this.name+this._NAME_CONTENT_SEP+this.getValue(true);
}
},escapeXml:function(str,_71){
str=str.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
if(!_71){
str=str.replace(/'/gm,"&#39;");
}
return str;
},getNodeHtml:function(_72){
_b.deprecated("dijit.Editor::getNodeHtml is deprecated","use dijit/_editor/html::getNodeHtml instead",2);
return _18.getNodeHtml(_72);
},getNodeChildrenHtml:function(dom){
_b.deprecated("dijit.Editor::getNodeChildrenHtml is deprecated","use dijit/_editor/html::getChildrenHtml instead",2);
return _18.getChildrenHtml(dom);
},close:function(_73){
if(this.isClosed){
return;
}
if(!arguments.length){
_73=true;
}
if(_73){
this._set("value",this.getValue(true));
}
if(this.interval){
clearInterval(this.interval);
}
if(this._webkitListener){
this._webkitListener.remove();
delete this._webkitListener;
}
if(has("ie")){
this.iframe.onfocus=null;
}
this.iframe._loadFunc=null;
if(this._iframeRegHandle){
this._iframeRegHandle.remove();
delete this._iframeRegHandle;
}
if(this.textarea){
var s=this.textarea.style;
s.position="";
s.left=s.top="";
if(has("ie")){
s.overflow=this.__overflow;
this.__overflow=null;
}
this.textarea.value=this.value;
_8.destroy(this.domNode);
this.domNode=this.textarea;
}else{
this.domNode.innerHTML=this.value;
}
delete this.iframe;
_7.remove(this.domNode,this.baseClass);
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
if(this._updateTimer){
this._updateTimer.remove();
}
this.inherited(arguments);
if(_1b._globalSaveHandler){
delete _1b._globalSaveHandler[this.id];
}
},_removeMozBogus:function(_74){
return _74.replace(/\stype="_moz"/gi,"").replace(/\s_moz_dirty=""/gi,"").replace(/_moz_resizing="(true|false)"/gi,"");
},_removeWebkitBogus:function(_75){
_75=_75.replace(/\sclass="webkit-block-placeholder"/gi,"");
_75=_75.replace(/\sclass="apple-style-span"/gi,"");
_75=_75.replace(/<meta charset=\"utf-8\" \/>/gi,"");
return _75;
},_normalizeFontStyle:function(_76){
return _76.replace(/<(\/)?strong([ \>])/gi,"<$1b$2").replace(/<(\/)?em([ \>])/gi,"<$1i$2");
},_preFixUrlAttributes:function(_77){
return _77.replace(/(?:(<a(?=\s).*?\shref=)("|')(.*?)\2)|(?:(<a\s.*?href=)([^"'][^ >]+))/gi,"$1$4$2$3$5$2 _djrealurl=$2$3$5$2").replace(/(?:(<img(?=\s).*?\ssrc=)("|')(.*?)\2)|(?:(<img\s.*?src=)([^"'][^ >]+))/gi,"$1$4$2$3$5$2 _djrealurl=$2$3$5$2");
},_browserQueryCommandEnabled:function(_78){
if(!_78){
return false;
}
var _79=has("ie")<9?this.document.selection.createRange():this.document;
try{
return _79.queryCommandEnabled(_78);
}
catch(e){
return false;
}
},_createlinkEnabledImpl:function(){
var _7a=true;
if(has("opera")){
var sel=this.window.getSelection();
if(sel.isCollapsed){
_7a=true;
}else{
_7a=this.document.queryCommandEnabled("createlink");
}
}else{
_7a=this._browserQueryCommandEnabled("createlink");
}
return _7a;
},_unlinkEnabledImpl:function(){
var _7b=true;
if(has("mozilla")||has("webkit")){
_7b=this.selection.hasAncestorElement("a");
}else{
_7b=this._browserQueryCommandEnabled("unlink");
}
return _7b;
},_inserttableEnabledImpl:function(){
var _7c=true;
if(has("mozilla")||has("webkit")){
_7c=true;
}else{
_7c=this._browserQueryCommandEnabled("inserttable");
}
return _7c;
},_cutEnabledImpl:function(){
var _7d=true;
if(has("webkit")){
var sel=this.window.getSelection();
if(sel){
sel=sel.toString();
}
_7d=!!sel;
}else{
_7d=this._browserQueryCommandEnabled("cut");
}
return _7d;
},_copyEnabledImpl:function(){
var _7e=true;
if(has("webkit")){
var sel=this.window.getSelection();
if(sel){
sel=sel.toString();
}
_7e=!!sel;
}else{
_7e=this._browserQueryCommandEnabled("copy");
}
return _7e;
},_pasteEnabledImpl:function(){
var _7f=true;
if(has("webkit")){
return true;
}else{
_7f=this._browserQueryCommandEnabled("paste");
}
return _7f;
},_inserthorizontalruleImpl:function(_80){
if(has("ie")){
return this._inserthtmlImpl("<hr>");
}
return this.document.execCommand("inserthorizontalrule",false,_80);
},_unlinkImpl:function(_81){
if((this.queryCommandEnabled("unlink"))&&(has("mozilla")||has("webkit"))){
var a=this.selection.getAncestorElement("a");
this.selection.selectElement(a);
return this.document.execCommand("unlink",false,null);
}
return this.document.execCommand("unlink",false,_81);
},_hilitecolorImpl:function(_82){
var _83;
var _84=this._handleTextColorOrProperties("hilitecolor",_82);
if(!_84){
if(has("mozilla")){
this.document.execCommand("styleWithCSS",false,true);
_83=this.document.execCommand("hilitecolor",false,_82);
this.document.execCommand("styleWithCSS",false,false);
}else{
_83=this.document.execCommand("hilitecolor",false,_82);
}
}
return _83;
},_backcolorImpl:function(_85){
if(has("ie")){
_85=_85?_85:null;
}
var _86=this._handleTextColorOrProperties("backcolor",_85);
if(!_86){
_86=this.document.execCommand("backcolor",false,_85);
}
return _86;
},_forecolorImpl:function(_87){
if(has("ie")){
_87=_87?_87:null;
}
var _88=false;
_88=this._handleTextColorOrProperties("forecolor",_87);
if(!_88){
_88=this.document.execCommand("forecolor",false,_87);
}
return _88;
},_inserthtmlImpl:function(_89){
_89=this._preFilterContent(_89);
var rv=true;
if(has("ie")<9){
var _8a=this.document.selection.createRange();
if(this.document.selection.type.toUpperCase()==="CONTROL"){
var n=_8a.item(0);
while(_8a.length){
_8a.remove(_8a.item(0));
}
n.outerHTML=_89;
}else{
_8a.pasteHTML(_89);
}
_8a.select();
}else{
if(has("trident")<8){
var _8a;
var _8b=_17.getSelection(this.window);
if(_8b&&_8b.rangeCount&&_8b.getRangeAt){
_8a=_8b.getRangeAt(0);
_8a.deleteContents();
var div=_8.create("div");
div.innerHTML=_89;
var _8c,_8d;
var n=this.document.createDocumentFragment();
while((_8c=div.firstChild)){
_8d=n.appendChild(_8c);
}
_8a.insertNode(n);
if(_8d){
_8a=_8a.cloneRange();
_8a.setStartAfter(_8d);
_8a.collapse(false);
_8b.removeAllRanges();
_8b.addRange(_8a);
}
}
}else{
if(has("mozilla")&&!_89.length){
this.selection.remove();
}else{
rv=this.document.execCommand("inserthtml",false,_89);
}
}
}
return rv;
},_boldImpl:function(_8e){
var _8f=false;
if(has("ie")){
this._adaptIESelection();
_8f=this._adaptIEFormatAreaAndExec("bold");
}
if(!_8f){
_8f=this.document.execCommand("bold",false,_8e);
}
return _8f;
},_italicImpl:function(_90){
var _91=false;
if(has("ie")){
this._adaptIESelection();
_91=this._adaptIEFormatAreaAndExec("italic");
}
if(!_91){
_91=this.document.execCommand("italic",false,_90);
}
return _91;
},_underlineImpl:function(_92){
var _93=false;
if(has("ie")){
this._adaptIESelection();
_93=this._adaptIEFormatAreaAndExec("underline");
}
if(!_93){
_93=this.document.execCommand("underline",false,_92);
}
return _93;
},_strikethroughImpl:function(_94){
var _95=false;
if(has("ie")){
this._adaptIESelection();
_95=this._adaptIEFormatAreaAndExec("strikethrough");
}
if(!_95){
_95=this.document.execCommand("strikethrough",false,_94);
}
return _95;
},_superscriptImpl:function(_96){
var _97=false;
if(has("ie")){
this._adaptIESelection();
_97=this._adaptIEFormatAreaAndExec("superscript");
}
if(!_97){
_97=this.document.execCommand("superscript",false,_96);
}
return _97;
},_subscriptImpl:function(_98){
var _99=false;
if(has("ie")){
this._adaptIESelection();
_99=this._adaptIEFormatAreaAndExec("subscript");
}
if(!_99){
_99=this.document.execCommand("subscript",false,_98);
}
return _99;
},_fontnameImpl:function(_9a){
var _9b;
if(has("ie")){
_9b=this._handleTextColorOrProperties("fontname",_9a);
}
if(!_9b){
_9b=this.document.execCommand("fontname",false,_9a);
}
return _9b;
},_fontsizeImpl:function(_9c){
var _9d;
if(has("ie")){
_9d=this._handleTextColorOrProperties("fontsize",_9c);
}
if(!_9d){
_9d=this.document.execCommand("fontsize",false,_9c);
}
return _9d;
},_insertorderedlistImpl:function(_9e){
var _9f=false;
if(has("ie")){
_9f=this._adaptIEList("insertorderedlist",_9e);
}
if(!_9f){
_9f=this.document.execCommand("insertorderedlist",false,_9e);
}
return _9f;
},_insertunorderedlistImpl:function(_a0){
var _a1=false;
if(has("ie")){
_a1=this._adaptIEList("insertunorderedlist",_a0);
}
if(!_a1){
_a1=this.document.execCommand("insertunorderedlist",false,_a0);
}
return _a1;
},getHeaderHeight:function(){
return this._getNodeChildrenHeight(this.header);
},getFooterHeight:function(){
return this._getNodeChildrenHeight(this.footer);
},_getNodeChildrenHeight:function(_a2){
var h=0;
if(_a2&&_a2.childNodes){
var i;
for(i=0;i<_a2.childNodes.length;i++){
var _a3=_9.position(_a2.childNodes[i]);
h+=_a3.h;
}
}
return h;
},_isNodeEmpty:function(_a4,_a5){
if(_a4.nodeType===1){
if(_a4.childNodes.length>0){
return this._isNodeEmpty(_a4.childNodes[0],_a5);
}
return true;
}else{
if(_a4.nodeType===3){
return (_a4.nodeValue.substring(_a5)==="");
}
}
return false;
},_removeStartingRangeFromRange:function(_a6,_a7){
if(_a6.nextSibling){
_a7.setStart(_a6.nextSibling,0);
}else{
var _a8=_a6.parentNode;
while(_a8&&_a8.nextSibling==null){
_a8=_a8.parentNode;
}
if(_a8){
_a7.setStart(_a8.nextSibling,0);
}
}
return _a7;
},_adaptIESelection:function(){
var _a9=_17.getSelection(this.window);
if(_a9&&_a9.rangeCount&&!_a9.isCollapsed){
var _aa=_a9.getRangeAt(0);
var _ab=_aa.startContainer;
var _ac=_aa.startOffset;
while(_ab.nodeType===3&&_ac>=_ab.length&&_ab.nextSibling){
_ac=_ac-_ab.length;
_ab=_ab.nextSibling;
}
var _ad=null;
while(this._isNodeEmpty(_ab,_ac)&&_ab!==_ad){
_ad=_ab;
_aa=this._removeStartingRangeFromRange(_ab,_aa);
_ab=_aa.startContainer;
_ac=0;
}
_a9.removeAllRanges();
_a9.addRange(_aa);
}
},_adaptIEFormatAreaAndExec:function(_ae){
var _af=_17.getSelection(this.window);
var doc=this.document;
var rs,ret,_b0,txt,_b1,_b2,_b3,_b4;
if(_ae&&_af&&_af.isCollapsed){
var _b5=this.queryCommandValue(_ae);
if(_b5){
var _b6=this._tagNamesForCommand(_ae);
_b0=_af.getRangeAt(0);
var fs=_b0.startContainer;
if(fs.nodeType===3){
var _b7=_b0.endOffset;
if(fs.length<_b7){
ret=this._adjustNodeAndOffset(rs,_b7);
fs=ret.node;
_b7=ret.offset;
}
}
var _b8;
while(fs&&fs!==this.editNode){
var _b9=fs.tagName?fs.tagName.toLowerCase():"";
if(_1.indexOf(_b6,_b9)>-1){
_b8=fs;
break;
}
fs=fs.parentNode;
}
if(_b8){
rs=_b0.startContainer;
var _ba=doc.createElement(_b8.tagName);
_8.place(_ba,_b8,"after");
if(rs&&rs.nodeType===3){
var _bb,_bc;
var _bd=_b0.endOffset;
if(rs.length<_bd){
ret=this._adjustNodeAndOffset(rs,_bd);
rs=ret.node;
_bd=ret.offset;
}
txt=rs.nodeValue;
_b1=doc.createTextNode(txt.substring(0,_bd));
var _be=txt.substring(_bd,txt.length);
if(_be){
_b2=doc.createTextNode(_be);
}
_8.place(_b1,rs,"before");
if(_b2){
_b3=doc.createElement("span");
_b3.className="ieFormatBreakerSpan";
_8.place(_b3,rs,"after");
_8.place(_b2,_b3,"after");
_b2=_b3;
}
_8.destroy(rs);
var _bf=_b1.parentNode;
var _c0=[];
var _c1;
while(_bf!==_b8){
var tg=_bf.tagName;
_c1={tagName:tg};
_c0.push(_c1);
var _c2=doc.createElement(tg);
if(_bf.style){
if(_c2.style){
if(_bf.style.cssText){
_c2.style.cssText=_bf.style.cssText;
_c1.cssText=_bf.style.cssText;
}
}
}
if(_bf.tagName==="FONT"){
if(_bf.color){
_c2.color=_bf.color;
_c1.color=_bf.color;
}
if(_bf.face){
_c2.face=_bf.face;
_c1.face=_bf.face;
}
if(_bf.size){
_c2.size=_bf.size;
_c1.size=_bf.size;
}
}
if(_bf.className){
_c2.className=_bf.className;
_c1.className=_bf.className;
}
if(_b2){
_bb=_b2;
while(_bb){
_bc=_bb.nextSibling;
_c2.appendChild(_bb);
_bb=_bc;
}
}
if(_c2.tagName==_bf.tagName){
_b3=doc.createElement("span");
_b3.className="ieFormatBreakerSpan";
_8.place(_b3,_bf,"after");
_8.place(_c2,_b3,"after");
}else{
_8.place(_c2,_bf,"after");
}
_b1=_bf;
_b2=_c2;
_bf=_bf.parentNode;
}
if(_b2){
_bb=_b2;
if(_bb.nodeType===1||(_bb.nodeType===3&&_bb.nodeValue)){
_ba.innerHTML="";
}
while(_bb){
_bc=_bb.nextSibling;
_ba.appendChild(_bb);
_bb=_bc;
}
}
var _c3;
if(_c0.length){
_c1=_c0.pop();
var _c4=doc.createElement(_c1.tagName);
if(_c1.cssText&&_c4.style){
_c4.style.cssText=_c1.cssText;
}
if(_c1.className){
_c4.className=_c1.className;
}
if(_c1.tagName==="FONT"){
if(_c1.color){
_c4.color=_c1.color;
}
if(_c1.face){
_c4.face=_c1.face;
}
if(_c1.size){
_c4.size=_c1.size;
}
}
_8.place(_c4,_ba,"before");
while(_c0.length){
_c1=_c0.pop();
var _c5=doc.createElement(_c1.tagName);
if(_c1.cssText&&_c5.style){
_c5.style.cssText=_c1.cssText;
}
if(_c1.className){
_c5.className=_c1.className;
}
if(_c1.tagName==="FONT"){
if(_c1.color){
_c5.color=_c1.color;
}
if(_c1.face){
_c5.face=_c1.face;
}
if(_c1.size){
_c5.size=_c1.size;
}
}
_c4.appendChild(_c5);
_c4=_c5;
}
_b4=doc.createTextNode(".");
_b3.appendChild(_b4);
_c4.appendChild(_b4);
_c3=_17.create(this.window);
_c3.setStart(_b4,0);
_c3.setEnd(_b4,_b4.length);
_af.removeAllRanges();
_af.addRange(_c3);
this.selection.collapse(false);
_b4.parentNode.innerHTML="";
}else{
_b3=doc.createElement("span");
_b3.className="ieFormatBreakerSpan";
_b4=doc.createTextNode(".");
_b3.appendChild(_b4);
_8.place(_b3,_ba,"before");
_c3=_17.create(this.window);
_c3.setStart(_b4,0);
_c3.setEnd(_b4,_b4.length);
_af.removeAllRanges();
_af.addRange(_c3);
this.selection.collapse(false);
_b4.parentNode.innerHTML="";
}
if(!_ba.firstChild){
_8.destroy(_ba);
}
return true;
}
}
return false;
}else{
_b0=_af.getRangeAt(0);
rs=_b0.startContainer;
if(rs&&rs.nodeType===3){
var _b7=_b0.startOffset;
if(rs.length<_b7){
ret=this._adjustNodeAndOffset(rs,_b7);
rs=ret.node;
_b7=ret.offset;
}
txt=rs.nodeValue;
_b1=doc.createTextNode(txt.substring(0,_b7));
var _be=txt.substring(_b7);
if(_be!==""){
_b2=doc.createTextNode(txt.substring(_b7));
}
_b3=doc.createElement("span");
_b4=doc.createTextNode(".");
_b3.appendChild(_b4);
if(_b1.length){
_8.place(_b1,rs,"after");
}else{
_b1=rs;
}
_8.place(_b3,_b1,"after");
if(_b2){
_8.place(_b2,_b3,"after");
}
_8.destroy(rs);
var _c3=_17.create(this.window);
_c3.setStart(_b4,0);
_c3.setEnd(_b4,_b4.length);
_af.removeAllRanges();
_af.addRange(_c3);
doc.execCommand(_ae);
_8.place(_b3.firstChild,_b3,"before");
_8.destroy(_b3);
_c3.setStart(_b4,0);
_c3.setEnd(_b4,_b4.length);
_af.removeAllRanges();
_af.addRange(_c3);
this.selection.collapse(false);
_b4.parentNode.innerHTML="";
return true;
}
}
}else{
return false;
}
},_adaptIEList:function(_c6){
var _c7=_17.getSelection(this.window);
if(_c7.isCollapsed){
if(_c7.rangeCount&&!this.queryCommandValue(_c6)){
var _c8=_c7.getRangeAt(0);
var sc=_c8.startContainer;
if(sc&&sc.nodeType==3){
if(!_c8.startOffset){
var _c9="ul";
if(_c6==="insertorderedlist"){
_c9="ol";
}
var _ca=this.document.createElement(_c9);
var li=_8.create("li",null,_ca);
_8.place(_ca,sc,"before");
li.appendChild(sc);
_8.create("br",null,_ca,"after");
var _cb=_17.create(this.window);
_cb.setStart(sc,0);
_cb.setEnd(sc,sc.length);
_c7.removeAllRanges();
_c7.addRange(_cb);
this.selection.collapse(true);
return true;
}
}
}
}
return false;
},_handleTextColorOrProperties:function(_cc,_cd){
var _ce=_17.getSelection(this.window);
var doc=this.document;
var rs,ret,_cf,txt,_d0,_d1,_d2,_d3;
_cd=_cd||null;
if(_cc&&_ce&&_ce.isCollapsed){
if(_ce.rangeCount){
_cf=_ce.getRangeAt(0);
rs=_cf.startContainer;
if(rs&&rs.nodeType===3){
var _d4=_cf.startOffset;
if(rs.length<_d4){
ret=this._adjustNodeAndOffset(rs,_d4);
rs=ret.node;
_d4=ret.offset;
}
txt=rs.nodeValue;
_d0=doc.createTextNode(txt.substring(0,_d4));
var _d5=txt.substring(_d4);
if(_d5!==""){
_d1=doc.createTextNode(txt.substring(_d4));
}
_d2=doc.createElement("span");
_d3=doc.createTextNode(".");
_d2.appendChild(_d3);
var _d6=doc.createElement("span");
_d2.appendChild(_d6);
if(_d0.length){
_8.place(_d0,rs,"after");
}else{
_d0=rs;
}
_8.place(_d2,_d0,"after");
if(_d1){
_8.place(_d1,_d2,"after");
}
_8.destroy(rs);
var _d7=_17.create(this.window);
_d7.setStart(_d3,0);
_d7.setEnd(_d3,_d3.length);
_ce.removeAllRanges();
_ce.addRange(_d7);
if(has("webkit")){
var _d8="color";
if(_cc==="hilitecolor"||_cc==="backcolor"){
_d8="backgroundColor";
}
_a.set(_d2,_d8,_cd);
this.selection.remove();
_8.destroy(_d6);
_d2.innerHTML="&#160;";
this.selection.selectElement(_d2);
this.focus();
}else{
this.execCommand(_cc,_cd);
_8.place(_d2.firstChild,_d2,"before");
_8.destroy(_d2);
_d7.setStart(_d3,0);
_d7.setEnd(_d3,_d3.length);
_ce.removeAllRanges();
_ce.addRange(_d7);
this.selection.collapse(false);
_d3.parentNode.removeChild(_d3);
}
return true;
}
}
}
return false;
},_adjustNodeAndOffset:function(_d9,_da){
while(_d9.length<_da&&_d9.nextSibling&&_d9.nextSibling.nodeType===3){
_da=_da-_d9.length;
_d9=_d9.nextSibling;
}
return {"node":_d9,"offset":_da};
},_tagNamesForCommand:function(_db){
if(_db==="bold"){
return ["b","strong"];
}else{
if(_db==="italic"){
return ["i","em"];
}else{
if(_db==="strikethrough"){
return ["s","strike"];
}else{
if(_db==="superscript"){
return ["sup"];
}else{
if(_db==="subscript"){
return ["sub"];
}else{
if(_db==="underline"){
return ["u"];
}
}
}
}
}
}
return [];
},_stripBreakerNodes:function(_dc){
if(!this.isLoaded){
return;
}
_e(".ieFormatBreakerSpan",_dc).forEach(function(b){
while(b.firstChild){
_8.place(b.firstChild,b,"before");
}
_8.destroy(b);
});
return _dc;
},_stripTrailingEmptyNodes:function(_dd){
function _de(_df){
return (/^(p|div|br)$/i.test(_df.nodeName)&&_df.children.length==0&&/^[\s\xA0]*$/.test(_df.textContent||_df.innerText||""))||(_df.nodeType===3&&/^[\s\xA0]*$/.test(_df.nodeValue));
};
while(_dd.lastChild&&_de(_dd.lastChild)){
_8.destroy(_dd.lastChild);
}
return _dd;
}});
return _1b;
});
