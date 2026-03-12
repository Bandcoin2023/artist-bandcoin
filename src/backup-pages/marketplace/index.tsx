import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/shadcn/ui/card";
import { Button } from "~/components/shadcn/ui/button";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";
import { api } from "~/utils/api";
import { MoreAssetsSkeleton } from "~/components/common/grid-loading";
import MarketAssetComponent from "~/components/common/market-asset";
import Asset from "~/components/common/admin-asset";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { clientsign, WalletType } from "package/connect_wallet";
import { clientSelect } from "~/lib/stellar/fan/utils";
import { PLATFORM_ASSET } from "~/lib/stellar/constant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/shadcn/ui/dialog";
import { Badge } from "~/components/shadcn/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/shadcn/ui/avatar";
import { Clock, Coins, ShoppingCart, Star, User } from "lucide-react";
import toast from "react-hot-toast";
import useNeedSign from "~/lib/hook";
import { useSearchParams } from "next/navigation";
const TABS = ["Store Items", "Page Assets"];

const Marketplace = () => {
  const searchParams = useSearchParams();
  const initialTabs = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(initialTabs ?? "Store Items");

  useEffect(() => {
    setActiveTab(initialTabs ?? "Store Items");
  }, [initialTabs]);



  return (
    <Card className="">
      <CardHeader className="flex w-full items-center justify-center border-b-2 bg-primary p-2 md:p-4">
        <CardTitle className="flex items-center justify-center gap-2  p-0  md:w-1/2 md:gap-4">
          {TABS.map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex  text-xs shadow-sm shadow-black transition-all duration-300 ease-in-out md:text-sm ",
                activeTab === tab
                  ? "w-full border-2  px-10 font-bold text-[#dbdd2c]"
                  : " ",
              )}
            >
              {tab.toLocaleUpperCase()}
            </Button>
          ))}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100vh-20vh)] overflow-y-auto p-0 scrollbar-hide ">
        <div>
          {/* {activeTab === "Bandcoin Curated" && (
            <div>
              <CuratedItems />
            </div>
          )} */}
          {activeTab === "Store Items" && (
            <div>
              <ArtistTokens />
            </div>
          )}
          {activeTab === "Page Assets" && (
            <div>
              <MarketPageAssets />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Marketplace;

export const CuratedItems = () => {
  const curatedItems = api.wallate.asset.getBancoinAssets.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  return (
    <div className="flex h-[calc(100vh-20vh)] flex-col gap-4 rounded-md bg-white/40 p-4 shadow-md">
      {curatedItems.isLoading && (
        <MoreAssetsSkeleton className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4  xl:grid-cols-5" />
      )}
      {curatedItems.data?.pages[0]?.assets.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-bold ">No Curated Items</h1>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4  xl:grid-cols-5">
        {curatedItems.data?.pages.map((page, pageIndex) =>
          page.assets.map((item, index) => (
            <Asset key={`music-${pageIndex}-${index}`} asset={item} />
          )),
        )}
      </div>
      {curatedItems.hasNextPage && (
        <Button
          className="flex w-1/2 items-center justify-center  shadow-sm shadow-black md:w-1/4"
          onClick={() => void curatedItems.fetchNextPage()}
          disabled={curatedItems.isFetchingNextPage}
        >
          {curatedItems.isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>
  );
};

const ArtistTokens = () => {
  const artistTokens = api.marketplace.market.getFanMarketNfts.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  return (
    <div className="flex h-[calc(100vh-20vh)] flex-col gap-4 rounded-md bg-white/40 p-4 shadow-md">
      {artistTokens.isLoading && (
        <MoreAssetsSkeleton className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4  xl:grid-cols-5" />
      )}
      {artistTokens.data?.pages[0]?.nfts.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <h1 className="text-lg font-bold ">No Artist Tokens</h1>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {artistTokens.data?.pages.map((page, pageIndex) =>
          page.nfts.map((item, index) => (
            <MarketAssetComponent
              key={`artist-token-${pageIndex}-${index}`}
              item={item}
            />
          )),
        )}
      </div>
      {artistTokens.hasNextPage && (
        <Button
          className="flex w-1/2 items-center justify-center  shadow-sm shadow-black md:w-1/4"
          onClick={() => void artistTokens.fetchNextPage()}
          disabled={artistTokens.isFetchingNextPage}
        >
          {artistTokens.isFetchingNextPage ? "Loading more..." : "Load More"}
        </Button>
      )}
    </div>
  );
};

interface PageAssetWithCreator {
  id: number;
  title: string;
  description: string | null;
  amountToSell: number;
  price: number;
  priceUSD: number;
  priceXLM: number;
  isSold: boolean;
  placedAt: Date;
  placer: {
    name: string;
    id: string;
    profileUrl: string | null;
    customPageAssetCodeIssuer: string | null;
    pageAsset: {
      code: string;
      issuer: string;
      thumbnail: string | null;
    } | null;
  } | null;
}

const MarketPageAssets = () => {
  const [selectedAsset, setSelectedAsset] =
    useState<PageAssetWithCreator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyLoading, setBuyLoading] = useState<"bandcoin" | "xlm" | null>(null);
  const session = useSession();
  const { needSign } = useNeedSign();

  const {
    data: assets,
    isLoading,
    refetch,
  } = api.fan.asset.getAllAvailable.useQuery();
  console.log("session.data?.user?.walletType", session.data?.user?.walletType);
  const GetXDR = api.fan.asset.getXDR.useMutation({
    onSuccess: async (data, variables) => {
      if (data) {
        const { xdr } = data;
        try {
          setBuyLoading(variables.paymentOption);
          const clientResponse = await clientsign({
            presignedxdr: xdr,
            walletType: session.data?.user?.walletType,
            pubkey: session.data?.user?.id,
            test: clientSelect(),
          });

          if (clientResponse) {
            if (variables.paymentOption === "bandcoin") {
              buyWithBandcoin.mutate({ assetId: variables.assetId });
            } else {
              buyWithXLM.mutate({ assetId: variables.assetId });
            }

            setBuyLoading(null);
          } else {
            setBuyLoading(null);

            toast.error("Error in signing transaction");
          }
        } catch (error) {
          setBuyLoading(null);
          console.error("Error ", error);
        }
      }
    },
    onError: (error) => {
      toast.error(`Error retrieving XDR: ${error.message}`);
    },
  });

  const buyWithBandcoin = api.fan.asset.buyWithBandcoin.useMutation({
    onSuccess: () => {
      toast.success("Purchase successful with Bandcoin!");
      setIsModalOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Purchase failed: ${error.message}`);
    },
    onSettled: () => {
      setBuyLoading(null);
    },
  });

  const buyWithXLM = api.fan.asset.buyWithXLM.useMutation({
    onSuccess: () => {
      toast.success("Purchase successful with XLM!");
      setIsModalOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Purchase failed: ${error.message}`);
    },
    onSettled: () => {
      setBuyLoading(null);
    },
  });

  const handleAssetClick = (asset: PageAssetWithCreator) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleBuyWithBandcoin = () => {
    if (!selectedAsset) return;
    setBuyLoading("bandcoin");
    GetXDR.mutate({
      assetId: selectedAsset.id,
      paymentOption: "bandcoin",
      signWith: needSign(),
    });
  };

  const handleBuyWithXLM = () => {
    if (!selectedAsset) return;
    setBuyLoading("xlm");
    GetXDR.mutate({
      assetId: selectedAsset.id,
      paymentOption: "xlm",
      signWith: needSign(),
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="h-4 flex-1 rounded bg-gray-200"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 aspect-square rounded-lg bg-gray-200"></div>
              <div className="space-y-2">
                <div className="h-4 rounded bg-gray-200"></div>
                <div className="h-3 w-3/4 rounded bg-gray-200"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="p-12 text-center">
        <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-xl font-medium text-muted-foreground">
          No assets available
        </h3>
        <p className="text-sm text-muted-foreground">
          Check back later for new listings!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            className="group cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            onClick={() => handleAssetClick(asset)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={asset.placer?.profileUrl ?? ""}
                    alt={asset.placer?.name ?? "Creator"}
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {asset.placer?.name ?? "Anonymous"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {asset.amountToSell}{" "}
                  {asset.placer?.pageAsset?.code
                    ? asset.placer.pageAsset.code
                    : asset.placer?.customPageAssetCodeIssuer?.split("-")[0]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Placeholder image - replace with actual asset image if available */}
              <div className="text-center">
                <Image
                  src={
                    asset.placer?.profileUrl ??
                    "https://bandcoin.io/images/logo.png"
                  }
                  alt={asset.title}
                  height={150}
                  width={150}
                  className="aspect-square h-full w-full rounded-lg object-cover"
                />
              </div>

              <div className="space-y-2">
                <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-blue-600">
                  {asset.title}
                </h3>
                {asset.description && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {asset.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-green-600">
                      {asset.priceXLM} XLM
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asset.price} {PLATFORM_ASSET.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(asset.placedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buy Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className=" w-[90vw] max-w-xl ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Asset
            </DialogTitle>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-6">
              {/* Asset Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={selectedAsset.placer?.profileUrl ?? ""}
                      alt={selectedAsset.placer?.name ?? "Creator"}
                    />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedAsset.placer?.name ?? "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground">Creator</p>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {selectedAsset.title}
                  </h3>
                  {selectedAsset.description && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      {selectedAsset.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-medium">
                        {selectedAsset.amountToSell}{" "}
                        {selectedAsset.placer?.pageAsset?.code
                          ? selectedAsset.placer.pageAsset.code
                          : selectedAsset.placer?.customPageAssetCodeIssuer?.split(
                            "-",
                          )[0]}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Listed</p>
                      <p className="font-medium">
                        {formatDate(selectedAsset.placedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Options */}
              <div className="space-y-3">
                <h4 className="font-medium">Choose Payment Method</h4>

                {/* Buy with Bandcoin */}
                <Button
                  onClick={handleBuyWithBandcoin}
                  disabled={buyLoading !== null || !session.data?.user}
                  className="h-12 w-full"
                >
                  {buyLoading === "bandcoin" ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">
                          Buy with {PLATFORM_ASSET.code}
                        </p>
                        <p className="text-xs opacity-90">
                          {selectedAsset.price} {PLATFORM_ASSET.code}{" "}
                        </p>
                      </div>
                    </div>
                  )}
                </Button>

                {/* Buy with XLM */}
                {selectedAsset.priceXLM > 0 && (
                  <Button
                    onClick={handleBuyWithXLM}
                    disabled={buyLoading !== null || !session.data?.user}
                    variant="outline"
                    className="h-12 w-full "
                  >
                    {buyLoading === "xlm" ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        <div className="text-left">
                          <p className="font-medium">Buy with XLM</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedAsset.priceXLM} XLM
                          </p>
                        </div>
                      </div>
                    )}
                  </Button>
                )}
              </div>

              {!session.data?.user && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
                  <p className="text-sm text-yellow-700">
                    Please log in to purchase this asset
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
