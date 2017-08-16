import { IndexedObjects, SourceType } from './models';
import { RequestPromise, get } from "request-promise-native";

const data = require('../repositories.json');

export class JsonLoader {
    public static GetJsonByUrl(url: string) {
        return get({
            url: url
        });
    }

    private static BuildUrl(visualName: string, type: SourceType): string {
        if (type === SourceType.Capabilities) {
            return "https://raw.githubusercontent.com/Microsoft/" + visualName + "/master/capabilities.json";
        } else if (type === SourceType.UtilsRepo) {
            return "https://raw.githubusercontent.com/Microsoft/powerbi-visuals-utils-localizationutils/master/" + visualName + "/en-US/resources.resjson";
        }

        return "https://raw.githubusercontent.com/Microsoft/" + visualName + "/master/stringResources/en-US/resources.resjson";   
    }

    public static GetJsonsFromGithub(repoType: SourceType): Promise<IndexedObjects> {
        let allRequests: RequestPromise[] = [];
        let visualNames: string[] = [];

        for (let visualName in data) {
            if (data[visualName]) {
                let url: string = JsonLoader.BuildUrl(visualName, repoType);
                visualNames.push(visualName);
                allRequests.push(JsonLoader.GetJsonByUrl(url));
            }
        }
        
        return Promise.all(allRequests).then((value) => {
            let allJsons: IndexedObjects = new IndexedObjects();
            
            value.forEach((val, index) => {
                let key: string = visualNames[index];

                console.log("Visual " + key + " prepared for parsing");

                // remove byte order mark from json string. Found in linedotchart
                let val1 = val.replace('\uFEFF', '');
                
                allJsons[key] = JSON.parse(val1);

                console.log("Visual " + key + " successfully parsed");
            });

            return allJsons;
        }).catch((reject) => {
            console.log("Get jsons from github failed: " + reject);
            throw reject;
        });
    }
}