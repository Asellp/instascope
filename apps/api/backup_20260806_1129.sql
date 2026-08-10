--
-- PostgreSQL database dump
--

\restrict HaczxBPsIjuM2L4KSEJNn1gNUZ4H5BvMFS1xiHSEX5sp5Uku8ws9kM2xgHjIElo

-- Dumped from database version 18.4 (Postgres.app)
-- Dumped by pg_dump version 18.4 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: SourceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SourceType" AS ENUM (
    'API',
    'SCRAPE',
    'MOCK',
    'AI'
);


ALTER TYPE public."SourceType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: account_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_metrics (
    id text NOT NULL,
    account_id text NOT NULL,
    captured_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    followers integer DEFAULT 0 NOT NULL,
    following integer DEFAULT 0 NOT NULL,
    media_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.account_metrics OWNER TO postgres;

--
-- Name: analysis_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analysis_results (
    id text NOT NULL,
    subject_type text NOT NULL,
    subject_id text NOT NULL,
    kind text NOT NULL,
    payload jsonb NOT NULL,
    model_version text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.analysis_results OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    resource text NOT NULL,
    ip text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: collection_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collection_jobs (
    id text NOT NULL,
    account_id text NOT NULL,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finished_at timestamp(3) without time zone,
    status text NOT NULL,
    items_collected integer DEFAULT 0 NOT NULL,
    error text
);


ALTER TABLE public.collection_jobs OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id text NOT NULL,
    post_id text NOT NULL,
    author_hash text NOT NULL,
    text text NOT NULL,
    commented_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: post_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_metrics (
    id text NOT NULL,
    post_id text NOT NULL,
    captured_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    reach integer DEFAULT 0 NOT NULL,
    engagement_rate double precision DEFAULT 0.0 NOT NULL
);


ALTER TABLE public.post_metrics OWNER TO postgres;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id text NOT NULL,
    account_id text NOT NULL,
    ig_media_id text NOT NULL,
    type text NOT NULL,
    caption text,
    posted_at timestamp(3) without time zone,
    permalink text
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token text NOT NULL,
    family text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: tracked_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tracked_accounts (
    id text NOT NULL,
    ig_username text NOT NULL,
    source_type public."SourceType" NOT NULL,
    access_token_enc text,
    schedule_cron text,
    status text DEFAULT 'active'::text NOT NULL,
    ig_account_id text
);


ALTER TABLE public.tracked_accounts OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
0486f549-aa3c-4a79-bb50-d06eaf4735c3	7a5f784a42277b279a26584e88f3fb607f93fa4aa88add7626a545d9f5e84c54	2026-08-02 17:21:05.981756+03	20260721141024_init		\N	2026-08-02 17:21:05.981756+03	0
adfa9c64-4aec-4b5b-ae4d-15be433231a6	8b060809e53cddca22412dbb051e02ef49ae3304bb51590733563c871e4ab87f	2026-08-02 23:56:34.929737+03	20260802120000_sync_existing_state		\N	2026-08-02 23:56:34.929737+03	0
81adf610-dae0-4c96-9634-f43a8f0a2057	70b93deae4ec019387290d46495a77a61665dd3c851eec59563799dda0fd410d	2026-08-03 00:02:57.171399+03	20260802205804_add_enums_indexes	\N	\N	2026-08-03 00:02:57.157644+03	1
\.


--
-- Data for Name: account_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_metrics (id, account_id, captured_at, followers, following, media_count) FROM stdin;
\.


--
-- Data for Name: analysis_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analysis_results (id, subject_type, subject_id, kind, payload, model_version, created_at) FROM stdin;
cb2e0124-0877-4588-b8b0-bd64ffb4ed03	account	b7351c3c-c464-4ed8-a6e8-594619112a26	topics	{"status": "completed", "topics": [{"keywords": [{"word": "iyi", "score": 0.1576}, {"word": "ankara", "score": 0.0997}, {"word": "kötü", "score": 0.0997}, {"word": "yermiş", "score": 0.0997}, {"word": "test deneme", "score": 0.0997}, {"word": "test", "score": 0.0997}, {"word": "teknopark ankara", "score": 0.0997}, {"word": "teknopark", "score": 0.0997}, {"word": "rezalet aşırı", "score": 0.0997}, {"word": "rezalet", "score": 0.0997}], "topic_id": 0, "topic_name": "Iyi / ankara / kötü", "document_count": 9}, {"keywords": [{"word": "zaten kendini", "score": 0.281}, {"word": "zaten", "score": 0.281}, {"word": "sanıyo galiba", "score": 0.281}, {"word": "sanıyo", "score": 0.281}, {"word": "kendini fotoğrafcı", "score": 0.281}, {"word": "kendini", "score": 0.281}, {"word": "galiba", "score": 0.281}, {"word": "fotoğrafçıyım zaten", "score": 0.281}, {"word": "fotoğrafçıyım", "score": 0.281}, {"word": "fotoğrafcı sanıyo", "score": 0.281}], "topic_id": 1, "topic_name": "Zaten kendini / zaten / sanıyo galiba", "document_count": 7}], "total_topics": 2}	emrecan/bert-base-turkish-cased-mean-nli-stsb-tr	2026-08-06 10:17:29.022
ccafed94-85a5-4102-aacc-369bed8656fb	account	b7351c3c-c464-4ed8-a6e8-594619112a26	besttime	{"heatmap": [{"hour": 0, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 7, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 1, "sampleSize": 0, "avgEngagement": null}, {"hour": 0, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 7, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 2, "sampleSize": 0, "avgEngagement": null}, {"hour": 0, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 3, "sampleSize": 2, "avgEngagement": 5.5}, {"hour": 7, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 3, "sampleSize": 0, "avgEngagement": null}, {"hour": 0, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 4, "sampleSize": 1, "avgEngagement": 10.0}, {"hour": 7, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 4, "sampleSize": 0, "avgEngagement": null}, {"hour": 0, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 7, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 5, "sampleSize": 0, "avgEngagement": null}, {"hour": 0, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 7, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 6, "sampleSize": 0, "avgEngagement": null}, {"hour": 0, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 1, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 2, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 3, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 4, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 5, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 6, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 7, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 8, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 9, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 10, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 11, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 12, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 13, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 14, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 15, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 16, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 17, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 18, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 19, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 20, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 21, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 22, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}, {"hour": 23, "dayOfWeek": 7, "sampleSize": 0, "avgEngagement": null}]}	besttime-heuristic-v1	2026-08-06 10:17:29.022
424c91cf-0e65-4771-b0e6-4e6342097e6e	comment	7316559e-62f4-4c45-a160-1c9ed285f2db	sentiment	{"label": "positive", "score": 0.37173593044281006}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
fbddb3de-9bf5-46b3-972c-136d20710ca2	comment	640b922c-a621-4957-a05c-c484ae0e1435	sentiment	{"label": "neutral", "score": 0.8164178729057312}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
df365935-1add-4eda-a160-88e9cd402754	comment	315e1ea8-cb86-4505-92a4-7716cd912446	sentiment	{"label": "negative", "score": 0.9386350512504578}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
57530dd2-5cdb-4f7f-aa14-ef642c8849d8	comment	ad572890-30a5-4a83-b586-576db59e5c64	sentiment	{"label": "positive", "score": 0.907868504524231}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
d388de86-2886-4042-93a6-438c7a469cc6	comment	17fa37ff-d2e1-465f-a849-b3375191467a	sentiment	{"label": "neutral", "score": 0.48961493372917175}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
410faa3b-d872-49c2-9f43-23d9b2a25067	comment	ec0f1d4c-5790-4f41-b457-6a07a7754ef3	sentiment	{"label": "positive", "score": 0.741624116897583}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
62b9c303-b311-4455-8bcb-e742a01e4480	comment	ba2b22bf-e06a-4f80-8988-7edbd6f7a4f2	sentiment	{"label": "neutral", "score": 0.7857522964477539}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
6ba54b05-37b8-4531-941b-fe2c5f110dbc	comment	5589ac53-ab45-48f7-93db-402cc2143f91	sentiment	{"label": "neutral", "score": 0.7915754318237305}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
68ad71fc-4e1b-4b67-b1c1-0fc03bfef0c6	comment	03443f28-50cc-4be5-8733-0fea2075ef1c	sentiment	{"label": "neutral", "score": 0.48816296458244324}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
bdac6c8d-d714-4a0f-84bd-c483714862fa	comment	6946a92a-a9ba-4efe-ac71-9b0c24a532c5	sentiment	{"label": "negative", "score": 0.4823979437351227}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
1c257197-dbf0-4e65-a5d9-20f0bac24fb2	comment	e01c5a4b-0d4d-4e32-9559-13ab15fc96aa	sentiment	{"label": "negative", "score": 0.5796428918838501}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
dda77d20-08dd-463d-b9f6-0ced71fe93c7	comment	10ac87e6-9248-4f46-8795-a40887e0da0f	sentiment	{"label": "positive", "score": 0.6789076328277588}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
32383dd2-c1e3-475e-bfad-31978dac3de4	comment	4c115f02-10c0-4cbf-b1de-2d89475a469b	sentiment	{"label": "neutral", "score": 0.8164178729057312}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
4c1006fa-06c4-4d67-9067-c7e44d9d0a4d	comment	456fbfc6-9dd7-4888-9b56-5616fbc5ddd1	sentiment	{"label": "neutral", "score": 0.8164178729057312}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
1f574dd7-0e06-4148-9752-72ae8fa615b6	comment	f5dd6ef8-79a4-4e68-bedd-4a278e2bd7af	sentiment	{"label": "neutral", "score": 0.5934352278709412}	cardiffnlp/twitter-xlm-roberta-base-sentiment	2026-08-06 10:17:29.162
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, resource, ip, created_at) FROM stdin;
\.


--
-- Data for Name: collection_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.collection_jobs (id, account_id, started_at, finished_at, status, items_collected, error) FROM stdin;
dd9320a4-5e2a-47d3-bf7c-a909ccb3f2a8	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-03 07:51:40.85	2026-08-03 07:51:43.085	COMPLETED	2	\N
1e0c23d4-ca05-452f-90cd-a70172b20967	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-03 12:00:00.12	2026-08-03 12:00:02.644	COMPLETED	2	\N
be81d617-d63c-4dd9-9dc8-474cefd9eb85	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-03 18:04:39.83	2026-08-03 18:04:43.985	COMPLETED	2	\N
6df3effc-5152-49f8-803b-e82033f90457	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-03 18:22:16.36	2026-08-03 18:33:57.78	FAILED	0	Meta API Hatası (Gönderiler): read ECONNRESET
5ff039b5-6076-436b-8f20-88f51ba95c37	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 00:03:10.438	2026-08-04 00:03:14.184	COMPLETED	2	\N
4ee716d4-11c9-42eb-9e7d-b2cef8964a81	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 06:40:12.11	2026-08-04 06:40:14.942	COMPLETED	2	\N
2713b8c3-44c7-4256-b495-8930364b64fc	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 11:29:56.569	2026-08-04 11:29:59.195	COMPLETED	2	\N
7cd7e8c4-dc27-4a22-b32c-dae1402b74fe	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 11:41:33.333	2026-08-04 11:41:35.115	COMPLETED	2	\N
2cc2e129-bbc3-40c5-ace9-73d1a28c8e67	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:00:00.01	2026-08-04 12:00:01.889	COMPLETED	2	\N
db40df83-85e8-4c92-99b3-4671d0b6a5dd	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:01:20.663	2026-08-04 12:01:22.453	COMPLETED	2	\N
65f53c2f-402a-4968-ab3f-e94808a42333	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:05:50.171	2026-08-04 12:05:52.019	COMPLETED	2	\N
37ccebbd-a408-49dc-a46a-36390add1c3c	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:14:19.887	2026-08-04 12:14:21.735	COMPLETED	2	\N
0a617cc1-6f39-456e-b31e-a56befe1d8fa	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:25:00.643	2026-08-04 12:25:02.598	COMPLETED	2	\N
66d86e95-023c-43d9-820a-d36275128d92	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:26:49.87	2026-08-04 12:26:51.745	COMPLETED	2	\N
43c8bad2-3f84-4a3c-967d-21b1d00a047f	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:30:04.245	2026-08-04 12:30:06.418	COMPLETED	2	\N
a8932294-35c7-417c-8482-763f923e7b04	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:31:30.542	2026-08-04 12:31:32.332	COMPLETED	2	\N
70212ac0-10f3-4d79-80d2-f34b16e0af44	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:33:31.487	2026-08-04 12:33:33.37	COMPLETED	2	\N
004c2197-7975-4f1e-90f1-ad8a6dc86482	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:36:40.828	2026-08-04 12:36:42.502	COMPLETED	2	\N
c4cee80f-1fea-4e69-ad14-3557e215a554	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:40:07.759	2026-08-04 12:40:10.165	COMPLETED	2	\N
ad0f71be-8e68-4dcc-8d00-ae32744e6df1	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 12:41:52.724	2026-08-04 12:41:55.048	COMPLETED	2	\N
cf023c93-bdf3-475e-a455-5c9c90b4c2c0	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-04 18:07:16.208	2026-08-04 18:25:07.302	FAILED	0	Meta API Hatası (Gönderiler): getaddrinfo ENOTFOUND graph.facebook.com
43b797e8-f114-4ba7-9835-5abb4c50d0cd	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 07:25:10.413	2026-08-05 07:25:12.797	COMPLETED	2	\N
d0a34095-abf5-4a4b-9b38-1d251681ec1a	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 08:19:54.306	2026-08-05 08:19:57.409	COMPLETED	2	\N
2c81b7dc-cbe5-4681-a396-ed66d3124d86	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 08:23:17.277	2026-08-05 08:23:18.933	COMPLETED	2	\N
16e919d6-b229-411d-90f0-3eece9b662d3	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 08:27:23.025	2026-08-05 08:27:26.927	COMPLETED	2	\N
881c7263-42cf-40e5-aa72-68980ae319c9	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 08:32:36.488	2026-08-05 08:32:38.218	COMPLETED	2	\N
9061a596-4832-4ea4-a813-2e6906239ccf	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 08:34:01.328	2026-08-05 08:34:03.131	COMPLETED	2	\N
02ec10b2-5f07-4e75-961c-ee87fed8b28d	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 08:46:48.737	2026-08-05 08:46:50.93	COMPLETED	2	\N
f4690d02-831d-4185-a943-276d8248cfbe	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 11:35:49.229	2026-08-05 11:35:51.98	COMPLETED	2	\N
e34ae331-d770-4d45-be4c-98b28bc95b80	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 11:40:58.868	2026-08-05 11:41:02.532	COMPLETED	2	\N
6501bd7e-2145-46c9-875c-aadba8a1e189	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 11:55:09.729	2026-08-05 11:55:13.249	COMPLETED	2	\N
c095938d-5c73-40ff-a2f6-82da471c7aed	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 12:00:00.083	2026-08-05 12:00:03.174	COMPLETED	2	\N
daf48ceb-8796-4e44-8e5c-7c57983c7e85	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 12:03:49.127	2026-08-05 12:03:52.116	COMPLETED	2	\N
d3bdda56-ddb4-423c-a58e-fa4f13dac8fd	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 12:06:15.223	2026-08-05 12:06:18.733	COMPLETED	2	\N
7399cea8-336a-4018-aae7-56827328f9a9	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 12:46:46.991	2026-08-05 12:46:53.684	COMPLETED	2	\N
161466dd-5901-4d28-86f8-a5e2e1925906	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-05 18:13:15.574	2026-08-05 18:13:15.581	FAILED	0	Meta API Hatası (Gönderiler): getaddrinfo ENOTFOUND graph.facebook.com
5f74117c-3392-43be-a169-027647da4036	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 00:17:09.608	2026-08-06 03:04:42.894	FAILED	0	Meta API Hatası (Gönderiler): read ECONNRESET
00370b17-ffc5-48b8-ab0e-2740cb8874cb	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 03:04:42.922	2026-08-06 05:17:59.765	COMPLETED	2	\N
9c7c6740-f624-4e7f-9803-2c29400bd773	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 05:18:01.139	2026-08-06 05:18:05.352	COMPLETED	2	\N
5fa925d7-935d-48cc-aaea-2ac7fe0b3f1b	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 05:53:54.922	2026-08-06 05:54:01.5	COMPLETED	2	\N
6f4377ee-4032-462b-b5ee-4c2ee82cac6d	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 06:31:42.916	2026-08-06 06:31:47.218	COMPLETED	2	\N
57a4ea1a-47ea-40cc-8452-cd6ae8490b77	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 06:33:10.365	2026-08-06 06:33:16.865	COMPLETED	2	\N
44647905-f2ce-4758-a70b-7a8edb58979f	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 06:52:12.921	2026-08-06 06:52:21.446	COMPLETED	3	\N
eba32982-9ac3-4ea1-96f6-c3945efc902e	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 07:11:02.924	2026-08-06 07:11:08.121	COMPLETED	3	\N
9db041b4-8df7-4d56-b3db-eca3133466fa	b7351c3c-c464-4ed8-a6e8-594619112a26	2026-08-06 07:17:24.013	2026-08-06 07:17:28.808	COMPLETED	3	\N
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, post_id, author_hash, text, commented_at) FROM stdin;
7316559e-62f4-4c45-a160-1c9ed285f2db	d66e9d90-3b8d-4246-9808-d27180afc6a9	instascope4	nayss	2026-07-29 06:47:21
640b922c-a621-4957-a05c-c484ae0e1435	90442750-af4f-4129-afe1-cb7ac6ff7eeb	instascope42026	😮	2026-08-05 08:45:41
315e1ea8-cb86-4505-92a4-7716cd912446	90442750-af4f-4129-afe1-cb7ac6ff7eeb	instascope42026	açı kötü olmuş	2026-08-05 08:43:59
ad572890-30a5-4a83-b586-576db59e5c64	90442750-af4f-4129-afe1-cb7ac6ff7eeb	bostost_	güzel bi yermiş	2026-08-05 08:43:42
17fa37ff-d2e1-465f-a849-b3375191467a	90442750-af4f-4129-afe1-cb7ac6ff7eeb	bostost_	test deneme	2026-08-05 08:43:12
ec0f1d4c-5790-4f41-b457-6a07a7754ef3	d66e9d90-3b8d-4246-9808-d27180afc6a9	instascope42026	çok iyiii	2026-08-05 08:44:40
ba2b22bf-e06a-4f80-8988-7edbd6f7a4f2	d66e9d90-3b8d-4246-9808-d27180afc6a9	instascope42026	❤️❤️	2026-08-05 08:44:16
5589ac53-ab45-48f7-93db-402cc2143f91	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	💩	2026-08-06 06:49:59
03443f28-50cc-4be5-8733-0fea2075ef1c	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope4	fotoğrafçıyım zaten	2026-08-06 06:49:19
6946a92a-a9ba-4efe-ac71-9b0c24a532c5	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	kendini fotoğrafcı sanıyo galiba	2026-08-06 06:48:41
e01c5a4b-0d4d-4e32-9559-13ab15fc96aa	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	rezalettt	2026-08-06 06:48:10
10ac87e6-9248-4f46-8795-a40887e0da0f	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	aşırı iyiii	2026-08-06 06:47:39
4c115f02-10c0-4cbf-b1de-2d89475a469b	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	❤️	2026-08-06 06:47:30
456fbfc6-9dd7-4888-9b56-5616fbc5ddd1	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	😮😮😮😮	2026-08-06 06:47:25
f5dd6ef8-79a4-4e68-bedd-4a278e2bd7af	4279ccfc-9ab8-4e17-bac5-2d32477367f4	instascope42026	neresi burasııı	2026-08-06 06:47:14
\.


--
-- Data for Name: post_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_metrics (id, post_id, captured_at, likes, comments_count, views, reach, engagement_rate) FROM stdin;
f762fa12-538c-4f78-a4ca-be4e827bb5ca	4279ccfc-9ab8-4e17-bac5-2d32477367f4	2026-08-06 06:52:16.637	2	8	0	0	10
cb36ad0a-560d-425a-ab6f-eacaf85d13bc	90442750-af4f-4129-afe1-cb7ac6ff7eeb	2026-08-03 07:51:41.66	2	4	0	3	6
ad66c496-fe51-499c-bf4b-5a1f07e8ac68	d66e9d90-3b8d-4246-9808-d27180afc6a9	2026-08-03 07:51:42.263	2	3	0	2	5
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, account_id, ig_media_id, type, caption, posted_at, permalink) FROM stdin;
4279ccfc-9ab8-4e17-bac5-2d32477367f4	b7351c3c-c464-4ed8-a6e8-594619112a26	18117671299714276	IMAGE	#teknopark #ankara	2026-08-06 06:45:34	https://www.instagram.com/p/DbsGe62DUw0/
90442750-af4f-4129-afe1-cb7ac6ff7eeb	b7351c3c-c464-4ed8-a6e8-594619112a26	17929757112391888	IMAGE		2026-07-29 06:48:55	https://www.instagram.com/p/DbXggdvDcCd/
d66e9d90-3b8d-4246-9808-d27180afc6a9	b7351c3c-c464-4ed8-a6e8-594619112a26	17909514906443594	IMAGE		2026-07-29 06:45:17	https://www.instagram.com/p/DbXgF1mjTZQ/
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, token, family, user_id, expires_at, used, created_at) FROM stdin;
e0146f7a-be4a-4303-8383-5260fdb54daf	d7e7a0a7918ce940a3910df20448c8ae270a74088d1aef1424869ab2eb0fa3a5	fe0edb10a75d20d6b96b950178be4d9c	57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	2026-08-10 06:39:57.301	f	2026-08-03 06:39:57.301
8d3c06da-8333-474d-937e-cd1a0de7349d	c4a90f843753f1a82e3bcf2f36b9da2336b9bafc89913e627d0adaccb9dafc10	3946fde0860e4a94a21960bfab2b2cf5	57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	2026-08-10 07:47:09.896	f	2026-08-03 07:47:09.897
035ba8bd-8976-4e65-9672-7a76d0876388	210be5bd31f87ed7033d33d66ec7c9d0e4e8a1ce0ccb9bc421c8c0fc80f1b881	21b6b39d725826bac23e665190b82fff	57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	2026-08-10 07:57:08.391	f	2026-08-03 07:57:08.391
1972c36f-2f0d-4cd9-b92a-ab8f025ad4d9	2d2c539eb6bb94ba0b5f10bd97f00a40a60b25890cc924e97951bc303cd241df	eefa4ff5e057c11c0716d5e42dc3eecd	2a4ad890-54a6-4c86-bb29-c39407a1a8d7	2026-08-10 08:01:12.692	f	2026-08-03 08:01:12.692
6c8046f6-e255-4a3b-bda2-d1aebc4977fb	f902a7f9057f930f79c2d6ea6822c108aec4d4277142ae551d89b27d5dd49422	ca9c0db8820248153fc8a0bfb6b982e3	57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	2026-08-10 08:10:43.803	f	2026-08-03 08:10:43.804
4921221d-03a7-4ecd-9b6c-0703f5fc263b	4224c26bf3048a11e5495abf6e8219afb0bf036c46789210be79c49ebde87a26	2a1fddb408deec280d680e8c2b91ff94	57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	2026-08-10 15:30:11.467	f	2026-08-03 15:30:11.468
526c2239-242c-4929-981a-24883547527b	17b1a5739b713925128e63b13ffb2158dc61e0ce99657a9ffff137eb036cb133	a885fc6789705596c979586544c75c55	57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	2026-08-11 07:43:36.798	f	2026-08-04 07:43:36.798
\.


--
-- Data for Name: tracked_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tracked_accounts (id, ig_username, source_type, access_token_enc, schedule_cron, status, ig_account_id) FROM stdin;
22b9c69d-35a1-4d2d-b2fc-b4107693678e	atolye.studio	API	\N	0 0 * * *	collecting	\N
1c361968-b1cf-43cc-94fc-a12290ac83ac	atolye.studio2	API	\N	0 0 * * *	collecting	\N
b7351c3c-c464-4ed8-a6e8-594619112a26	instascope4	API	EAAfqKmZBM35wBSLZBv6VxBxyk5uaicKloPXXI8t2XBrhqY3h4zwGXMGEUYazbbyjncbsPHIhGp67qBnmlFJKch4U9Eb7IQc0q1kHUyREPqPRzOxTOgX7Pbew8kq9VKHcnxdFByhyXeJCuFzlBvB8LdMA2lg7GIksiidbyEOlGJiHC5Ul4105SaH1SizOHxRAvKldpm	\N	active	17841444785369518
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, role, created_at) FROM stdin;
728dfc0e-6bce-43d7-91e1-a44b65dfb509	instascope4@gmail.com	$argon2id$v=19$m=19456,t=3,p=1$gUoH9Y2GTyx7xLagytBUzQ$7IjW6L5WOdUNFSivxXrTQV9Q9iJ+9Tdnbtl9gq2tEPM	ADMIN	2026-08-02 21:46:14.372
57371c31-1333-4e2e-9e9c-a3ee29b1cf3c	user@example.com	$argon2id$v=19$m=19456,t=3,p=1$4ebPDJN0cYRYNdkjM72IFw$ZPViqtLUP4+F9miK+2KUtab1wQ70V1Igpem8Ckjbl/Q	USER	2026-08-03 06:39:57.265
2a4ad890-54a6-4c86-bb29-c39407a1a8d7	cırrık@example.com	$argon2id$v=19$m=19456,t=3,p=1$CuXnrXGbcL9hsrvbGJw/DA$g6xwwp6NChFDUmk8l4lSXLKzpKxSJzc0rSve0PPhg20	USER	2026-08-03 08:01:12.69
ec9ddc98-4599-4082-b446-6af05be42f11	user222@example.com	$argon2id$v=19$m=19456,t=3,p=1$G04tCsPFJNssi7Qpdbcodw$UTHG10EPrZRkSUxZDbN0ZgYrUtJfhuDWGteyCA6I6jY	USER	2026-08-04 08:16:00.842
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_metrics account_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_metrics
    ADD CONSTRAINT account_metrics_pkey PRIMARY KEY (id);


--
-- Name: analysis_results analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT analysis_results_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: collection_jobs collection_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection_jobs
    ADD CONSTRAINT collection_jobs_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: post_metrics post_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_metrics
    ADD CONSTRAINT post_metrics_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: tracked_accounts tracked_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracked_accounts
    ADD CONSTRAINT tracked_accounts_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: account_metrics_account_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_metrics_account_id_idx ON public.account_metrics USING btree (account_id);


--
-- Name: account_metrics_captured_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX account_metrics_captured_at_idx ON public.account_metrics USING btree (captured_at);


--
-- Name: analysis_results_subject_type_subject_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX analysis_results_subject_type_subject_id_idx ON public.analysis_results USING btree (subject_type, subject_id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: collection_jobs_account_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX collection_jobs_account_id_idx ON public.collection_jobs USING btree (account_id);


--
-- Name: comments_post_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX comments_post_id_idx ON public.comments USING btree (post_id);


--
-- Name: post_metrics_captured_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX post_metrics_captured_at_idx ON public.post_metrics USING btree (captured_at);


--
-- Name: post_metrics_post_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX post_metrics_post_id_key ON public.post_metrics USING btree (post_id);


--
-- Name: posts_account_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX posts_account_id_idx ON public.posts USING btree (account_id);


--
-- Name: posts_ig_media_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX posts_ig_media_id_key ON public.posts USING btree (ig_media_id);


--
-- Name: refresh_tokens_family_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_family_idx ON public.refresh_tokens USING btree (family);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: tracked_accounts_ig_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tracked_accounts_ig_username_idx ON public.tracked_accounts USING btree (ig_username);


--
-- Name: tracked_accounts_ig_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tracked_accounts_ig_username_key ON public.tracked_accounts USING btree (ig_username);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: account_metrics account_metrics_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_metrics
    ADD CONSTRAINT account_metrics_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.tracked_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: collection_jobs collection_jobs_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection_jobs
    ADD CONSTRAINT collection_jobs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.tracked_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_metrics post_metrics_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_metrics
    ADD CONSTRAINT post_metrics_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: posts posts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.tracked_accounts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict HaczxBPsIjuM2L4KSEJNn1gNUZ4H5BvMFS1xiHSEX5sp5Uku8ws9kM2xgHjIElo

