# Pull Request Checklist Helper

Ensure that any checklists pull request body is completed, and add labels to the pull request.

---

## Usage

Create a file named `.github/workflows/checklist-helper.yml` (or any name in that directory) with the following contents:

```yaml
name: Require Checklist Helper
on:
  pull_request:
    types: [opened, edited, synchronize, labeled, unlabeled]
  issues: # optional - if you want to use this action on issues
    types: [opened, edited, deleted]
jobs:
  job1:
    runs-on: ubuntu-latest
    steps:
      - uses: preda-bogdan/gha-pr-check-helper@master
        with:
          requireChecklist: false # If this is true and there are no checklists detected, the action will fail
          onlyCheckBody: true # If this is true, the action will only check the body of the pull request, else comments will also trigger
          completedLabel: "checklist-completed" # This is the default you can use your own.
          incompleteLabel: "checklist-incomplete" # This is the default you can use your own.
          skipLabel: "allow-checklist-skip" # This is the default you can use your own. This label will skip the checklist check and mark the test as a pass.
          allowStrikeThrough: false # If this is true, the action will allow strike through items in the checklist to be counted as resolved/optional.
```

### Other notes:
In case there are some items that are not applicable in given checklist 
they can be ~stroked through~ and this action will ignore them, the default behaviour is to check strike through items, but this can be enabled/disabled by setting `allowStrikeThrough` to `true`/`false` in the action configuration.

The types: `labeled` and `unlabeled` are only required if using the `skipLabel` else you can remove them.