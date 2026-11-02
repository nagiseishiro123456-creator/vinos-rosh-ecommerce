CREATE TABLE "HistoryPage" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoryPage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HistoryPage_revision_positive" CHECK ("revision" > 0)
);
CREATE TABLE "StoryImage" (
    "id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoryImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StoryImage_bounded" CHECK (octet_length("data") BETWEEN 1 AND 512000),
    CONSTRAINT "StoryImage_dimensions" CHECK ("width" BETWEEN 1 AND 1600 AND "height" BETWEEN 1 AND 1600)
);
