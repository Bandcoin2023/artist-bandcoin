import { Asset, MarketAsset } from "@prisma/client";
import { StemTypeWithoutAssetId } from "../song/song-item-types";
export type AssetType = Omit<Asset, "issuerPrivate">;

export type MarketAssetType = MarketAsset & {
    asset: AssetType & {
        Stem: StemTypeWithoutAssetId[];
    };
};

export type AssetTypeWithStems = AssetType & {
    Stem: StemTypeWithoutAssetId[];
};


export type MarketAssetTypeWithoutStem = MarketAsset & {
    asset: AssetType;
};