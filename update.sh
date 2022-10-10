#!/usr/bin/env bash

set -o errexit  # Exit script when a command exits with non-zero status.
set -o errtrace # Exit on error inside any functions or sub-shells.
set -o nounset  # Exit script on use of an undefined variable.
set -o pipefail # Return exit status of the last command in the pipe that exited with a non-zero exit code

: readonly "${GIT:=git}"

update() {
    # get contexts from file
    while read context; do
    	echo "editor/${context}";
      "${GIT}" -C "editor/${context}" pull
      echo "copying editor/${context} context and schema to master/${context}";
      cp "editor/${context}/context.json" "master/${context}/"
      cp "editor/${context}/schema.jsonld" "master/${context}/"
      echo "successfull copy from editor/${context} to master/${context}";
    	echo "master/${context}";
    	"${GIT}" -C "master/${context}" pull
      echo "copying master/${context} data to editor/${context}";
      cp "master/${context}/data"/* "editor/${context}/data"
      cp "master/${context}/data"/* "editor/${context}/data"
      echo "successfull copy from master/${context} to editor/${context}";
    done < curriculum-contexts.txt
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  export -f update
else
  update "${@}"
  exit $?
fi