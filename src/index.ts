import { DisplayNameAndKeyPairs, IndexedLocalizationStrings, IndexedObjects, SourceType } from "./models";
import { CapabilitiesParser } from "./capabilitiesParser";
import { JsonLoader } from "./jsonLoader";
import { GitRepoService } from "./gitRepoService";
import { LocalizationStringsUploader } from "./localizationStringsUploader";
import { LocalizationStringsUpdater } from "./localizationStringsUpdater";

class LocalizationStringsUtils {
    public static async Parse() {
        let sourceJsons: IndexedObjects = await JsonLoader.GetJsonsFromGithub(SourceType.LocalizationStrings),
            destinationJsons: IndexedObjects = await JsonLoader.GetJsonsFromGithub(SourceType.UtilsRepo);

        let updatedVisuals: IndexedObjects = LocalizationStringsUpdater.UpdateDestinationJson(sourceJsons, destinationJsons);
        await LocalizationStringsUploader.UploadStringsToCommonRepo(updatedVisuals);                        
    }
}

LocalizationStringsUtils.Parse();