//>>built
define("dijit/Editor",["require","dojo/_base/array","dojo/_base/declare","dojo/Deferred","dojo/i18n","dojo/dom-attr","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/keys","dojo/_base/lang","dojo/sniff","dojo/string","dojo/topic","./_Container","./Toolbar","./ToolbarSeparator","./layout/_LayoutWidget","./form/ToggleButton","./_editor/_Plugin","./_editor/plugins/EnterKeyHandling","./_editor/html","./_editor/range","./_editor/RichText","./main","dojo/i18n!./_editor/nls/commands"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e,_f,_10,_11,_12,_13,_14,_15,_16,_17,_18,_19){
var _1a=_3("dijit.Editor",_18,{plugins:null,extraPlugins:null,constructor:function(){
if(!_b.isArray(this.plugins)){
this.plugins=["undo","redo","|","cut","copy","paste","|","bold","italic","underline","strikethrough","|","insertOrderedList","insertUnorderedList","indent","outdent","|","justifyLeft","justifyRight","justifyCenter","justifyFull",_15];
}
this._plugins=[];
this._editInterval=this.editActionInterval*1000;
if(_c("ie")||_c("trident")){
this.events.push("onBeforeDeactivate");
this.events.push("onBeforeActivate");
}
},postMixInProperties:function(){
this.setValueDeferred=new _4();
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this._steps=this._steps.slice(0);
this._undoedSteps=this._undoedSteps.slice(0);
if(_b.isArray(this.extraPlugins)){
this.plugins=this.plugins.concat(this.extraPlugins);
}
this.commands=_5.getLocalization("dijit._editor","commands",this.lang);
if(_c("webkit")){
_9.set(this.domNode,"KhtmlUserSelect","none");
}
},startup:function(){
this.inherited(arguments);
if(!this.toolbar){
this.toolbar=new _10({ownerDocument:this.ownerDocument,dir:this.dir,lang:this.lang,"aria-label":this.id});
this.header.appendChild(this.toolbar.domNode);
}
_2.forEach(this.plugins,this.addPlugin,this);
this.setValueDeferred.resolve(true);
_7.add(this.iframe.parentNode,"dijitEditorIFrameContainer");
_7.add(this.iframe,"dijitEditorIFrame");
_6.set(this.iframe,"allowTransparency",true);
this.toolbar.startup();
this.onNormalizedDisplayChanged();
},destroy:function(){
_2.forEach(this._plugins,function(p){
if(p&&p.destroy){
p.destroy();
}
});
this._plugins=[];
this.toolbar.destroyRecursive();
delete this.toolbar;
this.inherited(arguments);
},addPlugin:function(_1b,_1c){
var _1d=_b.isString(_1b)?{name:_1b}:_b.isFunction(_1b)?{ctor:_1b}:_1b;
if(!_1d.setEditor){
var o={"args":_1d,"plugin":null,"editor":this};
if(_1d.name){
if(_14.registry[_1d.name]){
o.plugin=_14.registry[_1d.name](_1d);
}else{
_e.publish(_19._scopeName+".Editor.getPlugin",o);
}
}
if(!o.plugin){
try{
var pc=_1d.ctor||_b.getObject(_1d.name)||_1(_1d.name);
if(pc){
o.plugin=new pc(_1d);
}
}
catch(e){
throw new Error(this.id+": cannot find plugin ["+_1d.name+"]");
}
}
if(!o.plugin){
throw new Error(this.id+": cannot find plugin ["+_1d.name+"]");
}
_1b=o.plugin;
}
if(arguments.length>1){
this._plugins[_1c]=_1b;
}else{
this._plugins.push(_1b);
}
_1b.setEditor(this);
if(_b.isFunction(_1b.setToolbar)){
_1b.setToolbar(this.toolbar);
}
},resize:function(_1e){
if(_1e){
_12.prototype.resize.apply(this,arguments);
}
},layout:function(){
var _1f=(this._contentBox.h-(this.getHeaderHeight()+this.getFooterHeight()+_8.getPadBorderExtents(this.iframe.parentNode).h+_8.getMarginExtents(this.iframe.parentNode).h));
this.editingArea.style.height=_1f+"px";
if(this.iframe){
this.iframe.style.height="100%";
}
this._layoutMode=true;
},_onIEMouseDown:function(e){
var _20;
var b=this.document.body;
var _21=b.clientWidth;
var _22=b.clientHeight;
var _23=b.clientLeft;
var _24=b.offsetWidth;
var _25=b.offsetHeight;
var _26=b.offsetLeft;
if(/^rtl$/i.test(b.dir||"")){
if(_21<_24&&e.x>_21&&e.x<_24){
_20=true;
}
}else{
if(e.x<_23&&e.x>_26){
_20=true;
}
}
if(!_20){
if(_22<_25&&e.y>_22&&e.y<_25){
_20=true;
}
}
if(!_20){
delete this._cursorToStart;
delete this._savedSelection;
if(e.target.tagName=="BODY"){
this.defer("placeCursorAtEnd");
}
this.inherited(arguments);
}
},onBeforeActivate:function(){
this._restoreSelection();
},onBeforeDeactivate:function(e){
if(this.customUndo){
this.endEditing(true);
}
if(e.target.tagName!="BODY"){
this._saveSelection();
}
},customUndo:true,editActionInterval:3,beginEditing:function(cmd){
if(!this._inEditing){
this._inEditing=true;
this._beginEditing(cmd);
}
if(this.editActionInterval>0){
if(this._editTimer){
this._editTimer.remove();
}
this._editTimer=this.defer("endEditing",this._editInterval);
}
},_steps:[],_undoedSteps:[],execCommand:function(cmd){
if(this.customUndo&&(cmd=="undo"||cmd=="redo")){
return this[cmd]();
}else{
if(this.customUndo){
this.endEditing();
this._beginEditing();
}
var r=this.inherited(arguments);
if(this.customUndo){
this._endEditing();
}
return r;
}
},_pasteImpl:function(){
return this._clipboardCommand("paste");
},_cutImpl:function(){
return this._clipboardCommand("cut");
},_copyImpl:function(){
return this._clipboardCommand("copy");
},_clipboardCommand:function(cmd){
var r;
try{
r=this.document.execCommand(cmd,false,null);
if(_c("webkit")&&!r){
throw {code:1011};
}
}
catch(e){
if(e.code==1011||(e.code==9&&_c("opera"))){
var sub=_d.substitute,_27={cut:"X",copy:"C",paste:"V"};
alert(sub(this.commands.systemShortcut,[this.commands[cmd],sub(this.commands[_c("mac")?"appleKey":"ctrlKey"],[_27[cmd]])]));
}
r=false;
}
return r;
},queryCommandEnabled:function(cmd){
if(this.customUndo&&(cmd=="undo"||cmd=="redo")){
return cmd=="undo"?(this._steps.length>1):(this._undoedSteps.length>0);
}else{
return this.inherited(arguments);
}
},_moveToBookmark:function(b){
var _28=b.mark;
var _29=b.mark;
var col=b.isCollapsed;
var r,_2a,_2b,sel;
if(_29){
if(_c("ie")<9||(_c("ie")===9&&_c("quirks"))){
if(_b.isArray(_29)){
_28=[];
_2.forEach(_29,function(n){
_28.push(_17.getNode(n,this.editNode));
},this);
this.selection.moveToBookmark({mark:_28,isCollapsed:col});
}else{
if(_29.startContainer&&_29.endContainer){
sel=_17.getSelection(this.window);
if(sel&&sel.removeAllRanges){
sel.removeAllRanges();
r=_17.create(this.window);
_2a=_17.getNode(_29.startContainer,this.editNode);
_2b=_17.getNode(_29.endContainer,this.editNode);
if(_2a&&_2b){
r.setStart(_2a,_29.startOffset);
r.setEnd(_2b,_29.endOffset);
sel.addRange(r);
}
}
}
}
}else{
sel=_17.getSelection(this.window);
if(sel&&sel.removeAllRanges){
sel.removeAllRanges();
r=_17.create(this.window);
_2a=_17.getNode(_29.startContainer,this.editNode);
_2b=_17.getNode(_29.endContainer,this.editNode);
if(_2a&&_2b){
r.setStart(_2a,_29.startOffset);
r.setEnd(_2b,_29.endOffset);
sel.addRange(r);
}
}
}
}
},_changeToStep:function(_2c,to){
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
},endEditing:function(_2d){
if(this._editTimer){
this._editTimer=this._editTimer.remove();
}
if(this._inEditing){
this._endEditing(_2d);
this._inEditing=false;
}
},_getBookmark:function(){
var b=this.selection.getBookmark();
var tmp=[];
if(b&&b.mark){
var _2e=b.mark;
if(_c("ie")<9||(_c("ie")===9&&_c("quirks"))){
var sel=_17.getSelection(this.window);
if(!_b.isArray(_2e)){
if(sel){
var _2f;
if(sel.rangeCount){
_2f=sel.getRangeAt(0);
}
if(_2f){
b.mark=_2f.cloneRange();
}else{
b.mark=this.selection.getBookmark();
}
}
}else{
_2.forEach(b.mark,function(n){
tmp.push(_17.getIndex(n,this.editNode).o);
},this);
b.mark=tmp;
}
}
try{
if(b.mark&&b.mark.startContainer){
tmp=_17.getIndex(b.mark.startContainer,this.editNode).o;
b.mark={startContainer:tmp,startOffset:b.mark.startOffset,endContainer:b.mark.endContainer===b.mark.startContainer?tmp:_17.getIndex(b.mark.endContainer,this.editNode).o,endOffset:b.mark.endOffset};
}
}
catch(e){
b.mark=null;
}
}
return b;
},_beginEditing:function(){
if(this._steps.length===0){
this._steps.push({"text":_16.getChildrenHtml(this.editNode),"bookmark":this._getBookmark()});
}
},_endEditing:function(){
var v=_16.getChildrenHtml(this.editNode);
this._undoedSteps=[];
this._steps.push({text:v,bookmark:this._getBookmark()});
},onKeyDown:function(e){
if(!_c("ie")&&!this.iframe&&e.keyCode==_a.TAB&&!this.tabIndent){
this._saveSelection();
}
if(!this.customUndo){
this.inherited(arguments);
return;
}
var k=e.keyCode;
if(e.ctrlKey&&!e.shiftKey&&!e.altKey){
if(k==90||k==122){
e.stopPropagation();
e.preventDefault();
this.undo();
return;
}else{
if(k==89||k==121){
e.stopPropagation();
e.preventDefault();
this.redo();
return;
}
}
}
this.inherited(arguments);
switch(k){
case _a.ENTER:
case _a.BACKSPACE:
case _a.DELETE:
this.beginEditing();
break;
case 88:
case 86:
if(e.ctrlKey&&!e.altKey&&!e.metaKey){
this.endEditing();
if(e.keyCode==88){
this.beginEditing("cut");
}else{
this.beginEditing("paste");
}
this.defer("endEditing",1);
break;
}
default:
if(!e.ctrlKey&&!e.altKey&&!e.metaKey&&(e.keyCode<_a.F1||e.keyCode>_a.F15)){
this.beginEditing();
break;
}
case _a.ALT:
this.endEditing();
break;
case _a.UP_ARROW:
case _a.DOWN_ARROW:
case _a.LEFT_ARROW:
case _a.RIGHT_ARROW:
case _a.HOME:
case _a.END:
case _a.PAGE_UP:
case _a.PAGE_DOWN:
this.endEditing(true);
break;
case _a.CTRL:
case _a.SHIFT:
case _a.TAB:
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
if(this.selection.isCollapsed()){
this._moveToBookmark(this._savedSelection);
}
delete this._savedSelection;
}
},onClick:function(){
this.endEditing(true);
this.inherited(arguments);
},replaceValue:function(_30){
if(!this.customUndo){
this.inherited(arguments);
}else{
if(this.isClosed){
this.setValue(_30);
}else{
this.beginEditing();
if(!_30){
_30="&#160;";
}
this.setValue(_30);
this.endEditing();
}
}
},_setDisabledAttr:function(_31){
this.setValueDeferred.then(_b.hitch(this,function(){
if((!this.disabled&&_31)||(!this._buttonEnabledPlugins&&_31)){
_2.forEach(this._plugins,function(p){
p.set("disabled",true);
});
}else{
if(this.disabled&&!_31){
_2.forEach(this._plugins,function(p){
p.set("disabled",false);
});
}
}
}));
this.inherited(arguments);
},_setStateClass:function(){
try{
this.inherited(arguments);
if(this.document&&this.document.body){
_9.set(this.document.body,"color",_9.get(this.iframe,"color"));
}
}
catch(e){
}
}});
function _32(_33){
return new _14({command:_33.name});
};
function _34(_35){
return new _14({buttonClass:_13,command:_35.name});
};
_b.mixin(_14.registry,{"undo":_32,"redo":_32,"cut":_32,"copy":_32,"paste":_32,"insertOrderedList":_32,"insertUnorderedList":_32,"indent":_32,"outdent":_32,"justifyCenter":_32,"justifyFull":_32,"justifyLeft":_32,"justifyRight":_32,"delete":_32,"selectAll":_32,"removeFormat":_32,"unlink":_32,"insertHorizontalRule":_32,"bold":_34,"italic":_34,"underline":_34,"strikethrough":_34,"subscript":_34,"superscript":_34,"|":function(){
return new _14({setEditor:function(_36){
this.editor=_36;
this.button=new _11({ownerDocument:_36.ownerDocument});
}});
}});
return _1a;
});
