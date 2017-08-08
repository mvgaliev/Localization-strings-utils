import { DisplayNameAndKeyPairs, IndexedLocalizationStrings, IndexedObjects } from './models';

export class CapabilitiesParser {
    public static parseCapabilities(jsons: IndexedObjects): IndexedLocalizationStrings {
        let localizationStrings: IndexedLocalizationStrings = new IndexedLocalizationStrings();

        for (let jsonKey in jsons) {
            
            let json: any = jsons[jsonKey];

            let currentLocStrings: DisplayNameAndKeyPairs = new DisplayNameAndKeyPairs();
            let dataRolesStrings: DisplayNameAndKeyPairs = CapabilitiesParser.parseDataRoles(<any[]>json.dataRoles);
            let objectsStrings: DisplayNameAndKeyPairs = CapabilitiesParser.parseObjects(<{[key: string]: string}>json.objects);

            Object.assign(currentLocStrings, dataRolesStrings, objectsStrings);

            localizationStrings[jsonKey] = currentLocStrings;
        }

        return localizationStrings;
    }

    private static parseDataRoles(dataRoles: any[]): DisplayNameAndKeyPairs {
        let strings: DisplayNameAndKeyPairs = {};
        dataRoles.forEach((role) => {
            if (role.displayName && role.displayNameKey && !strings[role.displayNameKey]) {
                strings[role.displayNameKey] = role.displayName;
            }
        });

        return strings;
    }

    private static parseObjects(objects: {[key: string]: {}}): DisplayNameAndKeyPairs {
        let strings: DisplayNameAndKeyPairs = {};
        for (let key in objects) {
            let object: any = objects[key];

            if (object.displayName && object.displayNameKey && !strings[object.displayNameKey]) {
                strings[object.displayNameKey] = object.displayName;
            }

            if (object.properties) {
                for (let key in object.properties) {
                    let property: any = object.properties[key];

                    if (property.displayName && property.displayNameKey && !strings[property.displayNameKey]) {
                        strings[property.displayNameKey] = property.displayName;
                    }
                }
            }
        }

        return strings;
    }
}