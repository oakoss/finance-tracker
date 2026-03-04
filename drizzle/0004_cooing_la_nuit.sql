DROP INDEX "categories_user_name_idx";--> statement-breakpoint
DROP INDEX "payees_user_name_idx";--> statement-breakpoint
DROP INDEX "tags_user_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_idx" ON "categories" USING btree ("user_id","name") WHERE "categories"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payees_user_name_idx" ON "payees" USING btree ("user_id","name") WHERE "payees"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_idx" ON "tags" USING btree ("user_id","name") WHERE "tags"."deleted_at" is null;