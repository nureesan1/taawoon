
/**
 * TAAWOON COOP SYSTEM - BACKEND SCRIPT (STABLE VERSION 11.0)
 * ตรวจสอบและแก้ไขลำดับคอลัมน์ให้ตรงตาม Sheet จริงของผู้ใช้งาน
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_ACCESS_TOKEN = "fSC99nQ32pISc+43cC4rkIsuxVsVhF4AmSqGCZ3qL/pgyUaAKgAkFERipkTqN66G9LCL/qC9eEhIsg7VIfshepVsSQi/QvGsyUbBj4eNzaKsCwPM8c83GlNUv4oibxX/bmTniEAWBKmcGp3JCImSHQdB04t89/1O/w1cDnyilFU="; 

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doPost(e) {
  try {
    const rawContent = e.postData.contents;
    const contents = JSON.parse(rawContent);
    
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
    }
    
    if (contents.events && contents.events.length > 0) {
      return handleLineWebhook(contents);
    }
    
    // สำหรับการเรียกจาก WebApp
    const action = contents.action || (contents.data && contents.data.action);
    const data = contents.data || {};
    switch (action) {
      case 'getData': return responseOK(handleGetData());
      case 'addMember': return responseOK(handleAddMember(data.member));
      case 'updateMember': return responseOK(handleUpdateMember(data.id, data.data));
      case 'deleteMember': return responseOK(handleDeleteMember(data.id));
      case 'addTransaction': return responseOK(handleAddTransaction(data.transaction));
      case 'deleteTransaction': return responseOK(handleDeleteTransaction(data.id, data.memberId));
      default: return responseOK({ message: "Action not found" });
    }
  } catch (err) {
    return responseError(err.message);
  }
}

/* --- Dialogflow Fulfillment Handler --- */

function handleDialogflowFulfillment(contents) {
  const intentName = (contents.queryResult.intent.displayName || "").trim().toLowerCase();
  const payload = contents.originalDetectIntentRequest.payload;
  
  if (!payload || !payload.data || !payload.data.source) {
    return responseDialogflow("กรุณาใช้งานผ่านแอปพลิเคชัน LINE ครับ");
  }
  
  const userId = payload.data.source.userId;
  const linked = getLinkedMember(userId);
  
  if (intentName === 'default welcome intent') {
    return responseDialogflow("ยินดีต้อนรับสู่ สหกรณ์ตะอาวุน ครับ\nกรุณาส่งเลขบัตรประชาชน 13 หลัก เพื่อลงทะเบียนครับ");
  }
  
  if (!linked) {
    return responseDialogflow("⚠️ ท่านยังไม่ได้ลงทะเบียนสมาชิก\nกรุณาพิมพ์ *เลขบัตรประชาชน 13 หลัก* เพื่อเริ่มต้นครับ");
  }
  
  const member = findMemberById(linked.memberId);
  if (!member) return responseDialogflow("❌ ไม่พบข้อมูลสมาชิกในระบบ");

  let message = null;

  switch (intentName) {
    case 'check_debt':
      message = { type: "flex", altText: "📈 ข้อมูลยอดหนี้", contents: generateDebtFlex(member) };
      break;
    case 'check_shares':
      message = { type: "flex", altText: "🏛️ ข้อมูลทุนเรือนหุ้น", contents: generateSharesFlex(member, 'shares') };
      break;
    case 'check_savings':
      message = { type: "flex", altText: "💰 ข้อมูลเงินออมทรัพย์", contents: generateSharesFlex(member, 'savings') };
      break;
    case 'check_memberinfo':
      message = { type: "flex", altText: "👤 ข้อมูลส่วนตัวสมาชิก", contents: generateMemberInfoFlex(member) };
      break;
    case 'check_history':
      message = { type: "flex", altText: "📜 ประวัติการชำระเงิน", contents: generateHistoryFlex(member) };
      break;
    case 'contact_staff':
      message = { type: "text", text: "☎️ ติดต่อเจ้าหน้าที่สหกรณ์\nโทร: 089-595-2329\n(น.ส.นูรีซัน ไพเราะ)" };
      break;
    default:
      message = { type: "text", text: "รับทราบครับ คุณ " + member.name + "\nต้องการทราบข้อมูลด้านใด กดเลือกที่เมนูได้เลยครับ" };
  }

  return ContentService.createTextOutput(JSON.stringify({
    fulfillmentMessages: [{ payload: { line: message } }]
  })).setMimeType(ContentService.MimeType.JSON);
}

function responseDialogflow(text) { 
  return ContentService.createTextOutput(JSON.stringify({ fulfillmentText: text })).setMimeType(ContentService.MimeType.JSON); 
}

/* --- LINE Webhook --- */

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
      return replyLine(event.replyToken, [{ type: "text", text: "✅ ลงทะเบียนสำเร็จ!\nยินดีต้อนรับคุณ " + member.name + "\nเช็คยอดหนี้และเงินออมได้ทันทีครับ" }]);
    } else {
      return replyLine(event.replyToken, [{ type: "text", text: "❌ ไม่พบเลขบัตรนี้ในระบบสมาชิกครับ" }]);
    }
  }
  return responseOK({});
}

function replyLine(replyToken, messages) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post", contentType: "application/json",
    headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}

/* --- Data Core Logic (Corrected Column Mapping) --- */

function handleGetData() {
  const ss = getSS();
  const mSheet = getSheet(ss, "Members");
  const tSheet = getSheet(ss, "Transactions");
  const mData = mSheet.getDataRange().getValues();
  const tData = tSheet.getDataRange().getValues();
  
  const txMap = {};
  if (tData.length > 1) {
    tData.slice(1).forEach(r => {
      const mid = String(r[1]);
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push({ totalAmount: Number(r[12]) || 0, date: String(r[2]), timestamp: Number(r[3]) });
    });
  }

  // อ้างอิงตามรูปภาพ Sheet ของคุณ:
  // A=0:ID, B=1:Name, C=2:MemberCode, D=3:IDCard, E=4:Phone, F=5:Address
  // G=6:JoinedDate, H=7:Type, I=8:Shares, J=9:Savings, K=10:HousingDebt
  // L=11:LandDebt, M=12:GenDebt, N=13:Monthly, O=14:Missed
  
  const members = mData.slice(1).map(r => ({
    id: String(r[0]),
    name: String(r[1]),
    memberCode: String(r[2]),
    personalInfo: {
      idCard: String(r[3]),
      phone: String(r[4]),    // แก้จาก r[5] เป็น r[4]
      address: String(r[5])   // แก้จาก r[4] เป็น r[5]
    },
    joinedDate: String(r[6]),
    memberType: String(r[7]),
    accumulatedShares: Number(r[8]) || 0,
    savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0,
    landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0,
    monthlyInstallment: Number(r[13]) || 0, // เพิ่ม N(13)
    missedInstallments: Number(r[14]) || 0, // O(14)
    transactions: txMap[String(r[0])] || []
  }));
  
  return { members };
}

function getSheet(ss, name) { let sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); return sh; }
function getLinkedMember(userId) { const sh = getSheet(getSS(), "LineUsers"); const d = sh.getDataRange().getValues(); for (let i = 1; i < d.length; i++) { if (d[i][0] === userId) return { memberId: d[i][1] }; } return null; }
function linkLineUser(userId, memberId, idCard) { getSheet(getSS(), "LineUsers").appendRow([userId, memberId, idCard, new Date()]); }
function unlinkLineUser(userId) { const sh = getSheet(getSS(), "LineUsers"); const d = sh.getDataRange().getValues(); for (let i = 1; i < d.length; i++) { if (d[i][0] === userId) { sh.deleteRow(i + 1); break; } } }
function findMemberByIdCard(idCard) { return handleGetData().members.find(x => x.personalInfo.idCard.replace(/\D/g,'') === idCard.replace(/\D/g,'')); }
function findMemberById(id) { return handleGetData().members.find(x => String(x.id) === String(id)); }
function maskId(id) { if(!id) return "-"; return id.substring(0,1) + "-XXXX-XXXXX-" + id.substring(11,13); }
function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }

/* --- UI Flex Messages (No Change) --- */

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
