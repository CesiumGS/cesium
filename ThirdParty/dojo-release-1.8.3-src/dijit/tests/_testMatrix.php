<?php // IF you don't have PHP5 installed, you can't use this index! ?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
	"http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
	<title>Dojo Toolkit - Every Dijit Test + Theme</title>

	<style type="text/css">
		@import "../themes/claro/document.css";
		@import "css/dijitTests.css";
	</style>

</head>
<body>

	<h1 class="testTitle">Dijit Test Matrix Table</h1>

	<table id="testMatrix">
		<thead>
			<tr class="top"><th rowspan="2">Test</th><th colspan="4">Tundra</th><th colspan="4">Nihilo</th><th colspan="4">Soria</th></tr>
			<tr class="tests"><th>Normal</th><th>a11y</th><th>rtl</th><th>a11y + rtl<th>Normal</th><th>a11y</th><th>rtl</th><th>a11y + rtl<th>Normal</th><th>a11y</th><th>rtl</th><th>a11y + rtl</tr>
		</thead>
		<tbody><?php

			printLinks(".", "Base Dijit Tests");
			printLinks("./form", "Dijit Form Widget Tests");
			printLinks("./layout", "Dijit Layout Widget Tests");
			printLinks("./tree","Dijit Tree Tests");

		?>
		</tbody>
	</table>

</body>
</html>
<?php

function printLinks($path, $group){
	$handle = opendir($path);
	$i = 0;
	print "<tr class='spacer'><td colspan='13'>".$group."</td></tr>";
	while(false !== ($file = readdir($handle))){
		if(preg_match("/(test_|demo_)(.*)\.html/", $file, $matches)){
			$base = $matches[0];
			$link = $path."/".$matches[0];
			print
			"<tr class='testRow ". (++$i % 2 ==0 ? "alt" : "")   ."'>" .

				"<td class='label'>" . $base . "</td>" .

			    // standard / tundra:
				"<td><a href='".$link."'>run</a></td>" .
				"<td><a href='".$link."?a11y=true'>run</a></td>" .
				"<td><a href='".$link."?dir=rtl'>run</a></td>" .
				"<td><a href='".$link."?dir=rtl&amp;a11y=true'>run</a></td>" .

				// nihilo
				"<td><a href='".$link."?theme=nihilo'>run</a></td>" .
				"<td><a href='".$link."?theme=nihilo&amp;a11y=true'>run</a></td>" .
				"<td><a href='".$link."?theme=nihilo&amp;dir=rtl'>run</a></td>" .
				"<td><a href='".$link."?theme=nihilo&amp;dir=rtl&amp;a11y=true'>run</a></td>" .

				// soria
				"<td><a href='".$link."?theme=soria'>run</a></td>" .
				"<td><a href='".$link."?theme=soria&amp;a11y=true'>run</a></td>" .
				"<td><a href='".$link."?theme=soria&amp;dir=rtl'>run</a></td>" .
				"<td><a href='".$link."?theme=soria&amp;dir=rtl&amp;a11y=true'>run</a></td>" .

			 "</tr>";
		}
	}
}


?>
