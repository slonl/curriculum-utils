#!/usr/bin/env bash

set -o errexit  # Exit script when a command exits with non-zero status.
set -o errtrace # Exit on error inside any functions or sub-shells.
set -o nounset  # Exit script on use of an undefined variable.
set -o pipefail # Return exit status of the last command in the pipe that exited with a non-zero exit code

status() {
    # which folder to check: editor, master or release. defaults to editor.
    local folder="${1:-editor}"

    if [[ "${folder}" != "editor" && "${folder}" != "master" && "${folder}" != "release" ]]; then
        echo "Usage: $0 [editor|master|release]"
        echo "  Checks 'git status' for every context repo inside the given folder."
        echo "  folder defaults to 'editor' when omitted."
        exit 1
    fi

    echo "Checking git status for all contexts in '${folder}/' (run with 'master' or 'release' to check those instead)"
    echo

    # get contexts from file
    # the `|| [[ -n "${context}" ]]` handles a final line with no trailing
    # newline: `read` returns non-zero at EOF even though it still filled
    # ${context}, so without this the last context in the file gets skipped.
    while read context || [[ -n "${context}" ]]; do
        if [[ ! -d "${folder}/${context}" ]]; then
            echo "=== ${folder}/${context} (not cloned, run init.sh/update.sh) ==="
            continue
        fi
        echo "=== ${folder}/${context} ==="
        git -C "${folder}/${context}" status
        echo
    done < curriculum-contexts.txt
}

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  export -f status
else
  status "${@}"
  exit $?
fi
