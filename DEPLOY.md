# Deployment 🚀

For instructions on how to deploy, see [zaf_sdk_deployment](https://github.com/zendesk/zaf_sdk_deployment).

## Recovery

**The default action that should be taken to respond to an incident caused by a recent ZAF SDK deployment is _a rollback_.** Do not hesitate to perform a rollback if prior releases do not exhibit the defect in question.

To roll back to a previous version, use the [App Framework SDK deploys](https://samson.zende.sk/projects/zendesk_app_framework_sdk/stages/static-assets-switch-major) stage to deploy a previously deployed tag.

_Note: This pipeline should **only** be used to respond to incidents._

1. Notify @vegemite on #ask-vegemite of any ongoing incidents and whether you intend to rollback a deploy.
1. Look at recent [App Framework SDK deploys](https://samson.zende.sk/projects/zendesk_app_framework_sdk/stages/static-assets-switch-major) to production.
1. Deploy the previous tag.
1. Notify @vegemite on #ask-vegemite once the rollback is complete.
