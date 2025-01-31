"use client";
import { useEffect, useState } from "react";
import BuyModal from "../modal/buy-asset-modal";
import ViewAdminAsset from "../modal/view-admin-asset";

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

    </>
  );
};

export default ModalProvider;
