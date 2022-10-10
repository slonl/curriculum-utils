#!/usr/bin/env bash

set -o errexit  # Exit script when a command exits with non-zero status.
set -o errtrace # Exit on error inside any functions or sub-shells.
set -o nounset  # Exit script on use of an undefined variable.
set -o pipefail # Return exit status of the last command in the pipe that exited with a non-zero exit code

copy() {
    # get contexts from file
    while read context; do
    	echo "copy master/${context}/data to editor/${context}/data";
    	cp "master/${context}/data"/* "editor/${context}/data"
    done < curriculum-contexts.txt
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  export -f copy
else
  copy "${@}"
  exit $?
fi