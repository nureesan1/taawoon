
/**
 * TAAWOON COOP SYSTEM - BACKEND SCRIPT (STABLE VERSION 16.0)
 * แก้ไขปัญหา: Cannot read properties of undefined (reading 'postData')
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_ACCESS_TOKEN = "fSC99nQ32pISc+43cC4rkIsuxVsVhF4AmSqGCZ3qL/pgyUaAKgAkFERipkTqN66G9LCL/qC9eEhIsg7VIfshepVsSQi/QvGsyUbBj4eNzaKsCwPM8c83GlNUv4oibxX/bmTniEAWBKmcGp3JCImSHQdB04t89/1O/w1cDnyilFU="; 

// --- 1. ENTRY POINTS ---

/**
 * ฟังก์ชันตรวจสอบสถานะ (Health Check) 
 * เมื่อเปิดลิงก์สคริปต์ผ่านเบราว์เซอร์โดยตรง
 */
function doGet(e) {
  return ContentService.createTextOutput("🚀 ระบบสหกรณ์ตะอาวุนทำงานปกติ (System is Online)")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * ฟังก์ชันรับข้อมูล (Main Webhook & API)
 */
function doPost(e) {
  try {
    // ป้องกัน Error หาก e หรือ postData ไม่มีค่า
    if (!e) {
      logError("สคริปต์ถูกเรียกโดยไม่มีพารามิเตอร์ (อาจเกิดจากการกดปุ่ม Run ใน Editor)");
      return responseError("No parameters provided. Please use HTTP POST to call this script.");
    }

    let contents;
    
    // ก) ตรวจสอบว่าเป็น JSON Payload (จาก Dialogflow)
    if (e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    } 
    // ข) ตรวจสอบว่าเป็น Form Data (จาก WebApp หรือเครื่องมือทดสอบอื่นๆ)
    else if (e.parameter && e.parameter.action) {
      contents = {
        action: e.parameter.action,
        data: e.parameter.data ? JSON.parse(e.parameter.data) : {}
      };
    } 
    else {
      logError("รูปแบบข้อมูลไม่ถูกต้องหรือไม่ได้รับข้อมูล");
      return responseError("Invalid request format");
    }

    // ประมวลผลตามประเภทข้อมูลที่ได้รับ
    
    // 1. หากมาจาก Dialogflow (Fulfillment)
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
    }
    
    // 2. หากมาจาก LINE Webhook
    if (contents.events && contents.events.length > 0) {
      return handleLineWebhook(contents);
    }
    
    // 3. หากมาจาก WebApp Dashboard
    const action = contents.action;
    const data = contents.data || {};
    
    if (action) {
      switch (action) {
        case 'getData': return responseOK(handleGetData());
        case 'addMember': return responseOK(handleAddMember(data.member));
        case 'updateMember': return responseOK(handleUpdateMember(data.id, data.data));
        case 'deleteMember': return responseOK(handleDeleteMember(data.id));
        case 'addTransaction': return responseOK(handleAddTransaction(data.transaction));
        case 'deleteTransaction': return responseOK(handleDeleteTransaction(data.id, data.memberId));
        case 'initDatabase': return responseOK(handleInitDatabase());
        default: return responseOK({ message: "Action '" + action + "' not found" });
      }
    }

    return responseOK({ message: "Request received but no action taken" });

  } catch (err) {
    logError("Main Error: " + err.message);
    return responseError(err.message);
  }
}

// --- 2. DIALOGFLOW FULFILLMENT LOGIC ---

function handleDialogflowFulfillment(contents) {
  try {
    const queryResult = contents.queryResult;
    const queryText = (queryResult.queryText || "").trim();
    const intentName = (queryResult.intent.displayName || "").trim().toLowerCase();
    const payload = contents.originalDetectIntentRequest ? contents.originalDetectIntentRequest.payload : null;
    
    if (!payload || !payload.data || !payload.data.source) {
      return responseDialogflow("⚠️ กรุณาใช้งานผ่าน LINE เท่านั้นครับ");
    }
    
    const userId = payload.data.source.userId;
    const linked = getLinkedMember(userId);

    if (/^\d{13}$/.test(queryText)) {
      const member = findMemberByIdCard(queryText);
      if (member) {
        if (linked) unlinkLineUser(userId);
        linkLineUser(userId, member.id, queryText);
        return responseDialogflow("✅ ลงทะเบียนสำเร็จ!\nสวัสดีคุณ " + member.name + "\nตอนนี้ท่านสามารถเช็คยอดหนี้และเงินออมได้แล้วครับ");
      } else {
        return responseDialogflow("❌ ไม่พบเลขบัตรประชาชนนี้ในระบบสมาชิกครับ");
      }
    }
    
    if (intentName === 'default welcome intent') {
      return responseDialogflow("ยินดีต้อนรับสู่ สหกรณ์ตะอาวุน ครับ\nกรุณาส่งเลขบัตรประชาชน 13 หลัก เพื่อลงทะเบียนเข้าสู่ระบบครับ");
    }
    
    if (!linked) {
      return responseDialogflow("⚠️ ท่านยังไม่ได้ลงทะเบียนสมาชิก\nกรุณาพิมพ์ *เลขบัตรประชาชน 13 หลัก* ของท่านเพื่อเริ่มต้นครับ");
    }
    
    const member = findMemberById(linked.memberId);
    if (!member) return responseDialogflow("❌ ไม่พบข้อมูลสมาชิกในระบบ กรุณาติดต่อเจ้าหน้าที่ครับ");

    let message = null;

    if (intentName === 'check_debt' || queryText === 'ยอดหนี้') {
      message = { type: "flex", altText: "📈 ยอดหนี้", contents: generateDebtFlex(member) };
    } else if (intentName === 'check_shares' || queryText === 'หุ้นสะสม') {
      message = { type: "flex", altText: "🏛️ หุ้นสะสม", contents: generateSharesFlex(member, 'shares') };
    } else if (intentName === 'check_savings' || queryText === 'เงินออมทรัพย์') {
      message = { type: "flex", altText: "💰 เงินออม", contents: generateSharesFlex(member, 'savings') };
    } else if (intentName === 'check_memberinfo' || queryText === 'ข้อมูลสมาชิก') {
      message = { type: "flex", altText: "👤 ข้อมูลสมาชิก", contents: generateMemberInfoFlex(member) };
    } else if (intentName === 'check_history' || queryText === 'ประวัติชำระ') {
      message = { type: "flex", altText: "📜 ประวัติชำระ", contents: generateHistoryFlex(member) };
    } else if (intentName === 'contact_staff' || queryText === 'ติดต่อเจ้าหน้าที่') {
      message = { type: "text", text: "☎️ ติดต่อเจ้าหน้าที่สหกรณ์\nโทร: 089-595-2329\n(น.ส.นูรีซัน ไพเราะ)" };
    } else {
      message = { type: "text", text: "รับทราบครับ คุณ " + member.name + "\nต้องการทราบข้อมูลด้านไหน เลือกที่เมนูได้เลยครับ" };
    }

    return ContentService.createTextOutput(JSON.stringify({
      fulfillmentMessages: [{ payload: { line: message } }]
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(err) {
    logError("Fulfillment Error: " + err.message);
    return responseDialogflow("เกิดข้อผิดพลาดในการประมวลผล: " + err.message);
  }
}

// --- 3. DATABASE FUNCTIONS (MEMBERS/TRANSACTIONS) ---

function handleInitDatabase() {
  const ss = getSS();
  const mSheet = getSheet(ss, "Members");
  if (mSheet.getLastRow() === 0) {
    mSheet.appendRow(["ID", "Name", "Code", "IDCard", "Phone", "Address", "Type", "JoinedDate", "Shares", "Savings", "HousingDebt", "LandDebt", "GeneralDebt", "MonthlyInstallment", "MissedInstallments"]);
  }
  const tSheet = getSheet(ss, "Transactions");
  if (tSheet.getLastRow() === 0) {
    tSheet.appendRow(["ID", "MemberID", "Date", "Timestamp", "Housing", "Land", "Shares", "Savings", "Welfare", "Insurance", "Donation", "GeneralLoan", "Total", "RecordedBy", "Method"]);
  }
  const lSheet = getSheet(ss, "Ledger");
  if (lSheet.getLastRow() === 0) {
    lSheet.appendRow(["ID", "Date", "Type", "Category", "Description", "Amount", "Method", "RecordedBy", "Timestamp"]);
  }
  return { message: "Database initialized" };
}

function handleAddMember(member) {
  const ss = getSS();
  const sh = getSheet(ss, "Members");
  sh.appendRow([
    member.id, member.name, member.memberCode, 
    member.personalInfo.idCard, member.personalInfo.phone, member.personalInfo.address,
    member.memberType, member.joinedDate,
    member.accumulatedShares, member.savingsBalance,
    member.housingLoanBalance, member.landLoanBalance, member.generalLoanBalance,
    member.monthlyInstallment, member.missedInstallments
  ]);
  return { status: "success" };
}

function handleUpdateMember(id, data) {
  const sh = getSheet(getSS(), "Members");
  const d = sh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) {
      if (data.name !== undefined) sh.getRange(i+1, 2).setValue(data.name);
      if (data.accumulatedShares !== undefined) sh.getRange(i+1, 9).setValue(data.accumulatedShares);
      if (data.savingsBalance !== undefined) sh.getRange(i+1, 10).setValue(data.savingsBalance);
      if (data.housingLoanBalance !== undefined) sh.getRange(i+1, 11).setValue(data.housingLoanBalance);
      if (data.landLoanBalance !== undefined) sh.getRange(i+1, 12).setValue(data.landLoanBalance);
      if (data.generalLoanBalance !== undefined) sh.getRange(i+1, 13).setValue(data.generalLoanBalance);
      if (data.monthlyInstallment !== undefined) sh.getRange(i+1, 14).setValue(data.monthlyInstallment);
      if (data.missedInstallments !== undefined) sh.getRange(i+1, 15).setValue(data.missedInstallments);
      if (data.personalInfo) {
        if (data.personalInfo.idCard) sh.getRange(i+1, 4).setValue(data.personalInfo.idCard);
        if (data.personalInfo.phone) sh.getRange(i+1, 5).setValue(data.personalInfo.phone);
        if (data.personalInfo.address) sh.getRange(i+1, 6).setValue(data.personalInfo.address);
      }
      return { status: "success" };
    }
  }
  return { status: "error", message: "Member not found" };
}

function handleDeleteMember(id) {
  const sh = getSheet(getSS(), "Members");
  const d = sh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) { sh.deleteRow(i + 1); return { status: "success" }; }
  }
  return { status: "error", message: "Member not found" };
}

function handleAddTransaction(tx) {
  const ss = getSS();
  const tSh = getSheet(ss, "Transactions");
  const lSh = getSheet(ss, "Ledger");
  const mSh = getSheet(ss, "Members");
  
  // บันทึก Transaction
  tSh.appendRow([
    tx.id, tx.memberId, tx.date, tx.timestamp,
    tx.housing, tx.land, tx.shares, tx.savings,
    tx.welfare, tx.insurance, tx.donation, tx.generalLoan,
    tx.totalAmount, tx.recordedBy, tx.paymentMethod
  ]);
  
  // อัปเดตยอดคงเหลือสมาชิก
  const d = mSh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(tx.memberId)) {
      const name = d[i][1];
      const curShares = Number(d[i][8]) || 0;
      const curSavings = Number(d[i][9]) || 0;
      const curHousing = Number(d[i][10]) || 0;
      const curLand = Number(d[i][11]) || 0;
      const curGeneral = Number(d[i][12]) || 0;
      
      mSh.getRange(i+1, 9).setValue(curShares + (Number(tx.shares) || 0));
      mSh.getRange(i+1, 10).setValue(curSavings + (Number(tx.savings) || 0));
      mSh.getRange(i+1, 11).setValue(Math.max(0, curHousing - (Number(tx.housing) || 0)));
      mSh.getRange(i+1, 12).setValue(Math.max(0, curLand - (Number(tx.land) || 0)));
      mSh.getRange(i+1, 13).setValue(Math.max(0, curGeneral - (Number(tx.generalLoan) || 0)));
      
      // บันทึก Ledger อัตโนมัติ
      lSh.appendRow([
        "L-TX-"+tx.id, tx.date, "income", "รับชำระเงินสมาชิก", 
        "รับจากคุณ " + name, tx.totalAmount, tx.paymentMethod, tx.recordedBy, tx.timestamp
      ]);
      break;
    }
  }
  return { status: "success" };
}

function handleDeleteTransaction(id, memberId) {
  const ss = getSS();
  const tSh = getSheet(ss, "Transactions");
  const mSh = getSheet(ss, "Members");
  const lSh = getSheet(ss, "Ledger");
  
  const tData = tSh.getDataRange().getValues();
  let tx = null;
  for (let i = 1; i < tData.length; i++) {
    if (String(tData[i][0]) === String(id)) {
      tx = {
        housing: tData[i][4], land: tData[i][5], shares: tData[i][6],
        savings: tData[i][7], welfare: tData[i][8], insurance: tData[i][9],
        donation: tData[i][10], generalLoan: tData[i][11]
      };
      tSh.deleteRow(i + 1);
      break;
    }
  }
  
  if (tx) {
    const mData = mSh.getDataRange().getValues();
    for (let i = 1; i < mData.length; i++) {
      if (String(mData[i][0]) === String(memberId)) {
        mSh.getRange(i+1, 9).setValue((Number(mData[i][8])||0) - (Number(tx.shares)||0));
        mSh.getRange(i+1, 10).setValue((Number(mData[i][9])||0) - (Number(tx.savings)||0));
        mSh.getRange(i+1, 11).setValue((Number(mData[i][10])||0) + (Number(tx.housing)||0));
        mSh.getRange(i+1, 12).setValue((Number(mData[i][11])||0) + (Number(tx.land)||0));
        mSh.getRange(i+1, 13).setValue((Number(mData[i][12])||0) + (Number(tx.generalLoan)||0));
        break;
      }
    }
    // ลบใน Ledger
    const lData = lSh.getDataRange().getValues();
    for (let j = 1; j < lData.length; j++) {
      if (String(lData[j][0]) === "L-TX-"+id) { lSh.deleteRow(j + 1); break; }
    }
  }
  return { status: "success" };
}

// --- 4. LINE DIRECT WEBHOOK ---

function handleLineWebhook(data) {
  const event = data.events[0];
  if (!event || !event.replyToken) return responseOK({});
  
  const userId = event.source.userId;
  const text = (event.message.text || "").trim();
  
  if (/^\d{13}$/.test(text)) {
    const member = findMemberByIdCard(text);
    if (member) {
      if (getLinkedMember(userId)) unlinkLineUser(userId);
      linkLineUser(userId, member.id, text);
      return replyLine(event.replyToken, [{ type: "text", text: "✅ ลงทะเบียนสำเร็จ!\nสวัสดีคุณ " + member.name + "\nเช็คยอดหนี้และเงินออมได้ทันทีครับ" }]);
    } else {
      return replyLine(event.replyToken, [{ type: "text", text: "❌ ไม่พบเลขบัตรนี้ในระบบสมาชิก" }]);
    }
  }
  return responseOK({});
}

// --- 5. DATA FETCHING ---

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
        housing: Number(r[4])||0, land: Number(r[5])||0, 
        shares: Number(r[6])||0, savings: Number(r[7])||0,
        welfare: Number(r[8])||0, insurance: Number(r[9])||0,
        donation: Number(r[10])||0, generalLoan: Number(r[11])||0,
        totalAmount: Number(r[12])||0, date: String(r[2]), timestamp: Number(r[3]) 
      });
    });
  }

  const ledgerList = lData.length > 1 ? lData.slice(1).map(r => ({
    id: String(r[0]), date: String(r[1]), type: String(r[2]), category: String(r[3]),
    description: String(r[4]), amount: Number(r[5])||0, paymentMethod: String(r[6]),
    recordedBy: String(r[7]), timestamp: Number(r[8])
  })) : [];

  return { 
    members: mData.slice(1).map(r => ({
      id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
      personalInfo: { idCard: String(r[3]), phone: String(r[4]), address: String(r[5]) },
      memberType: String(r[6]), joinedDate: String(r[7]),
      accumulatedShares: Number(r[8])||0, savingsBalance: Number(r[9])||0,
      housingLoanBalance: Number(r[10])||0, landLoanBalance: Number(r[11])||0,
      generalLoanBalance: Number(r[12])||0, monthlyInstallment: Number(r[13])||0,
      missedInstallments: Number(r[14])||0, transactions: txMap[String(r[0])] || []
    })),
    ledger: ledgerList
  };
}

// --- 6. UTILS & SYSTEM ---

function getSS() { return SpreadsheetApp.openById(TARGET_SHEET_ID); }
function getSheet(ss, name) { let sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); return sh; }
function findMemberById(id) { const data = handleGetData(); return data.members.find(m => String(m.id) === String(id)); }
function findMemberByIdCard(idCard) { const data = handleGetData(); return data.members.find(m => m.personalInfo.idCard.replace(/\D/g,'') === idCard.replace(/\D/g,'')); }
function getLinkedMember(userId) { const sh = getSheet(getSS(), "LineUsers"); const d = sh.getDataRange().getValues(); for (let i = 1; i < d.length; i++) { if (d[i][0] === userId) return { memberId: d[i][1] }; } return null; }
function linkLineUser(userId, memberId, idCard) { let sh = getSheet(getSS(), "LineUsers"); if (sh.getLastRow() === 0) sh.appendRow(["UserID", "MemberID", "IDCard", "Timestamp"]); sh.appendRow([userId, memberId, idCard, new Date()]); }
function unlinkLineUser(userId) { const sh = getSheet(getSS(), "LineUsers"); const d = sh.getDataRange().getValues(); for (let i = 1; i < d.length; i++) { if (d[i][0] === userId) { sh.deleteRow(i + 1); break; } } }
function logError(msg) { try { const ss = getSS(); let sh = ss.getSheetByName("ErrorLogs"); if (!sh) { sh = ss.insertSheet("ErrorLogs"); sh.appendRow(["Date", "Message"]); } sh.appendRow([new Date(), msg]); } catch(e) {} }
function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }
function responseDialogflow(text) { return ContentService.createTextOutput(JSON.stringify({ fulfillmentText: text })).setMimeType(ContentService.MimeType.JSON); }
function replyLine(replyToken, messages) { UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", { method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN }, payload: JSON.stringify({ replyToken: replyToken, messages: messages }), muteHttpExceptions: true }); }
function maskId(id) { if(!id) return "-"; return id.substring(0,1) + "-XXXX-XXXXX-" + id.substring(11,13); }

// --- 7. FLEX MESSAGES (UI) ---

function generateDebtFlex(member) {
  const total = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "horizontal", "backgroundColor": "#064E3B", "paddingAll": "20px", "contents": [{ "type": "text", "text": "📈", "size": "xl" }, { "type": "text", "text": "ภาระหนี้สินทั้งหมด", "weight": "bold", "color": "#FFFFFF", "size": "lg", "margin": "md" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "25px", "contents": [
      { "type": "text", "text": "ยอดหนี้คงเหลือสุทธิ", "size": "sm", "color": "#64748B", "weight": "bold" },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": total.toLocaleString(), "size": "3xl", "weight": "black", "color": "#EF4444" }, { "type": "text", "text": "บาท", "size": "xl", "weight": "bold", "color": "#EF4444", "gravity": "bottom", "margin": "md" }] },
      { "type": "separator", "margin": "lg" },
      { "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm", "contents": [
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หนี้ค่าบ้าน", "size": "sm", "color": "#64748B" }, { "type": "text", "text": (member.housingLoanBalance || 0).toLocaleString() + " ฿", "size": "sm", "weight": "black", "align": "end" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หนี้ค่าที่ดิน", "size": "sm", "color": "#64748B" }, { "type": "text", "text": (member.landLoanBalance || 0).toLocaleString() + " ฿", "size": "sm", "weight": "black", "align": "end" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "สินเชื่อทั่วไป", "size": "sm", "color": "#64748B" }, { "type": "text", "text": (member.generalLoanBalance || 0).toLocaleString() + " ฿", "size": "sm", "weight": "black", "align": "end" }] }
      ]},
      { "type": "box", "layout": "horizontal", "backgroundColor": "#FEF2F2", "paddingAll": "12px", "cornerRadius": "xl", "margin": "xl", "contents": [{ "type": "text", "text": "⚠️ ค้างชำระสะสม " + (member.missedInstallments || 0) + " งวด", "size": "xs", "weight": "black", "color": "#EF4444", "align": "center" }] }
    ]}
  };
}

function generateSharesFlex(member, type) {
  const isShares = type === 'shares';
  const amount = isShares ? member.accumulatedShares : member.savingsBalance;
  const color = isShares ? "#0D9488" : "#059669";
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "horizontal", "backgroundColor": color, "paddingAll": "20px", "contents": [{ "type": "text", "text": isShares ? "🏛️" : "💰", "size": "xl" }, { "type": "text", "text": isShares ? "ข้อมูลทุนเรือนหุ้น" : "เงินฝากออมทรัพย์", "weight": "bold", "color": "#FFFFFF", "size": "lg", "margin": "md" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "25px", "contents": [
      { "type": "text", "text": isShares ? "ยอดหุ้นสะสมรวม" : "ยอดเงินฝากคงเหลือ", "size": "sm", "color": "#64748B", "weight": "bold" },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": (amount || 0).toLocaleString(), "size": "3xl", "weight": "black", "color": color }, { "type": "text", "text": "บาท", "size": "xl", "weight": "bold", "color": color, "gravity": "bottom", "margin": "md" }] },
      isShares ? { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDFA", "paddingAll": "12px", "cornerRadius": "xl", "margin": "xl", "contents": [{ "type": "text", "text": "สิทธิประโยชน์: มีสิทธิได้รับปันผลประจำปี", "size": "xs", "weight": "black", "color": color, "align": "center" }] } : { "type": "box", "layout": "vertical", "contents": [] }
    ]}
  };
}

function generateMemberInfoFlex(member) {
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#1E293B", "paddingAll": "20px", "contents": [{ "type": "text", "text": "👤 ข้อมูลสมาชิก", "weight": "bold", "color": "#FFFFFF", "size": "lg" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "20px", "contents": [
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ชื่อ-สกุล", "size": "sm", "color": "#64748B", "flex": 1 }, { "type": "text", "text": member.name, "size": "sm", "weight": "bold", "flex": 2, "align": "end" }] },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "รหัสสมาชิก", "size": "sm", "color": "#64748B", "flex": 1 }, { "type": "text", "text": member.memberCode, "size": "sm", "weight": "bold", "flex": 2, "align": "end" }] },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "เลขบัตร", "size": "sm", "color": "#64748B", "flex": 1 }, { "type": "text", "text": maskId(member.personalInfo.idCard), "size": "sm", "weight": "bold", "flex": 2, "align": "end" }] },
      { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "เบอร์โทร", "size": "sm", "color": "#64748B", "flex": 1 }, { "type": "text", "text": member.personalInfo.phone, "size": "sm", "weight": "bold", "flex": 2, "align": "end" }] }
    ]}
  };
}

function generateHistoryFlex(member) {
  const txs = (member.transactions || []).slice(-5).reverse();
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#334155", "paddingAll": "15px", "contents": [{ "type": "text", "text": "📜 ประวัติชำระ 5 ครั้งล่าสุด", "color": "#FFFFFF", "weight": "bold" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "20px", "contents": txs.length > 0 ? txs.map(t => ({ "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": t.date, "size": "xs", "color": "#64748B" }, { "type": "text", "text": t.totalAmount.toLocaleString() + " ฿", "size": "xs", "weight": "bold", "align": "end" }] })) : [{ "type": "text", "text": "ไม่พบประวัติการชำระเงิน", "align": "center", "color": "#94A3B8" }] }
  };
}
