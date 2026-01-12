
/**
 * Google Apps Script for Taawoon Cooperative System (Stable Version)
 * ---------------------------------------------------------------------
 * Target Sheet ID: 1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o
 */

var TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doGet(e) {
  var status = "ONLINE";
  try { getSS(); } catch(err) { status = "ERROR: " + err.message; }
  
  var html = "<div style='font-family:sans-serif; text-align:center; padding:50px;'>" +
             "<h1 style='color:#064e3b'>✅ Cooperative API is " + status + "</h1>" +
             "<p>Target Sheet: <b>" + TARGET_SHEET_ID + "</b></p>" +
             "<p style='color:green; font-weight:bold;'>สถานะ: พร้อมใช้งาน</p>" +
             "<hr style='width:200px; margin:20px auto; border:0; border-top:1px solid #eee;'>" +
             "<p style='color:gray; font-size:12px;'>หากคุณเห็นหน้านี้ แสดงว่าการตั้งค่า 'Anyone' ถูกต้องแล้ว</p>" +
             "</div>";
  return HtmlService.createHtmlOutput(html).setTitle("Taawoon API Status");
}

function doPost(e) {
  var action, data;
  
  try {
    if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
      data = e.parameter.data ? JSON.parse(e.parameter.data) : {};
    } 
    else if (e.postData && e.postData.contents) {
      var json = JSON.parse(e.postData.contents);
      action = json.action;
      data = json.data || json;
    }
  } catch (err) {
    return sendResponse({ status: 'error', message: 'แกะข้อมูลล้มเหลว: ' + err.message });
  }

  if (!action) return sendResponse({ status: 'error', message: 'ไม่ได้ระบุ action' });

  try {
    var ss = getSS();
    var mSheet = getOrInsertSheet(ss, 'Members');
    var tSheet = getOrInsertSheet(ss, 'Transactions');
    var lSheet = getOrInsertSheet(ss, 'Ledger');
    
    switch (action) {
      case 'ping': 
        return sendResponse({ status: 'success', message: 'pong' });
      
      case 'getData':
        return sendResponse({ 
          status: 'success', 
          members: getMembersData(mSheet, tSheet),
          ledger: getLedgerData(lSheet)
        });

      case 'initDatabase':
        initializeHeaders(mSheet, tSheet, lSheet, true);
        return sendResponse({ status: 'success', message: 'เริ่มต้นฐานข้อมูลสำเร็จ' });

      case 'addTransaction':
        var tx = data.transaction;
        tSheet.appendRow([
          tx.id, tx.memberId, tx.date, tx.timestamp, 
          tx.housing || 0, tx.land || 0, tx.shares || 0, tx.savings || 0, 
          tx.welfare || 0, tx.insurance || 0, tx.donation || 0, tx.generalLoan || 0, 
          0, '', tx.totalAmount, tx.recordedBy, tx.paymentMethod
        ]);
        updateMemberBalancesFromTx(mSheet, tx);
        
        // บันทึกบัญชีรายรับ-รายจ่ายอัตโนมัติเมื่อมีการรับชำระเงิน
        lSheet.appendRow([
          'L-TX-' + tx.id, tx.date, 'income', 'รับชำระเงินสมาชิก', 
          'รับชำระเงินจาก ' + tx.memberId, tx.totalAmount, 
          tx.paymentMethod, tx.recordedBy, 'Auto-sync', tx.timestamp
        ]);
        
        return sendResponse({ status: 'success', message: 'บันทึกสำเร็จ' });

      case 'deleteTransaction':
        var txId = data.id;
        var mId = data.memberId;
        // 1. คืนยอดหนี้ให้สมาชิก
        revertMemberBalancesFromTx(mSheet, tSheet, txId, mId);
        // 2. ลบออกจากตารางธุรกรรม
        deleteRowById(tSheet, txId);
        // 3. ลบรายการบัญชี Auto-sync ที่เกี่ยวข้อง
        deleteRowById(lSheet, 'L-TX-' + txId);
        return sendResponse({ status: 'success', message: 'ลบรายการและคืนยอดหนี้สำเร็จ' });
      
      case 'addMember':
        var m = data.member;
        mSheet.appendRow([
          m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.phone, 
          m.personalInfo.address, m.joinedDate, m.memberType, m.accumulatedShares, 
          m.savingsBalance, m.housingLoanBalance, m.landLoanBalance, m.generalLoanBalance,
          m.monthlyInstallment, m.missedInstallments
        ]);
        return sendResponse({ status: 'success', message: 'เพิ่มสมาชิกสำเร็จ' });

      case 'deleteMember':
        deleteRowById(mSheet, data.id);
        return sendResponse({ status: 'success', message: 'ลบสมาชิกสำเร็จ' });

      case 'updateMember':
        updateMemberData(mSheet, data.id, data.data);
        return sendResponse({ status: 'success', message: 'อัปเดตข้อมูลสำเร็จ' });

      case 'addLedgerItem':
        var item = data.item;
        lSheet.appendRow([
          item.id, item.date, item.type, item.category, item.description, 
          item.amount, item.paymentMethod, item.recordedBy, item.note || '', item.timestamp
        ]);
        return sendResponse({ status: 'success', message: 'บันทึกบัญชีสำเร็จ' });

      case 'deleteLedgerItem':
        deleteRowById(lSheet, data.id);
        return sendResponse({ status: 'success', message: 'ลบรายการบัญชีสำเร็จ' });

      default:
        return sendResponse({ status: 'error', message: 'ไม่พบ action นี้: ' + action });
    }
  } catch (err) {
    return sendResponse({ status: 'error', message: 'ข้อผิดพลาดการทำงาน: ' + err.toString() });
  }
}

function sendResponse(obj) {
  var jsonString = JSON.stringify(obj);
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
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
    tSheet.appendRow(['ID', 'MemberID', 'Date', 'Timestamp', 'Housing', 'Land', 'Shares', 'Savings', 'Welfare', 'Insurance', 'Donation', 'GeneralLoan', 'Others', 'Note', 'Total', 'RecordedBy', 'Method']);
  }
  if (lSheet.getLastRow() === 0 || force) {
    lSheet.clear();
    lSheet.appendRow(['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'PaymentMethod', 'RecordedBy', 'Note', 'Timestamp']);
  }
}

function formatDate(val) {
  if (!val) return "";
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
  } catch(e) {
    return String(val);
  }
}

function getMembersData(mSheet, tSheet) {
  var mRows = mSheet.getDataRange().getValues();
  var tRows = tSheet.getDataRange().getValues();
  if (mRows.length <= 1) return [];
  
  var txMap = {};
  for(var j=1; j<tRows.length; j++) {
    var mid = tRows[j][1];
    if(!txMap[mid]) txMap[mid] = [];
    txMap[mid].push({
      id: tRows[j][0], 
      date: formatDate(tRows[j][2]), 
      totalAmount: Number(tRows[j][14])||0, 
      recordedBy: tRows[j][15],
      housing: Number(tRows[j][4])||0, 
      land: Number(tRows[j][5])||0, 
      shares: Number(tRows[j][6])||0, 
      savings: Number(tRows[j][7])||0,
      generalLoan: Number(tRows[j][11])||0, 
      timestamp: Number(tRows[j][3])||0,
      paymentMethod: tRows[j][16],
      welfare: Number(tRows[j][8])||0,
      insurance: Number(tRows[j][9])||0,
      donation: Number(tRows[j][10])||0
    });
  }

  var members = [];
  for (var i = 1; i < mRows.length; i++) {
    var r = mRows[i];
    if (!r[0]) continue;
    members.push({
      id: String(r[0]), name: r[1], memberCode: String(r[2]),
      personalInfo: { idCard: String(r[3]), phone: String(r[4]), address: String(r[5]) },
      joinedDate: formatDate(r[6]), memberType: r[7],
      accumulatedShares: Number(r[8])||0, savingsBalance: Number(r[9])||0,
      housingLoanBalance: Number(r[10])||0, landLoanBalance: Number(r[11])||0,
      generalLoanBalance: Number(r[12])||0, monthlyInstallment: Number(r[13])||0,
      missedInstallments: Number(r[14])||0,
      transactions: txMap[r[0]] || []
    });
  }
  return members;
}

function getLedgerData(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var ledger = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    ledger.push({
      id: String(rows[i][0]), 
      date: formatDate(rows[i][1]), 
      type: String(rows[i][2]), 
      category: String(rows[i][3]), 
      description: String(rows[i][4]), 
      amount: Number(rows[i][5]), 
      paymentMethod: String(rows[i][6]),
      recordedBy: String(rows[i][7]), 
      note: String(rows[i][8]), 
      timestamp: Number(rows[i][9])
    });
  }
  return ledger;
}

function updateMemberBalancesFromTx(sheet, tx) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == tx.memberId) {
      var row = i + 1;
      sheet.getRange(row, 9).setValue((Number(data[i][8])||0) + (Number(tx.shares)||0));
      sheet.getRange(row, 10).setValue((Number(data[i][9])||0) + (Number(tx.savings)||0));
      sheet.getRange(row, 11).setValue(Math.max(0, (Number(data[i][10])||0) - (Number(tx.housing)||0)));
      sheet.getRange(row, 12).setValue(Math.max(0, (Number(data[i][11])||0) - (Number(tx.land)||0)));
      sheet.getRange(row, 13).setValue(Math.max(0, (Number(data[i][12])||0) - (Number(tx.generalLoan)||0)));
      break;
    }
  }
}

function revertMemberBalancesFromTx(mSheet, tSheet, txId, mId) {
  var tData = tSheet.getDataRange().getValues();
  var txRowData = null;
  for (var i = 1; i < tData.length; i++) {
    if (tData[i][0] == txId) {
      txRowData = tData[i];
      break;
    }
  }
  if (!txRowData) return;

  var mData = mSheet.getDataRange().getValues();
  for (var i = 1; i < mData.length; i++) {
    if (mData[i][0] == mId) {
      var row = i + 1;
      // Revert logic: Add back paid amounts to debts, subtract from assets
      mSheet.getRange(row, 9).setValue((Number(mData[i][8])||0) - (Number(txRowData[6])||0)); // Shares (col 7 in Sheet, index 6)
      mSheet.getRange(row, 10).setValue((Number(mData[i][9])||0) - (Number(txRowData[7])||0)); // Savings (col 8, index 7)
      mSheet.getRange(row, 11).setValue((Number(mData[i][10])||0) + (Number(txRowData[4])||0)); // Housing (col 5, index 4)
      mSheet.getRange(row, 12).setValue((Number(mData[i][11])||0) + (Number(txRowData[5])||0)); // Land (col 6, index 5)
      mSheet.getRange(row, 13).setValue((Number(mData[i][12])||0) + (Number(txRowData[11])||0)); // General (col 12, index 11)
      break;
    }
  }
}

function updateMemberData(sheet, id, updateData) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      var row = i + 1;
      if (updateData.name) sheet.getRange(row, 2).setValue(updateData.name);
      if (updateData.memberType) sheet.getRange(row, 8).setValue(updateData.memberType);
      if (updateData.joinedDate) sheet.getRange(row, 7).setValue(updateData.joinedDate);
      if (updateData.personalInfo) {
        if (updateData.personalInfo.idCard) sheet.getRange(row, 4).setValue(updateData.personalInfo.idCard);
        if (updateData.personalInfo.phone) sheet.getRange(row, 5).setValue(updateData.personalInfo.phone);
        if (updateData.personalInfo.address) sheet.getRange(row, 6).setValue(updateData.personalInfo.address);
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
