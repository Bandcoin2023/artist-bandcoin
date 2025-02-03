"use client";
import { useEffect, useState } from "react";
import BuyModal from "../modal/buy-asset-modal";
import ViewAdminAsset from "../modal/view-admin-asset";
import AssetInfoModal from "../modal/asset-info-modal";
import CollectedPinInfoModal from "../modal/pin-info-modal";

const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <BuyModal />
      <ViewAdminAsset />
      <AssetInfoModal />
      <CollectedPinInfoModal />

    </>
  );
};

export default ModalProvider;
