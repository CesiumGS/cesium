#!/bin/bash

#
# CRYPTO.SH
#
# Encrypts/decrypts contents of a folder using Codeship's jet cli.
#
# Usage:
#   ./crypto encrypt folder destination
#   ./crypto decrypt folder destination
#

set -e

usage() {
    echo $"Usage: `basename $0` <encrypt|decrypt> <input> [output]"
    exit 1
}

KEY_PATH="codeship.aes" # todo: getopts --key-path

ARGC=$#
CMD=$1
IN_DIR=$2
OUT_DIR=$3

# Do we have at least the input directory
if [ ! "$ARGC" -gt 1 ]; then usage; fi

# output directory exists or create it
if [ -z "$OUT_DIR" ]; then OUT_DIR=$(pwd); fi
if [ ! -e "$OUT_DIR" ]; then mkdir -p "$OUT_DIR"; fi

# output is a directory
if [ ! -d "$OUT_DIR" ]
then
  echo "ERROR: <output> is not a directory."
  usage
fi

# input is a directory
if [ ! -d "$IN_DIR" ]
then
  echo "ERROR: <input> is not a directory or doesn't exist."
  usage
fi

# Check if codeship jet is installed
if ! (hash jet 2>/dev/null)
then
  echo "ERROR: jet is not installed. https://documentation.codeship.com/pro/jet-cli/installation/"
  exit 1
fi

# Check if we have the key
if [ ! -f "$KEY_PATH" ]
then
  echo "Key file missing. Download the project's AES key from Codeship and copy it to the project's root directory."
  exit 1
fi

# encrypt/decrypt
case "$CMD" in
  encrypt)
    for file in $IN_DIR/*
    do
      out="$OUT_DIR/$(basename $file).sec"
      jet encrypt --key-path $KEY_PATH $file $out
      echo "[encrypted] $file > $out"
    done
    ;;
  decrypt)
    for file in $IN_DIR/*.sec
    do
      out="$OUT_DIR/$(basename -s .sec $file)"
      jet decrypt --key-path $KEY_PATH $file $out
      echo "[decrypted] $file > $out"
    done
    ;;
  *)
    usage
    exit 1
esac
