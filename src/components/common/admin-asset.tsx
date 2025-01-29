import React from "react";

import { AdminAsset } from "@prisma/client";

import { useModal } from "~/lib/state/play/use-modal-store";
import Image from "next/image";
import { AdminAssetWithTag } from "~/types/market/admin-asset-tag-type";
import ViewAdminAsset from "../modal/view-admin-asset";

function Asset({ asset }: { asset: AdminAssetWithTag }) {
    const { logoUrl, logoBlueData, color, code } = asset;
    const [isOpen, setIsOpen] = React.useState(false);
    return (
        <div
            onClick={() => {
                setIsOpen(true);
            }}>

            <div
                className=""

            />
            <div className="flex flex-col space-y-2 ">
                <div className=" m-0   rounded-xl bg-green-200 p-0 ">
                    <div className="h-40 w-full rounded-xl">
                        <Image
                            height={1000}
                            width={1000}
                            alt={code ?? "asset"}
                            style={{
                                // backgroundColor: "red" ?? undefined,
                                height: "100%",

                                width: "100%",
                            }}
                            src={logoUrl ?? ""}
                        />
                    </div>
                </div>
                <p>{code}</p>
            </div>
            {
                isOpen && (
                    <ViewAdminAsset
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                        data={asset}
                    />)
            }
        </div>
    );
}

export default Asset;
