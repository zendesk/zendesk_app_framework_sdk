:v:

/cc @zendesk/vegemite

### Description
Describe the original problem and the changes made on this PR.

### Tasks
- [ ] Include comments/inline docs where appropriate
- [ ] Add [unit tests](/spec)
- [ ] Update changelog [here](https://github.com/zendesk/zaf_docs/blob/master/doc/v2/dev_guide/changelog.md)

### References
* JIRA: https://zendesk.atlassian.net/browse/VEG-XXX

### DevQA Steps

<!-- The DevQA process is to assess whether the work meets its acceptance criteria. If the acceptance criteria are unclear, the DevQA should verify with the code owner or the person who created the Jira card. To start with DevQA, deploy this branch to [staging](https://samson.zende.sk/projects/zendesk_app_framework/stages/static-assets-build) environment. -->

- Make sure [Zendesk Apps Framework regression tests](https://zendesk.atlassian.net/wiki/spaces/ENG/pages/641702848/DevQA+process+in+Vegemite#DevQAprocessinVegemite-regression-checks) are passing with this change.
- Add specific DevQA instructions here ....

NOTE: DevQA steps are to be actioned only once code has been reviewed and approved.

### Risks
* [HIGH | medium | low] Does it work across browsers (including IE!)?
* [HIGH | medium | low] Does it work in the different products (Support, Chat, Connect)?
* [HIGH | medium | low] Are there any performance implications?
* [HIGH | medium | low] Any security risks?
* [HIGH | medium | low] What features does this touch?

### Rollback Plan

1. Quickly [roll back] to the prior release so that customers can refresh to resolve their issue.
1. Revert this PR to restore the master branch to a deployable green state.
1. Notify the author.

[roll back]: https://github.com/zendesk/zendesk_app_framework_sdk/blob/master/DEPLOY.md#recovery

<!--
List any additional tasks to perform if this PR is reverted. Examples:
 * Run a backfill to alter changed data structures
 * Roll back state of any co-dependent feature flags
 * Revert a PR changing an API endpoint in another repo
 * Inform particular customers, PMs, and/or stakeholders
 * Note any non-obvious consequence of reversion
-->
