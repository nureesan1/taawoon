
/**
 * Google Apps Script for Taawoon Cooperative System
 * ------------------------------------------------
 * Sheets Required:
 * 1. 'Members' (Cols: ID, Name, MemberCode, IDCard, Phone, Address, JoinedDate, MemberType, Shares, Savings, HousingLoan, LandLoan, GeneralLoan, MonthlyInstallment, MissedInstallments)
 * 2. 'Transactions' (Cols: ID, MemberID, Date, Timestamp, Housing, Land, Shares, Savings, Welfare, Insurance, Donation, GeneralLoan, Others, OthersNote, TotalAmount, RecordedBy)
 */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var memberSheet = ss.getSheetByName('Members');
  var transSheet = ss.getSheetByName('Transactions');
  
  if (!memberSheet || !transSheet) {
    return createResponse('error', 'ไม่พบแผ่นงาน Members หรือ Transactions กรุณาตรวจสอบการตั้งชื่อ');
  }

  var requestData = JSON.parse(e.postData.contents);
  var action = requestData.action;

  try {
    switch (action) {
      case 'getData':
        return createResponse('success', { members: getMembersData(memberSheet, transSheet) });

      case 'addTransaction':
        var tx = requestData.transaction;
        transSheet.appendRow([
          tx.id, tx.memberId, tx.date, tx.timestamp, tx.housing, tx.land, 
          tx.shares, tx.savings, tx.welfare, tx.insurance, tx.donation, 
          tx.generalLoan, tx.others || 0, tx.othersNote || '', tx.totalAmount, tx.recordedBy
        ]);
        updateMemberBalancesFromTx(memberSheet, tx);
        return createResponse('success', 'บันทึกรายการสำเร็จ');

      case 'addMember':
        var m = requestData.member;
        memberSheet.appendRow([
          m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.phone, 
          m.personalInfo.address, m.joinedDate, m.memberType, m.accumulatedShares, 
          m.savingsBalance, m.housingLoanBalance, m.landLoanBalance, m.generalLoanBalance,
          m.monthlyInstallment, m.missedInstallments
        ]);
        return createResponse('success', 'เพิ่มสมาชิกสำเร็จ');

      case 'updateMember':
        updateMemberData(memberSheet, requestData.id, requestData.data);
        return createResponse('success', 'อัปเดตข้อมูลสำเร็จ');

      case 'deleteMember':
        deleteRowById(memberSheet, requestData.id);
        // Optional: deleteMemberTransactions(transSheet, requestData.id);
        return createResponse('success', 'ลบข้อมูลสำเร็จ');

      default:
        return createResponse('error', 'Unknown action: ' + action);
    }
  } catch (err) {
    return createResponse('error', err.toString());
  }
}

function createResponse(status, data) {
  var output = { status: status };
  if (status === 'success') {
    if (typeof data === 'object') {
      Object.assign(output, data);
    } else {
      output.message = data;
    }
  } else {
    output.message = data;
  }
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}

function getMembersData(memberSheet, transSheet) {
  var mRows = memberSheet.getDataRange().getValues();
  var tRows = transSheet.getDataRange().getValues();
  var members = [];
  
  // Skip header row
  for (var i = 1; i < mRows.length; i++) {
    var m = mRows[i];
    var memberId = m[0];
    var transactions = [];
    
    for (var j = 1; j < tRows.length; j++) {
      if (tRows[j][1] === memberId) {
        transactions.push({
          id: tRows[j][0],
          memberId: tRows[j][1],
          date: tRows[j][2],
          timestamp: tRows[j][3],
          housing: tRows[j][4],
          land: tRows[j][5],
          shares: tRows[j][6],
          savings: tRows[j][7],
          welfare: tRows[j][8],
          insurance: tRows[j][9],
          donation: tRows[j][10],
          generalLoan: tRows[j][11],
          others: tRows[j][12],
          othersNote: tRows[j][13],
          totalAmount: tRows[j][14],
          recordedBy: tRows[j][15]
        });
      }
    }
    
    members.push({
      id: memberId,
      name: m[1],
      memberCode: m[2],
      personalInfo: { idCard: m[3], phone: m[4], address: m[5] },
      joinedDate: m[6],
      memberType: m[7],
      accumulatedShares: m[8],
      savingsBalance: m[9],
      housingLoanBalance: m[10],
      landLoanBalance: m[11],
      generalLoanBalance: m[12],
      monthlyInstallment: m[13],
      missedInstallments: m[14],
      transactions: transactions.sort((a,b) => b.timestamp - a.timestamp)
    });
  }
  return members;
}

function updateMemberBalancesFromTx(sheet, tx) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === tx.memberId) {
      var row = i + 1;
      sheet.getRange(row, 9).setValue(data[i][8] + tx.shares); // Shares
      sheet.getRange(row, 10).setValue(data[i][9] + tx.savings); // Savings
      sheet.getRange(row, 11).setValue(Math.max(0, data[i][10] - tx.housing)); // Housing Debt
      sheet.getRange(row, 12).setValue(Math.max(0, data[i][11] - tx.land)); // Land Debt
      sheet.getRange(row, 13).setValue(Math.max(0, data[i][12] - tx.generalLoan)); // General Debt
      break;
    }
  }
}

function updateMemberData(sheet, id, updateData) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
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
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}
