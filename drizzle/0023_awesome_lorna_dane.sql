CREATE TYPE "public"."transfer_confidence" AS ENUM('manual', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "transfer_dismissals" (
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"txn_a_id" uuid NOT NULL,
	"txn_b_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" uuid,
	CONSTRAINT "transfer_dismissals_ordered_pair_check" CHECK ("transfer_dismissals"."txn_a_id" < "transfer_dismissals"."txn_b_id")
);
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_transfer_id_transfers_id_fk";
--> statement-breakpoint
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_from_account_id_ledger_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_to_account_id_ledger_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "transactions_transfer_id_idx";--> statement-breakpoint
DROP INDEX "transfers_from_account_id_idx";--> statement-breakpoint
DROP INDEX "transfers_to_account_id_idx";--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "confidence" "transfer_confidence" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "detected_by_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "from_transaction_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "to_transaction_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer_dismissals" ADD CONSTRAINT "transfer_dismissals_txn_a_id_transactions_id_fk" FOREIGN KEY ("txn_a_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_dismissals" ADD CONSTRAINT "transfer_dismissals_txn_b_id_transactions_id_fk" FOREIGN KEY ("txn_b_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_dismissals" ADD CONSTRAINT "transfer_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_dismissals" ADD CONSTRAINT "transfer_dismissals_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_dismissals" ADD CONSTRAINT "transfer_dismissals_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_dismissals" ADD CONSTRAINT "transfer_dismissals_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transfer_dismissals_user_id_idx" ON "transfer_dismissals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transfer_dismissals_user_pair_unique_idx" ON "transfer_dismissals" USING btree ("user_id","txn_a_id","txn_b_id") WHERE "transfer_dismissals"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_detected_by_rule_id_merchant_rules_id_fk" FOREIGN KEY ("detected_by_rule_id") REFERENCES "public"."merchant_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_transaction_id_transactions_id_fk" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_transaction_id_transactions_id_fk" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transfers_from_transaction_id_idx" ON "transfers" USING btree ("from_transaction_id") WHERE "transfers"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "transfers_to_transaction_id_idx" ON "transfers" USING btree ("to_transaction_id") WHERE "transfers"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "transfers_pair_unique_idx" ON "transfers" USING btree (LEAST("from_transaction_id", "to_transaction_id"),GREATEST("from_transaction_id", "to_transaction_id")) WHERE "transfers"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "transfer_id";--> statement-breakpoint
ALTER TABLE "transfers" DROP COLUMN "amount_cents";--> statement-breakpoint
ALTER TABLE "transfers" DROP COLUMN "from_account_id";--> statement-breakpoint
ALTER TABLE "transfers" DROP COLUMN "memo";--> statement-breakpoint
ALTER TABLE "transfers" DROP COLUMN "to_account_id";--> statement-breakpoint
ALTER TABLE "transfers" DROP COLUMN "transfer_at";--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_pair_distinct_check" CHECK ("transfers"."from_transaction_id" <> "transfers"."to_transaction_id");