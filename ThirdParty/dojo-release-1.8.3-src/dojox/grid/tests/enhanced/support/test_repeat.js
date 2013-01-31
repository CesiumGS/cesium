(function(){
var gridIndex = 0;
var totalCount = 1000;
var timeInterval = 500;
function createGrid(step){
	try{
		var g = dijit.byId("grid");
		g && g.destroyRecursive();
		dojo.publish("test_repeat_grid_destroyed");
		for(gridIndex += step; gridIndex < 0; gridIndex += layout.length){}
		gridIndex %= layout.length;
		console.log("grid plugin args:", gridAttrs.plugins, gridIndex);
		var t1 = (new Date()).getTime();
		g = new dojox.grid.EnhancedGrid(dojo.mixin({
			"id": "grid",
			"store": test_store[0],
			"structure": layout[gridIndex]
		}, gridAttrs || {}));
		g.placeAt(dojo.byId("gridContainer"));
		g.startup();
		dojo.byId("num").value = gridIndex;
		console.log(gridIndex + "---------------------------------------------------------------", (new Date()).getTime() - t1, "ms");
		dojo.publish("test_repeat_grid_created");
		return g;
	}catch(e){
		console.log("createGrid:",e);
	}
}
var cnt = totalCount;
function start(){
	if(cnt > 0){
		--cnt;
		createGrid(1);
		setTimeout(start, timeInterval);
	}else{
		var g = dijit.byId("grid");
		g && g.destroyRecursive();
		cnt = totalCount;
	}
}
function stop(){
	cnt = 0;
}
function gotoGrid(){
	var id = parseInt(dojo.byId('num').value) % layout.length;
	gridIndex = isNaN(id) ? gridIndex : id;
	createGrid(0);
}
function destroy(){
	var g = dijit.byId("grid");
	g && g.destroyRecursive();
	dojo.publish("test_repeat_grid_destroyed");
}
dojo.addOnLoad(function(){
	var btns = dojo.byId("ctrlBtns");
	btns.appendChild(dojo.create("button",{
		"innerHTML": "Play",
		"onclick": start
	}));
	btns.appendChild(dojo.create("button",{
		"innerHTML": "Stop",
		"onclick": stop
	}));
	btns.appendChild(dojo.create("button",{
		"innerHTML": "Prev",
		"onclick": dojo.partial(createGrid, -1)
	}));
	btns.appendChild(dojo.create("button",{
		"innerHTML": "Next",
		"onclick": dojo.partial(createGrid, 1)
	}));
	btns.appendChild(dojo.create("input",{
		"id": "num",
		"value": gridIndex,
		"type": "text"
	}));
	btns.appendChild(dojo.create("button",{
		"innerHTML": "Create",
		"onclick": gotoGrid
	}));
	btns.appendChild(dojo.create("button",{
		"innerHTML": "Destroy",
		"onclick": destroy
	}));
	//gotoGrid();
});
})();
