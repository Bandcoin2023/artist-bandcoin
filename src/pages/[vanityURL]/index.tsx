import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { AlertCircle, Home, RotateCcw } from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/shadcn/ui/card";
import { Skeleton } from "~/components/shadcn/ui/skeleton";
import Link from "next/link";
import { Button } from "~/components/shadcn/ui/button";
import SingleCreatorViewPage from "../artist/[id]";
import NotFound from "../404";

const VanityCreator = () => {
    const router = useRouter();
    const { vanityURL } = router.query as { vanityURL: string };
    console.log("Vanity URL:", vanityURL);
    const { data, isLoading, error } = api.admin.creator.creatorIDfromVanityURL.useQuery(vanityURL, {
        enabled: !!vanityURL,
    });
    console.log("Vanity Creator Data:", data);
    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen  p-6">
                <div className="mx-auto max-w-4xl">
                    <Card className=" ">
                        <CardHeader className="space-y-4">
                            <Skeleton className="h-8 w-3/4  rounded " />
                            <Skeleton className="h-4 w-1/2  rounded " />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Skeleton className="h-32 w-full rounded" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Error State - 404 Not Found
    if (error ?? !data) {
        return (
            <NotFound />
        )
    }

    // Subscription Expired State
    if (data.vanitySubscription?.endDate && new Date(data.vanitySubscription.endDate) < new Date()) {
        return (
            <div className="min-h-screen  p-6 flex flex-col justify-center">
                <div className="mx-auto max-w-2xl">
                    <Card className=" ">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-center ">Subscription Expired</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center space-y-6 py-8">
                            <AlertCircle className="h-16 w-16 text-amber-400" />
                            <div className="text-center">
                                <p className="mb-6 ">
                                    The creator{"'s"} subscription has expired. This profile is no longer available.
                                </p>
                                <Button onClick={() => (window.location.href = "/")}>
                                    <Home className="mr-2 h-4 w-4" />
                                    Back to Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Success State - Creator Profile
    return (
        <SingleCreatorViewPage creatorId={data.id} />
    )
}
export default VanityCreator;