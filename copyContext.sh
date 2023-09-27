#!/usr/bin/env bash

set -o errexit  # Exit script when a command exits with non-zero status.
set -o errtrace # Exit on error inside any functions or sub-shells.
set -o nounset  # Exit script on use of an undefined variable.
set -o pipefail # Return exit status of the last command in the pipe that exited with a non-zero exit code

init() {
#copy any changes in the context.json files from the editor/ to the release/ folders.

    # get contexts from file
    while read context; do
    #copy context.json to release folder
      cp "editor/${context}/context.json" "release/${context}/context.json"
    done < curriculum-contexts.txt
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  export -f init
else
  init "${@}"
  exit $?
fi