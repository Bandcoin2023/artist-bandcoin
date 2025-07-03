import { Song, Stem } from "@prisma/client";
import { AssetType } from "../market/market-asset-type";
export type StemTypeWithoutAssetId = Omit<Stem, "assetId">;

export type SongItemType = Song & { asset: AssetType & { Stem: StemTypeWithoutAssetId[] } };