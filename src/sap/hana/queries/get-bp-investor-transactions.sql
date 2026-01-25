WITH base AS (
    SELECT
        T0."RefDate",
        T0."TransId",
        T0."TransType",
        T0."LineMemo",
        (T0."Credit" - T0."Debit") AS amount,

        CASE
            WHEN T0."TransType" IN (24, -2)
                AND T0."Credit" > 0
                THEN 1 ELSE 0
            END AS is_incoming,

        CASE
            WHEN T0."TransType" = 30
                AND T0."ContraAct" = ?
                AND T0."Credit" > 0
                THEN 1 ELSE 0
            END AS is_reinvest,

        CASE
            WHEN (T0."TransType" = 46 AND T0."Debit" > 0)
                OR (
                     T0."Debit" > 0
                         AND EXISTS (
                         SELECT 1
                         FROM {{schema}}.JDT1 X
                        WHERE X."TransId" = T0."TransId"
                          AND X."Account" = '5030'
                          AND X."Credit" > 0
                     )
                     )
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
    typed AS (
SELECT
    b."RefDate",
    b."TransId",
    b."LineMemo",
    b.amount,
    CASE
    WHEN b.is_reinvest = 1 THEN 'reinvest'
    WHEN b.is_dividend = 1 THEN 'dividend'
    WHEN b.is_incoming = 1
    AND b."RefDate" = fi.first_incoming_date
    THEN 'initial_capital'
    WHEN b.is_incoming = 1 THEN 'additional_capital'
    ELSE 'other'
    END AS "transaction_type"
FROM base b
    JOIN first_incoming fi ON 1=1
WHERE b.amount <> 0
    ),
    grouped AS (
SELECT
    t."RefDate" AS "ref_date",
    t."transaction_type",
    SUM(t.amount) AS "amount",
    COUNT(*) AS "rows_count",
    MIN(t."TransId") AS "min_trans_id",
    MAX(t."TransId") AS "max_trans_id"
FROM typed t
WHERE t."transaction_type" IN ('reinvest','dividend','initial_capital','additional_capital')
GROUP BY
    t."RefDate",
    t."transaction_type"
HAVING SUM(t.amount) <> 0
    )

SELECT
    g."ref_date",
    g."transaction_type",
    g."amount",
    g."rows_count",
    g."min_trans_id",
    g."max_trans_id",
    COUNT(*) OVER() AS "total"
FROM grouped g
ORDER BY
    g."ref_date" DESC,
    g."transaction_type" DESC
    LIMIT ? OFFSET ?;