-- CreateEnum
CREATE TYPE "RackSide" AS ENUM ('FRONT', 'BACK');

-- CreateEnum
CREATE TYPE "RackItemType" AS ENUM ('MOUNTED', 'SHELF', 'SHELF_ITEM', 'ZERO_U');

-- CreateEnum
CREATE TYPE "HalfWidthPosition" AS ENUM ('LEFT', 'RIGHT');

-- CreateTable
CREATE TABLE "Rack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RackItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startUnit" INTEGER,
    "unitHeight" INTEGER DEFAULT 1,
    "side" "RackSide" DEFAULT 'FRONT',
    "itemType" "RackItemType" NOT NULL DEFAULT 'MOUNTED',
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "description" TEXT,
    "fullDepth" BOOLEAN NOT NULL DEFAULT false,
    "halfWidth" BOOLEAN NOT NULL DEFAULT false,
    "halfWidthPosition" "HalfWidthPosition",
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiration" TIMESTAMP(3),
    "rackId" TEXT NOT NULL,
    "deviceId" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RackItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RackItem_deviceId_key" ON "RackItem"("deviceId");

-- AddForeignKey
ALTER TABLE "RackItem" ADD CONSTRAINT "RackItem_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RackItem" ADD CONSTRAINT "RackItem_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RackItem" ADD CONSTRAINT "RackItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RackItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
