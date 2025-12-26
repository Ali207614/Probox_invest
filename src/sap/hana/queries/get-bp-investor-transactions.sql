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
    b."RefDate"   AS "ref_date",
    b."TransId"   AS "trans_id",
    b."TransType" AS "trans_type",
    b."LineMemo"  AS "description",
    b.amount AS "amount",

    CASE
        WHEN b.is_reinvest = 1 THEN 'reinvest'
        WHEN b.is_dividend = 1 THEN 'dividend'
        WHEN b.is_incoming = 1
            AND b."RefDate" = fi.first_incoming_date
            THEN 'initial_capital'
        WHEN b.is_incoming = 1
            THEN 'additional_capital'
        ELSE 'other'
        END AS "transaction_type",

    COUNT(*) OVER() AS "total"

FROM base b
         JOIN first_incoming fi ON 1=1
ORDER BY
    b."RefDate" DESC,
    b."TransId" DESC
    LIMIT ? OFFSET ?;
