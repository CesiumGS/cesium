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
this.contentPreFilters=[_d.hitch(this,"_preFixUrlAttributes")].concat(this.contentPreFilters);
if(has("mozilla")){
this.contentPreFilters=[this._normalizeFontStyle].concat(this.contentPreFilters);
this.contentPostFilters=[this._removeMozBogus].concat(this.contentPostFilters);
}
if(has("webkit")){
this.contentPreFilters=[this._removeWebkitBogus].concat(this.contentPreFilters);
this.contentPostFilters=[this._removeWebkitBogus].concat(this.contentPostFilters);
}
if(has("ie")){
this.contentPostFilters=[this._normalizeFontStyle].concat(this.contentPostFilters);
this.contentDomPostFilters=[_d.hitch(this,this._stripBreakerNodes)].concat(this.contentDomPostFilters);
}
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
delete this.value;
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
this.document=this.window.document;
this.selection=new _16.SelectionManager(w);
if(has("ie")){
this._localizeEditorCommands();
}
this.onLoad(_27);
});
var src=this._getIframeDocTxt(),s="javascript: '"+src.replace(/\\/g,"\\\\").replace(/'/g,"\\'")+"'";
if(has("ie")>=9){
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
var _2f="";
var _30=true;
if(has("ie")||has("webkit")||(!this.height&&!has("mozilla"))){
_2f="<div id='dijitEditorBody'></div>";
_30=false;
}else{
if(has("mozilla")){
this._cursorToStart=true;
_2f="&#160;";
}
}
var _31=[_2e.fontWeight,_2e.fontSize,_2e.fontFamily].join(" ");
var _32=_2e.lineHeight;
if(_32.indexOf("px")>=0){
_32=parseFloat(_32)/parseFloat(_2e.fontSize);
}else{
if(_32.indexOf("em")>=0){
_32=parseFloat(_32);
}else{
_32="normal";
}
}
var _33="";
var _34=this;
this.style.replace(/(^|;)\s*(line-|font-?)[^;]+/ig,function(_35){
_35=_35.replace(/^;/ig,"")+";";
var s=_35.split(":")[0];
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
_a.set(_34.domNode,sC,"");
}
_33+=_35+";";
});
var _36=_e("label[for=\""+this.id+"\"]");
var _37="";
if(_36.length){
_37=_36[0].innerHTML;
}else{
if(this["aria-label"]){
_37=this["aria-label"];
}else{
if(this["aria-labelledby"]){
_37=_5.byId(this["aria-labelledby"]).innerHTML;
}
}
}
this.iframe.setAttribute("title",_37);
return ["<!DOCTYPE html>",this.isLeftToRight()?"<html lang='"+this.lang+"'>\n<head>\n":"<html dir='rtl' lang='"+this.lang+"'>\n<head>\n",_37?"<title>"+_37+"</title>":"","<meta http-equiv='Content-Type' content='text/html'>\n","<style>\n","\tbody,html {\n","\t\tbackground:transparent;\n","\t\tpadding: 1px 0 0 0;\n","\t\tmargin: -1px 0 0 0;\n","\t}\n","\tbody,html, #dijitEditorBody{ outline: none; }","html { height: 100%; width: 100%; overflow: hidden; }\n",this.height?"\tbody { height: 100%; width: 100%; overflow: auto; }\n":"\tbody { min-height: "+this.minHeight+"; width: 100%; overflow-x: auto; overflow-y: hidden; }\n","\tbody{\n","\t\ttop:0px;\n","\t\tleft:0px;\n","\t\tright:0px;\n","\t\tfont:",_31,";\n",((this.height||has("opera"))?"":"\t\tposition: fixed;\n"),"\t\tline-height:",_32,";\n","\t}\n","\tp{ margin: 1em 0; }\n","\tli > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; }\n",(!has("ie")?"\tli{ min-height:1.2em; }\n":""),"</style>\n",this._applyEditingAreaStyleSheets(),"\n","</head>\n<body role='main' ",(_30?"id='dijitEditorBody' ":""),"onload='frameElement && frameElement._loadFunc(window,document)' ","style='"+_33+"'>",_2f,"</body>\n</html>"].join("");
},_applyEditingAreaStyleSheets:function(){
var _38=[];
if(this.styleSheets){
_38=this.styleSheets.split(";");
this.styleSheets="";
}
_38=_38.concat(this.editingAreaStyleSheets);
this.editingAreaStyleSheets=[];
var _39="",i=0,url,_3a=_13.get(this.ownerDocument);
while((url=_38[i++])){
var _3b=(new _12(_3a.location,url)).toString();
this.editingAreaStyleSheets.push(_3b);
_39+="<link rel=\"stylesheet\" type=\"text/css\" href=\""+_3b+"\"/>";
}
return _39;
},addStyleSheet:function(uri){
var url=uri.toString(),_3c=_13.get(this.ownerDocument);
if(url.charAt(0)==="."||(url.charAt(0)!=="/"&&!uri.host)){
url=(new _12(_3c.location,url)).toString();
}
if(_1.indexOf(this.editingAreaStyleSheets,url)>-1){
return;
}
this.editingAreaStyleSheets.push(url);
this.onLoadDeferred.then(_d.hitch(this,function(){
if(this.document.createStyleSheet){
this.document.createStyleSheet(url);
}else{
var _3d=this.document.getElementsByTagName("head")[0];
var _3e=this.document.createElement("link");
_3e.rel="stylesheet";
_3e.type="text/css";
_3e.href=url;
_3d.appendChild(_3e);
}
}));
},removeStyleSheet:function(uri){
var url=uri.toString(),_3f=_13.get(this.ownerDocument);
if(url.charAt(0)==="."||(url.charAt(0)!=="/"&&!uri.host)){
url=(new _12(_3f.location,url)).toString();
}
var _40=_1.indexOf(this.editingAreaStyleSheets,url);
if(_40===-1){
return;
}
delete this.editingAreaStyleSheets[_40];
_e("link[href=\""+url+"\"]",this.window.document).orphan();
},disabled:false,_mozSettingProps:{"styleWithCSS":false},_setDisabledAttr:function(_41){
_41=!!_41;
this._set("disabled",_41);
if(!this.isLoaded){
return;
}
if(has("ie")||has("webkit")||has("opera")){
var _42=has("ie")&&(this.isLoaded||!this.focusOnLoad);
if(_42){
this.editNode.unselectable="on";
}
this.editNode.contentEditable=!_41;
if(_42){
this.defer(function(){
if(this.editNode){
this.editNode.unselectable="off";
}
});
}
}else{
try{
this.document.designMode=(_41?"off":"on");
}
catch(e){
return;
}
if(!_41&&this._mozSettingProps){
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
}
this._disabledOK=true;
},onLoad:function(_43){
if(!this.window.__registeredWindow){
this.window.__registeredWindow=true;
this._iframeRegHandle=_19.registerIframe(this.iframe);
}
if(!has("ie")&&!has("webkit")&&(this.height||has("mozilla"))){
this.editNode=this.document.body;
}else{
this.editNode=this.document.body.firstChild;
var _44=this;
if(has("ie")){
this.tabStop=_8.create("div",{tabIndex:-1},this.editingArea);
this.iframe.onfocus=function(){
_44.editNode.setActive();
};
}
}
this.focusNode=this.editNode;
var _45=this.events.concat(this.captureEvents);
var ap=this.iframe?this.document:this.editNode;
this.own(_1.map(_45,function(_46){
var _47=_46.toLowerCase().replace(/^on/,"");
on(ap,_47,_d.hitch(this,_46));
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
var _48=_d.hitch(this,function(){
this.setValue(_43);
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
this.setValueDeferred.then(_48);
}else{
_48();
}
},onKeyDown:function(e){
if(e.keyCode===_c.TAB&&this.isTabIndent){
e.stopPropagation();
e.preventDefault();
if(this.queryCommandEnabled((e.shiftKey?"outdent":"indent"))){
this.execCommand((e.shiftKey?"outdent":"indent"));
}
}
if(has("ie")){
if(e.keyCode==_c.TAB&&!this.isTabIndent){
if(e.shiftKey&&!e.ctrlKey&&!e.altKey){
this.iframe.focus();
}else{
if(!e.shiftKey&&!e.ctrlKey&&!e.altKey){
this.tabStop.focus();
}
}
}else{
if(e.keyCode===_c.BACKSPACE&&this.document.selection.type==="Control"){
e.stopPropagation();
e.preventDefault();
this.execCommand("delete");
}
}
}
if(has("ff")){
if(e.keyCode===_c.PAGE_UP||e.keyCode===_c.PAGE_DOWN){
if(this.editNode.clientHeight>=this.editNode.scrollHeight){
e.preventDefault();
}
}
}
var _49=this._keyHandlers[e.keyCode],_4a=arguments;
if(_49&&!e.altKey){
_1.some(_49,function(h){
if(!(h.shift^e.shiftKey)&&!(h.ctrl^(e.ctrlKey||e.metaKey))){
if(!h.handler.apply(this,_4a)){
e.preventDefault();
}
return true;
}
},this);
}
this.defer("onKeyPressed",1);
return true;
},onKeyUp:function(){
},setDisabled:function(_4b){
_b.deprecated("dijit.Editor::setDisabled is deprecated","use dijit.Editor::attr(\"disabled\",boolean) instead",2);
this.set("disabled",_4b);
},_setValueAttr:function(_4c){
this.setValue(_4c);
},_setDisableSpellCheckAttr:function(_4d){
if(this.document){
_6.set(this.document.body,"spellcheck",!_4d);
}else{
this.onLoadDeferred.then(_d.hitch(this,function(){
_6.set(this.document.body,"spellcheck",!_4d);
}));
}
this._set("disableSpellCheck",_4d);
},addKeyHandler:function(key,_4e,_4f,_50){
if(typeof key=="string"){
key=key.toUpperCase().charCodeAt(0);
}
if(!_d.isArray(this._keyHandlers[key])){
this._keyHandlers[key]=[];
}
this._keyHandlers[key].push({shift:_4f||false,ctrl:_4e||false,handler:_50});
},onKeyPressed:function(){
this.onDisplayChanged();
},onClick:function(e){
this.onDisplayChanged(e);
},_onIEMouseDown:function(){
if(!this.focused&&!this.disabled){
this.focus();
}
},_onBlur:function(e){
if(has("ie")>=9){
this.defer(function(){
if(!_19.curNode){
this.ownerDocumentBody.focus();
}
});
}
this.inherited(arguments);
var _51=this.getValue(true);
if(_51!==this.value){
this.onChange(_51);
}
this._set("value",_51);
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
if(!has("ie")){
_19.focus(this.iframe);
}else{
if(this.editNode&&this.editNode.focus){
this.iframe.fireEvent("onfocus",document.createEventObject());
}
}
},updateInterval:200,_updateTimer:null,onDisplayChanged:function(){
if(this._updateTimer){
this._updateTimer.remove();
}
this._updateTimer=this.defer("onNormalizedDisplayChanged",this.updateInterval);
},onNormalizedDisplayChanged:function(){
delete this._updateTimer;
},onChange:function(){
},_normalizeCommand:function(cmd,_52){
var _53=cmd.toLowerCase();
if(_53==="formatblock"){
if(has("safari")&&_52===undefined){
_53="heading";
}
}else{
if(_53==="hilitecolor"&&!has("mozilla")){
_53="backcolor";
}
}
return _53;
},_qcaCache:{},queryCommandAvailable:function(_54){
var ca=this._qcaCache[_54];
if(ca!==undefined){
return ca;
}
return (this._qcaCache[_54]=this._queryCommandAvailable(_54));
},_queryCommandAvailable:function(_55){
var ie=1;
var _56=1<<1;
var _57=1<<2;
var _58=1<<3;
function _59(_5a){
return {ie:Boolean(_5a&ie),mozilla:Boolean(_5a&_56),webkit:Boolean(_5a&_57),opera:Boolean(_5a&_58)};
};
var _5b=null;
switch(_55.toLowerCase()){
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
_5b=_59(_56|ie|_57|_58);
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
_5b=_59(_56|ie|_58|_57);
break;
case "blockdirltr":
case "blockdirrtl":
case "dirltr":
case "dirrtl":
case "inlinedirltr":
case "inlinedirrtl":
_5b=_59(ie);
break;
case "cut":
case "copy":
case "paste":
_5b=_59(ie|_56|_57|_58);
break;
case "inserttable":
_5b=_59(_56|ie);
break;
case "insertcell":
case "insertcol":
case "insertrow":
case "deletecells":
case "deletecols":
case "deleterows":
case "mergecells":
case "splitcell":
_5b=_59(ie|_56);
break;
default:
return false;
}
return (has("ie")&&_5b.ie)||(has("mozilla")&&_5b.mozilla)||(has("webkit")&&_5b.webkit)||(has("opera")&&_5b.opera);
},execCommand:function(_5c,_5d){
var _5e;
if(this.focused){
this.focus();
}
_5c=this._normalizeCommand(_5c,_5d);
if(_5d!==undefined){
if(_5c==="heading"){
throw new Error("unimplemented");
}else{
if((_5c==="formatblock")&&has("ie")){
_5d="<"+_5d+">";
}
}
}
var _5f="_"+_5c+"Impl";
if(this[_5f]){
_5e=this[_5f](_5d);
}else{
_5d=arguments.length>1?_5d:null;
if(_5d||_5c!=="createlink"){
_5e=this.document.execCommand(_5c,false,_5d);
}
}
this.onDisplayChanged();
return _5e;
},queryCommandEnabled:function(_60){
if(this.disabled||!this._disabledOK){
return false;
}
_60=this._normalizeCommand(_60);
var _61="_"+_60+"EnabledImpl";
if(this[_61]){
return this[_61](_60);
}else{
return this._browserQueryCommandEnabled(_60);
}
},queryCommandState:function(_62){
if(this.disabled||!this._disabledOK){
return false;
}
_62=this._normalizeCommand(_62);
try{
return this.document.queryCommandState(_62);
}
catch(e){
return false;
}
},queryCommandValue:function(_63){
if(this.disabled||!this._disabledOK){
return false;
}
var r;
_63=this._normalizeCommand(_63);
if(has("ie")&&_63==="formatblock"){
r=this._native2LocalFormatNames[this.document.queryCommandValue(_63)];
}else{
if(has("mozilla")&&_63==="hilitecolor"){
var _64;
try{
_64=this.document.queryCommandValue("styleWithCSS");
}
catch(e){
_64=false;
}
this.document.execCommand("styleWithCSS",false,true);
r=this.document.queryCommandValue(_63);
this.document.execCommand("styleWithCSS",false,_64);
}else{
r=this.document.queryCommandValue(_63);
}
}
return r;
},_sCall:function(_65,_66){
return this.selection[_65].apply(this.selection,_66);
},placeCursorAtStart:function(){
this.focus();
var _67=false;
if(has("mozilla")){
var _68=this.editNode.firstChild;
while(_68){
if(_68.nodeType===3){
if(_68.nodeValue.replace(/^\s+|\s+$/g,"").length>0){
_67=true;
this.selection.selectElement(_68);
break;
}
}else{
if(_68.nodeType===1){
_67=true;
var tg=_68.tagName?_68.tagName.toLowerCase():"";
if(/br|input|img|base|meta|area|basefont|hr|link/.test(tg)){
this.selection.selectElement(_68);
}else{
this.selection.selectElementChildren(_68);
}
break;
}
}
_68=_68.nextSibling;
}
}else{
_67=true;
this.selection.selectElementChildren(this.editNode);
}
if(_67){
this.selection.collapse(true);
}
},placeCursorAtEnd:function(){
this.focus();
var _69=false;
if(has("mozilla")){
var _6a=this.editNode.lastChild;
while(_6a){
if(_6a.nodeType===3){
if(_6a.nodeValue.replace(/^\s+|\s+$/g,"").length>0){
_69=true;
this.selection.selectElement(_6a);
break;
}
}else{
if(_6a.nodeType===1){
_69=true;
this.selection.selectElement(_6a.lastChild||_6a);
break;
}
}
_6a=_6a.previousSibling;
}
}else{
_69=true;
this.selection.selectElementChildren(this.editNode);
}
if(_69){
this.selection.collapse(false);
}
},getValue:function(_6b){
if(this.textarea){
if(this.isClosed||!this.isLoaded){
return this.textarea.value;
}
}
return this._postFilterContent(null,_6b);
},_getValueAttr:function(){
return this.getValue(true);
},setValue:function(_6c){
if(!this.isLoaded){
this.onLoadDeferred.then(_d.hitch(this,function(){
this.setValue(_6c);
}));
return;
}
this._cursorToStart=true;
if(this.textarea&&(this.isClosed||!this.isLoaded)){
this.textarea.value=_6c;
}else{
_6c=this._preFilterContent(_6c);
var _6d=this.isClosed?this.domNode:this.editNode;
if(_6c&&has("mozilla")&&_6c.toLowerCase()==="<p></p>"){
_6c="<p>&#160;</p>";
}
if(!_6c&&has("webkit")){
_6c="&#160;";
}
_6d.innerHTML=_6c;
this._preDomFilterContent(_6d);
}
this.onDisplayChanged();
this._set("value",this.getValue(true));
},replaceValue:function(_6e){
if(this.isClosed){
this.setValue(_6e);
}else{
if(this.window&&this.window.getSelection&&!has("mozilla")){
this.setValue(_6e);
}else{
if(this.window&&this.window.getSelection){
_6e=this._preFilterContent(_6e);
this.execCommand("selectall");
if(!_6e){
this._cursorToStart=true;
_6e="&#160;";
}
this.execCommand("inserthtml",_6e);
this._preDomFilterContent(this.editNode);
}else{
if(this.document&&this.document.selection){
this.setValue(_6e);
}
}
}
}
this._set("value",this.getValue(true));
},_preFilterContent:function(_6f){
var ec=_6f;
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
},_postFilterContent:function(dom,_70){
var ec;
if(!_d.isString(dom)){
dom=dom||this.editNode;
if(this.contentDomPostFilters.length){
if(_70){
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
var _71=_5.byId(_1a._scopeName+"._editor.RichText.value");
if(_71){
if(_71.value){
_71.value+=this._SEPARATOR;
}
_71.value+=this.name+this._NAME_CONTENT_SEP+this.getValue(true);
}
},escapeXml:function(str,_72){
str=str.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;").replace(/"/gm,"&quot;");
if(!_72){
str=str.replace(/'/gm,"&#39;");
}
return str;
},getNodeHtml:function(_73){
_b.deprecated("dijit.Editor::getNodeHtml is deprecated","use dijit/_editor/html::getNodeHtml instead",2);
return _18.getNodeHtml(_73);
},getNodeChildrenHtml:function(dom){
_b.deprecated("dijit.Editor::getNodeChildrenHtml is deprecated","use dijit/_editor/html::getChildrenHtml instead",2);
return _18.getChildrenHtml(dom);
},close:function(_74){
if(this.isClosed){
return;
}
if(!arguments.length){
_74=true;
}
if(_74){
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
},_removeMozBogus:function(_75){
return _75.replace(/\stype="_moz"/gi,"").replace(/\s_moz_dirty=""/gi,"").replace(/_moz_resizing="(true|false)"/gi,"");
},_removeWebkitBogus:function(_76){
_76=_76.replace(/\sclass="webkit-block-placeholder"/gi,"");
_76=_76.replace(/\sclass="apple-style-span"/gi,"");
_76=_76.replace(/<meta charset=\"utf-8\" \/>/gi,"");
return _76;
},_normalizeFontStyle:function(_77){
return _77.replace(/<(\/)?strong([ \>])/gi,"<$1b$2").replace(/<(\/)?em([ \>])/gi,"<$1i$2");
},_preFixUrlAttributes:function(_78){
return _78.replace(/(?:(<a(?=\s).*?\shref=)("|')(.*?)\2)|(?:(<a\s.*?href=)([^"'][^ >]+))/gi,"$1$4$2$3$5$2 _djrealurl=$2$3$5$2").replace(/(?:(<img(?=\s).*?\ssrc=)("|')(.*?)\2)|(?:(<img\s.*?src=)([^"'][^ >]+))/gi,"$1$4$2$3$5$2 _djrealurl=$2$3$5$2");
},_browserQueryCommandEnabled:function(_79){
if(!_79){
return false;
}
var _7a=has("ie")?this.document.selection.createRange():this.document;
try{
return _7a.queryCommandEnabled(_79);
}
catch(e){
return false;
}
},_createlinkEnabledImpl:function(){
var _7b=true;
if(has("opera")){
var sel=this.window.getSelection();
if(sel.isCollapsed){
_7b=true;
}else{
_7b=this.document.queryCommandEnabled("createlink");
}
}else{
_7b=this._browserQueryCommandEnabled("createlink");
}
return _7b;
},_unlinkEnabledImpl:function(){
var _7c=true;
if(has("mozilla")||has("webkit")){
_7c=this.selection.hasAncestorElement("a");
}else{
_7c=this._browserQueryCommandEnabled("unlink");
}
return _7c;
},_inserttableEnabledImpl:function(){
var _7d=true;
if(has("mozilla")||has("webkit")){
_7d=true;
}else{
_7d=this._browserQueryCommandEnabled("inserttable");
}
return _7d;
},_cutEnabledImpl:function(){
var _7e=true;
if(has("webkit")){
var sel=this.window.getSelection();
if(sel){
sel=sel.toString();
}
_7e=!!sel;
}else{
_7e=this._browserQueryCommandEnabled("cut");
}
return _7e;
},_copyEnabledImpl:function(){
var _7f=true;
if(has("webkit")){
var sel=this.window.getSelection();
if(sel){
sel=sel.toString();
}
_7f=!!sel;
}else{
_7f=this._browserQueryCommandEnabled("copy");
}
return _7f;
},_pasteEnabledImpl:function(){
var _80=true;
if(has("webkit")){
return true;
}else{
_80=this._browserQueryCommandEnabled("paste");
}
return _80;
},_inserthorizontalruleImpl:function(_81){
if(has("ie")){
return this._inserthtmlImpl("<hr>");
}
return this.document.execCommand("inserthorizontalrule",false,_81);
},_unlinkImpl:function(_82){
if((this.queryCommandEnabled("unlink"))&&(has("mozilla")||has("webkit"))){
var a=this.selection.getAncestorElement("a");
this.selection.selectElement(a);
return this.document.execCommand("unlink",false,null);
}
return this.document.execCommand("unlink",false,_82);
},_hilitecolorImpl:function(_83){
var _84;
var _85=this._handleTextColorOrProperties("hilitecolor",_83);
if(!_85){
if(has("mozilla")){
this.document.execCommand("styleWithCSS",false,true);
_84=this.document.execCommand("hilitecolor",false,_83);
this.document.execCommand("styleWithCSS",false,false);
}else{
_84=this.document.execCommand("hilitecolor",false,_83);
}
}
return _84;
},_backcolorImpl:function(_86){
if(has("ie")){
_86=_86?_86:null;
}
var _87=this._handleTextColorOrProperties("backcolor",_86);
if(!_87){
_87=this.document.execCommand("backcolor",false,_86);
}
return _87;
},_forecolorImpl:function(_88){
if(has("ie")){
_88=_88?_88:null;
}
var _89=false;
_89=this._handleTextColorOrProperties("forecolor",_88);
if(!_89){
_89=this.document.execCommand("forecolor",false,_88);
}
return _89;
},_inserthtmlImpl:function(_8a){
_8a=this._preFilterContent(_8a);
var rv=true;
if(has("ie")){
var _8b=this.document.selection.createRange();
if(this.document.selection.type.toUpperCase()==="CONTROL"){
var n=_8b.item(0);
while(_8b.length){
_8b.remove(_8b.item(0));
}
n.outerHTML=_8a;
}else{
_8b.pasteHTML(_8a);
}
_8b.select();
}else{
if(has("mozilla")&&!_8a.length){
this.selection.remove();
}else{
rv=this.document.execCommand("inserthtml",false,_8a);
}
}
return rv;
},_boldImpl:function(_8c){
var _8d=false;
if(has("ie")){
this._adaptIESelection();
_8d=this._adaptIEFormatAreaAndExec("bold");
}
if(!_8d){
_8d=this.document.execCommand("bold",false,_8c);
}
return _8d;
},_italicImpl:function(_8e){
var _8f=false;
if(has("ie")){
this._adaptIESelection();
_8f=this._adaptIEFormatAreaAndExec("italic");
}
if(!_8f){
_8f=this.document.execCommand("italic",false,_8e);
}
return _8f;
},_underlineImpl:function(_90){
var _91=false;
if(has("ie")){
this._adaptIESelection();
_91=this._adaptIEFormatAreaAndExec("underline");
}
if(!_91){
_91=this.document.execCommand("underline",false,_90);
}
return _91;
},_strikethroughImpl:function(_92){
var _93=false;
if(has("ie")){
this._adaptIESelection();
_93=this._adaptIEFormatAreaAndExec("strikethrough");
}
if(!_93){
_93=this.document.execCommand("strikethrough",false,_92);
}
return _93;
},_superscriptImpl:function(_94){
var _95=false;
if(has("ie")){
this._adaptIESelection();
_95=this._adaptIEFormatAreaAndExec("superscript");
}
if(!_95){
_95=this.document.execCommand("superscript",false,_94);
}
return _95;
},_subscriptImpl:function(_96){
var _97=false;
if(has("ie")){
this._adaptIESelection();
_97=this._adaptIEFormatAreaAndExec("subscript");
}
if(!_97){
_97=this.document.execCommand("subscript",false,_96);
}
return _97;
},_fontnameImpl:function(_98){
var _99;
if(has("ie")){
_99=this._handleTextColorOrProperties("fontname",_98);
}
if(!_99){
_99=this.document.execCommand("fontname",false,_98);
}
return _99;
},_fontsizeImpl:function(_9a){
var _9b;
if(has("ie")){
_9b=this._handleTextColorOrProperties("fontsize",_9a);
}
if(!_9b){
_9b=this.document.execCommand("fontsize",false,_9a);
}
return _9b;
},_insertorderedlistImpl:function(_9c){
var _9d=false;
if(has("ie")){
_9d=this._adaptIEList("insertorderedlist",_9c);
}
if(!_9d){
_9d=this.document.execCommand("insertorderedlist",false,_9c);
}
return _9d;
},_insertunorderedlistImpl:function(_9e){
var _9f=false;
if(has("ie")){
_9f=this._adaptIEList("insertunorderedlist",_9e);
}
if(!_9f){
_9f=this.document.execCommand("insertunorderedlist",false,_9e);
}
return _9f;
},getHeaderHeight:function(){
return this._getNodeChildrenHeight(this.header);
},getFooterHeight:function(){
return this._getNodeChildrenHeight(this.footer);
},_getNodeChildrenHeight:function(_a0){
var h=0;
if(_a0&&_a0.childNodes){
var i;
for(i=0;i<_a0.childNodes.length;i++){
var _a1=_9.position(_a0.childNodes[i]);
h+=_a1.h;
}
}
return h;
},_isNodeEmpty:function(_a2,_a3){
if(_a2.nodeType===1){
if(_a2.childNodes.length>0){
return this._isNodeEmpty(_a2.childNodes[0],_a3);
}
return true;
}else{
if(_a2.nodeType===3){
return (_a2.nodeValue.substring(_a3)==="");
}
}
return false;
},_removeStartingRangeFromRange:function(_a4,_a5){
if(_a4.nextSibling){
_a5.setStart(_a4.nextSibling,0);
}else{
var _a6=_a4.parentNode;
while(_a6&&_a6.nextSibling==null){
_a6=_a6.parentNode;
}
if(_a6){
_a5.setStart(_a6.nextSibling,0);
}
}
return _a5;
},_adaptIESelection:function(){
var _a7=_17.getSelection(this.window);
if(_a7&&_a7.rangeCount&&!_a7.isCollapsed){
var _a8=_a7.getRangeAt(0);
var _a9=_a8.startContainer;
var _aa=_a8.startOffset;
while(_a9.nodeType===3&&_aa>=_a9.length&&_a9.nextSibling){
_aa=_aa-_a9.length;
_a9=_a9.nextSibling;
}
var _ab=null;
while(this._isNodeEmpty(_a9,_aa)&&_a9!==_ab){
_ab=_a9;
_a8=this._removeStartingRangeFromRange(_a9,_a8);
_a9=_a8.startContainer;
_aa=0;
}
_a7.removeAllRanges();
_a7.addRange(_a8);
}
},_adaptIEFormatAreaAndExec:function(_ac){
var _ad=_17.getSelection(this.window);
var doc=this.document;
var rs,ret,_ae,txt,_af,_b0,_b1,_b2;
if(_ac&&_ad&&_ad.isCollapsed){
var _b3=this.queryCommandValue(_ac);
if(_b3){
var _b4=this._tagNamesForCommand(_ac);
_ae=_ad.getRangeAt(0);
var fs=_ae.startContainer;
if(fs.nodeType===3){
var _b5=_ae.endOffset;
if(fs.length<_b5){
ret=this._adjustNodeAndOffset(rs,_b5);
fs=ret.node;
_b5=ret.offset;
}
}
var _b6;
while(fs&&fs!==this.editNode){
var _b7=fs.tagName?fs.tagName.toLowerCase():"";
if(_1.indexOf(_b4,_b7)>-1){
_b6=fs;
break;
}
fs=fs.parentNode;
}
if(_b6){
rs=_ae.startContainer;
var _b8=doc.createElement(_b6.tagName);
_8.place(_b8,_b6,"after");
if(rs&&rs.nodeType===3){
var _b9,_ba;
var _bb=_ae.endOffset;
if(rs.length<_bb){
ret=this._adjustNodeAndOffset(rs,_bb);
rs=ret.node;
_bb=ret.offset;
}
txt=rs.nodeValue;
_af=doc.createTextNode(txt.substring(0,_bb));
var _bc=txt.substring(_bb,txt.length);
if(_bc){
_b0=doc.createTextNode(_bc);
}
_8.place(_af,rs,"before");
if(_b0){
_b1=doc.createElement("span");
_b1.className="ieFormatBreakerSpan";
_8.place(_b1,rs,"after");
_8.place(_b0,_b1,"after");
_b0=_b1;
}
_8.destroy(rs);
var _bd=_af.parentNode;
var _be=[];
var _bf;
while(_bd!==_b6){
var tg=_bd.tagName;
_bf={tagName:tg};
_be.push(_bf);
var _c0=doc.createElement(tg);
if(_bd.style){
if(_c0.style){
if(_bd.style.cssText){
_c0.style.cssText=_bd.style.cssText;
_bf.cssText=_bd.style.cssText;
}
}
}
if(_bd.tagName==="FONT"){
if(_bd.color){
_c0.color=_bd.color;
_bf.color=_bd.color;
}
if(_bd.face){
_c0.face=_bd.face;
_bf.face=_bd.face;
}
if(_bd.size){
_c0.size=_bd.size;
_bf.size=_bd.size;
}
}
if(_bd.className){
_c0.className=_bd.className;
_bf.className=_bd.className;
}
if(_b0){
_b9=_b0;
while(_b9){
_ba=_b9.nextSibling;
_c0.appendChild(_b9);
_b9=_ba;
}
}
if(_c0.tagName==_bd.tagName){
_b1=doc.createElement("span");
_b1.className="ieFormatBreakerSpan";
_8.place(_b1,_bd,"after");
_8.place(_c0,_b1,"after");
}else{
_8.place(_c0,_bd,"after");
}
_af=_bd;
_b0=_c0;
_bd=_bd.parentNode;
}
if(_b0){
_b9=_b0;
if(_b9.nodeType===1||(_b9.nodeType===3&&_b9.nodeValue)){
_b8.innerHTML="";
}
while(_b9){
_ba=_b9.nextSibling;
_b8.appendChild(_b9);
_b9=_ba;
}
}
var _c1;
if(_be.length){
_bf=_be.pop();
var _c2=doc.createElement(_bf.tagName);
if(_bf.cssText&&_c2.style){
_c2.style.cssText=_bf.cssText;
}
if(_bf.className){
_c2.className=_bf.className;
}
if(_bf.tagName==="FONT"){
if(_bf.color){
_c2.color=_bf.color;
}
if(_bf.face){
_c2.face=_bf.face;
}
if(_bf.size){
_c2.size=_bf.size;
}
}
_8.place(_c2,_b8,"before");
while(_be.length){
_bf=_be.pop();
var _c3=doc.createElement(_bf.tagName);
if(_bf.cssText&&_c3.style){
_c3.style.cssText=_bf.cssText;
}
if(_bf.className){
_c3.className=_bf.className;
}
if(_bf.tagName==="FONT"){
if(_bf.color){
_c3.color=_bf.color;
}
if(_bf.face){
_c3.face=_bf.face;
}
if(_bf.size){
_c3.size=_bf.size;
}
}
_c2.appendChild(_c3);
_c2=_c3;
}
_b2=doc.createTextNode(".");
_b1.appendChild(_b2);
_c2.appendChild(_b2);
_c1=_17.create(this.window);
_c1.setStart(_b2,0);
_c1.setEnd(_b2,_b2.length);
_ad.removeAllRanges();
_ad.addRange(_c1);
this.selection.collapse(false);
_b2.parentNode.innerHTML="";
}else{
_b1=doc.createElement("span");
_b1.className="ieFormatBreakerSpan";
_b2=doc.createTextNode(".");
_b1.appendChild(_b2);
_8.place(_b1,_b8,"before");
_c1=_17.create(this.window);
_c1.setStart(_b2,0);
_c1.setEnd(_b2,_b2.length);
_ad.removeAllRanges();
_ad.addRange(_c1);
this.selection.collapse(false);
_b2.parentNode.innerHTML="";
}
if(!_b8.firstChild){
_8.destroy(_b8);
}
return true;
}
}
return false;
}else{
_ae=_ad.getRangeAt(0);
rs=_ae.startContainer;
if(rs&&rs.nodeType===3){
var _b5=_ae.startOffset;
if(rs.length<_b5){
ret=this._adjustNodeAndOffset(rs,_b5);
rs=ret.node;
_b5=ret.offset;
}
txt=rs.nodeValue;
_af=doc.createTextNode(txt.substring(0,_b5));
var _bc=txt.substring(_b5);
if(_bc!==""){
_b0=doc.createTextNode(txt.substring(_b5));
}
_b1=doc.createElement("span");
_b2=doc.createTextNode(".");
_b1.appendChild(_b2);
if(_af.length){
_8.place(_af,rs,"after");
}else{
_af=rs;
}
_8.place(_b1,_af,"after");
if(_b0){
_8.place(_b0,_b1,"after");
}
_8.destroy(rs);
var _c1=_17.create(this.window);
_c1.setStart(_b2,0);
_c1.setEnd(_b2,_b2.length);
_ad.removeAllRanges();
_ad.addRange(_c1);
doc.execCommand(_ac);
_8.place(_b1.firstChild,_b1,"before");
_8.destroy(_b1);
_c1.setStart(_b2,0);
_c1.setEnd(_b2,_b2.length);
_ad.removeAllRanges();
_ad.addRange(_c1);
this.selection.collapse(false);
_b2.parentNode.innerHTML="";
return true;
}
}
}else{
return false;
}
},_adaptIEList:function(_c4){
var _c5=_17.getSelection(this.window);
if(_c5.isCollapsed){
if(_c5.rangeCount&&!this.queryCommandValue(_c4)){
var _c6=_c5.getRangeAt(0);
var sc=_c6.startContainer;
if(sc&&sc.nodeType==3){
if(!_c6.startOffset){
var _c7="ul";
if(_c4==="insertorderedlist"){
_c7="ol";
}
var _c8=this.document.createElement(_c7);
var li=_8.create("li",null,_c8);
_8.place(_c8,sc,"before");
li.appendChild(sc);
_8.create("br",null,_c8,"after");
var _c9=_17.create(this.window);
_c9.setStart(sc,0);
_c9.setEnd(sc,sc.length);
_c5.removeAllRanges();
_c5.addRange(_c9);
this.selection.collapse(true);
return true;
}
}
}
}
return false;
},_handleTextColorOrProperties:function(_ca,_cb){
var _cc=_17.getSelection(this.window);
var doc=this.document;
var rs,ret,_cd,txt,_ce,_cf,_d0,_d1;
_cb=_cb||null;
if(_ca&&_cc&&_cc.isCollapsed){
if(_cc.rangeCount){
_cd=_cc.getRangeAt(0);
rs=_cd.startContainer;
if(rs&&rs.nodeType===3){
var _d2=_cd.startOffset;
if(rs.length<_d2){
ret=this._adjustNodeAndOffset(rs,_d2);
rs=ret.node;
_d2=ret.offset;
}
txt=rs.nodeValue;
_ce=doc.createTextNode(txt.substring(0,_d2));
var _d3=txt.substring(_d2);
if(_d3!==""){
_cf=doc.createTextNode(txt.substring(_d2));
}
_d0=doc.createElement("span");
_d1=doc.createTextNode(".");
_d0.appendChild(_d1);
var _d4=doc.createElement("span");
_d0.appendChild(_d4);
if(_ce.length){
_8.place(_ce,rs,"after");
}else{
_ce=rs;
}
_8.place(_d0,_ce,"after");
if(_cf){
_8.place(_cf,_d0,"after");
}
_8.destroy(rs);
var _d5=_17.create(this.window);
_d5.setStart(_d1,0);
_d5.setEnd(_d1,_d1.length);
_cc.removeAllRanges();
_cc.addRange(_d5);
if(has("webkit")){
var _d6="color";
if(_ca==="hilitecolor"||_ca==="backcolor"){
_d6="backgroundColor";
}
_a.set(_d0,_d6,_cb);
this.selection.remove();
_8.destroy(_d4);
_d0.innerHTML="&#160;";
this.selection.selectElement(_d0);
this.focus();
}else{
this.execCommand(_ca,_cb);
_8.place(_d0.firstChild,_d0,"before");
_8.destroy(_d0);
_d5.setStart(_d1,0);
_d5.setEnd(_d1,_d1.length);
_cc.removeAllRanges();
_cc.addRange(_d5);
this.selection.collapse(false);
_d1.parentNode.removeChild(_d1);
}
return true;
}
}
}
return false;
},_adjustNodeAndOffset:function(_d7,_d8){
while(_d7.length<_d8&&_d7.nextSibling&&_d7.nextSibling.nodeType===3){
_d8=_d8-_d7.length;
_d7=_d7.nextSibling;
}
return {"node":_d7,"offset":_d8};
},_tagNamesForCommand:function(_d9){
if(_d9==="bold"){
return ["b","strong"];
}else{
if(_d9==="italic"){
return ["i","em"];
}else{
if(_d9==="strikethrough"){
return ["s","strike"];
}else{
if(_d9==="superscript"){
return ["sup"];
}else{
if(_d9==="subscript"){
return ["sub"];
}else{
if(_d9==="underline"){
return ["u"];
}
}
}
}
}
}
return [];
},_stripBreakerNodes:function(_da){
if(!this.isLoaded){
return;
}
_e(".ieFormatBreakerSpan",_da).forEach(function(b){
while(b.firstChild){
_8.place(b.firstChild,b,"before");
}
_8.destroy(b);
});
return _da;
}});
return _1b;
});
