WITH base AS (
    SELECT
        T0."RefDate",
        T0."TransId",
        T0."TransType",
        T0."Debit",
        T0."Credit",
        T0."ContraAct",
        (T0."Credit" - T0."Debit") AS signed_amount,

        /* Incoming: Initial + Additional capital */
        CASE
            WHEN T0."TransType" IN (24, -2)
                AND T0."Credit" > 0
                THEN 1 ELSE 0
            END AS is_incoming,

        /* Reinvest */
        CASE
            WHEN T0."TransType" = 30
                AND T0."ContraAct" = ?
                AND T0."Credit" > 0
                THEN 1 ELSE 0
            END AS is_reinvest,

        /* Dividend */
        CASE
            WHEN T0."TransType" = 46
                AND T0."Debit" > 0
                THEN 1 ELSE 0
            END AS is_dividend

    FROM {{schema}}.JDT1 T0
    JOIN {{schema}}.OJDT H ON H."TransId" = T0."TransId"
WHERE T0."ShortName" = ?
  AND H."StornoToTr" IS NULL
    ),

    first_incoming AS (
SELECT MIN("RefDate") AS first_incoming_date
FROM base
WHERE is_incoming = 1
    ),

    dates AS (
SELECT
    /* first day of current month */
    ADD_DAYS(CURRENT_DATE, 1 - DAYOFMONTH(CURRENT_DATE)) AS this_month_start,
    /* first day of last month */
    ADD_MONTHS(ADD_DAYS(CURRENT_DATE, 1 - DAYOFMONTH(CURRENT_DATE)), -1) AS last_month_start,
    /* last day of last month */
    ADD_DAYS(ADD_DAYS(CURRENT_DATE, 1 - DAYOFMONTH(CURRENT_DATE)), -1) AS last_month_end
FROM DUMMY
    ),

    agg AS (
SELECT
    /* totals */
    COALESCE(SUM(
    CASE
    WHEN b.is_incoming = 1 AND b."RefDate" = fi.first_incoming_date
    THEN b.signed_amount ELSE 0
    END
    ), 0) AS "initial_capital",

    COALESCE(SUM(
    CASE
    WHEN b.is_incoming = 1 AND b."RefDate" > fi.first_incoming_date
    THEN b.signed_amount ELSE 0
    END
    ), 0) AS "additional_capital",

    COALESCE(SUM(
    CASE
    WHEN b.is_reinvest = 1 THEN b.signed_amount ELSE 0
    END
    ), 0) AS "reinvest_fund",

    COALESCE(SUM(
    CASE
    WHEN b.is_dividend = 1 THEN ABS(b.signed_amount) ELSE 0
    END
    ), 0) AS "dividend_paid",

    /* monthly reinvest */
    COALESCE(SUM(
    CASE
    WHEN b.is_reinvest = 1
    AND b."RefDate" >= d.this_month_start
    THEN b.signed_amount ELSE 0
    END
    ), 0) AS "reinvest_this_month",

    COALESCE(SUM(
    CASE
    WHEN b.is_reinvest = 1
    AND b."RefDate" >= d.last_month_start
    AND b."RefDate" <= d.last_month_end
    THEN b.signed_amount ELSE 0
    END
    ), 0) AS "reinvest_last_month",

    /* monthly dividend */
    COALESCE(SUM(
    CASE
    WHEN b.is_dividend = 1
    AND b."RefDate" >= d.this_month_start
    THEN ABS(b.signed_amount) ELSE 0
    END
    ), 0) AS "dividend_this_month",

    COALESCE(SUM(
    CASE
    WHEN b.is_dividend = 1
    AND b."RefDate" >= d.last_month_start
    AND b."RefDate" <= d.last_month_end
    THEN ABS(b.signed_amount) ELSE 0
    END
    ), 0) AS "dividend_last_month"

FROM base b
    JOIN first_incoming fi ON 1=1
    JOIN dates d ON 1=1
    )

SELECT
    a.*,

    /* growth % (this vs last) */
    CASE
        WHEN a."reinvest_last_month" = 0 THEN NULL
        ELSE ROUND((a."reinvest_this_month" - a."reinvest_last_month") / ABS(a."reinvest_last_month") * 100, 2)
        END AS "reinvest_growth_percent",

    CASE
        WHEN a."dividend_last_month" = 0 THEN NULL
        ELSE ROUND((a."dividend_this_month" - a."dividend_last_month") / ABS(a."dividend_last_month") * 100, 2)
        END AS "dividend_growth_percent"

FROM agg a;
