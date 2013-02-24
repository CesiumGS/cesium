<?php
	// This file is loaded by the test files via ContentPane's href attribute.

	// If you call this file like borderContainer.php?id=foo then the id's of the created widgets
	// will be based on the string "foo"
	$id = htmlspecialchars($_GET['id']);

	// sized=true means that it will add a width/height to the BorderContainer
?>
<div data-dojo-type="dijit/layout/BorderContainer"
	id="<?php echo $id?>BorderContainer"
	<?php
		if($_GET['sized']){
			print "style='width: 300px; height: 300px;'";
		}
	?>
>
	<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='region:"left", style:"width: 200px;"'>
		This file contains a single top-level BorderContainer layout widget.
	</div>
	<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='region:"center", onLoad:myOnLoad'>
		But it also has some nested layout widgets, and when this file is loaded the TabContainer and
		BorderContainer below should get resize() called on them
		<div data-dojo-type="dijit/layout/TabContainer" id="<?php echo $id?>InnerTabContainer"
			data-dojo-props='style:"width: 300px; height: 300px;"'>
			<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='title:"Tab 1"'><?php echo $id?> tab1</div>
			<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='title:"Tab 2"'><?php echo $id?> tab2</div>
		</div>
		<div data-dojo-type="dijit/layout/BorderContainer" id="<?php echo $id?>InnerBorderContainer"
			data-dojo-props='style:"width: 300px; height: 300px;"'>
			<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props='region:"center"'>inner border container</div>
		</div>
	</div>
</div>
