CREATE TABLE "split_lines" (
	"amount_cents" integer NOT NULL,
	"category_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"memo" text,
	"sort_order" integer NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" uuid
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "is_split" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "split_lines" ADD CONSTRAINT "split_lines_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_lines" ADD CONSTRAINT "split_lines_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_lines" ADD CONSTRAINT "split_lines_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_lines" ADD CONSTRAINT "split_lines_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_lines" ADD CONSTRAINT "split_lines_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "split_lines_transaction_id_idx" ON "split_lines" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "split_lines_category_id_idx" ON "split_lines" USING btree ("category_id");