function timestamp(){
	// this function isn't really necessary...
	// just using it to show you can call a function to get a profile property value
	var d = new Date();
	return d.getFullYear() + '-' + (d.getMonth()+1) + "-" + d.getDate() + "-" +
		d.getHours() + ':' + d.getMinutes() + ":" + d.getSeconds();
}

var profile = {
	basePath:".",
	buildTimestamp:timestamp()
};
