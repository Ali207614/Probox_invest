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
    )

SELECT
    /* Initial capital */
    COALESCE(SUM(
                     CASE
                         WHEN b.is_incoming = 1
                             AND b."RefDate" = fi.first_incoming_date
                             THEN b.signed_amount ELSE 0
                         END
             ), 0) AS "initial_capital",

    /* Additional capital */
    COALESCE(SUM(
                     CASE
                         WHEN b.is_incoming = 1
                             AND b."RefDate" > fi.first_incoming_date
                             THEN b.signed_amount ELSE 0
                         END
             ), 0) AS "additional_capital",

    /* Reinvest */
    COALESCE(SUM(
                     CASE
                         WHEN b.is_reinvest = 1
                             THEN b.signed_amount ELSE 0
                         END
             ), 0) AS "reinvest_fund",

    /* Dividend */
    COALESCE(SUM(
                     CASE
                         WHEN b.is_dividend = 1
                             THEN ABS(b.signed_amount) ELSE 0
                         END
             ), 0) AS "dividend_paid"

FROM base b
         JOIN first_incoming fi ON 1=1;
