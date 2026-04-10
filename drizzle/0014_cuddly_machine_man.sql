CREATE TYPE "public"."deletion_request_status" AS ENUM('cancelled', 'pending');--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"cancelled_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purge_after" timestamp with time zone NOT NULL,
	"status" "deletion_request_status" DEFAULT 'pending' NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "deletion_requests_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deletion_requests_purge_idx" ON "deletion_requests" USING btree ("purge_after","status");--> statement-breakpoint
CREATE INDEX "deletion_requests_user_id_idx" ON "deletion_requests" USING btree ("user_id");
