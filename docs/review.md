# Review

The reviewer is the main agent or the member who opened the pull request. The implementer agent does not review its own change.

## Pass

Pass only when all of these hold:

- The diff matches the requirement file, including its out-of-scope section.
- No second behavior landed in the same pull request.
- The acceptance checks were run, or the reviewer ran them, and they pass.
- The change is readable on its own. Names and structure match the surrounding code.
- The agent's summary matches the diff.

Merge on pass.

## Implementation fail

Use this when the requirement is still right and the code is wrong, extra, or unverified.

Comment:

- the acceptance check that failed, or the extra behavior that appeared
- the file and the expected behavior
- nothing about a new feature

Leave the requirement file unchanged. The implementer agent fixes only that list. Move the label back to `implementing` until the fix is pushed, then `in-review`.

## Requirement fail

Use this when a pass would require interpreting the requirement, or when review shows the requested behavior is the wrong one.

The author edits `requirements/<id>.md` so the new wording is the whole requirement, not a note in a comment. Apply `re-requirement`. The next agent action is a clarity check, not a patch on the old reading.

## What review is for

The implementer is told to go fast and stay inside one behavior. Quality, scope, and the acceptance checks belong to this review. A pass means both the requirement and the code survived that check.
