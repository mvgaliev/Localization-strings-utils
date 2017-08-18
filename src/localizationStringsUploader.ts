import * as Git from "nodegit";
import * as FS from "fs-extra";
import { GitRepoService } from "./gitRepoService";
import { DisplayNameAndKeyPairs, IndexedLocalizationStrings, IndexedObjects, SourceType } from "./models";

export class LocalizationStringsUploader {
    private static msGithubUrl: string = "https://github.com/mvgaliev/"; //"https://github.com/Microsoft/";
    private static localizationUtilsRepoUrl: string = LocalizationStringsUploader.msGithubUrl + "powerbi-visuals-utils-localizationutils.git";

    private static reposPath: string = "./repos/";
    private static localizationUtilsPath: string = LocalizationStringsUploader.reposPath + "localizationutils";
    private static resjsonPath: string = "/en-US/resources.resjson";

    //private static token: string = "";bot
    private static token: string = "";
    private static authorName: string = "pbicvbot";
    private static authorEmail: string = "pbicvbot@microsoft.com";

    public static async UploadStringsToCommonRepo(updatedVisuals: IndexedObjects) {
        let repository: Git.Repository,
            index: Git.Index,
            oid: Git.Oid;

        let date: Date = new Date();

                let branchName: string = LocalizationStringsUploader.authorName
                     + "_" + (date.getMonth() + 1)
                     + "_" + date.getDate()
                     + "_" + date.getFullYear()
                     + "_" + date.getHours()
                     + "_" + date.getMinutes()
                     + "_" + date.getSeconds();

        GitRepoService.CloneRepo(LocalizationStringsUploader.localizationUtilsRepoUrl)
               .then(() => {
                    return Git.Repository
                        .open(LocalizationStringsUploader.localizationUtilsPath)
                        .then((repo) => {
                            repository = repo;
                            return LocalizationStringsUploader.CheckoutBranch(repository, "master");
                        })
                        .then(() => {                            
                            return repository.getHeadCommit();
                        })
                        .then((commit) => {
                            return LocalizationStringsUploader.CreateBranch(repository, branchName, commit);
                        })
                        .then(() => {
                            return LocalizationStringsUploader.CheckoutBranch(repository, branchName);
                        })
                        .then(() => {
                            let opt: any = { spaces: "\t" };

                            for (let visualName in updatedVisuals) {
                                let json: {} = updatedVisuals[visualName];
                                FS.writeJSONSync("repos/localizationutils/" + visualName + LocalizationStringsUploader.resjsonPath, json, opt);
                            }

                            return repository.refreshIndex();
                        })             
                        .then((i: Git.Index) => {
                            index = i;

                            for (let visualName in updatedVisuals) {
                                index.addByPath(visualName + "/en-US/resources.resjson");
                            }

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
                            return LocalizationStringsUploader.CreateCommit(repository, oid, [parent])                            
                        })
                        .then((commitId)=> {
                            console.log("New Commit:", commitId.tostrS());

                            return repository.getRemote("origin", () => {});
                        })
                        .then((remoteResult: Git.Remote) => {
                            let options: any = LocalizationStringsUploader.BuildPushOptions();

                            return remoteResult.push(["refs/heads/" + branchName + ":refs/heads/" + branchName], options, <any>null);
                        })
                        .catch((error)=> {
                            console.log(error);

                            throw error;
                        });
                    }).catch((error) => {
                        console.log(error);
                        throw error;
                    });
    }

    public static async UploadStringsToAllRepos(updatedVisuals: IndexedObjects) {
        let promises: Promise<any>[] = [],
            date: Date = new Date(),
            branchName: string = LocalizationStringsUploader.authorName
                        + "_" + (date.getMonth() + 1)
                        + "_" + date.getDate() 
                        + "_" + date.getFullYear() 
                        + "_" + date.getHours()
                        + "_" + date.getMinutes()
                        + "_" + date.getSeconds();

        if (FS.existsSync("./repos/")) {
            console.log("removing repos folder");
            FS.removeSync("./repos/");
        }

        for (let visualName in updatedVisuals) {
            let json: {} = updatedVisuals[visualName],
                repository: Git.Repository,
                oid: Git.Oid,
                index: Git.Index,
                url: string = LocalizationStringsUploader.msGithubUrl + visualName + ".git";            

            promises.push(GitRepoService.CloneRepo(url, "./repos/" + visualName)
                .then(() => {
                    Git.Repository
                        .open("./repos/" + visualName)
                        .then((repo) => {
                            repository = repo;
                            return LocalizationStringsUploader.CheckoutBranch(repository, "master");
                        })
                        .then(() => {                            
                            return repository.getHeadCommit();
                        })
                        .then((commit) => {
                            return LocalizationStringsUploader.CreateBranch(repository, branchName, commit);
                        })
                        .then(() => {
                            return LocalizationStringsUploader.CheckoutBranch(repository, branchName);
                        })
                        .then(() => {
                            let opt: any = { spaces: "\t" };
                            return Promise.all([FS.writeJSON("repos/" + visualName + "/stringResources/en-US/resources.resjson", json, opt),
                            FS.writeJSON("repos/" + visualName + "/stringResources/en-US.json", json, opt)]);                            
                        })
                        .then(() => {                           
                            return repository.refreshIndex();
                        })
                        .then((i: Git.Index) => {
                            index = i;

                            index.addByPath("stringResources/en-US.json");
                            index.addByPath("stringResources/en-US/resources.resjson");

                            return (<any>index.write());                       
                        })
                        .then(() => {
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
                            console.log("New Commit: ", commitId.tostrS());

                            return repository.getRemote("origin", () => {});
                        })
                        .then((remoteResult: Git.Remote) => {
                            let options: any = LocalizationStringsUploader.BuildPushOptions();

                            return remoteResult.push(["refs/heads/" + branchName + ":refs/heads/" + branchName], options, () =>{});
                        })
                        .then(()=> {
                            console.log("Branch: " + branchName + " successfully pushed")
                        })
                        .catch((error)=> {
                            console.log(error);
                            throw error;
                        })
                })
                .catch((error) => {
                    console.log(error);
                    throw error;
                }));
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

    private static CreateCommit(repository: Git.Repository, oid: Git.Oid, parent: any[]): Promise<Git.Oid> {
        let author: Git.Signature = Git.Signature.now(LocalizationStringsUploader.authorName, LocalizationStringsUploader.authorEmail);
        let committer: Git.Signature = Git.Signature.now(LocalizationStringsUploader.authorName, LocalizationStringsUploader.authorEmail);

        return repository.createCommit("HEAD", author, committer, "updated localization strings", oid, [parent]);
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
