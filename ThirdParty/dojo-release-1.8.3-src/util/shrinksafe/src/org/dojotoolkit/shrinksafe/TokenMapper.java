/*
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Rhino code, released
 * May 6, 1999.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1997-1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Alex Russell
 *   Richard Backhouse
 */
 
package org.dojotoolkit.shrinksafe;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mozilla.javascript.ScriptOrFnNode;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Token;

public class TokenMapper {
	private List functionBracePositions = new ArrayList();

	/**
	 * Map of all replaced tokens
	 */
	private List replacedTokens = new ArrayList();

	/**
	 * Map of each Function node and all the variables in its current function
	 * scope, other variables found while traversing the prototype chain and
	 * variables found in the top-level scope.
	 */
	private List functionVarMappings = new ArrayList();
	private Map debugDataList = new HashMap();

	private int functionNum = 0;

	private int parentScope = 0;

	private int lastTokenCount = 0;
	
	public TokenMapper(ScriptOrFnNode parseTree) {
		collectFunctionMappings(parseTree);
	}

	public void incrementFunctionNumber() {
		functionNum++;
	}
	
	/**
	 * Generate new compressed tokens
	 * <p>
	 * 
	 * @param token
	 *            value of the string token
	 * @param hasNewMapping
	 *            boolean value indicating a new variable binding
	 * @return compressed token
	 */
	private String getMappedToken(String token, boolean hasNewMapping) {
		String newToken = null;
		Map tokens = null;
		String blank = new String("");
		int localScope = functionBracePositions.size() - 1;

		String oldToken = getPreviousTokenMapping(token, hasNewMapping);

		if (!oldToken.equalsIgnoreCase(blank)) {
			return oldToken;
		} else if ((hasNewMapping || isInScopeChain(token))) {
			newToken = new String("_" + Integer.toHexString(++lastTokenCount));
			if (newToken.length() >= token.length() && token.charAt(0) != '_') {
				newToken = token;
				lastTokenCount--;
			}
			tokens = (Map) replacedTokens.get(hasNewMapping ? localScope : parentScope);
			tokens.put(token, newToken);
			return newToken;
		}
		return token;
	}

	/**
	 * Checks for variable names in prototype chain
	 * <p>
	 * 
	 * @param token
	 *            value of the string token
	 * @return boolean value indicating if the token is present in the chained
	 *         scope
	 */
	private boolean isInScopeChain(String token) {
		int scope = functionBracePositions.size();
		Map chainedScopeVars = (Map) functionVarMappings.get(functionNum);
		if (!chainedScopeVars.isEmpty()) {
			for (int i = scope; i > 0; i--) {
				if (chainedScopeVars.containsKey(new Integer(i))) {
					parentScope = i - 1;
					List temp = Arrays.asList((String[]) chainedScopeVars.get(new Integer(i)));
					if (temp.indexOf(token) != -1) {
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * Checks previous token mapping
	 * <p>
	 * 
	 * @param token
	 *            value of the string token
	 * @param hasNewMapping
	 *            boolean value indicating a new variable binding
	 * @return string value of the previous token or blank string
	 */
	private String getPreviousTokenMapping(String token, boolean hasNewMapping) {
		String result = new String("");
		int scope = replacedTokens.size() - 1;

		if (scope < 0) {
			return result;
		}

		if (hasNewMapping) {
			Map tokens = (Map) (replacedTokens.get(scope));
			if (tokens.containsKey(token)) {
				result = (String) tokens.get(token);
				return result;
			}
		} else {
			for (int i = scope; i > -1; i--) {
				Map tokens = (Map) (replacedTokens.get(i));
				if (tokens.containsKey(token)) {
					result = (String) tokens.get(token);
					return result;
				}
			}
		}
		return result;
	}

	/**
	 * Generate mappings for each Function node and parameters and variables
	 * names associated with it.
	 * <p>
	 * 
	 * @param parseTree
	 *            Mapping for each function node and corresponding parameters &
	 *            variables names
	 */
	private void collectFunctionMappings(ScriptOrFnNode parseTree) {
		int level = -1;
		collectFuncNodes(parseTree, level, null);
	}

	/**
	 * Recursive method to traverse all Function nodes
	 * <p>
	 * 
	 * @param parseTree
	 *            Mapping for each function node and corresponding parameters &
	 *            variables names
	 * @param level
	 *            scoping level
	 */
	private void collectFuncNodes(ScriptOrFnNode parseTree, int level, ScriptOrFnNode parent) {
		level++;
		
        DebugData debugData = new DebugData();
        debugData.start = parseTree.getBaseLineno();
        debugData.end = parseTree.getEndLineno();
        debugData.paramAndVarNames = parseTree.getParamAndVarNames();
        debugDataList.put(new Integer(parseTree.getEncodedSourceStart()), debugData);
        
		functionVarMappings.add(new HashMap());

		Map bindingNames = (Map) functionVarMappings.get(functionVarMappings.size() - 1);
		bindingNames.put(new Integer(level), parseTree.getParamAndVarNames());

	    if (parent != null) {
	        bindingNames.put(new Integer(level-1), parent.getParamAndVarNames());
	    }
	    
		int nestedCount = parseTree.getFunctionCount();
		for (int i = 0; i != nestedCount; ++i) {
			collectFuncNodes(parseTree.getFunctionNode(i), level, parseTree);
			bindingNames = (Map) functionVarMappings.get(functionVarMappings.size() - 1);
			bindingNames.put(new Integer(level), parseTree.getParamAndVarNames());
        }
	}

	/**
	 * Compress the script
	 * <p>
	 * 
	 * @param encodedSource
	 *            encoded source string
	 * @param offset
	 *            position within the encoded source
	 * @param asQuotedString
	 *            boolean value indicating a quoted string
	 * @param sb
	 *            String buffer reference
	 * @param prevToken
	 *            Previous token in encoded source
	 * @param inArgsList
	 *            boolean value indicating position inside arguments list
	 * @param currentLevel
	 *            embeded function level
	 * @param parseTree
	 *            Mapping of each function node and corresponding parameters &
	 *            variables names
	 * @return compressed script
	 */
	public int sourceCompress(String encodedSource, int offset,
			boolean asQuotedString, StringBuffer sb, int prevToken,
			boolean inArgsList, int currentLevel, ReplacedTokens replacedTokens) {

		boolean hasNewMapping = false;

		int length = encodedSource.charAt(offset);
		++offset;
		if ((0x8000 & length) != 0) {
			length = ((0x7FFF & length) << 16) | encodedSource.charAt(offset);
			++offset;
		}
		String str = encodedSource.substring(offset, offset + length);
		if ((prevToken == Token.VAR) || (inArgsList)) {
			hasNewMapping = true;
		}
		if (sb != null) {
			String sourceStr = new String(str);
			
			if (((functionBracePositions.size() > 0) && 
				(currentLevel >= (((Integer) functionBracePositions.get(functionBracePositions.size() - 1)).intValue()))) || 
				(inArgsList)) {
				if (prevToken != Token.DOT) {
					// Look for replacement token in provided lookup object.
					str = replacedTokens.find(str);
				}
			}
			if ((!inArgsList) && (asQuotedString)) {
				if ((prevToken == Token.LC) || (prevToken == Token.COMMA)) {
					str = sourceStr;
				}
			}
			if (!asQuotedString) {
				sb.append(str);
			} else {
				sb.append('"');
				sb.append(ScriptRuntime.escapeString(str));
				sb.append('"');
			}
		}
		else if (((functionBracePositions.size() > 0) && 
				(currentLevel >= (((Integer) functionBracePositions.get(functionBracePositions.size() - 1)).intValue()))) || 
				(inArgsList)) {
			if (prevToken != Token.DOT) {
				getMappedToken(str, hasNewMapping);
			}
		}
		return offset + length;
	}

	public void enterNestingLevel(int braceNesting) {
		functionBracePositions.add(new Integer(braceNesting + 1));
		replacedTokens.add(new HashMap());
	}

	public boolean leaveNestingLevel(int braceNesting) {
		boolean tokensRemoved = false;
		Integer bn = new Integer(braceNesting);

		if ((functionBracePositions.contains(bn)) && (replacedTokens.size() > 0)) {
			// remove our mappings now!
			int scopedSize = replacedTokens.size();
			replacedTokens.remove(scopedSize - 1);
			functionBracePositions.remove(bn);
			tokensRemoved = true;
		}
		return tokensRemoved;
	}
	
	public Map getCurrentTokens() {
		Map m = null;
		if (replacedTokens.size() > 0) {
			m = (Map)replacedTokens.get(replacedTokens.size() - 1);
		}
		return m;
	}
	
	public DebugData getDebugData(Integer functionPosition) {
		return (DebugData)debugDataList.get(functionPosition);
	}
	
	public void reset() {
		functionNum = 0;
		parentScope = 0;
		lastTokenCount = 0;
		functionBracePositions = new ArrayList();
		replacedTokens = new ArrayList();
	}
}
