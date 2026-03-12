-- CreateTable
CREATE TABLE "Hotspot" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "dropEveryDays" INTEGER NOT NULL,
    "pinDurationDays" INTEGER NOT NULL,
    "hotspotStartDate" TIMESTAMP(3) NOT NULL,
    "hotspotEndDate" TIMESTAMP(3) NOT NULL,
    "autoCollect" BOOLEAN NOT NULL DEFAULT false,
    "multiPin" BOOLEAN NOT NULL DEFAULT false,
    "shape" TEXT NOT NULL,
    "geoJson" JSONB NOT NULL,
    "qstashScheduleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotspot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "LocationGroup" ADD COLUMN "hotspotId" TEXT;

-- CreateIndex
CREATE INDEX "Hotspot_creatorId_createdAt_idx" ON "Hotspot"("creatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Hotspot" ADD CONSTRAINT "Hotspot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationGroup" ADD CONSTRAINT "LocationGroup_hotspotId_fkey" FOREIGN KEY ("hotspotId") REFERENCES "Hotspot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
