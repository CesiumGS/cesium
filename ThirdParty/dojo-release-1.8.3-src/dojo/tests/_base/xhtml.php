<?
	if(isset($_SERVER["HTTP_ACCEPT"]) && stristr( $_SERVER["HTTP_ACCEPT"], "application/xhtml+xml")){
		header("Content-type: application/xhtml+xml");
	}else{
		header("Content-type: text/html");
	}
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1 Strict//EN"
    "http://www.w3.org/TR/xhtml1/DTD/xhtml11-strict.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<script type="text/javascript">
			djConfig = { isDebug: true };
		</script>
		<script type="text/javascript" src="../../dojo.js"></script>
		<script type="text/javascript">
			dojo.addOnLoad(function(){
				dojo.query("h1.thinger").forEach(function(n){
					console.debug(n);
				});
			});
		</script>
	</head>
	<body>
		<h1 class="howdy thinger">hey there!</h1>
		<h1 class="something else">...</h1>
	</body>
</html>
