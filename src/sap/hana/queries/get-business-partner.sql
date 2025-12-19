SELECT
    T0."CardCode",
    T0."CardName",
    T0."CardType",
    T0."Phone1",
    T0."Phone2"
FROM {{schema}}."OCRD" T0
WHERE T0."CardType" = 'C'
  AND (
    T0."Phone1" = ?
   OR T0."Phone2" = ?
    );
