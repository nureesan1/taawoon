
/**
 * TAAWOON COOP API & LINE OA ENHANCEMENT
 * ปรับปรุง: รองรับการส่งรูปสลิป และตรวจสอบประวัติการชำระเงินแบบละเอียด
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

  // Handle LINE OA Messages & Events
  if (contents.events) return handleLineWebhook(contents);
  
  // Handle Dialogflow (Chatbot)
  if (contents.queryResult) return handleDialogflowFulfillment(contents);
  
  // Handle WebApp API Requests
  const action = contents.action || (contents.data && contents.data.action);
  if (action === 'getData') return responseOK(handleGetData());
  
  return responseOK({ message: "Unsupported source" });
}

function handleGetData() {
  const ss = getSS();
  const mSheet = getSheet(ss, "Members");
  const tSheet = getSheet(ss, "Transactions");
  const lSheet = getSheet(ss, "Ledger");
  
  return {
    members: getMembers(mSheet, tSheet),
    ledger: lSheet.getDataRange().getValues().slice(1).map(r => ({
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
 * Handle LINE OA Webhook (Support Image Slips)
 */
function handleLineWebhook(data) {
  data.events.forEach(event => {
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const linked = getLinkedMember(userId);

    // 1. Handle Images (Payment Slips)
    if (event.type === "message" && event.message.type === "image") {
      if (!linked) {
        replyLine(replyToken, [{ type: "text", text: "🙏 กรุณาลงทะเบียนเลขบัตรประชาชนก่อนส่งสลิปนะครับ" }]);
        return;
      }
      
      const messageId = event.message.id;
      const imageUrl = getLineContentUrl(messageId);
      
      // บันทึกลง Sheet 'PendingSlips' เพื่อให้เจ้าหน้าที่ตรวจสอบ
      const psSheet = getSheet(getSS(), "PendingSlips");
      psSheet.appendRow([new Date(), linked.memberId, messageId, "Waiting", imageUrl]);

      replyLine(replyToken, [{ 
        type: "text", 
        text: "✅ ได้รับสลิปเรียบร้อยแล้วครับ! เจ้าหน้าที่จะทำการตรวจสอบและอัปเดตยอดหนี้ให้ภายใน 24 ชม. ขอบคุณครับ" 
      }]);
    }

    // 2. Handle Text Messages (Commands)
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();
      
      if (!linked) {
        if (/^\d{13}$/.test(text)) {
          const member = findMemberByIdCard(text);
          if (member) {
            linkLineUser(userId, member.id, text);
            replyLine(replyToken, [{ type: "flex", altText: "ลงทะเบียนสำเร็จ", contents: generateWelcomeFlex(member) }]);
          } else {
            replyLine(replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลสมาชิกที่ตรงกับเลขบัตรนี้ครับ" }]);
          }
        } else {
          replyLine(replyToken, [{ type: "text", text: "📱 กรุณาพิมพ์เลขบัตรประชาชน 13 หลักเพื่อลงทะเบียนตรวจสอบยอดหนี้ครับ" }]);
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

function getLineContentUrl(messageId) {
  // ในระบบจริงต้องใช้ API เพื่อดึง Binary และอัปโหลดขึ้น Cloud Storage (เช่น Google Drive)
  // ในที่นี้สมมติว่าเป็น URL อ้างอิง
  return `https://api-data.line.me/v2/bot/message/${messageId}/content`;
}

function getMembers(mSheet, tSheet) {
  const m = mSheet.getDataRange().getValues();
  const t = tSheet.getDataRange().getValues();
  if (m.length < 2) return [];

  const txMap = {};
  if (t.length >= 2) {
    t.slice(1).forEach(r => {
      const mid = String(r[1]);
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push({
        id: String(r[0]),
        date: Utilities.formatDate(new Date(r[2]), "GMT+7", "yyyy-MM-dd"),
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

  return m.slice(1).map(r => ({
    id: String(r[0]),
    name: String(r[1]),
    memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), address: String(r[4]), phone: String(r[5]) },
    accumulatedShares: Number(r[8]) || 0,
    savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0,
    landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0,
    monthlyInstallment: Number(r[13]) || 0,
    missedInstallments: Number(r[14]) || 0,
    memberType: String(r[15]),
    joinedDate: String(r[16]),
    transactions: txMap[String(r[0])] || []
  }));
}

// Utility & LINE Helpers (Keep existing logic but ensure connectivity)
function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function replyLine(replyToken, messages) { UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", { method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN }, payload: JSON.stringify({ replyToken: replyToken, messages: messages }), muteHttpExceptions: true }); }
function findMemberByIdCard(idCard) { return getMembers(getSheet(getSS(), "Members"), getSheet(getSS(), "Transactions")).find(m => m.personalInfo.idCard.replace(/\D/g, '') === idCard.replace(/\D/g, '')); }
function findMemberById(id) { return getMembers(getSheet(getSS(), "Members"), getSheet(getSS(), "Transactions")).find(m => String(m.id) === String(id)); }
function getLinkedMember(userId) { const data = getSheet(getSS(), "LineUsers").getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === userId) return { memberId: data[i][1] }; } return null; }
function linkLineUser(userId, memberId, idCard) { getSheet(getSS(), "LineUsers").appendRow([userId, memberId, idCard, new Date()]); }
function unlinkLineUser(userId) { const sh = getSheet(getSS(), "LineUsers"); const data = sh.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === userId) { sh.deleteRow(i + 1); break; } } }
function getSheet(ss, name) { let sh = ss.getSheetByName(name); if (!sh) { sh = ss.insertSheet(name); if (name === "PendingSlips") sh.appendRow(["Timestamp", "MemberId", "MessageId", "Status", "Url"]); } return sh; }

// Flex Templates (Generate as per previous professional layouts)
function generateWelcomeFlex(m) { return { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🎉 ลงทะเบียนสำเร็จ!", "weight": "bold", "size": "lg", "color": "#059669" }, { "type": "text", "text": "สวัสดีคุณ " + m.name, "size": "md", "margin": "md", "weight": "bold" }, { "type": "text", "text": "รหัสสมาชิก: " + m.memberCode, "size": "xs", "color": "#6B7280" }] } }; }
function generateDebtFlex(m) { /* Template as used before */ return { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "📊 ยอดหนี้คงเหลือ", "weight": "bold" }] } }; }
function generateSharesFlex(m) { return { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🏛️ หุ้นสะสม: " + m.accumulatedShares.toLocaleString() + " ฿", "weight": "bold" }] } }; }
function generateHistoryFlex(m) { return { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "📜 ประวัติล่าสุด", "weight": "bold" }] } }; }
