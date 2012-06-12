#!/bin/sh
usage() {
cat <<-__EOF__;
NAME
     build.sh - a convenience wrapper around the Dojo Build Application

SYNOPSIS
     path/to/build.sh [--help] [--bin environment] [build system options]

DESCRIPTION
     build.sh is a shell script that wraps the Dojo Build Application located at /util/build/main.js
     to simplify executing the application in various, selectable, Javascript environments. Currently
     both node.js and Java are supported.

OPTIONS
     --help     print the help message
     
     --bin      environment
                Specifies the Javascript environment to use. Defaults to node, if available, java otherwise.
     
                node             use node.js, if available, automatic downgrade to java
                node-dbg         same as node, with the --debug argument
                node-dbg-brk     same as node with the --debug-brk argument
                java             use java
     
     Note: the alternative syntax bin=option is supported but deprecated.

__EOF__
}

if [ "$#" = "0" ]; then
 usage
fi

while [ -n "$1" ]
do
	arg="$1"
    case $arg in
    --help)
        usage
        ba="$ba $arg"
        ;;
    bin=node)
        use_node=0
        ;;
    bin=node-debug)
        use_node=0
        debug_node="--debug"
		;;
    bin=node-debug-brk)
        use_node=0
        debug_node="--debug-brk"
        ;;
    bin=java)
        use_node=1
        ;;
    bin=*)
        echo "Invalid bin= option: only node/java is supported"
        exit 1
        ;;
    *)
		if [ "$arg" = "--bin" ]; then
			case $2 in
			node)
				use_node=0
				;;
			node-debug)
				use_node=0
				debug_node="--debug"
				;;
			node-debug-brk)
				use_node=0
				debug_node="--debug-brk"
				;;
			java)
				use_node=1
				;;
			*)
		        echo "Invalid --bin option: only node/java is supported"
				exit 1
		        ;;
			esac
			shift
		else
	        ba="$ba $arg"
		fi
        ;;
    esac
    shift
done

if [ -z "$use_node" ]; then
    which node > /dev/null 2>&1
    use_node=$?
fi

if [ "$use_node" = "0" ]; then
    cmd="node $debug_node"
    cmdflags="`dirname $0`/../../dojo/dojo.js"
else
    cmd="java"
    cmdflags="-Xms256m -Xmx256m -cp `dirname $0`/../shrinksafe/js.jar:`dirname $0`/../closureCompiler/compiler.jar:`dirname $0`/../shrinksafe/shrinksafe.jar org.mozilla.javascript.tools.shell.Main  `dirname $0`/../../dojo/dojo.js baseUrl=`dirname $0`/../../dojo"
fi

$cmd $cmdflags load=build $ba
