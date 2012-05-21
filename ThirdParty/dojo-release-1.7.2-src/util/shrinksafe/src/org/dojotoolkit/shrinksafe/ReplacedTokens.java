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
 *   Richard Backhouse
 */
package org.dojotoolkit.shrinksafe;

import java.util.Iterator;
import java.util.Map;


/*
 * This Class provides a container for the replaced tokens applied for a given scope
 * It provides a method to traverse down through the hierarchy to seach for a 
 * replacement match. It also provides a method that generates debug information.
 */

public class ReplacedTokens {
	private int[] parents = null;
	private Map replacements = null;
	private Map lookup = null;
	private DebugData debugData = null;
	
	public ReplacedTokens(Map replacements, int[] parents, Map lookup, DebugData debugData) {
		this.replacements = replacements; 
		this.parents = parents;
		this.lookup = lookup;
		this.debugData = debugData;
	}
	
	public String find(String token) {
		String replacedToken = null;
		if (replacements != null) {
			replacedToken = (String)replacements.get(token);
		}
		if (replacedToken == null) {
			for (int i = parents.length; i > 0; i--) {
				int parentPos = parents[i-1];
				ReplacedTokens parent = (ReplacedTokens)lookup.get(new Integer(parentPos));
				if (parent.replacements != null) {
					replacedToken = (String)parent.replacements.get(token);
					if (replacedToken != null) {
						break;
					}
				}
			}
		}
		if (replacedToken == null) {
			replacedToken = token;
		}
		return replacedToken;
	}
	
	public String printDebugData() {
		StringBuffer sb = new StringBuffer();
		if (debugData != null) {
			sb.append("Start:"+debugData.start);
			sb.append(' ');
			sb.append("End:"+debugData.end);
			sb.append(' ');
			sb.append("Compressed Start:"+debugData.compressedStart);
			sb.append(' ');
			sb.append("Compressed End:"+debugData.compressedEnd);
			sb.append(' ');
			if (debugData.paramAndVarNames != null) {
				sb.append("Params and Vars: [");
				for (String paramVar: debugData.paramAndVarNames) {
					sb.append(paramVar);
					sb.append(' ');
				}
				sb.append("]\n");
			}
			if (replacements != null && replacements.size() > 0) {
				sb.append("\t");
				sb.append("Replacements:\n");
				for (Iterator itr = replacements.keySet().iterator(); itr.hasNext();) {
					String token = (String)itr.next();
					String replacement = (String)replacements.get(token);
					if (!token.equals(replacement)) {
						sb.append("\t\t");
						sb.append('[');
						sb.append(token);
						sb.append(']');
						sb.append(" replaced with ");
						sb.append('[');
						sb.append(replacement);
						sb.append(']');
						sb.append('\n');
					}
				}
				sb.append("\n");
			}
			for (int i = parents.length; i > 0; i--) {
				int parentPos = parents[i-1];
				ReplacedTokens parent = (ReplacedTokens)lookup.get(new Integer(parentPos));
				if (parent.replacements != null && parent.replacements.size() > 0) {
					sb.append("\t");
					sb.append("Parent Replacements level ["+i+"]:\n");
					for (Iterator itr = parent.replacements.keySet().iterator(); itr.hasNext();) {
						String token = (String)itr.next();
						String replacement = (String)parent.replacements.get(token);
						if (!token.equals(replacement)) {
							sb.append("\t\t");
							sb.append('[');
							sb.append(token);
							sb.append(']');
							sb.append(" replaced with ");
							sb.append('[');
							sb.append(replacement);
							sb.append(']');
							sb.append('\n');
						}
					}
					sb.append("\n");
				}
			}
		}
		return sb.toString();
	}
	
	public String toJson() {
		StringBuffer json = new StringBuffer();
		json.append('{');
		if (debugData != null) {
			json.append("start: "+debugData.start);
			json.append(", ");
			json.append("end: "+debugData.end);
			json.append(", ");
			json.append("compressedStart: "+debugData.compressedStart);
			json.append(", ");
			json.append("compressedEnd: "+debugData.compressedEnd);
			json.append(", ");
			json.append("replacements: {");
			if (replacements != null && replacements.size() > 0) {
				json.append(replacementsToJson(replacements));
			}
			json.append('}');
			if (parents.length > 0) {
				json.append(", ");
				json.append("parentReplacements: [");
			}
			int count = 1;
			for (int i = 0; i < parents.length; i++) {
				json.append('{');
				int parentPos = parents[i];
				ReplacedTokens parent = (ReplacedTokens)lookup.get(new Integer(parentPos));
				if (parent.replacements != null && parent.replacements.size() > 0) {
					json.append(replacementsToJson(parent.replacements));
				}
				json.append('}');
				if (count++ < parents.length) {
					json.append(", ");
				}
			}
			if (parents.length > 0) {
				json.append("]");
			}
		}
		json.append("}");
		return json.toString();
	}
	
	private static String replacementsToJson(Map replacements) {
		StringBuffer sb = new StringBuffer();
		int count = 1;
		for (Iterator itr = replacements.keySet().iterator(); itr.hasNext();) {
			String token = (String)itr.next();
			String replacement = (String)replacements.get(token);
			sb.append("\""+replacement+'\"');
			sb.append(" : ");
			sb.append("\""+token+"\"");
			if (count++ < replacements.size()) {
				sb.append(", ");
			}
		}
		
		return sb.toString();
	}
}
