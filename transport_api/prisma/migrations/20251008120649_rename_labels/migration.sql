/*
  Warnings:

  - You are about to drop the column `cargoDescription` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cargoHeightCm` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cargoLengthCm` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cargoWeightKg` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cargoWidthCm` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `heightCm` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `lengthCm` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `maxWeightKg` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `widthCm` on the `Vehicle` table. All the data in the column will be lost.
  - Added the required column `description` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `length` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `length` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Vehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `Vehicle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "cargoDescription",
DROP COLUMN "cargoHeightCm",
DROP COLUMN "cargoLengthCm",
DROP COLUMN "cargoWeightKg",
DROP COLUMN "cargoWidthCm",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "height" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "length" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "heightCm",
DROP COLUMN "lengthCm",
DROP COLUMN "maxWeightKg",
DROP COLUMN "widthCm",
ADD COLUMN     "height" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "length" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL;
