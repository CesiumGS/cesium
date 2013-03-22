define([
    "dijit/focus",
    "dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
    "dojo/date/locale",
	"dojo/request",
	"dojo/on",	
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-attr",
	"dojo/dom-geometry",
	"dojo/keys",
	"dojo/domReady!"
], function(focus, declare, arrayUtil, lang, locale, request, on,
		dom, domClass, domConstruct, domStyle, domAttr, domGeometry, keys){
	return declare("dojox.gantt.GanttTaskControl", [], {
		constructor: function(taskInfo, project, chart){
			this.ganttChart = chart;
			this.project = project;
			this.taskItem = taskInfo;
			//control variables
			this.checkMove = false;
			this.checkResize = false;
			this.moveChild = false;
			this.maxPosXMove = -1;
			this.minPosXMove = -1;
			this.maxWidthResize = -1;
			this.minWidthResize = -1;
			this.posX = 0;
			this.posY = 0;
			this.mouseX = 0;
			this.taskItemWidth = 0;
			this.isHide = false;
			this.hideTasksHeight = 0;
			this.isExpanded = true;
			this.descrTask = null;
			this.cTaskItem = null;
			this.cTaskNameItem = null;
			this.parentTask = null;
			this.predTask = null;
			this.childTask = [];
			this.childPredTask = [];
			this.nextChildTask = null;
			this.previousChildTask = null;
			this.nextParentTask = null;
			this.previousParentTask = null;
		},
		createConnectingLinesPN: function(){
			var arrConnectingLinesNames = [];
			var lineVerticalLeft = domConstruct.create("div", {
				innerHTML: "&nbsp;",
				className: "ganttTaskLineVerticalLeft"
			}, this.ganttChart.panelNames.firstChild);
			var cTaskName = this.cTaskNameItem[0], pcTaskName = this.parentTask.cTaskNameItem[0];
			domStyle.set(lineVerticalLeft, {
				height: (cTaskName.offsetTop - pcTaskName.offsetTop) + "px",
				top: (pcTaskName.offsetTop + 5) + "px",
				left: (pcTaskName.offsetLeft - 9) + "px"
			});
			var LineHorizontalLeft = domConstruct.create("div", {
				noShade: true,
				color: "#000000",
				className: "ganttTaskLineHorizontalLeft"
			}, this.ganttChart.panelNames.firstChild);
			domStyle.set(LineHorizontalLeft, {
				left: (pcTaskName.offsetLeft - 9) + "px",
				top: (cTaskName.offsetTop + 5) + "px",
				height: "1px",
				width: (cTaskName.offsetLeft - pcTaskName.offsetLeft + 4) + "px"
			});
			arrConnectingLinesNames.push(lineVerticalLeft);
			arrConnectingLinesNames.push(LineHorizontalLeft);
			return arrConnectingLinesNames;
		},
		createConnectingLinesDS: function(){
			var contentData = this.ganttChart.contentData.firstChild;
			var arrLines = [];
			var arrowImg = domConstruct.create("div", {
				className: "ganttImageArrow"
			});
			//vertical line
			var lineVerticalRight = document.createElement("div");
			//horizontal line
			var lineHorizontal = document.createElement("div");
			var posXPreviousTask = domStyle.get(this.predTask.cTaskItem[0], "left");
			var posYPreviousTask = domStyle.get(this.predTask.cTaskItem[0], "top");
			var posXChildTask = domStyle.get(this.cTaskItem[0], "left");
			var posYChildTask = this.posY + 2;
			//width task item
			var widthPreviousTask = parseInt(this.predTask.cTaskItem[0].firstChild.firstChild.width);
			if(posYPreviousTask < posYChildTask){
				domClass.add(lineVerticalRight, "ganttTaskLineVerticalRight");
				domStyle.set(lineVerticalRight, {
					height: (posYChildTask - this.ganttChart.heightTaskItem / 2 - posYPreviousTask - 3) + "px",
					width: "1px",
					left: (posXPreviousTask + widthPreviousTask - 20) + "px",
					top: (posYPreviousTask + this.ganttChart.heightTaskItem) + "px"
				});
				domClass.add(lineHorizontal, "ganttTaskLineHorizontal");
				domStyle.set(lineHorizontal, {
					width: (15 + (posXChildTask - (widthPreviousTask + posXPreviousTask))) + "px",
					left: (posXPreviousTask + widthPreviousTask - 20) + "px",
					top: (posYChildTask + 2) + "px"
				});
				domClass.add(arrowImg, "ganttTaskArrowImg");
				domStyle.set(arrowImg, {
					left: (posXChildTask - 7) + "px",
					top: (posYChildTask - 1) + "px"
				});
			}else{
				domClass.add(lineVerticalRight, "ganttTaskLineVerticalRightPlus");
				domStyle.set(lineVerticalRight, {
					height: (posYPreviousTask + 2 - posYChildTask) + "px",
					width: "1px",
					left: (posXPreviousTask + widthPreviousTask - 20) + "px",
					top: (posYChildTask + 2) + "px"
				});
				domClass.add(lineHorizontal, "ganttTaskLineHorizontalPlus");
				domStyle.set(lineHorizontal, {
					width: (15 + (posXChildTask - (widthPreviousTask + posXPreviousTask))) + "px",
					left: (posXPreviousTask + widthPreviousTask - 20) + "px",
					top: (posYChildTask + 2) + "px"
				});
				domClass.add(arrowImg, "ganttTaskArrowImgPlus");
				domStyle.set(arrowImg, {
					left: (posXChildTask - 7) + "px",
					top: (posYChildTask - 1) + "px"
				});
			}
			contentData.appendChild(lineVerticalRight);
			contentData.appendChild(lineHorizontal);
			contentData.appendChild(arrowImg);
			arrLines.push(lineVerticalRight);
			arrLines.push(arrowImg);
			arrLines.push(lineHorizontal);
			return arrLines;
		},
		showChildTasks: function(task, isOpen){
			if(isOpen){
				for(var i = 0; i < task.childTask.length; i++){
					var cTask = task.childTask[i],
						cTaskItem0 = cTask.cTaskItem[0], cTaskName0 = cTask.cTaskNameItem[0],
						cTaskItem1 = cTask.cTaskItem[1], cTaskName1 = cTask.cTaskNameItem[1],
						cTaskName2 = cTask.cTaskNameItem[2];
					if(cTaskItem0.style.display == "none"){
						cTaskItem0.style.display = "inline";
						cTaskName0.style.display = "inline";
						cTask.showDescTask();
						task.isHide = false;
						if(cTaskName2){
							cTaskName2.style.display = "inline";
							isOpen = cTask.isExpanded;
						}
						for(var k = 0; k < cTaskItem1.length; k++){
							cTaskItem1[k].style.display = "inline";
						}
						for(var k = 0; k < cTaskName1.length; k++){
							cTaskName1[k].style.display = "inline";
						}
						(cTask.taskIdentifier) && (cTask.taskIdentifier.style.display = "inline");
						this.hideTasksHeight += this.ganttChart.heightTaskItem + this.ganttChart.heightTaskItemExtra;
						if(cTask.childTask.length > 0){
							this.showChildTasks(cTask, isOpen);
						}
					}
				}
			}
		},
		hideChildTasks: function(task){
			for(var i = 0; i < task.childTask.length; i++){
				var cTask = task.childTask[i],
					cTaskItem0 = cTask.cTaskItem[0], cTaskName0 = cTask.cTaskNameItem[0],
					cTaskItem1 = cTask.cTaskItem[1], cTaskName1 = cTask.cTaskNameItem[1],
					cTaskName2 = cTask.cTaskNameItem[2];
				if(cTaskItem0.style.display != "none"){
					cTaskItem0.style.display = "none";
					cTaskName0.style.display = "none";
					cTask.hideDescTask();
					task.isHide = true;
					if(cTaskName2){
						cTaskName2.style.display = "none";
					}
					for(var k = 0; k < cTaskItem1.length; k++){
						cTaskItem1[k].style.display = "none";
					}
					for(var k = 0; k < cTaskName1.length; k++){
						cTaskName1[k].style.display = "none";
					}
					(cTask.taskIdentifier) && (cTask.taskIdentifier.style.display = "none");
					this.hideTasksHeight += (this.ganttChart.heightTaskItem + this.ganttChart.heightTaskItemExtra);
					if(cTask.childTask.length > 0){
						this.hideChildTasks(cTask);
					}
				}
			}
		},
		shiftCurrentTasks: function(task, height){
			this.shiftNextTask(this, height);
			task.project.shiftNextProject(task.project, height);
		},
		shiftTask: function(task, height){
			task.posY = task.posY + height;
			var taskItem0 = task.cTaskItem[0], taskName0 = task.cTaskNameItem[0],
				taskItem1 = task.cTaskItem[1], taskName1 = task.cTaskNameItem[1],
				taskName2 = task.cTaskNameItem[2];
			taskName0.style.top = parseInt(taskName0.style.top) + height + "px";
			if(taskName2){
				taskName2.style.top = parseInt(taskName2.style.top) + height + "px";
			}
			if(task.parentTask){
				if(parseInt(this.cTaskNameItem[0].style.top) > parseInt(task.parentTask.cTaskNameItem[0].style.top) &&
				(taskName1[0].style.display != "none")){
					taskName1[0].style.height = parseInt(taskName1[0].style.height) + height + "px";
				}else{
					taskName1[0].style.top = parseInt(taskName1[0].style.top) + height + "px";
				}
				taskName1[1].style.top = parseInt(taskName1[1].style.top) + height + "px";
			}
			taskItem0.style.top = parseInt(taskItem0.style.top) + height + "px";
			task.descrTask.style.top = parseInt(task.descrTask.style.top) + height + "px";
			if(task.predTask){
				if(((parseInt(this.cTaskItem[0].style.top) > parseInt(task.predTask.cTaskItem[0].style.top)) ||
				(this.cTaskItem[0].id == task.predTask.taskItem.id)) &&
				taskItem1[0].style.display != "none"){
					taskItem1[0].style.height = parseInt(taskItem1[0].style.height) + height + "px";
				}else{
					taskItem1[0].style.top = parseInt(taskItem1[0].style.top) + height + "px";
				}
				taskItem1[1].style.top = parseInt(taskItem1[1].style.top) + height + "px";
				taskItem1[2].style.top = parseInt(taskItem1[2].style.top) + height + "px";
			}
		},
		shiftNextTask: function(task, height){
			if(task.nextChildTask){
				this.shiftTask(task.nextChildTask, height);
				this.shiftChildTask(task.nextChildTask, height);
				this.shiftNextTask(task.nextChildTask, height);
			}else if(task.parentTask){
				this.shiftNextTask(task.parentTask, height);
			}else if(task.nextParentTask){
				this.shiftTask(task.nextParentTask, height);
				this.shiftChildTask(task.nextParentTask, height);
				this.shiftNextTask(task.nextParentTask, height);
			}
		},
		shiftChildTask: function(task, height){
			arrayUtil.forEach(task.childTask, function(cTask){
				this.shiftTask(cTask, height);
				if(cTask.childTask.length > 0){
					this.shiftChildTask(cTask, height);
				}
			}, this);
		},
		endMove: function(){
			var cTask0 = this.cTaskItem[0];
			var width = domStyle.get(cTask0, "left") - this.posX;
			var startTime = this.getDateOnPosition(domStyle.get(cTask0, "left"));
			startTime = this.checkPos(startTime);
			if(this.checkMove){
				width = this.ganttChart.getPosOnDate(startTime) - this.posX;
				this.moveCurrentTaskItem(width, this.moveChild);
				this.project.shiftProjectItem();
			}
			this.checkMove = false;
			this.posX = 0;
			this.maxPosXMove = -1;
			this.minPosXMove = -1;
			cTask0.childNodes[1].firstChild.rows[0].cells[0].innerHTML = "";
			this.adjustPanelTime();
			if(this.ganttChart.resource){
				this.ganttChart.resource.refresh();
			}
		},
		checkPos: function(startTime){
			var cTask0 = this.cTaskItem[0];
			var h = startTime.getHours();
			if(h >= 12){
				startTime.setDate(startTime.getDate() + 1);
				startTime.setHours(0);
				if((parseInt(cTask0.firstChild.firstChild.width) + this.ganttChart.getPosOnDate(startTime) > this.maxPosXMove) && (this.maxPosXMove != -1)){
					startTime.setDate(startTime.getDate() - 1);
					startTime.setHours(0);
				}
			}else if((h < 12) && (h != 0)){
				startTime.setHours(0);
				if((this.ganttChart.getPosOnDate(startTime) < this.minPosXMove)){
					startTime.setDate(startTime.getDate() + 1);
				}
			}
			cTask0.style.left = this.ganttChart.getPosOnDate(startTime) + "px";
			return startTime;
		},
		getMaxPosPredChildTaskItem: function(){
			var posPredChildTaskItem = 0;
			var nextPosPredChildTaskItem = 0;
			for(var i = 0; i < this.childPredTask.length; i++){
				nextPosPredChildTaskItem = this.getMaxPosPredChildTaskItemInTree(this.childPredTask[i]);
				if(nextPosPredChildTaskItem > posPredChildTaskItem){
					posPredChildTaskItem = nextPosPredChildTaskItem;
				}
			}
			return posPredChildTaskItem;
		},
		getMaxPosPredChildTaskItemInTree: function(task){
			var cTask0 = task.cTaskItem[0];
			var currentPos = parseInt(cTask0.firstChild.firstChild.width) + domStyle.get(cTask0, "left");
			var posPredChildTaskItem = 0;
			var nextPosPredChildTaskItem = 0;
			arrayUtil.forEach(task.childPredTask, function(cpTask){
				nextPosPredChildTaskItem = this.getMaxPosPredChildTaskItemInTree(cpTask);
				if(nextPosPredChildTaskItem > posPredChildTaskItem){
					posPredChildTaskItem = nextPosPredChildTaskItem;
				}
			}, this);
			return posPredChildTaskItem > currentPos ? posPredChildTaskItem : currentPos;
		},
		moveCurrentTaskItem: function(width, moveChild){
			var taskItem = this.cTaskItem[0];
			this.taskItem.startTime = new Date(this.ganttChart.startDate);
			this.taskItem.startTime.setHours(this.taskItem.startTime.getHours() + (parseInt(taskItem.style.left) / this.ganttChart.pixelsPerHour));
			this.showDescTask();
			var cTask1 = this.cTaskItem[1];
			if(cTask1.length > 0){
				cTask1[2].style.width = parseInt(cTask1[2].style.width) + width + "px";
				cTask1[1].style.left = parseInt(cTask1[1].style.left) + width + "px";
			}
			arrayUtil.forEach(this.childTask, function(cTask){
				if(!cTask.predTask){
					this.moveChildTaskItems(cTask, width, moveChild);
				}
			}, this);
			arrayUtil.forEach(this.childPredTask, function(cpTask){
				this.moveChildTaskItems(cpTask, width, moveChild);
			}, this);
		},
		moveChildTaskItems: function(task, width, moveChild){
			var taskItem = task.cTaskItem[0];
			if(moveChild){
				taskItem.style.left = parseInt(taskItem.style.left) + width + "px";
				task.adjustPanelTime();
				task.taskItem.startTime = new Date(this.ganttChart.startDate);
				task.taskItem.startTime.setHours(task.taskItem.startTime.getHours() + (parseInt(taskItem.style.left) / this.ganttChart.pixelsPerHour));
				var ctItem = task.cTaskItem[1];
				arrayUtil.forEach(ctItem, function(item){
					item.style.left = parseInt(item.style.left) + width + "px";
				}, this);
				arrayUtil.forEach(task.childTask, function(cTask){
					if(!cTask.predTask){
						this.moveChildTaskItems(cTask, width, moveChild);
					}
				}, this);
				arrayUtil.forEach(task.childPredTask, function(cpTask){
					this.moveChildTaskItems(cpTask, width, moveChild);
				}, this);
			}else{
				var ctItem = task.cTaskItem[1];
				if(ctItem.length > 0){
					var item0 = ctItem[0], item2 = ctItem[2];
					item2.style.left = parseInt(item2.style.left) + width + "px";
					item2.style.width = parseInt(item2.style.width) - width + "px";
					item0.style.left = parseInt(item0.style.left) + width + "px";
				}
			}
			task.moveDescTask();
		},
		adjustPanelTime: function(){
			var taskItem = this.cTaskItem[0];
			var width = parseInt(taskItem.style.left) + parseInt(taskItem.firstChild.firstChild.width) + this.ganttChart.panelTimeExpandDelta;
			width += this.descrTask.offsetWidth;
			this.ganttChart.adjustPanelTime(width);
		},
		getDateOnPosition: function(position){
			var date = new Date(this.ganttChart.startDate);
			date.setHours(date.getHours() + (position / this.ganttChart.pixelsPerHour));
			return date;
		},
		moveItem: function(event){
			var pageX = event.screenX;
			var posTaskItem = (this.posX + (pageX - this.mouseX));
			var widthTaskItem = parseInt(this.cTaskItem[0].childNodes[0].firstChild.width);
			var posTaskItemR = posTaskItem + widthTaskItem;
			if(this.checkMove){
				if(((this.minPosXMove <= posTaskItem)) &&
				((posTaskItemR <= this.maxPosXMove) || (this.maxPosXMove == -1))){
					this.moveTaskItem(posTaskItem);
				}
			}
		},
		moveTaskItem: function(posX){
			var cTask = this.cTaskItem[0];
			cTask.style.left = posX + "px";
			cTask.childNodes[1].firstChild.rows[0].cells[0].innerHTML = this.getDateOnPosition(posX).getDate() + '.' + (this.getDateOnPosition(posX).getMonth() + 1) + '.' + this.getDateOnPosition(posX).getUTCFullYear();
		},
		resizeItem: function(event){
			if(this.checkResize){
				var mouseX = event.screenX;
				var widthTaskItem = this.taskItemWidth + (mouseX - this.mouseX);
				if(widthTaskItem >= this.taskItemWidth){
					if((widthTaskItem <= this.maxWidthResize) || (this.maxWidthResize == -1)){
						this.resizeTaskItem(widthTaskItem);
					}else if((this.maxWidthResize != -1) && (widthTaskItem > this.maxWidthResize)){
						this.resizeTaskItem(this.maxWidthResize);
					}
				}else if(widthTaskItem <= this.taskItemWidth){
					if(widthTaskItem >= this.minWidthResize){
						this.resizeTaskItem(widthTaskItem);
					}else if(widthTaskItem < this.minWidthResize){
						this.resizeTaskItem(this.minWidthResize);
					}
				}
			}
		},
		resizeTaskItem: function(width){
			var taskItem = this.cTaskItem[0];
			var countHours = Math.round(width / this.ganttChart.pixelsPerWorkHour);
			var trow = taskItem.childNodes[0].firstChild.rows[0],
				rc0 = trow.cells[0], rc1 = trow.cells[1];
			rc0 && (rc0.firstChild.style.width = parseInt(rc0.width) * width / 100 + "px");
			rc1 && (rc1.firstChild.style.width = parseInt(rc1.width) * width / 100 + "px");
			taskItem.childNodes[0].firstChild.width = width + "px";
			taskItem.childNodes[1].firstChild.width = width + "px";
			//resize info
			this.cTaskItem[0].childNodes[1].firstChild.rows[0].cells[0].innerHTML = countHours;
			var tcNode2 = taskItem.childNodes[2];
			tcNode2.childNodes[0].style.width = width + "px";
			tcNode2.childNodes[1].style.left = width - 10 + "px";
		},
		endResizeItem: function(){
			var taskItem = this.cTaskItem[0];
			if((this.taskItemWidth != parseInt(taskItem.childNodes[0].firstChild.width))){
				var posXL = taskItem.offsetLeft;
				var posXR = taskItem.offsetLeft + parseInt(taskItem.childNodes[0].firstChild.width);
				this.taskItem.duration = Math.round((posXR - posXL) / this.ganttChart.pixelsPerWorkHour);
				if(this.childPredTask.length > 0){
					for(var j = 0; j < this.childPredTask.length; j++){
						var cpctItem = this.childPredTask[j].cTaskItem[1],
							item0 = cpctItem[0], item2 = cpctItem[2], tcNode0 = taskItem.childNodes[0];
						item2.style.width = parseInt(item2.style.width) - (parseInt(tcNode0.firstChild.width) - this.taskItemWidth) + "px";
						item2.style.left = parseInt(item2.style.left) + (parseInt(tcNode0.firstChild.width) - this.taskItemWidth) + "px";
						item0.style.left = parseInt(item0.style.left) + (parseInt(tcNode0.firstChild.width) - this.taskItemWidth) + "px";
					}
				}
			}
			this.cTaskItem[0].childNodes[1].firstChild.rows[0].cells[0].innerHTML = "";
			this.checkResize = false;
			this.taskItemWidth = 0;
			this.mouseX = 0;
			this.showDescTask();
			this.project.shiftProjectItem();
			this.adjustPanelTime();
			if(this.ganttChart.resource){
				this.ganttChart.resource.refresh();
			}
		},
		startMove: function(event){
			this.moveChild = event.ctrlKey;
			this.mouseX = event.screenX;
			this.getMoveInfo();
			this.checkMove = true;
			this.hideDescTask();
		},
		showDescTask: function(){
			var posX = (parseInt(this.cTaskItem[0].style.left) + this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + 10);
			this.descrTask.style.left = posX + "px";
			this.descrTask.innerHTML = this.objKeyToStr(this.getTaskOwner());
			this.descrTask.style.visibility = 'visible';
		},
		hideDescTask: function(){
			domStyle.set(this.descrTask, "visibility", "hidden");
		},
		buildResourceInfo: function(resourceInfo){
			if(this.childTask && this.childTask.length > 0){
				for(var i = 0; i < this.childTask.length; i++){
					var cTask = this.childTask[i];
					cTask.buildResourceInfo(resourceInfo);
				}
			}
			if(lang.trim(this.taskItem.taskOwner).length > 0){
				var owners = this.taskItem.taskOwner.split(";");
				for(var i = 0; i < owners.length; i++){
					var o = owners[i];
					if(lang.trim(o).length <= 0){
						continue;
					}
					resourceInfo[o] ? (resourceInfo[o].push(this)) : (resourceInfo[o] = [this]);
				}
			}
		},
		objKeyToStr: function(obj, delm){
			var returnStr = "";
			delm = delm || " ";
			if(obj){
				for(var key in obj){
					returnStr += delm + key;
				}
			}
			return returnStr;
		},
		getTaskOwner: function(){
			var tOwner = {};
			if(lang.trim(this.taskItem.taskOwner).length > 0){
				var owners = this.taskItem.taskOwner.split(";");
				for(var i = 0; i < owners.length; i++){
					var o = owners[i];
					tOwner[o] = 1;
				}
			}
			arrayUtil.forEach(this.childTask, function(ctask){
				lang.mixin(tOwner, ctask.getTaskOwner());
			}, this);
			return tOwner;
		},
		moveDescTask: function(){
			var posX = (parseInt(this.cTaskItem[0].style.left) + this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + 10);
			this.descrTask.style.left = posX + "px";
		},
		getMoveInfo: function(){
			this.posX = parseInt(this.cTaskItem[0].style.left);
			var widthTaskItem = parseInt(this.cTaskItem[0].childNodes[0].firstChild.width);
			var posParentTaskItem = !this.parentTask ? 0 : parseInt(this.parentTask.cTaskItem[0].style.left);
			var posPredTaskItem = !this.predTask ? 0 : parseInt(this.predTask.cTaskItem[0].style.left) + parseInt(this.predTask.cTaskItem[0].childNodes[0].firstChild.width);
			var widthParentTaskItem = !this.parentTask ? 0 : parseInt(this.parentTask.cTaskItem[0].childNodes[0].firstChild.width);
		
			var childPredPosX = 0;
			var childParentPosX = 0;
			var childParentPosXR = 0;
			if(this.childPredTask.length > 0){
				var posChildTaskItem = null;
				arrayUtil.forEach(this.childPredTask, function(cpTask){
					if((!posChildTaskItem) || ((posChildTaskItem) && (posChildTaskItem > parseInt(cpTask.cTaskItem[0].style.left)))){
						posChildTaskItem = parseInt(cpTask.cTaskItem[0].style.left);
					}
				}, this);
				childPredPosX = posChildTaskItem;
			}
			if(this.childTask.length > 0){
				var posChildTaskItemR = null;
				arrayUtil.forEach(this.childTask, function(cTask){
					if((!posChildTaskItemR) || ((posChildTaskItemR) && (posChildTaskItemR > (parseInt(cTask.cTaskItem[0].style.left))))){
						posChildTaskItemR = parseInt(cTask.cTaskItem[0].style.left);
					}
				}, this);
				childParentPosXR = posChildTaskItemR;
				var posChildTaskItem = null;
				arrayUtil.forEach(this.childTask, function(cTask){
					if((!posChildTaskItem) || ((posChildTaskItem)
					&& (posChildTaskItem < (parseInt(cTask.cTaskItem[0].style.left) + parseInt(cTask.cTaskItem[0].firstChild.firstChild.width))))){
						posChildTaskItem = parseInt(cTask.cTaskItem[0].style.left) + parseInt(cTask.cTaskItem[0].firstChild.firstChild.width);
					}
				}, this);
				childParentPosX = posChildTaskItem;
			}
			if(!this.moveChild){
				if(this.childPredTask.length > 0){
					if(this.maxPosXMove < childPredPosX) this.maxPosXMove = childPredPosX;
				}
				if(this.childTask.length > 0){
					if((this.childPredTask.length > 0) && (this.maxPosXMove - widthTaskItem) > childParentPosXR){
						this.maxPosXMove = this.maxPosXMove - ((this.maxPosXMove - widthTaskItem) - childParentPosXR);
					}
					if(!(this.childPredTask.length > 0)){
						this.maxPosXMove = childParentPosXR + widthTaskItem;
					}
					this.minPosXMove = (childParentPosX - widthTaskItem);
				}
				if(posParentTaskItem > 0){
					if((!(this.childPredTask.length > 0)) && (this.childTask.length > 0)){
						if(this.maxPosXMove > posParentTaskItem + widthParentTaskItem){
							this.maxPosXMove = posParentTaskItem + widthParentTaskItem;
						}
					}
					if(this.minPosXMove <= posParentTaskItem){
						this.minPosXMove = posParentTaskItem;
					}
					if((!(this.childTask.length > 0)) && (!(this.childPredTask.length > 0))){
						this.maxPosXMove = posParentTaskItem + widthParentTaskItem;
					}else if((!(this.childTask.length > 0)) && (this.childPredTask.length > 0)){
						if((posParentTaskItem + widthParentTaskItem) > posPredTaskItem){
							this.maxPosXMove = childPredPosX;
						}
					}
				}
				if(posPredTaskItem > 0){
					if(this.minPosXMove <= posPredTaskItem){
						this.minPosXMove = posPredTaskItem;
					}
				}
				if((posPredTaskItem == 0) && (posParentTaskItem == 0)){
					if(this.minPosXMove <= this.ganttChart.initialPos){
						this.minPosXMove = this.ganttChart.initialPos;
					}
				}
			}else{
				if((posParentTaskItem > 0) && (posPredTaskItem == 0)){
					this.minPosXMove = posParentTaskItem;
					this.maxPosXMove = posParentTaskItem + widthParentTaskItem;
				}else if((posParentTaskItem == 0) && (posPredTaskItem == 0)){
					this.minPosXMove = this.ganttChart.initialPos;
					this.maxPosXMove = -1;
				}else if((posParentTaskItem > 0) && (posPredTaskItem > 0)){
					this.minPosXMove = posPredTaskItem;
					this.maxPosXMove = posParentTaskItem + widthParentTaskItem;
				}else if((posParentTaskItem == 0) && (posPredTaskItem > 0)){
					this.minPosXMove = posPredTaskItem;
					this.maxPosXMove = -1;
				}
				if((this.parentTask) && (this.childPredTask.length > 0)){
					var posChildTaskItem = this.getMaxPosPredChildTaskItem(this);
					var posParentTaskItem = parseInt(this.parentTask.cTaskItem[0].style.left) + parseInt(this.parentTask.cTaskItem[0].firstChild.firstChild.width);
					this.maxPosXMove = this.posX + widthTaskItem + posParentTaskItem - posChildTaskItem;
				}
			}
		},
		startResize: function(event){
			this.mouseX = event.screenX;
			this.getResizeInfo();
			this.hideDescTask();
			this.checkResize = true;
			this.taskItemWidth = parseInt(this.cTaskItem[0].firstChild.firstChild.width);
		},
		getResizeInfo: function(){
			var cTask = this.cTaskItem[0];
			var posParentTaskItem = !this.parentTask ? 0 : parseInt(this.parentTask.cTaskItem[0].style.left);
			var widthParentTaskItem = !this.parentTask ? 0 : parseInt(this.parentTask.cTaskItem[0].childNodes[0].firstChild.width);
			var posTaskItem = parseInt(cTask.style.left);
			var childPredPosX = 0;
			var childParentPosX = 0;
			if(this.childPredTask.length > 0){
				var posChildTaskItem = null;
				arrayUtil.forEach(this.childPredTask, function(cpTask){
					if((!posChildTaskItem) || ((posChildTaskItem) && (posChildTaskItem > parseInt(cpTask.cTaskItem[0].style.left)))){
						posChildTaskItem = parseInt(cpTask.cTaskItem[0].style.left);
					}
				}, this);
				childPredPosX = posChildTaskItem;
			}
			if(this.childTask.length > 0){
				var posChildTaskItem = null;
				arrayUtil.forEach(this.childTask, function(cTask){
					if((!posChildTaskItem) || ((posChildTaskItem) && (posChildTaskItem < (parseInt(cTask.cTaskItem[0].style.left) + parseInt(cTask.cTaskItem[0].firstChild.firstChild.width))))){
						posChildTaskItem = parseInt(cTask.cTaskItem[0].style.left) + parseInt(cTask.cTaskItem[0].firstChild.firstChild.width);
					}
				}, this);
				childParentPosX = posChildTaskItem;
			}
			this.minWidthResize = this.ganttChart.pixelsPerDay;
			if(this.childTask.length > 0){
				this.minWidthResize = childParentPosX - posTaskItem;
			}
			if((this.childPredTask.length > 0) && (!this.parentTask)){
				this.maxWidthResize = childPredPosX - posTaskItem;
			}else if((this.childPredTask.length > 0) && (this.parentTask)){
				var w1 = posParentTaskItem + widthParentTaskItem - posTaskItem;
				var w2 = childPredPosX - posTaskItem;
				this.maxWidthResize = Math.min(w1, w2);
			}else if((this.childPredTask.length == 0) && (this.parentTask)){
				this.maxWidthResize = posParentTaskItem + widthParentTaskItem - posTaskItem;
			}
		},
		createTaskItem: function(){
			this.posX = this.ganttChart.getPosOnDate(this.taskItem.startTime);
			var itemControl = domConstruct.create("div", {
				id: this.taskItem.id,
				className: "ganttTaskItemControl"
			});
			domStyle.set(itemControl, {
				left: this.posX + "px",
				top: this.posY + "px"
			});
			var divTaskItem = domConstruct.create("div", {className: "ganttTaskDivTaskItem"}, itemControl);
			var tblTaskItem = domConstruct.create("table", {
				cellPadding: "0",
				cellSpacing: "0",
				width: this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px",
				className: "ganttTaskTblTaskItem"
			}, divTaskItem);
			var rowTblTask = tblTaskItem.insertRow(tblTaskItem.rows.length);
			if(this.taskItem.percentage != 0){
				var cellTblTask = domConstruct.create("td", {
					height: this.ganttChart.heightTaskItem + "px",
					width: this.taskItem.percentage + "%"
				}, rowTblTask);
				cellTblTask.style.lineHeight = "1px";
				var imageProgress = domConstruct.create("div", {
					className: "ganttImageTaskProgressFilled"
				}, cellTblTask);
				domStyle.set(imageProgress, {
					width: (this.taskItem.percentage * this.taskItem.duration * this.ganttChart.pixelsPerWorkHour) / 100 + "px",
					height: this.ganttChart.heightTaskItem + "px"
				});
			}
			if(this.taskItem.percentage != 100){
				var cellTblTask = domConstruct.create("td", {
					height: this.ganttChart.heightTaskItem + "px",
					width: (100 - this.taskItem.percentage) + "%"
				}, rowTblTask);
				cellTblTask.style.lineHeight = "1px";
				var imageProgressFill = domConstruct.create("div", {
					className: "ganttImageTaskProgressBg"
				}, cellTblTask);
				domStyle.set(imageProgressFill, {
					width: ((100 - this.taskItem.percentage) * this.taskItem.duration * this.ganttChart.pixelsPerWorkHour) / 100 + "px",
					height: this.ganttChart.heightTaskItem + "px"
				});
			}
			if(this.ganttChart.isContentEditable){
				var divTaskInfo = domConstruct.create("div", {className: "ganttTaskDivTaskInfo"}, itemControl);
				var tblTaskInfo = domConstruct.create("table", {
					cellPadding: "0",
					cellSpacing: "0",
					height: this.ganttChart.heightTaskItem + "px",
					width: this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px"
				}, divTaskInfo);
				var rowTaskInfo = tblTaskInfo.insertRow(0);
				var cellTaskInfo = domConstruct.create("td", {
					align: "center",
					vAlign: "top",
					height: this.ganttChart.heightTaskItem + "px",
					className: "ganttMoveInfo"
				}, rowTaskInfo);
				var divTaskName = domConstruct.create("div", {className: "ganttTaskDivTaskName"}, itemControl);
				var divMove = domConstruct.create("div", {}, divTaskName);
				domConstruct.create("input", {
					className: "ganttTaskDivMoveInput",
					type: "text"
				}, divMove);
				domStyle.set(divMove, {
					background: "#000000",
					opacity: 0
				});
				domStyle.set(divMove, {
					height: this.ganttChart.heightTaskItem + "px",
					width: this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px"
				});
				//Creation resize area
				var divResize = domConstruct.create("div", {className: "ganttTaskDivResize"}, divTaskName);
				domConstruct.create("input", {
					className: "ganttTaskDivResizeInput",
					type: "text"
				}, divResize);
				domStyle.set(divResize, {
					left: (this.taskItem.duration * this.ganttChart.pixelsPerWorkHour - 10) + "px",
					height: this.ganttChart.heightTaskItem + "px",
					width: "10px"
				});
				this.ganttChart._events.push(
					on(divMove, "mousedown", lang.hitch(this, function(event){
						//start move
						this.moveMoveConn = on(document, "mousemove", lang.hitch(this, function(e){
							this.checkMove && this.moveItem(e);
						}));
						this.moveUpConn = on(document, "mouseup", lang.hitch(this, function(){
							if(this.checkMove){
								this.endMove();
								this.ganttChart.isMoving = false;
								document.body.releaseCapture && document.body.releaseCapture();
								this.moveMoveConn.remove();
								this.moveUpConn.remove();
							}
						}));
						this.startMove(event);
						this.ganttChart.isMoving = true;
						document.body.setCapture && document.body.setCapture(false);
					}))
				);
				this.ganttChart._events.push(
					on(divMove, "mouseover", lang.hitch(this, function(event){
						event.target && (event.target.style.cursor = "move");
					}))
				);
				this.ganttChart._events.push(
					on(divMove, "mouseout", lang.hitch(this, function(event){
						event.target.style.cursor = "";
					}))
				);
				this.ganttChart._events.push(
					on(divResize, "mousedown", lang.hitch(this, function(event){
						//start resize
						this.resizeMoveConn = on(document, "mousemove", lang.hitch(this, function(e){
							this.checkResize && this.resizeItem(e);
						}));
						this.resizeUpConn = on(document, "mouseup", lang.hitch(this, function(){
							if(this.checkResize){
								this.endResizeItem();
								this.ganttChart.isResizing = false;
								document.body.releaseCapture && document.body.releaseCapture();
								this.resizeMoveConn.remove();
								this.resizeUpConn.remove();
							}
						}));
						this.startResize(event);
						this.ganttChart.isResizing = true;
						document.body.setCapture && document.body.setCapture(false);
					}))
				);
				this.ganttChart._events.push(
					on(divResize, "mouseover", lang.hitch(this, function(event){
						(!this.ganttChart.isMoving) && (!this.ganttChart.isResizing) && event.target && (event.target.style.cursor = "e-resize");
					}))
				);
				this.ganttChart._events.push(
					on(divResize, "mouseout", lang.hitch(this, function(event){
						!this.checkResize && event.target && (event.target.style.cursor = "");
					}))
				);
			}
			return itemControl;
		},
		createTaskNameItem: function(){
			var divName = domConstruct.create("div", {
				id: this.taskItem.id,
				className: "ganttTaskTaskNameItem",
				title: this.taskItem.name + ", id: " + this.taskItem.id + " ",
				innerHTML: this.taskItem.name
			});
			domStyle.set(divName, "top", this.posY + "px");
			domAttr.set(divName, "tabIndex", 0);
			if(this.ganttChart.isShowConMenu){
				this.ganttChart._events.push(
					on(divName, "mouseover", lang.hitch(this, function(event){
						domClass.add(divName, "ganttTaskTaskNameItemHover");
						clearTimeout(this.ganttChart.menuTimer);
						this.ganttChart.tabMenu.clear();
						this.ganttChart.tabMenu.show(event.target, this);
					}))
				);
				this.ganttChart._events.push(
					on(divName, "keydown", lang.hitch(this, function(event){
						if(event.keyCode == keys.ENTER){
							this.ganttChart.tabMenu.clear();
							this.ganttChart.tabMenu.show(event.target, this);
						}
						if(this.ganttChart.tabMenu.isShow && (event.keyCode == keys.LEFT_ARROW || event.keyCode == keys.RIGHT_ARROW)){
							focus(this.ganttChart.tabMenu.menuPanel.firstChild.rows[0].cells[0]);
						}
						if(this.ganttChart.tabMenu.isShow && event.keyCode == keys.ESCAPE){
							this.ganttChart.tabMenu.hide();
						}
					}))
				);
				this.ganttChart._events.push(
					on(divName, "mouseout", lang.hitch(this, function(){
						domClass.remove(divName, "ganttTaskTaskNameItemHover");
						clearTimeout(this.ganttChart.menuTimer);
						this.ganttChart.menuTimer = setTimeout(lang.hitch(this, function(){
							this.ganttChart.tabMenu.hide();
						}), 200);
					}))
				);
				this.ganttChart._events.push(
					on(this.ganttChart.tabMenu.menuPanel, "mouseover", lang.hitch(this, function(){
						clearTimeout(this.ganttChart.menuTimer);
					}))
				);
				this.ganttChart._events.push(
					on(this.ganttChart.tabMenu.menuPanel, "keydown", lang.hitch(this, function(event){
						if(this.ganttChart.tabMenu.isShow && event.keyCode == keys.ESCAPE){
							this.ganttChart.tabMenu.hide();
						}
					}))
				);
				this.ganttChart._events.push(
					on(this.ganttChart.tabMenu.menuPanel, "mouseout", lang.hitch(this, function(){
						clearTimeout(this.ganttChart.menuTimer);
						this.ganttChart.menuTimer = setTimeout(lang.hitch(this, function(){
							this.ganttChart.tabMenu.hide();
						}), 200);
					}))
				);
			}
			return divName;
		},
		createTaskDescItem: function(){
			var posX = (this.posX + this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + 10);
			var divDesc = domConstruct.create("div", {
				innerHTML: this.objKeyToStr(this.getTaskOwner()),
				className: "ganttTaskDescTask"
			});
			domStyle.set(divDesc, {
				left: posX + "px",
				top: this.posY + "px"
			});
			return this.descrTask = divDesc;
		},
		checkWidthTaskNameItem: function(){
			if(this.cTaskNameItem[0].offsetWidth + this.cTaskNameItem[0].offsetLeft > this.ganttChart.maxWidthTaskNames){
				var width = this.cTaskNameItem[0].offsetWidth + this.cTaskNameItem[0].offsetLeft - this.ganttChart.maxWidthTaskNames;
				var countChar = Math.round(width / (this.cTaskNameItem[0].offsetWidth / this.cTaskNameItem[0].firstChild.length));
				var tName = this.taskItem.name.substring(0, this.cTaskNameItem[0].firstChild.length - countChar - 3);
				tName += "...";
				this.cTaskNameItem[0].innerHTML = tName;
			}
		},
		refreshTaskItem: function(itemControl){
			this.posX = this.ganttChart.getPosOnDate(this.taskItem.startTime);
			domStyle.set(itemControl, {
				"left": this.posX + "px"
			});
			var divTaskItem = itemControl.childNodes[0];
			var tblTaskItem = divTaskItem.firstChild;
			tblTaskItem.width = (!this.taskItem.duration ? 1 : this.taskItem.duration * this.ganttChart.pixelsPerWorkHour) + "px";
			var rowTblTask = tblTaskItem.rows[0];
			if(this.taskItem.percentage != 0){
				var cellTblTask = rowTblTask.firstChild;
				cellTblTask.height = this.ganttChart.heightTaskItem + "px";
				cellTblTask.width = this.taskItem.percentage + "%";
				cellTblTask.style.lineHeight = "1px";
				var imageProgress = cellTblTask.firstChild;
				domStyle.set(imageProgress, {
					width: (!this.taskItem.duration ? 1 : (this.taskItem.percentage * this.taskItem.duration * this.ganttChart.pixelsPerWorkHour / 100)) + "px",
					height: this.ganttChart.heightTaskItem + "px"
				});
			}
			if(this.taskItem.percentage != 100){
				var cellTblTask = rowTblTask.lastChild;
				cellTblTask.height = this.ganttChart.heightTaskItem + "px";
				cellTblTask.width = (100 - this.taskItem.percentage) + "%";
				cellTblTask.style.lineHeight = "1px";
				var imageProgressFill = cellTblTask.firstChild;
				domStyle.set(imageProgressFill, {
					width: (!this.taskItem.duration ? 1 : ((100 - this.taskItem.percentage) * this.taskItem.duration * this.ganttChart.pixelsPerWorkHour / 100)) + "px",
					height: this.ganttChart.heightTaskItem + "px"
				});
			}
			if(this.ganttChart.isContentEditable){
				var divTaskInfo = itemControl.childNodes[1];
				var tblTaskInfo = divTaskInfo.firstChild;
				tblTaskInfo.height = this.ganttChart.heightTaskItem + "px";
				tblTaskInfo.width = (!this.taskItem.duration ? 1 : (this.taskItem.duration * this.ganttChart.pixelsPerWorkHour)) + "px";
				var rowTaskInfo = tblTaskInfo.rows[0];
				var cellTaskInfo = rowTaskInfo.firstChild;
				cellTaskInfo.height = this.ganttChart.heightTaskItem + "px";
				var divTaskName = itemControl.childNodes[2];
				var divMove = divTaskName.firstChild;
				divMove.style.height = this.ganttChart.heightTaskItem + "px";
				divMove.style.width = (!this.taskItem.duration ? 1 : (this.taskItem.duration * this.ganttChart.pixelsPerWorkHour)) + "px";
				//Creation resize area
				var divResize = divTaskName.lastChild;
				domStyle.set(divResize, {
					"left": (this.taskItem.duration * this.ganttChart.pixelsPerWorkHour - 10) + "px"
				});
				divResize.style.height = this.ganttChart.heightTaskItem + "px";
				divResize.style.width = "10px";
			}
			return itemControl;
		},
		refreshTaskDesc: function(divDesc){
			var posX = (this.posX + this.taskItem.duration * this.ganttChart.pixelsPerWorkHour + 10);
			domStyle.set(divDesc, {
				"left": posX + "px"
			});
			return divDesc;
		},
		refreshConnectingLinesDS: function(arrLines){
			var arrowImg = arrLines[1];
			var lineVerticalRight = arrLines[0];
			//horizontal line
			var lineHorizontal = arrLines[2];
			var posXPreviousTask = domStyle.get(this.predTask.cTaskItem[0], "left");
			var posYPreviousTask = domStyle.get(this.predTask.cTaskItem[0], "top");
			var posXChildTask = domStyle.get(this.cTaskItem[0], "left");
			var posYChildTask = this.posY + 2;
			//width task item

			var widthPreviousTask = parseInt(this.predTask.cTaskItem[0].firstChild.firstChild.width);
			if(posYPreviousTask < posYChildTask){
				domStyle.set(lineVerticalRight, {
					"height": (posYChildTask - this.ganttChart.heightTaskItem / 2 - posYPreviousTask - 3) + "px",
					"left": (posXPreviousTask + widthPreviousTask - 20) + "px"
				});
				domStyle.set(lineHorizontal, {
					"width": (15 + (posXChildTask - (widthPreviousTask + posXPreviousTask))) + "px",
					"left": (posXPreviousTask + widthPreviousTask - 20) + "px"
				});
			
				domStyle.set(arrowImg, {
					"left": (posXChildTask - 7) + "px"
				});
			}else{
				domStyle.set(lineVerticalRight, {
					"height": (posYPreviousTask + 2 - posYChildTask) + "px",
					"left": (posXPreviousTask + widthPreviousTask - 20) + "px"
				});
				domStyle.set(lineHorizontal, {
					"width": (15 + (posXChildTask - (widthPreviousTask + posXPreviousTask))) + "px",
					"left": (posXPreviousTask + widthPreviousTask - 20) + "px"
				});
				domStyle.set(arrowImg, {
					"left": (posXChildTask - 7) + "px"
				});
			}
			return arrLines;
		},
		postLoadData: function(){
			//TODO e.g. task relative info...
		},
		refresh: function(){
			if(this.childTask && this.childTask.length > 0){
				arrayUtil.forEach(this.childTask, function(cTask){
					cTask.refresh();
				}, this);
			}
			//creation task item
			this.refreshTaskItem(this.cTaskItem[0]);
			this.refreshTaskDesc(this.cTaskItem[0].nextSibling);
			//Create Connecting Lines

			if(this.taskItem.previousTask && this.predTask){
				this.refreshConnectingLinesDS(this.cTaskItem[1]);
			}
			return this;
		},
		create: function(){
			var containerTasks = this.ganttChart.contentData.firstChild;

			var previousTask = this.taskItem.previousTask;
			var parentTask = this.taskItem.parentTask;
			var isCParentTask = (this.taskItem.cldTasks.length > 0);
			this.cTaskItem = [];
			this.cTaskNameItem = [];
			//creation arrTasks
			if(!parentTask){
				if(this.taskItem.previousParentTask){
					this.previousParentTask = this.project.getTaskById(this.taskItem.previousParentTask.id);
					var lastChildTask = this.ganttChart.getLastChildTask(this.previousParentTask);
					this.posY = parseInt(lastChildTask.cTaskItem[0].style.top)
						+ this.ganttChart.heightTaskItem + this.ganttChart.heightTaskItemExtra;
					this.previousParentTask.nextParentTask = this;
				}else{
					this.posY = parseInt(this.project.projectItem[0].style.top)
						+ this.ganttChart.heightTaskItem + this.ganttChart.heightTaskItemExtra;
				}
			}
			if(parentTask){
				var task = this.project.getTaskById(this.taskItem.parentTask.id);
				this.parentTask = task;
			
				if(this.taskItem.previousChildTask){
					this.previousChildTask = this.project.getTaskById(this.taskItem.previousChildTask.id);
					var lastChildTask = this.ganttChart.getLastChildTask(this.previousChildTask);
					this.posY = domStyle.get(lastChildTask.cTaskItem[0], "top")
						+ this.ganttChart.heightTaskItem + this.ganttChart.heightTaskItemExtra;
					this.previousChildTask.nextChildTask = this;
				}else{
					this.posY = domStyle.get(task.cTaskItem[0], "top")
						+ this.ganttChart.heightTaskItem + this.ganttChart.heightTaskItemExtra;
				}
				task.childTask.push(this);
			}
			if(previousTask){
				var task = this.project.getTaskById(previousTask.id);
				this.predTask = task;
				task.childPredTask.push(this);
			}
			//creation task item
			this.cTaskItem.push(this.createTaskItem());
			containerTasks.appendChild(this.cTaskItem[0]);
			if(this.ganttChart.panelNames){
				this.cTaskNameItem.push(this.createTaskNameItem());
				this.ganttChart.panelNames.firstChild.appendChild(this.cTaskNameItem[0]);
			}
			containerTasks.appendChild(this.createTaskDescItem());
			//Create Connecting Lines
			var arrConnectingLines = [];
			if(previousTask){
				arrConnectingLines = this.createConnectingLinesDS();
			}
			this.cTaskItem.push(arrConnectingLines);
			if(this.ganttChart.panelNames){
				//Create Connecting Lines
				var arrConnectingLinesNames = [];
				if(parentTask){
					this.cTaskNameItem[0].style.left = domStyle.get(this.parentTask.cTaskNameItem[0], "left") + 15 + "px";
					arrConnectingLinesNames = this.createConnectingLinesPN();
				}
				this.checkWidthTaskNameItem();
				//Identifier
				this.checkPosition();
				var treeImg = null;
				if(isCParentTask){
					treeImg = this.createTreeImg();
				}
				this.cTaskNameItem.push(arrConnectingLinesNames);
				this.cTaskNameItem.push(treeImg);
			}
			this.adjustPanelTime();
			return this;
		},
		checkPosition: function(){
			//task name position: check Task Identifier
			if(!this.ganttChart.withTaskId){
				return;
			}
			var pos = domGeometry.getMarginBox(this.cTaskNameItem[0], true);
			if(this.taskIdentifier){
				if(this.childTask && this.childTask.length > 0){
					arrayUtil.forEach(this.childTask, function(cTask){
						cTask.checkPosition();
					}, this);
				}
				domStyle.set(this.taskIdentifier, {
					"left": (pos.l + pos.w + 4) + "px",
					"top": (pos.t - 1) + "px"
				});
			}else{
				this.taskIdentifier = domConstruct.create("div", {
					id: "TaskId_" + this.taskItem.id,
					className: "ganttTaskIdentifier",
					title: this.taskItem.id,
					innerHTML: this.taskItem.id
				}, this.cTaskNameItem[0].parentNode);
				domStyle.set(this.taskIdentifier, {
					left: (pos.l + pos.w + 4) + "px",
					top: (pos.t - 1) + "px"
				});
			}
		},
		createTreeImg: function(){
			var treeImg = domConstruct.create("div", {
				id: this.taskItem.id,
				className: "ganttImageTreeCollapse"
			});
			domAttr.set(treeImg, "tabIndex", 0);
			arrayUtil.forEach(["click", "keydown"], function(e){
				this.ganttChart._events.push(
					on(treeImg, e, lang.hitch(this, function(evt){
						if(e == "keydown" && evt.keyCode != keys.ENTER){ return; }
						if(this.isExpanded){
							domClass.remove(treeImg, "ganttImageTreeCollapse");
							domClass.add(treeImg, "ganttImageTreeExpand");
							this.isExpanded = false;
							this.hideChildTasks(this);
							this.shiftCurrentTasks(this, -this.hideTasksHeight);
							this.ganttChart.checkPosition();
						}else{
							domClass.remove(treeImg, "ganttImageTreeExpand");
							domClass.add(treeImg, "ganttImageTreeCollapse");
							this.isExpanded = true;
							this.shiftCurrentTasks(this, this.hideTasksHeight);
							this.showChildTasks(this, true);
							this.hideTasksHeight = 0;
							this.ganttChart.checkPosition();
						}
					}))
				);
			}, this);
			this.ganttChart.panelNames.firstChild.appendChild(treeImg);
			domClass.add(treeImg, "ganttTaskTreeImage");
			domStyle.set(treeImg, {
				left: (domStyle.get(this.cTaskNameItem[0], "left") - 12) + "px",
				top: (domStyle.get(this.cTaskNameItem[0], "top") + 3) + "px"
			});
			return treeImg;
		},
		setPreviousTask: function(previousTaskId){
			if(previousTaskId == ""){
				this.clearPredTask();
			}else{
				var task = this.taskItem;
				if(task.id == previousTaskId){
					return false;
				}
				var predTaskObj = this.project.getTaskById(previousTaskId);
				if(!predTaskObj){
					return false;
				}
				var predTask = predTaskObj.taskItem;
				var a1 = predTask.parentTask == null, a2 = task.parentTask == null;
				if(a1 && !a2 || !a1 && a2 || !a1 && !a2 && (predTask.parentTask.id != task.parentTask.id)){
					return false;
				}
				//check time
				var startTime = task.startTime.getTime(),
					pest = predTask.startTime.getTime(),
					pdur = predTask.duration * 24 * 60 * 60 * 1000 / predTaskObj.ganttChart.hsPerDay;
				if((pest+pdur) > startTime){
					return false;
				}
				// remove current connection
				this.clearPredTask();
				if(!this.ganttChart.checkPosPreviousTask(predTask, task)){
					this.ganttChart.correctPosPreviousTask(predTask, task, this);
				}
				task.previousTaskId = previousTaskId;
				task.previousTask = predTask;
				this.predTask = predTaskObj;
				predTaskObj.childPredTask.push(this);
				this.cTaskItem[1] = this.createConnectingLinesDS();
			}
			return true;
		},
		clearPredTask: function(){
			if(this.predTask){
				var ch = this.predTask.childPredTask;
				for(var i = 0; i < ch.length; i++){
					if(ch[i] == this){
						ch.splice(i, 1);
						break;
					}
				}
				for(var i = 0; i < this.cTaskItem[1].length; i++){
					this.cTaskItem[1][i].parentNode.removeChild(this.cTaskItem[1][i]);
				}
				this.cTaskItem[1] = [];
				this.taskItem.previousTaskId = null;
				this.taskItem.previousTask = null;
				this.predTask = null;
			}
		},
		setStartTime: function(startTime, shiftChild){
			this.moveChild = shiftChild;
			this.getMoveInfo();
			var pos = this.ganttChart.getPosOnDate(startTime);
			if((parseInt(this.cTaskItem[0].firstChild.firstChild.width) + pos > this.maxPosXMove) && (this.maxPosXMove != -1)){
				this.maxPosXMove = -1;
				this.minPosXMove = -1;
				return false;
			}
			if(pos < this.minPosXMove){
				this.maxPosXMove = -1;
				this.minPosXMove = -1;
				return false;
			}
			this.cTaskItem[0].style.left = pos;
			var width = pos - this.posX;
			this.moveCurrentTaskItem(width, shiftChild);
			this.project.shiftProjectItem();
			this.descrTask.innerHTML = this.objKeyToStr(this.getTaskOwner());
			this.adjustPanelTime();
			this.posX = 0;
			this.maxPosXMove = -1;
			this.minPosXMove = -1;
			return true;
		},
		setDuration: function(duration){
			this.getResizeInfo();
			var width = this.ganttChart.getWidthOnDuration(duration);
			if((width > this.maxWidthResize) && (this.maxWidthResize != -1)){
				return false;
			}else if(width < this.minWidthResize){
				return false;
			}else{
				this.taskItemWidth = parseInt(this.cTaskItem[0].firstChild.firstChild.width);
				this.resizeTaskItem(width);
				this.endResizeItem();
				this.descrTask.innerHTML = this.objKeyToStr(this.getTaskOwner());
				return true;
			}
		},
		setTaskOwner: function(owner){
			owner = (owner == null || owner == undefined) ? "" : owner;
			this.taskItem.taskOwner = owner;
			this.descrTask.innerHTML = this.objKeyToStr(this.getTaskOwner());
			return true;
		},
		setPercentCompleted: function(percentage){
			percentage = parseInt(percentage);
			if(isNaN(percentage) || percentage > 100 || percentage < 0){
				return false;
			}
			var trow = this.cTaskItem[0].childNodes[0].firstChild.rows[0],
				rc0 = trow.cells[0], rc1 = trow.cells[1];
			if((percentage != 0) && (percentage != 100)){
				if((this.taskItem.percentage != 0) && (this.taskItem.percentage != 100)){
					rc0.width = percentage + "%";
					rc1.width = 100 - percentage + "%";
				}else if((this.taskItem.percentage == 0) || (this.taskItem.percentage == 100)){
					rc0.parentNode.removeChild(rc0);
					var cellTblTask = domConstruct.create("td", {
						height: this.ganttChart.heightTaskItem + "px",
						width: percentage + "%"
					}, trow);
					cellTblTask.style.lineHeight = "1px";
					var imageProgressFill = domConstruct.create("div", {
						className: "ganttImageTaskProgressFilled"
					}, cellTblTask);
					domStyle.set(imageProgressFill, {
						width: (percentage * this.taskItem.duration * this.ganttChart.pixelsPerWorkHour) / 100 + "px",
						height: this.ganttChart.heightTaskItem + "px"
					});
				
					cellTblTask = domConstruct.create("td", {
						height: this.ganttChart.heightTaskItem + "px",
						width: (100 - percentage) + "%"
					}, trow);
					cellTblTask.style.lineHeight = "1px";
					imageProgressFill = domConstruct.create("div", {
						className: "ganttImageTaskProgressBg"
					}, cellTblTask);
					domStyle.set(imageProgressFill, {
						width: ((100 - percentage) * this.taskItem.duration * this.ganttChart.pixelsPerWorkHour) / 100 + "px",
						height: this.ganttChart.heightTaskItem + "px"
					});
				}
			}else if(percentage == 0){
				if((this.taskItem.percentage != 0) && (this.taskItem.percentage != 100)){
					rc0.parentNode.removeChild(rc0);
					rc1.width = 100 + "%";
				}else{
					domClass.remove(rc0.firstChild, "ganttImageTaskProgressFilled");
					domClass.add(rc0.firstChild, "ganttImageTaskProgressBg");
				}
			}else if(percentage == 100){
				if((this.taskItem.percentage != 0) && (this.taskItem.percentage != 100)){
					rc1.parentNode.removeChild(rc1);
					rc0.width = 100 + "%";
				}else{
					domClass.remove(rc0.firstChild, "ganttImageTaskProgressBg");
					domClass.add(rc0.firstChild, "ganttImageTaskProgressFilled");
				}
			}
			this.taskItem.percentage = percentage;
			this.taskItemWidth = parseInt(this.cTaskItem[0].firstChild.firstChild.width);
			this.resizeTaskItem(this.taskItemWidth);
			this.endResizeItem();
			this.descrTask.innerHTML = this.objKeyToStr(this.getTaskOwner());
			return true;
		},
		setName: function(name){
			if(name){
				this.taskItem.name = name;
				this.cTaskNameItem[0].innerHTML = name;
				this.cTaskNameItem[0].title = name;
				this.checkWidthTaskNameItem();
				this.checkPosition();
				this.descrTask.innerHTML = this.objKeyToStr(this.getTaskOwner());
				this.adjustPanelTime();
			}
		}
	});
});