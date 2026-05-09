DROP INDEX "payee_aliases_payee_alias_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "payee_aliases_payee_alias_idx" ON "payee_aliases" USING btree ("payee_id","alias") WHERE "payee_aliases"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "payee_aliases" ADD CONSTRAINT "payee_aliases_alias_trimmed_check" CHECK ("payee_aliases"."alias" = btrim("payee_aliases"."alias"));