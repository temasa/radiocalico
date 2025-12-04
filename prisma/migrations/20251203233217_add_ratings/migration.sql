-- CreateTable
CREATE TABLE "Rating" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "songArtist" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "ratingType" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Rating_songArtist_songTitle_idx" ON "Rating"("songArtist", "songTitle");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_songArtist_songTitle_clientId_key" ON "Rating"("songArtist", "songTitle", "clientId");
