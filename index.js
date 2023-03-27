const core = require("@actions/core");
const github = require("@actions/github");

const TASK_LIST_ITEM_ALLOW_STRIKETHROUGH = /(?:^|\n)\s*[-\*]\s+\[([ xX])\]\s+((?!~).*)/g;
const TASK_LIST_ITEM_NO_STRIKETHROUGH = /(?:^|\n)\s*[-\*]\s+\[([ xX])\]\s+(.*)/g;

async function action() {
    const bodyList = [];
    const completedLabel = core.getInput("completedLabel") || "checklist-complete";
    const incompleteLabel = core.getInput("incompleteLabel") || "checklist-incomplete";
    const allowStrikethrough = core.getInput("allowStrikethrough") || "false";
    const skipLabel = core.getInput("skipLabel") || "allow-checklist-skip";

    let REGEX_MATCHER = TASK_LIST_ITEM_NO_STRIKETHROUGH;
    if ( allowStrikethrough == "true" ) {
        REGEX_MATCHER = TASK_LIST_ITEM_ALLOW_STRIKETHROUGH;
    }

    const token = core.getInput("token");
    const octokit = github.getOctokit(token);

    const { data: issue } = await octokit.rest.issues.get({
        ...github.context.repo,
        issue_number: github.context.issue.number,
    });

    if (issue.body) {
        bodyList.push(issue.body);
    }

    const onlyCheckBody = core.getInput("onlyCheckBody");
    if (onlyCheckBody != "true") {
        const { data: comments } = await octokit.rest.issues.listComments({
            ...github.context.repo,
            issue_number: github.context.issue.number,
        });

        for (let comment of comments) {
            bodyList.push(comment.body);
        }
    }

    const response = await octokit.rest.issues.listLabelsOnIssue({
        ...github.context.repo,
        issue_number: github.context.issue.number,
    } );
    const skipLabelPresent = response.data.find(label => label.name === skipLabel);

    // Check each body for task list items
    let containsChecklist = false;
    const incompleteItems = [];
    if (!skipLabelPresent) {
        for (let body of bodyList) {
            const matches = [...body.matchAll(REGEX_MATCHER)];
            for (let item of matches) {
                const is_complete = item[1] != " ";
                const item_text = item[2];

                containsChecklist = true;

                if (is_complete) {
                    console.log("Completed task list item: " + item_text);
                } else {
                    console.log("Incomplete task list item: " + item_text);
                    incompleteItems.push(item_text);
                }
            }
        }
    }

    const incompleteLabelPresent = response.data.find(label => label.name === incompleteLabel);
    const completedLabelPresent = response.data.find(label => label.name === completedLabel);

    if (incompleteItems.length > 0) {
        if (completedLabelPresent) {
            await octokit.rest.issues.removeLabel({
                ...github.context.repo,
                issue_number: github.context.issue.number,
                name: completedLabel,
            } );
        }
        if (!incompleteLabelPresent) {
            await octokit.rest.issues.addLabels({
                ...github.context.repo,
                issue_number: github.context.issue.number,
                labels: [incompleteLabel],
            } );
        }
        console.log(`Labeled: ${incompleteLabel}`);
        core.setFailed(
            "The following items are not marked as completed: " +
            incompleteItems.join(", ")
        );
        return;
    }

    const requireChecklist = core.getInput("requireChecklist");
    if (requireChecklist != "false" && !containsChecklist && !skipLabelPresent) {
        core.setFailed(
            "No task list was present and requireChecklist is turned on"
        );
        return;
    }

    console.log("There are no incomplete task list items");

    if (incompleteLabelPresent) {
        await octokit.rest.issues.removeLabel({
            ...github.context.repo,
            issue_number: github.context.issue.number,
            name: incompleteLabel,
        } );
    }
    await octokit.rest.issues.addLabels({
        ...github.context.repo,
        issue_number: github.context.issue.number,
        labels: [completedLabel],
    } );

    console.log(`Labeled: ${completedLabel}`);
}

if (require.main === module) {
    action();
}

module.exports = action;