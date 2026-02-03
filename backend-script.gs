
/**
 * TAAWOON COOP API & LINE FLEX MESSAGE SYSTEM
 * ปรับปรุงล่าสุด: รองรับการส่งข้อมูล Transaction รายย่อยมายัง Frontend
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_ACCESS_TOKEN = "96a450e6aad583f0c12860019eae0fc7"; 

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doPost(e) {
  if (!e.postData || !e.postData.contents) return responseOK({ message: "No data" });
  
  // ตรวจสอบว่าข้อมูลมาในรูปแบบฟอร์มหรือ JSON
  let contents;
  try {
    contents = JSON.parse(e.postData.contents);
  } catch (err) {
    // ถ้าไม่ใช่ JSON อาจเป็น URLSearchParams
    const params = e.postData.contents.split('&').reduce((acc, curr) => {
      const [key, value] = curr.split('=');
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
    
    if (params.action === 'getData') return responseOK(handleGetData());
    return responseOK({ message: "Action not supported via form" });
  }

  if (contents.queryResult) return handleDialogflowFulfillment(contents);
  if (contents.events) return handleLineWebhook(e.postData.contents);
  
  // เพิ่มการรองรับ API Actions จาก Frontend
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
 * ดึงข้อมูลสมาชิกพร้อมประวัติการชำระเงินที่สมบูรณ์
 */
function getMembers(mSheet, tSheet) {
  const m = mSheet.getDataRange().getValues();
  const t = tSheet.getDataRange().getValues();
  if (m.length < 2) return [];

  const txMap = {};
  if (t.length >= 2) {
    t.slice(1).forEach(r => {
      const mid = String(r[1]);
      if (!txMap[mid]) txMap[mid] = [];
      
      // ดึงข้อมูลรายการย่อยจาก Columns 4-12 (ตามลำดับใน RecordPayment)
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
    personalInfo: {
      idCard: String(r[3]),
      address: String(r[4]),
      phone: String(r[5])
    },
    accumulatedShares: Number(r[8]) || 0,
    savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0,
    landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0,
    monthlyInstallment: Number(r[13]) || 0,
    missedInstallments: Number(r[14]) || 0,
    memberType: String(r[15]) === 'associate' ? 'associate' : 'ordinary',
    joinedDate: String(r[16]),
    transactions: txMap[String(r[0])] || []
  }));
}

/* --- Dialogflow & LINE Webhook Functions --- */

function handleDialogflowFulfillment(contents) {
  const intentName = contents.queryResult.intent.displayName;
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
      return sendTextResponse("❌ ไม่พบข้อมูลสมาชิกที่ตรงกับเลขบัตรนี้ครับ");
    }
    return sendTextResponse("🙏 กรุณาพิมพ์ 'เลขบัตรประชาชน 13 หลัก' เพื่อลงทะเบียนตรวจสอบข้อมูลครับ");
  }

  const member = findMemberById(linked.memberId);
  if (!member) return sendTextResponse("❌ ข้อมูลขัดข้อง กรุณาพิมพ์ 'ยกเลิก' เพื่อเริ่มใหม่");

  if (intentName === "CheckDebt" || queryText === "ยอดหนี้") {
    return sendFlexResponse("📊 รายงานยอดหนี้", generateDebtFlex(member));
  } 
  else if (intentName === "CheckShares" || queryText === "หุ้นสะสม") {
    return sendFlexResponse("🏛️ ข้อมูลหุ้นสะสม", generateSharesFlex(member));
  }
  else if (intentName === "CheckSavings" || queryText === "เงินออมทรัพย์") {
    return sendFlexResponse("💰 เงินฝากออมทรัพย์", generateSavingsFlex(member));
  }
  else if (intentName === "CheckHistory" || queryText === "ประวัติการชำระ") {
    return sendFlexResponse("📜 ประวัติการชำระเงิน", generateHistoryFlex(member));
  }
  else if (intentName === "CheckMemberInfo" || queryText === "ข้อมูลสมาชิก") {
    return sendFlexResponse("👤 ข้อมูลสมาชิก", generateMemberInfoFlex(member));
  }
  else if (intentName === "ContactStaff" || queryText === "ติดต่อเจ้าหน้าที่") {
    return sendFlexResponse("📞 ติดต่อเจ้าหน้าที่", generateContactFlex());
  }
  else if (queryText === "ยกเลิก") {
    unlinkLineUser(userId);
    return sendTextResponse("🚫 ยกเลิกการผูกบัญชีเรียบร้อยแล้วครับ");
  } 
  else {
    return sendTextResponse(`สวัสดีครับคุณ ${member.name} 🙏\nท่านสามารถเลือกเมนูจากปุ่มด้านล่างเพื่อตรวจสอบข้อมูลได้ทันทีครับ`);
  }
}

function handleLineWebhook(bodyText) {
  const data = JSON.parse(bodyText);
  data.events.forEach(event => {
    if (event.type !== "message" || event.message.type !== "text") return;
    const replyToken = event.replyToken;
    const text = event.message.text.trim();
    const userId = event.source.userId;
    const linked = getLinkedMember(userId);

    if (!linked) {
      if (/^\d{13}$/.test(text)) {
        const member = findMemberByIdCard(text);
        if (member) {
          linkLineUser(userId, member.id, text);
          replyLine(replyToken, [{ type: "flex", altText: "ลงทะเบียนสำเร็จ", contents: generateWelcomeFlex(member) }]);
        } else {
          replyLine(replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลสมาชิกในระบบครับ" }]);
        }
      } else {
        replyLine(replyToken, [{ type: "text", text: "🙏 กรุณาพิมพ์เลขบัตรประชาชน 13 หลักเพื่อลงทะเบียนครับ" }]);
      }
      return;
    }

    const member = findMemberById(linked.memberId);
    if (!member) return;

    if (text === "ยอดหนี้") {
      replyLine(replyToken, [{ type: "flex", altText: "รายงานยอดหนี้", contents: generateDebtFlex(member) }]);
    } else if (text === "หุ้นสะสม") {
      replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลหุ้นสะสม", contents: generateSharesFlex(member) }]);
    } else if (text === "เงินออมทรัพย์") {
      replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลเงินออมทรัพย์", contents: generateSavingsFlex(member) }]);
    } else if (text === "ประวัติการชำระ") {
      replyLine(replyToken, [{ type: "flex", altText: "ประวัติการชำระเงิน", contents: generateHistoryFlex(member) }]);
    } else if (text === "ข้อมูลสมาชิก") {
      replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลส่วนตัวสมาชิก", contents: generateMemberInfoFlex(member) }]);
    } else if (text === "ติดต่อเจ้าหน้าที่") {
      replyLine(replyToken, [{ type: "flex", altText: "ข้อมูลการติดต่อ", contents: generateContactFlex() }]);
    } else if (text === "ยกเลิก") {
      unlinkLineUser(userId);
      replyLine(replyToken, [{ type: "text", text: "🚫 ยกเลิกการผูกบัญชีเรียบร้อยแล้ว" }]);
    } else {
      replyLine(replyToken, [{ type: "text", text: `สวัสดีคุณ ${member.name} 🙏 เลือกเมนูที่ต้องการได้เลยครับ` }]);
    }
  });
  return responseOK({ message: "Handled" });
}

/* --- Flex Message Generators --- */

function generateDebtFlex(member) {
  const formatNum = (num) => (num || 0).toLocaleString();
  const totalDebt = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#064E3B", "paddingAll": "20px", "contents": [{ "type": "text", "text": "📈 ภาระหนี้สินทั้งหมด", "weight": "bold", "color": "#FFFFFF", "size": "md" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "20px", "contents": [
      { "type": "text", "text": "ยอดหนี้คงเหลือสุทธิ", "size": "sm", "color": "#6B7280" },
      { "type": "text", "text": formatNum(totalDebt) + " บาท", "size": "xxl", "weight": "bold", "color": "#EF4444" },
      { "type": "separator", "margin": "lg" },
      { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "lg", "contents": [
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หนี้ค่าบ้าน", "size": "sm", "color": "#6B7280" }, { "type": "text", "text": formatNum(member.housingLoanBalance) + " ฿", "size": "sm", "align": "end", "weight": "bold" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "หนี้ค่าที่ดิน", "size": "sm", "color": "#6B7280" }, { "type": "text", "text": formatNum(member.landLoanBalance) + " ฿", "size": "sm", "align": "end", "weight": "bold" }] },
        { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "สินเชื่อทั่วไป", "size": "sm", "color": "#6B7280" }, { "type": "text", "text": formatNum(member.generalLoanBalance) + " ฿", "size": "sm", "align": "end", "weight": "bold" }] }
      ]},
      { "type": "box", "layout": "vertical", "backgroundColor": "#FEF2F2", "paddingAll": "10px", "cornerRadius": "8px", "margin": "lg", "contents": [{ "type": "text", "text": "⚠️ ค้างชำระสะสม " + (member.missedInstallments || 0) + " งวด", "size": "xs", "color": "#EF4444", "weight": "bold", "align": "center" }] }
    ]}
  };
}

function generateSharesFlex(member) {
  const formatNum = (num) => (num || 0).toLocaleString();
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#0D9488", "paddingAll": "20px", "contents": [{ "type": "text", "text": "🏛️ ข้อมูลทุนเรือนหุ้น", "weight": "bold", "color": "#FFFFFF", "size": "md" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "20px", "contents": [
      { "type": "text", "text": "ยอดหุ้นสะสมรวม", "size": "sm", "color": "#6B7280" },
      { "type": "text", "text": formatNum(member.accumulatedShares) + " บาท", "size": "xxl", "weight": "bold", "color": "#0D9488" },
      { "type": "box", "layout": "vertical", "backgroundColor": "#F0FDFA", "paddingAll": "15px", "cornerRadius": "12px", "margin": "lg", "contents": [{ "type": "text", "text": "สิทธิประโยชน์: มีสิทธิได้รับปันผลประจำปี", "size": "xs", "color": "#0D9488", "weight": "bold", "wrap": true }] }
    ]}
  };
}

function generateSavingsFlex(member) {
  const formatNum = (num) => (num || 0).toLocaleString();
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#059669", "paddingAll": "20px", "contents": [{ "type": "text", "text": "💰 เงินฝากออมทรัพย์", "weight": "bold", "color": "#FFFFFF", "size": "md" }] },
    "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "20px", "contents": [
      { "type": "text", "text": "ยอดเงินฝากคงเหลือ", "size": "sm", "color": "#6B7280" },
      { "type": "text", "text": formatNum(member.savingsBalance) + " บาท", "size": "xxl", "weight": "bold", "color": "#059669" }
    ]}
  };
}

function generateHistoryFlex(member) {
  const formatNum = (num) => (num || 0).toLocaleString();
  const txs = (member.transactions || []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const contents = txs.map(tx => ({ "type": "box", "layout": "horizontal", "margin": "md", "contents": [{ "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": tx.date, "size": "xs", "color": "#6B7280", "weight": "bold" }, { "type": "text", "text": "ชำระยอดรวม", "size": "xxs", "color": "#9CA3AF" }], "flex": 2 }, { "type": "text", "text": formatNum(tx.totalAmount) + " ฿", "size": "sm", "align": "end", "weight": "bold", "color": "#064E3B", "gravity": "center" }] }));
  if (contents.length === 0) contents.push({ "type": "text", "text": "ยังไม่มีประวัติการชำระเงิน", "size": "sm", "color": "#9CA3AF", "align": "center", "margin": "xl" });
  return { "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": "#374151", "paddingAll": "20px", "contents": [{ "type": "text", "text": "📜 ประวัติการชำระเงินล่าสุด", "weight": "bold", "color": "#FFFFFF", "size": "md" }] }, "body": { "type": "box", "layout": "vertical", "paddingAll": "20px", "contents": contents } };
}

function generateMemberInfoFlex(member) {
  return { "type": "bubble", "body": { "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "20px", "contents": [{ "type": "text", "text": "👤 ข้อมูลสมาชิก", "weight": "bold", "size": "lg", "color": "#111827" }, { "type": "separator", "margin": "md" }, { "type": "box", "layout": "vertical", "spacing": "sm", "margin": "md", "contents": [{ "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "ชื่อ-สกุล", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": member.name, "size": "xs", "align": "end", "weight": "bold" }] }, { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "รหัสสมาชิก", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": member.memberCode, "size": "xs", "align": "end", "weight": "bold", "color": "#064E3B" }] }, { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "เลขบัตร", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": member.personalInfo.idCard, "size": "xs", "align": "end" }] }, { "type": "box", "layout": "horizontal", "contents": [{ "type": "text", "text": "วันที่เข้าร่วม", "size": "xs", "color": "#6B7280" }, { "type": "text", "text": member.joinedDate || '-', "size": "xs", "align": "end" }] }] }] } };
}

function generateContactFlex() {
  return { "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": "#1F2937", "paddingAll": "20px", "contents": [{ "type": "text", "text": "📞 ติดต่อเจ้าหน้าที่", "weight": "bold", "color": "#FFFFFF", "size": "md" }] }, "body": { "type": "box", "layout": "vertical", "spacing": "lg", "paddingAll": "20px", "contents": [{ "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "สหกรณ์เคหสถานบ้านมั่นคงชุมชนตะอาวุน จำกัด", "size": "xs", "weight": "bold", "wrap": true }, { "type": "text", "text": "ยะลา 95000 | โทร: 089-595-2329", "size": "xs", "color": "#6B7280", "wrap": true, "margin": "xs" }] }, { "type": "button", "action": { "type": "uri", "label": "📞 โทรออกทันที", "uri": "tel:0895952329" }, "style": "primary", "color": "#064E3B" }] } };
}

function generateWelcomeFlex(member) {
  return { "type": "bubble", "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🎉 ลงทะเบียนสำเร็จ!", "weight": "bold", "size": "lg", "color": "#059669" }, { "type": "text", "text": "ยินดีต้อนรับคุณ " + member.name, "size": "md", "margin": "md", "weight": "bold" }, { "type": "text", "text": "กรุณาเลือกเมนูตรวจสอบข้อมูลด้านล่างครับ", "size": "xs", "color": "#6B7280", "wrap": true, "margin": "md" }] } };
}

/* --- API Helper Functions --- */
function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function sendTextResponse(text) { return ContentService.createTextOutput(JSON.stringify({ "fulfillmentMessages": [{ "text": { "text": [text] } }] })).setMimeType(ContentService.MimeType.JSON); }
function sendFlexResponse(altText, flexContents) { return ContentService.createTextOutput(JSON.stringify({ "fulfillmentMessages": [{ "payload": { "line": { "type": "flex", "altText": altText, "contents": flexContents } } }] })).setMimeType(ContentService.MimeType.JSON); }
function replyLine(replyToken, messages) { UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", { method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN }, payload: JSON.stringify({ replyToken: replyToken, messages: messages }), muteHttpExceptions: true }); }
function findMemberByIdCard(idCard) { const cleanSearch = idCard.replace(/\D/g, ''); return getMembers(getSheet(getSS(), "Members"), getSheet(getSS(), "Transactions")).find(m => m.personalInfo.idCard.replace(/\D/g, '') === cleanSearch); }
function findMemberById(id) { return getMembers(getSheet(getSS(), "Members"), getSheet(getSS(), "Transactions")).find(m => String(m.id) === String(id)); }
function getLinkedMember(lineUserId) { const data = getSheet(getSS(), "LineUsers").getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === lineUserId) return { memberId: data[i][1] }; } return null; }
function linkLineUser(lineUserId, memberId, idCard) { getSheet(getSS(), "LineUsers").appendRow([lineUserId, memberId, idCard, new Date()]); }
function unlinkLineUser(lineUserId) { const sh = getSheet(getSS(), "LineUsers"); const data = sh.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === lineUserId) { sh.deleteRow(i + 1); break; } } }
function getSheet(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
