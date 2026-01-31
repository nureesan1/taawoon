
/**
 * TAAWOON COOP API & LINE WEBHOOK (UPDATED VERSION)
 * Channel ID: 1657818526
 * Features: 13-digit ID Registration, Rich Menu, Balance & History Inquiry.
 */

const TARGET_SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
/**
 * หมายเหตุ: 8b2658cafe7f9c4e36ff57aadc4cae5b คือ Channel Secret
 * สำคัญ: ในการส่งข้อความตอบกลับ LINE Messaging API ต้องใช้ "Channel Access Token (Long-lived)"
 * หากใช้ Secret แล้วส่งไม่สำเร็จ ให้คัดลอก Access Token จากเมนู Messaging API ใน LINE Developers มาวางแทนครับ
 */
const LINE_ACCESS_TOKEN = "8b2658cafe7f9c4e36ff57aadc4cae5b"; 

/* ================= CORE API HANDLERS ================= */

function getSS() {
  return SpreadsheetApp.openById(TARGET_SHEET_ID);
}

function doGet(e) {
  try {
    if (e.parameter.action) return handleRequest(e);
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif; text-align:center; padding:50px;'>" +
      "<h2 style='color:#064e3b'>✅ ระบบสหกรณ์ตะอาวุน (LINE API) ONLINE</h2>" +
      "<p>สถานะ: พร้อมใช้งาน (Ready)</p>" +
      "<p style='color:#666; font-size:12px;'>Channel ID: 1657818526</p></div>"
    );
  } catch (e) {
    return HtmlService.createHtmlOutput("<h2 style='color:red'>❌ ERROR: " + e.message + "</h2>");
  }
}

/**
 * Handle POST requests from WebApp and LINE Webhook
 */
function doPost(e) {
  if (!e.postData || !e.postData.contents) return responseOK({ message: "No data" });
  
  const bodyText = e.postData.contents;
  console.log("LINE RAW RECEIVED:", bodyText);
  
  // ตรวจสอบว่าเป็น Webhook จาก LINE หรือไม่
  if (bodyText.includes('"events"')) {
    return handleLineWebhook(bodyText);
  }
  
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const payload = parsePayload(e);
    const action = payload.action;
    const data = payload.data || payload;

    if (!action) return responseError("Missing action");

    const ss = getSS();
    const Members = getSheet(ss, "Members");
    const Transactions = getSheet(ss, "Transactions");
    const Ledger = getSheet(ss, "Ledger");

    switch (action) {
      case "ping": return responseOK({ message: "pong" });
      case "initDatabase":
        initHeaders(ss);
        return responseOK({ message: "Database initialized" });
      case "getData":
        return responseOK({
          members: getMembers(Members, Transactions),
          ledger: getLedger(Ledger)
        });
      case "addMember":
        Members.appendRow(mapMember(data.member));
        return responseOK({ message: "Member added" });
      case "updateMember":
        updateMemberInSheet(Members, data.id, data.data);
        return responseOK({ message: "Member updated" });
      case "deleteMember":
        deleteById(Members, data.id);
        return responseOK({ message: "Member deleted" });
      case "addTransaction":
        const tx = data.transaction || data;
        validateTx(tx);
        Transactions.appendRow(mapTransaction(tx));
        updateBalances(Members, tx);
        Ledger.appendRow(mapLedger(tx));
        return responseOK({ message: "Transaction saved" });
      case "deleteTransaction":
        revertBalances(Members, Transactions, data.id, data.memberId);
        deleteById(Transactions, data.id);
        deleteById(Ledger, "L-TX-" + data.id);
        return responseOK({ message: "Transaction reverted & deleted" });
      default:
        return responseError("Unknown action: " + action);
    }
  } catch (err) {
    return responseError(err.message);
  }
}

/* ================= LINE BOT LOGIC ================= */

/**
 * Main Webhook Handler with Multi-Event Support
 */
function handleLineWebhook(bodyText) {
  const data = JSON.parse(bodyText);

  data.events.forEach(event => {
    if (event.type !== "message" || event.message.type !== "text") return;

    const replyToken = event.replyToken;
    const text = event.message.text.trim();
    const userId = event.source.userId;

    // 1. ตรวจสอบการผูกบัญชีในฐานข้อมูล
    const linked = getLinkedMember(userId);
    let reply = "";

    if (!linked) {
      // กรณีที่ยังไม่ผูกบัญชี: ตรวจสอบว่าเป็นเลขบัตร 13 หลักเพื่อลงทะเบียนหรือไม่
      if (/^\d{13}$/.test(text)) {
        const member = findMemberByIdCard(text);
        if (member) {
          linkLineUser(userId, member.id, text);
          reply = `✅ ยืนยันตัวตนสำเร็จ!\nยินดีต้อนรับคุณ ${member.name}\n\nขณะนี้ท่านสามารถตรวจสอบยอดเงินและประวัติได้ทันทีผ่านเมนูด้านล่างครับ 🙏`;
        } else {
          reply = "❌ ไม่พบข้อมูลสมาชิกที่ตรงกับเลขบัตรประชาชนนี้ โปรดตรวจสอบความถูกต้อง หรือติดต่อเจ้าหน้าที่สหกรณ์ (089-5952329)";
        }
      } else {
        reply = "🙏 สวัสดีครับ ยินดีต้อนรับสู่ LINE สหกรณ์ตะอาวุน\n\nกรุณาพิมพ์ 'เลขบัตรประชาชน 13 หลัก' ของท่านเพื่อเริ่มต้นผูกบัญชีและเช็คยอดหนี้ครับ";
      }
    } else {
      // กรณีผูกบัญชีแล้ว: จัดการคำสั่งจากข้อความหรือ Rich Menu
      const member = findMemberById(linked.memberId);
      if (!member) {
        reply = "❌ เกิดข้อผิดพลาด: ไม่พบข้อมูลสมาชิกในระบบ โปรดพิมพ์ 'ยกเลิก' เพื่อผูกบัญชีใหม่อีกครั้ง";
      } else {
        // จัดการคำสั่งตาม Keyword
        if (text === "📊 ยอดคงเหลือ" || text === "ยอดเงิน" || text === "เช็คยอด") {
          reply = generateBalanceReport(member);
        } 
        else if (text === "📜 ประวัติการชำระ" || text === "ประวัติ" || text === "history") {
          reply = generateHistoryReport(member);
        }
        else if (text === "ข้อมูลสมาชิก") {
          reply = `👤 ข้อมูลสมาชิก\n------------------\nชื่อ: ${member.name}\nรหัส: ${member.memberCode}\nประเภท: ${member.memberType === 'associate' ? 'สมทบ' : 'สามัญ'}\nวันที่เข้าร่วม: ${member.joinedDate}`;
        }
        else if (text === "ติดต่อ") {
          reply = "📞 ติดต่อเจ้าหน้าที่สหกรณ์\nโทร. 089-595-2329 (คุณนูรีซัน)";
        }
        else if (text === "ยกเลิก") {
          unlinkLineUser(userId);
          reply = "🚫 ยกเลิกการผูกบัญชีเรียบร้อยแล้ว ท่านสามารถลงทะเบียนใหม่ได้ตลอดเวลาด้วยเลขบัตร 13 หลักครับ";
        }
        else if (text === "ผูกบัญชี") {
          reply = `✅ บัญชีของคุณผูกอยู่กับ: ${member.name}\nรหัสสมาชิก: ${member.memberCode}`;
        }
        else {
          reply = `สวัสดีครับคุณ ${member.name} 🙏\n\nท่านสามารถเลือกเมนูจากแถบด้านล่าง หรือพิมพ์คำว่า "ยอดเงิน" เพื่อตรวจสอบยอดคงเหลือล่าสุดครับ`;
        }
      }
    }

    replyLine(replyToken, reply);
  });

  return responseOK({ message: "Handled" });
}

/**
 * Report: Balance Inquiry Template
 */
function generateBalanceReport(member) {
  const lastTx = member.transactions && member.transactions.length > 0 
    ? member.transactions.sort((a,b) => b.timestamp - a.timestamp)[0] 
    : null;
    
  const lastDate = lastTx ? lastTx.date : "ไม่มีข้อมูล";
  const missedAmount = (member.monthlyInstallment || 0) * (member.missedInstallments || 0);

  return `
📊 รายงานยอดคงเหลือ
------------------
คุณ: ${member.name}
💰 เงินออม: ${member.savingsBalance.toLocaleString()} บาท
🏠 ค้างชำระ: ${missedAmount.toLocaleString()} บาท
📅 งวดล่าสุด: ${lastDate}

*ข้อมูล ณ วันที่ ${new Date().toLocaleDateString('th-TH')}*
`.trim();
}

/**
 * Report: History Inquiry Template
 */
function generateHistoryReport(member) {
  if (!member.transactions || member.transactions.length === 0) {
    return "📜 ไม่พบประวัติการชำระเงินในระบบ";
  }
  
  const sortedTxs = [...member.transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  
  let msg = "📜 ประวัติการชำระ (5 รายการล่าสุด)\n------------------\n";
  sortedTxs.forEach(r => {
    const typeStr = r.paymentMethod === 'transfer' ? 'เงินโอน' : 'เงินสด';
    msg += `📅 ${r.date} | ${r.totalAmount.toLocaleString()} บาท (${typeStr})\n`;
  });
  
  return msg.trim();
}

/**
 * API: Send reply to LINE Messaging API
 */
function replyLine(replyToken, text) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = {
    replyToken: replyToken,
    messages: [{ type: "text", text: text }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + LINE_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    const resText = res.getContentText();
    console.log("LINE REPLY RESPONSE:", resText);
    
    // ตรวจสอบ Error เบื้องต้น
    if (resText.includes("Invalid reply token")) {
      console.error("Error: Reply token expired or invalid");
    }
  } catch (e) {
    console.error("LINE Reply Error: " + e.message);
  }
}

/* ================= DATABASE & UTILS ================= */

function getLinkedMember(lineUserId) {
  const ss = getSS();
  const sh = getSheet(ss, "LineUsers");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === lineUserId) return { memberId: data[i][1], idCard: data[i][2] };
  }
  return null;
}

function linkLineUser(lineUserId, memberId, idCard) {
  const ss = getSS();
  const sh = getSheet(ss, "LineUsers");
  sh.appendRow([lineUserId, memberId, idCard, new Date()]);
}

function unlinkLineUser(lineUserId) {
  const ss = getSS();
  const sh = getSheet(ss, "LineUsers");
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === lineUserId) { sh.deleteRow(i + 1); break; }
  }
}

function findMemberByIdCard(idCard) {
  const ss = getSS();
  const Members = getSheet(ss, "Members");
  const Transactions = getSheet(ss, "Transactions");
  const allMembers = getMembers(Members, Transactions);
  const cleanSearch = idCard.replace(/\D/g, '');
  return allMembers.find(m => {
    if (!m.personalInfo || !m.personalInfo.idCard) return false;
    return m.personalInfo.idCard.replace(/\D/g, '') === cleanSearch;
  });
}

function findMemberById(id) {
  const ss = getSS();
  const Members = getSheet(ss, "Members");
  const Transactions = getSheet(ss, "Transactions");
  const allMembers = getMembers(Members, Transactions);
  return allMembers.find(m => String(m.id) === String(id));
}

function parsePayload(e) {
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) {}
  }
  if (e.parameter && e.parameter.action) {
    return { action: e.parameter.action, data: e.parameter.data ? JSON.parse(e.parameter.data) : {} };
  }
  throw new Error("Invalid payload format");
}

function responseOK(obj) {
  return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON);
}

function responseError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON);
}

function getSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd");
}

function initHeaders(ss) {
  getSheet(ss, "Members").clear().appendRow(["ID","Name","Code","IDCard","Phone","Address","Joined","Type","Shares","Savings","HousingDebt","LandDebt","GeneralDebt","Monthly","Missed"]);
  getSheet(ss, "Transactions").clear().appendRow(["ID","MemberID","Date","Timestamp","Housing","Land","Shares","Savings","Welfare","Insurance","Donation","GeneralLoan","Other","Note","Total","Recorder","Method"]);
  getSheet(ss, "Ledger").clear().appendRow(["ID","Date","Type","Category","Description","Amount","Method","Recorder","Note","Timestamp"]);
  getSheet(ss, "LineUsers").clear().appendRow(["LineUserID", "MemberID", "IDCard", "LinkedDate"]);
}

function getMembers(mSheet, tSheet) {
  const m = mSheet.getDataRange().getValues();
  const t = tSheet.getDataRange().getValues();
  if (m.length < 2) return [];

  const txMap = {};
  t.slice(1).forEach(r => {
    const mid = String(r[1]);
    if(!txMap[mid]) txMap[mid]=[];
    txMap[mid].push({
      id: String(r[0]), memberId: mid, date: formatDate(r[2]), timestamp: Number(r[3]),
      housing: Number(r[4])||0, land: Number(r[5])||0, shares: Number(r[6])||0,
      savings: Number(r[7])||0, totalAmount: Number(r[14])||0, paymentMethod: String(r[16])
    });
  });

  return m.slice(1).map(r => ({
    id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
    personalInfo: { idCard: String(r[3]), phone: String(r[4]), address: String(r[5]) },
    joinedDate: formatDate(r[6]), memberType: r[7],
    accumulatedShares: Number(r[8])||0, savingsBalance: Number(r[9])||0,
    housingLoanBalance: Number(r[10])||0, landLoanBalance: Number(r[11])||0,
    generalLoanBalance: Number(r[12])||0, monthlyInstallment: Number(r[13])||0,
    missedInstallments: Number(r[14])||0, transactions: txMap[String(r[0])] || []
  }));
}

function getLedger(lSheet) {
  const rows = lSheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(r => ({
    id: String(r[0]), date: formatDate(r[1]), type: String(r[2]),
    category: String(r[3]), description: String(r[4]), amount: Number(r[5]),
    paymentMethod: String(r[6]), recordedBy: String(r[7]), timestamp: Number(r[9])
  }));
}

function mapMember(m) {
  return [m.id, m.name, m.memberCode, m.personalInfo?.idCard||"", m.personalInfo?.phone||"", m.personalInfo?.address||"", m.joinedDate, m.memberType, m.accumulatedShares||0, m.savingsBalance||0, m.housingLoanBalance||0, m.landLoanBalance||0, m.generalLoanBalance||0, m.monthlyInstallment||0, m.missedInstallments||0];
}

function mapTransaction(tx) {
  return [tx.id, tx.memberId, tx.date, tx.timestamp, tx.housing||0, tx.land||0, tx.shares||0, tx.savings||0, tx.welfare||0, tx.insurance||0, tx.donation||0, tx.generalLoan||0, 0, "", tx.totalAmount, tx.recordedBy, tx.paymentMethod];
}

function mapLedger(tx) {
  return ["L-TX-" + tx.id, tx.date, "income", "รับชำระ", "รับจากสมาชิก " + tx.memberId, tx.totalAmount, tx.paymentMethod, tx.recordedBy, "Auto", tx.timestamp];
}

function validateTx(tx) { if (!tx || !tx.id || !tx.memberId) throw new Error("Transaction data incomplete"); }

function updateBalances(sheet, tx) {
  const rows = sheet.getDataRange().getValues();
  for (let i=1; i<rows.length; i++) {
    if (String(rows[i][0]) === String(tx.memberId)) {
      const r = i+1;
      sheet.getRange(r,9).setValue((Number(rows[i][8])||0) + (tx.shares||0));
      sheet.getRange(r,10).setValue((Number(rows[i][9])||0) + (tx.savings||0));
      sheet.getRange(r,11).setValue(Math.max(0, (Number(rows[i][10])||0) - (tx.housing||0)));
      sheet.getRange(r,12).setValue(Math.max(0, (Number(rows[i][11])||0) - (tx.land||0)));
      sheet.getRange(r,13).setValue(Math.max(0, (Number(rows[i][12])||0) - (tx.generalLoan||0)));
      break;
    }
  }
}

function revertBalances(mSheet, tSheet, txId, memberId) {
  const tData = tSheet.getDataRange().getValues();
  const t = tData.find(r => String(r[0]) === String(txId));
  if (!t) return;
  const m = mSheet.getDataRange().getValues();
  for (let i=1; i<m.length; i++) {
    if (String(m[i][0]) === String(memberId)) {
      const r=i+1;
      mSheet.getRange(r,9).setValue((Number(m[i][8])||0) - (Number(t[6])||0));
      mSheet.getRange(r,10).setValue((Number(m[i][9])||0) - (Number(t[7])||0));
      mSheet.getRange(r,11).setValue((Number(m[i][10])||0) + (Number(t[4])||0));
      mSheet.getRange(r,12).setValue((Number(m[i][11])||0) + (Number(t[5])||0));
      mSheet.getRange(r,13).setValue((Number(m[i][12])||0) + (Number(t[11])||0));
      break;
    }
  }
}

function deleteById(sheet, id) {
  const rows = sheet.getDataRange().getValues();
  for (let i=1; i<rows.length; i++) { if (String(rows[i][0]) === String(id)) { sheet.deleteRow(i+1); break; } }
}

function updateMemberInSheet(sheet, id, data) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const r = i + 1;
      if (data.name) sheet.getRange(r, 2).setValue(data.name);
      if (data.memberType) sheet.getRange(r, 8).setValue(data.memberType);
      if (data.personalInfo) {
        if (data.personalInfo.idCard) sheet.getRange(r, 4).setValue(data.personalInfo.idCard);
        if (data.personalInfo.phone) sheet.getRange(r, 5).setValue(data.personalInfo.phone);
        if (data.personalInfo.address) sheet.getRange(r, 6).setValue(data.personalInfo.address);
      }
      if (data.housingLoanBalance !== undefined) sheet.getRange(r, 11).setValue(data.housingLoanBalance);
      if (data.landLoanBalance !== undefined) sheet.getRange(r, 12).setValue(data.landLoanBalance);
      if (data.generalLoanBalance !== undefined) sheet.getRange(r, 13).setValue(data.generalLoanBalance);
      if (data.accumulatedShares !== undefined) sheet.getRange(r, 9).setValue(data.accumulatedShares);
      if (data.savingsBalance !== undefined) sheet.getRange(r, 10).setValue(data.savingsBalance);
      if (data.monthlyInstallment !== undefined) sheet.getRange(r, 14).setValue(data.monthlyInstallment);
      if (data.missedInstallments !== undefined) sheet.getRange(r, 15).setValue(data.missedInstallments);
      break;
    }
  }
}
