const sheetsService = require("./googleSheetsService");

/*
==================================================
GET TABLE ROWS (from Google Sheets)
==================================================
*/

async function getTableRows(userId, tableName) {
  const grid = await sheetsService.getSheetGrid(userId, tableName);

  const header = grid[0] || [];

  return grid.slice(1).map((rowArr, index) => {
    const row = {};

    header.forEach((column, columnIndex) => {
      row[column] = rowArr[columnIndex] ?? "";
    });

    row._rowId = index + 1;

    return row;
  });
}

/*
==================================================
NORMALIZE
==================================================
*/

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return value;
}

/*
==================================================
COMPARE
==================================================
*/

function compare(actual, operator, expected) {
  actual = normalizeValue(actual);

  expected = normalizeValue(expected);

  const actualNumber = Number(actual);

  const expectedNumber = Number(expected);

  const bothNumbers =
    actual !== "" &&
    expected !== "" &&
    !Number.isNaN(actualNumber) &&
    !Number.isNaN(expectedNumber);

  if (bothNumbers) {
    actual = actualNumber;

    expected = expectedNumber;
  }

  switch (String(operator).toUpperCase()) {
    case "=":
    case "==":
      return actual == expected;

    case "!=":
    case "<>":
      return actual != expected;

    case ">":
      return actual > expected;

    case "<":
      return actual < expected;

    case ">=":
      return actual >= expected;

    case "<=":
      return actual <= expected;

    case "LIKE":
      return String(actual)
        .toLowerCase()
        .includes(String(expected).toLowerCase());

    default:
      throw new Error(`Unsupported operator '${operator}'`);
  }
}

/*
==================================================
WHERE CONDITION
==================================================
*/

function evaluateCondition(row, condition) {
  if (!condition) {
    return true;
  }

  const { column, operator = "=", value } = condition;

  if (!column) {
    throw new Error("WHERE column is required");
  }

  if (!Object.prototype.hasOwnProperty.call(row, column)) {
    throw new Error(`Column '${column}' not found`);
  }

  return compare(row[column], operator, value);
}

/*
==================================================
WHERE
==================================================
*/

function applyWhere(rows, where) {
  if (!where) {
    return rows;
  }

  if (where.column) {
    return rows.filter((row) => evaluateCondition(row, where));
  }

  if (Array.isArray(where.and)) {
    return rows.filter((row) =>
      where.and.every((condition) => evaluateCondition(row, condition)),
    );
  }

  if (Array.isArray(where.or)) {
    return rows.filter((row) =>
      where.or.some((condition) => evaluateCondition(row, condition)),
    );
  }

  throw new Error("Invalid WHERE condition");
}

/*
==================================================
JOIN COLUMN VALUE
==================================================
*/

function getJoinValue(row, column) {
  /*
    Supports:

    id

    Customers.id

    Orders.customer_id
    */

  if (Object.prototype.hasOwnProperty.call(row, column)) {
    return row[column];
  }

  return undefined;
}

/*
==================================================
INNER JOIN
==================================================
*/

function applyJoin(leftRows, rightRows, join) {
  const { type = "INNER", on } = join;

  if (!on) {
    throw new Error("JOIN requires an ON condition");
  }

  const { left, right } = on;

  if (!left || !right) {
    throw new Error("JOIN ON requires left and right columns");
  }

  const joinType = String(type).toUpperCase();

  if (joinType !== "INNER") {
    throw new Error(`JOIN type '${type}' is not supported yet`);
  }

  const result = [];

  for (const leftRow of leftRows) {
    for (const rightRow of rightRows) {
      const leftValue = getJoinValue(leftRow, left);

      const rightValue = getJoinValue(rightRow, right);

      if (compare(leftValue, "=", rightValue)) {
        result.push({
          ...leftRow,

          ...rightRow,
        });
      }
    }
  }

  return result;
}

/*
==================================================
SELECT
==================================================
*/

function applySelect(rows, columns) {
  if (!columns || !columns.length || columns.includes("*")) {
    return rows;
  }

  return rows.map((row) => {
    const result = {};

    columns.forEach((column) => {
      /*
                    Normal column
                    */

      if (Object.prototype.hasOwnProperty.call(row, column)) {
        result[column] = row[column];

        return;
      }

      throw new Error(`Column '${column}' not found`);
    });

    return result;
  });
}

/*
==================================================
DISTINCT
==================================================
*/

function applyDistinct(rows, columns) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = columns.map((column) => JSON.stringify(row[column])).join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

/*
==================================================
ORDER BY
==================================================
*/

function applyOrderBy(rows, orderBy) {
  if (!orderBy) {
    return rows;
  }

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

  return [...rows].sort((a, b) => {
    for (const order of orders) {
      const { column, direction = "ASC" } = order;

      if (!Object.prototype.hasOwnProperty.call(a, column)) {
        throw new Error(`Column '${column}' not found`);
      }

      let first = a[column];

      let second = b[column];

      const firstNumber = Number(first);

      const secondNumber = Number(second);

      const numeric =
        first !== "" &&
        second !== "" &&
        !Number.isNaN(firstNumber) &&
        !Number.isNaN(secondNumber);

      if (numeric) {
        first = firstNumber;

        second = secondNumber;
      } else {
        first = String(first).toLowerCase();

        second = String(second).toLowerCase();
      }

      if (first < second) {
        return String(direction).toUpperCase() === "DESC" ? 1 : -1;
      }

      if (first > second) {
        return String(direction).toUpperCase() === "DESC" ? -1 : 1;
      }
    }

    return 0;
  });
}

/*
==================================================
LIMIT + OFFSET
==================================================
*/

function applyLimit(rows, limit, offset = 0) {
  let result = rows.slice(Number(offset) || 0);

  if (limit !== undefined && limit !== null) {
    const number = Number(limit);

    if (Number.isNaN(number) || number < 0) {
      throw new Error("Invalid LIMIT");
    }

    result = result.slice(0, number);
  }

  return result;
}

/*
==================================================
AGGREGATES
==================================================
*/

function getAggregateValue(rows, column, functionName) {
  const functionType = String(functionName).toUpperCase();

  if (functionType === "COUNT" && column === "*") {
    return rows.length;
  }

  const values = rows
    .map((row) => row[column])
    .filter((value) => value !== "" && value !== null && value !== undefined);

  switch (functionType) {
    case "COUNT":
      return values.length;

    case "SUM":
      return values.reduce((total, value) => total + Number(value || 0), 0);

    case "AVG":
      if (values.length === 0) {
        return 0;
      }

      return (
        values.reduce((total, value) => total + Number(value || 0), 0) /
        values.length
      );

    case "MIN":
      if (values.length === 0) {
        return null;
      }

      return Math.min(...values.map((value) => Number(value)));

    case "MAX":
      if (values.length === 0) {
        return null;
      }

      return Math.max(...values.map((value) => Number(value)));

    default:
      throw new Error(`Unsupported aggregate '${functionName}'`);
  }
}

/*
==================================================
GROUP BY
==================================================
*/

function applyGroupBy(rows, groupBy, aggregates = []) {
  if (!Array.isArray(groupBy) || groupBy.length === 0) {
    return null;
  }

  const groups = new Map();

  rows.forEach((row) => {
    const key = groupBy.map((column) => JSON.stringify(row[column])).join("|");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  });

  const result = [];

  for (const groupRows of groups.values()) {
    const resultRow = {};

    groupBy.forEach((column) => {
      resultRow[column] = groupRows[0][column];
    });

    aggregates.forEach((aggregate) => {
      const { function: functionName, column = "*", alias } = aggregate;

      const value = getAggregateValue(groupRows, column, functionName);

      const outputName =
        alias || `${String(functionName).toUpperCase()}(${column})`;

      resultRow[outputName] = value;
    });

    result.push(resultRow);
  }

  return result;
}

/*
==================================================
HAVING
==================================================
*/

function applyHaving(rows, having) {
  if (!having) {
    return rows;
  }

  if (having.column) {
    return rows.filter((row) =>
      compare(row[having.column], having.operator || "=", having.value),
    );
  }

  if (Array.isArray(having.and)) {
    return rows.filter((row) =>
      having.and.every((condition) =>
        compare(
          row[condition.column],
          condition.operator || "=",
          condition.value,
        ),
      ),
    );
  }

  if (Array.isArray(having.or)) {
    return rows.filter((row) =>
      having.or.some((condition) =>
        compare(
          row[condition.column],
          condition.operator || "=",
          condition.value,
        ),
      ),
    );
  }

  throw new Error("Invalid HAVING condition");
}

/*
==================================================
MAIN QUERY
==================================================
*/

async function query(userId, options) {
  if (!options || typeof options !== "object") {
    throw new Error("Query must be an object");
  }

  const {
    table,
    columns = ["*"],
    joins = [],
    where,
    distinct = false,
    orderBy,
    limit,
    offset = 0,
    groupBy,
    aggregates = [],
    having,
  } = options;

  if (!table) {
    throw new Error("Table is required");
  }

  /*
    ==============================================
    MAIN TABLE
    ==============================================
    */

  let rows = await getTableRows(userId, table);

  /*
    ==============================================
    JOINS
    ==============================================
    */

  if (Array.isArray(joins) && joins.length) {
    for (const join of joins) {
      if (!join.table) {
        throw new Error("JOIN table is required");
      }

      const rightRows = await getTableRows(userId, join.table);

      rows = applyJoin(rows, rightRows, join);
    }
  }

  /*
    ==============================================
    WHERE
    ==============================================
    */

  rows = applyWhere(rows, where);

  /*
    ==============================================
    GROUP BY
    ==============================================
    */

  if (Array.isArray(groupBy) && groupBy.length) {
    rows = applyGroupBy(rows, groupBy, aggregates);

    /*
        HAVING
        */

    rows = applyHaving(rows, having);

    /*
        ORDER BY
        */

    rows = applyOrderBy(rows, orderBy);

    /*
        LIMIT
        */

    rows = applyLimit(rows, limit, offset);

    return {
      table,

      columns: Object.keys(rows[0] || {}),

      count: rows.length,

      rows,
    };
  }

  /*
    ==============================================
    DISTINCT
    ==============================================
    */

  if (distinct) {
    const distinctColumns = columns.includes("*")
      ? Object.keys(rows[0] || {})
      : columns;

    rows = applyDistinct(rows, distinctColumns);
  }

  /*
    ==============================================
    ORDER BY
    ==============================================
    */

  rows = applyOrderBy(rows, orderBy);

  /*
    ==============================================
    LIMIT + OFFSET
    ==============================================
    */

  rows = applyLimit(rows, limit, offset);

  /*
    ==============================================
    SELECT
    ==============================================
    */

  rows = applySelect(rows, columns);

  return {
    table,

    columns: columns.includes("*") ? Object.keys(rows[0] || {}) : columns,

    count: rows.length,

    rows,
  };
}

module.exports = {
  query,
};
