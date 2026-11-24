-- Flux « web » : sites sans RSS, lus directement depuis leur page d'actualités
ALTER TYPE "FluxType" ADD VALUE IF NOT EXISTS 'web';
