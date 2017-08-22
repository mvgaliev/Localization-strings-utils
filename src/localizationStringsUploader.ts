import * as Git from "nodegit";
import * as FS from "fs-extra";
import { GitRepoService } from "./gitRepoService";
import { DisplayNameAndKeyPairs, IndexedObjects, SourceType } from "./models";
import * as GitHubApi from "github";

export class LocalizationStringsUploader {
    private static msGithubUrl: string = "https://github.com/pbicvbot/"; //"https://github.com/Microsoft/"; //"https://github.com/mvgaliev/";
    private static localizationUtilsRepoUrl: string = LocalizationStringsUploader.msGithubUrl + "powerbi-visuals-utils-localizationutils.git";
    private static localizationUtilsRepoName: string = "powerbi-visuals-utils-localizationutils";
    private static ms: string = "Microsoft";

    private static reposPath: string = "./repos/";
    private static localizationUtilsPath: string = LocalizationStringsUploader.reposPath + "localizationutils";
    private static resjsonPath: string = "/en-US/resources.resjson";

    private static token: string = "";//bot
    private static pbicvbot: string = "pbicvbot";
    private static authorEmail: string = "pbicvbot@microsoft.com";

    public static async UploadStringsToCommonRepo(updatedVisuals: IndexedObjects) {
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
            let content: {} = updatedVisuals[visualName];
            
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
        .then(() => {
            return github.pullRequests.create({
                base: "master",
                owner: LocalizationStringsUploader.ms,
                repo: LocalizationStringsUploader.localizationUtilsRepoName,
                head: "pbicvbot:master",
                title: "Localization strings update"
            });
        })
        .catch((error) => {
            console.log(error);
        });      
    }

    public static async UploadStringsToAllRepos(updatedVisuals: IndexedObjects) {
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
            let content: {} = updatedVisuals[visualName]; 
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
                        "path": "stringResources/en-US/resources.resjson",
                        "mode": "100644",
                        "type": "blob",
                        "sha": blob.data.sha
                    },
                    {
                        "path": "stringResources/en-US.json",
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
            .then(() => {
                return github.pullRequests.create({
                    base: "master",
                    owner: LocalizationStringsUploader.ms,
                    repo: LocalizationStringsUploader.localizationUtilsRepoName,
                    head: "pbicvbot:master",
                    title: "Localization strings update"
                });
            });
        }
    }
    
    private static CreateBranch(repository: Git.Repository, branchName: string, commit: Git.Commit): Promise<Git.Reference> {
        return repository.createBranch(
                                branchName,
                                commit,
                                false,
                                repository.defaultSignature(),
                                "Created " + branchName + " on HEAD");
    }

    private static CheckoutBranch(repository: Git.Repository, branchName: string): Promise<Git.Reference> {
        let checkoutOpts: Git.CheckoutOptions = {
                                checkoutStrategy: Git.Checkout.STRATEGY.NONE
                            };

        return repository.checkoutBranch(branchName, checkoutOpts);
    }

    private static BuildPushOptions(): any {
        return {
            callbacks: {
                credentials: (url: string, userName: string) => {
                    return Git.Cred.userpassPlaintextNew(LocalizationStringsUploader.token, 'x-oauth-basic');
                }
            },
            certificateCheck: function() { return 1; },
            transferProgress: (progress: any) => {
                console.log('progress: ', progress)
            }
        };
    }
}
