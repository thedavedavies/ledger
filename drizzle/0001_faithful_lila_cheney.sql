ALTER TABLE "company_profile" ADD COLUMN "invoice_prefix" text DEFAULT 'INV' NOT NULL;--> statement-breakpoint
ALTER TABLE "company_profile" ADD COLUMN "logo_path" text;