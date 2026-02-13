
/**
 * TAAWOON COOP SYSTEM - BACKEND SCRIPT (STABLE VERSION 17.0)
 * รองรับทั้ง WebApp Dashboard และ LINE Bot (ยอดหนี้, หุ้นสะสม, เงินออม)
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_ACCESS_TOKEN = "fSC99nQ32pISc+43cC4rkIsuxVsVhF4AmSqGCZ3qL/pgyUaAKgAkFERipkTqN66G9LCL/qC9eEhIsg7VIfshepVsSQi/QvGsyUbBj4eNzaKsCwPM8c83GlNUv4oibxX/bmTniEAWBKmcGp3JCImSHQdB04t89/1O/w1cDnyilFU="; 

// --- 1. ENTRY POINTS ---

function doGet(e) {
  return ContentService.createTextOutput("🚀 ระบบสหกรณ์ตะอาวุน (System is Online)\nWebhook URL นี้พร้อมใช้งานสำหรับ LINE และ WebApp ครับ")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    // ป้องกัน Error 'postData of undefined' เมื่อกดปุ่ม Run ใน Editor
    if (!e || !e.postData) {
      logError("สคริปต์ถูกเรียกโดยไม่มีข้อมูล (อาจเกิดจากการกด Run ในหน้าเขียนโค้ด)");
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data received" })).setMimeType(ContentService.MimeType.JSON);
    }

    const contents = JSON.parse(e.postData.contents);
    
    // ก) หากเป็นการเรียกจาก LINE Webhook
    if (contents.events && contents.events.length > 0) {
      return handleLineRequest(contents.events[0]);
    }
    
    // ข) หากเป็นการเรียกจาก Dialogflow Fulfillment
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
    }
    
    // ค) หากเป็นการเรียกจาก WebApp (API Call)
    const action = e.parameter.action || contents.action;
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
        default: return responseOK({ message: "Action not found" });
      }
    }

  } catch (err) {
    logError("Main Error: " + err.message);
    return responseError(err.message);
  }
}

// --- 2. LINE BOT LOGIC (ตามรูปแบบที่คุณส่งมา) ---

function handleLineRequest(event) {
  if (!event || !event.replyToken) return responseOK({});
  
  const userId = event.source.userId;
  const text = (event.message.text || "").trim();

  // 1. ตรวจสอบการลงทะเบียนด้วยเลขบัตรประชาชน 13 หลัก
  if (/^\d{13}$/.test(text)) {
    const member = getMemberByIdCardFast(text);
    if (!member) return replyLineText(event.replyToken, "❌ ไม่พบเลขบัตรประชาชนนี้ในระบบสมาชิกครับ");

    saveLineLink(userId, member.ID);
    return replyLineText(event.replyToken, "✅ ลงทะเบียนสำเร็จ!\nสวัสดีคุณ " + member.Name + "\nตอนนี้ท่านสามารถเช็คยอดต่างๆ ได้ทันทีครับ");
  }

  // 2. ตรวจสอบว่า User เคยลงทะเบียนไว้หรือยัง
  const member = getLinkedMember(userId);
  if (!member) {
    return replyLineText(event.replyToken, "ยินดีต้อนรับสู่ สหกรณ์ตะอาวุน\nกรุณาส่ง *เลขบัตรประชาชน 13 หลัก* เพื่อลงทะเบียนเข้าสู่ระบบครับ");
  }

  // 3. จัดการคำสั่งต่างๆ (Commands)
  if (text === "ยอดหนี้") {
    return replyLineFlex(event.replyToken, "📈 ยอดหนี้", generateFlexDebt(member));
  } else if (text === "หุ้นสะสม") {
    return replyLineFlex(event.replyToken, "🏛️ หุ้นสะสม", generateFlexShares(member));
  } else if (text === "เงินออมทรัพย์") {
    return replyLineFlex(event.replyToken, "💰 เงินออมทรัพย์", generateFlexSavings(member));
  } else if (text === "ข้อมูลสมาชิก") {
    return replyLineText(event.replyToken, "👤 ข้อมูลสมาชิกของคุณ\nชื่อ: " + member.Name + "\nรหัสสมาชิก: " + member.Code);
  }

  // หากพิมพ์อย่างอื่นมา ให้แนะนำคำสั่ง
  return replyLineText(event.replyToken, "พิมพ์คำที่ต้องการทราบ:\n- ยอดหนี้\n- หุ้นสะสม\n- เงินออมทรัพย์");
}

// --- 3. DATA & SEARCH FUNCTIONS ---

function getMemberByIdCardFast(idCard) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("IDCARD_" + idCard);
  if (cached) return JSON.parse(cached);

  const sh = SpreadsheetApp.openById(TARGET_SHEET_ID).getSheetByName("Members");
  const data = sh.getRange(2, 1, sh.getLastRow(), 15).getValues();

  for (let r of data) {
    if (String(r[3]).replace(/\D/g,'') === idCard.replace(/\D/g,'')) {
      const member = mapMemberRow(r);
      cache.put("IDCARD_" + idCard, JSON.stringify(member), 600); // เก็บ cache 10 นาที
      return member;
    }
  }
  return null;
}

function mapMemberRow(r) {
  return {
    ID: String(r[0]),
    Name: String(r[1]),
    Code: String(r[2]),
    HousingDebt: Number(r[10]) || 0,
    LandDebt: Number(r[11]) || 0,
    GenDebt: Number(r[12]) || 0,
    Shares: Number(r[8]) || 0,
    Savings: Number(r[9]) || 0,
    Missed: Number(r[14]) || 0
  };
}

function saveLineLink(userId, memberId) {
  const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  let sh = ss.getSheetByName("LineUsers");
  if (!sh) sh = ss.insertSheet("LineUsers");
  if (sh.getLastRow() === 0) sh.appendRow(["UserID", "MemberID", "Timestamp"]);
  
  // ลบค่าเก่าออกก่อน (ถ้ามี)
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  sh.appendRow([userId, memberId, new Date()]);
}

function getLinkedMember(userId) {
  const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  const shLink = ss.getSheetByName("LineUsers");
  if (!shLink) return null;

  const links = shLink.getDataRange().getValues();
  let memberId = null;
  for (let i = 1; i < links.length; i++) {
    if (links[i][0] === userId) {
      memberId = String(links[i][1]);
      break;
    }
  }
  if (!memberId) return null;

  const shMem = ss.getSheetByName("Members");
  const members = shMem.getRange(2, 1, shMem.getLastRow(), 15).getValues();
  for (let r of members) {
    if (String(r[0]) === memberId) return mapMemberRow(r);
  }
  return null;
}

// --- 4. FLEX UI GENERATORS (ตามดีไซน์ที่คุณส่งมา) ---

function generateFlexDebt(m) {
  const total = m.HousingDebt + m.LandDebt + m.GenDebt;
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#064E3B", "paddingAll": "20px", "contents": [{ "type": "text", "text": "📈 ภาระหนี้สินทั้งหมด", "weight": "bold", "color": "#FFFFFF", "size": "lg" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "ยอดหนี้คงเหลือสุทธิ", "size": "sm", "color": "#64748B", "weight": "bold" },
      { "type": "text", "text": total.toLocaleString() + " บาท", "size": "xxl", "weight": "black", "color": "#EF4444" },
      { "type": "separator" },
      { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หนี้ค่าบ้าน", "size": "sm", "color": "#64748B" }, { "type": "text", "text": m.HousingDebt.toLocaleString() + " ฿", "size": "sm", "weight": "bold", "align": "end" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หนี้ค่าที่ดิน", "size": "sm", "color": "#64748B" }, { "type": "text", "text": m.LandDebt.toLocaleString() + " ฿", "size": "sm", "weight": "bold", "align": "end" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "สินเชื่อทั่วไป", "size": "sm", "color": "#64748B" }, { "type": "text", "text": m.GenDebt.toLocaleString() + " ฿", "size": "sm", "weight": "bold", "align": "end" }] }
      ]},
      { "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "paddingAll": "10px", "cornerRadius": "md", "contents": [{ "type": "text", "text": "⚠️ ค้างชำระสะสม " + m.Missed + " งวด", "size": "xs", "weight": "bold", "color": "#EF4444", "align": "center" }] }
    ]}
  };
}

function generateFlexShares(m) {
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#0D9488", "paddingAll": "20px", "contents": [{ "type": "text", "text": "🏛️ ข้อมูลทุนเรือนหุ้น", "weight": "bold", "color": "#FFFFFF", "size": "lg" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "ยอดหุ้นสะสมรวม", "size": "sm", "color": "#64748B", "weight": "bold" },
      { "type": "text", "text": m.Shares.toLocaleString() + " บาท", "size": "xxl", "weight": "black", "color": "#0D9488" },
      { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDFA", "paddingAll": "10px", "cornerRadius": "md", "contents": [{ "type": "text", "text": "มีสิทธิได้รับปันผลประจำปี", "size": "xs", "weight": "bold", "color": "#0D9488", "align": "center" }] }
    ]}
  };
}

function generateFlexSavings(m) {
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#059669", "paddingAll": "20px", "contents": [{ "type": "text", "text": "💰 เงินฝากออมทรัพย์", "weight": "bold", "color": "#FFFFFF", "size": "lg" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
      { "type": "text", "text": "ยอดเงินฝากคงเหลือ", "size": "sm", "color": "#64748B", "weight": "bold" },
      { "type": "text", "text": m.Savings.toLocaleString() + " บาท", "size": "xxl", "weight": "black", "color": "#059669" }
    ]}
  };
}

// --- 5. SYSTEM HELPERS ---

function replyLineText(token, text) {
  return sendLineReply(token, [{ type: "text", text: text }]);
}

function replyLineFlex(token, altText, flexContents) {
  return sendLineReply(token, [{ type: "flex", altText: altText, contents: flexContents }]);
}

function sendLineReply(token, messages) {
  return UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN },
    contentType: "application/json",
    payload: JSON.stringify({ replyToken: token, messages: messages }),
    muteHttpExceptions: true
  });
}

function logError(msg) {
  try {
    const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
    let sh = ss.getSheetByName("ErrorLogs");
    if (!sh) { sh = ss.insertSheet("ErrorLogs"); sh.appendRow(["Date", "Message"]); }
    sh.appendRow([new Date(), msg]);
  } catch(e) {}
}

function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }

// --- WebApp Dashboard Functions (Keep for compatibility) ---
function handleGetData() {
  const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  const mSheet = ss.getSheetByName("Members");
  const tSheet = ss.getSheetByName("Transactions");
  const lSheet = ss.getSheetByName("Ledger");
  
  const mData = mSheet.getDataRange().getValues();
  const tData = tSheet.getDataRange().getValues();
  const lData = lSheet.getDataRange().getValues();
  
  return { 
    members: mData.slice(1).map(r => ({
      id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
      personalInfo: { idCard: String(r[3]), phone: String(r[4]), address: String(r[5]) },
      accumulatedShares: Number(r[8])||0, savingsBalance: Number(r[9])||0,
      housingLoanBalance: Number(r[10])||0, landLoanBalance: Number(r[11])||0,
      generalLoanBalance: Number(r[12])||0, monthlyInstallment: Number(r[13])||0,
      missedInstallments: Number(r[14])||0
    })),
    ledger: lData.slice(1).map(r => ({ id: String(r[0]), amount: Number(r[5])||0 }))
  };
}
