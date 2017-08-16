import { DisplayNameAndKeyPairs, IndexedLocalizationStrings, IndexedObjects, SourceType } from "./models";
import { CapabilitiesParser } from "./capabilitiesParser";
import { JsonLoader } from "./jsonLoader";
import { GitRepoService } from "./gitRepoService";
import { LocalizationStringsUploader } from "./localizationStringsUploader";
import { LocalizationStringsUpdater } from "./localizationStringsUpdater";

class LocalizationStringsUtils {
    public static async Parse() {
        let sourceJsons: IndexedObjects = await JsonLoader.GetJsonsFromGithub(SourceType.Capabilities),
            sourceStrings: IndexedLocalizationStrings = CapabilitiesParser.parseCapabilities(sourceJsons),
            destinationJsons: IndexedObjects = await JsonLoader.GetJsonsFromGithub(SourceType.UtilsRepo);

        let updatedVisuals: IndexedObjects = LocalizationStringsUpdater.UpdateDestinationStrings(sourceStrings, destinationJsons);
        await LocalizationStringsUploader.UploadStringsToCommonRepo(updatedVisuals);                        
    }
}

LocalizationStringsUtils.Parse();