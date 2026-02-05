/*
  Warnings:

  - Added the required column `resolvedUri` to the `Definiendum` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Definiendum" ADD COLUMN     "resolvedUri" TEXT NOT NULL;
