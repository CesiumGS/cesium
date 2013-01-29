define(["../_base"], function(dh){

	var dhc = dh.constants;
	dh.languages.javascript = {
		defaultMode: {
			lexems: [dhc.UNDERSCORE_IDENT_RE],
			contains: ['string', 'comment', 'number', 'regexp', 'function'],
			keywords: {
				'keyword': {
					'in': 1, 'if': 1, 'for': 1, 'while': 1, 'finally': 1, 'var': 1,
					'new': 1, 'function': 1, 'do': 1, 'return': 1, 'void': 1,
					'else': 1, 'break': 1, 'catch': 1, 'instanceof': 1, 'with': 1,
					'throw': 1, 'case': 1, 'default': 1, 'try': 1, 'this': 1,
					'switch': 1, 'continue': 1, 'typeof': 1, 'delete': 1
				},
				'literal': {'true': 1, 'false': 1, 'null': 1}
			}
		},
		modes: [
			dhc.C_LINE_COMMENT_MODE,
			dhc.C_BLOCK_COMMENT_MODE,
			dhc.C_NUMBER_MODE,
			dhc.APOS_STRING_MODE,
			dhc.QUOTE_STRING_MODE,
			dhc.BACKSLASH_ESCAPE,
			{
				className: 'regexp',
				begin: '/.*?[^\\\\/]/[gim]*', end: '^'
			},
			{
				className: 'function',
				begin: 'function\\b', end: '{',
				lexems: [dhc.UNDERSCORE_IDENT_RE],
				keywords: {'function': 1},
				contains: ['title', 'params']
			},
			{
				className: 'title',
				begin: dhc.UNDERSCORE_IDENT_RE, end: '^'
			},
			{
				className: 'params',
				begin: '\\(', end: '\\)',
				contains: ['string', 'comment']
			}
		]
	};

	return dh.languages.javascript;
});
