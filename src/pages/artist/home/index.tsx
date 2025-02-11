import CreatorLayout from "~/components/layout/root/CreatorLayout";

const ArtistHome: React.FC = () => {
    return (
        <CreatorLayout>
            {
                Array.from({ length: 100 }).map((_, index) => (
                    <div key={index} className="bg-white p-4 shadow-md rounded-md">
                        <h1 className="text-lg font-bold">Artist Home</h1>
                    </div>
                ))

            }

        </CreatorLayout>
    );
}
export default ArtistHome;

