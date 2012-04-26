/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Editor"]){
dojo._hasResource["dijit.Editor"]=true;
dojo.provide("dijit.Editor");
dojo.require("dijit._editor.RichText");
dojo.require("dijit.Toolbar");
dojo.require("dijit.ToolbarSeparator");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit._editor.plugins.EnterKeyHandling");
dojo.require("dijit._editor.range");
dojo.require("dijit._Container");
dojo.require("dojo.i18n");
dojo.require("dijit.layout._LayoutWidget");
dojo.requireLocalization("dijit._editor","commands",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit.Editor",dijit._editor.RichText,{plugins:null,extraPlugins:null,constructor:function(){
if(!dojo.isArray(this.plugins)){
this.plugins=["undo","redo","|","cut","copy","paste","|","bold","italic","underline","strikethrough","|","insertOrderedList","insertUnorderedList","indent","outdent","|","justifyLeft","justifyRight","justifyCenter","justifyFull","dijit._editor.plugins.EnterKeyHandling"];
}
this._plugins=[];
this._editInterval=this.editActionInterval*1000;
if(dojo.isIE){
this.events.push("onBeforeDeactivate");
this.events.push("onBeforeActivate");
}
},postMixInProperties:function(){
this.setValueDeferred=new dojo.Deferred();
this.inherited(arguments);
},postCreate:function(){
this._steps=this._steps.slice(0);
this._undoedSteps=this._undoedSteps.slice(0);
if(dojo.isArray(this.extraPlugins)){
this.plugins=this.plugins.concat(this.extraPlugins);
}
this.inherited(arguments);
this.commands=dojo.i18n.getLocalization("dijit._editor","commands",this.lang);
if(!this.toolbar){
this.toolbar=new dijit.Toolbar({dir:this.dir,lang:this.lang});
this.header.appendChild(this.toolbar.domNode);
}
dojo.forEach(this.plugins,this.addPlugin,this);
this.setValueDeferred.callback(true);
dojo.addClass(this.iframe.parentNode,"dijitEditorIFrameContainer");
dojo.addClass(this.iframe,"dijitEditorIFrame");
dojo.attr(this.iframe,"allowTransparency",true);
if(dojo.isWebKit){
dojo.style(this.domNode,"KhtmlUserSelect","none");
}
this.toolbar.startup();
this.onNormalizedDisplayChanged();
},destroy:function(){
dojo.forEach(this._plugins,function(p){
if(p&&p.destroy){
p.destroy();
}
});
this._plugins=[];
this.toolbar.destroyRecursive();
delete this.toolbar;
this.inherited(arguments);
},addPlugin:function(_1,_2){
var _3=dojo.isString(_1)?{name:_1}:_1;
if(!_3.setEditor){
var o={"args":_3,"plugin":null,"editor":this};
dojo.publish(dijit._scopeName+".Editor.getPlugin",[o]);
if(!o.plugin){
var pc=dojo.getObject(_3.name);
if(pc){
o.plugin=new pc(_3);
}
}
if(!o.plugin){
console.warn("Cannot find plugin",_1);
return;
}
_1=o.plugin;
}
if(arguments.length>1){
this._plugins[_2]=_1;
}else{
this._plugins.push(_1);
}
_1.setEditor(this);
if(dojo.isFunction(_1.setToolbar)){
_1.setToolbar(this.toolbar);
}
},startup:function(){
},resize:function(_4){
if(_4){
dijit.layout._LayoutWidget.prototype.resize.apply(this,arguments);
}
},layout:function(){
var _5=(this._contentBox.h-(this.getHeaderHeight()+this.getFooterHeight()+dojo._getPadBorderExtents(this.iframe.parentNode).h+dojo._getMarginExtents(this.iframe.parentNode).h));
this.editingArea.style.height=_5+"px";
if(this.iframe){
this.iframe.style.height="100%";
}
this._layoutMode=true;
},_onIEMouseDown:function(e){
var _6;
var b=this.document.body;
var _7=b.clientWidth;
var _8=b.clientHeight;
var _9=b.clientLeft;
var _a=b.offsetWidth;
var _b=b.offsetHeight;
var _c=b.offsetLeft;
bodyDir=b.dir?b.dir.toLowerCase():"";
if(bodyDir!="rtl"){
if(_7<_a&&e.x>_7&&e.x<_a){
_6=true;
}
}else{
if(e.x<_9&&e.x>_c){
_6=true;
}
}
if(!_6){
if(_8<_b&&e.y>_8&&e.y<_b){
_6=true;
}
}
if(!_6){
delete this._cursorToStart;
delete this._savedSelection;
if(e.target.tagName=="BODY"){
setTimeout(dojo.hitch(this,"placeCursorAtEnd"),0);
}
this.inherited(arguments);
}
},onBeforeActivate:function(e){
this._restoreSelection();
},onBeforeDeactivate:function(e){
if(this.customUndo){
this.endEditing(true);
}
if(e.target.tagName!="BODY"){
this._saveSelection();
}
},customUndo:true,editActionInterval:3,beginEditing:function(_d){
if(!this._inEditing){
this._inEditing=true;
this._beginEditing(_d);
}
if(this.editActionInterval>0){
if(this._editTimer){
clearTimeout(this._editTimer);
}
this._editTimer=setTimeout(dojo.hitch(this,this.endEditing),this._editInterval);
}
},_steps:[],_undoedSteps:[],execCommand:function(_e){
if(this.customUndo&&(_e=="undo"||_e=="redo")){
return this[_e]();
}else{
if(this.customUndo){
this.endEditing();
this._beginEditing();
}
var r;
var _f=/copy|cut|paste/.test(_e);
try{
r=this.inherited(arguments);
if(dojo.isWebKit&&_f&&!r){
throw {code:1011};
}
}
catch(e){
if(e.code==1011&&_f){
var sub=dojo.string.substitute,_10={cut:"X",copy:"C",paste:"V"};
alert(sub(this.commands.systemShortcut,[this.commands[_e],sub(this.commands[dojo.isMac?"appleKey":"ctrlKey"],[_10[_e]])]));
}
r=false;
}
if(this.customUndo){
this._endEditing();
}
return r;
}
},queryCommandEnabled:function(cmd){
if(this.customUndo&&(cmd=="undo"||cmd=="redo")){
return cmd=="undo"?(this._steps.length>1):(this._undoedSteps.length>0);
}else{
return this.inherited(arguments);
}
},_moveToBookmark:function(b){
var _11=b.mark;
var _12=b.mark;
var col=b.isCollapsed;
var r,_13,_14,sel;
if(_12){
if(dojo.isIE<9){
if(dojo.isArray(_12)){
_11=[];
dojo.forEach(_12,function(n){
_11.push(dijit.range.getNode(n,this.editNode));
},this);
dojo.withGlobal(this.window,"moveToBookmark",dijit,[{mark:_11,isCollapsed:col}]);
}else{
if(_12.startContainer&&_12.endContainer){
sel=dijit.range.getSelection(this.window);
if(sel&&sel.removeAllRanges){
sel.removeAllRanges();
r=dijit.range.create(this.window);
_13=dijit.range.getNode(_12.startContainer,this.editNode);
_14=dijit.range.getNode(_12.endContainer,this.editNode);
if(_13&&_14){
r.setStart(_13,_12.startOffset);
r.setEnd(_14,_12.endOffset);
sel.addRange(r);
}
}
}
}
}else{
sel=dijit.range.getSelection(this.window);
if(sel&&sel.removeAllRanges){
sel.removeAllRanges();
r=dijit.range.create(this.window);
_13=dijit.range.getNode(_12.startContainer,this.editNode);
_14=dijit.range.getNode(_12.endContainer,this.editNode);
if(_13&&_14){
r.setStart(_13,_12.startOffset);
r.setEnd(_14,_12.endOffset);
sel.addRange(r);
}
}
}
}
},_changeToStep:function(_15,to){
this.setValue(to.text);
var b=to.bookmark;
if(!b){
return;
}
this._moveToBookmark(b);
},undo:function(){
var ret=false;
if(!this._undoRedoActive){
this._undoRedoActive=true;
this.endEditing(true);
var s=this._steps.pop();
if(s&&this._steps.length>0){
this.focus();
this._changeToStep(s,this._steps[this._steps.length-1]);
this._undoedSteps.push(s);
this.onDisplayChanged();
delete this._undoRedoActive;
ret=true;
}
delete this._undoRedoActive;
}
return ret;
},redo:function(){
var ret=false;
if(!this._undoRedoActive){
this._undoRedoActive=true;
this.endEditing(true);
var s=this._undoedSteps.pop();
if(s&&this._steps.length>0){
this.focus();
this._changeToStep(this._steps[this._steps.length-1],s);
this._steps.push(s);
this.onDisplayChanged();
ret=true;
}
delete this._undoRedoActive;
}
return ret;
},endEditing:function(_16){
if(this._editTimer){
clearTimeout(this._editTimer);
}
if(this._inEditing){
this._endEditing(_16);
this._inEditing=false;
}
},_getBookmark:function(){
var b=dojo.withGlobal(this.window,dijit.getBookmark);
var tmp=[];
if(b&&b.mark){
var _17=b.mark;
if(dojo.isIE<9){
var sel=dijit.range.getSelection(this.window);
if(!dojo.isArray(_17)){
if(sel){
var _18;
if(sel.rangeCount){
_18=sel.getRangeAt(0);
}
if(_18){
b.mark=_18.cloneRange();
}else{
b.mark=dojo.withGlobal(this.window,dijit.getBookmark);
}
}
}else{
dojo.forEach(b.mark,function(n){
tmp.push(dijit.range.getIndex(n,this.editNode).o);
},this);
b.mark=tmp;
}
}
try{
if(b.mark&&b.mark.startContainer){
tmp=dijit.range.getIndex(b.mark.startContainer,this.editNode).o;
b.mark={startContainer:tmp,startOffset:b.mark.startOffset,endContainer:b.mark.endContainer===b.mark.startContainer?tmp:dijit.range.getIndex(b.mark.endContainer,this.editNode).o,endOffset:b.mark.endOffset};
}
}
catch(e){
b.mark=null;
}
}
return b;
},_beginEditing:function(cmd){
if(this._steps.length===0){
this._steps.push({"text":dijit._editor.getChildrenHtml(this.editNode),"bookmark":this._getBookmark()});
}
},_endEditing:function(_19){
var v=dijit._editor.getChildrenHtml(this.editNode);
this._undoedSteps=[];
this._steps.push({text:v,bookmark:this._getBookmark()});
},onKeyDown:function(e){
if(!dojo.isIE&&!this.iframe&&e.keyCode==dojo.keys.TAB&&!this.tabIndent){
this._saveSelection();
}
if(!this.customUndo){
this.inherited(arguments);
return;
}
var k=e.keyCode,ks=dojo.keys;
if(e.ctrlKey&&!e.altKey){
if(k==90||k==122){
dojo.stopEvent(e);
this.undo();
return;
}else{
if(k==89||k==121){
dojo.stopEvent(e);
this.redo();
return;
}
}
}
this.inherited(arguments);
switch(k){
case ks.ENTER:
case ks.BACKSPACE:
case ks.DELETE:
this.beginEditing();
break;
case 88:
case 86:
if(e.ctrlKey&&!e.altKey&&!e.metaKey){
this.endEditing();
if(e.keyCode==88){
this.beginEditing("cut");
setTimeout(dojo.hitch(this,this.endEditing),1);
}else{
this.beginEditing("paste");
setTimeout(dojo.hitch(this,this.endEditing),1);
}
break;
}
default:
if(!e.ctrlKey&&!e.altKey&&!e.metaKey&&(e.keyCode<dojo.keys.F1||e.keyCode>dojo.keys.F15)){
this.beginEditing();
break;
}
case ks.ALT:
this.endEditing();
break;
case ks.UP_ARROW:
case ks.DOWN_ARROW:
case ks.LEFT_ARROW:
case ks.RIGHT_ARROW:
case ks.HOME:
case ks.END:
case ks.PAGE_UP:
case ks.PAGE_DOWN:
this.endEditing(true);
break;
case ks.CTRL:
case ks.SHIFT:
case ks.TAB:
break;
}
},_onBlur:function(){
this.inherited(arguments);
this.endEditing(true);
},_saveSelection:function(){
try{
this._savedSelection=this._getBookmark();
}
catch(e){
}
},_restoreSelection:function(){
if(this._savedSelection){
delete this._cursorToStart;
if(dojo.withGlobal(this.window,"isCollapsed",dijit)){
this._moveToBookmark(this._savedSelection);
}
delete this._savedSelection;
}
},onClick:function(){
this.endEditing(true);
this.inherited(arguments);
},replaceValue:function(_1a){
if(!this.customUndo){
this.inherited(arguments);
}else{
if(this.isClosed){
this.setValue(_1a);
}else{
this.beginEditing();
if(!_1a){
_1a="&nbsp;";
}
this.setValue(_1a);
this.endEditing();
}
}
},_setDisabledAttr:function(_1b){
var _1c=dojo.hitch(this,function(){
if((!this.disabled&&_1b)||(!this._buttonEnabledPlugins&&_1b)){
dojo.forEach(this._plugins,function(p){
p.set("disabled",true);
});
}else{
if(this.disabled&&!_1b){
dojo.forEach(this._plugins,function(p){
p.set("disabled",false);
});
}
}
});
this.setValueDeferred.addCallback(_1c);
this.inherited(arguments);
},_setStateClass:function(){
try{
this.inherited(arguments);
if(this.document&&this.document.body){
dojo.style(this.document.body,"color",dojo.style(this.iframe,"color"));
}
}
catch(e){
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _1d=o.args,p;
var _1e=dijit._editor._Plugin;
var _1f=_1d.name;
switch(_1f){
case "undo":
case "redo":
case "cut":
case "copy":
case "paste":
case "insertOrderedList":
case "insertUnorderedList":
case "indent":
case "outdent":
case "justifyCenter":
case "justifyFull":
case "justifyLeft":
case "justifyRight":
case "delete":
case "selectAll":
case "removeFormat":
case "unlink":
case "insertHorizontalRule":
p=new _1e({command:_1f});
break;
case "bold":
case "italic":
case "underline":
case "strikethrough":
case "subscript":
case "superscript":
p=new _1e({buttonClass:dijit.form.ToggleButton,command:_1f});
break;
case "|":
p=new _1e({button:new dijit.ToolbarSeparator(),setEditor:function(_20){
this.editor=_20;
}});
}
o.plugin=p;
});
}
