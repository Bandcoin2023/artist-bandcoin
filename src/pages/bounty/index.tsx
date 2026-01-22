"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import BountyList from "~/components/bounty/bounty-list"
import BountySkeleton from "~/components/bounty/bounty-skeleton"
import SearchAndSort from "~/components/bounty/search-and-sort"
import { Button } from "~/components/shadcn/ui/button"
import { checkStellarAccountActivity } from "~/lib/helper/helper_client"
import { sortOptionEnum } from "~/types/bounty/bounty-type"
import { api } from "~/utils/api"

export enum filterEnum {
    ALL = "ALL",
    NOT_JOINED = "NOT_JOINED",
    JOINED = "JOINED",
}

const Bounty = () => {
    const session = useSession()
    const [searchTerm, setSearchTerm] = useState("")
    const [sortOption, setSortOption] = useState<sortOptionEnum>(sortOptionEnum.DATE_DESC);
    const [filter, setFilter] = useState<filterEnum>(filterEnum.ALL)
    const [typeFilter, setTypeFilter] = useState<BountyTypeFilter>(BountyTypeFilter.ALL)
    const [scrolled, setScrolled] = useState(false)
    const [isActive, setIsActive] = useState<boolean>(false);
    const [isActiveStatusLoading, setIsActiveStatusLoading] = useState<boolean>(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500)

    const getAllBounty = api.bounty.Bounty.getAllBounties.useInfiniteQuery(
        {
            limit: 10,
            search: debouncedSearchTerm,
            sortBy: sortOption,
            filter: filter,
        },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
    )
    useEffect(() => {
        const checkAccountActivity = async () => {
            if (session.data?.user.id) {
                setIsActiveStatusLoading(true);
                const active = await checkStellarAccountActivity(session.data.user.id);
                setIsActive(active);
                setIsActiveStatusLoading(false);
            }
        }
        checkAccountActivity();
    }, [session.data?.user.id]);

    return (
        <div className="
           relative  flex h-[calc(100vh-10.8vh)] flex-col gap-4 overflow-y-auto scrollbar-hide w-full">
            <div className="sticky top-0 z-10">
                <SearchAndSort
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    sortOption={sortOption}
                    setSortOption={setSortOption}
                    filter={filter}
                    setFilter={setFilter}
                />
            </div>

            <div className="my-4 flex h-[calc(100vh-20vh)]  flex-col gap-4 ">

                <div className="">
                    {
                        getAllBounty.isLoading &&
                        <div className=" grid gap-6 sm:grid-cols-2 lg:grid-cols-3 " > {Array.from({ length: 5 }, (_, index: number) => (< BountySkeleton key={index} />))} </ div >
                    }
                    {getAllBounty.data?.pages.map((page) => (
                        <BountyList
                            isActive={isActive}
                            isActiveStatusLoading={isActiveStatusLoading}
                            key={page.nextCursor} bounties={page.bounties} />
                    ))}
                </div>
                {getAllBounty.hasNextPage && (
                    <Button
                        className="flex w-1/2 items-center justify-center  shadow-sm shadow-black md:w-1/4"
                        onClick={() => void getAllBounty.fetchNextPage()}
                        disabled={getAllBounty.isFetchingNextPage}
                    >
                        {getAllBounty.isFetchingNextPage ? "Loading more..." : "Load More"}
                    </Button>
                )}
            </div>
        </div>
    )
}

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

export default Bounty

