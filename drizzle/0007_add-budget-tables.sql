CREATE TABLE "budget_lines" (
	"amount_cents" integer NOT NULL,
	"budget_period_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"month" integer NOT NULL,
	"notes" text,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" uuid
);
--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_period_id_budget_periods_id_fk" FOREIGN KEY ("budget_period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_lines_period_id_idx" ON "budget_lines" USING btree ("budget_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_lines_period_category_idx" ON "budget_lines" USING btree ("budget_period_id","category_id") WHERE "budget_lines"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "budget_periods_user_id_idx" ON "budget_periods" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_periods_user_year_month_idx" ON "budget_periods" USING btree ("user_id","year","month") WHERE "budget_periods"."deleted_at" is null;