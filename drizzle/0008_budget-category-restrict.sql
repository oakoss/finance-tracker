ALTER TABLE "budget_lines" DROP CONSTRAINT "budget_lines_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;