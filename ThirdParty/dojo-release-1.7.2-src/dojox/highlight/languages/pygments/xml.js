define(["dojox/main", "../../_base", "../xml"], function(dojox){

	var dxml = dojox.highlight.languages.xml = {
		defaultMode: {
			contains: [
				"name entity",
				"comment", "comment preproc",
				"_tag"
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
			{
				className: "comment preproc",
				begin: "\\<\\?", end: "\\?\\>",
				relevance: 5
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
				begin: "\\b[a-z0-9_\\:\\-]+\\b", end: "^"
			},
			{
				className: "name attribute",
				begin: "\\b[a-z0-9_\\:\\-]+=", end: "^",
				relevance: 0
			},
		
		
			{
				className: "_tag",
				begin: "\\<", end: "\\>",
				contains: ["name tag", "name attribute", "string"]
			},
			{
				className: "_tag",
				begin: "\\</", end: "\\>",
				contains: ["name tag"]
			}
		]
	};

	return dxml;
});