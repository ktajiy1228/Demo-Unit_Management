-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCompany" TEXT NOT NULL,
    "customerName" TEXT,
    "endUser" TEXT,
    "projectName" TEXT NOT NULL,
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
    CONSTRAINT "Reservation_demoUnitId_fkey" FOREIGN KEY ("demoUnitId") REFERENCES "DemoUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_pickedUpById_fkey" FOREIGN KEY ("pickedUpById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_returnLocationId_fkey" FOREIGN KEY ("returnLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("checkoutNote", "createdAt", "customerCompany", "customerName", "demoUnitId", "endDate", "id", "notes", "pickedUpAt", "pickedUpById", "pickupLocationId", "projectName", "requestedById", "returnLocationId", "returnNote", "returnedAt", "returnedById", "startDate", "status", "updatedAt") SELECT "checkoutNote", "createdAt", "customerCompany", "customerName", "demoUnitId", "endDate", "id", "notes", "pickedUpAt", "pickedUpById", "pickupLocationId", "projectName", "requestedById", "returnLocationId", "returnNote", "returnedAt", "returnedById", "startDate", "status", "updatedAt" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE INDEX "Reservation_demoUnitId_startDate_endDate_idx" ON "Reservation"("demoUnitId", "startDate", "endDate");
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
