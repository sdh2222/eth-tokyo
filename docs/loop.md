# Loop

One open pull request is one requirement. The requirement file is the source of truth. The pull request body points at it.

```
member opens PR (requirements/<id>.md only)
        |
        v
one agent claims it
        |
        +-- unclear --> comment questions, label needs-clarification, stop
        |                    |
        |                    +-- author edits the requirement file
        |                              |
        |                              +-- back to claim
        |
        +-- clear --> implement that behavior only, push, label in-review
                              |
                              v
                    main agent or PR author reviews
                              |
                              +-- pass --> merge
                              +-- implementation fail --> defects on the same requirement
                              |                              |
                              |                              +-- agent fixes only those
                              +-- requirement fail --> author rewrites the requirement file
                                                         |
                                                         +-- back to claim
```

## Roles

- **Member.** Writes one requirement and opens the pull request. Answers clarification questions by editing the requirement file.
- **Implementer agent.** The only agent that writes code on that PR. Clarity first. One behavior. No self-approval.
- **Reviewer.** The main agent or the member who opened the PR. Judges code quality and runs the acceptance checks. The implementer does not take this role.

## Same PR, two kinds of failure

An implementation failure means the requirement still stands and the code missed it. The reviewer comments the defects. The agent pushes a fix.

A requirement failure means the wording was wrong, incomplete, or has grown a second behavior. The author edits `requirements/<id>.md`. That edit is a new clarity check. The agent does not treat the previous code as accepted.

## Stop spinning

After two implementation failures on the same wording, the reviewer marks the PR `re-requirement` and the author rewrites the requirement. Further patches on a muddy requirement waste the loop.

## One agent

The claim comment is the lock. A second agent that sees `CLAIMED` leaves the PR alone.
