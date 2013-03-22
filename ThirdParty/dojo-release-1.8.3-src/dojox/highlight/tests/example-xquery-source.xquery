declare variable $my:entityName as xs:string external;

declare variable $databaseURI := concat('jdbc://getCreditDefaultSwapsByEntityName?cd&#37;&amp;', $my:entityName); 
declare variable $creditDefaultSwaps := collection($databaseURI);

declare function local:equityRows($root) {
	for $equity in $root//equity
	let $referenceEntity := $creditDefaultSwaps//fpml:referenceEntity
	where $equity/name = $referenceEntity/fpml:entityName
	return
		<tr xmlns="http://www.w3.org/1999/xhtml">
			<td>{ $equity/*:symbol/text() }</td>
			<td>{ $equity/*:name/text() }</td>
			<td>{ $equity/*:high/text() }</td>
			<td>{ $equity/*:currency/text() }</td>
		</tr>
};

<table border="1">
<tr>
	<th>Ticker Symbol</th>
	<th>Company Name</th>
	<th>High</th>
	<th>Currency</th>
</tr>
{ local:equityRows(/) }
</table>
