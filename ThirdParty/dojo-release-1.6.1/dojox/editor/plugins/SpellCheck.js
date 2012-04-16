/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.SpellCheck"]){
dojo._hasResource["dojox.editor.plugins.SpellCheck"]=true;
dojo.provide("dojox.editor.plugins.SpellCheck");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.MultiSelect");
dojo.require("dojo.io.script");
dojo.require("dijit.Menu");
dojo.requireLocalization("dojox.editor.plugins","SpellCheck",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins.SpellCheck");
dojo.declare("dojox.editor.plugins._spellCheckControl",[dijit._Widget,dijit._Templated],{widgetsInTemplate:true,templateString:"<table class='dijitEditorSpellCheckTable'>"+"<tr><td colspan='3' class='alignBottom'><label for='${textId}' id='${textId}_label'>${unfound}</label>"+"<div class='dijitEditorSpellCheckBusyIcon' id='${id}_progressIcon'></div></td></tr>"+"<tr>"+"<td class='dijitEditorSpellCheckBox'><input dojoType='dijit.form.TextBox' required='false' intermediateChanges='true' "+"class='dijitEditorSpellCheckBox' dojoAttachPoint='unfoundTextBox' id='${textId}'/></td>"+"<td><button dojoType='dijit.form.Button' class='blockButton' dojoAttachPoint='skipButton'>${skip}</button></td>"+"<td><button dojoType='dijit.form.Button' class='blockButton' dojoAttachPoint='skipAllButton'>${skipAll}</button></td>"+"</tr>"+"<tr>"+"<td class='alignBottom'><label for='${selectId}'>${suggestions}</td></label>"+"<td colspan='2'><button dojoType='dijit.form.Button' class='blockButton' dojoAttachPoint='toDicButton'>${toDic}</button></td>"+"</tr>"+"<tr>"+"<td>"+"<select dojoType='dijit.form.MultiSelect' id='${selectId}' "+"class='dijitEditorSpellCheckBox listHeight' dojoAttachPoint='suggestionSelect'></select>"+"</td>"+"<td colspan='2'>"+"<button dojoType='dijit.form.Button' class='blockButton' dojoAttachPoint='replaceButton'>${replace}</button>"+"<div class='topMargin'><button dojoType='dijit.form.Button' class='blockButton' "+"dojoAttachPoint='replaceAllButton'>${replaceAll}</button><div>"+"</td>"+"</tr>"+"<tr>"+"<td><div class='topMargin'><button dojoType='dijit.form.Button' dojoAttachPoint='cancelButton'>${cancel}</button></div></td>"+"<td></td>"+"<td></td>"+"</tr>"+"</table>",constructor:function(){
this.ignoreChange=false;
this.isChanged=false;
this.isOpen=false;
this.closable=true;
},postMixInProperties:function(){
this.id=dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
this.textId=this.id+"_textBox";
this.selectId=this.id+"_select";
},postCreate:function(){
var _1=this.suggestionSelect;
dojo.removeAttr(_1.domNode,"multiple");
_1.addItems=function(_2){
var _3=this;
var o=null;
if(_2&&_2.length>0){
dojo.forEach(_2,function(_4,i){
o=dojo.create("option",{innerHTML:_4,value:_4},_3.domNode);
if(i==0){
o.selected=true;
}
});
}
};
_1.removeItems=function(){
dojo.empty(this.domNode);
};
_1.deselectAll=function(){
this.containerNode.selectedIndex=-1;
};
this.connect(this,"onKeyPress","_cancel");
this.connect(this.unfoundTextBox,"onKeyPress","_enter");
this.connect(this.unfoundTextBox,"onChange","_unfoundTextBoxChange");
this.connect(this.suggestionSelect,"onKeyPress","_enter");
this.connect(this.skipButton,"onClick","onSkip");
this.connect(this.skipAllButton,"onClick","onSkipAll");
this.connect(this.toDicButton,"onClick","onAddToDic");
this.connect(this.replaceButton,"onClick","onReplace");
this.connect(this.replaceAllButton,"onClick","onReplaceAll");
this.connect(this.cancelButton,"onClick","onCancel");
},onSkip:function(){
},onSkipAll:function(){
},onAddToDic:function(){
},onReplace:function(){
},onReplaceAll:function(){
},onCancel:function(){
},onEnter:function(){
},focus:function(){
this.unfoundTextBox.focus();
},_cancel:function(_5){
if(_5.keyCode==dojo.keys.ESCAPE){
this.onCancel();
dojo.stopEvent(_5);
}
},_enter:function(_6){
if(_6.keyCode==dojo.keys.ENTER){
this.onEnter();
dojo.stopEvent(_6);
}
},_unfoundTextBoxChange:function(){
var id=this.textId+"_label";
if(!this.ignoreChange){
dojo.byId(id).innerHTML=this["replaceWith"];
this.isChanged=true;
this.suggestionSelect.deselectAll();
}else{
dojo.byId(id).innerHTML=this["unfound"];
}
},_setUnfoundWordAttr:function(_7){
_7=_7||"";
this.unfoundTextBox.set("value",_7);
},_getUnfoundWordAttr:function(){
return this.unfoundTextBox.get("value");
},_setSuggestionListAttr:function(_8){
var _9=this.suggestionSelect;
_8=_8||[];
_9.removeItems();
_9.addItems(_8);
},_getSelectedWordAttr:function(){
var _a=this.suggestionSelect.getSelected();
if(_a&&_a.length>0){
return _a[0].value;
}else{
return this.unfoundTextBox.get("value");
}
},_setDisabledAttr:function(_b){
this.skipButton.set("disabled",_b);
this.skipAllButton.set("disabled",_b);
this.toDicButton.set("disabled",_b);
this.replaceButton.set("disabled",_b);
this.replaceAllButton.set("disabled",_b);
},_setInProgressAttr:function(_c){
var id=this.id+"_progressIcon",_d=_c?"removeClass":"addClass";
dojo[_d](id,"hidden");
}});
dojo.declare("dojox.editor.plugins._SpellCheckScriptMultiPart",null,{ACTION_QUERY:"query",ACTION_UPDATE:"update",callbackHandle:"callback",maxBufferLength:100,delimiter:" ",label:"response",_timeout:30000,SEC:1000,constructor:function(){
this.serviceEndPoint="";
this._queue=[];
this.isWorking=false;
this.exArgs=null;
this._counter=0;
},send:function(_e,_f){
var _10=this,dt=this.delimiter,mbl=this.maxBufferLength,_11=this.label,_12=this.serviceEndPoint,_13=this.callbackHandle,_14=this.exArgs,_15=this._timeout,l=0,r=0;
if(!this._result){
this._result=[];
}
_f=_f||this.ACTION_QUERY;
var _16=function(){
var _17=[];
var _18=0;
if(_e&&_e.length>0){
_10.isWorking=true;
var len=_e.length;
do{
l=r+1;
if((r+=mbl)>len){
r=len;
}else{
while(dt&&_e.charAt(r)!=dt&&r<=len){
r++;
}
}
_17.push({l:l,r:r});
_18++;
}while(r<len);
dojo.forEach(_17,function(_19,_1a){
var _1b={url:_12,action:_f,timeout:_15,callbackParamName:_13,handle:function(_1c,_1d){
if(++_10._counter<=this.size&&!(_1c instanceof Error)&&_1c[_11]&&dojo.isArray(_1c[_11])){
var _1e=this.offset;
dojo.forEach(_1c[_11],function(_1f){
_1f.offset+=_1e;
});
_10._result[this.number]=_1c[_11];
}
if(_10._counter==this.size){
_10._finalizeCollection(this.action);
_10.isWorking=false;
if(_10._queue.length>0){
(_10._queue.shift())();
}
}
}};
_1b.content=_14?dojo.mixin(_14,{action:_f,content:_e.substring(_19.l-1,_19.r)}):{action:_f,content:_e.substring(_19.l-1,_19.r)};
_1b.size=_18;
_1b.number=_1a;
_1b.offset=_19.l-1;
dojo.io.script.get(_1b);
});
}
};
if(!_10.isWorking){
_16();
}else{
_10._queue.push(_16);
}
},_finalizeCollection:function(_20){
var _21=this._result,len=_21.length;
for(var i=0;i<len;i++){
var _22=_21.shift();
_21=_21.concat(_22);
}
if(_20==this.ACTION_QUERY){
this.onLoad(_21);
}
this._counter=0;
this._result=[];
},onLoad:function(_23){
},setWaitingTime:function(_24){
this._timeout=_24*this.SEC;
}});
dojo.declare("dojox.editor.plugins.SpellCheck",[dijit._editor._Plugin],{url:"",bufferLength:100,interactive:false,timeout:30,button:null,_editor:null,exArgs:null,_cursorSpan:"<span class=\"cursorPlaceHolder\"></span>",_cursorSelector:"cursorPlaceHolder",_incorrectWordsSpan:"<span class='incorrectWordPlaceHolder'>${text}</span>",_ignoredIncorrectStyle:{"cursor":"inherit","borderBottom":"none","backgroundColor":"transparent"},_normalIncorrectStyle:{"cursor":"pointer","borderBottom":"1px dotted red","backgroundColor":"yellow"},_highlightedIncorrectStyle:{"borderBottom":"1px dotted red","backgroundColor":"#b3b3ff"},_selector:"incorrectWordPlaceHolder",_maxItemNumber:3,constructor:function(){
this._spanList=[];
this._cache={};
this._enabled=true;
this._iterator=0;
},setEditor:function(_25){
this._editor=_25;
this._initButton();
this._setNetwork();
this._connectUp();
},_initButton:function(){
var _26=this,_27=this._strings=dojo.i18n.getLocalization("dojox.editor.plugins","SpellCheck"),_28=this._dialog=new dijit.TooltipDialog();
_28.set("content",(this._dialogContent=new dojox.editor.plugins._spellCheckControl({unfound:_27["unfound"],skip:_27["skip"],skipAll:_27["skipAll"],toDic:_27["toDic"],suggestions:_27["suggestions"],replaceWith:_27["replaceWith"],replace:_27["replace"],replaceAll:_27["replaceAll"],cancel:_27["cancel"]})));
this.button=new dijit.form.DropDownButton({label:_27["widgetLabel"],showLabel:false,iconClass:"dijitEditorSpellCheckIcon",dropDown:_28,id:dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"))+"_dialogPane",closeDropDown:function(_29){
if(_26._dialogContent.closable){
_26._dialogContent.isOpen=false;
if(dojo.isIE){
var pos=_26._iterator,_2a=_26._spanList;
if(pos<_2a.length&&pos>=0){
dojo.style(_2a[pos],_26._normalIncorrectStyle);
}
}
if(this._opened){
dijit.popup.close(this.dropDown);
if(_29){
this.focus();
}
this._opened=false;
this.state="";
}
}
}});
_26._dialogContent.isOpen=false;
dijit.setWaiState(_28.domNode,"label",this._strings["widgetLabel"]);
},_setNetwork:function(){
var _2b=this.exArgs;
if(!this._service){
var _2c=this._service=new dojox.editor.plugins._SpellCheckScriptMultiPart();
_2c.serviceEndPoint=this.url;
_2c.maxBufferLength=this.bufferLength;
_2c.setWaitingTime(this.timeout);
if(_2b){
delete _2b.name;
delete _2b.url;
delete _2b.interactive;
delete _2b.timeout;
_2c.exArgs=_2b;
}
}
},_connectUp:function(){
var _2d=this._editor,_2e=this._dialogContent;
this.connect(this.button,"set","_disabled");
this.connect(this._service,"onLoad","_loadData");
this.connect(this._dialog,"onOpen","_openDialog");
this.connect(_2d,"onKeyPress","_keyPress");
this.connect(_2d,"onLoad","_submitContent");
this.connect(_2e,"onSkip","_skip");
this.connect(_2e,"onSkipAll","_skipAll");
this.connect(_2e,"onAddToDic","_add");
this.connect(_2e,"onReplace","_replace");
this.connect(_2e,"onReplaceAll","_replaceAll");
this.connect(_2e,"onCancel","_cancel");
this.connect(_2e,"onEnter","_enter");
_2d.contentPostFilters.push(this._spellCheckFilter);
dojo.publish(dijit._scopeName+".Editor.plugin.SpellCheck.getParser",[this]);
if(!this.parser){
console.error("Can not get the word parser!");
}
},_disabled:function(_2f,_30){
if(_2f=="disabled"){
if(_30){
this._iterator=0;
this._spanList=[];
}else{
if(this.interactive&&!_30&&this._service){
this._submitContent(true);
}
}
this._enabled=!_30;
}
},_keyPress:function(evt){
if(this.interactive){
var v=118,V=86,cc=evt.charCode;
if(!evt.altKey&&cc==dojo.keys.SPACE){
this._submitContent();
}else{
if((evt.ctrlKey&&(cc==v||cc==V))||(!evt.ctrlKey&&evt.charCode)){
this._submitContent(true);
}
}
}
},_loadData:function(_31){
var _32=this._cache,_33=this._editor.get("value"),_34=this._dialogContent;
this._iterator=0;
dojo.forEach(_31,function(d){
_32[d.text]=d.suggestion;
_32[d.text].correct=false;
});
if(this._enabled){
_34.closable=false;
this._markIncorrectWords(_33,_32);
_34.closable=true;
if(this._dialogContent.isOpen){
this._iterator=-1;
this._skip();
}
}
},_openDialog:function(){
var _35=this._dialogContent;
_35.ignoreChange=true;
_35.set("unfoundWord","");
_35.set("suggestionList",null);
_35.set("disabled",true);
_35.set("inProgress",true);
_35.isOpen=true;
_35.closable=false;
this._submitContent();
_35.closable=true;
},_skip:function(evt,_36){
var _37=this._dialogContent,_38=this._spanList||[],len=_38.length,_39=this._iterator;
_37.closable=false;
_37.isChanged=false;
_37.ignoreChange=true;
if(!_36&&_39>=0&&_39<len){
this._skipWord(_39);
}
while(++_39<len&&_38[_39].edited==true){
}
if(_39<len){
this._iterator=_39;
this._populateDialog(_39);
this._selectWord(_39);
}else{
this._iterator=-1;
_37.set("unfoundWord",this._strings["msg"]);
_37.set("suggestionList",null);
_37.set("disabled",true);
_37.set("inProgress",false);
}
setTimeout(function(){
if(dojo.isWebKit){
_37.skipButton.focus();
}
_37.focus();
_37.ignoreChange=false;
_37.closable=true;
},0);
},_skipAll:function(){
this._dialogContent.closable=false;
this._skipWordAll(this._iterator);
this._skip();
},_add:function(){
var _3a=this._dialogContent;
_3a.closable=false;
_3a.isOpen=true;
this._addWord(this._iterator,_3a.get("unfoundWord"));
this._skip();
},_replace:function(){
var _3b=this._dialogContent,_3c=this._iterator,_3d=_3b.get("selectedWord");
_3b.closable=false;
this._replaceWord(_3c,_3d);
this._skip(null,true);
},_replaceAll:function(){
var _3e=this._dialogContent,_3f=this._spanList,len=_3f.length,_40=_3f[this._iterator].innerHTML.toLowerCase(),_41=_3e.get("selectedWord");
_3e.closable=false;
for(var _42=0;_42<len;_42++){
if(_3f[_42].innerHTML.toLowerCase()==_40){
this._replaceWord(_42,_41);
}
}
this._skip(null,true);
},_cancel:function(){
this._dialogContent.closable=true;
this._editor.focus();
},_enter:function(){
if(this._dialogContent.isChanged){
this._replace();
}else{
this._skip();
}
},_query:function(_43){
var _44=this._service,_45=this._cache,_46=this.parser.parseIntoWords(this._html2Text(_43))||[];
var _47=[];
dojo.forEach(_46,function(_48){
_48=_48.toLowerCase();
if(!_45[_48]){
_45[_48]=[];
_45[_48].correct=true;
_47.push(_48);
}
});
if(_47.length>0){
_44.send(_47.join(" "));
}else{
if(!_44.isWorking){
this._loadData([]);
}
}
},_html2Text:function(_49){
var _4a=[],_4b=false,len=_49?_49.length:0;
for(var i=0;i<len;i++){
if(_49.charAt(i)=="<"){
_4b=true;
}
if(_4b==true){
_4a.push(" ");
}else{
_4a.push(_49.charAt(i));
}
if(_49.charAt(i)==">"){
_4b=false;
}
}
return _4a.join("");
},_getBookmark:function(_4c){
var ed=this._editor,cp=this._cursorSpan;
ed.execCommand("inserthtml",cp);
var nv=ed.get("value"),_4d=nv.indexOf(cp),i=-1;
while(++i<_4d&&_4c.charAt(i)==nv.charAt(i)){
}
return i;
},_moveToBookmark:function(){
var ed=this._editor,cps=dojo.withGlobal(ed.window,"query",dojo,["."+this._cursorSelector]),_4e=cps&&cps[0];
if(_4e){
ed._sCall("selectElement",[_4e]);
ed._sCall("collapse",[true]);
var _4f=_4e.parentNode;
if(_4f){
_4f.removeChild(_4e);
}
}
},_submitContent:function(_50){
if(_50){
var _51=this,_52=3000;
if(this._delayHandler){
clearTimeout(this._delayHandler);
this._delayHandler=null;
}
setTimeout(function(){
_51._query(_51._editor.get("value"));
},_52);
}else{
this._query(this._editor.get("value"));
}
},_populateDialog:function(_53){
var _54=this._spanList,_55=this._cache,_56=this._dialogContent;
_56.set("disabled",false);
if(_53<_54.length&&_54.length>0){
var _57=_54[_53].innerHTML;
_56.set("unfoundWord",_57);
_56.set("suggestionList",_55[_57.toLowerCase()]);
_56.set("inProgress",false);
}
},_markIncorrectWords:function(_58,_59){
var _5a=this,_5b=this.parser,_5c=this._editor,_5d=this._incorrectWordsSpan,_5e=this._normalIncorrectStyle,_5f=this._selector,_60=_5b.parseIntoWords(this._html2Text(_58).toLowerCase()),_61=_5b.getIndices(),_62=this._cursorSpan,_63=this._getBookmark(_58),_64="<span class='incorrectWordPlaceHolder'>".length,_65=false,_66=_58.split(""),_67=null;
for(var i=_60.length-1;i>=0;i--){
var _68=_60[i];
if(_59[_68]&&!_59[_68].correct){
var _69=_61[i],len=_60[i].length,end=_69+len;
if(end<=_63&&!_65){
_66.splice(_63,0,_62);
_65=true;
}
_66.splice(_69,len,dojo.string.substitute(_5d,{text:_58.substring(_69,end)}));
if(_69<_63&&_63<end&&!_65){
var tmp=_66[_69].split("");
tmp.splice(_64+_63-_69,0,_62);
_66[_69]=tmp.join("");
_65=true;
}
}
}
if(!_65){
_66.splice(_63,0,_62);
_65=true;
}
_5c.set("value",_66.join(""));
_5c._cursorToStart=false;
this._moveToBookmark();
_67=this._spanList=dojo.withGlobal(_5c.window,"query",dojo,["."+this._selector]);
dojo.forEach(_67,function(_6a,i){
_6a.id=_5f+i;
});
if(!this.interactive){
delete _5e.cursor;
}
_67.style(_5e);
if(this.interactive){
if(_5a._contextMenu){
_5a._contextMenu.uninitialize();
_5a._contextMenu=null;
}
_5a._contextMenu=new dijit.Menu({targetNodeIds:[_5c.iframe],bindDomNode:function(_6b){
_6b=dojo.byId(_6b);
var cn;
var _6c,win;
if(_6b.tagName.toLowerCase()=="iframe"){
_6c=_6b;
win=this._iframeContentWindow(_6c);
cn=dojo.withGlobal(win,dojo.body);
}else{
cn=(_6b==dojo.body()?dojo.doc.documentElement:_6b);
}
var _6d={node:_6b,iframe:_6c};
dojo.attr(_6b,"_dijitMenu"+this.id,this._bindings.push(_6d));
var _6e=dojo.hitch(this,function(cn){
return [dojo.connect(cn,this.leftClickToOpen?"onclick":"oncontextmenu",this,function(evt){
var _6f=evt.target,_70=_5a._strings;
if(dojo.hasClass(_6f,_5f)&&!_6f.edited){
dojo.stopEvent(evt);
var _71=_5a._maxItemNumber,id=_6f.id,_72=id.substring(_5f.length),_73=_59[_6f.innerHTML.toLowerCase()],_74=_73.length;
this.destroyDescendants();
if(_74==0){
this.addChild(new dijit.MenuItem({label:_70["iMsg"],disabled:true}));
}else{
for(var i=0;i<_71&&i<_74;i++){
this.addChild(new dijit.MenuItem({label:_73[i],onClick:(function(){
var idx=_72,txt=_73[i];
return function(){
_5a._replaceWord(idx,txt);
_5c.focus();
};
})()}));
}
}
this.addChild(new dijit.MenuSeparator());
this.addChild(new dijit.MenuItem({label:_70["iSkip"],onClick:function(){
_5a._skipWord(_72);
_5c.focus();
}}));
this.addChild(new dijit.MenuItem({label:_70["iSkipAll"],onClick:function(){
_5a._skipWordAll(_72);
_5c.focus();
}}));
this.addChild(new dijit.MenuSeparator());
this.addChild(new dijit.MenuItem({label:_70["toDic"],onClick:function(){
_5a._addWord(_72);
_5c.focus();
}}));
this._scheduleOpen(_6f,_6c,{x:evt.pageX,y:evt.pageY});
}
}),dojo.connect(cn,"onkeydown",this,function(evt){
if(evt.shiftKey&&evt.keyCode==dojo.keys.F10){
dojo.stopEvent(evt);
this._scheduleOpen(evt.target,_6c);
}
})];
});
_6d.connects=cn?_6e(cn):[];
if(_6c){
_6d.onloadHandler=dojo.hitch(this,function(){
var win=this._iframeContentWindow(_6c);
cn=dojo.withGlobal(win,dojo.body);
_6d.connects=_6e(cn);
});
if(_6c.addEventListener){
_6c.addEventListener("load",_6d.onloadHandler,false);
}else{
_6c.attachEvent("onload",_6d.onloadHandler);
}
}
}});
}
},_selectWord:function(_75){
var _76=this._spanList,win=this._editor.window;
if(_75<_76.length&&_76.length>0){
dojo.withGlobal(win,"selectElement",dijit._editor.selection,[_76[_75]]);
dojo.withGlobal(win,"collapse",dijit._editor.selection,[true]);
this._findText(_76[_75].innerHTML,false,false);
if(dojo.isIE){
dojo.style(_76[_75],this._highlightedIncorrectStyle);
}
}
},_replaceWord:function(_77,_78){
var _79=this._spanList;
_79[_77].innerHTML=_78;
dojo.style(_79[_77],this._ignoredIncorrectStyle);
_79[_77].edited=true;
},_skipWord:function(_7a){
var _7b=this._spanList;
dojo.style(_7b[_7a],this._ignoredIncorrectStyle);
this._cache[_7b[_7a].innerHTML.toLowerCase()].correct=true;
_7b[_7a].edited=true;
},_skipWordAll:function(_7c,_7d){
var _7e=this._spanList,len=_7e.length;
_7d=_7d||_7e[_7c].innerHTML.toLowerCase();
for(var i=0;i<len;i++){
if(!_7e[i].edited&&_7e[i].innerHTML.toLowerCase()==_7d){
this._skipWord(i);
}
}
},_addWord:function(_7f,_80){
var _81=this._service;
_81.send(_80||this._spanList[_7f].innerHTML.toLowerCase(),_81.ACTION_UPDATE);
this._skipWordAll(_7f,_80);
},_findText:function(txt,_82,_83){
var ed=this._editor,win=ed.window,_84=false;
if(txt){
if(win.find){
_84=win.find(txt,_82,_83,false,false,false,false);
}else{
var doc=ed.document;
if(doc.selection){
this._editor.focus();
var _85=doc.body.createTextRange();
var _86=doc.selection?doc.selection.createRange():null;
if(_86){
if(_83){
_85.setEndPoint("EndToStart",_86);
}else{
_85.setEndPoint("StartToEnd",_86);
}
}
var _87=_82?4:0;
if(_83){
_87=_87|1;
}
_84=_85.findText(txt,_85.text.length,_87);
if(_84){
_85.select();
}
}
}
}
return _84;
},_spellCheckFilter:function(_88){
var _89=/<span class=["']incorrectWordPlaceHolder["'].*?>(.*?)<\/span>/g;
return _88.replace(_89,"$1");
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _8a=o.args.name.toLowerCase();
if(_8a==="spellcheck"){
o.plugin=new dojox.editor.plugins.SpellCheck({url:("url" in o.args)?o.args.url:"",interactive:("interactive" in o.args)?o.args.interactive:false,bufferLength:("bufferLength" in o.args)?o.args.bufferLength:100,timeout:("timeout" in o.args)?o.args.timeout:30,exArgs:o.args});
}
});
}
