/*
  Warnings:

  - You are about to drop the column `endUser` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `projectName` on the `Reservation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCompany" TEXT NOT NULL,
    "customerName" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "shipDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "pickedUpAt" DATETIME,
    "checkoutNote" TEXT,
    "shippingTrackingNo" TEXT,
    "partsChecked" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceChecked" BOOLEAN NOT NULL DEFAULT false,
    "inverterChecked" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" DATETIME,
    "returnNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "demoUnitId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "pickedUpById" TEXT,
    "returnedById" TEXT,
    "pickupLocationId" TEXT NOT NULL,
    "returnLocationId" TEXT NOT NULL,
    "shipToAddress" TEXT,
    "shipToContact" TEXT,
    "shipToName" TEXT,
    "shipToPhone" TEXT,
    "shipToPostal" TEXT,
    "carrier" TEXT,
    CONSTRAINT "Reservation_demoUnitId_fkey" FOREIGN KEY ("demoUnitId") REFERENCES "DemoUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_pickedUpById_fkey" FOREIGN KEY ("pickedUpById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_returnLocationId_fkey" FOREIGN KEY ("returnLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("carrier", "checkoutNote", "createdAt", "customerCompany", "customerName", "demoUnitId", "endDate", "inverterChecked", "maintenanceChecked", "notes", "partsChecked", "pickedUpAt", "pickedUpById", "pickupLocationId", "requestedById", "returnLocationId", "returnNote", "returnedAt", "returnedById", "shipDate", "shipToAddress", "shipToContact", "shipToName", "shipToPhone", "shipToPostal", "shippingTrackingNo", "startDate", "status", "updatedAt", "id") SELECT "carrier", "checkoutNote", "createdAt", "customerCompany", "customerName", "demoUnitId", "endDate", "inverterChecked", "maintenanceChecked", "notes", "partsChecked", "pickedUpAt", "pickedUpById", "pickupLocationId", "requestedById", "returnLocationId", "returnNote", "returnedAt", "returnedById", "shipDate", "shipToAddress", "shipToContact", "shipToName", "shipToPhone", "shipToPostal", "shippingTrackingNo", "startDate", "status", "updatedAt", "id" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE INDEX "Reservation_demoUnitId_startDate_endDate_idx" ON "Reservation"("demoUnitId", "startDate", "endDate");
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
