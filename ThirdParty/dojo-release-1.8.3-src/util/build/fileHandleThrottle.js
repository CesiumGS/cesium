define([], function(){
	var
		count = 0,
		max = 10,
		queue = [];
	return {
		release:function(){
			if(queue.length){
				(queue.shift())();
			}else{
				count--;
			}
		},
		enqueue:function(proc){
			if(count<max){
				count++;
				proc();
			}else{
				queue.push(proc);
			}
		}
	};
});
