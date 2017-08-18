import * as GitHubApi from "github";

class LocalizationStringsUtils {
    public static async Parse() {
        let github: GitHubApi = new GitHubApi({
                    debug: true,
                    protocol: "https",
                    host: "api.github.com",
                    followRedirects: false,
                    timeout: 5000
                });

        github.authenticate({
            type: "oauth",
            token: ""
        });

        let headRefSha: string,
            commitSha: string,
            treeSha: string,
            blobSha: string;

        let result = await github.gitdata.getReference({
            owner: "pbicvbot",
            repo: "powerbi-visuals-gantt",
            ref: "heads/master"
        })
        .then((ref) => {
            headRefSha = ref.data.object.sha;
            return github.gitdata.getCommit({
                owner: "pbicvbot",
                repo: "powerbi-visuals-gantt",
                sha: headRefSha
            });
        })
        .then((commit) => {
            commitSha = commit.data.sha;
            treeSha = commit.data.tree.sha;

            return github.gitdata.createBlob({
                content: "{\"server\":\"GitHub.com\"}",
                encoding: "utf-8",
                owner: "pbicvbot",
                repo: "powerbi-visuals-gantt"
            });      
        })
        .then((blob) => {
            blobSha = blob.data.sha;

            return github.gitdata.getTree({
                owner: "pbicvbot",
                repo: "powerbi-visuals-gantt",
                sha: commitSha
            });            
        })
        .then((tree) => {
                return github.gitdata.createTree({
                    owner: "pbicvbot",
                    repo: "powerbi-visuals-gantt",
                    base_tree: treeSha,
                    tree: JSON.stringify([{
                        "path": "stringResources/en-US/asd.json",
                        "mode": "100644",
                        "type": "blob",
                        "sha": blobSha
                    }])                       
                });
        })
        .then((newTree) => {
            return github.gitdata.createCommit({
                message: "added asd file",
                tree: newTree.data.sha,
                owner: "pbicvbot",
                repo: "powerbi-visuals-gantt",
                parents: [commitSha]
            });
        }).then((ref) => {
            return github.gitdata.updateReference({
                force: true,
                owner: "pbicvbot",
                repo: "powerbi-visuals-gantt",
                ref: "heads/asd",
                sha: ref.data.sha
            });
        });
    }
}

LocalizationStringsUtils.Parse();