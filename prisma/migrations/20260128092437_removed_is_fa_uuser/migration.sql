/*
  Warnings:

  - You are about to drop the column `Firstname` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `LastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isFauUser` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "Firstname",
DROP COLUMN "LastName",
DROP COLUMN "isFauUser",
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;
