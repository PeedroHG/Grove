CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"institution" text,
	"pluggy_item_id" text,
	"pluggy_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "accounts_pluggy_account_id_unique" UNIQUE("pluggy_account_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "allocation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"income_source_id" text NOT NULL,
	"bucket_id" text NOT NULL,
	"mode" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "allocation_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"kind" text NOT NULL,
	"funding_type" text NOT NULL,
	"monthly_target_cents" integer,
	"is_reserve" boolean DEFAULT false NOT NULL,
	"physical_location" text DEFAULT 'checking' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "buckets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bucket_id" text NOT NULL,
	"account_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text NOT NULL,
	"merchant_raw" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"is_credit" boolean DEFAULT false NOT NULL,
	"confidence" real,
	"review_status" text DEFAULT 'confirmed' NOT NULL,
	"pluggy_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "expenses_pluggy_transaction_id_unique" UNIQUE("pluggy_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "income_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"income_source_id" text,
	"amount_cents" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"pluggy_transaction_id" text,
	"narrated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "income_events_pluggy_transaction_id_unique" UNIQUE("pluggy_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "income_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "income_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"account_id" text NOT NULL,
	"reliability" text NOT NULL,
	"match_hint" text,
	"expected_monthly_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "income_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"bucket_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"entry_type" text NOT NULL,
	"event_type" text NOT NULL,
	"event_id" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "merchant_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_normalized" text NOT NULL,
	"bucket_id" text NOT NULL,
	"hit_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "merchant_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expo_push_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_expo_push_token_unique" UNIQUE("expo_push_token")
);
--> statement-breakpoint
ALTER TABLE "push_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"from_bucket_id" text NOT NULL,
	"to_bucket_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_rules" ADD CONSTRAINT "allocation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_events" ADD CONSTRAINT "income_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_pluggy_tx_idx" ON "expenses" USING btree ("pluggy_transaction_id");--> statement-breakpoint
CREATE INDEX "expenses_review_status_idx" ON "expenses" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "income_events_pluggy_tx_idx" ON "income_events" USING btree ("pluggy_transaction_id");--> statement-breakpoint
CREATE INDEX "ledger_entries_bucket_occurred_idx" ON "ledger_entries" USING btree ("bucket_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_rules_owner_merchant_key" ON "merchant_rules" USING btree ("user_id","merchant_normalized");--> statement-breakpoint
CREATE POLICY "accounts_owner_only" ON "accounts" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "allocation_rules_owner_only" ON "allocation_rules" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "buckets_owner_only" ON "buckets" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "expenses_owner_only" ON "expenses" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "income_events_owner_only" ON "income_events" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "income_sources_owner_only" ON "income_sources" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "ledger_entries_owner_only" ON "ledger_entries" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "merchant_rules_owner_only" ON "merchant_rules" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "push_tokens_owner_only" ON "push_tokens" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "transfers_owner_only" ON "transfers" AS PERMISSIVE FOR ALL TO public USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());