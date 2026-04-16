-- Destructive migration. The old match_type/match_value/category_id/payee_id
-- columns have no automatic mapping to the new jsonb match + actions, and
-- both new columns are NOT NULL without defaults. Existing rows must be
-- exported beforehand if preservation matters; this DELETE makes the ALTERs
-- below runnable on any non-empty merchant_rules.
DELETE FROM "merchant_rules";--> statement-breakpoint
CREATE TYPE "public"."rule_stage" AS ENUM('pre', 'default', 'post');--> statement-breakpoint
ALTER TABLE "merchant_rules" DROP CONSTRAINT "merchant_rules_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "merchant_rules" DROP CONSTRAINT "merchant_rules_payee_id_payees_id_fk";
--> statement-breakpoint
DROP INDEX "merchant_rules_user_id_idx";--> statement-breakpoint
DROP INDEX "merchant_rules_payee_id_idx";--> statement-breakpoint
DROP INDEX "merchant_rules_category_id_idx";--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD COLUMN "actions" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD COLUMN "match" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD COLUMN "stage" "rule_stage" DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE INDEX "merchant_rules_user_stage_priority_idx" ON "merchant_rules" USING btree ("user_id","stage","priority");--> statement-breakpoint
CREATE INDEX "merchant_rules_user_active_idx" ON "merchant_rules" USING btree ("user_id") WHERE "merchant_rules"."is_active" = true;--> statement-breakpoint
ALTER TABLE "merchant_rules" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "merchant_rules" DROP COLUMN "match_type";--> statement-breakpoint
ALTER TABLE "merchant_rules" DROP COLUMN "match_value";--> statement-breakpoint
ALTER TABLE "merchant_rules" DROP COLUMN "payee_id";--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_actions_nonempty_check" CHECK (jsonb_typeof("merchant_rules"."actions") = 'array' AND jsonb_array_length("merchant_rules"."actions") > 0);--> statement-breakpoint
DROP TYPE "public"."merchant_match_type";