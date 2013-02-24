<?php
	header("XDomainRequestAllowed: 1");
	header("Access-Control: allow <*>");
	if ($_REQUEST["url"]) {
		print "proxied";
	}
	if ($_REQUEST["windowname"]) {
		print "<html><script type='text/javascript'>window.name='cross-site response'</script></html>";
	}

?>
cross-site response