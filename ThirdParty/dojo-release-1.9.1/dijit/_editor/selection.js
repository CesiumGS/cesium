//>>built
define("dijit/_editor/selection",["dojo/dom","dojo/_base/lang","dojo/sniff","dojo/_base/window","../main"],function(_1,_2,_3,_4,_5){
var _6={getType:function(){
if(_4.doc.getSelection){
var _7="text";
var _8;
try{
_8=_4.global.getSelection();
}
catch(e){
}
if(_8&&_8.rangeCount==1){
var _9=_8.getRangeAt(0);
if((_9.startContainer==_9.endContainer)&&((_9.endOffset-_9.startOffset)==1)&&(_9.startContainer.nodeType!=3)){
_7="control";
}
}
return _7;
}else{
return _4.doc.selection.type.toLowerCase();
}
},getSelectedText:function(){
if(_4.doc.getSelection){
var _a=_4.global.getSelection();
return _a?_a.toString():"";
}else{
if(_5._editor.selection.getType()=="control"){
return null;
}
return _4.doc.selection.createRange().text;
}
},getSelectedHtml:function(){
if(_4.doc.getSelection){
var _b=_4.global.getSelection();
if(_b&&_b.rangeCount){
var i;
var _c="";
for(i=0;i<_b.rangeCount;i++){
var _d=_b.getRangeAt(i).cloneContents();
var _e=_4.doc.createElement("div");
_e.appendChild(_d);
_c+=_e.innerHTML;
}
return _c;
}
return null;
}else{
if(_5._editor.selection.getType()=="control"){
return null;
}
return _4.doc.selection.createRange().htmlText;
}
},getSelectedElement:function(){
if(_5._editor.selection.getType()=="control"){
if(_4.doc.getSelection){
var _f=_4.global.getSelection();
return _f.anchorNode.childNodes[_f.anchorOffset];
}else{
var _10=_4.doc.selection.createRange();
if(_10&&_10.item){
return _4.doc.selection.createRange().item(0);
}
}
}
return null;
},getParentElement:function(){
if(_5._editor.selection.getType()=="control"){
var p=this.getSelectedElement();
if(p){
return p.parentNode;
}
}else{
if(_4.doc.getSelection){
var _11=_4.global.getSelection();
if(_11){
var _12=_11.anchorNode;
while(_12&&(_12.nodeType!=1)){
_12=_12.parentNode;
}
return _12;
}
}else{
var r=_4.doc.selection.createRange();
r.collapse(true);
return r.parentElement();
}
}
return null;
},hasAncestorElement:function(_13){
return this.getAncestorElement.apply(this,arguments)!=null;
},getAncestorElement:function(_14){
var _15=this.getSelectedElement()||this.getParentElement();
return this.getParentOfType(_15,arguments);
},isTag:function(_16,_17){
if(_16&&_16.tagName){
var _18=_16.tagName.toLowerCase();
for(var i=0;i<_17.length;i++){
var _19=String(_17[i]).toLowerCase();
if(_18==_19){
return _19;
}
}
}
return "";
},getParentOfType:function(_1a,_1b){
while(_1a){
if(this.isTag(_1a,_1b).length){
return _1a;
}
_1a=_1a.parentNode;
}
return null;
},collapse:function(_1c){
if(_4.doc.getSelection){
var _1d=_4.global.getSelection();
if(_1d.removeAllRanges){
if(_1c){
_1d.collapseToStart();
}else{
_1d.collapseToEnd();
}
}else{
_1d.collapse(_1c);
}
}else{
var _1e=_4.doc.selection.createRange();
_1e.collapse(_1c);
_1e.select();
}
},remove:function(){
var sel=_4.doc.selection;
if(_4.doc.getSelection){
sel=_4.global.getSelection();
sel.deleteFromDocument();
return sel;
}else{
if(sel.type.toLowerCase()!="none"){
sel.clear();
}
return sel;
}
},selectElementChildren:function(_1f,_20){
var doc=_4.doc;
var _21;
_1f=_1.byId(_1f);
if(_4.doc.getSelection){
var _22=_4.global.getSelection();
if(_3("opera")){
if(_22.rangeCount){
_21=_22.getRangeAt(0);
}else{
_21=doc.createRange();
}
_21.setStart(_1f,0);
_21.setEnd(_1f,(_1f.nodeType==3)?_1f.length:_1f.childNodes.length);
_22.addRange(_21);
}else{
_22.selectAllChildren(_1f);
}
}else{
_21=_1f.ownerDocument.body.createTextRange();
_21.moveToElementText(_1f);
if(!_20){
try{
_21.select();
}
catch(e){
}
}
}
},selectElement:function(_23,_24){
var _25;
_23=_1.byId(_23);
var doc=_23.ownerDocument;
var _26=_4.global;
if(doc.getSelection){
var _27=_26.getSelection();
_25=doc.createRange();
if(_27.removeAllRanges){
if(_3("opera")){
if(_27.getRangeAt(0)){
_25=_27.getRangeAt(0);
}
}
_25.selectNode(_23);
_27.removeAllRanges();
_27.addRange(_25);
}
}else{
try{
var tg=_23.tagName?_23.tagName.toLowerCase():"";
if(tg==="img"||tg==="table"){
_25=_4.body(doc).createControlRange();
}else{
_25=_4.body(doc).createRange();
}
_25.addElement(_23);
if(!_24){
_25.select();
}
}
catch(e){
this.selectElementChildren(_23,_24);
}
}
},inSelection:function(_28){
if(_28){
var _29;
var doc=_4.doc;
var _2a;
if(_4.doc.getSelection){
var sel=_4.global.getSelection();
if(sel&&sel.rangeCount>0){
_2a=sel.getRangeAt(0);
}
if(_2a&&_2a.compareBoundaryPoints&&doc.createRange){
try{
_29=doc.createRange();
_29.setStart(_28,0);
if(_2a.compareBoundaryPoints(_2a.START_TO_END,_29)===1){
return true;
}
}
catch(e){
}
}
}else{
_2a=doc.selection.createRange();
try{
_29=_28.ownerDocument.body.createControlRange();
if(_29){
_29.addElement(_28);
}
}
catch(e1){
try{
_29=_28.ownerDocument.body.createTextRange();
_29.moveToElementText(_28);
}
catch(e2){
}
}
if(_2a&&_29){
if(_2a.compareEndPoints("EndToStart",_29)===1){
return true;
}
}
}
}
return false;
}};
_2.setObject("dijit._editor.selection",_6);
return _6;
});
