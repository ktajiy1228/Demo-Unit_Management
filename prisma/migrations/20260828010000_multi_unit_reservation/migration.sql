-- CreateTable
CREATE TABLE "ReservationUnit" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "reservationId" TEXT NOT NULL,
    "demoUnitId" TEXT NOT NULL,

    CONSTRAINT "ReservationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationUnit_demoUnitId_status_idx" ON "ReservationUnit"("demoUnitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationUnit_reservationId_demoUnitId_key" ON "ReservationUnit"("reservationId", "demoUnitId");

-- AddForeignKey
ALTER TABLE "ReservationUnit" ADD CONSTRAINT "ReservationUnit_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationUnit" ADD CONSTRAINT "ReservationUnit_demoUnitId_fkey" FOREIGN KEY ("demoUnitId") REFERENCES "DemoUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
