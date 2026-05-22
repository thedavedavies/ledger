ALTER TABLE "invoice" ADD COLUMN "status_changed_at" timestamp with time zone;
--> statement-breakpoint
-- Backfill existing paid/void rows from updated_at so the activity feed keeps
-- the timestamp it had before the column existed.  Draft/sent rows don't need
-- a value (no status-change event is rendered for them).
UPDATE "invoice" SET "status_changed_at" = "updated_at" WHERE "status" IN ('paid', 'void');
