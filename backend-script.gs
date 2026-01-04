
/**
 * Google Apps Script for Taawoon Cooperative System (Enhanced Version)
 * ------------------------------------------------------------------
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var memberSheet = ss.getSheetByName('Members');
  var transSheet = ss.getSheetByName('Transactions');
  var ledgerSheet = ss.getSheetByName('Ledger');
  
  if (!memberSheet) memberSheet = ss.insertSheet('Members');
  if (!transSheet) transSheet = ss.insertSheet('Transactions');
  if (!ledgerSheet) ledgerSheet = ss.insertSheet('Ledger');

  var requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return createResponse('error', 'Invalid JSON input');
  }

  var action = requestData.action;

  try {
    switch (action) {
      case 'getData':
        return createResponse('success', { 
          members: getMembersData(memberSheet, transSheet),
          ledger: getLedgerData(ledgerSheet)
        });

      case 'addTransaction':
        var tx = requestData.transaction;
        
        // 1. บันทึกลง Transaction Sheet (ประวัติรายบุคคล)
        transSheet.appendRow([
          tx.id, tx.memberId, tx.date, tx.timestamp, 
          tx.housing || 0, tx.land || 0, tx.shares || 0, tx.savings || 0, 
          tx.welfare || 0, tx.insurance || 0, tx.donation || 0, tx.generalLoan || 0, 
          tx.others || 0, tx.othersNote || '', tx.totalAmount || 0, 
          tx.recordedBy || 'System', tx.paymentMethod || 'cash'
        ]);

        // 2. บันทึกลง Ledger Sheet (รายรับ-รายจ่ายส่วนกลาง) - อัตโนมัติ
        var memberName = getMemberNameById(memberSheet, tx.memberId);
        ledgerSheet.appendRow([
          'L' + tx.timestamp, 
          tx.date, 
          'income', 
          'รายได้', 
          'รับชำระเงินจากสมาชิก: ' + memberName, 
          tx.totalAmount, 
          tx.paymentMethod, 
          tx.recordedBy, 
          'บันทึกอัตโนมัติจากระบบรับชำระเงินสมาชิก', 
          tx.timestamp
        ]);

        // 3. อัปเดตยอดคงเหลือใน Member Sheet
        updateMemberBalancesFromTx(memberSheet, tx);
        
        return createResponse('success', 'บันทึกการชำระเงินและรายรับเข้าบัญชีกลางสำเร็จ');

      case 'addLedgerItem':
        var item = requestData.item;
        ledgerSheet.appendRow([
          item.id, item.date, item.type, item.category, 
          item.description, item.amount, item.paymentMethod, 
          item.recordedBy, item.note || '', item.timestamp
        ]);
        return createResponse('success', 'บันทึกรายรับ-รายจ่ายสำเร็จ');

      case 'deleteLedgerItem':
        deleteRowById(ledgerSheet, requestData.id);
        return createResponse('success', 'ลบรายการบัญชีสำเร็จ');

      case 'addMember':
        var m = requestData.member;
        memberSheet.appendRow([
          m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.phone, 
          m.personalInfo.address, m.joinedDate, m.memberType, m.accumulatedShares || 0, 
          m.savingsBalance || 0, m.housingLoanBalance || 0, m.landLoanBalance || 0, 
          m.generalLoanBalance || 0, m.monthlyInstallment || 0, m.missedInstallments || 0
        ]);
        return createResponse('success', 'เพิ่มสมาชิกสำเร็จ');

      case 'updateMember':
        updateMemberData(memberSheet, requestData.id, requestData.data);
        return createResponse('success', 'อัปเดตข้อมูลสมาชิกสำเร็จ');

      case 'deleteMember':
        deleteRowById(memberSheet, requestData.id);
        return createResponse('success', 'ลบข้อมูลสมาชิกสำเร็จ');

      default:
        return createResponse('error', 'Unknown action: ' + action);
    }
  } catch (err) {
    return createResponse('error', err.toString());
  }
}

// --- Helper Functions ---

function getMemberNameById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) return data[i][1];
  }
  return "ไม่ระบุชื่อ";
}

function createResponse(status, data) {
  var output = { status: status };
  if (status === 'success') {
    if (typeof data === 'object') Object.assign(output, data);
    else output.message = data;
  } else output.message = data;
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function getMembersData(memberSheet, transSheet) {
  var mRows = memberSheet.getDataRange().getValues();
  var tRows = transSheet.getDataRange().getValues();
  if (mRows.length <= 1) return [];

  var transactionsByMember = {};
  for (var j = 1; j < tRows.length; j++) {
    var mid = tRows[j][1];
    if (!transactionsByMember[mid]) transactionsByMember[mid] = [];
    transactionsByMember[mid].push({
      id: tRows[j][0], memberId: tRows[j][1], date: tRows[j][2], timestamp: tRows[j][3],
      housing: tRows[j][4], land: tRows[j][5], shares: tRows[j][6], savings: tRows[j][7],
      welfare: tRows[j][8], insurance: tRows[j][9], donation: tRows[j][10], generalLoan: tRows[j][11],
      others: tRows[j][12], othersNote: tRows[j][13], totalAmount: tRows[j][14], recordedBy: tRows[j][15],
      paymentMethod: tRows[j][16] || 'cash'
    });
  }

  var members = [];
  for (var i = 1; i < mRows.length; i++) {
    var m = mRows[i];
    members.push({
      id: m[0], name: m[1], memberCode: m[2],
      personalInfo: { idCard: m[3], phone: m[4], address: m[5] },
      joinedDate: m[6], memberType: m[7], accumulatedShares: Number(m[8]) || 0,
      savingsBalance: Number(m[9]) || 0, housingLoanBalance: Number(m[10]) || 0,
      landLoanBalance: Number(m[11]) || 0, generalLoanBalance: Number(m[12]) || 0,
      monthlyInstallment: Number(m[13]) || 0, missedInstallments: Number(m[14]) || 0,
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
