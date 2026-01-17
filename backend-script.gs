
/**
 * FINAL – Taawoon Cooperative API
 * Stable / Production Ready
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";

/* ================= CORE ================= */

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doGet(e) {
  if (e.parameter.action) {
    return handleRequest(e);
  }
  return HtmlService.createHtmlOutput(
    "<div style='font-family:sans-serif; text-align:center; padding:50px;'>" +
    "<h1 style='color:#064e3b'>✅ Taawoon API ONLINE</h1>" +
    "<p>Linked Sheet: <b>" + TARGET_SHEET_ID + "</b></p>" +
    "<p style='color:green'>Status: Ready for GET/POST</p></div>"
  );
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const payload = parsePayload(e);
    const action = payload.action;
    const data = payload.data || {};

    if (!action) return responseError("Missing action");

    const ss = getSS();
    const Members = getSheet(ss, "Members");
    const Transactions = getSheet(ss, "Transactions");
    const Ledger = getSheet(ss, "Ledger");

    switch (action) {
      case "ping":
        return responseOK({ message: "pong" });

      case "initDatabase":
        initHeaders(Members, Transactions, Ledger);
        return responseOK({ message: "Database initialized" });

      case "getData":
        return responseOK({
          members: getMembers(Members, Transactions),
          ledger: getLedger(Ledger)
        });

      case "addMember":
        Members.appendRow(mapMemberToRow(data.member));
        return responseOK({ message: "Member added" });

      case "updateMember":
        updateMemberInSheet(Members, data.id, data.data);
        return responseOK({ message: "Member updated" });

      case "deleteMember":
        deleteRowById(Members, data.id);
        return responseOK({ message: "Member deleted" });

      case "addTransaction":
        const tx = data.transaction;
        Transactions.appendRow(mapTransactionToRow(tx));
        updateBalances(Members, tx);
        Ledger.appendRow(mapTransactionToLedgerRow(tx));
        return responseOK({ message: "Transaction saved" });

      case "deleteTransaction":
        revertBalances(Members, Transactions, data.id, data.memberId);
        deleteRowById(Transactions, data.id);
        deleteRowById(Ledger, "L-TX-" + data.id);
        return responseOK({ message: "Transaction deleted" });

      default:
        return responseError("Unknown action: " + action);
    }
  } catch (err) {
    return responseError(err.message);
  }
}

/* ================= UTIL ================= */

function parsePayload(e) {
  // Handle GET parameters
  if (e.parameter && e.parameter.action) {
    return {
      action: e.parameter.action,
      data: e.parameter.data ? JSON.parse(e.parameter.data) : {}
    };
  }
  // Handle POST body
  if (e.postData && e.postData.contents) {
    // Check if it's form-encoded or raw JSON
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // Fallback for application/x-www-form-urlencoded
      return {
        action: e.parameter.action,
        data: e.parameter.data ? JSON.parse(e.parameter.data) : {}
      };
    }
  }
  throw new Error("Invalid request payload");
}

function responseOK(obj) {
  return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj }))
    .setMimeType(ContentService.MimeType.JSON);
}

function responseError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
}

/* ================= DATABASE LOGIC ================= */

function initHeaders(m, t, l) {
  m.clear().appendRow(["ID","Name","Code","IDCard","Phone","Address","Joined","Type","Shares","Savings","HousingDebt","LandDebt","GeneralDebt","Monthly","Missed"]);
  t.clear().appendRow(["ID","MemberID","Date","Timestamp","Housing","Land","Shares","Savings","Welfare","Insurance","Donation","GeneralLoan","Other","Note","Total","Recorder","Method"]);
  l.clear().appendRow(["ID","Date","Type","Category","Description","Amount","Method","Recorder","Note","Timestamp"]);
}

function getMembers(mSheet, tSheet) {
  const mRows = mSheet.getDataRange().getValues();
  const tRows = tSheet.getDataRange().getValues();
  if (mRows.length < 2) return [];

  const txMap = {};
  tRows.slice(1).forEach(r => {
    const mid = String(r[1]);
    if (!txMap[mid]) txMap[mid] = [];
    txMap[mid].push({
      id: String(r[0]), memberId: mid, date: formatDate(r[2]), timestamp: Number(r[3]),
      housing: Number(r[4])||0, land: Number(r[5])||0, shares: Number(r[6])||0,
      savings: Number(r[7])||0, welfare: Number(r[8])||0, insurance: Number(r[9])||0,
      donation: Number(r[10])||0, generalLoan: Number(r[11])||0, totalAmount: Number(r[14])||0,
      recordedBy: String(r[15]), paymentMethod: String(r[16])
    });
  });

  return mRows.slice(1).map(r => ({
    id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), phone: String(r[4]), address: String(r[5]) },
    joinedDate: formatDate(r[6]), memberType: r[7],
    accumulatedShares: Number(r[8])||0, savingsBalance: Number(r[9])||0,
    housingLoanBalance: Number(r[10])||0, landLoanBalance: Number(r[11])||0,
    generalLoanBalance: Number(r[12])||0, monthlyInstallment: Number(r[13])||0,
    missedInstallments: Number(r[14])||0, transactions: txMap[String(r[0])] || []
  }));
}

function getLedger(lSheet) {
  const rows = lSheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    id: String(r[0]), date: formatDate(r[1]), type: String(r[2]),
    category: String(r[3]), description: String(r[4]), amount: Number(r[5]),
    paymentMethod: String(r[6]), recordedBy: String(r[7]), note: String(r[8]), timestamp: Number(r[9])
  }));
}

function updateBalances(sheet, tx) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(tx.memberId)) {
      const r = i + 1;
      sheet.getRange(r, 9).setValue((Number(rows[i][8])||0) + (tx.shares||0));
      sheet.getRange(r, 10).setValue((Number(rows[i][9])||0) + (tx.savings||0));
      sheet.getRange(r, 11).setValue(Math.max(0, (Number(rows[i][10])||0) - (tx.housing||0)));
      sheet.getRange(r, 12).setValue(Math.max(0, (Number(rows[i][11])||0) - (tx.land||0)));
      sheet.getRange(r, 13).setValue(Math.max(0, (Number(rows[i][12])||0) - (tx.generalLoan||0)));
      break;
    }
  }
}

function revertBalances(mSheet, tSheet, txId, memberId) {
  const tx = tSheet.getDataRange().getValues().find(r => String(r[0]) === String(txId));
  if (!tx) return;
  const mRows = mSheet.getDataRange().getValues();
  for (let i = 1; i < mRows.length; i++) {
    if (String(mRows[i][0]) === String(memberId)) {
      const r = i + 1;
      mSheet.getRange(r, 9).setValue((Number(mRows[i][8])||0) - (Number(tx[6])||0));
      mSheet.getRange(r, 10).setValue((Number(mRows[i][9])||0) - (Number(tx[7])||0));
      mSheet.getRange(r, 11).setValue((Number(mRows[i][10])||0) + (Number(tx[4])||0));
      mSheet.getRange(r, 12).setValue((Number(mRows[i][11])||0) + (Number(tx[5])||0));
      mSheet.getRange(r, 13).setValue((Number(mRows[i][12])||0) + (Number(tx[11])||0));
      break;
    }
  }
}

function deleteRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function updateMemberInSheet(sheet, id, data) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const r = i + 1;
      if (data.name) sheet.getRange(r, 2).setValue(data.name);
      if (data.memberType) sheet.getRange(r, 8).setValue(data.memberType);
      if (data.personalInfo) {
        if (data.personalInfo.idCard) sheet.getRange(r, 4).setValue(data.personalInfo.idCard);
        if (data.personalInfo.phone) sheet.getRange(r, 5).setValue(data.personalInfo.phone);
        if (data.personalInfo.address) sheet.getRange(r, 6).setValue(data.personalInfo.address);
      }
      if (data.housingLoanBalance !== undefined) sheet.getRange(r, 11).setValue(data.housingLoanBalance);
      if (data.landLoanBalance !== undefined) sheet.getRange(r, 12).setValue(data.landLoanBalance);
      if (data.generalLoanBalance !== undefined) sheet.getRange(r, 13).setValue(data.generalLoanBalance);
      if (data.accumulatedShares !== undefined) sheet.getRange(r, 9).setValue(data.accumulatedShares);
      if (data.savingsBalance !== undefined) sheet.getRange(r, 10).setValue(data.savingsBalance);
      if (data.monthlyInstallment !== undefined) sheet.getRange(r, 14).setValue(data.monthlyInstallment);
      if (data.missedInstallments !== undefined) sheet.getRange(r, 15).setValue(data.missedInstallments);
      break;
    }
  }
}

function mapMemberToRow(m) {
  return [m.id, m.name, m.memberCode, m.personalInfo?.idCard||"", m.personalInfo?.phone||"", m.personalInfo?.address||"", m.joinedDate||"", m.memberType||"ordinary", m.accumulatedShares||0, m.savingsBalance||0, m.housingLoanBalance||0, m.landLoanBalance||0, m.generalLoanBalance||0, m.monthlyInstallment||0, m.missedInstallments||0];
}

function mapTransactionToRow(tx) {
  return [tx.id, tx.memberId, tx.date, tx.timestamp, tx.housing||0, tx.land||0, tx.shares||0, tx.savings||0, tx.welfare||0, tx.insurance||0, tx.donation||0, tx.generalLoan||0, 0, "", tx.totalAmount, tx.recordedBy, tx.paymentMethod];
}

function mapTransactionToLedgerRow(tx) {
  return ["L-TX-"+tx.id, tx.date, "income", "รับชำระเงินสมาชิก", "รับชำระจาก " + tx.memberId, tx.totalAmount, tx.paymentMethod, tx.recordedBy, "Auto", tx.timestamp];
}
