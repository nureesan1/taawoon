
/**
 * TAAWOON COOP API & LINE OA SYSTEM (FIXED HISTORY)
 * ปรับปรุง: แก้ไขการดึงข้อมูลประวัติการชำระเงินให้แสดงผลใน LINE ได้ถูกต้อง
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_ACCESS_TOKEN = "96a450e6aad583f0c12860019eae0fc7"; 

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doPost(e) {
  if (!e.postData || !e.postData.contents) return responseOK({ message: "No data" });
  
  let contents;
  try {
    contents = JSON.parse(e.postData.contents);
  } catch (err) {
    const params = e.postData.contents.split('&').reduce((acc, curr) => {
      const [key, value] = curr.split('=');
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
    
    if (params.action === 'getData') return responseOK(handleGetData());
    return responseOK({ message: "Action not supported via form" });
  }

  // LINE OA Webhook
  if (contents.events) return handleLineWebhook(contents);
  
  // Dialogflow Fulfillment
  if (contents.queryResult) return handleDialogflowFulfillment(contents);
  
  // Web API
  const action = contents.action || (contents.data && contents.data.action);
  if (action === 'getData') return responseOK(handleGetData());
  
  return responseOK({ message: "Unsupported source" });
}

function handleGetData() {
  const ss = getSS();
  return {
    members: getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions")),
    ledger: getSheet(ss, "Ledger").getDataRange().getValues().slice(1).map(r => ({
      id: String(r[0]),
      date: String(r[1]),
      type: String(r[2]),
      category: String(r[3]),
      description: String(r[4]),
      amount: Number(r[5])||0,
      paymentMethod: String(r[6]),
      recordedBy: String(r[7]),
      timestamp: Number(r[8])
    }))
  };
}

/**
 * ปรับปรุงการดึงประวัติการชำระเงินให้เสถียรขึ้น
 */
function getMembers(mSheet, tSheet) {
  const m = mSheet.getDataRange().getValues();
  const t = tSheet.getDataRange().getValues();
  if (m.length < 2) return [];

  const txMap = {};
  if (t.length >= 2) {
    t.slice(1).forEach(r => {
      const mid = String(r[1]); // Column B: MemberId
      if (!mid) return;
      if (!txMap[mid]) txMap[mid] = [];
      
      let dateStr = "";
      try {
        // จัดการเรื่องวันที่ให้รองรับทั้ง Date Object และ String
        const rawDate = r[2];
        const dateObj = (rawDate instanceof Date) ? rawDate : new Date(rawDate);
        dateStr = isNaN(dateObj.getTime()) ? String(rawDate) : Utilities.formatDate(dateObj, "GMT+7", "yyyy-MM-dd");
      } catch (e) {
        dateStr = String(r[2]);
      }

      txMap[mid].push({
        id: String(r[0]),
        date: dateStr,
        timestamp: Number(r[3]) || 0,
        housing: Number(r[4]) || 0,
        land: Number(r[5]) || 0,
        shares: Number(r[6]) || 0,
        savings: Number(r[7]) || 0,
        generalLoan: Number(r[11]) || 0,
        totalAmount: Number(r[12]) || 0,
        paymentMethod: String(r[14]) || "cash"
      });
    });
  }

  return m.slice(1).map(r => ({
    id: String(r[0]),
    name: String(r[1]),
    memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), phone: String(r[5]) },
    accumulatedShares: Number(r[8]) || 0,
    savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0,
    landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0,
    monthlyInstallment: Number(r[13]) || 0,
    missedInstallments: Number(r[14]) || 0,
    memberType: String(r[15]),
    transactions: txMap[String(r[0])] || []
  }));
}

/**
 * ปรับปรุง Flex Message ประวัติการชำระเงิน
 */
function generateHistoryFlex(member) {
  const formatNum = (num) => (num || 0).toLocaleString();
  
  // เรียงลำดับจากใหม่ไปเก่า
  const txs = (member.transactions || []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  
  const contents = txs.map(tx => ({
    "type": "box",
    "layout": "horizontal",
    "margin": "lg",
    "contents": [
      {
        "type": "box",
        "layout": "vertical",
        "contents": [
          { "type": "text", "text": tx.date, "size": "sm", "color": "#111827", "weight": "bold" },
          { "type": "text", "text": tx.paymentMethod === "transfer" ? "💳 เงินโอน" : "💵 เงินสด", "size": "xxs", "color": "#6B7280" }
        ],
        "flex": 2
      },
      {
        "type": "text",
        "text": formatNum(tx.totalAmount) + " ฿",
        "size": "md",
        "align": "end",
        "weight": "bold",
        "color": "#064E3B",
        "gravity": "center"
      }
    ]
  }));

  if (contents.length === 0) {
    contents.push({
      "type": "text",
      "text": "ยังไม่มีประวัติการชำระเงินในระบบ",
      "size": "sm",
      "color": "#9CA3AF",
      "align": "center",
      "margin": "xxl",
      "style": "italic"
    });
  }

  return {
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "backgroundColor": "#374151",
      "paddingAll": "20px",
      "contents": [
        { "type": "text", "text": "📜 ประวัติชำระเงิน 5 รายการล่าสุด", "weight": "bold", "color": "#FFFFFF", "size": "md" },
        { "type": "text", "text": member.name, "size": "xs", "color": "#9CA3AF", "margin": "xs" }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "paddingAll": "20px",
      "contents": contents
    }
  };
}

/* --- LINE Webhook & Dialogflow (Update to ensure data consistency) --- */

function handleLineWebhook(data) {
  data.events.forEach(event => {
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const linked = getLinkedMember(userId);

    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();
      
      if (!linked) {
        if (/^\d{13}$/.test(text)) {
          const member = findMemberByIdCard(text);
          if (member) {
            linkLineUser(userId, member.id, text);
            replyLine(replyToken, [{ type: "flex", altText: "ลงทะเบียนสำเร็จ", contents: generateWelcomeFlex(member) }]);
          } else {
            replyLine(replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลสมาชิก กรุณาตรวจสอบเลขบัตรอีกครั้งครับ" }]);
          }
        } else {
          replyLine(replyToken, [{ type: "text", text: "🙏 สวัสดีครับ กรุณาพิมพ์เลขบัตรประชาชน 13 หลักเพื่อลงทะเบียนครับ" }]);
        }
        return;
      }

      const member = findMemberById(linked.memberId);
      if (text === "ยอดหนี้") {
        replyLine(replyToken, [{ type: "flex", altText: "รายงานยอดหนี้", contents: generateDebtFlex(member) }]);
      } else if (text === "หุ้นสะสม") {
        replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลหุ้นสะสม", contents: generateSharesFlex(member) }]);
      } else if (text === "ประวัติการชำระ") {
        replyLine(replyToken, [{ type: "flex", altText: "ประวัติการชำระเงิน", contents: generateHistoryFlex(member) }]);
      } else if (text === "ยกเลิก") {
        unlinkLineUser(userId);
        replyLine(replyToken, [{ type: "text", text: "🚫 ยกเลิกการผูกบัญชีเรียบร้อยแล้ว" }]);
      }
    }
  });
}

function handleDialogflowFulfillment(contents) {
  const queryText = contents.queryResult.queryText.trim();
  const userId = contents.originalDetectIntentRequest.payload.data.source.userId;
  const linked = getLinkedMember(userId);
  
  if (!linked) {
    if (/^\d{13}$/.test(queryText)) {
      const member = findMemberByIdCard(queryText);
      if (member) {
        linkLineUser(userId, member.id, queryText);
        return sendFlexResponse("✅ ลงทะเบียนสำเร็จ", generateWelcomeFlex(member));
      }
      return sendTextResponse("❌ ไม่พบข้อมูลสมาชิกครับ");
    }
    return sendTextResponse("🙏 กรุณาพิมพ์เลขบัตรประชาชน 13 หลักเพื่อลงทะเบียนก่อนครับ");
  }

  const member = findMemberById(linked.memberId);
  if (!member) return sendTextResponse("❌ ข้อมูลขัดข้อง กรุณาลองใหม่");

  if (queryText === "ยอดหนี้") return sendFlexResponse("📊 รายงานยอดหนี้", generateDebtFlex(member));
  if (queryText === "หุ้นสะสม") return sendFlexResponse("🏛️ ข้อมูลหุ้นสะสม", generateSharesFlex(member));
  if (queryText === "ประวัติการชำระ") return sendFlexResponse("📜 ประวัติชำระเงิน", generateHistoryFlex(member));
  
  return sendTextResponse(`สวัสดีคุณ ${member.name} 🙏 เลือกเมนูที่ต้องการตรวจสอบได้เลยครับ`);
}

/* --- Helpers (Ensure correct Sheet reading) --- */

function findMemberByIdCard(idCard) {
  const ss = getSS();
  const members = getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions"));
  const cleanSearch = idCard.replace(/\D/g, '');
  return members.find(m => m.personalInfo.idCard.replace(/\D/g, '') === cleanSearch);
}

function findMemberById(id) {
  const ss = getSS();
  const members = getMembers(getSheet(ss, "Members"), getSheet(ss, "Transactions"));
  return members.find(m => String(m.id) === String(id));
}

function getLinkedMember(userId) {
  const ss = getSS();
  const sh = getSheet(ss, "LineUsers");
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
    if (data[i][0] === userId) {
      sh.deleteRow(i + 1);
      break;
    }
  }
}

function getSheet(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function sendTextResponse(text) { return ContentService.createTextOutput(JSON.stringify({ "fulfillmentMessages": [{ "text": { "text": [text] } }] })).setMimeType(ContentService.MimeType.JSON); }
function sendFlexResponse(altText, flexContents) { return ContentService.createTextOutput(JSON.stringify({ "fulfillmentMessages": [{ "payload": { "line": { "type": "flex", altText: altText, "contents": flexContents } } }] })).setMimeType(ContentService.MimeType.JSON); }
function replyLine(replyToken, messages) { UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", { method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN }, payload: JSON.stringify({ replyToken: replyToken, messages: messages }), muteHttpExceptions: true }); }

function generateWelcomeFlex(m) {
  return {
    "type": "bubble",
    "body": {
      "type": "box", "layout": "vertical", "contents": [
        { "type": "text", "text": "🎉 ลงทะเบียนสำเร็จ!", "weight": "bold", "size": "lg", "color": "#059669" },
        { "type": "text", "text": "สวัสดีคุณ " + m.name, "size": "md", "margin": "md", "weight": "bold" },
        { "type": "text", "text": "ท่านสามารถพิมพ์ 'ยอดหนี้' หรือ 'ประวัติการชำระ' เพื่อดูข้อมูลได้ทันที", "size": "xs", "color": "#6B7280", "wrap": true, "margin": "md" }
      ]
    }
  };
}

function generateDebtFlex(member) {
  const formatNum = (num) => (num || 0).toLocaleString();
  const total = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#064E3B", "paddingAll": "20px", "contents": [{ "type": "text", "text": "📊 ยอดหนี้คงเหลือ", "weight": "bold", "color": "#FFFFFF" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [{ "type": "text", "text": "ยอดรวม: " + formatNum(total) + " บาท", "weight": "bold", "size": "xl", "color": "#EF4444" }] }
  };
}

function generateSharesFlex(member) {
  return {
    "type": "bubble",
    "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🏛️ หุ้นสะสม: " + (member.accumulatedShares || 0).toLocaleString() + " บาท", "weight": "bold" }] }
  };
}
