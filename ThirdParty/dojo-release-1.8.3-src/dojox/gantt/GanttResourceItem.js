define([
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
], function(declare, arrayUtil, lang, locale, request, on,
		dom, domClass, domConstruct, domStyle, domAttr, domGeometry, keys){
	return declare("dojox.gantt.GanttResourceItem", [], {
		constructor: function(ganttchart){
			this.ganttChart = ganttchart;
			this.ownerItem = [];
			this.ownerNameItem = [];
			this.ownerTaskNodeMapping = {};
			this.ownerTaskNodeMapping_time = {};
			this.resourceInfo = {};
			this.ownerTimeConsume = {};
		},
		clearAll: function(){
			this.clearData();
			this.clearItems();
		},
		clearData: function(){
			this.ownerItem = [];
			this.ownerNameItem = [];
			this.ownerTaskNodeMapping = {};
			this.ownerTaskNodeMapping_time = {};
			this.resourceInfo = {};
			this.ownerTimeConsume = {};
		},
		clearItems: function(){
			if(this.content.firstChild){
			    domConstruct.destroy(this.content.firstChild);
			}
		},
		buildResource: function(){
			var resourceInfo = {};
			arrayUtil.forEach(this.ganttChart.arrProjects, function(project){
				arrayUtil.forEach(project.arrTasks, function(task){
					task.buildResourceInfo(resourceInfo);
				}, this);
			}, this);
			return resourceInfo;
		},
		buildOwnerTimeConsume: function(){
			var ownerTimeConsume = {};
			for(var owner in this.resourceInfo){
				var tasks = this.resourceInfo[owner];
				//combine time zone  (startTime - this.startDate) / (60 * 60 * 1000) * this.pixelsPerHour;
				var timeZoom = {};
				for(var i = 0; i < tasks.length; i++){
					var task = tasks[i];
					var startTime = task.taskItem.startTime.getTime(), dur = task.taskItem.duration * 24 * 60 * 60 * 1000 / this.ganttChart.hsPerDay;
					timeZoom.min = timeZoom.min ? Math.min(timeZoom.min, startTime) : startTime;
					timeZoom.max = timeZoom.max ? Math.max(timeZoom.max, (startTime + dur)) : (startTime + dur);
				}
				timeZoom.dur = (timeZoom.max - timeZoom.min) * this.ganttChart.hsPerDay / (24 * 60 * 60 * 1000);
				timeZoom.min = new Date(timeZoom.min);
				timeZoom.max = new Date(timeZoom.max);
				ownerTimeConsume[owner] = timeZoom;
			}
			return ownerTimeConsume;
		},
		refresh: function(){
			this.ownerTimeConsume = this.buildOwnerTimeConsume();
			//resize outer div
			this.contentData.firstChild.style.width = Math.max(1200, this.ganttChart.pixelsPerDay * this.ganttChart.totalDays) + "px";
			for(var owner in this.resourceInfo){
				this.refreshOwnerEntry(owner);
			}
		},
		reConstruct: function(){
			this.clearAll();
			this.resourceInfo = this.buildResource();
			this.ownerTimeConsume = this.buildOwnerTimeConsume();
			this.tableControl = domConstruct.create("table", {
				cellPadding: "0",
				cellSpacing: "0",
				className: "ganttResourceTableControl"
			});
			var newRowTblControl = this.tableControl.insertRow(this.tableControl.rows.length);
			//Add to content Table
			this.contentHeight = this.content.offsetHeight;
			this.contentWidth = this.content.offsetWidth;
			this.content.appendChild(this.tableControl);
			//Creation panel contentData
			this.contentData = domConstruct.create("div", {className: "ganttResourceContentDataContainer"});
			this.contentData.appendChild(this.createPanelOwners());
			domStyle.set(this.contentData, "height", (this.contentHeight - this.ganttChart.panelTimeHeight) + "px");
			//Creation panel of names
			var newCellTblControl = domConstruct.create("td", {
				vAlign: "top"
			});
			this.panelNames = domConstruct.create("div", {className: "ganttResourcePanelNames"});
			this.panelNames.appendChild(this.createPanelNamesOwners());
			newCellTblControl.appendChild(this.panelNames);
			newRowTblControl.appendChild(newCellTblControl);
			//add to control contentData and contentDataTime
			newCellTblControl = domConstruct.create("td", {
				vAlign: "top"
			});
			var divCell = domConstruct.create("div", {className: "ganttResourceDivCell"});
			divCell.appendChild(this.contentData);
			newCellTblControl.appendChild(divCell);
			newRowTblControl.appendChild(newCellTblControl);
			//Show panel of names
			domStyle.set(this.panelNames, {
				height: (this.contentHeight - this.ganttChart.panelTimeHeight - this.ganttChart.scrollBarWidth) + "px",
				width: this.ganttChart.maxWidthPanelNames + "px"
			});
			this.contentData.style.width = (this.contentWidth - this.ganttChart.maxWidthPanelNames) + "px";
			this.contentData.firstChild.style.width = this.ganttChart.pixelsPerDay * (this.ganttChart.panelTime.firstChild.firstChild.rows[3].cells.length) + "px";
			var _this = this;
			this.contentData.onscroll = function(){
				if(_this.panelNames){
					_this.panelNames.scrollTop = this.scrollTop;
				}
			};
			this.contentData.scrollLeft = this.ganttChart.contentData.scrollLeft;
			for(var owner in this.resourceInfo){
				this.createOwnerEntry(owner);
			}
			this.postAdjustment();
		},
		create: function(){
			var resourceHeader = domConstruct.create("div", {
				innerHTML: "Resource Chart:",
				className: "ganttResourceHeader"
			}, this.ganttChart.content, "after");
			domStyle.set(resourceHeader, "width", this.ganttChart.contentWidth + "px");
			var content = domConstruct.create("div", {className: "ganttResourceContent"}, resourceHeader, "after");
			domStyle.set(content, {
				width: this.ganttChart.contentWidth + "px",
				height: (this.ganttChart.resourceChartHeight || (this.ganttChart.contentHeight * 0.8)) + "px"
			});
			this.content = content || this.content;
			//create Table
			this.reConstruct();
		},
		postAdjustment: function(){
			//contentData height
			this.contentData.firstChild.style.height = (this.ownerItem.length * 23) + "px";
			this.panelNames.firstChild.style.height = (this.ownerItem.length * 23) + "px";
		},
	
		refreshOwnerEntry: function(owner){
			this.refreshOwnerItem(owner);
			arrayUtil.forEach(this.resourceInfo[owner], function(task, i){
				var item = this.ownerTaskNodeMapping[owner].tasks[i][0];
				this.refreshDetailedTaskEntry(owner, item, task);
			}, this);
		},
		createOwnerEntry: function(owner){
			var containerOwner = this.contentData.firstChild;
			var previousOwner = this.ownerItem[this.ownerItem.length - 1];
			this.ownerTaskNodeMapping[owner] = {};
			this.ownerTaskNodeMapping[owner][owner] = [];
			//creation arrTasks
			var posY = (previousOwner ? parseInt(previousOwner.style.top) : (6 - 23)) + this.ganttChart.heightTaskItem + 11;
			//creation task item
			var oItem = this.createOwnerItem(owner, posY);
			containerOwner.appendChild(oItem);
			this.ownerItem.push(oItem);
			this.ownerTaskNodeMapping[owner][owner].push(oItem);
			if(this.panelNames){
				var oNameItem = this.createOwnerNameItem(owner, posY);
				this.panelNames.firstChild.appendChild(oNameItem);
				this.ownerNameItem.push(oNameItem);
				this.ownerTaskNodeMapping[owner][owner].push(oNameItem);
			}
			var currentOwnerNameNode = this.ownerNameItem[this.ownerNameItem.length - 1];
			//adjust nodes
			if(this.panelNames){
				this.checkWidthTaskNameItem(currentOwnerNameNode);
				var treeImg = this.createTreeImg(currentOwnerNameNode);
				this.panelNames.firstChild.appendChild(treeImg);
				this.ownerTaskNodeMapping[owner][owner].push(treeImg);
			}
			this.ownerTaskNodeMapping[owner]["taskCount"] = this.resourceInfo[owner].length;
			this.ownerTaskNodeMapping[owner]["isOpen"] = false;
			this.ownerTaskNodeMapping[owner]["tasks"] = [];
			arrayUtil.forEach(this.resourceInfo[owner], function(task){
				this.ownerTaskNodeMapping[owner]["tasks"].push(this.createDetailedTaskEntry(owner, currentOwnerNameNode, task));
			}, this);
			return this;
		},
		createOwnerNameItem: function(owner, posY){
			var ownerName = domConstruct.create("div", {
				id: owner,
				title: owner,
				innerHTML: owner,
				className: "ganttOwnerNameItem"
			});
			domStyle.set(ownerName, "top", posY + "px");
			return ownerName;
		},
		refreshOwnerItem: function(owner){
			var item = this.ownerTaskNodeMapping[owner][owner][0],
				start = this.ownerTimeConsume[owner].min, dur = this.ownerTimeConsume[owner].dur,
				posX = this.ganttChart.getPosOnDate(start); // should be task start date
			item.style.left = posX + "px";
			item.style.width = dur * this.ganttChart.pixelsPerWorkHour + "px";
			arrayUtil.forEach(this.resourceInfo[owner], function(task, i){
				var tposX = this.ganttChart.getPosOnDate(task.taskItem.startTime); // should be task start date
				domStyle.set(item.childNodes[i], {
					left: (tposX - posX) + "px",
					width: task.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px"
				});
			}, this);
		},
		createOwnerItem: function(owner, posY){
			var start = this.ownerTimeConsume[owner].min, dur = this.ownerTimeConsume[owner].dur;
			var posX = this.ganttChart.getPosOnDate(start); // should be task start date
			var ownerControl = domConstruct.create("div", {
				id: owner,
				owner: true,
				className: "ganttOwnerBar"
			});
			domStyle.set(ownerControl, {
				left: posX + "px",
				top: posY + "px",
				width: dur * this.ganttChart.pixelsPerWorkHour + "px",
				height: this.ganttChart.heightTaskItem + "px"
			});
			arrayUtil.forEach(this.resourceInfo[owner], function(task){
				var ownerTaskItem = domConstruct.create("div", {
					id: owner,
					className: "ganttOwnerTaskBar"
				}, ownerControl);
				var tposX = this.ganttChart.getPosOnDate(task.taskItem.startTime); // should be task start date
				domStyle.set(ownerTaskItem, {
					left: (tposX - posX) + "px",
					width: task.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px", // should be task duration
					height: this.ganttChart.heightTaskItem + "px"
				});
			}, this);
			return ownerControl;
		},
		refreshDetailedTaskEntry: function(owner, item, task){
			this.refreshTaskItem(item, task);
		},
		createDetailedTaskEntry: function(owner, parentNode, task){
			var taskItems = [];
			var containerTasks = this.contentData.firstChild;
			var posY = parseInt(parentNode.style.top);
		
			//creation task item
			var taskItem = this.createTaskItem(task, posY);
			taskItem.style.display = "none";
			containerTasks.appendChild(taskItem);
			this.ownerItem.push(taskItem);
			taskItems.push(taskItem);
			if(this.panelNames){
				var taskNameItem = this.createTaskNameItem(task.taskItem.name, posY);
				this.panelNames.firstChild.appendChild(taskNameItem);
				taskNameItem.style.display = "none";
				this.ownerNameItem.push(taskNameItem);
				taskItems.push(taskNameItem);
			}
			if(this.panelNames){
				this.ownerNameItem[this.ownerNameItem.length - 1].style.left = domStyle.get(parentNode, "left") + 15 + "px";
				var arrConnectingLinesNames = this.createConnectingLinesPN(parentNode, this.ownerNameItem[this.ownerNameItem.length - 1]);
				arrayUtil.forEach(arrConnectingLinesNames, function(lineName){
					lineName.style.display = "none";
				}, this);
				taskItems.push({
					"v": arrConnectingLinesNames[0],
					"h": arrConnectingLinesNames[1]
				});
				this.checkWidthTaskNameItem(this.ownerNameItem[this.ownerNameItem.length - 1]);
			}
			return taskItems;
		},
		createTaskNameItem: function(owner, posY){
			var taskNameItem = domConstruct.create("div", {
				id: owner,
				className: "ganttTaskNameItem",
				title: owner,
				innerHTML: owner
			});
			domStyle.set(taskNameItem, "top", posY + "px");
			return taskNameItem;
		},
		refreshTaskItem: function(item, task){
			var posX = this.ganttChart.getPosOnDate(task.taskItem.startTime); // should be task start date
			domStyle.set(item, {
				left: posX + "px",
				width: task.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px"
			});
		},
		createTaskItem: function(task, posY){
			var posX = this.ganttChart.getPosOnDate(task.taskItem.startTime); // should be task start date
			var itemControl = domConstruct.create("div", {
				id: task.taskItem.name,
				className: "ganttTaskBar"
			});
			domStyle.set(itemControl, {
				left: posX + "px",
				top: posY + "px",
				width: task.taskItem.duration * this.ganttChart.pixelsPerWorkHour + "px",
				height: this.ganttChart.heightTaskItem + "px"
			});
			return itemControl;
		},
		createConnectingLinesPN: function(parentNode, currentNode){
			var arrConnectingLinesNames = [];
			var lineVerticalLeft = domConstruct.create("div", {
				innerHTML: "&nbsp;",
				className: "ganttResourceLineVerticalLeft"
			}, this.panelNames.firstChild);
			lineVerticalLeft.cNode = currentNode;
			lineVerticalLeft.pNode = parentNode;
			var LineHorizontalLeft = domConstruct.create("div", {
				noShade: true,
				color: "#000",
				className: "ganttResourceLineHorizontalLeft"
			}, this.panelNames.firstChild);
			LineHorizontalLeft.cNode = currentNode;
			LineHorizontalLeft.pNode = parentNode;
			this.panelNames.firstChild.appendChild(LineHorizontalLeft);
			arrConnectingLinesNames.push(lineVerticalLeft);
			arrConnectingLinesNames.push(LineHorizontalLeft);
			return arrConnectingLinesNames;
		},
		createTreeImg: function(ownerNameItem){
			var treeImg = domConstruct.create("div", {
				id: ownerNameItem.id,
				className: "ganttImageTreeExpand"
			});
			domAttr.set(treeImg, "tabIndex", 0);
			var currentItem = this.ownerTaskNodeMapping[ownerNameItem.id];
			arrayUtil.forEach(["click", "keydown"], function(e){
				this.ganttChart._events.push(
					on(treeImg, e, lang.hitch(this, function(evt){
						var reachTarget = false, owner, ownerItem;
						if(e == "keydown" && evt.keyCode != keys.ENTER){ return; }
						//TODO: perhaps the following conditional can be collapsed?  Duplicate code.
						if(currentItem.isOpen){
							domClass.remove(treeImg, "ganttImageTreeCollapse");
							domClass.add(treeImg, "ganttImageTreeExpand");
							currentItem.isOpen = false;
							//collapse
							for(owner in this.ownerTaskNodeMapping){
								ownerItem = this.ownerTaskNodeMapping[owner];
								if(reachTarget){
									arrayUtil.forEach(ownerItem[owner], function(tItem){
										domStyle.set(tItem, "top", domStyle.get(tItem, "top") - currentItem.taskCount * 23 + "px");
									});
									arrayUtil.forEach(ownerItem.tasks, function(tItems){
										arrayUtil.forEach(tItems, function(tItem){
											var item = !tItem.v && !tItem.h ? [tItem] : [tItem.v, tItem.h];
											arrayUtil.forEach(item, function(t){
												domStyle.set(t, "top", domStyle.get(t, "top") - currentItem.taskCount * 23 + "px");
											});
										});
									});
								}else{
									if(owner == ownerNameItem.id){
										reachTarget = true;
										arrayUtil.forEach(ownerItem.tasks, function(tItems){
											arrayUtil.forEach(tItems, function(tItem){
												this.styleOwnerItem(tItem, ownerItem[owner][0], "none", 0);
											}, this);
										}, this);
									}
								}
							}
						}else{
							domClass.remove(treeImg, "ganttImageTreeExpand");
							domClass.add(treeImg, "ganttImageTreeCollapse");
							currentItem.isOpen = true;
							//expand
							for(owner in this.ownerTaskNodeMapping){
								ownerItem = this.ownerTaskNodeMapping[owner];
								if(reachTarget){
									arrayUtil.forEach(ownerItem[owner], function(tItem){
										domStyle.set(tItem, "top", domStyle.get(tItem, "top") + currentItem.taskCount * 23 + "px");
									});
									arrayUtil.forEach(ownerItem.tasks, function(tItems){
										arrayUtil.forEach(tItems, function(tItem){
											var item = !tItem.v && !tItem.h ? [tItem] : [tItem.v, tItem.h];
											arrayUtil.forEach(item, function(t){
												domStyle.set(t, "top", domStyle.get(t, "top") + currentItem.taskCount * 23 + "px");
											});
										});
									});
								}else{
									if(owner == ownerNameItem.id){
										reachTarget = true;
										arrayUtil.forEach(ownerItem.tasks, function(tItems, i){
											arrayUtil.forEach(tItems, function(tItem){
												this.styleOwnerItem(tItem, ownerItem[owner][0], "inline", (i + 1) * 23);
											}, this);
										}, this);
									}
								}
							}
						}
					}))
				);
			}, this);
			domClass.add(treeImg, "ganttResourceTreeImage");
			domStyle.set(treeImg, {
				left: (domStyle.get(ownerNameItem, "left") - 12) + "px",
				top: (domStyle.get(ownerNameItem, "top") + 3) + "px"
			});
			return treeImg;
		},
		styleOwnerItem: function(tItem, owner, displayType, topOffset){
			if(tItem.v || tItem.h){
				domStyle.set(tItem.v, {
					height: Math.max(1, (tItem.v.cNode.offsetTop - tItem.v.pNode.offsetTop)) + "px",
					top: (tItem.v.pNode.offsetTop + 5) + "px",
					left: (tItem.v.pNode.offsetLeft - 9) + "px",
					display: displayType
				});
				domStyle.set(tItem.h, {
					width: Math.max(1, (tItem.h.cNode.offsetLeft - tItem.h.pNode.offsetLeft + 4)) + "px",
					top: (tItem.h.cNode.offsetTop + 5) + "px",
					left: (tItem.h.pNode.offsetLeft - 9) + "px",
					display: displayType
				});
			}else{
				domStyle.set(tItem, {
					display: displayType,
					top: parseInt(owner.style.top) + topOffset + "px"
				});
			}
		},
		checkWidthTaskNameItem: function(taskNameItem){
			if(taskNameItem && taskNameItem.offsetWidth + taskNameItem.offsetLeft > this.ganttChart.maxWidthPanelNames){
				var width = taskNameItem.offsetWidth + taskNameItem.offsetLeft - this.ganttChart.maxWidthPanelNames,
					countChar = Math.round(width / (taskNameItem.offsetWidth / taskNameItem.firstChild.length)),
					tName = taskNameItem.id.substring(0, taskNameItem.firstChild.length - countChar - 3);
				taskNameItem.innerHTML = tName + "...";
			}
		},
		createPanelOwners: function(){
			var panelOwner = domConstruct.create("div", {
				className: "ganttOwnerPanel"
			});
			domStyle.set(panelOwner, {
				height: (this.contentHeight - this.ganttChart.panelTimeHeight - this.ganttChart.scrollBarWidth) + "px"
			});
			return panelOwner;
		},
		createPanelNamesOwners: function(){
			var panelNameOwner = domConstruct.create("div", {
				innerHTML: "&nbsp;",
				className: "ganttResourcePanelNamesOwners"
			});
			domStyle.set(panelNameOwner, {
				height: (this.contentHeight - this.ganttChart.panelTimeHeight - this.ganttChart.scrollBarWidth) + "px",
				width: this.ganttChart.maxWidthPanelNames + "px"
			});
			return panelNameOwner;
		}
	});
});