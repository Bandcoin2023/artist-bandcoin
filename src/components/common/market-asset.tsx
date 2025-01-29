import { getTailwindScreenSize } from "~/utils/clientUtils";
import { useMarketRightStore } from "~/lib/state/marketplace/right";
import { usePopUpState } from "~/lib/state/right-pop";
import { MarketType } from "@prisma/client";
import { MarketAssetType, useModal } from "~/lib/state/play/use-modal-store";
import AssetView from "./asset";
import BuyModal from "../modal/buy-asset-modal";
import React, { useState } from "react";

function MarketAssetComponent({ item }: { item: MarketAssetType }) {
    const { asset } = item;
    const [isOpenBuyModal, setIsOpenBuyModal] = useState(false)
    return (
        <div className=""
            onClick={() => {
                setIsOpenBuyModal(true);
            }}>

            <AssetView code={asset.name} thumbnail={asset.thumbnail} />
            {
                isOpenBuyModal && item && (
                    <BuyModal
                        isOpen={isOpenBuyModal}
                        setIsOpen={setIsOpenBuyModal}
                        data={item}
                    />
                )
            }
        </div>
    );
}

export default MarketAssetComponent;
