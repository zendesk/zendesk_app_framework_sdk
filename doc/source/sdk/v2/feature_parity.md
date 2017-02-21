## ZAF SDK v2 Feature Parity Status

The tables below indicate which APIs are currently available for the [ZAF SDK v2](./zaf_v2). For more information on how to call these APIs check out the [Data API](./data) documentation.

### All locations
| get     | set | invoke |
|:--------|:----|:-------|
| visible |     | hide   |
|         |     | show   |

### Ticket Sidebar API
| get     | set | invoke |
|:--------|:----|:-------|
| comment |     |        |
| ticket  |     |        |

### Brand Object
| get           | set | invoke |
|:--------------|:----|:-------|
| id            |     |        |
| isActive      |     |        |
| isDefault     |     |        |
| hasHelpCenter |     |        |
| logo          |     |        |
| name          |     |        |
| subdomain     |     |        |
| url           |     |        |

### Comment Object
| get         | set  | invoke         |
|:------------|:-----|:---------------|
| attachments | text | appendHtml     |
| text        | type | appendMarkdown |
| type        |      | appendText     |
| useRichText |      |                |

### Group Object
| get  | set | invoke |
|:-----|:----|:-------|
| id   |     |        |
| name |     |        |

### Organization Object
| get            | set     | invoke |
|:---------------|:--------|:-------|
| details        | details |        |
| domains        | domains |        |
| group          | notes   |        |
| id             |         |        |
| name           |         |        |
| notes          |         |        |
| sharedComments |         |        |
| sharedTickets  |         |        |
| tags           |         |        |

### Ticket Object
| get                     | set                     | invoke |
|:------------------------|:------------------------|:-------|
| assignee                | assignee                |        |
| brand                   | brand                   |        |
| collaborators           | postSaveAction          |        |
| comment                 | priority                |        |
| id                      | recipient               |        |
| isNew                   | requester               |        |
| organization            | sharedWith              |        |
| postSaveAction          | sharingAgreementOptions |        |
| priority                | status                  |        |
| recipient               | subject                 |        |
| requester               | tags                    |        |
| sharedWith              | type                    |        |
| sharingAgreementOptions |                         |        |
| status                  |                         |        |
| subject                 |                         |        |
| subject                 |                         |        |
| tags                    |                         |        |
| type                    |                         |        |
| updatedAt               |                         |        |
| viewers                 |                         |        |

### User Object
| get           | set        | invoke |
|:--------------|:-----------|:-------|
| alias         | alias      |        |
| avatarUrl     | details    |        |
| details       | externalId |        |
| email         | notes      |        |
| externalId    | signature  |        |
| groups        |            |        |
| id            |            |        |
| locale        |            |        |
| name          |            |        |
| notes         |            |        |
| organizations |            |        |
| role          |            |        |
| signature     |            |        |
| tags          |            |        |
| timeZone      |            |        |
