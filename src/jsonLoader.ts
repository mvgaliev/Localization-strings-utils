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
        return type === SourceType.Capabilities 
            ? "https://raw.githubusercontent.com/Microsoft/" + visualName + "/master/capabilities.json"
            : "https://raw.githubusercontent.com/Microsoft/powerbi-visuals-utils-localizationutils/master/" + visualName + "/en-US/resources.resjson";
    }

    public static async GetJsonsFromGithub(repoType: SourceType): Promise<IndexedObjects> {
        let allRequests: RequestPromise[] = [];
        let visualNames: string[] = [];

        for (let visualName in data) {
            if (data[visualName]) {
                let url: string = JsonLoader.BuildUrl(visualName, repoType);
                visualNames.push(visualName);
                allRequests.push(JsonLoader.GetJsonByUrl(url));
            }
        }

        let allJsons: IndexedObjects = new IndexedObjects();
        await Promise.all(allRequests).then((value) => {
            value.forEach((val, index) => {
                let key: string = visualNames[index];

                console.log("Visual " + key + " prepared for parsing");

                // remove byte order mark from json string. Found in linedotchart
                let val1 = val.replace('\uFEFF', '');
                
                allJsons[key] = JSON.parse(val1);

                console.log("Visual " + key + " successfully parsed");
            });
        }).catch((reject) => {
            console.log("Get jsons from github failed: " + reject);
        });

        return allJsons;
    }
}