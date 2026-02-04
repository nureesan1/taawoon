
/**
 * TAAWOON COOP SYSTEM - BACKEND SCRIPT (STABLE VERSION 2.0)
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
// ** สำคัญ: ตรวจสอบ Channel Access Token ใน LINE Developers ให้ถูกต้อง **
const LINE_ACCESS_TOKEN = "96a450e6aad583f0c12860019eae0fc7"; 

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

// ระบบบันทึกข้อผิดพลาดลง Sheet เพื่อการตรวจสอบ
function logError(msg) {
  try {
    const ss = getSS();
    let logSheet = ss.getSheetByName("ErrorLogs");
    if (!logSheet) logSheet = ss.insertSheet("ErrorLogs");
    logSheet.appendRow([new Date(), msg]);
  } catch(e) {}
}

function doPost(e) {
  try {
    const rawContent = e.postData.contents;
    const contents = JSON.parse(rawContent);

    // 1. ตรวจสอบว่าเป็น LINE Webhook
    if (contents.events && contents.events.length > 0) {
      return handleLineWebhook(contents);
    }
    
    // 2. ตรวจสอบว่าเป็น Dialogflow
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
    }
    
    // 3. สำหรับ Web API ปกติ
    const action = contents.action || (contents.data && contents.data.action);
    const data = contents.data || {};
    
    switch (action) {
      case 'getData': return responseOK(handleGetData());
      case 'addMember': return responseOK(handleAddMember(data.member));
      case 'updateMember': return responseOK(handleUpdateMember(data.id, data.data));
      case 'deleteMember': return responseOK(handleDeleteMember(data.id));
      case 'addTransaction': return responseOK(handleAddTransaction(data.transaction));
      case 'deleteTransaction': return responseOK(handleDeleteTransaction(data.id, data.memberId));
      case 'addLedgerItem': return responseOK(handleAddLedgerItem(data.item));
      case 'deleteLedgerItem': return responseOK(handleDeleteLedgerItem(data.id));
      case 'initDatabase': return responseOK(handleInitDatabase());
      default: return responseOK({ message: "Action not found" });
    }
  } catch (err) {
    logError("doPost Main Error: " + err.message);
    return responseError(err.message);
  }
}

/* --- LINE LOGIC --- */

function handleLineWebhook(data) {
  const event = data.events[0];
  if (!event || !event.replyToken) return responseOK({});
  
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  if (event.type !== "message" || event.message.type !== "text") return responseOK({});

  const text = event.message.text.trim();
  const linked = getLinkedMember(userId);

  // กรณีที่ยังไม่ได้ผูกบัญชี
  if (!linked) {
    if (/^\d{13}$/.test(text)) {
      const member = findMemberByIdCard(text);
      if (member) {
        linkLineUser(userId, member.id, text);
        return replyLine(replyToken, [{ 
          type: "text", 
          text: "✅ ลงทะเบียนสำเร็จ!\nสวัสดีคุณ " + member.name + "\nท่านสามารถเลือกดูข้อมูลจากเมนูได้เลยครับ" 
        }]);
      } else {
        return replyLine(replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลเลขบัตร " + text + " ในระบบ\nกรุณาติดต่อเจ้าหน้าที่ครับ" }]);
      }
    } else {
      return replyLine(replyToken, [{ type: "text", text: "🙏 ยินดีต้อนรับสู่ระบบสหกรณ์ตะอาวุน\n\nกรุณาพิมพ์ *เลขบัตรประชาชน 13 หลัก* เพื่อเริ่มใช้งานครับ" }]);
    }
  }

  // กรณีที่ผูกบัญชีแล้ว
  const member = findMemberById(linked.memberId);
  if (!member) {
    unlinkLineUser(userId);
    return replyLine(replyToken, [{ type: "text", text: "⚠️ ไม่พบข้อมูลสมาชิก กรุณาลงทะเบียนใหม่ครับ" }]);
  }

  // ปรับปรุงการตรวจสอบคำสั่ง (ใช้ includes เพราะ Rich Menu อาจมีข้อความย่อย)
  if (text.includes("ยอดหนี้")) {
    return replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลยอดหนี้", contents: generateDebtFlex(member) }]);
  } else if (text.includes("หุ้นสะสม") || text.includes("ทุนเรือนหุ้น")) {
    return replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลหุ้นสะสม", contents: generateSharesFlex(member) }]);
  } else if (text.includes("เงินออมทรัพย์")) {
    return replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลเงินออมทรัพย์", contents: generateSharesFlex(member) }]);
  } else if (text.includes("ประวัติ") || text.includes("เว็บไซต์")) {
    return replyLine(replyToken, [{ type: "flex", altText: "ประวัติการชำระเงิน", contents: generateHistoryFlex(member) }]);
  } else if (text.includes("ข้อมูลสมาชิก")) {
    return replyLine(replyToken, [{ 
      type: "text", 
      text: "👤 ข้อมูลสมาชิก\nคุณ " + member.name + "\nรหัส: " + member.memberCode + "\nเลขบัตร: " + member.personalInfo.idCard + "\nสถานะ: " + (member.memberType === 'associate' ? 'สมาชิกสมทบ' : 'สมาชิกสามัญ') 
    }]);
  } else if (text.includes("ติดต่อ")) {
    return replyLine(replyToken, [{ 
      type: "text", 
      text: "☎️ ติดต่อเจ้าหน้าที่\nสหกรณ์ตะอาวุน จำกัด\nโทร: 089-595-2329\n(น.ส.นูรีซัน ไพเราะ)" 
    }]);
  } else if (text === "ยกเลิก") {
    unlinkLineUser(userId);
    return replyLine(replyToken, [{ type: "text", text: "🚫 ยกเลิกการผูกบัญชีเรียบร้อยแล้ว" }]);
  }

  return responseOK({});
}

function replyLine(replyToken, messages) {
  try {
    const url = "https://api.line.me/v2/bot/message/reply";
    const options = {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN },
      payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const resCode = response.getResponseCode();
    if (resCode !== 200) {
      logError("LINE Reply Error (" + resCode + "): " + response.getContentText());
    }
  } catch (e) {
    logError("replyLine Fetch Error: " + e.message);
  }
}

/* --- Database Helpers --- */

function findMemberByIdCard(idCard) {
  const ss = getSS();
  const members = getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions"));
  const cleanIn = idCard.replace(/\D/g, '');
  return members.find(m => m.personalInfo.idCard.replace(/\D/g, '') === cleanIn);
}

function findMemberById(id) {
  const ss = getSS();
  const members = getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions"));
  return members.find(m => String(m.id) === String(id));
}

function getLinkedMember(userId) {
  const sh = getSheet(getSS(), "LineUsers");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) return { memberId: data[i][1] };
  }
  return null;
}

function linkLineUser(userId, memberId, idCard) {
  getSheet(getSS(), "LineUsers").appendRow([userId, memberId, idCard, new Date()]);
}

function unlinkLineUser(userId) {
  const sh = getSheet(getSS(), "LineUsers");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) { sh.deleteRow(i + 1); break; }
  }
}

/* --- API Handlers --- */

function handleGetData() {
  const ss = getSS();
  return {
    members: getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions")),
    ledger: getSheet(ss, "Ledger").getDataRange().getValues().slice(1).map(r => ({
      id: String(r[0]), date: String(r[1]), type: String(r[2]), category: String(r[3]),
      description: String(r[4]), amount: Number(r[5])||0, paymentMethod: String(r[6]),
      recordedBy: String(r[7]), timestamp: Number(r[8])
    }))
  };
}

function getMembers(mSheet, tSheet) {
  const m = mSheet.getDataRange().getValues();
  const t = tSheet.getDataRange().getValues();
  if (m.length < 2) return [];

  const txMap = {};
  if (t.length >= 2) {
    t.slice(1).forEach(r => {
      const mid = String(r[1]);
      if (!mid) return;
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push({
        id: String(r[0]), date: String(r[2]), totalAmount: Number(r[12]) || 0,
        housing: Number(r[4])||0, land: Number(r[5])||0, shares: Number(r[6])||0, savings: Number(r[7])||0,
        generalLoan: Number(r[11])||0
      });
    });
  }

  return m.slice(1).map(r => ({
    id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), phone: String(r[5]), address: String(r[4]) },
    accumulatedShares: Number(r[8]) || 0, savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0, landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0, memberType: String(r[15]),
    transactions: txMap[String(r[0])] || []
  }));
}

function handleAddTransaction(tx) {
  const ss = getSS();
  const mSheet = getSheet(ss, "Members");
  const tSheet = getSheet(ss, "Transactions");
  const lSheet = getSheet(ss, "Ledger");
  
  tSheet.appendRow([
    tx.id, tx.memberId, tx.date, tx.timestamp,
    tx.housing, tx.land, tx.shares, tx.savings,
    tx.welfare, tx.insurance, tx.donation, tx.generalLoan,
    tx.totalAmount, tx.recordedBy, tx.paymentMethod
  ]);
  
  const mData = mSheet.getDataRange().getValues();
  for (let i = 1; i < mData.length; i++) {
    if (String(mData[i][0]) === String(tx.memberId)) {
      mSheet.getRange(i + 1, 9).setValue((Number(mData[i][8]) || 0) + (Number(tx.shares) || 0));
      mSheet.getRange(i + 1, 10).setValue((Number(mData[i][9]) || 0) + (Number(tx.savings) || 0));
      mSheet.getRange(i + 1, 11).setValue(Math.max(0, (Number(mData[i][10]) || 0) - (Number(tx.housing) || 0)));
      mSheet.getRange(i + 1, 12).setValue(Math.max(0, (Number(mData[i][11]) || 0) - (Number(tx.land) || 0)));
      mSheet.getRange(i + 1, 13).setValue(Math.max(0, (Number(mData[i][12]) || 0) - (Number(tx.generalLoan) || 0)));
      break;
    }
  }
  
  lSheet.appendRow(["L-TX-" + tx.id, tx.date, "income", "รับชำระเงินสมาชิก", "รับจากสมาชิก " + tx.memberId, tx.totalAmount, tx.paymentMethod, tx.recordedBy, tx.timestamp]);
  return { message: "Success" };
}

function handleAddMember(m) {
  getSheet(getSS(), "Members").appendRow([m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.address, m.personalInfo.phone, m.joinedDate, "", m.accumulatedShares, m.savingsBalance, m.housingLoanBalance, m.landLoanBalance, m.generalLoanBalance, m.monthlyInstallment, m.missedInstallments, m.memberType]);
  return { message: "Success" };
}

function handleUpdateMember(id, data) {
  const sh = getSheet(getSS(), "Members");
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      if (data.name !== undefined) sh.getRange(i+1, 2).setValue(data.name);
      if (data.accumulatedShares !== undefined) sh.getRange(i+1, 9).setValue(data.accumulatedShares);
      if (data.savingsBalance !== undefined) sh.getRange(i+1, 10).setValue(data.savingsBalance);
      if (data.housingLoanBalance !== undefined) sh.getRange(i+1, 11).setValue(data.housingLoanBalance);
      if (data.landLoanBalance !== undefined) sh.getRange(i+1, 12).setValue(data.landLoanBalance);
      if (data.generalLoanBalance !== undefined) sh.getRange(i+1, 13).setValue(data.generalLoanBalance);
      break;
    }
  }
  return { message: "Success" };
}

function handleDeleteMember(id) {
  const sh = getSheet(getSS(), "Members");
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sh.deleteRow(i + 1); break; }
  }
  return { message: "Success" };
}

function handleDeleteTransaction(id, mId) {
  const ss = getSS();
  const tSheet = getSheet(ss, "Transactions");
  const mSheet = getSheet(ss, "Members");
  const tData = tSheet.getDataRange().getValues();
  for (let i = 1; i < tData.length; i++) {
    if (String(tData[i][0]) === String(id)) { tSheet.deleteRow(i + 1); break; }
  }
  return { message: "Success" };
}

function handleAddLedgerItem(item) {
  getSheet(getSS(), "Ledger").appendRow([item.id, item.date, item.type, item.category, item.description, item.amount, item.paymentMethod, item.recordedBy, item.timestamp]);
  return { message: "Success" };
}

function handleDeleteLedgerItem(id) {
  const sh = getSheet(getSS(), "Ledger");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); break; }
  }
  return { message: "Success" };
}

function handleInitDatabase() {
  const ss = getSS();
  getSheet(ss, "Members").getRange(1, 1, 1, 16).setValues([["ID", "Name", "MemberCode", "IDCard", "Address", "Phone", "JoinedDate", "DOB", "Shares", "Savings", "Housing", "Land", "General", "Monthly", "Missed", "Type"]]);
  getSheet(ss, "Transactions").getRange(1, 1, 1, 15).setValues([["ID", "MemberID", "Date", "Timestamp", "Housing", "Land", "Shares", "Savings", "Welfare", "Insurance", "Donation", "General", "Total", "By", "Method"]]);
  getSheet(ss, "Ledger").getRange(1, 1, 1, 9).setValues([["ID", "Date", "Type", "Category", "Desc", "Amount", "Method", "By", "Timestamp"]]);
  getSheet(ss, "LineUsers").getRange(1, 1, 1, 4).setValues([["UserID", "MemberID", "IDCard", "LinkedAt"]]);
  return { message: "Success" };
}

function getSheet(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }

/* --- Flex Message Generators (Robust Version) --- */

function generateDebtFlex(member) {
  const total = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#064E3B", "contents": [{ "type": "text", "text": "📈 ภาระหนี้สินคงเหลือ", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "คุณ " + String(member.name), "size": "sm", "weight": "bold" },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ยอดหนี้รวม", "flex": 1, "size": "sm" }, { "type": "text", "text": total.toLocaleString() + " บาท", "flex": 0, "weight": "bold", "color": "#EF4444" }] },
      { "type": "separator" },
      { "type": "box", "layout": "vertical", "spacing": "xs", "contents": [
        { "type": "text", "text": "• ค่าบ้าน: " + (member.housingLoanBalance || 0).toLocaleString() + " ฿", "size": "xs", "color": "#6B7280" },
        { "type": "text", "text": "• ค่าที่ดิน: " + (member.landLoanBalance || 0).toLocaleString() + " ฿", "size": "xs", "color": "#6B7280" },
        { "type": "text", "text": "• สินเชื่อทั่วไป: " + (member.generalLoanBalance || 0).toLocaleString() + " ฿", "size": "xs", "color": "#6B7280" }
      ]}
    ]}
  };
}

function generateSharesFlex(member) {
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#0D9488", "contents": [{ "type": "text", "text": "🏛️ ทุนเรือนหุ้นและเงินฝาก", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หุ้นสะสม", "flex": 1, "size": "sm" }, { "type": "text", "text": (member.accumulatedShares || 0).toLocaleString() + " ฿", "flex": 0, "weight": "bold", "color": "#0D9488" }] },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "เงินออมทรัพย์", "flex": 1, "size": "sm" }, { "type": "text", "text": (member.savingsBalance || 0).toLocaleString() + " ฿", "flex": 0, "weight": "bold", "color": "#059669" }] }
    ]}
  };
}

function generateHistoryFlex(member) {
  const txs = (member.transactions || []).slice(-5).reverse();
  const rows = txs.map(tx => ({
    "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": String(tx.date), "size": "xs", "flex": 1 }, { "type": "text", "text": (tx.totalAmount || 0).toLocaleString() + " ฿", "size": "xs", "weight": "bold", "align": "end" }]
  }));
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#374151", "contents": [{ "type": "text", "text": "📜 ประวัติชำระล่าสุด", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": rows.length > 0 ? rows : [{ "type": "text", "text": "ไม่พบประวัติการชำระ" }] }
  };
}
