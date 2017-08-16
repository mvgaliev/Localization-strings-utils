
export enum SourceType {
    Capabilities,
    LocalizationStrings,
    UtilsRepo
}

export class IndexedObjects {
    [VisualName: string]: {};
}

export class DisplayNameAndKeyPairs {
    [DisplayNameKey: string]: string;
}

export class IndexedLocalizationStrings {
    [VisualName: string]: DisplayNameAndKeyPairs;
}
