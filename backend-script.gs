
/**
 * TAAWOON COOP API & LINE/DIALOGFLOW WEBHOOK
 * Channel ID: 1657924755
 * Supports: LINE Webhook (Direct) & Dialogflow Fulfillment (Webhook)
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
/**
 * หมายเหตุ: 96a450e6aad583f0c12860019eae0fc7 คือ Channel Secret
 * สำคัญ: ในการส่งข้อความตอบกลับ LINE Messaging API ต้องใช้ "Channel Access Token (Long-lived)"
 * หากใช้ Secret แล้วส่งไม่สำเร็จ ให้คัดลอก Access Token จากเมนู Messaging API ใน LINE Developers มาวางแทนครับ
 */
const LINE_ACCESS_TOKEN = "96a450e6aad583f0c12860019eae0fc7"; 

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doGet(e) {
  return HtmlService.createHtmlOutput(
    "<div style='font-family:sans-serif; text-align:center; padding:50px;'>" +
    "<h2 style='color:#064e3b'>✅ Taawoon Coop API & Fulfillment System</h2>" +
    "<p>Status: Ready to connect with LINE & Dialogflow</p>" +
    "<p style='color:#666; font-size:12px;'>Channel ID: 1657924755</p></div>"
  );
}

/**
 * Handle POST requests
 * รองรับ 2 ระบบ: 
 * 1. LINE Messaging API (ตรง)
 * 2. Dialogflow Fulfillment (ผ่าน Dialogflow)
 */
function doPost(e) {
  if (!e.postData || !e.postData.contents) return responseOK({ message: "No data" });
  
  const contents = JSON.parse(e.postData.contents);
  
  // 1. ตรวจสอบว่าเป็นคำขอจาก Dialogflow หรือไม่
  if (contents.queryResult) {
    return handleDialogflowFulfillment(contents);
  }
  
  // 2. ตรวจสอบว่าเป็น Webhook จาก LINE หรือไม่
  if (contents.events) {
    return handleLineWebhook(e.postData.contents);
  }
  
  return responseOK({ message: "Unsupported source" });
}

/**
 * จัดการคำตอบสำหรับ Dialogflow
 */
function handleDialogflowFulfillment(contents) {
  const intentName = contents.queryResult.intent.displayName;
  // ดึง UserId จาก Payload ของ LINE ที่ Dialogflow ส่งต่อมา
  const userId = contents.originalDetectIntentRequest.payload.data.source.userId;
  
  const linked = getLinkedMember(userId);
  let replyText = "";

  if (!linked) {
    // กรณีที่ส่งเลขบัตร 13 หลักมาใน Dialogflow
    const queryText = contents.queryResult.queryText.trim();
    if (/^\d{13}$/.test(queryText)) {
      const member = findMemberByIdCard(queryText);
      if (member) {
        linkLineUser(userId, member.id, queryText);
        replyText = `✅ ยืนยันตัวตนสำเร็จ!\nยินดีต้อนรับคุณ ${member.name}\n\nขณะนี้ท่านสามารถสอบถามยอดเงินหรือประวัติผ่านการพิมพ์โต้ตอบได้เลยครับ`;
      } else {
        replyText = "❌ ไม่พบข้อมูลสมาชิกที่ตรงกับเลขบัตรประชาชนนี้ โปรดติดต่อเจ้าหน้าที่ครับ";
      }
    } else {
      replyText = "🙏 สวัสดีครับ ยินดีต้อนรับสู่สหกรณ์ตะอาวุน\n\nกรุณาพิมพ์ 'เลขบัตรประชาชน 13 หลัก' เพื่อยืนยันตัวตนก่อนครับ";
    }
  } else {
    const member = findMemberById(linked.memberId);
    if (!member) {
      replyText = "❌ ไม่พบข้อมูลสมาชิก โปรดพิมพ์ 'ยกเลิก' เพื่อลงทะเบียนใหม่";
    } else {
      // Mapping Intents จาก Dialogflow
      switch (intentName) {
        case "CheckBalance": 
          replyText = generateBalanceReport(member);
          break;
        case "CheckHistory":
          replyText = generateHistoryReport(member);
          break;
        case "CheckProfile":
          replyText = `👤 ข้อมูลสมาชิก\nชื่อ: ${member.name}\nรหัส: ${member.memberCode}\nประเภท: ${member.memberType === 'associate' ? 'สมทบ' : 'สามัญ'}`;
          break;
        case "UnlinkAccount":
          unlinkLineUser(userId);
          replyText = "🚫 ยกเลิกการผูกบัญชีเรียบร้อยแล้วครับ";
          break;
        default:
          // ถ้า Dialogflow ไม่แน่ใจ (Default Fallback)
          replyText = contents.queryResult.fulfillmentText || `สวัสดีครับคุณ ${member.name} มีอะไรให้ผมช่วยไหมครับ?`;
      }
    }
  }

  // รูปแบบ Response ที่ Dialogflow ต้องการ
  const response = {
    "fulfillmentMessages": [
      {
        "text": {
          "text": [replyText]
        }
      }
    ]
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * จัดการคำตอบสำหรับ LINE Webhook (ตรง) - คงไว้เพื่อความยืดหยุ่น
 */
function handleLineWebhook(bodyText) {
  const data = JSON.parse(bodyText);
  data.events.forEach(event => {
    if (event.type !== "message" || event.message.type !== "text") return;
    const replyToken = event.replyToken;
    const text = event.message.text.trim();
    const userId = event.source.userId;
    const linked = getLinkedMember(userId);
    let reply = "";

    if (!linked) {
      if (/^\d{13}$/.test(text)) {
        const member = findMemberByIdCard(text);
        if (member) {
          linkLineUser(userId, member.id, text);
          reply = `✅ ยืนยันตัวตนสำเร็จ!\nยินดีต้อนรับคุณ ${member.name}\n\nท่านสามารถเช็คยอดเงินได้ทันทีครับ`;
        } else {
          reply = "❌ ไม่พบข้อมูลเลขบัตรนี้ในระบบครับ";
        }
      } else {
        reply = "🙏 กรุณาพิมพ์เลขบัตรประชาชน 13 หลักเพื่อลงทะเบียนครับ";
      }
    } else {
      const member = findMemberById(linked.memberId);
      if (text === "ยอดเงิน" || text === "📊 ยอดคงเหลือ") reply = generateBalanceReport(member);
      else if (text === "ประวัติ" || text === "📜 ประวัติการชำระ") reply = generateHistoryReport(member);
      else if (text === "ยกเลิก") { unlinkLineUser(userId); reply = "ยกเลิกการผูกบัญชีแล้ว"; }
      else reply = `สวัสดีคุณ ${member.name} เลือกเมนูจาก Rich Menu ได้เลยครับ`;
    }
    replyLine(replyToken, reply);
  });
  return responseOK({ message: "Handled" });
}

/* --- รายงานยอดคงเหลือ --- */
function generateBalanceReport(member) {
  const lastTx = member.transactions && member.transactions.length > 0 ? member.transactions.sort((a,b) => b.timestamp - a.timestamp)[0] : null;
  const lastDate = lastTx ? lastTx.date : "ไม่มีข้อมูล";
  const missedAmount = (member.monthlyInstallment || 0) * (member.missedInstallments || 0);
  return `📊 รายงานยอดคงเหลือ\nคุณ: ${member.name}\n💰 เงินออม: ${member.savingsBalance.toLocaleString()} บาท\n🏠 ค้างชำระ: ${missedAmount.toLocaleString()} บาท\n📅 งวดล่าสุด: ${lastDate}`.trim();
}

/* --- รายงานประวัติ --- */
function generateHistoryReport(member) {
  if (!member.transactions || member.transactions.length === 0) return "📜 ไม่พบประวัติการชำระ";
  const sortedTxs = [...member.transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  let msg = "📜 ประวัติล่าสุด\n";
  sortedTxs.forEach(r => {
    msg += `📅 ${r.date} | ${r.totalAmount.toLocaleString()} บาท\n`;
  });
  return msg.trim();
}

/* --- LINE Messaging API Helper --- */
function replyLine(replyToken, text) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN },
    payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: "text", text: text }] }),
    muteHttpExceptions: true
  };
  UrlFetchApp.fetch(url, options);
}

/* --- Database Utils --- */
function getLinkedMember(lineUserId) {
  const ss = getSS();
  const sh = getSheet(ss, "LineUsers");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (data[i][0] === lineUserId) return { memberId: data[i][1], idCard: data[i][2] }; }
  return null;
}

function linkLineUser(lineUserId, memberId, idCard) {
  getSheet(getSS(), "LineUsers").appendRow([lineUserId, memberId, idCard, new Date()]);
}

function unlinkLineUser(lineUserId) {
  const sh = getSheet(getSS(), "LineUsers");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (data[i][0] === lineUserId) { sh.deleteRow(i + 1); break; } }
}

function findMemberByIdCard(idCard) {
  const cleanSearch = idCard.replace(/\D/g, '');
  const allMembers = getMembers(getSheet(getSS(), "Members"), getSheet(getSS(), "Transactions"));
  return allMembers.find(m => m.personalInfo.idCard.replace(/\D/g, '') === cleanSearch);
}

function findMemberById(id) {
  const allMembers = getMembers(getSheet(getSS(), "Members"), getSheet(getSS(), "Transactions"));
  return allMembers.find(m => String(m.id) === String(id));
}

function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }
function getSheet(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function getMembers(mSheet, tSheet) {
  const m = mSheet.getDataRange().getValues();
  const t = tSheet.getDataRange().getValues();
  if (m.length < 2) return [];
  const txMap = {};
  t.slice(1).forEach(r => {
    const mid = String(r[1]);
    if(!txMap[mid]) txMap[mid]=[];
    txMap[mid].push({ date: Utilities.formatDate(new Date(r[2]), "GMT+7", "yyyy-MM-dd"), totalAmount: Number(r[14])||0, timestamp: Number(r[3]) });
  });
  return m.slice(1).map(r => ({
    id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]) },
    savingsBalance: Number(r[9])||0, monthlyInstallment: Number(r[13])||0, missedInstallments: Number(r[14])||0,
    transactions: txMap[String(r[0])] || []
  }));
}

function handleRequest(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action;
  const ss = getSS();
  if (action === "getData") {
    return responseOK({
      members: getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions")),
      ledger: [] // Ledger details logic
    });
  }
  return responseOK({ message: "Action handled" });
}
