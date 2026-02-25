-- CreateEnum
CREATE TYPE "IPStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE');

-- CreateEnum
CREATE TYPE "DeviceSource" AS ENUM ('MANUAL', 'UNIFI', 'PROXMOX');

-- CreateTable
CREATE TABLE "Network" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vlanId" INTEGER,
    "cidr" TEXT NOT NULL,
    "gateway" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "IPStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "networkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macAddress" TEXT,
    "hostname" TEXT,
    "vendor" TEXT,
    "source" "DeviceSource" NOT NULL DEFAULT 'MANUAL',
    "lastSeen" TIMESTAMP(3),
    "ipAddressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IPAddress_address_networkId_key" ON "IPAddress"("address", "networkId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_macAddress_key" ON "Device"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Device_ipAddressId_key" ON "Device"("ipAddressId");

-- AddForeignKey
ALTER TABLE "IPAddress" ADD CONSTRAINT "IPAddress_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "IPAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
