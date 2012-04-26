/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gantt.GanttTaskItem"]){
dojo._hasResource["dojox.gantt.GanttTaskItem"]=true;
dojo.provide("dojox.gantt.GanttTaskItem");
dojo.require("dojo.date.locale");
dojo.declare("dojox.gantt.GanttTaskControl",null,{constructor:function(_1,_2,_3){
this.ganttChart=_3;
this.project=_2;
this.taskItem=_1;
this.checkMove=false;
this.checkResize=false;
this.moveChild=false;
this.maxPosXMove=-1;
this.minPosXMove=-1;
this.maxWidthResize=-1;
this.minWidthResize=-1;
this.posX=0;
this.posY=0;
this.mouseX=0;
this.taskItemWidth=0;
this.isHide=false;
this.hideTasksHeight=0;
this.isExpanded=true;
this.descrTask=null;
this.cTaskItem=null;
this.cTaskNameItem=null;
this.parentTask=null;
this.predTask=null;
this.childTask=[];
this.childPredTask=[];
this.nextChildTask=null;
this.previousChildTask=null;
this.nextParentTask=null;
this.previousParentTask=null;
},createConnectingLinesPN:function(){
var _4=[];
var _5=dojo.create("div",{innerHTML:"&nbsp;",className:"ganttTaskLineVerticalLeft"},this.ganttChart.panelNames.firstChild);
var _6=this.cTaskNameItem[0],_7=this.parentTask.cTaskNameItem[0];
dojo.style(_5,{height:(_6.offsetTop-_7.offsetTop)+"px",top:(_7.offsetTop+5)+"px",left:(_7.offsetLeft-9)+"px"});
var _8=dojo.create("div",{noShade:true,color:"#000000",className:"ganttTaskLineHorizontalLeft"},this.ganttChart.panelNames.firstChild);
dojo.style(_8,{left:(_7.offsetLeft-9)+"px",top:(_6.offsetTop+5)+"px",height:"1px",width:(_6.offsetLeft-_7.offsetLeft+4)+"px"});
_4.push(_5);
_4.push(_8);
return _4;
},createConnectingLinesDS:function(){
var _9=this.ganttChart.contentData.firstChild;
var _a=[];
var _b=new Image();
var _b=dojo.create("div",{className:"ganttImageArrow"});
var _c=document.createElement("div");
var _d=document.createElement("div");
var _e=dojo.style(this.predTask.cTaskItem[0],"left");
var _f=dojo.style(this.predTask.cTaskItem[0],"top");
var _10=dojo.style(this.cTaskItem[0],"left");
var _11=this.posY+2;
var _12=parseInt(this.predTask.cTaskItem[0].firstChild.firstChild.width);
var _13=parseInt(this.predTask.cTaskItem[0].firstChild.firstChild.width);
if(_f<_11){
dojo.addClass(_c,"ganttTaskLineVerticalRight");
dojo.style(_c,{height:(_11-this.ganttChart.heightTaskItem/2-_f-3)+"px",width:"1px",left:(_e+_13-20)+"px",top:(_f+this.ganttChart.heightTaskItem)+"px"});
dojo.addClass(_d,"ganttTaskLineHorizontal");
dojo.style(_d,{width:(15+(_10-(_13+_e)))+"px",left:(_e+_13-20)+"px",top:(_11+2)+"px"});
dojo.addClass(_b,"ganttTaskArrowImg");
dojo.style(_b,{left:(_10-7)+"px",top:(_11-1)+"px"});
}else{
dojo.addClass(_c,"ganttTaskLineVerticalRightPlus");
dojo.style(_c,{height:(_f+2-_11)+"px",width:"1px",left:(_e+_13-20)+"px",top:(_11+2)+"px"});
dojo.addClass(_d,"ganttTaskLineHorizontalPlus");
dojo.style(_d,{width:(15+(_10-(_13+_e)))+"px",left:(_e+_13-20)+"px",top:(_11+2)+"px"});
dojo.addClass(_b,"ganttTaskArrowImgPlus");
dojo.style(_b,{left:(_10-7)+"px",top:(_11-1)+"px"});
}
_9.appendChild(_c);
_9.appendChild(_d);
_9.appendChild(_b);
_a.push(_c);
_a.push(_b);
_a.push(_d);
return _a;
},showChildTasks:function(_14,_15){
if(_15){
for(var i=0;i<_14.childTask.length;i++){
var _16=_14.childTask[i],_17=_16.cTaskItem[0],_18=_16.cTaskNameItem[0],_19=_16.cTaskItem[1],_1a=_16.cTaskNameItem[1],_1b=_16.cTaskItem[2],_1c=_16.cTaskNameItem[2];
if(_17.style.display=="none"){
_17.style.display="inline";
_18.style.display="inline";
_16.showDescTask();
_14.isHide=false;
if(_1c){
_1c.style.display="inline";
_15=_16.isExpanded;
}
for(var k=0;k<_19.length;k++){
_19[k].style.display="inline";
}
for(var k=0;k<_1a.length;k++){
_1a[k].style.display="inline";
}
(_16.taskIdentifier)&&(_16.taskIdentifier.style.display="inline");
this.hideTasksHeight+=this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
if(_16.childTask.length>0){
this.showChildTasks(_16,_15);
}
}
}
}
},hideChildTasks:function(_1d){
for(var i=0;i<_1d.childTask.length;i++){
var _1e=_1d.childTask[i],_1f=_1e.cTaskItem[0],_20=_1e.cTaskNameItem[0],_21=_1e.cTaskItem[1],_22=_1e.cTaskNameItem[1],_23=_1e.cTaskItem[2],_24=_1e.cTaskNameItem[2];
if(_1f.style.display!="none"){
_1f.style.display="none";
_20.style.display="none";
_1e.hideDescTask();
_1d.isHide=true;
if(_24){
_24.style.display="none";
}
for(var k=0;k<_21.length;k++){
_21[k].style.display="none";
}
for(var k=0;k<_22.length;k++){
_22[k].style.display="none";
}
(_1e.taskIdentifier)&&(_1e.taskIdentifier.style.display="none");
this.hideTasksHeight+=(this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra);
if(_1e.childTask.length>0){
this.hideChildTasks(_1e);
}
}
}
},shiftCurrentTasks:function(_25,_26){
this.shiftNextTask(this,_26);
_25.project.shiftNextProject(_25.project,_26);
},shiftTask:function(_27,_28){
_27.posY=_27.posY+_28;
var _29=_27.cTaskItem[0],_2a=_27.cTaskNameItem[0],_2b=_27.cTaskItem[1],_2c=_27.cTaskNameItem[1],_2d=_27.cTaskItem[2],_2e=_27.cTaskNameItem[2];
_2a.style.top=parseInt(_2a.style.top)+_28+"px";
if(_2e){
_2e.style.top=parseInt(_2e.style.top)+_28+"px";
}
if(_27.parentTask){
if(parseInt(this.cTaskNameItem[0].style.top)>parseInt(_27.parentTask.cTaskNameItem[0].style.top)&&(_2c[0].style.display!="none")){
_2c[0].style.height=parseInt(_2c[0].style.height)+_28+"px";
}else{
_2c[0].style.top=parseInt(_2c[0].style.top)+_28+"px";
}
_2c[1].style.top=parseInt(_2c[1].style.top)+_28+"px";
}
_29.style.top=parseInt(_29.style.top)+_28+"px";
_27.descrTask.style.top=parseInt(_27.descrTask.style.top)+_28+"px";
if(_27.predTask){
if(((parseInt(this.cTaskItem[0].style.top)>parseInt(_27.predTask.cTaskItem[0].style.top))||(this.cTaskItem[0].id==_27.predTask.taskItem.id))&&_2b[0].style.display!="none"){
_2b[0].style.height=parseInt(_2b[0].style.height)+_28+"px";
}else{
_2b[0].style.top=parseInt(_2b[0].style.top)+_28+"px";
}
_2b[1].style.top=parseInt(_2b[1].style.top)+_28+"px";
_2b[2].style.top=parseInt(_2b[2].style.top)+_28+"px";
}
},shiftNextTask:function(_2f,_30){
if(_2f.nextChildTask){
this.shiftTask(_2f.nextChildTask,_30);
this.shiftChildTask(_2f.nextChildTask,_30);
this.shiftNextTask(_2f.nextChildTask,_30);
}else{
if(_2f.parentTask){
this.shiftNextTask(_2f.parentTask,_30);
}else{
if(_2f.nextParentTask){
this.shiftTask(_2f.nextParentTask,_30);
this.shiftChildTask(_2f.nextParentTask,_30);
this.shiftNextTask(_2f.nextParentTask,_30);
}
}
}
},shiftChildTask:function(_31,_32){
dojo.forEach(_31.childTask,function(_33){
this.shiftTask(_33,_32);
if(_33.childTask.length>0){
this.shiftChildTask(_33,_32);
}
},this);
},endMove:function(){
var _34=this.cTaskItem[0];
var _35=dojo.style(_34,"left")-this.posX;
var _36=this.getDateOnPosition(dojo.style(_34,"left"));
_36=this.checkPos(_36);
if(this.checkMove){
_35=this.ganttChart.getPosOnDate(_36)-this.posX;
this.moveCurrentTaskItem(_35,this.moveChild);
this.project.shiftProjectItem();
}
this.checkMove=false;
this.posX=0;
this.maxPosXMove=-1;
this.minPosXMove=-1;
_34.childNodes[1].firstChild.rows[0].cells[0].innerHTML="";
this.adjustPanelTime();
if(this.ganttChart.resource){
this.ganttChart.resource.refresh();
}
},checkPos:function(_37){
var _38=this.cTaskItem[0];
var h=_37.getHours();
if(h>=12){
_37.setDate(_37.getDate()+1);
_37.setHours(0);
if((parseInt(_38.firstChild.firstChild.width)+this.ganttChart.getPosOnDate(_37)>this.maxPosXMove)&&(this.maxPosXMove!=-1)){
_37.setDate(_37.getDate()-1);
_37.setHours(0);
}
}else{
if((h<12)&&(h!=0)){
_37.setHours(0);
if((this.ganttChart.getPosOnDate(_37)<this.minPosXMove)){
_37.setDate(_37.getDate()+1);
}
}
}
_38.style.left=this.ganttChart.getPosOnDate(_37)+"px";
return _37;
},getMaxPosPredChildTaskItem:function(){
var _39=0;
var _3a=0;
for(var i=0;i<this.childPredTask.length;i++){
_3a=this.getMaxPosPredChildTaskItemInTree(this.childPredTask[i]);
if(_3a>_39){
_39=_3a;
}
}
return _39;
},getMaxPosPredChildTaskItemInTree:function(_3b){
var _3c=_3b.cTaskItem[0];
var _3d=parseInt(_3c.firstChild.firstChild.width)+dojo.style(_3c,"left");
var _3e=0;
var _3f=0;
dojo.forEach(_3b.childPredTask,function(_40){
_3f=this.getMaxPosPredChildTaskItemInTree(_40);
if(_3f>_3e){
_3e=_3f;
}
},this);
return _3e>_3d?_3e:_3d;
},moveCurrentTaskItem:function(_41,_42){
var _43=this.cTaskItem[0];
this.taskItem.startTime=new Date(this.ganttChart.startDate);
this.taskItem.startTime.setHours(this.taskItem.startTime.getHours()+(parseInt(_43.style.left)/this.ganttChart.pixelsPerHour));
this.showDescTask();
var _44=this.cTaskItem[1];
if(_44.length>0){
_44[2].style.width=parseInt(_44[2].style.width)+_41+"px";
_44[1].style.left=parseInt(_44[1].style.left)+_41+"px";
}
dojo.forEach(this.childTask,function(_45){
if(!_45.predTask){
this.moveChildTaskItems(_45,_41,_42);
}
},this);
dojo.forEach(this.childPredTask,function(_46){
this.moveChildTaskItems(_46,_41,_42);
},this);
},moveChildTaskItems:function(_47,_48,_49){
var _4a=_47.cTaskItem[0];
if(_49){
_4a.style.left=parseInt(_4a.style.left)+_48+"px";
_47.adjustPanelTime();
_47.taskItem.startTime=new Date(this.ganttChart.startDate);
_47.taskItem.startTime.setHours(_47.taskItem.startTime.getHours()+(parseInt(_4a.style.left)/this.ganttChart.pixelsPerHour));
var _4b=_47.cTaskItem[1];
dojo.forEach(_4b,function(_4c){
_4c.style.left=parseInt(_4c.style.left)+_48+"px";
},this);
dojo.forEach(_47.childTask,function(_4d){
if(!_4d.predTask){
this.moveChildTaskItems(_4d,_48,_49);
}
},this);
dojo.forEach(_47.childPredTask,function(_4e){
this.moveChildTaskItems(_4e,_48,_49);
},this);
}else{
var _4b=_47.cTaskItem[1];
if(_4b.length>0){
var _4f=_4b[0],_50=_4b[2];
_50.style.left=parseInt(_50.style.left)+_48+"px";
_50.style.width=parseInt(_50.style.width)-_48+"px";
_4f.style.left=parseInt(_4f.style.left)+_48+"px";
}
}
_47.moveDescTask();
},adjustPanelTime:function(){
var _51=this.cTaskItem[0];
var _52=parseInt(_51.style.left)+parseInt(_51.firstChild.firstChild.width)+this.ganttChart.panelTimeExpandDelta;
_52+=this.descrTask.offsetWidth;
this.ganttChart.adjustPanelTime(_52);
},getDateOnPosition:function(_53){
var _54=new Date(this.ganttChart.startDate);
_54.setHours(_54.getHours()+(_53/this.ganttChart.pixelsPerHour));
return _54;
},moveItem:function(_55){
var _56=_55.screenX;
var _57=(this.posX+(_56-this.mouseX));
var _58=parseInt(this.cTaskItem[0].childNodes[0].firstChild.width);
var _59=_57+_58;
if(this.checkMove){
if(((this.minPosXMove<=_57))&&((_59<=this.maxPosXMove)||(this.maxPosXMove==-1))){
this.moveTaskItem(_57);
}
}
},moveTaskItem:function(_5a){
var _5b=this.cTaskItem[0];
_5b.style.left=_5a+"px";
_5b.childNodes[1].firstChild.rows[0].cells[0].innerHTML=this.getDateOnPosition(_5a).getDate()+"."+(this.getDateOnPosition(_5a).getMonth()+1)+"."+this.getDateOnPosition(_5a).getUTCFullYear();
},resizeItem:function(_5c){
if(this.checkResize){
var _5d=this.cTaskItem[0];
var _5e=_5c.screenX;
var _5f=(_5e-this.mouseX);
var _60=this.taskItemWidth+(_5e-this.mouseX);
if(_60>=this.taskItemWidth){
if((_60<=this.maxWidthResize)||(this.maxWidthResize==-1)){
this.resizeTaskItem(_60);
}else{
if((this.maxWidthResize!=-1)&&(_60>this.maxWidthResize)){
this.resizeTaskItem(this.maxWidthResize);
}
}
}else{
if(_60<=this.taskItemWidth){
if(_60>=this.minWidthResize){
this.resizeTaskItem(_60);
}else{
if(_60<this.minWidthResize){
this.resizeTaskItem(this.minWidthResize);
}
}
}
}
}
},resizeTaskItem:function(_61){
var _62=this.cTaskItem[0];
var _63=Math.round(_61/this.ganttChart.pixelsPerWorkHour);
var _64=_62.childNodes[0].firstChild.rows[0],rc0=_64.cells[0],rc1=_64.cells[1];
rc0&&(rc0.firstChild.style.width=parseInt(rc0.width)*_61/100+"px");
rc1&&(rc1.firstChild.style.width=parseInt(rc1.width)*_61/100+"px");
_62.childNodes[0].firstChild.width=_61+"px";
_62.childNodes[1].firstChild.width=_61+"px";
this.cTaskItem[0].childNodes[1].firstChild.rows[0].cells[0].innerHTML=_63;
var _65=_62.childNodes[2];
_65.childNodes[0].style.width=_61+"px";
_65.childNodes[1].style.left=_61-10+"px";
},endResizeItem:function(){
var _66=this.cTaskItem[0];
if((this.taskItemWidth!=parseInt(_66.childNodes[0].firstChild.width))){
var _67=_66.offsetLeft;
var _68=_66.offsetLeft+parseInt(_66.childNodes[0].firstChild.width);
var _69=Math.round((_68-_67)/this.ganttChart.pixelsPerWorkHour);
this.taskItem.duration=_69;
if(this.childPredTask.length>0){
for(var j=0;j<this.childPredTask.length;j++){
var _6a=this.childPredTask[j].cTaskItem[1],_6b=_6a[0],_6c=_6a[2],_6d=_66.childNodes[0];
_6c.style.width=parseInt(_6c.style.width)-(parseInt(_6d.firstChild.width)-this.taskItemWidth)+"px";
_6c.style.left=parseInt(_6c.style.left)+(parseInt(_6d.firstChild.width)-this.taskItemWidth)+"px";
_6b.style.left=parseInt(_6b.style.left)+(parseInt(_6d.firstChild.width)-this.taskItemWidth)+"px";
}
}
}
this.cTaskItem[0].childNodes[1].firstChild.rows[0].cells[0].innerHTML="";
this.checkResize=false;
this.taskItemWidth=0;
this.mouseX=0;
this.showDescTask();
this.project.shiftProjectItem();
this.adjustPanelTime();
if(this.ganttChart.resource){
this.ganttChart.resource.refresh();
}
},startMove:function(_6e){
this.moveChild=_6e.ctrlKey;
this.mouseX=_6e.screenX;
this.getMoveInfo();
this.checkMove=true;
this.hideDescTask();
},showDescTask:function(){
var _6f=(parseInt(this.cTaskItem[0].style.left)+this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+10);
this.descrTask.style.left=_6f+"px";
this.descrTask.innerHTML=this.objKeyToStr(this.getTaskOwner());
this.descrTask.style.visibility="visible";
},hideDescTask:function(){
dojo.style(this.descrTask,"visibility","hidden");
},buildResourceInfo:function(_70){
if(this.childTask&&this.childTask.length>0){
for(var i=0;i<this.childTask.length;i++){
var _71=this.childTask[i];
_71.buildResourceInfo(_70);
}
}
if(dojo.trim(this.taskItem.taskOwner).length>0){
var _72=this.taskItem.taskOwner.split(";");
for(var i=0;i<_72.length;i++){
var o=_72[i];
if(dojo.trim(o).length<=0){
continue;
}
_70[o]?(_70[o].push(this)):(_70[o]=[this]);
}
}
},objKeyToStr:function(obj,_73){
var _74="";
_73=_73||" ";
if(obj){
for(var key in obj){
_74+=_73+key;
}
}
return _74;
},getTaskOwner:function(){
var _75={};
if(dojo.trim(this.taskItem.taskOwner).length>0){
var _76=this.taskItem.taskOwner.split(";");
for(var i=0;i<_76.length;i++){
var o=_76[i];
_75[o]=1;
}
}
dojo.forEach(this.childTask,function(_77){
dojo.mixin(_75,_77.getTaskOwner());
},this);
return _75;
},moveDescTask:function(){
var _78=(parseInt(this.cTaskItem[0].style.left)+this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+10);
this.descrTask.style.left=_78+"px";
},getMoveInfo:function(){
this.posX=parseInt(this.cTaskItem[0].style.left);
var _79=parseInt(this.cTaskItem[0].childNodes[0].firstChild.width);
var _7a=!this.parentTask?0:parseInt(this.parentTask.cTaskItem[0].style.left);
var _7b=!this.predTask?0:parseInt(this.predTask.cTaskItem[0].style.left)+parseInt(this.predTask.cTaskItem[0].childNodes[0].firstChild.width);
var _7c=!this.parentTask?0:parseInt(this.parentTask.cTaskItem[0].childNodes[0].firstChild.width);
var _7d=0;
var _7e=0;
var _7f=0;
if(this.childPredTask.length>0){
var _80=null;
dojo.forEach(this.childPredTask,function(_81){
if((!_80)||((_80)&&(_80>parseInt(_81.cTaskItem[0].style.left)))){
_80=parseInt(_81.cTaskItem[0].style.left);
}
},this);
_7d=_80;
}
if(this.childTask.length>0){
var _82=null;
dojo.forEach(this.childTask,function(_83){
if((!_82)||((_82)&&(_82>(parseInt(_83.cTaskItem[0].style.left))))){
_82=parseInt(_83.cTaskItem[0].style.left);
}
},this);
_7f=_82;
var _80=null;
dojo.forEach(this.childTask,function(_84){
if((!_80)||((_80)&&(_80<(parseInt(_84.cTaskItem[0].style.left)+parseInt(_84.cTaskItem[0].firstChild.firstChild.width))))){
_80=parseInt(_84.cTaskItem[0].style.left)+parseInt(_84.cTaskItem[0].firstChild.firstChild.width);
}
},this);
_7e=_80;
}
if(!this.moveChild){
if(this.childPredTask.length>0){
if(this.maxPosXMove<_7d){
this.maxPosXMove=_7d;
}
}
if(this.childTask.length>0){
if((this.childPredTask.length>0)&&(this.maxPosXMove-_79)>_7f){
this.maxPosXMove=this.maxPosXMove-((this.maxPosXMove-_79)-_7f);
}
if(!(this.childPredTask.length>0)){
this.maxPosXMove=_7f+_79;
}
this.minPosXMove=(_7e-_79);
}
if(_7a>0){
if((!(this.childPredTask.length>0))&&(this.childTask.length>0)){
if(this.maxPosXMove>_7a+_7c){
this.maxPosXMove=_7a+_7c;
}
}
if(this.minPosXMove<=_7a){
this.minPosXMove=_7a;
}
if((!(this.childTask.length>0))&&(!(this.childPredTask.length>0))){
this.maxPosXMove=_7a+_7c;
}else{
if((!(this.childTask.length>0))&&(this.childPredTask.length>0)){
if((_7a+_7c)>_7b){
this.maxPosXMove=_7d;
}
}
}
}
if(_7b>0){
if(this.minPosXMove<=_7b){
this.minPosXMove=_7b;
}
}
if((_7b==0)&&(_7a==0)){
if(this.minPosXMove<=this.ganttChart.initialPos){
this.minPosXMove=this.ganttChart.initialPos;
}
}
}else{
if((_7a>0)&&(_7b==0)){
this.minPosXMove=_7a;
this.maxPosXMove=_7a+_7c;
}else{
if((_7a==0)&&(_7b==0)){
this.minPosXMove=this.ganttChart.initialPos;
this.maxPosXMove=-1;
}else{
if((_7a>0)&&(_7b>0)){
this.minPosXMove=_7b;
this.maxPosXMove=_7a+_7c;
}else{
if((_7a==0)&&(_7b>0)){
this.minPosXMove=_7b;
this.maxPosXMove=-1;
}
}
}
}
if((this.parentTask)&&(this.childPredTask.length>0)){
var _80=this.getMaxPosPredChildTaskItem(this);
var _7a=parseInt(this.parentTask.cTaskItem[0].style.left)+parseInt(this.parentTask.cTaskItem[0].firstChild.firstChild.width);
this.maxPosXMove=this.posX+_79+_7a-_80;
}
}
},startResize:function(_85){
this.mouseX=_85.screenX;
this.getResizeInfo();
this.hideDescTask();
this.checkResize=true;
this.taskItemWidth=parseInt(this.cTaskItem[0].firstChild.firstChild.width);
},getResizeInfo:function(){
var _86=this.cTaskItem[0];
var _87=!this.parentTask?0:parseInt(this.parentTask.cTaskItem[0].style.left);
var _88=!this.parentTask?0:parseInt(this.parentTask.cTaskItem[0].childNodes[0].firstChild.width);
var _89=parseInt(_86.style.left);
var _8a=0;
var _8b=0;
if(this.childPredTask.length>0){
var _8c=null;
dojo.forEach(this.childPredTask,function(_8d){
if((!_8c)||((_8c)&&(_8c>parseInt(_8d.cTaskItem[0].style.left)))){
_8c=parseInt(_8d.cTaskItem[0].style.left);
}
},this);
_8a=_8c;
}
if(this.childTask.length>0){
var _8c=null;
dojo.forEach(this.childTask,function(_8e){
if((!_8c)||((_8c)&&(_8c<(parseInt(_8e.cTaskItem[0].style.left)+parseInt(_8e.cTaskItem[0].firstChild.firstChild.width))))){
_8c=parseInt(_8e.cTaskItem[0].style.left)+parseInt(_8e.cTaskItem[0].firstChild.firstChild.width);
}
},this);
_8b=_8c;
}
this.minWidthResize=this.ganttChart.pixelsPerDay;
if(this.childTask.length>0){
this.minWidthResize=_8b-_89;
}
if((this.childPredTask.length>0)&&(!this.parentTask)){
this.maxWidthResize=_8a-_89;
}else{
if((this.childPredTask.length>0)&&(this.parentTask)){
var w1=_87+_88-_89;
var w2=_8a-_89;
this.maxWidthResize=Math.min(w1,w2);
}else{
if((this.childPredTask.length==0)&&(this.parentTask)){
this.maxWidthResize=_87+_88-_89;
}
}
}
},createTaskItem:function(){
this.posX=this.ganttChart.getPosOnDate(this.taskItem.startTime);
var _8f=dojo.create("div",{id:this.taskItem.id,className:"ganttTaskItemControl"});
dojo.style(_8f,{left:this.posX+"px",top:this.posY+"px"});
var _90=dojo.create("div",{className:"ganttTaskDivTaskItem"},_8f);
var _91=dojo.create("table",{cellPadding:"0",cellSpacing:"0",width:this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px",className:"ganttTaskTblTaskItem"},_90);
var _92=_91.insertRow(_91.rows.length);
if(this.taskItem.percentage!=0){
var _93=dojo.create("td",{height:this.ganttChart.heightTaskItem+"px",width:this.taskItem.percentage+"%"},_92);
_93.style.lineHeight="1px";
var _94=dojo.create("div",{className:"ganttImageTaskProgressFilled"},_93);
dojo.style(_94,{width:(this.taskItem.percentage*this.taskItem.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}
if(this.taskItem.percentage!=100){
var _93=dojo.create("td",{height:this.ganttChart.heightTaskItem+"px",width:(100-this.taskItem.percentage)+"%"},_92);
_93.style.lineHeight="1px";
var _95=dojo.create("div",{className:"ganttImageTaskProgressBg"},_93);
dojo.style(_95,{width:((100-this.taskItem.percentage)*this.taskItem.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}
if(this.ganttChart.isContentEditable){
var _96=dojo.create("div",{className:"ganttTaskDivTaskInfo"},_8f);
var _97=dojo.create("table",{cellPadding:"0",cellSpacing:"0",height:this.ganttChart.heightTaskItem+"px",width:this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px"},_96);
var _98=_97.insertRow(0);
var _99=dojo.create("td",{align:"center",vAlign:"top",height:this.ganttChart.heightTaskItem+"px",className:"ganttMoveInfo"},_98);
var _9a=dojo.create("div",{className:"ganttTaskDivTaskName"},_8f);
var _9b=dojo.create("div",{},_9a);
dojo.create("input",{className:"ganttTaskDivMoveInput",type:"text"},_9b);
dojo.isIE&&dojo.style(_9b,{background:"#000000",filter:"alpha(opacity=0)"});
dojo.style(_9b,{height:this.ganttChart.heightTaskItem+"px",width:this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px"});
var _9c=dojo.create("div",{className:"ganttTaskDivResize"},_9a);
dojo.create("input",{className:"ganttTaskDivResizeInput",type:"text"},_9c);
dojo.style(_9c,{left:(this.taskItem.duration*this.ganttChart.pixelsPerWorkHour-10)+"px",height:this.ganttChart.heightTaskItem+"px",width:"10px"});
this.ganttChart._events.push(dojo.connect(_9b,"onmousedown",this,function(_9d){
this.moveMoveConn=dojo.connect(document,"onmousemove",this,function(e){
this.checkMove&&this.moveItem(e);
});
this.moveUpConn=dojo.connect(document,"onmouseup",this,function(e){
if(this.checkMove){
this.endMove();
this.ganttChart.isMoving=false;
document.body.releaseCapture&&document.body.releaseCapture();
dojo.disconnect(this.moveMoveConn);
dojo.disconnect(this.moveUpConn);
}
});
this.startMove(_9d);
this.ganttChart.isMoving=true;
document.body.setCapture&&document.body.setCapture(false);
}));
this.ganttChart._events.push(dojo.connect(_9b,"onmouseover",this,function(_9e){
_9e.target&&(_9e.target.style.cursor="move");
}));
this.ganttChart._events.push(dojo.connect(_9b,"onmouseout",this,function(_9f){
_9f.target.style.cursor="";
}));
this.ganttChart._events.push(dojo.connect(_9c,"onmousedown",this,function(_a0){
this.resizeMoveConn=dojo.connect(document,"onmousemove",this,function(e){
this.checkResize&&this.resizeItem(e);
});
this.resizeUpConn=dojo.connect(document,"onmouseup",this,function(e){
if(this.checkResize){
this.endResizeItem();
this.ganttChart.isResizing=false;
document.body.releaseCapture&&document.body.releaseCapture();
dojo.disconnect(this.resizeMoveConn);
dojo.disconnect(this.resizeUpConn);
}
});
this.startResize(_a0);
this.ganttChart.isResizing=true;
document.body.setCapture&&document.body.setCapture(false);
}));
this.ganttChart._events.push(dojo.connect(_9c,"onmouseover",this,function(_a1){
(!this.ganttChart.isMoving)&&(!this.ganttChart.isResizing)&&_a1.target&&(_a1.target.style.cursor="e-resize");
}));
this.ganttChart._events.push(dojo.connect(_9c,"onmouseout",this,function(_a2){
!this.checkResize&&_a2.target&&(_a2.target.style.cursor="");
}));
}
return _8f;
},createTaskNameItem:function(){
var _a3=dojo.create("div",{id:this.taskItem.id,className:"ganttTaskTaskNameItem",title:this.taskItem.name+", id: "+this.taskItem.id+" ",innerHTML:this.taskItem.name});
dojo.style(_a3,"top",this.posY+"px");
dojo.attr(_a3,"tabIndex",0);
if(this.ganttChart.isShowConMenu){
this.ganttChart._events.push(dojo.connect(_a3,"onmouseover",this,function(_a4){
dojo.addClass(_a3,"ganttTaskTaskNameItemHover");
clearTimeout(this.ganttChart.menuTimer);
this.ganttChart.tabMenu.clear();
this.ganttChart.tabMenu.show(_a4.target,this);
}));
this.ganttChart._events.push(dojo.connect(_a3,"onkeydown",this,function(_a5){
if(_a5.keyCode==dojo.keys.ENTER){
this.ganttChart.tabMenu.clear();
this.ganttChart.tabMenu.show(_a5.target,this);
}
if(this.ganttChart.tabMenu.isShow&&(_a5.keyCode==dojo.keys.LEFT_ARROW||_a5.keyCode==dojo.keys.RIGHT_ARROW)){
dijit.focus(this.ganttChart.tabMenu.menuPanel.firstChild.rows[0].cells[0]);
}
if(this.ganttChart.tabMenu.isShow&&_a5.keyCode==dojo.keys.ESCAPE){
this.ganttChart.tabMenu.hide();
}
}));
this.ganttChart._events.push(dojo.connect(_a3,"onmouseout",this,function(){
dojo.removeClass(_a3,"ganttTaskTaskNameItemHover");
clearTimeout(this.ganttChart.menuTimer);
this.ganttChart.menuTimer=setTimeout(dojo.hitch(this,function(){
this.ganttChart.tabMenu.hide();
}),200);
}));
this.ganttChart._events.push(dojo.connect(this.ganttChart.tabMenu.menuPanel,"onmouseover",this,function(){
clearTimeout(this.ganttChart.menuTimer);
}));
this.ganttChart._events.push(dojo.connect(this.ganttChart.tabMenu.menuPanel,"onkeydown",this,function(_a6){
if(this.ganttChart.tabMenu.isShow&&_a6.keyCode==dojo.keys.ESCAPE){
this.ganttChart.tabMenu.hide();
}
}));
this.ganttChart._events.push(dojo.connect(this.ganttChart.tabMenu.menuPanel,"onmouseout",this,function(){
clearTimeout(this.ganttChart.menuTimer);
this.ganttChart.menuTimer=setTimeout(dojo.hitch(this,function(){
this.ganttChart.tabMenu.hide();
}),200);
}));
}
return _a3;
},createTaskDescItem:function(){
var _a7=(this.posX+this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+10);
var _a8=dojo.create("div",{innerHTML:this.objKeyToStr(this.getTaskOwner()),className:"ganttTaskDescTask"});
dojo.style(_a8,{left:_a7+"px",top:this.posY+"px"});
return this.descrTask=_a8;
},checkWidthTaskNameItem:function(){
if(this.cTaskNameItem[0].offsetWidth+this.cTaskNameItem[0].offsetLeft>this.ganttChart.maxWidthTaskNames){
var _a9=this.cTaskNameItem[0].offsetWidth+this.cTaskNameItem[0].offsetLeft-this.ganttChart.maxWidthTaskNames;
var _aa=Math.round(_a9/(this.cTaskNameItem[0].offsetWidth/this.cTaskNameItem[0].firstChild.length));
var _ab=this.taskItem.name.substring(0,this.cTaskNameItem[0].firstChild.length-_aa-3);
_ab+="...";
this.cTaskNameItem[0].innerHTML=_ab;
}
},refreshTaskItem:function(_ac){
this.posX=this.ganttChart.getPosOnDate(this.taskItem.startTime);
dojo.style(_ac,{"left":this.posX+"px"});
var _ad=_ac.childNodes[0];
var _ae=_ad.firstChild;
_ae.width=(!this.taskItem.duration?1:this.taskItem.duration*this.ganttChart.pixelsPerWorkHour)+"px";
var _af=_ae.rows[0];
if(this.taskItem.percentage!=0){
var _b0=_af.firstChild;
_b0.height=this.ganttChart.heightTaskItem+"px";
_b0.width=this.taskItem.percentage+"%";
_b0.style.lineHeight="1px";
var _b1=_b0.firstChild;
dojo.style(_b1,{width:(!this.taskItem.duration?1:(this.taskItem.percentage*this.taskItem.duration*this.ganttChart.pixelsPerWorkHour/100))+"px",height:this.ganttChart.heightTaskItem+"px"});
}
if(this.taskItem.percentage!=100){
var _b0=_af.lastChild;
_b0.height=this.ganttChart.heightTaskItem+"px";
_b0.width=(100-this.taskItem.percentage)+"%";
_b0.style.lineHeight="1px";
var _b2=_b0.firstChild;
dojo.style(_b2,{width:(!this.taskItem.duration?1:((100-this.taskItem.percentage)*this.taskItem.duration*this.ganttChart.pixelsPerWorkHour/100))+"px",height:this.ganttChart.heightTaskItem+"px"});
}
if(this.ganttChart.isContentEditable){
var _b3=_ac.childNodes[1];
var _b4=_b3.firstChild;
_b4.height=this.ganttChart.heightTaskItem+"px";
_b4.width=(!this.taskItem.duration?1:(this.taskItem.duration*this.ganttChart.pixelsPerWorkHour))+"px";
var _b5=_b4.rows[0];
var _b6=_b5.firstChild;
_b6.height=this.ganttChart.heightTaskItem+"px";
var _b7=_ac.childNodes[2];
var _b8=_b7.firstChild;
_b8.style.height=this.ganttChart.heightTaskItem+"px";
_b8.style.width=(!this.taskItem.duration?1:(this.taskItem.duration*this.ganttChart.pixelsPerWorkHour))+"px";
var _b9=_b7.lastChild;
dojo.style(_b9,{"left":(this.taskItem.duration*this.ganttChart.pixelsPerWorkHour-10)+"px"});
_b9.style.height=this.ganttChart.heightTaskItem+"px";
_b9.style.width="10px";
}
return _ac;
},refreshTaskDesc:function(_ba){
var _bb=(this.posX+this.taskItem.duration*this.ganttChart.pixelsPerWorkHour+10);
dojo.style(_ba,{"left":_bb+"px"});
return _ba;
},refreshConnectingLinesDS:function(_bc){
var _bd=_bc[1];
var _be=_bc[0];
var _bf=_bc[2];
var _c0=dojo.style(this.predTask.cTaskItem[0],"left");
var _c1=dojo.style(this.predTask.cTaskItem[0],"top");
var _c2=dojo.style(this.cTaskItem[0],"left");
var _c3=this.posY+2;
var _c4=parseInt(this.predTask.cTaskItem[0].firstChild.firstChild.width);
var _c5=parseInt(this.predTask.cTaskItem[0].firstChild.firstChild.width);
if(_c1<_c3){
dojo.style(_be,{"height":(_c3-this.ganttChart.heightTaskItem/2-_c1-3)+"px","left":(_c0+_c5-20)+"px"});
dojo.style(_bf,{"width":(15+(_c2-(_c5+_c0)))+"px","left":(_c0+_c5-20)+"px"});
dojo.style(_bd,{"left":(_c2-7)+"px"});
}else{
dojo.style(_be,{"height":(_c1+2-_c3)+"px","left":(_c0+_c5-20)+"px"});
dojo.style(_bf,{"width":(15+(_c2-(_c5+_c0)))+"px","left":(_c0+_c5-20)+"px"});
dojo.style(_bd,{"left":(_c2-7)+"px"});
}
return _bc;
},postLoadData:function(){
},refresh:function(){
if(this.childTask&&this.childTask.length>0){
dojo.forEach(this.childTask,function(_c6){
_c6.refresh();
},this);
}
this.refreshTaskItem(this.cTaskItem[0]);
this.refreshTaskDesc(this.cTaskItem[0].nextSibling);
var _c7=[];
if(this.taskItem.previousTask&&this.predTask){
this.refreshConnectingLinesDS(this.cTaskItem[1]);
}
return this;
},create:function(){
var _c8=this.ganttChart.contentData.firstChild;
var _c9=this.ganttChart.panelNames.firstChild;
var _ca=this.taskItem.previousTask;
var _cb=this.taskItem.parentTask;
var _cc=(this.taskItem.cldTasks.length>0)?true:false;
this.cTaskItem=[];
this.cTaskNameItem=[];
if(!_cb){
if(this.taskItem.previousParentTask){
this.previousParentTask=this.project.getTaskById(this.taskItem.previousParentTask.id);
var _cd=this.ganttChart.getLastChildTask(this.previousParentTask);
this.posY=parseInt(_cd.cTaskItem[0].style.top)+this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
this.previousParentTask.nextParentTask=this;
}else{
this.posY=parseInt(this.project.projectItem[0].style.top)+this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
}
}
if(_cb){
var _ce=this.project.getTaskById(this.taskItem.parentTask.id);
this.parentTask=_ce;
if(this.taskItem.previousChildTask){
this.previousChildTask=this.project.getTaskById(this.taskItem.previousChildTask.id);
var _cd=this.ganttChart.getLastChildTask(this.previousChildTask);
this.posY=dojo.style(_cd.cTaskItem[0],"top")+this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
this.previousChildTask.nextChildTask=this;
}else{
this.posY=dojo.style(_ce.cTaskItem[0],"top")+this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
}
_ce.childTask.push(this);
}
if(_ca){
var _ce=this.project.getTaskById(_ca.id);
this.predTask=_ce;
_ce.childPredTask.push(this);
}
this.cTaskItem.push(this.createTaskItem());
_c8.appendChild(this.cTaskItem[0]);
if(this.ganttChart.panelNames){
this.cTaskNameItem.push(this.createTaskNameItem());
this.ganttChart.panelNames.firstChild.appendChild(this.cTaskNameItem[0]);
}
_c8.appendChild(this.createTaskDescItem());
var _cf=[];
if(_ca){
_cf=this.createConnectingLinesDS();
}
this.cTaskItem.push(_cf);
if(this.ganttChart.panelNames){
var _d0=[];
if(_cb){
this.cTaskNameItem[0].style.left=dojo.style(this.parentTask.cTaskNameItem[0],"left")+15+"px";
_d0=this.createConnectingLinesPN();
}
this.checkWidthTaskNameItem();
this.checkPosition();
var _d1=null;
if(_cc){
_d1=this.createTreeImg();
}
this.cTaskNameItem.push(_d0);
this.cTaskNameItem.push(_d1);
}
this.adjustPanelTime();
return this;
},checkPosition:function(){
if(!this.ganttChart.withTaskId){
return;
}
var pos=dojo.coords(this.cTaskNameItem[0],true);
if(this.taskIdentifier){
if(this.childTask&&this.childTask.length>0){
dojo.forEach(this.childTask,function(_d2){
_d2.checkPosition();
},this);
}
dojo.style(this.taskIdentifier,{"left":(pos.l+pos.w+4)+"px","top":(pos.t-1)+"px"});
}else{
this.taskIdentifier=dojo.create("div",{id:"TaskId_"+this.taskItem.id,className:"ganttTaskIdentifier",title:this.taskItem.id,innerHTML:this.taskItem.id},this.cTaskNameItem[0].parentNode);
dojo.style(this.taskIdentifier,{left:(pos.l+pos.w+4)+"px",top:(pos.t-1)+"px"});
}
},createTreeImg:function(){
var _d3=dojo.create("div",{id:this.taskItem.id,className:"ganttImageTreeCollapse"});
dojo.attr(_d3,"tabIndex",0);
dojo.forEach(["onclick","onkeydown"],function(e){
this.ganttChart._events.push(dojo.connect(_d3,e,this,function(evt){
if(e=="onkeydown"&&evt.keyCode!=dojo.keys.ENTER){
return;
}
if(this.isExpanded){
dojo.removeClass(_d3,"ganttImageTreeCollapse");
dojo.addClass(_d3,"ganttImageTreeExpand");
this.isExpanded=false;
this.hideChildTasks(this);
this.shiftCurrentTasks(this,-this.hideTasksHeight);
this.ganttChart.checkPosition();
}else{
dojo.removeClass(_d3,"ganttImageTreeExpand");
dojo.addClass(_d3,"ganttImageTreeCollapse");
this.isExpanded=true;
this.shiftCurrentTasks(this,this.hideTasksHeight);
this.showChildTasks(this,true);
this.hideTasksHeight=0;
this.ganttChart.checkPosition();
}
}));
},this);
this.ganttChart.panelNames.firstChild.appendChild(_d3);
dojo.addClass(_d3,"ganttTaskTreeImage");
dojo.style(_d3,{left:(dojo.style(this.cTaskNameItem[0],"left")-12)+"px",top:(dojo.style(this.cTaskNameItem[0],"top")+3)+"px"});
return _d3;
},setPreviousTask:function(_d4){
if(_d4==""){
this.clearPredTask();
}else{
var _d5=this.taskItem;
if(_d5.id==_d4){
return false;
}
var _d6=this.project.getTaskById(_d4);
if(!_d6){
return false;
}
var _d7=_d6.taskItem;
var a1=_d7.parentTask==null,a2=_d5.parentTask==null;
if(a1&&!a2||!a1&&a2||!a1&&!a2&&(_d7.parentTask.id!=_d5.parentTask.id)){
return false;
}
var _d8=_d5.startTime.getTime(),_d9=_d7.startTime.getTime(),_da=_d7.duration*24*60*60*1000/_d6.ganttChart.hsPerDay;
if((_d9+_da)>_d8){
return false;
}
this.clearPredTask();
if(!this.ganttChart.checkPosPreviousTask(_d7,_d5)){
this.ganttChart.correctPosPreviousTask(_d7,_d5,this);
}
_d5.previousTaskId=_d4;
_d5.previousTask=_d7;
this.predTask=_d6;
_d6.childPredTask.push(this);
this.cTaskItem[1]=this.createConnectingLinesDS();
}
return true;
},clearPredTask:function(){
if(this.predTask){
var ch=this.predTask.childPredTask;
for(var i=0;i<ch.length;i++){
if(ch[i]==this){
ch.splice(i,1);
break;
}
}
for(var i=0;i<this.cTaskItem[1].length;i++){
this.cTaskItem[1][i].parentNode.removeChild(this.cTaskItem[1][i]);
}
this.cTaskItem[1]=[];
this.taskItem.previousTaskId=null;
this.taskItem.previousTask=null;
this.predTask=null;
}
},setStartTime:function(_db,_dc){
this.moveChild=_dc;
this.getMoveInfo();
var pos=this.ganttChart.getPosOnDate(_db);
if((parseInt(this.cTaskItem[0].firstChild.firstChild.width)+pos>this.maxPosXMove)&&(this.maxPosXMove!=-1)){
this.maxPosXMove=-1;
this.minPosXMove=-1;
return false;
}
if(pos<this.minPosXMove){
this.maxPosXMove=-1;
this.minPosXMove=-1;
return false;
}
this.cTaskItem[0].style.left=pos;
var _dd=pos-this.posX;
this.moveCurrentTaskItem(_dd,_dc);
this.project.shiftProjectItem();
this.descrTask.innerHTML=this.objKeyToStr(this.getTaskOwner());
this.adjustPanelTime();
this.posX=0;
this.maxPosXMove=-1;
this.minPosXMove=-1;
return true;
},setDuration:function(_de){
this.getResizeInfo();
var _df=this.ganttChart.getWidthOnDuration(_de);
if((_df>this.maxWidthResize)&&(this.maxWidthResize!=-1)){
return false;
}else{
if(_df<this.minWidthResize){
return false;
}else{
this.taskItemWidth=parseInt(this.cTaskItem[0].firstChild.firstChild.width);
this.resizeTaskItem(_df);
this.endResizeItem();
this.descrTask.innerHTML=this.objKeyToStr(this.getTaskOwner());
return true;
}
}
},setTaskOwner:function(_e0){
_e0=(_e0==null||_e0==undefined)?"":_e0;
this.taskItem.taskOwner=_e0;
this.descrTask.innerHTML=this.objKeyToStr(this.getTaskOwner());
return true;
},setPercentCompleted:function(_e1){
_e1=parseInt(_e1);
if(isNaN(_e1)||_e1>100||_e1<0){
return false;
}
var _e2=this.cTaskItem[0].childNodes[0].firstChild.rows[0],rc0=_e2.cells[0],rc1=_e2.cells[1];
if((_e1!=0)&&(_e1!=100)){
if((this.taskItem.percentage!=0)&&(this.taskItem.percentage!=100)){
rc0.width=_e1+"%";
rc1.width=100-_e1+"%";
}else{
if((this.taskItem.percentage==0)||(this.taskItem.percentage==100)){
rc0.parentNode.removeChild(rc0);
var _e3=dojo.create("td",{height:this.ganttChart.heightTaskItem+"px",width:_e1+"%"},_e2);
_e3.style.lineHeight="1px";
var _e4=dojo.create("div",{className:"ganttImageTaskProgressFilled"},_e3);
dojo.style(_e4,{width:(_e1*this.taskItem.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
_e3=dojo.create("td",{height:this.ganttChart.heightTaskItem+"px",width:(100-_e1)+"%"},_e2);
_e3.style.lineHeight="1px";
_e4=dojo.create("div",{className:"ganttImageTaskProgressBg"},_e3);
dojo.style(_e4,{width:((100-_e1)*this.taskItem.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}
}
}else{
if(_e1==0){
if((this.taskItem.percentage!=0)&&(this.taskItem.percentage!=100)){
rc0.parentNode.removeChild(rc0);
rc1.width=100+"%";
}else{
dojo.removeClass(rc0.firstChild,"ganttImageTaskProgressFilled");
dojo.addClass(rc0.firstChild,"ganttImageTaskProgressBg");
}
}else{
if(_e1==100){
if((this.taskItem.percentage!=0)&&(this.taskItem.percentage!=100)){
rc1.parentNode.removeChild(rc1);
rc0.width=100+"%";
}else{
dojo.removeClass(rc0.firstChild,"ganttImageTaskProgressBg");
dojo.addClass(rc0.firstChild,"ganttImageTaskProgressFilled");
}
}
}
}
this.taskItem.percentage=_e1;
this.taskItemWidth=parseInt(this.cTaskItem[0].firstChild.firstChild.width);
this.resizeTaskItem(this.taskItemWidth);
this.endResizeItem();
this.descrTask.innerHTML=this.objKeyToStr(this.getTaskOwner());
return true;
},setName:function(_e5){
if(_e5){
this.taskItem.name=_e5;
this.cTaskNameItem[0].innerHTML=_e5;
this.cTaskNameItem[0].title=_e5;
this.checkWidthTaskNameItem();
this.checkPosition();
this.descrTask.innerHTML=this.objKeyToStr(this.getTaskOwner());
this.adjustPanelTime();
}
}});
dojo.declare("dojox.gantt.GanttTaskItem",null,{constructor:function(_e6){
this.id=_e6.id;
this.name=_e6.name||this.id;
this.startTime=_e6.startTime||new Date();
this.duration=_e6.duration||8;
this.percentage=_e6.percentage||0;
this.previousTaskId=_e6.previousTaskId||"";
this.taskOwner=_e6.taskOwner||"";
this.cldTasks=[];
this.cldPreTasks=[];
this.parentTask=null;
this.previousTask=null;
this.project=null;
this.nextChildTask=null;
this.previousChildTask=null;
this.nextParentTask=null;
this.previousParentTask=null;
},addChildTask:function(_e7){
this.cldTasks.push(_e7);
_e7.parentTask=this;
},setProject:function(_e8){
this.project=_e8;
for(var j=0;j<this.cldTasks.length;j++){
this.cldTasks[j].setProject(_e8);
}
}});
}
