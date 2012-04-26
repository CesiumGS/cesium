/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gantt.GanttProjectItem"]){
dojo._hasResource["dojox.gantt.GanttProjectItem"]=true;
dojo.provide("dojox.gantt.GanttProjectItem");
dojo.require("dojox.gantt.GanttTaskItem");
dojo.require("dojo.date.locale");
dojo.declare("dojox.gantt.GanttProjectControl",null,{constructor:function(_1,_2){
this.project=_2;
this.ganttChart=_1;
this.descrProject=null;
this.projectItem=null;
this.projectNameItem=null;
this.posY=0;
this.posX=0;
this.nextProject=null;
this.previousProject=null;
this.arrTasks=[];
this.percentage=0;
this.duration=0;
},checkWidthProjectNameItem:function(){
if(this.projectNameItem.offsetWidth+this.projectNameItem.offsetLeft>this.ganttChart.maxWidthTaskNames){
var _3=this.projectNameItem.offsetWidth+this.projectNameItem.offsetLeft-this.ganttChart.maxWidthTaskNames;
var _4=Math.round(_3/(this.projectNameItem.offsetWidth/this.projectNameItem.firstChild.length));
var _5=this.project.name.substring(0,this.projectNameItem.firstChild.length-_4-3);
_5+="...";
this.projectNameItem.innerHTML=_5;
}
},refreshProjectItem:function(_6){
this.percentage=this.getPercentCompleted();
dojo.style(_6,{"left":this.posX+"px","width":this.duration*this.ganttChart.pixelsPerWorkHour+"px"});
var _7=_6.firstChild;
var _8=this.duration*this.ganttChart.pixelsPerWorkHour;
_7.width=((_8==0)?1:_8)+"px";
_7.style.width=((_8==0)?1:_8)+"px";
var _9=_7.rows[0];
if(this.percentage!=-1){
if(this.percentage!=0){
var _a=_9.firstChild;
_a.width=this.percentage+"%";
var _b=_a.firstChild;
dojo.style(_b,{width:(!this.duration?1:(this.percentage*this.duration*this.ganttChart.pixelsPerWorkHour/100))+"px",height:this.ganttChart.heightTaskItem+"px"});
}
if(this.percentage!=100){
var _a=_9.lastChild;
_a.width=(100-this.percentage)+"%";
var _b=_a.firstChild;
dojo.style(_b,{width:(!this.duration?1:((100-this.percentage)*this.duration*this.ganttChart.pixelsPerWorkHour/100))+"px",height:this.ganttChart.heightTaskItem+"px"});
}
}else{
var _a=_9.firstChild;
_a.width="1px";
var _b=_a.firstChild;
dojo.style(_b,{width:"1px",height:this.ganttChart.heightTaskItem+"px"});
}
var _c=_6.lastChild;
var _d=_c.firstChild;
dojo.style(_d,{height:this.ganttChart.heightTaskItem+"px",width:(!this.duration?1:(this.duration*this.ganttChart.pixelsPerWorkHour))+"px"});
var _e=_d.rows[0];
var _f=_e.firstChild;
_f.height=this.ganttChart.heightTaskItem+"px";
if(this.project.parentTasks.length==0){
_6.style.display="none";
}
return _6;
},refreshDescrProject:function(_10){
var _11=(this.posX+this.duration*this.ganttChart.pixelsPerWorkHour+10);
dojo.style(_10,{"left":_11+"px"});
if(this.project.parentTasks.length==0){
this.descrProject.style.visibility="hidden";
}
return _10;
},postLoadData:function(){
},refresh:function(){
var _12=this.ganttChart.contentData.firstChild;
this.posX=(this.project.startDate-this.ganttChart.startDate)/(60*60*1000)*this.ganttChart.pixelsPerHour;
this.refreshProjectItem(this.projectItem[0]);
this.refreshDescrProject(this.projectItem[0].nextSibling);
return this;
},create:function(){
var _13=this.ganttChart.contentData.firstChild;
this.posX=(this.project.startDate-this.ganttChart.startDate)/(60*60*1000)*this.ganttChart.pixelsPerHour;
if(this.previousProject){
if(this.previousProject.arrTasks.length>0){
var _14=this.ganttChart.getLastChildTask(this.previousProject.arrTasks[this.previousProject.arrTasks.length-1]);
this.posY=parseInt(_14.cTaskItem[0].style.top)+this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
}else{
this.posY=parseInt(this.previousProject.projectItem[0].style.top)+this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
}
}else{
this.posY=6;
}
var _15=this.ganttChart.panelNames.firstChild;
this.projectNameItem=this.createProjectNameItem();
_15.appendChild(this.projectNameItem);
this.checkWidthProjectNameItem();
this.projectItem=[this.createProjectItem(),[]];
_13.appendChild(this.projectItem[0]);
_13.appendChild(this.createDescrProject());
this.adjustPanelTime();
},getTaskById:function(id){
for(var i=0;i<this.arrTasks.length;i++){
var _16=this.arrTasks[i];
var _17=this.searchTaskInTree(_16,id);
if(_17){
return _17;
}
}
return null;
},searchTaskInTree:function(_18,id){
if(_18.taskItem.id==id){
return _18;
}else{
for(var i=0;i<_18.childTask.length;i++){
var _19=_18.childTask[i];
if(_19.taskItem.id==id){
return _19;
}else{
if(_19.childTask.length>0){
var _19=this.searchTaskInTree(_19,id);
if(_19){
return _19;
}
}
}
}
}
return null;
},shiftProjectItem:function(){
var _1a=null;
var _1b=null;
var _1c=parseInt(this.projectItem[0].style.left);
var _1d=parseInt(this.projectItem[0].firstChild.style.width)+parseInt(this.projectItem[0].style.left);
var _1e=parseInt(this.projectItem[0].firstChild.style.width);
for(var i=0;i<this.arrTasks.length;i++){
var _1f=this.arrTasks[i];
var _20=parseInt(_1f.cTaskItem[0].style.left);
var _21=parseInt(_1f.cTaskItem[0].style.left)+parseInt(_1f.cTaskItem[0].firstChild.firstChild.width);
if(!_1a){
_1a=_20;
}
if(!_1b){
_1b=_21;
}
if(_1a>_20){
_1a=_20;
}
if(_1b<_21){
_1b=_21;
}
}
if(_1a!=_1c){
this.project.startDate=new Date(this.ganttChart.startDate);
this.project.startDate.setHours(this.project.startDate.getHours()+(_1a/this.ganttChart.pixelsPerHour));
}
this.projectItem[0].style.left=_1a+"px";
this.resizeProjectItem(_1b-_1a);
this.duration=Math.round(parseInt(this.projectItem[0].firstChild.width)/(this.ganttChart.pixelsPerWorkHour));
this.shiftDescrProject();
this.adjustPanelTime();
},adjustPanelTime:function(){
var _22=this.projectItem[0];
var _23=parseInt(_22.style.left)+parseInt(_22.firstChild.style.width)+this.ganttChart.panelTimeExpandDelta;
_23+=this.descrProject.offsetWidth;
this.ganttChart.adjustPanelTime(_23);
},resizeProjectItem:function(_24){
var _25=this.percentage,_26=this.projectItem[0];
if(_25>0&&_25<100){
_26.firstChild.style.width=_24+"px";
_26.firstChild.width=_24+"px";
_26.style.width=_24+"px";
var _27=_26.firstChild.rows[0];
_27.cells[0].firstChild.style.width=Math.round(_24*_25/100)+"px";
_27.cells[0].firstChild.style.height=this.ganttChart.heightTaskItem+"px";
_27.cells[1].firstChild.style.width=Math.round(_24*(100-_25)/100)+"px";
_27.cells[1].firstChild.style.height=this.ganttChart.heightTaskItem+"px";
_26.lastChild.firstChild.width=_24+"px";
}else{
if(_25==0||_25==100){
_26.firstChild.style.width=_24+"px";
_26.firstChild.width=_24+"px";
_26.style.width=_24+"px";
var _27=_26.firstChild.rows[0];
_27.cells[0].firstChild.style.width=_24+"px";
_27.cells[0].firstChild.style.height=this.ganttChart.heightTaskItem+"px";
_26.lastChild.firstChild.width=_24+"px";
}
}
},shiftDescrProject:function(){
var _28=(parseInt(this.projectItem[0].style.left)+this.duration*this.ganttChart.pixelsPerWorkHour+10);
this.descrProject.style.left=_28+"px";
this.descrProject.innerHTML=this.getDescStr();
},showDescrProject:function(){
var _29=(parseInt(this.projectItem[0].style.left)+this.duration*this.ganttChart.pixelsPerWorkHour+10);
this.descrProject.style.left=_29+"px";
this.descrProject.style.visibility="visible";
this.descrProject.innerHTML=this.getDescStr();
},hideDescrProject:function(){
this.descrProject.style.visibility="hidden";
},getDescStr:function(){
return this.duration/this.ganttChart.hsPerDay+" days,  "+this.duration+" hours";
},createDescrProject:function(){
var _2a=(this.posX+this.duration*this.ganttChart.pixelsPerWorkHour+10);
var _2b=dojo.create("div",{innerHTML:this.getDescStr(),className:"ganttDescProject"});
dojo.style(_2b,{left:_2a+"px",top:this.posY+"px"});
this.descrProject=_2b;
if(this.project.parentTasks.length==0){
this.descrProject.style.visibility="hidden";
}
return _2b;
},createProjectItem:function(){
this.percentage=this.getPercentCompleted();
this.duration=this.getDuration();
var _2c=dojo.create("div",{id:this.project.id,className:"ganttProjectItem"});
dojo.style(_2c,{left:this.posX+"px",top:this.posY+"px",width:this.duration*this.ganttChart.pixelsPerWorkHour+"px"});
var _2d=dojo.create("table",{cellPadding:"0",cellSpacing:"0",className:"ganttTblProjectItem"},_2c);
var _2e=this.duration*this.ganttChart.pixelsPerWorkHour;
_2d.width=((_2e==0)?1:_2e)+"px";
_2d.style.width=((_2e==0)?1:_2e)+"px";
var _2f=_2d.insertRow(_2d.rows.length);
if(this.percentage!=-1){
if(this.percentage!=0){
var _30=dojo.create("td",{width:this.percentage+"%"},_2f);
_30.style.lineHeight="1px";
var _31=dojo.create("div",{className:"ganttImageProgressFilled"},_30);
dojo.style(_31,{width:(this.percentage*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}
if(this.percentage!=100){
var _30=dojo.create("td",{width:(100-this.percentage)+"%"},_2f);
_30.style.lineHeight="1px";
var _31=dojo.create("div",{className:"ganttImageProgressBg"},_30);
dojo.style(_31,{width:((100-this.percentage)*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}
}else{
var _30=dojo.create("td",{width:"1px"},_2f);
_30.style.lineHeight="1px";
var _31=dojo.create("div",{className:"ganttImageProgressBg"},_30);
dojo.style(_31,{width:"1px",height:this.ganttChart.heightTaskItem+"px"});
}
var _32=dojo.create("div",{className:"ganttDivTaskInfo"});
var _33=dojo.create("table",{cellPadding:"0",cellSpacing:"0",height:this.ganttChart.heightTaskItem+"px",width:((this.duration*this.ganttChart.pixelsPerWorkHour==0)?1:this.duration*this.ganttChart.pixelsPerWorkHour)+"px"},_32);
var _34=_33.insertRow(0);
var _35=dojo.create("td",{align:"center",vAlign:"top",height:this.ganttChart.heightTaskItem+"px",className:"ganttMoveInfo"},_34);
_2c.appendChild(_32);
if(this.project.parentTasks.length==0){
_2c.style.display="none";
}
return _2c;
},createProjectNameItem:function(){
var _36=dojo.create("div",{className:"ganttProjectNameItem",innerHTML:this.project.name,title:this.project.name});
dojo.style(_36,{left:"5px",top:this.posY+"px"});
dojo.attr(_36,"tabIndex",0);
if(this.ganttChart.isShowConMenu){
this.ganttChart._events.push(dojo.connect(_36,"onmouseover",this,function(_37){
dojo.addClass(_36,"ganttProjectNameItemHover");
clearTimeout(this.ganttChart.menuTimer);
this.ganttChart.tabMenu.clear();
this.ganttChart.tabMenu.show(_37.target,this);
}));
this.ganttChart._events.push(dojo.connect(_36,"onkeydown",this,function(_38){
if(_38.keyCode==dojo.keys.ENTER){
this.ganttChart.tabMenu.clear();
this.ganttChart.tabMenu.show(_38.target,this);
}
if(this.ganttChart.tabMenu.isShow&&(_38.keyCode==dojo.keys.LEFT_ARROW||_38.keyCode==dojo.keys.RIGHT_ARROW)){
dijit.focus(this.ganttChart.tabMenu.menuPanel.firstChild.rows[0].cells[0]);
}
if(this.ganttChart.tabMenu.isShow&&_38.keyCode==dojo.keys.ESCAPE){
this.ganttChart.tabMenu.hide();
}
}));
this.ganttChart._events.push(dojo.connect(_36,"onmouseout",this,function(){
dojo.removeClass(_36,"ganttProjectNameItemHover");
clearTimeout(this.ganttChart.menuTimer);
this.ganttChart.menuTimer=setTimeout(dojo.hitch(this,function(){
this.ganttChart.tabMenu.hide();
}),200);
}));
this.ganttChart._events.push(dojo.connect(this.ganttChart.tabMenu.menuPanel,"onmouseover",this,function(){
clearTimeout(this.ganttChart.menuTimer);
}));
this.ganttChart._events.push(dojo.connect(this.ganttChart.tabMenu.menuPanel,"onkeydown",this,function(_39){
if(this.ganttChart.tabMenu.isShow&&_39.keyCode==dojo.keys.ESCAPE){
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
return _36;
},getPercentCompleted:function(){
var sum=0,_3a=0;
dojo.forEach(this.project.parentTasks,function(_3b){
sum+=parseInt(_3b.percentage);
},this);
if(this.project.parentTasks.length!=0){
return _3a=Math.round(sum/this.project.parentTasks.length);
}else{
return _3a=-1;
}
},getDuration:function(){
var _3c=0,_3d=0;
if(this.project.parentTasks.length>0){
dojo.forEach(this.project.parentTasks,function(_3e){
_3d=_3e.duration*24/this.ganttChart.hsPerDay+(_3e.startTime-this.ganttChart.startDate)/(60*60*1000);
if(_3d>_3c){
_3c=_3d;
}
},this);
return ((_3c-this.posX)/24)*this.ganttChart.hsPerDay;
}else{
return 0;
}
},deleteTask:function(id){
var _3f=this.getTaskById(id);
if(_3f){
this.deleteChildTask(_3f);
this.ganttChart.checkPosition();
}
},setName:function(_40){
if(_40){
this.project.name=_40;
this.projectNameItem.innerHTML=_40;
this.projectNameItem.title=_40;
this.checkWidthProjectNameItem();
this.descrProject.innerHTML=this.getDescStr();
this.adjustPanelTime();
}
},setPercentCompleted:function(_41){
_41=parseInt(_41);
if(isNaN(_41)||_41>100||_41<0){
return false;
}
var _42=this.projectItem[0].firstChild.rows[0],rc0=_42.cells[0],rc1=_42.cells[1];
if((_41>0)&&(_41<100)&&(this.percentage>0)&&(this.percentage<100)){
rc0.width=parseInt(_41)+"%";
rc0.firstChild.style.width=(_41*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px";
rc1.width=(100-parseInt(_41))+"%";
rc1.firstChild.style.width=((100-_41)*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px";
}else{
if(((_41==0)||(_41==100))&&(this.percentage>0)&&(this.percentage<100)){
if(_41==0){
rc0.parentNode.removeChild(rc0);
rc1.width=100+"%";
rc1.firstChild.style.width=this.duration*this.ganttChart.pixelsPerWorkHour+"px";
}else{
if(_41==100){
rc1.parentNode.removeChild(rc1);
rc0.width=100+"%";
rc0.firstChild.style.width=this.duration*this.ganttChart.pixelsPerWorkHour+"px";
}
}
}else{
if(((_41==0)||(_41==100))&&((this.percentage==0)||(this.percentage==100))){
if((_41==0)&&(this.percentage==100)){
dojo.removeClass(rc0.firstChild,"ganttImageProgressFilled");
dojo.addClass(rc0.firstChild,"ganttImageProgressBg");
}else{
if((_41==100)&&(this.percentage==0)){
dojo.removeClass(rc0.firstChild,"ganttImageProgressBg");
dojo.addClass(rc0.firstChild,"ganttImageProgressFilled");
}
}
}else{
if(((_41>0)||(_41<100))&&((this.percentage==0)||(this.percentage==100))){
rc0.parentNode.removeChild(rc0);
var _43=dojo.create("td",{width:_41+"%"},_42);
_43.style.lineHeight="1px";
var _44=dojo.create("div",{className:"ganttImageProgressFilled"},_43);
dojo.style(_44,{width:(_41*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
_43=dojo.create("td",{width:(100-_41)+"%"},_42);
_43.style.lineHeight="1px";
_44=dojo.create("div",{className:"ganttImageProgressBg"},_43);
dojo.style(_44,{width:((100-_41)*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}else{
if(this.percentage==-1){
if(_41==100){
dojo.removeClass(rc0.firstChild,"ganttImageProgressBg");
dojo.addClass(rc0.firstChild,"ganttImageProgressFilled");
}else{
if(_41<100&&_41>0){
rc0.parentNode.removeChild(rc0);
var _43=dojo.create("td",{width:_41+"%"},_42);
_43.style.lineHeight="1px";
_44=dojo.create("div",{className:"ganttImageProgressFilled"},_43);
dojo.style(_44,{width:(_41*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
_43=dojo.create("td",{width:(100-_41)+"%"},_42);
_43.style.lineHeight="1px";
_44=dojo.create("div",{className:"ganttImageProgressBg"},_43);
dojo.style(_44,{width:((100-_41)*this.duration*this.ganttChart.pixelsPerWorkHour)/100+"px",height:this.ganttChart.heightTaskItem+"px"});
}
}
}
}
}
}
}
this.percentage=_41;
this.descrProject.innerHTML=this.getDescStr();
return true;
},deleteChildTask:function(_45){
if(_45){
var _46=_45.cTaskItem[0],_47=_45.cTaskNameItem[0],_48=_45.cTaskItem[1],_49=_45.cTaskNameItem[1],_4a=_45.cTaskItem[2],_4b=_45.cTaskNameItem[2];
if(_46.style.display=="none"){
this.ganttChart.openTree(_45.parentTask);
}
if(_45.childPredTask.length>0){
for(var i=0;i<_45.childPredTask.length;i++){
var _4c=_45.childPredTask[i];
for(var t=0;t<_4c.cTaskItem[1].length;t++){
_4c.cTaskItem[1][t].parentNode.removeChild(_4c.cTaskItem[1][t]);
}
_4c.cTaskItem[1]=[];
_4c.predTask=null;
}
}
if(_45.childTask.length>0){
while(_45.childTask.length>0){
this.deleteChildTask(_45.childTask[0]);
}
}
var _4d=this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
if(_46.style.display!="none"){
_45.shiftCurrentTasks(_45,-_4d);
}
this.project.deleteTask(_45.taskItem.id);
if(_46){
_46.parentNode.removeChild(_46);
}
_45.descrTask.parentNode.removeChild(_45.descrTask);
if(_48.length>0){
for(var j=0;j<_48.length;j++){
_48[j].parentNode.removeChild(_48[j]);
}
}
if(_47){
_47.parentNode.removeChild(_47);
}
if(_45.cTaskNameItem[1]){
for(var j=0;j<_49.length;j++){
_49[j].parentNode.removeChild(_49[j]);
}
}
if(_4b&&_4b.parentNode){
_4b.parentNode.removeChild(_4b);
}
if(_45.taskIdentifier){
_45.taskIdentifier.parentNode.removeChild(_45.taskIdentifier);
_45.taskIdentifier=null;
}
if(_45.parentTask){
if(_45.previousChildTask){
if(_45.nextChildTask){
_45.previousChildTask.nextChildTask=_45.nextChildTask;
}else{
_45.previousChildTask.nextChildTask=null;
}
}
var _4e=_45.parentTask;
for(var i=0;i<_4e.childTask.length;i++){
if(_4e.childTask[i].taskItem.id==_45.taskItem.id){
_4e.childTask[i]=null;
_4e.childTask.splice(i,1);
break;
}
}
if(_4e.childTask.length==0){
if(_4e.cTaskNameItem[2]){
_4e.cTaskNameItem[2].parentNode.removeChild(_4e.cTaskNameItem[2]);
_4e.cTaskNameItem[2]=null;
}
}
}else{
if(_45.previousParentTask){
if(_45.nextParentTask){
_45.previousParentTask.nextParentTask=_45.nextParentTask;
}else{
_45.previousParentTask.nextParentTask=null;
}
}
var _4f=_45.project;
for(var i=0;i<_4f.arrTasks.length;i++){
if(_4f.arrTasks[i].taskItem.id==_45.taskItem.id){
_4f.arrTasks.splice(i,1);
}
}
}
if(_45.predTask){
var _50=_45.predTask;
for(var i=0;i<_50.childPredTask.length;i++){
if(_50.childPredTask[i].taskItem.id==_45.taskItem.id){
_50.childPredTask[i]=null;
_50.childPredTask.splice(i,1);
}
}
}
if(_45.project.arrTasks.length!=0){
_45.project.shiftProjectItem();
}else{
_45.project.projectItem[0].style.display="none";
this.hideDescrProject();
}
this.ganttChart.contentDataHeight-=this.ganttChart.heightTaskItemExtra+this.ganttChart.heightTaskItem;
}
},insertTask:function(id,_51,_52,_53,_54,_55,_56,_57){
var _58=null;
var _59=null;
if(this.project.getTaskById(id)){
return false;
}
if((!_53)||(_53<this.ganttChart.minWorkLength)){
_53=this.ganttChart.minWorkLength;
}
if((!_51)||(_51=="")){
_51=id;
}
if((!_54)||(_54=="")){
_54=0;
}else{
_54=parseInt(_54);
if(_54<0||_54>100){
return false;
}
}
var _5a=false;
if((_57)&&(_57!="")){
var _5b=this.project.getTaskById(_57);
if(!_5b){
return false;
}
_52=_52||_5b.startTime;
if(_52<_5b.startTime){
return false;
}
_58=new dojox.gantt.GanttTaskItem({id:id,name:_51,startTime:_52,duration:_53,percentage:_54,previousTaskId:_55,taskOwner:_56});
if(!this.ganttChart.checkPosParentTask(_5b,_58)){
return false;
}
_58.parentTask=_5b;
var _5c=this.getTaskById(_5b.id);
var _5d=false;
if(_5c.cTaskItem[0].style.display=="none"){
_5d=true;
}else{
if(_5c.cTaskNameItem[2]){
if(!_5c.isExpanded){
_5d=true;
}
}
}
if(_5d){
if(_5c.childTask.length==0){
this.ganttChart.openTree(_5c.parentTask);
}else{
this.ganttChart.openTree(_5c);
}
}
if(_55!=""){
var _5e=this.project.getTaskById(_55);
if(!_5e){
return false;
}
if(_5e.parentTask){
if(_5e.parentTask.id!=_58.parentTask.id){
return false;
}
}else{
return false;
}
if(!this.ganttChart.checkPosPreviousTask(_5e,_58)){
this.ganttChart.correctPosPreviousTask(_5e,_58);
}
_58.previousTask=_5e;
}
var _5f=false;
if(_5a){
for(var i=0;i<_5b.cldTasks.length;i++){
if(_58.startTime<_5b.cldTasks[i].startTime){
_5b.cldTasks.splice(i,0,_58);
if(i>0){
_5b.cldTasks[i-1].nextChildTask=_5b.cldTasks[i];
_5b.cldTasks[i].previousChildTask=_5b.cldTasks[i-1];
}
if(_5b.cldTasks[i+1]){
_5b.cldTasks[i+1].previousChildTask=_5b.cldTasks[i];
_5b.cldTasks[i].nextChildTask=_5b.cldTasks[i+1];
}
_5f=true;
break;
}
}
}
if(!_5f){
if(_5b.cldTasks.length>0){
_5b.cldTasks[_5b.cldTasks.length-1].nextChildTask=_58;
_58.previousChildTask=_5b.cldTasks[_5b.cldTasks.length-1];
}
_5b.cldTasks.push(_58);
}
if(_5b.cldTasks.length==1){
var _60=_5c.createTreeImg();
_5c.cTaskNameItem[2]=_60;
}
_59=new dojox.gantt.GanttTaskControl(_58,this,this.ganttChart);
_59.create();
if(_58.nextChildTask){
_59.nextChildTask=_59.project.getTaskById(_58.nextChildTask.id);
}
_59.adjustPanelTime();
var _61=this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
_59.shiftCurrentTasks(_59,_61);
}else{
_52=_52||this.project.startDate;
_58=new dojox.gantt.GanttTaskItem({id:id,name:_51,startTime:_52,duration:_53,percentage:_54,previousTaskId:_55,taskOwner:_56});
if(_58.startTime<=this.ganttChart.startDate){
return false;
}
if(_55!=""){
var _5e=this.project.getTaskById(_55);
if(!_5e){
return false;
}
if(!this.ganttChart.checkPosPreviousTask(_5e,_58)){
this.ganttChart.correctPosPreviousTask(_5e,_58);
}
if(_5e.parentTask){
return false;
}
_58.previousTask=_5e;
}
var _5f=false;
if(_5a){
for(var i=0;i<this.project.parentTasks.length;i++){
var _62=this.project.parentTasks[i];
if(_52<_62.startTime){
this.project.parentTasks.splice(i,0,_58);
if(i>0){
this.project.parentTasks[i-1].nextParentTask=_58;
_58.previousParentTask=this.project.parentTasks[i-1];
}
if(this.project.parentTasks[i+1]){
this.project.parentTasks[i+1].previousParentTask=_58;
_58.nextParentTask=this.project.parentTasks[i+1];
}
_5f=true;
break;
}
}
}
if(!_5f){
if(this.project.parentTasks.length>0){
this.project.parentTasks[this.project.parentTasks.length-1].nextParentTask=_58;
_58.previousParentTask=this.project.parentTasks[this.project.parentTasks.length-1];
}
this.project.parentTasks.push(_58);
}
_59=new dojox.gantt.GanttTaskControl(_58,this,this.ganttChart);
_59.create();
if(_58.nextParentTask){
_59.nextParentTask=_59.project.getTaskById(_58.nextParentTask.id);
}
_59.adjustPanelTime();
this.arrTasks.push(_59);
var _61=this.ganttChart.heightTaskItem+this.ganttChart.heightTaskItemExtra;
_59.shiftCurrentTasks(_59,_61);
this.projectItem[0].style.display="inline";
this.setPercentCompleted(this.getPercentCompleted());
this.shiftProjectItem();
this.showDescrProject();
}
this.ganttChart.checkHeighPanelTasks();
this.ganttChart.checkPosition();
return _59;
},shiftNextProject:function(_63,_64){
if(_63.nextProject){
_63.nextProject.shiftProject(_64);
this.shiftNextProject(_63.nextProject,_64);
}
},shiftProject:function(_65){
this.posY=this.posY+_65;
this.projectItem[0].style.top=parseInt(this.projectItem[0].style.top)+_65+"px";
this.descrProject.style.top=parseInt(this.descrProject.style.top)+_65+"px";
this.projectNameItem.style.top=parseInt(this.projectNameItem.style.top)+_65+"px";
if(this.arrTasks.length>0){
this.shiftNextParentTask(this.arrTasks[0],_65);
}
},shiftTask:function(_66,_67){
_66.posY=_66.posY+_67;
var _68=_66.cTaskNameItem[0],_69=_66.cTaskNameItem[1],_6a=_66.cTaskNameItem[2],_6b=_66.cTaskItem[0],_6c=_66.cTaskItem[1],_6d=_66.cTaskItem[2];
_68.style.top=parseInt(_68.style.top)+_67+"px";
if(_6a){
_6a.style.top=parseInt(_6a.style.top)+_67+"px";
}
if(_66.parentTask){
_69[0].style.top=parseInt(_69[0].style.top)+_67+"px";
_69[1].style.top=parseInt(_69[1].style.top)+_67+"px";
}
_66.cTaskItem[0].style.top=parseInt(_66.cTaskItem[0].style.top)+_67+"px";
_66.descrTask.style.top=parseInt(_66.descrTask.style.top)+_67+"px";
if(_6c[0]){
_6c[0].style.top=parseInt(_6c[0].style.top)+_67+"px";
_6c[1].style.top=parseInt(_6c[1].style.top)+_67+"px";
_6c[2].style.top=parseInt(_6c[2].style.top)+_67+"px";
}
},shiftNextParentTask:function(_6e,_6f){
this.shiftTask(_6e,_6f);
this.shiftChildTasks(_6e,_6f);
if(_6e.nextParentTask){
this.shiftNextParentTask(_6e.nextParentTask,_6f);
}
},shiftChildTasks:function(_70,_71){
dojo.forEach(_70.childTask,function(_72){
this.shiftTask(_72,_71);
if(_72.childTask.length>0){
this.shiftChildTasks(_72,_71);
}
},this);
}});
dojo.declare("dojox.gantt.GanttProjectItem",null,{constructor:function(_73){
this.id=_73.id;
this.name=_73.name||this.id;
this.startDate=_73.startDate||new Date();
this.parentTasks=[];
},getTaskById:function(id){
for(var i=0;i<this.parentTasks.length;i++){
var _74=this.parentTasks[i];
var _75=this.getTaskByIdInTree(_74,id);
if(_75){
return _75;
}
}
return null;
},getTaskByIdInTree:function(_76,id){
if(_76.id==id){
return _76;
}else{
for(var i=0;i<_76.cldTasks.length;i++){
var _77=_76.cldTasks[i];
if(_77.id==id){
return _77;
}
if(_77.cldTasks.length>0){
if(_77.cldTasks.length>0){
var _78=this.getTaskByIdInTree(_77,id);
if(_78){
return _78;
}
}
}
}
}
return null;
},addTask:function(_79){
this.parentTasks.push(_79);
_79.setProject(this);
},deleteTask:function(id){
var _7a=this.getTaskById(id);
if(!_7a){
return;
}
if(!_7a.parentTask){
for(var i=0;i<this.parentTasks.length;i++){
var _7b=this.parentTasks[i];
if(_7b.id==id){
if(_7b.nextParentTask){
if(_7b.previousParentTask){
_7b.previousParentTask.nextParentTask=_7b.nextParentTask;
_7b.nextParentTask.previousParentTask=_7b.previousParentTask;
}else{
_7b.nextParentTask.previousParentTask=null;
}
}else{
if(_7b.previousParentTask){
_7b.previousParentTask.nextParentTask=null;
}
}
_7b=null;
this.parentTasks.splice(i,1);
break;
}
}
}else{
var _7c=_7a.parentTask;
for(var i=0;i<_7c.cldTasks.length;i++){
var _7d=_7c.cldTasks[i];
if(_7d.id==id){
if(_7d.nextChildTask){
if(_7d.previousChildTask){
_7d.previousChildTask.nextChildTask=_7d.nextChildTask;
_7d.nextChildTask.previousChildTask=_7d.previousChildTask;
}else{
_7d.nextChildTask.previousChildTask=null;
}
}else{
if(_7d.previousChildTask){
_7d.previousChildTask.nextChildTask=null;
}
}
_7d=null;
_7c.cldTasks.splice(i,1);
break;
}
}
}
}});
}
