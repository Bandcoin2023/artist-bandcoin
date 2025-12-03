import { Creator, CreatorPageAsset } from "@prisma/client";
import { useRouter } from "next/router";
import { usePopUpState } from "~/lib/state/right-pop";
import { usePageAssetRightStore } from "~/lib/state/wallete/page_asset_right";
import { useTagStore } from "~/lib/state/wallete/tag";
import AssetView from "./asset";
import { Mode, useModeStore } from "../store/mode-store";

export type CreatorPageAssetType = {
    name: string;
    id: string;
    profileUrl: string | null;
    customPageAssetCodeIssuer: string | null;
    pageAsset: {
        code: string;
        limit: number;
        issuer: string;
        creatorId: string;
        issuerPrivate: string | null;
        thumbnail: string | null;
    } | null;
}

function PageAssetComponent({ item }: { item: CreatorPageAssetType }) {
    const router = useRouter();
    const {

        setSelectedMode,

    } = useModeStore();
    return (
        <div onClick={async () => {
            setSelectedMode(Mode.USER);
            await router.push(`/artist/${item.id}`);
        }}>
            <AssetView
                code={item.name}
                thumbnail={item.profileUrl}
                isNFT={item.pageAsset?.code ? true : false}
                isPageAsset={item.pageAsset?.code ? true : item.customPageAssetCodeIssuer?.split("-")[1] ? true : false}
                creatorId={item.pageAsset?.creatorId ?? ""}
            />


        </div>
    );
}

export default PageAssetComponent;
