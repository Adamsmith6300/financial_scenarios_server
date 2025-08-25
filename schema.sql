-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cogs_monthly_breakdown (
  breakdown_id integer NOT NULL DEFAULT nextval('cogs_monthly_breakdown_breakdown_id_seq'::regclass),
  sku_id character varying,
  month_number integer NOT NULL CHECK (month_number >= 1 AND month_number <= 60),
  cogs_amount numeric NOT NULL DEFAULT 0,
  phase character varying,
  CONSTRAINT cogs_monthly_breakdown_pkey PRIMARY KEY (breakdown_id),
  CONSTRAINT cogs_monthly_breakdown_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.cogs_skus(sku_id)
);
CREATE TABLE public.cogs_skus (
  sku_id character varying NOT NULL,
  sku_name character varying,
  total_cogs numeric NOT NULL,
  description text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cogs_skus_pkey PRIMARY KEY (sku_id)
);
CREATE TABLE public.revenue_skus (
  sku_id character varying NOT NULL,
  sku_name character varying NOT NULL,
  description text,
  upfront_deposit numeric DEFAULT 0,
  selection_period_months integer DEFAULT 3,
  active_revenue_start_month integer DEFAULT 4,
  active_revenue_end_month integer,
  monthly_revenue numeric NOT NULL,
  deposit_refund_month integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  cogs_sku_id character varying,
  CONSTRAINT revenue_skus_pkey PRIMARY KEY (sku_id),
  CONSTRAINT revenue_skus_cogs_sku_id_fkey FOREIGN KEY (cogs_sku_id) REFERENCES public.cogs_skus(sku_id)
);
