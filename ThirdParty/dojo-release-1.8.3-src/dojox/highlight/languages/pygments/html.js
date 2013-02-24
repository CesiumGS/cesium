define(["../../_base", "./_html"], function(dh){

	var dhl = dh.languages, tags = [],
		ht = dhl.pygments._html.tags;
	
	for(var key in ht){
		tags.push(key);
	}
	tags = "\\b(" + tags.join("|") + ")\\b";
	
	dhl.html = {
		case_insensitive: true,
		defaultMode: {
			contains: [
				"name entity",
				"comment", "comment preproc",
				"_script", "_style", "_tag"
			]
		},
		modes: [
			// comments
			{
				className: "comment",
				begin: "<!--", end: "-->"
			},
			{
				className: "comment preproc",
				begin: "\\<\\!\\[CDATA\\[", end: "\\]\\]\\>"
			},
			{
				className: "comment preproc",
				begin: "\\<\\!", end: "\\>"
			},

			// strings
			{
				className: "string",
				begin: "'", end: "'",
				illegal: "\\n",
				relevance: 0
			},
			{
				className: "string",
				begin: '"',
				end: '"',
				illegal: "\\n",
				relevance: 0
			},
			
			// names
			{
				className: "name entity",
				begin: "\\&[a-z]+;", end: "^"
			},
			{
				className: "name tag",
				begin: tags, end: "^",
				relevance: 5
			},
			{
				className: "name attribute",
				begin: "\\b[a-z0-9_\\:\\-]+\\s*=", end: "^",
				relevance: 0
			},
			
			{
				className: "_script",
				begin: "\\<script\\b", end: "\\</script\\>",
				relevance: 5
			},
			{
				className: "_style",
				begin: "\\<style\\b", end: "\\</style\\>",
				relevance: 5
			},
			
			{
				className: "_tag",
				begin: "\\<(?!/)", end: "\\>",
				contains: ["name tag", "name attribute", "string", "_value"]
			},
			{
				className: "_tag",
				begin: "\\</", end: "\\>",
				contains: ["name tag"]
			},
			{
				className: "_value",
				begin: "[^\\s\\>]+", end: "^"
			}
		]
	};

	return dhl.html;
	
});
