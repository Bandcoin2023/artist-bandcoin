import { Search } from "lucide-react"
import { Input } from "~/components/shadcn/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/shadcn/ui/select"
import { sortOptionEnum } from "~/types/bounty/bounty-type"
import { Button } from "../shadcn/ui/button"
import { filterEnum } from "~/pages/bounty"

export default function SearchAndSort({ searchTerm, setSearchTerm, sortOption, setSortOption, filter, setFilter }: {
    searchTerm: string,
    setSearchTerm: (value: string) => void,
    sortOption: string,
    setSortOption: (value: sortOptionEnum) => void
    filter: string,
    setFilter: (value: filterEnum) => void

}) {
    return (
        <div className="mb-8 flex flex-col   gap-4 items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h1 className="mb-8 text-4xl hidden md:block font-extrabold text-center ">
                Discover Exciting Bounties
            </h1>
            <div className="flex flex-col md:flex-row  gap-4 items-center w-full justify-between">

                <div className="flex items-center flex-col md:flex-row justify-center  w-full gap-4">

                    <div className="relative w-full md:w-1/2">

                        <Input
                            type="search"
                            placeholder="Search bounties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full bg-gray-100 dark:bg-gray-700 border-none"
                        />
                        <Search className="absolute left-3 top-5 h-5 w-5 -translate-y-1/2 transform text-gray-400" />

                    </div>
                    <div className="flex justify-center items-center space-x-4">
                        <Button
                            className="shadow-sm shadow-black"
                            variant={filter === "ALL" ? "destructive" : "default"} onClick={() => setFilter(filterEnum.ALL)}>
                            ALL
                        </Button>
                        <Button
                            className="shadow-sm shadow-black"
                            variant={filter === "NOT_JOINED" ? "destructive" : "default"} onClick={() => setFilter(filterEnum.NOT_JOINED)}>
                            NOT JOINED
                        </Button>
                        <Button
                            className="shadow-sm shadow-black"
                            variant={filter === "JOINED" ? "destructive" : "default"} onClick={() => setFilter(filterEnum.JOINED)}>
                            JOINED
                        </Button>
                    </div>
                    <Select value={sortOption}

                        onValueChange={(value: sortOptionEnum) => setSortOption(value)}>
                        <SelectTrigger
                            className="w-full md:w-auto shadow-sm shadow-black">
                            <SelectValue

                                placeholder="Sort bounties" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DATE_DESC">Newest First</SelectItem>
                            <SelectItem value="DATE_ASC">Oldest First</SelectItem>
                            <SelectItem value="PRICE_DESC">Highest Prize</SelectItem>
                            <SelectItem value="PRICE_ASC">Lowest Prize</SelectItem>
                        </SelectContent>
                    </Select>
                </div>


            </div>
        </div>
    )
}

