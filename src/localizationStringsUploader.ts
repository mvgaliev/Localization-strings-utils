import * as Git from "nodegit";
import * as FS from "fs-extra";
import { GitRepoService } from "./gitRepoService";
import { DisplayNameAndKeyPairs, IndexedLocalizationStrings, IndexedObjects, SourceType } from "./models";

export class LocalizationStringsUploader {
    private static localizationUtilsRepoUrl: string = "https://github.com/Microsoft/powerbi-visuals-utils-localizationutils.git";
    private static localizationUtilsRepoUrl1: string = "https://github.com/mvgaliev/powerbi-visuals-utils-localizationutils-1.git";
    private static localizationUtilsPath: string = "./repos/localizationutils";
    private static token: string = "";
    //private static token: string = "";
    private static authorName: string = "pbicvbot";
    private static authorEmail: string = "pbicvbot@microsoft.com";

    public static async UploadStringsToCommonRepo(updatedVisuals: IndexedObjects) {
        let repository: Git.Repository,
            index: Git.Index,
            oid: Git.Oid,
            remote: Git.Remote;

        let date: Date = new Date();

                let branchName: string = LocalizationStringsUploader.authorName 
                     + "_" + (date.getMonth() + 1)                     
                     + "_" + date.getDate() 
                     + "_" + date.getFullYear() 
                     + "_" + date.getHours()
                     + "_" + date.getMinutes()
                     + "_" + date.getSeconds();

        GitRepoService.CloneRepo(LocalizationStringsUploader.localizationUtilsRepoUrl1)
            .then(() => {               
                Git.Repository
                    .open(LocalizationStringsUploader.localizationUtilsPath)
                    .then((repo) => {
                        repository = repo;
                        return repo.getHeadCommit()
                    })
                    .then((commit) => {
                        return repository.createBranch(
                            branchName,
                            commit,
                            false,
                            repository.defaultSignature(),
                            "Created " + branchName + " on HEAD");
                        });
                    })
                    .then(() => {
                        let checkoutOpts: Git.CheckoutOptions = {
                            checkoutStrategy: Git.Checkout.STRATEGY.FORCE
                        };

                        return repository.checkoutBranch(branchName, checkoutOpts);
                    })
                    .then(() => {
                        let opt: any = { spaces: "\t" };

                        for (let visualName in updatedVisuals) {
                            let json: {} = updatedVisuals[visualName];
                            FS.writeJSONSync("repos/localizationutils/" + visualName + "/en-US/resources.resjson", json, opt);
                        }
                    })
                    .then(() => {
                        return repository.refreshIndex();
                    })               
                    .then((i: Git.Index) => {
                        index = i;
                    })
                    .then(() => {
                        for (let visualName in updatedVisuals) {
                            index.addByPath(visualName + "/en-US/resources.resjson");
                        }
                    })
                    .then(() => {
                        index.write();
                        return index.writeTree();
                    })
                    .then((o: Git.Oid) => {
                        oid = o;
                        return Git.Reference.nameToId(repository, "HEAD");
                    })
                    .then((head) => {
                        return repository.getCommit(head);
                    })
                    .then((parent) => {
                        let author: Git.Signature = Git.Signature.now(LocalizationStringsUploader.authorName, LocalizationStringsUploader.authorEmail);
                        let committer: Git.Signature = Git.Signature.now(LocalizationStringsUploader.authorName, LocalizationStringsUploader.authorEmail);

                        return repository.createCommit("HEAD", author, committer, "updated localization strings", oid, [parent]);                            
                    })
                    .then((commitId) => {
                        console.log("New Commit:", commitId.tostrS());
                    })
                    .then(()=> {
                        return repository.getRemote("origin", () => {});
                    })
                    .then((remoteResult: Git.Remote) => {  
                        remote = remoteResult;
                        let options: any = {
                            callbacks: {
                                credentials: (url: string, userName: string) => {
                                    return Git.Cred.userpassPlaintextNew(LocalizationStringsUploader.token, 'x-oauth-basic');
                                }
                            },
                            certificateCheck: function() { return 1; },

                        };
                        let opt: any = null;
                        return remoteResult.push(
                            ["refs/heads/"+ branchName + ":refs/heads/"+ branchName], options, opt);
                    })
                    .catch((error)=> {
                        console.log(error);

                        throw error;                  
                    });
    }      
    

    public static async UploadStringsToAllRepos(updatedVisuals: IndexedObjects) {
        let repository: Git.Repository,
            index: Git.Index,
            oid: Git.Oid,
            remote: Git.Remote,
            promises: Promise<any>[] = [],
            date: Date = new Date(),
            branchName: string = LocalizationStringsUploader.authorName 
                        + "_" + (date.getMonth() + 1)                     
                        + "_" + date.getDate() 
                        + "_" + date.getFullYear() 
                        + "_" + date.getHours()
                        + "_" + date.getMinutes()
                        + "_" + date.getSeconds();

        for (let visualName in updatedVisuals) {
            let json: {} = updatedVisuals[visualName],
            url: string = "https://github.com/mvgaliev/" + visualName + ".git";

            promises.push(GitRepoService.CloneRepo(url)
                .then(() => {                   

                    Git.Repository
                        .open(LocalizationStringsUploader.localizationUtilsPath)
                        .then((repo) => {
                            repository = repo;
                            return repo.getHeadCommit();
                        })
                        .then((commit) => {
                            return repository.createBranch(
                                branchName,
                                commit,
                                false,
                                repository.defaultSignature(),
                                "Created " + branchName + " on HEAD");
                            });
                        })
                        .then(() => {
                            let checkoutOpts: Git.CheckoutOptions = {
                                checkoutStrategy: Git.Checkout.STRATEGY.FORCE
                            };

                            return repository.checkoutBranch(branchName, checkoutOpts);
                        })
                        .then(() => {
                            let opt: any = { spaces: "\t" };
                            FS.writeJSONSync("repos/" + visualName + "/stringResources/en-US/resources.resjson", json, opt);
                            FS.writeJSONSync("repos/" + visualName + "/stringResources/en-US.json", json, opt);
                        })
                        .then(() => {
                            return repository.refreshIndex();
                        })               
                        .then((i: Git.Index) => {
                            index = i;
                        })
                        .then(() => {
                            index.addByPath(visualName + "/stringResources/en-US/resources.resjson");
                            index.addByPath(visualName + "/stringResources/en-US.json");
                        })
                        .then(() => {
                            index.write();
                            return index.writeTree();
                        })
                        .then((o: Git.Oid) => {
                            oid = o;
                            return Git.Reference.nameToId(repository, "HEAD");
                        })
                        .then((head) => {
                            return repository.getCommit(head);
                        })
                        .then((parent) => {
                            let author: Git.Signature = Git.Signature.now(LocalizationStringsUploader.authorName, LocalizationStringsUploader.authorEmail);
                            let committer: Git.Signature = Git.Signature.now(LocalizationStringsUploader.authorName, LocalizationStringsUploader.authorEmail);

                            return repository.createCommit("HEAD", author, committer, "updated localization strings", oid, [parent]);                            
                        })
                        .then((commitId) => {
                            console.log("New Commit:", commitId.tostrS());
                        })
                        .then(()=> {
                            return repository.getRemote("origin", () => {});
                        })
                        .then((remoteResult: Git.Remote) => {  
                            remote = remoteResult;
                            let options: any = {
                                callbacks: {
                                    credentials: (url: string, userName: string) => {
                                        return Git.Cred.userpassPlaintextNew(LocalizationStringsUploader.token, 'x-oauth-basic');
                                    }
                                },
                                certificateCheck: function() { return 1; },

                            };
                            let opt: any = null;
                            return remoteResult.push(["refs/heads/"+ branchName + ":refs/heads/"+ branchName], options, opt);
                        })
                        .catch((error)=> {
                            console.log(error);

                            throw error;                  
                        })
                );
        };
    }            
}
