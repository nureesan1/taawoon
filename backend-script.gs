
/**
 * Google Apps Script for Taawoon Cooperative System (Secure CORS Version)
 * ---------------------------------------------------------------------
 */

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doGet(e) {
  var response = { status: 'success', message: 'API is online.' };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var memberSheet = getOrInsertSheet(ss, 'Members');
  var transSheet = getOrInsertSheet(ss, 'Transactions');
  var ledgerSheet = getOrInsertSheet(ss, 'Ledger');
  
  initializeHeaders(memberSheet, transSheet, ledgerSheet);

  var requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return createResponse('error', 'Invalid JSON input');
  }

  var action = requestData.action;

  try {
    switch (action) {
      case 'ping':
        return createResponse('success', { message: 'pong' });

      case 'initDatabase':
        initializeHeaders(memberSheet, transSheet, ledgerSheet, true);
        return createResponse('success', 'Database Initialized Successfully');

      case 'getData':
        return createResponse('success', { 
          members: getMembersData(memberSheet, transSheet),
          ledger: getLedgerData(ledgerSheet)
        });

      case 'addTransaction':
        var tx = requestData.transaction;
        transSheet.appendRow([
          tx.id, tx.memberId, tx.date, tx.timestamp, 
          tx.housing || 0, tx.land || 0, tx.shares || 0, tx.savings || 0, 
          tx.welfare || 0, tx.insurance || 0, tx.donation || 0, tx.generalLoan || 0, 
          tx.others || 0, tx.othersNote || '', tx.totalAmount || 0, 
          tx.recordedBy || 'System', tx.paymentMethod || 'cash',
          tx.bankName || '', tx.bankAccount || ''
        ]);
        var memberName = getMemberNameById(memberSheet, tx.memberId);
        ledgerSheet.appendRow([
          'L' + tx.timestamp, tx.date, 'income', 'รายได้', 
          'รับชำระเงินจากสมาชิก: ' + memberName, 
          tx.totalAmount, tx.paymentMethod, tx.recordedBy, 
          'บันทึกจากระบบรับชำระสมาชิก', tx.timestamp
        ]);
        updateMemberBalancesFromTx(memberSheet, tx);
        return createResponse('success', 'Transaction Recorded');

      case 'addMember':
        var m = requestData.member;
        memberSheet.appendRow([
          m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.phone, 
          m.personalInfo.address, m.joinedDate, m.memberType, m.accumulatedShares || 0, 
          m.savingsBalance || 0, m.housingLoanBalance || 0, m.landLoanBalance || 0, 
          m.generalLoanBalance || 0, m.monthlyInstallment || 0, m.missedInstallments || 0
        ]);
        return createResponse('success', 'Member Added');

      case 'updateMember':
        updateMemberData(memberSheet, requestData.id, requestData.data);
        return createResponse('success', 'Member Updated');

      case 'deleteMember':
        deleteRowById(memberSheet, requestData.id);
        return createResponse('success', 'Member Deleted');

      case 'addLedgerItem':
        var item = requestData.item;
        ledgerSheet.appendRow([
          item.id, item.date, item.type, item.category, 
          item.description, item.amount, item.paymentMethod, 
          item.recordedBy, item.note || '', item.timestamp
        ]);
        return createResponse('success', 'Ledger Item Added');

      case 'deleteLedgerItem':
        deleteRowById(ledgerSheet, requestData.id);
        return createResponse('success', 'Ledger Item Deleted');

      default:
        return createResponse('error', 'Unknown Action: ' + action);
    }
  } catch (err) {
    return createResponse('error', 'Server Error: ' + err.toString());
  }
}

function getOrInsertSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function initializeHeaders(mSheet, tSheet, lSheet, force) {
  if (mSheet.getLastRow() === 0 || force) {
    mSheet.clear();
    mSheet.appendRow(['ID', 'Name', 'MemberCode', 'IDCard', 'Phone', 'Address', 'JoinedDate', 'Type', 'Shares', 'Savings', 'HousingDebt', 'LandDebt', 'GenDebt', 'Monthly', 'Missed']);
  }
  if (tSheet.getLastRow() === 0 || force) {
    tSheet.clear();
    tSheet.appendRow(['ID', 'MemberID', 'Date', 'Timestamp', 'Housing', 'Land', 'Shares', 'Savings', 'Welfare', 'Insurance', 'Donation', 'GenLoan', 'Others', 'Note', 'Total', 'RecordedBy', 'Method', 'Bank', 'Account']);
  }
  if (lSheet.getLastRow() === 0 || force) {
    lSheet.clear();
    lSheet.appendRow(['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Method', 'RecordedBy', 'Note', 'Timestamp']);
  }
}

function createResponse(status, data) {
  var output = { status: status };
  if (status === 'success') {
    if (typeof data === 'object') Object.assign(output, data);
    else output.message = data;
  } else {
    output.message = data;
  }
  
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function getMemberNameById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) return data[i][1];
  }
  return "Unknown";
}

function getMembersData(memberSheet, transSheet) {
  var mRows = memberSheet.getDataRange().getValues();
  var tRows = transSheet.getDataRange().getValues();
  if (mRows.length <= 1) return [];

  var transactionsByMember = {};
  for (var j = 1; j < tRows.length; j++) {
    var mid = tRows[j][1];
    if (!mid) continue;
    if (!transactionsByMember[mid]) transactionsByMember[mid] = [];
    transactionsByMember[mid].push({
      id: tRows[j][0], memberId: tRows[j][1], date: tRows[j][2], timestamp: tRows[j][3],
      housing: Number(tRows[j][4])||0, land: Number(tRows[j][5])||0, shares: Number(tRows[j][6])||0, 
      savings: Number(tRows[j][7])||0, welfare: Number(tRows[j][8])||0, insurance: Number(tRows[j][9])||0, 
      donation: Number(tRows[j][10])||0, generalLoan: Number(tRows[j][11])||0, others: Number(tRows[j][12])||0,
      othersNote: tRows[j][13], totalAmount: Number(tRows[j][14])||0, recordedBy: tRows[j][15],
      paymentMethod: tRows[j][16] || 'cash', bankName: tRows[j][17] || '', bankAccount: tRows[j][18] || ''
    });
  }

  var members = [];
  for (var i = 1; i < mRows.length; i++) {
    var m = mRows[i];
    if (!m[0]) continue;
    members.push({
      id: String(m[0]), name: m[1], memberCode: m[2],
      personalInfo: { idCard: String(m[3]), phone: m[4], address: m[5] },
      joinedDate: m[6], memberType: m[7], 
      accumulatedShares: Number(m[8]) || 0, savingsBalance: Number(m[9]) || 0,
      housingLoanBalance: Number(m[10]) || 0, landLoanBalance: Number(m[11]) || 0,
      generalLoanBalance: Number(m[12]) || 0, monthlyInstallment: Number(m[13]) || 0,
      missedInstallments: Number(m[14]) || 0,
      transactions: transactionsByMember[m[0]] || []
    });
  }
  return members;
}

function getLedgerData(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var ledger = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    ledger.push({
      id: r[0], date: r[1], type: r[2], category: r[3],
      description: r[4], amount: Number(r[5]) || 0, paymentMethod: r[6],
      recordedBy: r[7], note: r[8], timestamp: r[9]
    });
  }
  return ledger;
}

function updateMemberBalancesFromTx(sheet, tx) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == tx.memberId) {
      var row = i + 1;
      sheet.getRange(row, 9).setValue((Number(data[i][8]) || 0) + (Number(tx.shares) || 0));
      sheet.getRange(row, 10).setValue((Number(data[i][9]) || 0) + (Number(tx.savings) || 0));
      sheet.getRange(row, 11).setValue(Math.max(0, (Number(data[i][10]) || 0) - (Number(tx.housing) || 0)));
      sheet.getRange(row, 12).setValue(Math.max(0, (Number(data[i][11]) || 0) - (Number(tx.land) || 0)));
      sheet.getRange(row, 13).setValue(Math.max(0, (Number(data[i][12]) || 0) - (Number(tx.generalLoan) || 0)));
      break;
    }
  }
}

function updateMemberData(sheet, id, updateData) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      var row = i + 1;
      if (updateData.name !== undefined) sheet.getRange(row, 2).setValue(updateData.name);
      if (updateData.memberType !== undefined) sheet.getRange(row, 8).setValue(updateData.memberType);
      if (updateData.joinedDate !== undefined) sheet.getRange(row, 7).setValue(updateData.joinedDate);
      if (updateData.personalInfo) {
        if (updateData.personalInfo.idCard !== undefined) sheet.getRange(row, 4).setValue(updateData.personalInfo.idCard);
        if (updateData.personalInfo.phone !== undefined) sheet.getRange(row, 5).setValue(updateData.personalInfo.phone);
        if (updateData.personalInfo.address !== undefined) sheet.getRange(row, 6).setValue(updateData.personalInfo.address);
      }
      if (updateData.accumulatedShares !== undefined) sheet.getRange(row, 9).setValue(updateData.accumulatedShares);
      if (updateData.savingsBalance !== undefined) sheet.getRange(row, 10).setValue(updateData.savingsBalance);
      if (updateData.housingLoanBalance !== undefined) sheet.getRange(row, 11).setValue(updateData.housingLoanBalance);
      if (updateData.landLoanBalance !== undefined) sheet.getRange(row, 12).setValue(updateData.landLoanBalance);
      if (updateData.generalLoanBalance !== undefined) sheet.getRange(row, 13).setValue(updateData.generalLoanBalance);
      if (updateData.monthlyInstallment !== undefined) sheet.getRange(row, 14).setValue(updateData.monthlyInstallment);
      if (updateData.missedInstallments !== undefined) sheet.getRange(row, 15).setValue(updateData.missedInstallments);
      break;
    }
  }
}

function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
