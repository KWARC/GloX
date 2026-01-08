/*
  Warnings:

  - Added the required column `fileName` to the `Definiendum` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Definiendum" ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';
