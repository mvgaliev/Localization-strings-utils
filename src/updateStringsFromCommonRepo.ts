import { LocalizationStringsUploader } from "./localizationStringsUploader";
import { LocalizationStringsUpdater } from "./localizationStringsUpdater";
import { DisplayNameAndKeyPairs, IndexedObjects, SourceType } from "./models";
import { CapabilitiesParser } from "./capabilitiesParser";
import { JsonLoader } from "./jsonLoader";
import { GitRepoService } from "./gitRepoService";

class LocalizationStringsUtils {
    public static async Parse() {
        let sourceJsons: IndexedObjects = await JsonLoader.GetJsonsFromGithub(SourceType.UtilsRepo),
            destinationJsons: IndexedObjects = await JsonLoader.GetJsonsFromGithub(SourceType.LocalizationStrings);

        let updatedVisuals: IndexedObjects = LocalizationStringsUpdater.UpdateDestinationJson(sourceJsons, destinationJsons);
        await LocalizationStringsUploader.UploadStringsToAllRepos(updatedVisuals);                        
    }
}

LocalizationStringsUtils.Parse();