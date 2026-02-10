
/**
 * TAAWOON COOP SYSTEM - BACKEND SCRIPT (STABLE VERSION 4.0)
 * ระบบตรวจสอบหนี้สมาชิก - รองรับ Dialogflow Intents เต็มรูปแบบ
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_ACCESS_TOKEN = "96a450e6aad583f0c12860019eae0fc7"; 

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

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

    // 1. ตรวจสอบว่ามาจาก Dialogflow Fulfillment หรือไม่
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
    }
    
    // 2. ตรวจสอบว่ามาจาก LINE Webhook ตรงหรือไม่
    if (contents.events && contents.events.length > 0) {
      return handleLineWebhook(contents);
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

/* --- Dialogflow Fulfillment Handler --- */

function handleDialogflowFulfillment(contents) {
  const intentName = contents.queryResult.intent.displayName;
  const payload = contents.originalDetectIntentRequest.payload;
  
  // ตรวจสอบที่มาของข้อมูล (ต้องมาจาก LINE)
  if (!payload || !payload.data || !payload.data.source) {
    return responseDialogflow("ระบบรองรับการใช้งานผ่าน LINE เท่านั้นครับ");
  }

  const userId = payload.data.source.userId;
  const linked = getLinkedMember(userId);

  // กรณี Intent พื้นฐานที่มักไม่ต้องใช้ข้อมูลสมาชิก
  if (intentName === 'Default Welcome Intent') {
    return responseDialogflow("ยินดีต้อนรับสู่ สหกรณ์ตะอาวุน ครับ\nกรุณาเลือกเมนูที่ท่านต้องการ หรือพิมพ์เลขบัตรประชาชนเพื่อลงทะเบียนครับ");
  }

  // ตรวจสอบการลงทะเบียน
  if (!linked) {
    return responseDialogflow("⚠️ ท่านยังไม่ได้ลงทะเบียนสมาชิกกับระบบ LINE\nกรุณาพิมพ์ *เลขบัตรประชาชน 13 หลัก* เพื่อเริ่มใช้งานครับ");
  }

  const member = findMemberById(linked.memberId);
  if (!member) return responseDialogflow("❌ ขออภัย ไม่พบข้อมูลสมาชิกของท่านในฐานข้อมูลปัจจุบัน");

  let message = null;

  // การจัดการตามรายชื่อ Intent
  switch (intentName) {
    case 'Check_Debt':
    case 'CheckBalance':
      message = { type: "flex", altText: "ข้อมูลยอดหนี้", contents: generateDebtFlex(member) };
      break;

    case 'Check_Shares':
      message = { type: "flex", altText: "ข้อมูลหุ้นสะสม", contents: generateSharesFlex(member, 'shares') };
      break;

    case 'Check_Savings':
      message = { type: "flex", altText: "ข้อมูลเงินออมทรัพย์", contents: generateSharesFlex(member, 'savings') };
      break;

    case 'Check_History':
    case 'taawoon-accounting':
      message = { type: "flex", altText: "ประวัติการชำระเงิน", contents: generateHistoryFlex(member) };
      break;

    case 'CheckMemberInfo':
    case 'Member_Profile':
      const profile = "👤 ข้อมูลสมาชิก\n" +
                      "ชื่อ: " + member.name + "\n" +
                      "รหัส: " + member.memberCode + "\n" +
                      "เลขบัตร: " + maskIdCard(member.personalInfo.idCard) + "\n" +
                      "ประเภท: " + (member.memberType === 'associate' ? 'สมาชิกสมทบ' : 'สมาชิกสามัญ');
      message = { type: "text", text: profile };
      break;

    case 'Contact_Staff':
    case 'ContactStaff':
      message = { type: "text", text: "☎️ ติดต่อเจ้าหน้าที่สหกรณ์\nโทร: 089-595-2329\n(น.ส.นูรีซัน ไพเราะ - ฝ่ายการเงิน)" };
      break;

    case 'Unlink_Account':
      unlinkLineUser(userId);
      message = { type: "text", text: "🚫 ทำการยกเลิกการผูกบัญชีเรียบร้อยแล้ว\nหากต้องการใช้งานใหม่ กรุณาส่งเลขบัตรประชาชนอีกครั้งครับ" };
      break;

    default:
      message = { type: "text", text: "รับทราบครับ ท่านต้องการให้ผมช่วยเรื่องอะไรเพิ่มเติมไหมครับ?" };
  }

  // ส่งคำตอบกลับไปยัง Dialogflow เพื่อแสดงใน LINE
  return ContentService.createTextOutput(JSON.stringify({
    fulfillmentMessages: [{ payload: { line: message } }]
  })).setMimeType(ContentService.MimeType.JSON);
}

function responseDialogflow(text) {
  return ContentService.createTextOutput(JSON.stringify({
    fulfillmentText: text
  })).setMimeType(ContentService.MimeType.JSON);
}

/* --- LINE LOGIC --- */

function handleLineWebhook(data) {
  const event = data.events[0];
  if (!event || !event.replyToken) return responseOK({});
  
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const text = (event.message.text || "").trim();

  // จัดการการลงทะเบียนผ่านเลขบัตร 13 หลัก
  if (/^\d{13}$/.test(text)) {
    const member = findMemberByIdCard(text);
    if (member) {
      if (getLinkedMember(userId)) unlinkLineUser(userId); // ลบของเก่าถ้ามี
      linkLineUser(userId, member.id, text);
      return replyLine(replyToken, [{ type: "text", text: "✅ ลงทะเบียนสำเร็จ!\nสวัสดีคุณ " + member.name + "\nท่านสามารถใช้งานเมนูตรวจสอบยอดได้ทันทีครับ" }]);
    } else {
      return replyLine(replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลเลขบัตรประชาชนนี้ในระบบสหกรณ์\nกรุณาติดต่อเจ้าหน้าที่เพื่อปรับปรุงข้อมูลครับ" }]);
    }
  }

  return responseOK({});
}

function replyLine(replyToken, messages) {
  try {
    const url = "https://api.line.me/v2/bot/message/reply";
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN },
      payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
      muteHttpExceptions: true
    });
  } catch (e) { logError("replyLine Error: " + e.message); }
}

/* --- Helpers & Data Logic --- */

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

function findMemberByIdCard(idCard) {
  const members = handleGetData().members;
  const clean = idCard.replace(/\D/g, '');
  return members.find(m => m.personalInfo.idCard.replace(/\D/g, '') === clean);
}

function findMemberById(id) {
  const members = handleGetData().members;
  return members.find(m => String(m.id) === String(id));
}

function maskIdCard(id) {
  if (!id || id.length < 13) return id;
  return id.substring(0, 1) + "-XXXX-XXXXX-" + id.substring(11, 13);
}

function handleGetData() {
  const ss = getSS();
  const mSheet = getSheet(ss, "Members");
  const tSheet = getSheet(ss, "Transactions");
  const lSheet = getSheet(ss, "Ledger");
  const mData = mSheet.getDataRange().getValues();
  const tData = tSheet.getDataRange().getValues();
  const lData = lSheet.getDataRange().getValues();

  const txMap = {};
  if (tData.length > 1) {
    tData.slice(1).forEach(r => {
      const mid = String(r[1]);
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push({ 
        id: String(r[0]), 
        date: String(r[2]), 
        timestamp: Number(r[3]),
        housing: Number(r[4]) || 0,
        land: Number(r[5]) || 0,
        shares: Number(r[6]) || 0,
        savings: Number(r[7]) || 0,
        welfare: Number(r[8]) || 0,
        insurance: Number(r[9]) || 0,
        donation: Number(r[10]) || 0,
        generalLoan: Number(r[11]) || 0,
        totalAmount: Number(r[12]) || 0
      });
    });
  }

  const members = mData.slice(1).map(r => ({
    id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), phone: String(r[5]), address: String(r[4]) },
    accumulatedShares: Number(r[8]) || 0, savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0, landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0, memberType: String(r[15]),
    transactions: txMap[String(r[0])] || []
  }));

  const ledger = lData.slice(1).map(r => ({
    id: String(r[0]), date: String(r[1]), type: String(r[2]), category: String(r[3]),
    description: String(r[4]), amount: Number(r[5]) || 0, paymentMethod: String(r[6]),
    recordedBy: String(r[7]), timestamp: Number(r[8])
  }));

  return { members, ledger };
}

function handleAddTransaction(tx) {
  const ss = getSS();
  const mSheet = getSheet(ss, "Members");
  const tSheet = getSheet(ss, "Transactions");
  const lSheet = getSheet(ss, "Ledger");
  tSheet.appendRow([tx.id, tx.memberId, tx.date, tx.timestamp, tx.housing, tx.land, tx.shares, tx.savings, tx.welfare, tx.insurance, tx.donation, tx.generalLoan, tx.totalAmount, tx.recordedBy, tx.paymentMethod]);
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
  return { status: "success" };
}

function handleAddMember(m) {
  getSheet(getSS(), "Members").appendRow([m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.address, m.personalInfo.phone, m.joinedDate, "", m.accumulatedShares, m.savingsBalance, m.housingLoanBalance, m.landLoanBalance, m.generalLoanBalance, m.monthlyInstallment, m.missedInstallments, m.memberType]);
  return { status: "success" };
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
  return { status: "success" };
}

function handleDeleteMember(id) {
  const sh = getSheet(getSS(), "Members");
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: "success" };
}

function handleDeleteTransaction(id, mId) {
  const ss = getSS();
  const tSheet = getSheet(ss, "Transactions");
  const tData = tSheet.getDataRange().getValues();
  for (let i = 1; i < tData.length; i++) {
    if (String(tData[i][0]) === String(id)) { tSheet.deleteRow(i + 1); break; }
  }
  return { status: "success" };
}

function handleAddLedgerItem(item) {
  getSheet(getSS(), "Ledger").appendRow([item.id, item.date, item.type, item.category, item.description, item.amount, item.paymentMethod, item.recordedBy, item.timestamp]);
  return { status: "success" };
}

function handleDeleteLedgerItem(id) {
  const sh = getSheet(getSS(), "Ledger");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); break; }
  }
  return { status: "success" };
}

function handleInitDatabase() {
  const ss = getSS();
  getSheet(ss, "Members").getRange(1, 1, 1, 16).setValues([["ID", "Name", "MemberCode", "IDCard", "Address", "Phone", "JoinedDate", "DOB", "Shares", "Savings", "Housing", "Land", "General", "Monthly", "Missed", "Type"]]);
  getSheet(ss, "Transactions").getRange(1, 1, 1, 15).setValues([["ID", "MemberID", "Date", "Timestamp", "Housing", "Land", "Shares", "Savings", "Welfare", "Insurance", "Donation", "General", "Total", "By", "Method"]]);
  getSheet(ss, "Ledger").getRange(1, 1, 1, 9).setValues([["ID", "Date", "Type", "Category", "Desc", "Amount", "Method", "By", "Timestamp"]]);
  getSheet(ss, "LineUsers").getRange(1, 1, 1, 4).setValues([["UserID", "MemberID", "IDCard", "LinkedAt"]]);
  return { status: "success" };
}

function getSheet(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }

/* --- Flex Message Generators --- */

function generateDebtFlex(member) {
  const total = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#064E3B", "contents": [{ "type": "text", "text": "📈 ยอดหนี้คงเหลือ", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "คุณ " + member.name, "weight": "bold", "size": "sm" },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ยอดรวมทั้งสิ้น", "flex": 1, "size": "sm" }, { "type": "text", "text": total.toLocaleString() + " ฿", "flex": 0, "weight": "bold", "color": "#EF4444" }] },
      { "type": "separator" },
      { "type": "box", "layout": "vertical", "spacing": "xs", "contents": [
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "• ค่าบ้าน", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": (member.housingLoanBalance || 0).toLocaleString() + " ฿", "size": "xs", "align": "end" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "• ค่าที่ดิน", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": (member.landLoanBalance || 0).toLocaleString() + " ฿", "size": "xs", "align": "end" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "• สินเชื่อทั่วไป", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": (member.generalLoanBalance || 0).toLocaleString() + " ฿", "size": "xs", "align": "end" }] }
      ]}
    ]}
  };
}

function generateSharesFlex(member, type) {
  const isShares = type === 'shares';
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": isShares ? "#0D9488" : "#059669", "contents": [{ "type": "text", "text": isShares ? "🏛️ ทุนเรือนหุ้น" : "💰 เงินออมทรัพย์", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "คุณ " + member.name, "weight": "bold", "size": "sm" },
      { "type": "box", "layout": "horizontal", "contents": [
        { "type": "text", "text": isShares ? "หุ้นสะสมทั้งหมด" : "ยอดเงินฝากปัจจุบัน", "flex": 1, "size": "sm" },
        { "type": "text", "text": (isShares ? member.accumulatedShares : member.savingsBalance).toLocaleString() + " ฿", "flex": 0, "weight": "bold", "color": isShares ? "#0D9488" : "#059669" }
      ]}
    ]}
  };
}

function generateHistoryFlex(member) {
  const txs = (member.transactions || []).slice(-5).reverse();
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#374151", "contents": [{ "type": "text", "text": "📜 ประวัติชำระ 5 ครั้งล่าสุด", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": txs.length > 0 ? txs.map(tx => ({
      "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": String(tx.date), "size": "xs", "flex": 1 }, { "type": "text", "text": Number(tx.totalAmount).toLocaleString() + " ฿", "size": "xs", "weight": "bold", "align": "end" }]
    })) : [{ "type": "text", "text": "ไม่พบประวัติการชำระเงิน", "size": "sm", "color": "#9CA3AF", "align": "center" }] }
  };
}
