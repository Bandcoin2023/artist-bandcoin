import CreatorLayout from "~/components/layout/root/CreatorLayout";

const ArtistHome = () => {
    return (
        <CreatorLayout>
            <div>

                {
                    Array(10).fill(0).map((_, index) => (
                        <div key={index} className="p-4 border-b border-gray-200">
                            <h1>Artist Home</h1>
                            <h1>Artist Home</h1>
                            <h1>Artist Home</h1>
                            <h1>Artist Home</h1>
                        </div>
                    ))
                }
            </div>
        </CreatorLayout>
    )
}
export default ArtistHome;