import * as Git from "nodegit";
import * as path from "path";

export class GitRepoService {
    public static localPath: string = "./repos/localizationutils";
    public static CloneRepo(url: string) {
        
        return Git.Clone.clone(url, GitRepoService.localPath)
            .then((repo: any) => {
                console.log("Cloned " + path.basename(url) + " to " + repo.workdir());
                return repo;
            }).catch((reject: any) => {
                console.log(reject);
            });
    }   
}