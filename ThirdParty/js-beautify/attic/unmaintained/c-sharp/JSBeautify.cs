//
// converted from javascript by rekna anker <rekna1@gmail.com>
//

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Collections;
using System.Text.RegularExpressions;

namespace JSBeautifyLib
{

    public class JSBeautifyOptions
    {
        public int? indent_size { get; set; }
        public char? indent_char { get; set; }
        public int? indent_level { get; set; }
        public bool? preserve_newlines { get; set; }


    }
    public class JSBeautify
    {
        private StringBuilder output;
        private string indent_string;
        private int indent_level;
        private string token_text;
        private Stack<string> modes;
        private string current_mode;
        private int opt_indent_size;
        private char opt_indent_char;
        private int opt_indent_level;
        private bool opt_preserve_newlines;
        private bool if_line_flag;
        private bool do_block_just_closed;
        private string input;


        private void trim_output()
        {
            while ((output.Length>0) && ((output[output.Length-1]==' ')||(output[output.Length-1].ToString()==indent_string)))
            {
                output.Remove(output.Length-1,1);
            }
        }
        
        private void print_newline(bool? ignore_repeated)
        {
            ignore_repeated = ignore_repeated ?? true;

            if_line_flag = false;
            trim_output();

            if (output.Length == 0)
                return;

            if ((output[output.Length - 1] != '\n') || !ignore_repeated.Value)
            {
                output.Append(Environment.NewLine);
            }

            for (var i = 0; i < indent_level; i++)
            {
                output.Append(indent_string);
            }
        }

        private void print_space()
        {
            var last_output = " ";
            if (output.Length > 0)
                last_output = output[output.Length - 1].ToString();
            if ((last_output != " ") && (last_output != "\n") && (last_output != indent_string))
            {
                output.Append(' ');
            }
        }

 
        private void print_token()
        {
            output.Append(token_text);
        }

        private void indent()
        {
            indent_level++;
        }

        private void unindent()
        {
            if (indent_level > 0)
                indent_level--;
        }

        private void remove_indent()
        {
            if ((output.Length>0) && (output[output.Length-1].ToString()==indent_string))
            {
                output.Remove(output.Length-1,1);
            }
        }

        private void set_mode(string mode)
        {
            modes.Push(current_mode);
            current_mode = mode;
        }

        private void restore_mode()
        {
            do_block_just_closed = (current_mode == "DO_BLOCK");
            current_mode = modes.Pop();
        }

        private bool in_array(object what, ArrayList arr)
        {
            return arr.Contains(what);
        
        }

        private bool is_ternary_op()
        {
            int level = 0;
            int colon_count = 0;
            for (var i = output.Length - 1; i >= 0; i--)
            {
                switch (output[i])
                {
                    case ':':
                        if (level == 0)
                            colon_count++;
                        break;
                    case '?':
                        if (level == 0)
                        {
                            if (colon_count == 0)
                            {
                                return true;
                            }
                            else
                            {
                                colon_count--;
                            }
                        }
                        break;
                    case '{':
                        if (level == 0) return false;
                        level--;
                        break;
                    case '(':
                    case '[':
                        level--;
                        break;
                    case ')':
                    case ']':
                    case '}':
                        level++;
                        break;
                }
            }
            return false;
        }

        private string whitespace;
        private string wordchar;
        private int parser_pos;
        private string last_type;
        private string last_text;
        private string digits;
        private string[] punct;
        private string prefix;
        private string[] get_next_token(ref int parser_pos)
        {
            var n_newlines = 0;

            if (parser_pos >= input.Length)
            {
                return new string[] { "", "TK_EOF" };
            }

            string c = input[parser_pos].ToString();
            parser_pos++;

            while (whitespace.Contains(c))
            {
                if (parser_pos >= input.Length)
                {
                    return new string[] { "", "TK_EOF" };
                }

                if (c == "\n")
                    n_newlines++;

                c = input[parser_pos].ToString();
                parser_pos++;
            }

            var wanted_newline = false;

            if (opt_preserve_newlines)
            {
                if (n_newlines > 1)
                {
                    for (var i = 0; i < 2; i++)
                    {
                        print_newline(i == 0);
                    }
                }
                wanted_newline = (n_newlines == 1);

            }

            if (wordchar.Contains(c))
            {
                if (parser_pos < input.Length)
                {
                    while (wordchar.Contains(input[parser_pos]))
                    {
                        c += input[parser_pos];
                        parser_pos++;
                        if (parser_pos == input.Length)
                            break;
                    }
                }
            
            
                if ((parser_pos!=input.Length) && (Regex.IsMatch(c,"^[0-9]+[Ee]$")) && ((input[parser_pos] == '-') || (input[parser_pos]=='+')))
                {
                    var sign = input[parser_pos];
                    parser_pos++;

                    var t = get_next_token(ref parser_pos);
                    c += sign + t[0];
                    return new string[] { c, "TK_WORD" };
                }

                if (c == "in")
                {
                    return new string[] { c, "TK_OPERATOR" };
                }

                if (wanted_newline && last_type != "TK_OPERATOR" && !if_line_flag)
                {
                    print_newline(null);
                }
                return new string[] { c, "TK_WORD" };

            }

            if ((c == "(") || (c == "["))
                return new string[] {c,"TK_START_EXPR"};

            if (c == ")" || c == "]") {
                return new string[] {c, "TK_END_EXPR"};
            }

            if (c == "{") {
                return new string[] {c, "TK_START_BLOCK"};
            }

            if (c == "}") {
                return new string[] {c, "TK_END_BLOCK"};
            }

            if (c == ";") {
                return new string[] {c, "TK_SEMICOLON"};
            }

            if (c=="/") {
                var comment = "";
                if (input[parser_pos]=='*') {
                    parser_pos++;
                    if (parser_pos<input.Length){
                        while (!((input[parser_pos]=='*') && (input[parser_pos+1]>'\0') && (input[parser_pos+1]=='/') && (parser_pos<input.Length)))
                        {
                            comment+=input[parser_pos];
                            parser_pos++;
                            if (parser_pos>=input.Length) {
                                break;
                            }
                        }
                    }
                
                    parser_pos+=2;
                    return new string[] { "/*"+comment+"*/", "TK_BLOCK_COMMENT"};
                }   

                if (input[parser_pos]=='/') {
                    comment = c;
                    while ((input[parser_pos]!='\x0d') && (input[parser_pos]!='\x0a')) {
                        comment+=input[parser_pos];
                        parser_pos++;
                        if (parser_pos>=input.Length){
                            break;
                        }
                    }

                    parser_pos++;
                    if (wanted_newline){
                        print_newline(null);
                    }
                    return new string[] {comment,"TK_COMMENT"};

                }
            }

            if ( (c=="'") || (c=="\"")  || ((c=="/")
                    && ((last_type=="TK_WORD" && last_text=="return") || ((last_type=="TK_START_EXPR")  || (last_type=="TK_START_BLOCK") || (last_type=="TK_END_BLOCK")
                            || (last_type=="TK_OPERATOR") || (last_type=="TK_EOF") || (last_type=="TK_SEMICOLON"))))
                ) {
                var sep = c;
                var esc = false;
                var resulting_string = c;

                if (parser_pos<input.Length) {
                    if (sep=="/") {
                        var in_char_class=false;
                        while ((esc) || (in_char_class) || (input[parser_pos].ToString()!=sep)) {
                            resulting_string+=input[parser_pos];
                            if (!esc) {
                                esc = input[parser_pos]=='\\';
                                if (input[parser_pos]=='['){
                                    in_char_class=true;
                                }
                                else if (input[parser_pos]==']') {
                                    in_char_class=false;
                                }
                            }
                            else {
                                esc=false;
                            }
                            parser_pos++;
                            if (parser_pos>=input.Length) {
                                return new string[] { resulting_string, "TK_STRING"};
                            }
                        } 
                    }
                    else {
                        while ((esc) || (input[parser_pos].ToString()!=sep)) {
                            resulting_string += input[parser_pos];
                            if (!esc) {
                                esc = input[parser_pos]=='\\';
                            } else {
                                esc=false;
                            }
                            parser_pos++;
                            if (parser_pos>=input.Length){
                                return new string[] {resulting_string,"TK_STRING"};
                            }
                        }
                    }
                }

                parser_pos += 1;

                resulting_string += sep;

                if (sep == "/") {
                    // regexps may have modifiers /regexp/MOD , so fetch those, too
                    while ((parser_pos < input.Length) && (wordchar.Contains(input[parser_pos]))) {
                        resulting_string += input[parser_pos];
                        parser_pos += 1;
                    }
                }
                return new string []  {resulting_string, "TK_STRING"};


            }

            if (c == "#") {
                var sharp = "#";
                if ((parser_pos < input.Length) && (digits.Contains(input[parser_pos]))) {
                    do {
                        c = input[parser_pos].ToString();
                        sharp += c;
                        parser_pos += 1;
                    } while ((parser_pos < input.Length ) && (c != "#") && (c != "="));
                    if (c == "#") {
                        return new string[] {sharp, "TK_WORD"};;
                    } else {
                        return new string[] {sharp, "TK_OPERATOR"};;
                    }
                }
            }


            if ((c == "<") && (input.Substring(parser_pos - 1,  3) == "<!--")) {
                parser_pos += 3;
                return new string[] {"<!--", "TK_COMMENT"};;
            }

            if ((c == "-") && (input.Substring(parser_pos - 1,  2) == "-->")) {
                parser_pos += 2;
                if (wanted_newline) {
                    print_newline(null);
                }
                return new string[] {"-->", "TK_COMMENT"};
            }

            if (punct.Contains(c)) {
                while ((parser_pos < input.Length) && (punct.Contains(c + input[parser_pos]))) {
                    c += input[parser_pos];
                    parser_pos += 1;
                    if (parser_pos >= input.Length) {
                        break;
                    }
                }

                return new string[] {c, "TK_OPERATOR"};
            }

            return new string[] {c, "TK_UNKNOWN"};


        }

        private string last_word;
        private bool var_line;
        private bool var_line_tainted;
        private string[] line_starters;
        private bool in_case;
        private string token_type;

        public string GetResult()
        {
            if (add_script_tags)
            {
                output.AppendLine().AppendLine("</script>");
            }
                
            return output.ToString();
        }

        private bool add_script_tags;
        public JSBeautify(string js_source_text, JSBeautifyOptions options)
        {
            opt_indent_size = options.indent_size ?? 4;
            opt_indent_char = options.indent_char ?? ' ';
            opt_indent_level = options.indent_level ?? 0;
            opt_preserve_newlines = options.preserve_newlines ?? true;
            output = new StringBuilder();
            modes = new Stack<string>();

            

            indent_string = "";
            
            while (opt_indent_size > 0) {
                indent_string += opt_indent_char;
                opt_indent_size -= 1;
            }

            indent_level = opt_indent_level;

            

            input = js_source_text.Replace("<script type=\"text/javascript\">","").Replace("</script>","");
            if (input.Length != js_source_text.Length)
            {
                output.AppendLine("<script type=\"text/javascript\">");
                add_script_tags = true;
            }

            last_word = ""; // last 'TK_WORD' passed
            last_type = "TK_START_EXPR"; // last token type
            last_text = ""; // last token text
            
            do_block_just_closed = false;
            var_line = false;         // currently drawing var .... ;
            var_line_tainted = false; // false: var a = 5; true: var a = 5, b = 6

            whitespace = "\n\r\t ";
            wordchar = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$";
            digits = "0123456789";

            // <!-- is a special case (ok, it's a minor hack actually)
            punct = "+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! !! , : ? ^ ^= |= ::".Split(' ');

            // words which should always start on new line.
            line_starters = "continue,try,throw,return,var,if,switch,case,default,for,while,break,function".Split(',');

            // states showing if we are currently in expression (i.e. "if" case) - 'EXPRESSION', or in usual block (like, procedure), 'BLOCK'.
            // some formatting depends on that.
            current_mode = "BLOCK";
            modes.Push(current_mode);

            parser_pos = 0;
            in_case = false;

            while (true) {
                var t = get_next_token(ref parser_pos);
                token_text = t[0];
                token_type = t[1];
                if (token_type == "TK_EOF") {
                    break;
                }

                switch (token_type) {

                case "TK_START_EXPR":
                    var_line = false;
                    set_mode("EXPRESSION");
                    if ((last_text == ";") || (last_type == "TK_START_BLOCK")) {
                        print_newline(null);
                    } else if ((last_type == "TK_END_EXPR") ||( last_type == "TK_START_EXPR")) {
                        // do nothing on (( and )( and ][ and ]( ..
                    } else if ((last_type != "TK_WORD") && (last_type != "TK_OPERATOR")) {
                        print_space();
                    } else if (line_starters.Contains(last_word)) {
                        print_space();
                    }
                    print_token();
                    break;

                case "TK_END_EXPR":
                    print_token();
                    restore_mode();
                    break;

                case "TK_START_BLOCK":

                    if (last_word == "do") {
                        set_mode("DO_BLOCK");
                    } else {
                        set_mode("BLOCK");
                    }
                    if ((last_type != "TK_OPERATOR") && (last_type != "TK_START_EXPR")) {
                        if (last_type == "TK_START_BLOCK") {
                            print_newline(null);
                        } else {
                            print_space();
                        }
                    }
                    print_token();
                    indent();
                    break;

                case "TK_END_BLOCK":
                    if (last_type == "TK_START_BLOCK") {
                        // nothing
                        trim_output();
                        unindent();
                    } else {
                        unindent();
                        print_newline(null);
                    }
                    print_token();
                    restore_mode();
                    break;

                case "TK_WORD":

                    if (do_block_just_closed) {
                        // do {} ## while ()
                        print_space();
                        print_token();
                        print_space();
                        do_block_just_closed = false;
                        break;
                    }

                    if ((token_text == "case" )|| (token_text == "default")) {
                        if (last_text == ":") {
                            // switch cases following one another
                            remove_indent();
                        } else {
                            // case statement starts in the same line where switch
                            unindent();
                            print_newline(null);
                            indent();
                        }
                        print_token();
                        in_case = true;
                        break;
                    }

                    prefix = "NONE";

                    if (last_type == "TK_END_BLOCK") {
                        if (!(new string[] {"else", "catch", "finally" }).Contains(token_text.ToLower())) {
                            prefix = "NEWLINE";
                        } else {
                            prefix = "SPACE";
                            print_space();
                        }
                    } else if ((last_type == "TK_SEMICOLON") && ((current_mode == "BLOCK") ||( current_mode == "DO_BLOCK"))) {
                        prefix = "NEWLINE";
                    } else if ((last_type == "TK_SEMICOLON") && (current_mode == "EXPRESSION")) {
                        prefix = "SPACE";
                    } else if (last_type == "TK_STRING") {
                        prefix = "NEWLINE";
                    } else if (last_type == "TK_WORD") {
                        prefix = "SPACE";
                    } else if (last_type == "TK_START_BLOCK") {
                        prefix = "NEWLINE";
                    } else if (last_type == "TK_END_EXPR") {
                        print_space();
                        prefix = "NEWLINE";
                    }

                    if ((last_type != "TK_END_BLOCK") && ((new string[] {"else", "catch", "finally"}).Contains(token_text.ToLower()))) {
                        print_newline(null);
                    } else if ((line_starters.Contains(token_text)) ||( prefix == "NEWLINE")) {
                        if (last_text == "else") {
                            // no need to force newline on else break
                            print_space();
                        } else if (((last_type == "TK_START_EXPR") ||( last_text == "=") || (last_text == ",")) && (token_text == "function")) {
                            // no need to force newline on "function": (function
                            // DONOTHING
                        } else if ((last_type == "TK_WORD") && ((last_text == "return") || (last_text == "throw"))) {
                            // no newline between "return nnn"
                            print_space();
                        } else if (last_type != "TK_END_EXPR") {
                            if (((last_type != "TK_START_EXPR") || (token_text != "var")) && (last_text != ":")) {
                                // no need to force newline on "var": for (var x = 0...)
                                if ((token_text == "if") && (last_type == "TK_WORD") && (last_word == "else")) {
                                    // no newline for } else if {
                                    print_space();
                                } else {
                                    print_newline(null);
                                }
                            }
                        } else {
                            if ((line_starters.Contains(token_text)) && (last_text != ")")) {
                                print_newline(null);
                            }
                        }
                    } else if (prefix == "SPACE") {
                        print_space();
                    }
                    print_token();
                    last_word = token_text;

                    if (token_text == "var") {
                        var_line = true;
                        var_line_tainted = false;
                    }

                    if (token_text == "if" || token_text == "else") {
                        if_line_flag = true;
                    }

                    break;

                case "TK_SEMICOLON":

                    print_token();
                    var_line = false;
                    break;

                case "TK_STRING":

                    if ((last_type == "TK_START_BLOCK" )||( last_type == "TK_END_BLOCK") || (last_type == "TK_SEMICOLON")) {
                        print_newline(null);
                    } else if (last_type == "TK_WORD") {
                        print_space();
                    }
                    print_token();
                    break;

                case "TK_OPERATOR":

                    var start_delim = true;
                    var end_delim = true;
                    if (var_line && (token_text != ",")) {
                        var_line_tainted = true;
                        if (token_text == ":") {
                            var_line = false;
                        }
                    }
                    if (var_line && (token_text == ",") && (current_mode == "EXPRESSION")) {
                        // do not break on comma, for(var a = 1, b = 2)
                        var_line_tainted = false;
                    }

                    if (token_text == ":" && in_case) {
                        print_token(); // colon really asks for separate treatment
                        print_newline(null);
                        in_case = false; 
                        break;
                    }

                    if (token_text == "::") {
                        // no spaces around exotic namespacing syntax operator
                        print_token();
                        break;
                    }

                    if (token_text == ",") {
                        if (var_line) {
                            if (var_line_tainted) {
                                print_token();
                                print_newline(null);
                                var_line_tainted = false;
                            } else {
                                print_token();
                                print_space();
                            }
                        } else if (last_type == "TK_END_BLOCK") {
                            print_token();
                            print_newline(null);
                        } else {
                            if (current_mode == "BLOCK") {
                                print_token();
                                print_newline(null);
                            } else {
                                // EXPR od DO_BLOCK
                                print_token();
                                print_space();
                            }
                        }
                        break;
                    } else if ((token_text == "--" )|| (token_text == "++")) { // unary operators special case
                        if (last_text == ";") {
                            if (current_mode == "BLOCK") {
                                // { foo; --i }
                                print_newline(null);
                                start_delim = true;
                                end_delim = false;
                            } else {
                                // space for (;; ++i)
                                start_delim = true;
                                end_delim = false;
                            }
                        } else {
                            if (last_text == "{") {
                                // {--i
                                print_newline(null);
                            }
                            start_delim = false;
                            end_delim = false;
                        }
                    } else if (((token_text == "!") ||( token_text == "+") || (token_text == "-")) && ((last_text == "return" )|| (last_text == "case"))) {
                        start_delim = true;
                        end_delim = false;
                    } else if (((token_text == "!" )||( token_text == "+") || (token_text == "-")) && (last_type == "TK_START_EXPR")) {
                        // special case handling: if (!a)
                        start_delim = false;
                        end_delim = false;
                    } else if (last_type == "TK_OPERATOR") {
                        start_delim = false;
                        end_delim = false;
                    } else if (last_type == "TK_END_EXPR") {
                        start_delim = true;
                        end_delim = true;
                    } else if (token_text == ".") {
                        // decimal digits or object.property
                        start_delim = false;
                        end_delim = false;

                    } else if (token_text == ":") {
                        if (is_ternary_op()) {
                            start_delim = true;
                        } else {
                            start_delim = false;
                        }
                    }
                    if (start_delim) {
                        print_space();
                    }

                    print_token();

                    if (end_delim) {
                        print_space();
                    }
                    break;

                case "TK_BLOCK_COMMENT":

                    print_newline(null);
                    print_token();
                    print_newline(null);
                    break;

                case "TK_COMMENT":

                    // print_newline();
                    print_space();
                    print_token();
                    print_newline(null);
                    break;

                case "TK_UNKNOWN":
                    print_token();
                    break;
                }

                last_type = token_type;
                last_text = token_text;
            }


        }


    }
}
