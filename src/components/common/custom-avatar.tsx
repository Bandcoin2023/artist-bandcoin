import clsx from "clsx";
import { Trophy, User } from "lucide-react";
import Image from "next/image";
import React from "react";
import { cn } from "~/lib/utils";

interface HexagonAvatarProps {
  url: string | null;
  size?: number;
  className?: string;
  winnerCount?: number;
}

export default function CustomAvatar({
  url,

  size = 40,
  className,
  winnerCount,
}: HexagonAvatarProps) {
  return <HexagonAvatar url={url ?? undefined} />;
  /*
  return (
    <div className=" relative">
      <div
        className={cn("h-14 w-14 overflow-hidden   rounded-full", className)}
      >
        {url ? (
          <Image
            src={url}
            alt="Avatar"
            width={size}
            height={size}
            className="h-14 w-14 rounded-full  object-cover"
          />
        ) : (
          <Image
            src={"/images/icons/avatar-icon.png"}
            alt="Avatar"
            width={size}
            height={size}
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
      </div>
      {winnerCount && winnerCount > 0 ? (
        <span className="absolute -left-3   bottom-0 h-7 w-7 rounded-full bg-[#DBDC2C]">
          <span className="absolute bottom-[.4rem]    right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full ">
            <Trophy size={14} />
          </span>
          <span className="absolute bottom-[.4rem]   right-[.1rem] text-xs font-bold">
            {winnerCount}
          </span>
        </span>
      ) : (
        <></>
      )}
    </div>
  );
  */
}

export function HexagonAvatar({
  url = "https://avatars.githubusercontent.com/u/47269261?v=4",
}: {
  url?: string;
}) {
  return (
    <div className="avatar">
      <div className="mask mask-hexagon w-24">
        <img src={url} />
      </div>
    </div>
  );
}
