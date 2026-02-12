
/**
 * TAAWOON COOP SYSTEM - BACKEND SCRIPT (STABLE VERSION 6.0)
 * ระบบตรวจสอบหนี้สมาชิก - ปรับปรุง UI Flex Message ตามความต้องการผู้ใช้
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
    if (contents.queryResult) return handleDialogflowFulfillment(contents);
    if (contents.events && contents.events.length > 0) return handleLineWebhook(contents);
    
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
  if (!payload || !payload.data || !payload.data.source) return responseDialogflow("ระบบรองรับการใช้งานผ่าน LINE เท่านั้นครับ");
  const userId = payload.data.source.userId;
  const linked = getLinkedMember(userId);
  if (intentName === 'Default Welcome Intent') return responseDialogflow("ยินดีต้อนรับสู่ สหกรณ์ตะอาวุน ครับ\nกรุณาส่งเลขบัตรประชาชน 13 หลัก เพื่อลงทะเบียนครับ");
  if (!linked) return responseDialogflow("⚠️ ท่านยังไม่ได้ลงทะเบียนสมาชิก\nกรุณาพิมพ์ *เลขบัตรประชาชน 13 หลัก* ครับ");
  const member = findMemberById(linked.memberId);
  if (!member) return responseDialogflow("❌ ไม่พบข้อมูลสมาชิกในฐานข้อมูล");

  let message = null;
  switch (intentName) {
    case 'Check_Debt':
    case 'CheckBalance':
      message = { type: "flex", altText: "ข้อมูลยอดหนี้", contents: generateDebtFlex(member) };
      break;
    case 'Check_Shares':
      message = { type: "flex", altText: "ข้อมูลทุนเรือนหุ้น", contents: generateSharesFlex(member, 'shares') };
      break;
    case 'Check_Savings':
      message = { type: "flex", altText: "ข้อมูลเงินออมทรัพย์", contents: generateSharesFlex(member, 'savings') };
      break;
    case 'Check_History':
      message = { type: "flex", altText: "ประวัติการชำระเงิน", contents: generateHistoryFlex(member) };
      break;
    case 'Contact_Staff':
      message = { type: "text", text: "☎️ ติดต่อเจ้าหน้าที่: 089-595-2329 (น.ส.นูรีซัน)" };
      break;
    default:
      message = { type: "text", text: "รับทราบครับ มีอะไรให้ช่วยเพิ่มเติมไหมครับ?" };
  }
  return ContentService.createTextOutput(JSON.stringify({ fulfillmentMessages: [{ payload: { line: message } }] })).setMimeType(ContentService.MimeType.JSON);
}

function responseDialogflow(text) { return ContentService.createTextOutput(JSON.stringify({ fulfillmentText: text })).setMimeType(ContentService.MimeType.JSON); }

/* --- LINE Logic --- */

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
      return replyLine(event.replyToken, [{ type: "text", text: "✅ ลงทะเบียนสำเร็จ!\nสวัสดีคุณ " + member.name }]);
    } else {
      return replyLine(event.replyToken, [{ type: "text", text: "❌ ไม่พบข้อมูลเลขบัตรประชาชนนี้ในระบบ" }]);
    }
  }
  return responseOK({});
}

function replyLine(replyToken, messages) {
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post", contentType: "application/json",
      headers: { Authorization: "Bearer " + LINE_ACCESS_TOKEN },
      payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
      muteHttpExceptions: true
    });
  } catch (e) { logError("replyLine Error: " + e.message); }
}

/* --- Core Data Logic --- */

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
        id: String(r[0]), housing: Number(r[4]) || 0, land: Number(r[5]) || 0, shares: Number(r[6]) || 0,
        savings: Number(r[7]) || 0, welfare: Number(r[8]) || 0, insurance: Number(r[9]) || 0,
        donation: Number(r[10]) || 0, generalLoan: Number(r[11]) || 0, totalAmount: Number(r[12]) || 0, date: String(r[2]), timestamp: Number(r[3])
      });
    });
  }

  const members = mData.slice(1).map(r => ({
    id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), phone: String(r[5]), address: String(r[4]) },
    accumulatedShares: Number(r[8]) || 0, savingsBalance: Number(r[9]) || 0,
    housingLoanBalance: Number(r[10]) || 0, landLoanBalance: Number(r[11]) || 0,
    generalLoanBalance: Number(r[12]) || 0, monthlyInstallment: Number(r[13]) || 0,
    missedInstallments: Number(r[14]) || 0, memberType: String(r[15]),
    transactions: txMap[String(r[0])] || []
  }));

  return { members };
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

function handleAddMember(m) { getSheet(getSS(), "Members").appendRow([m.id, m.name, m.memberCode, m.personalInfo.idCard, m.personalInfo.address, m.personalInfo.phone, m.joinedDate, "", m.accumulatedShares, m.savingsBalance, m.housingLoanBalance, m.landLoanBalance, m.generalLoanBalance, m.monthlyInstallment, m.missedInstallments, m.memberType]); return { status: "success" }; }
function handleUpdateMember(id, data) {
  const sh = getSheet(getSS(), "Members");
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      if (data.housingLoanBalance !== undefined) sh.getRange(i+1, 11).setValue(data.housingLoanBalance);
      if (data.landLoanBalance !== undefined) sh.getRange(i+1, 12).setValue(data.landLoanBalance);
      if (data.generalLoanBalance !== undefined) sh.getRange(i+1, 13).setValue(data.generalLoanBalance);
      if (data.accumulatedShares !== undefined) sh.getRange(i+1, 9).setValue(data.accumulatedShares);
      if (data.savingsBalance !== undefined) sh.getRange(i+1, 10).setValue(data.savingsBalance);
      break;
    }
  }
  return { status: "success" };
}
function handleDeleteMember(id) { const sh = getSheet(getSS(), "Members"); const v = sh.getDataRange().getValues(); for (let i = 1; i < v.length; i++) { if (String(v[i][0]) === String(id)) { sh.deleteRow(i + 1); break; } } return { status: "success" }; }
function handleDeleteTransaction(id) { const sh = getSheet(getSS(), "Transactions"); const v = sh.getDataRange().getValues(); for (let i = 1; i < v.length; i++) { if (String(v[i][0]) === String(id)) { sh.deleteRow(i + 1); break; } } return { status: "success" }; }
function handleAddLedgerItem(item) { getSheet(getSS(), "Ledger").appendRow([item.id, item.date, item.type, item.category, item.description, item.amount, item.paymentMethod, item.recordedBy, item.timestamp]); return { status: "success" }; }
function handleDeleteLedgerItem(id) { const sh = getSheet(getSS(), "Ledger"); const v = sh.getDataRange().getValues(); for (let i = 1; i < v.length; i++) { if (String(v[i][0]) === String(id)) { sh.deleteRow(i + 1); break; } } return { status: "success" }; }
function handleInitDatabase() {
  const ss = getSS();
  getSheet(ss, "Members").getRange(1,1,1,16).setValues([["ID","Name","MemberCode","IDCard","Address","Phone","JoinedDate","DOB","Shares","Savings","Housing","Land","General","Monthly","Missed","Type"]]);
  getSheet(ss, "Transactions").getRange(1,1,1,15).setValues([["ID","MemberID","Date","Timestamp","Housing","Land","Shares","Savings","Welfare","Insurance","Donation","General","Total","By","Method"]]);
  getSheet(ss, "Ledger").getRange(1,1,1,9).setValues([["ID","Date","Type","Category","Desc","Amount","Method","By","Timestamp"]]);
  getSheet(ss, "LineUsers").getRange(1,1,1,4).setValues([["UserID","MemberID","IDCard","LinkedAt"]]);
  return { status: "success" };
}

/* --- Helpers --- */

function getSheet(ss, name) { let sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); return sh; }
function getLinkedMember(userId) { const sh = getSheet(getSS(), "LineUsers"); const data = sh.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === userId) return { memberId: data[i][1] }; } return null; }
function linkLineUser(userId, memberId, idCard) { getSheet(getSS(), "LineUsers").appendRow([userId, memberId, idCard, new Date()]); }
function unlinkLineUser(userId) { const sh = getSheet(getSS(), "LineUsers"); const data = sh.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (data[i][0] === userId) { sh.deleteRow(i + 1); break; } } }
function findMemberByIdCard(idCard) { const m = handleGetData().members; return m.find(x => x.personalInfo.idCard.replace(/\D/g,'') === idCard.replace(/\D/g,'')); }
function findMemberById(id) { const m = handleGetData().members; return m.find(x => String(x.id) === String(id)); }
function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }

/* --- Flex Message Generators (Updated to match Screenshot) --- */

function generateDebtFlex(member) {
  const total = (member.housingLoanBalance || 0) + (member.landLoanBalance || 0) + (member.generalLoanBalance || 0);
  const missed = member.missedInstallments || 0;
  
  return {
    "type": "bubble",
    "header": {
      "type": "box", "layout": "horizontal", "backgroundColor": "#064E3B", "paddingAll": "20px",
      "contents": [
        { "type": "text", "text": "📈", "size": "xl", "flex": 0 },
        { "type": "text", "text": "ภาระหนี้สินทั้งหมด", "weight": "bold", "color": "#FFFFFF", "size": "lg", "margin": "md", "flex": 1 }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "25px",
      "contents": [
        { "type": "text", "text": "ยอดหนี้คงเหลือสุทธิ", "size": "sm", "color": "#64748B", "weight": "bold" },
        {
          "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": [
            { "type": "text", "text": total.toLocaleString(), "size": "3xl", "weight": "black", "color": "#EF4444", "flex": 0 },
            { "type": "text", "text": "บาท", "size": "xl", "weight": "bold", "color": "#EF4444", "gravity": "bottom", "flex": 0, "margin": "md" }
          ]
        },
        { "type": "separator", "margin": "lg" },
        {
          "type": "box", "layout": "vertical", "margin": "lg", "spacing": "sm",
          "contents": [
            {
              "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "หนี้ค่าบ้าน", "size": "sm", "color": "#64748B", "weight": "bold" },
                { "type": "text", "text": (member.housingLoanBalance || 0).toLocaleString() + " ฿", "size": "sm", "weight": "black", "color": "#1E293B", "align": "end" }
              ]
            },
            {
              "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "หนี้ค่าที่ดิน", "size": "sm", "color": "#64748B", "weight": "bold" },
                { "type": "text", "text": (member.landLoanBalance || 0).toLocaleString() + " ฿", "size": "sm", "weight": "black", "color": "#1E293B", "align": "end" }
              ]
            },
            {
              "type": "box", "layout": "horizontal", "contents": [
                { "type": "text", "text": "สินเชื่อทั่วไป", "size": "sm", "color": "#64748B", "weight": "bold" },
                { "type": "text", "text": (member.generalLoanBalance || 0).toLocaleString() + " ฿", "size": "sm", "weight": "black", "color": "#1E293B", "align": "end" }
              ]
            }
          ]
        },
        {
          "type": "box", "layout": "horizontal", "backgroundColor": "#FEF2F2", "paddingAll": "12px", "cornerRadius": "xl", "margin": "xl", "contents": [
            { "type": "text", "text": "⚠️ ค้างชำระสะสม " + missed + " งวด", "size": "xs", "weight": "black", "color": "#EF4444", "align": "center" }
          ]
        }
      ]
    }
  };
}

function generateSharesFlex(member, type) {
  const isShares = type === 'shares';
  const amount = isShares ? member.accumulatedShares : member.savingsBalance;
  const color = isShares ? "#0D9488" : "#059669";
  const title = isShares ? "ข้อมูลทุนเรือนหุ้น" : "เงินฝากออมทรัพย์";
  const subtitle = isShares ? "ยอดหุ้นสะสมรวม" : "ยอดเงินฝากคงเหลือ";
  const icon = isShares ? "🏛️" : "💰";

  return {
    "type": "bubble",
    "header": {
      "type": "box", "layout": "horizontal", "backgroundColor": color, "paddingAll": "20px",
      "contents": [
        { "type": "text", "text": icon, "size": "xl", "flex": 0 },
        { "type": "text", "text": title, "weight": "bold", "color": "#FFFFFF", "size": "lg", "margin": "md", "flex": 1 }
      ]
    },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "md", "paddingAll": "25px",
      "contents": [
        { "type": "text", "text": subtitle, "size": "sm", "color": "#64748B", "weight": "bold" },
        {
          "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": [
            { "type": "text", "text": (amount || 0).toLocaleString(), "size": "3xl", "weight": "black", "color": color, "flex": 0 },
            { "type": "text", "text": "บาท", "size": "xl", "weight": "bold", "color": color, "gravity": "bottom", "flex": 0, "margin": "md" }
          ]
        },
        isShares ? {
          "type": "box", "layout": "vertical", "backgroundColor": "#F0FDFA", "paddingAll": "12px", "cornerRadius": "xl", "margin": "xl", "contents": [
            { "type": "text", "text": "สิทธิประโยชน์: มีสิทธิได้รับปันผลประจำปี", "size": "xs", "weight": "black", "color": color, "align": "center" }
          ]
        } : { "type": "box", "layout": "vertical", "contents": [] }
      ]
    }
  };
}

function generateHistoryFlex(member) {
  const txs = (member.transactions || []).slice(-5).reverse();
  return {
    "type": "bubble",
    "header": { "type": "box", "layout": "vertical", "backgroundColor": "#334155", "paddingAll": "15px", "contents": [{ "type": "text", "text": "📜 ประวัติชำระเงิน 5 ครั้งล่าสุด", "color": "#FFFFFF", "weight": "bold" }] },
    "body": {
      "type": "box", "layout": "vertical", "spacing": "sm", "paddingAll": "20px",
      "contents": txs.length > 0 ? txs.map(tx => ({
        "type": "box", "layout": "horizontal", "contents": [
          { "type": "text", "text": tx.date, "size": "xs", "color": "#64748B" },
          { "type": "text", "text": tx.totalAmount.toLocaleString() + " ฿", "size": "xs", "weight": "bold", "align": "end", "color": "#1E293B" }
        ]
      })) : [{ "type": "text", "text": "ไม่พบประวัติการชำระเงิน", "align": "center", "color": "#94A3B8", "size": "sm" }]
    }
  };
}
