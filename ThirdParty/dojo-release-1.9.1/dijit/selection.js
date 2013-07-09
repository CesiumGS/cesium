//>>built
define("dijit/selection",["dojo/_base/array","dojo/dom","dojo/_base/lang","dojo/sniff","dojo/_base/window","dijit/focus"],function(_1,_2,_3,_4,_5,_6){
var _7=function(_8){
var _9=_8.document;
this.getType=function(){
if(_9.getSelection){
var _a="text";
var _b;
try{
_b=_8.getSelection();
}
catch(e){
}
if(_b&&_b.rangeCount==1){
var _c=_b.getRangeAt(0);
if((_c.startContainer==_c.endContainer)&&((_c.endOffset-_c.startOffset)==1)&&(_c.startContainer.nodeType!=3)){
_a="control";
}
}
return _a;
}else{
return _9.selection.type.toLowerCase();
}
};
this.getSelectedText=function(){
if(_9.getSelection){
var _d=_8.getSelection();
return _d?_d.toString():"";
}else{
if(this.getType()=="control"){
return null;
}
return _9.selection.createRange().text;
}
};
this.getSelectedHtml=function(){
if(_9.getSelection){
var _e=_8.getSelection();
if(_e&&_e.rangeCount){
var i;
var _f="";
for(i=0;i<_e.rangeCount;i++){
var _10=_e.getRangeAt(i).cloneContents();
var div=_9.createElement("div");
div.appendChild(_10);
_f+=div.innerHTML;
}
return _f;
}
return null;
}else{
if(this.getType()=="control"){
return null;
}
return _9.selection.createRange().htmlText;
}
};
this.getSelectedElement=function(){
if(this.getType()=="control"){
if(_9.getSelection){
var _11=_8.getSelection();
return _11.anchorNode.childNodes[_11.anchorOffset];
}else{
var _12=_9.selection.createRange();
if(_12&&_12.item){
return _9.selection.createRange().item(0);
}
}
}
return null;
};
this.getParentElement=function(){
if(this.getType()=="control"){
var p=this.getSelectedElement();
if(p){
return p.parentNode;
}
}else{
if(_9.getSelection){
var _13=_9.getSelection();
if(_13){
var _14=_13.anchorNode;
while(_14&&(_14.nodeType!=1)){
_14=_14.parentNode;
}
return _14;
}
}else{
var r=_9.selection.createRange();
r.collapse(true);
return r.parentElement();
}
}
return null;
};
this.hasAncestorElement=function(_15){
return this.getAncestorElement.apply(this,arguments)!=null;
};
this.getAncestorElement=function(_16){
var _17=this.getSelectedElement()||this.getParentElement();
return this.getParentOfType(_17,arguments);
};
this.isTag=function(_18,_19){
if(_18&&_18.tagName){
var _1a=_18.tagName.toLowerCase();
for(var i=0;i<_19.length;i++){
var _1b=String(_19[i]).toLowerCase();
if(_1a==_1b){
return _1b;
}
}
}
return "";
};
this.getParentOfType=function(_1c,_1d){
while(_1c){
if(this.isTag(_1c,_1d).length){
return _1c;
}
_1c=_1c.parentNode;
}
return null;
};
this.collapse=function(_1e){
if(_9.getSelection){
var _1f=_8.getSelection();
if(_1f.removeAllRanges){
if(_1e){
_1f.collapseToStart();
}else{
_1f.collapseToEnd();
}
}else{
_1f.collapse(_1e);
}
}else{
var _20=_9.selection.createRange();
_20.collapse(_1e);
_20.select();
}
};
this.remove=function(){
var sel=_9.selection;
if(_9.getSelection){
sel=_8.getSelection();
sel.deleteFromDocument();
return sel;
}else{
if(sel.type.toLowerCase()!="none"){
sel.clear();
}
return sel;
}
};
this.selectElementChildren=function(_21,_22){
var _23;
_21=_2.byId(_21);
if(_9.getSelection){
var _24=_8.getSelection();
if(_4("opera")){
if(_24.rangeCount){
_23=_24.getRangeAt(0);
}else{
_23=_9.createRange();
}
_23.setStart(_21,0);
_23.setEnd(_21,(_21.nodeType==3)?_21.length:_21.childNodes.length);
_24.addRange(_23);
}else{
_24.selectAllChildren(_21);
}
}else{
_23=_21.ownerDocument.body.createTextRange();
_23.moveToElementText(_21);
if(!_22){
try{
_23.select();
}
catch(e){
}
}
}
};
this.selectElement=function(_25,_26){
var _27;
_25=_2.byId(_25);
if(_9.getSelection){
var _28=_9.getSelection();
_27=_9.createRange();
if(_28.removeAllRanges){
if(_4("opera")){
if(_28.getRangeAt(0)){
_27=_28.getRangeAt(0);
}
}
_27.selectNode(_25);
_28.removeAllRanges();
_28.addRange(_27);
}
}else{
try{
var tg=_25.tagName?_25.tagName.toLowerCase():"";
if(tg==="img"||tg==="table"){
_27=_5.body(_9).createControlRange();
}else{
_27=_5.body(_9).createRange();
}
_27.addElement(_25);
if(!_26){
_27.select();
}
}
catch(e){
this.selectElementChildren(_25,_26);
}
}
};
this.inSelection=function(_29){
if(_29){
var _2a;
var _2b;
if(_9.getSelection){
var sel=_8.getSelection();
if(sel&&sel.rangeCount>0){
_2b=sel.getRangeAt(0);
}
if(_2b&&_2b.compareBoundaryPoints&&_9.createRange){
try{
_2a=_9.createRange();
_2a.setStart(_29,0);
if(_2b.compareBoundaryPoints(_2b.START_TO_END,_2a)===1){
return true;
}
}
catch(e){
}
}
}else{
_2b=_9.selection.createRange();
try{
_2a=_29.ownerDocument.body.createTextRange();
_2a.moveToElementText(_29);
}
catch(e2){
}
if(_2b&&_2a){
if(_2b.compareEndPoints("EndToStart",_2a)===1){
return true;
}
}
}
}
return false;
},this.getBookmark=function(){
var bm,rg,tg,sel=_9.selection,cf=_6.curNode;
if(_9.getSelection){
sel=_8.getSelection();
if(sel){
if(sel.isCollapsed){
tg=cf?cf.tagName:"";
if(tg){
tg=tg.toLowerCase();
if(tg=="textarea"||(tg=="input"&&(!cf.type||cf.type.toLowerCase()=="text"))){
sel={start:cf.selectionStart,end:cf.selectionEnd,node:cf,pRange:true};
return {isCollapsed:(sel.end<=sel.start),mark:sel};
}
}
bm={isCollapsed:true};
if(sel.rangeCount){
bm.mark=sel.getRangeAt(0).cloneRange();
}
}else{
rg=sel.getRangeAt(0);
bm={isCollapsed:false,mark:rg.cloneRange()};
}
}
}else{
if(sel){
tg=cf?cf.tagName:"";
tg=tg.toLowerCase();
if(cf&&tg&&(tg=="button"||tg=="textarea"||tg=="input")){
if(sel.type&&sel.type.toLowerCase()=="none"){
return {isCollapsed:true,mark:null};
}else{
rg=sel.createRange();
return {isCollapsed:rg.text&&rg.text.length?false:true,mark:{range:rg,pRange:true}};
}
}
bm={};
try{
rg=sel.createRange();
bm.isCollapsed=!(sel.type=="Text"?rg.htmlText.length:rg.length);
}
catch(e){
bm.isCollapsed=true;
return bm;
}
if(sel.type.toUpperCase()=="CONTROL"){
if(rg.length){
bm.mark=[];
var i=0,len=rg.length;
while(i<len){
bm.mark.push(rg.item(i++));
}
}else{
bm.isCollapsed=true;
bm.mark=null;
}
}else{
bm.mark=rg.getBookmark();
}
}else{
console.warn("No idea how to store the current selection for this browser!");
}
}
return bm;
};
this.moveToBookmark=function(_2c){
var _2d=_2c.mark;
if(_2d){
if(_9.getSelection){
var sel=_8.getSelection();
if(sel&&sel.removeAllRanges){
if(_2d.pRange){
var n=_2d.node;
n.selectionStart=_2d.start;
n.selectionEnd=_2d.end;
}else{
sel.removeAllRanges();
sel.addRange(_2d);
}
}else{
console.warn("No idea how to restore selection for this browser!");
}
}else{
if(_9.selection&&_2d){
var rg;
if(_2d.pRange){
rg=_2d.range;
}else{
if(_3.isArray(_2d)){
rg=_9.body.createControlRange();
_1.forEach(_2d,function(n){
rg.addElement(n);
});
}else{
rg=_9.body.createTextRange();
rg.moveToBookmark(_2d);
}
}
rg.select();
}
}
}
};
this.isCollapsed=function(){
return this.getBookmark().isCollapsed;
};
};
var _2e=new _7(window);
_2e.SelectionManager=_7;
return _2e;
});
