dojo.provide("util.docscripts.cheat.floatup");
(function(d){
	
	function getMax(list){
		return Math.max.apply(Math, list)
	}

	function getMin(list){
		return Math.min.apply(Math, list);
	}

	function sum(ar){
		var t = 0;
		dojo.forEach(ar, function(v){ t += v });
		return t;
	}

	d.NodeList.prototype.floatup = function(selector){
		
		selector = selector || "> *";
		
		return this.forEach(function(n){
		   
			var targets = d.query(selector, n),
				colWidth = 254,
				cols = 4,
				useHighest = true,
				numTargets = targets.length,
				targetData = d.map(targets, function(n){ return [n, Math.floor(d.position(n).h)] });
				heights = d.map(targetData, function(o){ return o[1]; }),
				totalHeight = sum(heights),
				// optimum is either the largest height or an average of the total height over the cols
				avgHeight = totalHeight / cols,
				maxHeight = getMax(heights),
				optimumHeight = Math.max(avgHeight, maxHeight),
				threshold = 75 // pixels to allow over/under optimum
			;

			function inBounds(val){
				// returns bool if passed height is within bounds of optimum
				var upper = optimumHeight + threshold, lower = optimumHeight - threshold;
				if(val == optimumHeight || (val <= upper && val >= lower)){
					return true;
				}else{
					return false;
				}
			}

			function getOptimumPositions(data, sizes, cols){
				// return an Array of Arrays. Each item in the top level array will be an Array
				//	of reference to the nodes that needs to be in the corresponding col

				var col = 0;
				var ret = new Array(cols + 1);
				d.forEach(ret, function(i, idx){ ret[idx] = []; });

				function colFromHeap(ar){
					//console.warn("making col", col, ar, sum(ar), sizes.length, data.length, ret[col]);
					d.forEach(ar, function(size){
						var idx = d.indexOf(sizes, size);
						if(~idx){
							ret[col].push(data[idx][0]);
							data.splice(idx, 1);
							sizes.splice(idx, 1);
						}else{
							// console.warn("ugh?", size, sizes, idx);
						}

					});
					// console.log(ret[col]);
					col++;
				}
				var pass = 0;

				while(sizes.length){

					var heap = [];

					// first size
					heap.push(useHighest ? getMax(sizes) : sizes[0]);
					if(!inBounds(sum(heap))){
						d.forEach(sizes, function(size){
							var now = sum(heap);
							if(inBounds(now + size) || size < optimumHeight - now){
								heap.push(size);
							}
						});
					}

					colFromHeap(heap);
				}

				return ret;
			}
				
			var stuff = getOptimumPositions(targetData, heights, cols);
			d.forEach(stuff, function(col, idx){

				var colNode = d.create("div", {
					style:{ width: colWidth + "px", "float":"left" }
				}, n);

				d.forEach(col, function(node){
					d.place(node, colNode);
				});
			});
			
		});
		
	};

})(dojo);