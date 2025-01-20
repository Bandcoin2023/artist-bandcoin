import { Card, CardContent } from "~/components/shadcn/ui/card";
import { Button } from "~/components/shadcn/ui/button";
import Image from "next/image";
import { Album } from "@prisma/client";
import { api } from "~/utils/api";
import { addrShort } from "~/utils/utils";
import Link from "next/link";
import { Trash2 } from "lucide-react";

interface AlbumCardProps {
  album: Album;
}

const AlbumList = () => {
  const albums = api.fan.music.getCreatorAlbums.useQuery();

  if (albums.isLoading) return <p>Loading...</p>;
  if (albums.error) return <p>Error: {albums.error.message}</p>;
  if (albums.data.length === 0) return <p>No albums found</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {albums.data.map((album) => (
        <AlbumCard key={album.id} album={album} />
      ))}
    </div>
  );
};

export default AlbumList;

export function AlbumCard({ album }: AlbumCardProps) {
  const utils = api.useUtils();
  const deleteAlbum = api.fan.music.deleteAlbum.useMutation({
    onSuccess: () => {
      utils.fan.music.getCreatorAlbums.invalidate();
    },
  });
  const handleDelete = (id: number) => {
    deleteAlbum.mutate({ id });
  };
  return (
    <Card className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg">
      <Link href={`/fans/creator/music/album/${album.id}`}>
        <div className="relative aspect-square">
          <Image
            src={album.coverImgUrl}
            alt={`${album.name} cover`}
            fill
            className="object-cover transition-all duration-300 group-hover:scale-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-70 transition-all duration-300 group-hover:opacity-90">
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="line-clamp-1 text-lg font-semibold">
                {album.name}
              </h3>
              <p className="text-sm opacity-90">
                {album.creatorId ? addrShort(album.creatorId, 5) : "Admin"}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="bg-white p-4">
          <div className="flex flex-col ">
            <p className="text-sm font-medium text-gray-600">
              Released: {new Date(album.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Creator:{" "}
              {album.creatorId ? addrShort(album.creatorId, 5) : "Admin"}
            </p>
          </div>
        </CardContent>
      </Link>
      <Button
        variant="destructive"
        size="icon"
        disabled={deleteAlbum.isLoading}
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDelete(album.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete album</span>
      </Button>
    </Card>
  );
}
