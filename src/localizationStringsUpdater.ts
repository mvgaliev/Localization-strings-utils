import { DisplayNameAndKeyPairs, IndexedObjects, SourceType } from "./models";

export class LocalizationStringsUpdater {
    public static UpdateDestinationJson(indexedSourceStrings: IndexedObjects, indexedDestinationJson: IndexedObjects): IndexedObjects {
        let updatedVisuals: IndexedObjects = new IndexedObjects();

        for (let visualName in indexedSourceStrings) {
            let sourceStrings: DisplayNameAndKeyPairs = indexedSourceStrings[visualName],
                destinationStrings: DisplayNameAndKeyPairs = indexedDestinationJson[visualName],
                isUpdated: boolean = false;

            for (let displayNameKey in sourceStrings) {
                let displayName: string = sourceStrings[displayNameKey];

                if (!destinationStrings[displayNameKey] || destinationStrings[displayNameKey] !== displayName) {
                    console.log("updated " + visualName + " " + displayName)
                    destinationStrings[displayNameKey] = displayName;
                    isUpdated = true;
                }
            }

            if (isUpdated) {
                updatedVisuals[visualName] = destinationStrings;
            }
        }

        return updatedVisuals;
    }
}