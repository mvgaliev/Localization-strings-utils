import * as FS from "fs-extra";
import { DisplayNameAndKeyPairs, IndexedObjects, IndexedFoldersSet, SourceType } from "./models";
import * as GitHubApi from "github";

export class LocalizationStringsUploader {
    private static localizationUtilsRepoName: string = "powerbi-visuals-utils-localizationutils";
    private static ms: string = "Microsoft";

    private static token: string = "";
    private static pbicvbot: string = "pbicvbot";
    private static authorEmail: string = "pbicvbot@microsoft.com";

    public static async UploadStringsToCommonRepo(updatedVisuals: IndexedFoldersSet) {
        let headRefShaMs: string,
            commitSha: string,
            treeSha: string = "",
            blobSha: string;

        let github: GitHubApi = new GitHubApi({
                    debug: true,
                    protocol: "https",
                    host: "api.github.com",
                    followRedirects: false,
                    timeout: 10000
                });

        github.authenticate({
            type: "oauth",
            token: ""
        });

        let res = await github.gitdata.getReference({
                owner: LocalizationStringsUploader.ms,
                repo: LocalizationStringsUploader.localizationUtilsRepoName,
                ref: "heads/master"
            })
            .then((ref) => {
                headRefShaMs = ref.data.object.sha;

                return github.gitdata.updateReference({
                    force: true,
                    ref: "heads/master",
                    owner: LocalizationStringsUploader.pbicvbot,
                    repo: LocalizationStringsUploader.localizationUtilsRepoName,
                    sha: headRefShaMs
                });
            });

        await github.gitdata.getReference({
                owner: LocalizationStringsUploader.ms,
                repo: LocalizationStringsUploader.localizationUtilsRepoName,
                ref: "heads/master"
            })
            .then((ref) => {
                return github.gitdata.getCommit({
                    owner: LocalizationStringsUploader.ms,
                    repo: LocalizationStringsUploader.localizationUtilsRepoName,
                    sha: ref.data.object.sha
                });
            })
            .then((commit) => {
                treeSha = commit.data.tree.sha;
                commitSha = commit.data.sha;
            });

        let namedBlobs: { [key: string]: string } = {};
        let promises: Promise<any>[] = [];

        for (let visualName in updatedVisuals) {
            
            let content: IndexedObjects = updatedVisuals[visualName]["en-US"];
            
            promises.push(
                github.gitdata.createBlob({
                    content: JSON.stringify(content, null, "\t"),
                    encoding: "utf-8",
                    owner: "pbicvbot",
                    repo: LocalizationStringsUploader.localizationUtilsRepoName
                })
                .then((blob) => {
                    namedBlobs[visualName] = blob.data.sha;
                })
            );
        }

        await Promise.all(promises)
            .catch(err => {
                console.log(err);
            });

        let trees: object[] = [];

        for(let visualName in namedBlobs) {
            let blobSha: string = namedBlobs[visualName];

            trees.push({
                "path": visualName + "/en-US/resources.resjson",
                "mode": "100644",
                "type": "blob",
                "sha": blobSha
            });
        }

        if(!treeSha) {
            throw new Error("tree sha wasn't received");
        }

        github.gitdata.createTree({
            owner: LocalizationStringsUploader.pbicvbot,
            repo: LocalizationStringsUploader.localizationUtilsRepoName,
            base_tree: treeSha,
            tree: JSON.stringify(trees)
        })
        .then((newTree) => {
            return github.gitdata.createCommit({
                message: "updated localization strings",
                tree: newTree.data.sha,
                owner: LocalizationStringsUploader.pbicvbot,
                repo: LocalizationStringsUploader.localizationUtilsRepoName,
                parents: [headRefShaMs]
            });
        })
        .then((ref) => {
            return github.gitdata.updateReference({
                force: true,
                owner: LocalizationStringsUploader.pbicvbot,
                repo: LocalizationStringsUploader.localizationUtilsRepoName,
                ref: "heads/master",
                sha: ref.data.sha
            });
        })
        /*.then(() => {
            return github.pullRequests.create({
                base: "master",
                owner: LocalizationStringsUploader.ms,
                repo: LocalizationStringsUploader.localizationUtilsRepoName,
                head: "pbicvbot:master",
                title: "Localization strings update"
            });
        })*/
        .catch((error) => {
            console.log(error);
        });
    }

    public static async UploadStringsToAllRepos(updatedVisuals: IndexedFoldersSet) {
        if (!Object.keys(updatedVisuals).length) {
            return null;
        }

        let promises: Promise<any>[] = [];

        let github: GitHubApi = new GitHubApi({
                    debug: true,
                    protocol: "https",
                    host: "api.github.com",
                    followRedirects: false,
                    timeout: 10000
                });

        github.authenticate({
            type: "oauth",
            token: ""
        });

        for (let visualName in updatedVisuals) {
            let folders: IndexedObjects = updatedVisuals[visualName];

            if (Object.keys(folders).length) {
                for (let folderName in folders) {
                    let content: {} = folders[folderName]; 
                    let headRefSha: string,
                        treeSha: string,
                        commitSha: string;

                    github.gitdata.getReference({
                        owner: LocalizationStringsUploader.ms,
                        repo: visualName,
                        ref: "heads/master"
                    })
                    .then((ref) => {       
                        headRefSha = ref.data.object.sha;

                        return github.gitdata.updateReference({
                            force: true,
                            ref: "heads/master",
                            owner: LocalizationStringsUploader.pbicvbot,
                            repo: visualName, 
                            sha: headRefSha
                        });
                    })
                    .then(() => {
                        return github.gitdata.getCommit({
                            owner: LocalizationStringsUploader.pbicvbot,
                            repo: visualName,
                            sha: headRefSha
                        });
                    })
                    .then((commit) => {
                        treeSha = commit.data.tree.sha;
                        commitSha = commit.data.sha; 

                        return github.gitdata.createBlob({
                            content: JSON.stringify(content, null, "\t"),
                            encoding: "utf-8",
                            owner: "pbicvbot",
                            repo: visualName
                        });
                    })
                    .then((blob) => {
                        return github.gitdata.createTree({
                            owner: LocalizationStringsUploader.pbicvbot,
                            repo: visualName,
                            base_tree: treeSha,
                            tree: JSON.stringify([{
                                "path": "stringResources/" + folderName + "/resources.resjson",
                                "mode": "100644",
                                "type": "blob",
                                "sha": blob.data.sha
                            },
                            {
                                "path": "stringResources/" + folderName + ".json",
                                "mode": "100644",
                                "type": "blob",
                                "sha": blob.data.sha
                            }])
                        })
                    })
                    .then((newTree) => {
                        return github.gitdata.createCommit({
                            message: "updated localization strings",
                            tree: newTree.data.sha,
                            owner: LocalizationStringsUploader.pbicvbot,
                            repo: visualName,
                            parents: [headRefSha]
                        });
                    })
                    .then((ref) => {
                        return github.gitdata.updateReference({
                            force: true,
                            owner: LocalizationStringsUploader.pbicvbot,
                            repo: visualName,
                            ref: "heads/master",
                            sha: ref.data.sha
                        });
                    })
                    /*.then(() => {
                        return github.pullRequests.create({
                            base: "master",
                            owner: LocalizationStringsUploader.ms,
                            repo: LocalizationStringsUploader.localizationUtilsRepoName,
                            head: "pbicvbot:master",
                            title: "Localization strings update"
                        });
                    })*/;
                }                
            }            
        }
    }
}
