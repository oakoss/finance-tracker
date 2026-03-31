ALTER TYPE "public"."import_row_status" ADD VALUE 'committed';--> statement-breakpoint
ALTER TYPE "public"."import_status" ADD VALUE 'committed' BEFORE 'failed';