-- AlterTable
ALTER TABLE "Device" ADD COLUMN "proxmoxVmId" INTEGER;
ALTER TABLE "Device" ADD COLUMN "proxmoxNodeName" TEXT;
ALTER TABLE "Device" ADD COLUMN "proxmoxType" TEXT;
