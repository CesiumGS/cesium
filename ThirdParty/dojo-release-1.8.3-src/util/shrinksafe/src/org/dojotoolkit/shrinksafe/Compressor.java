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

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Stack;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.mozilla.javascript.CompilerEnvirons;
import org.mozilla.javascript.Decompiler;
import org.mozilla.javascript.FunctionNode;
import org.mozilla.javascript.Interpreter;
import org.mozilla.javascript.Kit;
import org.mozilla.javascript.Parser;
import org.mozilla.javascript.ScriptOrFnNode;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Token;
import org.mozilla.javascript.UintMap;

/**
 * @author rbackhouse
 *
 */
public class Compressor {
    private static final int FUNCTION_END = Token.LAST_TOKEN + 1;
    
    /**
     * Compress the script
     * <p>
     * 
     * @param encodedSource encoded source string
     * @param flags Flags specifying format of decompilation output
     * @param properties Decompilation properties
     * @param parseTree Mapping for each function node and corresponding parameters & variables names
     * @return compressed script
     */
    private static String compress(String encodedSource, 
    		                       int flags, 
    		                       UintMap properties, 
    		                       ScriptOrFnNode parseTree, 
    		                       boolean escapeUnicode,
    		                       String stripConsole,
    		                       TokenMapper tm,
    		                       Map replacedTokensLookup){
         int indent = properties.getInt(Decompiler.INITIAL_INDENT_PROP, 0);
         if (indent < 0) throw new IllegalArgumentException();
         int indentGap = properties.getInt(Decompiler.INDENT_GAP_PROP, 4);
         if (indentGap < 0) throw new IllegalArgumentException();
         int caseGap = properties.getInt(Decompiler.CASE_GAP_PROP, 2);
         if (caseGap < 0) throw new IllegalArgumentException();

         String stripConsoleRegex = "assert|count|debug|dir|dirxml|group|groupEnd|info|profile|profileEnd|time|timeEnd|trace|log";
         if (stripConsole == null) {
        	 // may be null if unspecified on Main cmd line
        	 stripConsoleRegex = null;
         } else if (stripConsole.equals("normal")) {
        	 // leave default
         } else if (stripConsole.equals("warn")) {
        	 stripConsoleRegex += "|warn";
         } else if (stripConsole.equals("all")) {
        	 stripConsoleRegex += "|warn|error";
         } else {
        	 throw new IllegalArgumentException("unrecognised value for stripConsole: " + stripConsole + "!");
         }
         
         Pattern stripConsolePattern = null;
         if (stripConsoleRegex != null) {
        	 stripConsolePattern = Pattern.compile(stripConsoleRegex);
         }

         StringBuffer result = new StringBuffer();
         boolean justFunctionBody = (0 != (flags & Decompiler.ONLY_BODY_FLAG));
         boolean toSource = (0 != (flags & Decompiler.TO_SOURCE_FLAG));
         int braceNesting = 0;
         boolean afterFirstEOL = false;
         int i = 0;
         int prevToken = 0;
         boolean primeFunctionNesting = false;
         boolean inArgsList = false;
         boolean primeInArgsList = false;

         boolean discardingConsole = false; // control skipping "console.stuff()"
         int     consoleParenCount = 0; // counter for parenthesis counting
         StringBuffer discardMe = new StringBuffer(); // throwaway buffer
         ReplacedTokens dummyTokens = new ReplacedTokens(new HashMap(), new int[]{}, replacedTokensLookup, null);
         int lastMeaningfulToken = Token.SEMI;
         int lastMeaningfulTokenBeforeConsole = Token.SEMI;

         int topFunctionType;
         if (encodedSource.charAt(i) == Token.SCRIPT) {
             ++i;
             topFunctionType = -1;
         } else {
             topFunctionType = encodedSource.charAt(i + 1);
         }
         if (!toSource) {
             // add an initial newline to exactly match js.
             // result.append('\n');
             for (int j = 0; j < indent; j++){
                 // result.append(' ');
                 result.append("");
             }
         } else {
             if (topFunctionType == FunctionNode.FUNCTION_EXPRESSION) {
                 result.append('(');
             }
         }
         
         Stack positionStack = new Stack();
         Stack functionPositionStack = new Stack();
         
         int length = encodedSource.length();
         int lineCount = 1;
         
         while (i < length) {
           if(i>0){
               prevToken = encodedSource.charAt(i-1);
           }
            if (discardingConsole) {
                // while we are skipping a console command, discard tokens
                int thisToken = encodedSource.charAt(i);
                /* Logic for controlling state of discardingConsole */
                switch (thisToken) {
                case Token.LP:
                    consoleParenCount++;
                    break;
                case Token.RP:
                    consoleParenCount--;
                    if (consoleParenCount == 0) {
                        // paren count fell to zero, must be end of console call
                        discardingConsole = false;
                        
                        if (i < (length - 1)) {
                        	int nextToken = getNext(encodedSource, length, i);

                        	if ((lastMeaningfulTokenBeforeConsole != Token.SEMI &&
                        			lastMeaningfulTokenBeforeConsole != Token.LC &&
                        			lastMeaningfulTokenBeforeConsole != Token.RC) ||
                        			nextToken != Token.SEMI) {
                        		// Either the previous or the following token
                        		// may use our return value, insert undefined
                        		// e.g. true ? console.log("bizarre") : (bar = true);
                        		result.append("undefined");
                        	} else {
                            	if (Token.SEMI == nextToken) {
                            		// munch following semicolon
                            		i++;
                            	}
                        	}
						}
						if ((i < (length - 1))
								&& (Token.EOL == getNext(encodedSource, length, i))) {
							// as a nicety, munch following linefeed
							i++;
						}
                    }
                    break;
                }
                /*
                 * advance i - borrow code from later switch statements (could
                 * mingle this whole discardingConsole block in with rest of
                 * function but it would be _ugly_) Use discardMe in place of
                 * result, so we don't use the processed source Specific case
                 * blocks for all source elements > 1 char long
                 */
                switch (thisToken) {
                case Token.NAME:
                case Token.REGEXP:
                    int jumpPos = getSourceStringEnd(encodedSource, i + 1,
                            escapeUnicode);
                    if (Token.OBJECTLIT == encodedSource.charAt(jumpPos)) {
                        i = printSourceString(encodedSource, i + 1, false,
                                discardMe, escapeUnicode);
                    } else {
                        i = tm.sourceCompress(encodedSource, i + 1, false,
                                discardMe, prevToken, inArgsList, braceNesting,
                                dummyTokens);
                    }
                    break;
                case Token.STRING:
                    i = printSourceString(encodedSource, i + 1, true,
                            discardMe, escapeUnicode);
                    break;
                case Token.NUMBER:
                    i = printSourceNumber(encodedSource, i + 1, discardMe);
                    break;
                default:
                    // all plain tokens (no data to skip)
                    i++;
                }
                // while discarding console, avoid the normal processing
                continue;
            }

           // System.out.println(Token.name(getNext(source, length, i)));
           int thisToken = encodedSource.charAt(i);

           switch(thisToken) {
             case Token.NAME:
             case Token.REGEXP:  // re-wrapped in '/'s in parser...
                 int jumpPos = getSourceStringEnd(encodedSource, i+1, escapeUnicode);
                 if (stripConsolePattern != null && thisToken == Token.NAME) {
                	 // Check to see if this is a console.something() call that we
                	 //  care about, if so switch on discardingConsole
                     int nextTokenAt = tm.sourceCompress(encodedSource, i + 1, false, discardMe, prevToken, 
                             inArgsList, braceNesting, dummyTokens);
                	 if (encodedSource.substring(i+2, i+2+encodedSource.charAt(i+1)).equals("console") &&
                         (encodedSource.charAt(nextTokenAt) == Token.DOT)) {
                		 // Find the name of the console method and check it
                    	 int afterFnName = printSourceString(encodedSource, nextTokenAt+2, false, discardMe, escapeUnicode);
                    	 Matcher m = stripConsolePattern.matcher(encodedSource.substring(nextTokenAt + 3, afterFnName));
                    	 if (m.matches()) {
                    		 // Must be an open parenthesis e.g. "console.log("
                    		 if (encodedSource.charAt(afterFnName) == Token.LP) {
		                		 discardingConsole = true;
		                		 consoleParenCount = 0;
		                		 lastMeaningfulTokenBeforeConsole = lastMeaningfulToken;
		                		 continue;
                    		 }
                    	 }
                     }
                 }
                 if(Token.OBJECTLIT == encodedSource.charAt(jumpPos)){
                     i = printSourceString(encodedSource, i + 1, false, result, escapeUnicode);
                 }else{
                	 ReplacedTokens replacedTokens = null;
                	 if (positionStack.size() > 0) {
                		 Integer pos = (Integer)positionStack.peek();
                         replacedTokens = (ReplacedTokens)replacedTokensLookup.get(pos);
                	 }
                	 else {
                		 replacedTokens = new ReplacedTokens(new HashMap(), new int[]{}, replacedTokensLookup, null);
                	 }

                     i = tm.sourceCompress(	encodedSource, i + 1, false, result, prevToken, 
                                             inArgsList, braceNesting, replacedTokens);
                 }
                 continue;
             case Token.STRING:

// NOTE: this is the disabled "string munging" code provided in bugs.dojotoolkit.org/ticket/8828
// simply uncomment this block, and run the build.sh script located in the root shrinksafe folder.
// there is a far-egde-case this is deemed unsafe in, so is entirely disabled for sanity of devs.
//
//                 StringBuffer buf = new StringBuffer();
//                 i--;
//                 do {
//                    i++;
//                    i = printSourceString(encodedSource, i + 1, false, buf, escapeUnicode);
//                 } while(Token.ADD == encodedSource.charAt(i) &&
//                   Token.STRING == getNext(encodedSource, length, i));
//                 result.append('"');
//                 result.append(escapeString(buf.toString(), escapeUnicode));
//                 result.append('"');
//
// now comment out this line to complete the patch:
                 i = printSourceString(encodedSource, i + 1, true, result, escapeUnicode); 

                 continue;
             case Token.NUMBER:
                 i = printSourceNumber(encodedSource, i + 1, result);
                 continue;
             case Token.TRUE:
                 result.append("true");
                 break;
             case Token.FALSE:
                 result.append("false");
                 break;
             case Token.NULL:
                 result.append("null");
                 break;
             case Token.THIS:
                 result.append("this");
                 break;
             case Token.FUNCTION: {
                 ++i; // skip function type
                 tm.incrementFunctionNumber();
                 primeInArgsList = true;
                 primeFunctionNesting = true;
                 result.append("function");
                 if (Token.LP != getNext(encodedSource, length, i)) {
                     result.append(' ');
                 }
                 Integer functionPos = new Integer(i-1);
                 functionPositionStack.push(functionPos);
                 DebugData debugData = tm.getDebugData(functionPos);
                 debugData.compressedStart = lineCount;
                 break;
             }
             case FUNCTION_END: {
            	 Integer functionPos = (Integer)functionPositionStack.pop();
                 DebugData debugData = tm.getDebugData(functionPos);
                 debugData.compressedEnd = lineCount;
                 break;
             }
             case Token.COMMA:
                 result.append(",");
                 break;
             case Token.LC:
                 ++braceNesting;
                 if (Token.EOL == getNext(encodedSource, length, i)){
                     indent += indentGap;
                 }
                 result.append('{');
                 // // result.append('\n');
                 break;
             case Token.RC: {
                 if (tm.leaveNestingLevel(braceNesting)) {
                     positionStack.pop();
                 }
                 --braceNesting;
                 /* don't print the closing RC if it closes the
                  * toplevel function and we're called from
                  * decompileFunctionBody.
                  */
                 if(justFunctionBody && braceNesting == 0){
                     break;
                 }
                 // // result.append('\n');
                 result.append('}');
                 // // result.append(' ');
                 switch (getNext(encodedSource, length, i)) {
                     case Token.EOL:
                     case FUNCTION_END:
                        if (
                            (getNext(encodedSource, length, i+1) != Token.SEMI) &&
                            (getNext(encodedSource, length, i+1) != Token.LP) &&
                            (getNext(encodedSource, length, i+1) != Token.RP) &&
                            (getNext(encodedSource, length, i+1) != Token.RB) &&
                            (getNext(encodedSource, length, i+1) != Token.RC) &&
                            (getNext(encodedSource, length, i+1) != Token.COMMA) &&
                            (getNext(encodedSource, length, i+1) != Token.COLON) &&
                            (getNext(encodedSource, length, i+1) != Token.DOT) &&
                            (getNext(encodedSource, length, i) == FUNCTION_END )
                         ){
						    result.append(';');
                         }
                         indent -= indentGap;
                         break;
                     case Token.WHILE:
                     case Token.ELSE:
                         indent -= indentGap;
                         // result.append(' ');
                         result.append("");
                         break;
                 }
                 break;
             }
             case Token.LP:
                 if(primeInArgsList){
                     inArgsList = true;
                     primeInArgsList = false;
                 }
                 if(primeFunctionNesting){
                     positionStack.push(new Integer(i));
                     tm.enterNestingLevel(braceNesting);
                     primeFunctionNesting = false;
                 }
                 result.append('(');
                 break;
             case Token.RP:
			    if(inArgsList){
                    inArgsList = false;
				}
                 result.append(')');
  			/*
                 if (Token.LC == getNext(source, length, i)){
                     result.append(' ');
                 }
  			*/
                 break;
             case Token.LB:
                 result.append('[');
                 break;
             case Token.RB:
                 result.append(']');
                 break;
             case Token.EOL: {
                 if (toSource) break;
                 boolean newLine = true;
                 if (!afterFirstEOL) {
                     afterFirstEOL = true;
                     if (justFunctionBody) {
                         /* throw away just added 'function name(...) {'
                          * and restore the original indent
                          */
                         result.setLength(0);
                         indent -= indentGap;
                         newLine = false;
                     }
                 }
                 if (newLine) {
                     result.append('\n');
                     lineCount++;
                 }
                 /* add indent if any tokens remain,
                  * less setback if next token is
                  * a label, case or default.
                  */
                 if (i + 1 < length) {
                     int less = 0;
                     int nextToken = encodedSource.charAt(i + 1);
                     if (nextToken == Token.CASE
                         || nextToken == Token.DEFAULT)
                     {
                         less = indentGap - caseGap;
                     } else if (nextToken == Token.RC) {
                         less = indentGap;
                     }
                     /* elaborate check against label... skip past a
                      * following inlined NAME and look for a COLON.
                      */
                     else if (nextToken == Token.NAME) {
                         int afterName = getSourceStringEnd(encodedSource, i + 2, escapeUnicode);
                         if (encodedSource.charAt(afterName) == Token.COLON)
                             less = indentGap;
                     }
                     for (; less < indent; less++){
                         // result.append(' ');
                         result.append("");
                     }
                 }
                 break;
             }
             case Token.DOT:
                 result.append('.');
                 break;
             case Token.NEW:
                 result.append("new ");
                 break;
             case Token.DELPROP:
                 result.append("delete ");
                 break;
             case Token.IF:
                 result.append("if");
                 break;
             case Token.ELSE:
                 result.append("else");
                 break;
             case Token.FOR:
                 result.append("for");
                 break;
             case Token.IN:
                 result.append(" in ");
                 break;
             case Token.WITH:
                 result.append("with");
                 break;
             case Token.WHILE:
                 result.append("while");
                 break;
             case Token.DO:
                 result.append("do");
                 break;
             case Token.TRY:
                 result.append("try");
                 break;
             case Token.CATCH:
                 result.append("catch");
                 break;
             case Token.FINALLY:
                 result.append("finally");
                 break;
             case Token.THROW:
                 result.append("throw ");
                 break;
             case Token.SWITCH:
                 result.append("switch");
                 break;
             case Token.BREAK:
                 result.append("break");
                 if(Token.NAME == getNext(encodedSource, length, i)){
                     result.append(' ');
  			}
                 break;
             case Token.CONTINUE:
                 result.append("continue");
                 if(Token.NAME == getNext(encodedSource, length, i)){
                     result.append(' ');
  			}
                 break;
             case Token.CASE:
                 result.append("case ");
                 break;
             case Token.DEFAULT:
                 result.append("default");
                 break;
             case Token.RETURN:
                 result.append("return");
                 if(Token.SEMI != getNext(encodedSource, length, i)){
                     result.append(' ');
                 }
                 break;
             case Token.VAR:
                 result.append("var ");
                 break;
             case Token.SEMI:
                 result.append(';');
                 // result.append('\n');
  			/*
                 if (Token.EOL != getNext(source, length, i)) {
                     // separators in FOR
                     result.append(' ');
                 }
  			*/
                 break;
             case Token.ASSIGN:
                 result.append("=");
                 break;
             case Token.ASSIGN_ADD:
                 result.append("+=");
                 break;
             case Token.ASSIGN_SUB:
                 result.append("-=");
                 break;
             case Token.ASSIGN_MUL:
                 result.append("*=");
                 break;
             case Token.ASSIGN_DIV:
                 result.append("/=");
                 break;
             case Token.ASSIGN_MOD:
                 result.append("%=");
                 break;
             case Token.ASSIGN_BITOR:
                 result.append("|=");
                 break;
             case Token.ASSIGN_BITXOR:
                 result.append("^=");
                 break;
             case Token.ASSIGN_BITAND:
                 result.append("&=");
                 break;
             case Token.ASSIGN_LSH:
                 result.append("<<=");
                 break;
             case Token.ASSIGN_RSH:
                 result.append(">>=");
                 break;
             case Token.ASSIGN_URSH:
                 result.append(">>>=");
                 break;
             case Token.HOOK:
                 result.append("?");
                 break;
             case Token.OBJECTLIT:
                 // pun OBJECTLIT to mean colon in objlit property
                 // initialization.
                 // This needs to be distinct from COLON in the general case
                 // to distinguish from the colon in a ternary... which needs
                 // different spacing.
                 result.append(':');
                 break;
             case Token.COLON:
                 if (Token.EOL == getNext(encodedSource, length, i))
                     // it's the end of a label
                     result.append(':');
                 else
                     // it's the middle part of a ternary
                     result.append(":");
                 break;
             case Token.OR:
                 result.append("||");
                 break;
             case Token.AND:
                 result.append("&&");
                 break;
             case Token.BITOR:
                 result.append("|");
                 break;
             case Token.BITXOR:
                 result.append("^");
                 break;
             case Token.BITAND:
                 result.append("&");
                 break;
             case Token.SHEQ:
                 result.append("===");
                 break;
             case Token.SHNE:
                 result.append("!==");
                 break;
             case Token.EQ:
                 result.append("==");
                 break;
             case Token.NE:
                 result.append("!=");
                 break;
             case Token.LE:
                 result.append("<=");
                 break;
             case Token.LT:
                 result.append("<");
                 break;
             case Token.GE:
                 result.append(">=");
                 break;
             case Token.GT:
                 result.append(">");
                 break;
             case Token.INSTANCEOF:
  			// FIXME: does this really need leading space?
                 result.append(" instanceof ");
                 break;
             case Token.LSH:
                 result.append("<<");
                 break;
             case Token.RSH:
                 result.append(">>");
                 break;
             case Token.URSH:
                 result.append(">>>");
                 break;
             case Token.TYPEOF:
                 result.append("typeof ");
                 break;
             case Token.VOID:
                 result.append("void ");
                 break;
             case Token.NOT:
                 result.append('!');
                 break;
             case Token.BITNOT:
                 result.append('~');
                 break;
             case Token.POS:
                 result.append('+');
                 break;
             case Token.NEG:
                 result.append('-');
                 break;
             case Token.INC:
                 if(Token.ADD == prevToken){
                    result.append(' ');
                 }
                 result.append("++");
                 if(Token.ADD == getNext(encodedSource, length, i)){
                     result.append(' ');
                 }
                 break;
             case Token.DEC:
                 if(Token.SUB == prevToken){
                     result.append(' ');
                 }
                 result.append("--");
                 if(Token.SUB == getNext(encodedSource, length, i)){
                     result.append(' ');
                 }
                 break;
             case Token.ADD:
                 result.append("+");
                 int nextToken = encodedSource.charAt(i + 1);
                 if (nextToken == Token.POS) {
                     result.append(' ');
                 }
                 break;
             case Token.SUB:
                 result.append("-");
                 nextToken = encodedSource.charAt(i + 1);
                 if (nextToken == Token.NEG) {
                     result.append(' ');
                 }
                 break;
             case Token.MUL:
                 result.append("*");
                 break;
             case Token.DIV:
                 result.append("/");
                 break;
             case Token.MOD:
                 result.append("%");
                 break;
             case Token.COLONCOLON:
                 result.append("::");
                 break;
             case Token.DOTDOT:
                 result.append("..");
                 break;
             case Token.XMLATTR:
                 result.append('@');
                 break;
            case Token.DEBUGGER:
                System.out.println("WARNING: Found a `debugger;` statement in code being compressed");
                result.append("debugger");
                break;
             default:
                 // If we don't know how to decompile it, raise an exception.
                 throw new RuntimeException();
             }
             if (thisToken != Token.EOL) {
                 lastMeaningfulToken = thisToken;
             }
             ++i;
         }
         if (!toSource) {
             // add that trailing newline if it's an outermost function.
             // if (!justFunctionBody){
             //    result.append('\n');
  		// }
         } else {
             if (topFunctionType == FunctionNode.FUNCTION_EXPRESSION) {
                 result.append(')');
             }
         }
         return result.toString();
    }

    /**
     * Collect the replaced tokens and store them in a lookup table for the next
     * source pass. 
     * 
     * @param encodedSource encoded source string
     * @param escapeUnicode escape chars with unicode.
     * @param tm token mapper object.
     * @return Map containing replaced tokens lookup information
     */
    private static Map collectReplacedTokens(String encodedSource, boolean escapeUnicode, TokenMapper tm) {
    	int length = encodedSource.length();
    	
		int i = 0;
		int prevToken = 0;
		int braceNesting = 0;
		
		boolean inArgsList = false;
        boolean primeFunctionNesting = false;
        boolean primeInArgsList = false;
		
        if (encodedSource.charAt(i) == Token.SCRIPT) {
            ++i;
        }

        Stack positionStack = new Stack();
        Stack functionPositionStack = new Stack();
        Map tokenLookup = new HashMap();
        
		while (i < length) {
			if (i > 0) {
				prevToken = encodedSource.charAt(i - 1);
			}
			switch (encodedSource.charAt(i)) {
				case Token.NAME:
				case Token.REGEXP: {
					int jumpPos = getSourceStringEnd(encodedSource, i + 1, escapeUnicode);
					if (Token.OBJECTLIT == encodedSource.charAt(jumpPos)) {
						i = printSourceString(encodedSource, i + 1, false, null, escapeUnicode);
					} else {
						i = tm.sourceCompress(encodedSource, i + 1, false, null, prevToken, inArgsList, braceNesting, null);
					}
					continue;
				}
				case Token.STRING: {
					i = printSourceString(encodedSource, i + 1, true, null, escapeUnicode);
					continue;
				}
				case Token.NUMBER: {
					i = printSourceNumber(encodedSource, i + 1, null);
					continue;
				}
				case Token.FUNCTION: {
					++i; // skip function type
					tm.incrementFunctionNumber();
					primeInArgsList = true;
					primeFunctionNesting = true;
					functionPositionStack.push(new Integer(i-1));
					break;
				}
				case Token.LC: {
					++braceNesting;
					break;
				}
				case Token.RC: {
					Map m = tm.getCurrentTokens();
					if (tm.leaveNestingLevel(braceNesting)) {
						Integer pos = (Integer)positionStack.pop();
						Integer functionPos = (Integer)functionPositionStack.pop();
						int[] parents = new int[positionStack.size()];
						int idx = 0;
						for (Iterator itr = positionStack.iterator(); itr.hasNext();) {
							parents[idx++] = ((Integer)itr.next()).intValue();
						}
						DebugData debugData = tm.getDebugData(functionPos);
						ReplacedTokens replacedTokens = new ReplacedTokens(m, parents, tokenLookup, debugData); 
						tokenLookup.put(pos, replacedTokens);
					}
					--braceNesting;
					break;
				}
				case Token.LP: {
					if (primeInArgsList) {
						inArgsList = true;
						primeInArgsList = false;
					}
					if (primeFunctionNesting) {
						positionStack.push(new Integer(i));
						tm.enterNestingLevel(braceNesting);
						primeFunctionNesting = false;
					}
					break;
				}
				case Token.RP: {
					if (inArgsList) {
						inArgsList = false;
					}
					break;
				}
			}
			++i;
		}
		return tokenLookup;
	}

    private static int getNext(String source, int length, int i) {
        return (i + 1 < length) ? source.charAt(i + 1) : Token.EOF;
    }

    private static int getSourceStringEnd(String source, int offset, boolean escapeUnicode) {
        return printSourceString(source, offset, false, null, escapeUnicode);
    }

    private static int printSourceString(String source, int offset,
                                         boolean asQuotedString,
                                         StringBuffer sb,
                                         boolean escapeUnicode) {
        int length = source.charAt(offset);
        ++offset;
        if ((0x8000 & length) != 0) {
            length = ((0x7FFF & length) << 16) | source.charAt(offset);
            ++offset;
        }
        if (sb != null) {
            String str = source.substring(offset, offset + length);
            if (!asQuotedString) {
                sb.append(str);
            } else {
                sb.append('"');
                sb.append(escapeString(str, escapeUnicode));
                sb.append('"');
            }
        }
        return offset + length;
    }
    
    private static int printSourceNumber(String source, int offset,	StringBuffer sb) {
		double number = 0.0;
		char type = source.charAt(offset);
		++offset;
		if (type == 'S') {
			if (sb != null) {
				int ival = source.charAt(offset);
				number = ival;
			}
			++offset;
		} else if (type == 'J' || type == 'D') {
			if (sb != null) {
				long lbits;
				lbits = (long) source.charAt(offset) << 48;
				lbits |= (long) source.charAt(offset + 1) << 32;
				lbits |= (long) source.charAt(offset + 2) << 16;
				lbits |= source.charAt(offset + 3);
				if (type == 'J') {
					number = lbits;
				} else {
					number = Double.longBitsToDouble(lbits);
				}
			}
			offset += 4;
		} else {
			// Bad source
			throw new RuntimeException();
		}
		if (sb != null) {
			sb.append(ScriptRuntime.numberToString(number, 10));
		}
		return offset;
	}
    
    private static String escapeString(String s, boolean escapeUnicode) {
        return escapeString(s, '"', escapeUnicode);
    }
    
    private static String escapeString(String s, char escapeQuote, boolean escapeUnicode) {
        if (!(escapeQuote == '"' || escapeQuote == '\'')) Kit.codeBug();
        StringBuffer sb = null;

        for(int i = 0, L = s.length(); i != L; ++i) {
            int c = s.charAt(i);

            if (' ' <= c && c <= '~' && c != escapeQuote && c != '\\') {
                // an ordinary print character (like C isprint()) and not "
                // or \ .
                if (sb != null) {
                    sb.append((char)c);
                }
                continue;
            }
            if (sb == null) {
                sb = new StringBuffer(L + 3);
                sb.append(s);
                sb.setLength(i);
            }

            int escape = -1;
            switch (c) {
                case '\b':  escape = 'b';  break;
                case '\f':  escape = 'f';  break;
                case '\n':  escape = 'n';  break;
                case '\r':  escape = 'r';  break;
                case '\t':  escape = 't';  break;
                case 0xb:   escape = 'v';  break; // Java lacks \v.
                case ' ':   escape = ' ';  break;
                case '\\':  escape = '\\'; break;
            }
            if (escape >= 0) {
                // an \escaped sort of character
                sb.append('\\');
                sb.append((char)escape);
            } else if (c == escapeQuote) {
                sb.append('\\');
                sb.append(escapeQuote);
            } else {
            	if (escapeUnicode || c == 0 || c == 65534 || c == 65535) { // always escape non-characters (#5027,#15969)
	                int hexSize;
	                if (c < 256) {
	                    // 2-digit hex
	                    sb.append("\\x");
	                    hexSize = 2;
	                } else {
	                    // Unicode.
	                    sb.append("\\u");
	                    hexSize = 4;
	                }
	                // append hexadecimal form of c left-padded with 0
	                for (int shift = (hexSize - 1) * 4; shift >= 0; shift -= 4) {
	                    int digit = 0xf & (c >> shift);
	                    int hc = (digit < 10) ? '0' + digit : 'a' - 10 + digit;
	                    sb.append((char)hc);
	                }
            	}
            	else {
            		sb.append((char)c);
            	}
            }
        }
        return (sb == null) ? s : sb.toString();
    }
    
    public static final String compressScript(String source, int indent, int lineno, String stripConsole) {
    	return compressScript(source, indent, lineno, false, stripConsole);
    }
    
    public static final String compressScript(String source, int indent, int lineno, boolean escapeUnicode, String stripConsole) {
    	return compressScript(source, indent, lineno, escapeUnicode, stripConsole, null);
    }
        
    public static final String compressScript(String source, int indent, int lineno, boolean escapeUnicode, String stripConsole, StringBuffer debugData) {
        CompilerEnvirons compilerEnv = new CompilerEnvirons();

        Parser parser = new Parser(compilerEnv, compilerEnv.getErrorReporter());
        
        ScriptOrFnNode tree = parser.parse(source, null, lineno);
        String encodedSource = parser.getEncodedSource();
   	 	if (encodedSource.length() == 0) { return ""; }
   	 	
        Interpreter compiler = new Interpreter();
        compiler.compile(compilerEnv, tree, encodedSource, false);
        UintMap properties = new UintMap(1);
        properties.put(Decompiler.INITIAL_INDENT_PROP, indent);
        
        TokenMapper tm = new TokenMapper(tree);
        Map replacedTokensLookup = collectReplacedTokens(encodedSource, escapeUnicode, tm);
        tm.reset();
        
        String compressedSource = compress(encodedSource, 0, properties, tree, escapeUnicode, stripConsole, tm, replacedTokensLookup);
        if (debugData != null) {
        	debugData.append("[\n");
        	int count = 1;
	        for (Iterator itr = replacedTokensLookup.keySet().iterator(); itr.hasNext();) {
	        	Integer pos = (Integer)itr.next();
	        	ReplacedTokens replacedTokens = (ReplacedTokens)replacedTokensLookup.get(pos);
	        	debugData.append(replacedTokens.toJson());
	        	if (count++ < replacedTokensLookup.size()) {
	        		debugData.append(',');
	        	}
	        	debugData.append("\n");
	        }
        	debugData.append("]");
        }
        return compressedSource;
    }
}
