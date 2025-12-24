WITH bp_balance AS (
    SELECT
        SUM(L."Credit" - L."Debit") AS "Balance"
    FROM {{schema}}.JDT1 L
    JOIN {{schema}}.OJDT H ON H."TransId" = L."TransId"
WHERE L."ShortName" = ?
    ),
    per_trans AS (
SELECT
    H."RefDate",
    H."TransId",
    SUM(CASE WHEN L."ShortName" = ? THEN L."Credit" ELSE 0 END) AS "BpCredit",
    SUM(CASE WHEN L."Account"   = ? THEN L."Debit"  ELSE 0 END) AS "AccDebit"
FROM {{schema}}.OJDT H
    JOIN {{schema}}.JDT1 L ON L."TransId" = H."TransId"
WHERE (L."ShortName" = ? OR L."Account" = ?)
GROUP BY H."RefDate", H."TransId"
    ),
    bounds AS (
SELECT
    ADD_DAYS(CURRENT_DATE, 1 - DAYOFMONTH(CURRENT_DATE))                      AS "ThisMonthStart",
    ADD_MONTHS(ADD_DAYS(CURRENT_DATE, 1 - DAYOFMONTH(CURRENT_DATE)), -1)     AS "LastMonthStart"
FROM DUMMY
    ),
    income AS (
SELECT
    SUM(
    CASE
    WHEN p."RefDate" >= b."ThisMonthStart"
    AND p."AccDebit" > 0
    AND p."BpCredit" > 0
    THEN p."BpCredit" ELSE 0 END
    ) AS "IncomeThisMonth",
    SUM(
    CASE
    WHEN p."RefDate" >= b."LastMonthStart"
    AND p."RefDate" <  b."ThisMonthStart"
    AND p."AccDebit" > 0
    AND p."BpCredit" > 0
    THEN p."BpCredit" ELSE 0 END
    ) AS "IncomeLastMonth"
FROM per_trans p
    CROSS JOIN bounds b
    )
SELECT
    bb."Balance",
    i."IncomeThisMonth",
    i."IncomeLastMonth",
    CASE
        WHEN i."IncomeLastMonth" = 0 THEN NULL
        ELSE ROUND(((i."IncomeThisMonth" - i."IncomeLastMonth") / ABS(i."IncomeLastMonth")) * 100, 2)
        END AS "IncomeGrowthPercent"
FROM bp_balance bb
         CROSS JOIN income i;
