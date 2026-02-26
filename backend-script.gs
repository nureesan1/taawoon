
/******** CONFIG *********/
const SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_TOKEN = "fSC99nQ32pISc+43cC4rkIsuxVsVhF4AmSqGCZ3qL/pgyUaAKgAkFERipkTqN66G9LCL/qC9eEhIsg7VIfshepVsSQi/QvGsyUbBj4eNzaKsCwPM8c83GlNUv4oibxX/bmTniEAWBKmcGp3JCImSHQdB04t89/1O/w1cDnyilFU="; 
const SHEET_NAME = "Members";

/******** ENTRY POINTS *********/

function doGet(e) {
  return ContentService.createTextOutput("🚀 ระบบสหกรณ์ตะอาวุน (System is Online)\nWebhook URL นี้พร้อมใช้งานสำหรับ WebApp, LINE และ Dialogflow ครับ")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return responseError("No data received");
    }

    const contents = JSON.parse(e.postData.contents);
    
    // 1. DIALOGFLOW FULFILLMENT PART
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
    }

    // 2. LINE WEBHOOK PART
    if (contents.events && contents.events.length > 0) {
      const event = contents.events[0];
      if (!event || !event.replyToken) return responseOK({});

      const userId = event.source.userId;
      const text = (event.message.text || "").trim();

      // Register by ID Card (13 digits)
      if (/^\d{13}$/.test(text)) {
        const member = getMemberByIdCard(text);
        if (!member) return reply(event.replyToken, "❌ ไม่พบเลขบัตรประชาชนนี้ในระบบสมาชิกครับ");

        saveLink(userId, member.ID);
        return reply(event.replyToken, "✅ ลงทะเบียนสำเร็จ\nสวัสดีคุณ " + member.Name + "\nตอนนี้ท่านสามารถเช็คยอดหนี้ หุ้น หรือเงินออมได้แล้วครับ");
      }

      const member = getLinkedMember(userId);
      if (!member) return reply(event.replyToken, "ยินดีต้อนรับสู่ สหกรณ์ตะอาวุน\nกรุณาส่งเลขบัตรประชาชน 13 หลัก เพื่อลงทะเบียนเข้าสู่ระบบครับ");

      // Commands
      if (text === "ยอดหนี้") return replyFlex(event.replyToken, flexDebt(member));
      if (text === "หุ้นสะสม") return replyFlex(event.replyToken, flexShares(member));
      if (text === "เงินออมทรัพย์") return replyFlex(event.replyToken, flexSavings(member));
      if (text === "ข้อมูลสมาชิก") return reply(event.replyToken, "👤 ข้อมูลสมาชิกของคุณ\nชื่อ: " + member.Name + "\nรหัสสมาชิก: " + member.Code);

      return reply(event.replyToken, "พิมพ์คำที่ต้องการทราบ:\n- ยอดหนี้\n- หุ้นสะสม\n- เงินออมทรัพย์");
    }

    // 3. WEBAPP DASHBOARD PART
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

/******** DIALOGFLOW FULFILLMENT LOGIC *********/

function handleDialogflowFulfillment(contents) {
  const queryResult = contents.queryResult;
  const intentName = queryResult.intent.displayName;
  const queryText = queryResult.queryText;
  
  let idCard = queryResult.parameters.idcard || "";
  if (!idCard && /^\d{13}$/.test(queryText)) {
    idCard = queryText;
  }

  if (!idCard) {
    const lineUserId = contents.originalDetectIntentRequest?.payload?.data?.source?.userId;
    if (lineUserId) {
      const linked = getLinkedMember(lineUserId);
      if (linked) idCard = linked.IDCard;
    }
  }

  if (!idCard) {
    return ContentService.createTextOutput(JSON.stringify({
      fulfillmentText: "กรุณาระบุเลขบัตรประชาชน 13 หลัก เพื่อให้ระบบดึงข้อมูลให้ครับ"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const mRow = getMemberRowRaw(idCard);
  if (!mRow) {
    return ContentService.createTextOutput(JSON.stringify({
      fulfillmentText: "❌ ไม่พบข้อมูลสมาชิกที่ตรงกับเลขบัตรประชาชนนี้ครับ"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Column Index (0-based) based on Spreadsheet Image:
  // 0:ID, 1:Name, 2:MemberCode, 3:IDCard, 4:Phone, 5:Address, 6:JoinedDate, 7:Type, 
  // 8:Shares, 9:Savings, 10:HousingDebt, 11:LandDebt, 12:GenDebt, 13:Monthly, 14:Missed

  let replyText = "";
  const isDebtRequest = intentName === 'check_debt' || queryText.includes("ยอดหนี้") || queryText.includes("หนี้");
  const isSavingRequest = intentName === 'check_saving' || queryText.includes("ออม") || queryText.includes("เงินฝาก");
  const isShareRequest = intentName === 'check_share' || queryText.includes("หุ้น");
  const isInfoRequest = intentName === 'member_info' || queryText.includes("ข้อมูล");

  if (isDebtRequest) {
    const housing = Number(mRow[10]) || 0;
    const land = Number(mRow[11]) || 0;
    const gen = Number(mRow[12]) || 0;
    const total = housing + land + gen;
    replyText = `📉 ยอดหนี้ของคุณ ${mRow[1]}\nรวมทั้งสิ้น: ${total.toLocaleString()} บาท\n` +
                `- หนี้ค่าบ้าน: ${housing.toLocaleString()} บาท\n` +
                `- หนี้ค่าที่ดิน: ${land.toLocaleString()} บาท\n` +
                `- สินเชื่อทั่วไป: ${gen.toLocaleString()} บาท\n` +
                `⚠️ ค้างชำระสะสม: ${mRow[14] || 0} งวด`;
  } 
  else if (isSavingRequest) {
    const saving = Number(mRow[9]) || 0;
    replyText = `💰 เงินออมทรัพย์ของคุณ ${mRow[1]} มียอดคงเหลือ ${saving.toLocaleString()} บาทครับ`;
  } 
  else if (isShareRequest) {
    const share = Number(mRow[8]) || 0;
    replyText = `🏛️ ทุนเรือนหุ้นสะสมของคุณ ${mRow[1]} มียอดรวม ${share.toLocaleString()} บาทครับ`;
  } 
  else if (isInfoRequest) {
    replyText = `👤 ข้อมูลสมาชิก\nชื่อ: ${mRow[1]}\nรหัส: ${mRow[2]}\nประเภท: ${mRow[7] === 'associate' ? 'สมาชิกสมทบ' : 'สมาชิกสามัญ'}\nวันที่สมัคร: ${mRow[6] || '-'}`;
  } 
  else {
    replyText = `ยินดีต้อนรับคุณ ${mRow[1]} ครับ ตอนนี้ระบบพร้อมแล้ว ท่านต้องการทราบข้อมูล "ยอดหนี้" "หุ้นสะสม" หรือ "เงินออมทรัพย์" ดีครับ?`;
  }

  return ContentService.createTextOutput(JSON.stringify({
    fulfillmentText: replyText
  })).setMimeType(ContentService.MimeType.JSON);
}

/******** DATABASE FUNCTIONS *********/

function getMemberRowRaw(idCard) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) return null;
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]).replace(/\D/g,'') === idCard.replace(/\D/g,'')) {
      return data[i];
    }
  }
  return null;
}

function getMemberByIdCard(idCard) {
  const row = getMemberRowRaw(idCard);
  return row ? mapMember(row) : null;
}

function mapMember(r) {
  return {
    ID: String(r[0]), Name: String(r[1]), Code: String(r[2]), IDCard: String(r[3]),
    Phone: String(r[4]), Address: String(r[5]), JoinedDate: String(r[6]), Type: String(r[7]),
    Shares: Number(r[8]) || 0, Savings: Number(r[9]) || 0,
    HousingDebt: Number(r[10]) || 0, LandDebt: Number(r[11]) || 0, GenDebt: Number(r[12]) || 0,
    Monthly: Number(r[13]) || 0, Missed: Number(r[14]) || 0
  };
}

function saveLink(userId, memberId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName("LineUsers");
  if (!sh) sh = ss.insertSheet("LineUsers");
  if (sh.getLastRow() === 0) sh.appendRow(["UserID", "MemberID", "Timestamp"]);
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) { sh.deleteRow(i + 1); break; }
  }
  sh.appendRow([userId, memberId, new Date()]);
}

function getLinkedMember(userId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const shLink = ss.getSheetByName("LineUsers");
  if (!shLink) return null;
  const links = shLink.getDataRange().getValues();
  let mid = null;
  for (let i = 1; i < links.length; i++) {
    if (links[i][0] == userId) { mid = links[i][1]; break; }
  }
  if (!mid) return null;
  const shMem = ss.getSheetByName(SHEET_NAME);
  const memData = shMem.getRange(2, 1, Math.max(1, shMem.getLastRow() - 1), 15).getValues();
  for (let r of memData) {
    if (String(r[0]) == String(mid)) return mapMember(r);
  }
  return null;
}

/******** FLEX UI *********/

function flexDebt(m) {
  const total = m.HousingDebt + m.LandDebt + m.GenDebt;
  return {
    type: "bubble",
    body: {
      type: "box", layout: "vertical", contents: [
        { type: "text", text: "📉 ยอดหนี้คงเหลือ", weight: "bold", size: "xl" },
        { type: "text", text: total.toLocaleString() + " บาท", size: "xxl", color: "#FF0000", weight: "bold" },
        { type: "separator", margin: "md" },
        { type: "box", layout: "vertical", margin: "md", spacing: "sm", contents: [
          { type: "text", text: "บ้าน: " + m.HousingDebt.toLocaleString() + " ฿", size: "sm" },
          { type: "text", text: "ที่ดิน: " + m.LandDebt.toLocaleString() + " ฿", size: "sm" },
          { type: "text", text: "ทั่วไป: " + m.GenDebt.toLocaleString() + " ฿", size: "sm" },
          { type: "text", text: "ค้างชำระ " + m.Missed + " งวด", color: "#FF0000", weight: "bold", size: "sm", margin: "sm" }
        ]}
      ]
    }
  };
}

function flexShares(m) {
  return {
    type: "bubble",
    body: {
      type: "box", layout: "vertical", contents: [
        { type: "text", text: "🏛️ หุ้นสะสม", weight: "bold", size: "xl" },
        { type: "text", text: m.Shares.toLocaleString() + " บาท", size: "xxl", color: "#008000", weight: "bold" }
      ]
    }
  };
}

function flexSavings(m) {
  return {
    type: "bubble",
    body: {
      type: "box", layout: "vertical", contents: [
        { type: "text", text: "💰 เงินออมทรัพย์", weight: "bold", size: "xl" },
        { type: "text", text: m.Savings.toLocaleString() + " บาท", size: "xxl", color: "#008000", weight: "bold" }
      ]
    }
  };
}

/******** LINE REPLY *********/

function reply(token, text) {
  return UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    headers: { Authorization: "Bearer " + LINE_TOKEN },
    contentType: "application/json",
    payload: JSON.stringify({ replyToken: token, messages: [{ type: "text", text: text }] }),
    muteHttpExceptions: true
  });
}

function replyFlex(token, flex) {
  return UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    headers: { Authorization: "Bearer " + LINE_TOKEN },
    contentType: "application/json",
    payload: JSON.stringify({ replyToken: token, messages: [{ type: "flex", altText: "ข้อมูลสมาชิก", contents: flex }] }),
    muteHttpExceptions: true
  });
}

/******** WEBAPP DASHBOARD HELPERS *********/

function handleGetData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const mSheet = ss.getSheetByName(SHEET_NAME);
  const tSheet = ss.getSheetByName("Transactions");
  const lSheet = ss.getSheetByName("Ledger");
  const mData = mSheet.getDataRange().getValues();
  const tData = tSheet ? tSheet.getDataRange().getValues() : [];
  const lData = lSheet ? lSheet.getDataRange().getValues() : [];
  const txMap = {};
  if (tData.length > 1) {
    tData.slice(1).forEach(r => {
      const mid = String(r[1]);
      if (!txMap[mid]) txMap[mid] = [];
      txMap[mid].push({ 
        id: String(r[0]), memberId: String(r[1]), date: String(r[2]), timestamp: Number(r[3]),
        housing: Number(r[4])||0, land: Number(r[5])||0, shares: Number(r[6])||0, savings: Number(r[7])||0, 
        welfare: Number(r[8])||0, insurance: Number(r[9])||0, donation: Number(r[10])||0, 
        generalLoan: Number(r[11])||0, totalAmount: Number(r[12])||0 
      });
    });
  }
  return { 
    members: mData.slice(1).map(r => ({
      id: String(r[0]), name: String(r[1]), memberCode: String(r[2]),
      personalInfo: { idCard: String(r[3]), phone: String(r[4]), address: String(r[5]) },
      joinedDate: String(r[6]), memberType: String(r[7]),
      accumulatedShares: Number(r[8])||0, savingsBalance: Number(r[9])||0,
      housingLoanBalance: Number(r[10])||0, landLoanBalance: Number(r[11])||0,
      generalLoanBalance: Number(r[12])||0, monthlyInstallment: Number(r[13])||0,
      missedInstallments: Number(r[14])||0, transactions: txMap[String(r[0])] || []
    })),
    ledger: lData.length > 1 ? lData.slice(1).map(r => ({ 
      id: String(r[0]), date: String(r[1]), type: String(r[2]), category: String(r[3]),
      description: String(r[4]), amount: Number(r[5])||0, paymentMethod: String(r[6]),
      recordedBy: String(r[7]), timestamp: Number(r[8])
    })) : []
  };
}

function handleAddMember(member) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  sh.appendRow([
    member.id,             // A:0
    member.name,           // B:1
    member.memberCode,     // C:2
    member.personalInfo.idCard, // D:3
    member.personalInfo.phone,  // E:4
    member.personalInfo.address, // F:5
    member.joinedDate,     // G:6
    member.memberType,     // H:7
    member.accumulatedShares, // I:8
    member.savingsBalance,    // J:9
    member.housingLoanBalance, // K:10
    member.landLoanBalance,   // L:11
    member.generalLoanBalance, // M:12
    member.monthlyInstallment, // N:13
    member.missedInstallments // O:14
  ]);
  return { status: "success" };
}

function handleUpdateMember(id, data) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const d = sh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) {
      if (data.name !== undefined) sh.getRange(i+1, 2).setValue(data.name);
      if (data.joinedDate !== undefined) sh.getRange(i+1, 7).setValue(data.joinedDate);
      if (data.memberType !== undefined) sh.getRange(i+1, 8).setValue(data.memberType);
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
  return { status: "error" };
}

function handleDeleteMember(id) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const d = sh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) { if (String(d[i][0]) === String(id)) { sh.deleteRow(i + 1); return { status: "success" }; } }
  return { status: "error" };
}

function handleAddTransaction(tx) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let tSh = ss.getSheetByName("Transactions");
  if (!tSh) tSh = ss.insertSheet("Transactions");
  const mSh = ss.getSheetByName(SHEET_NAME);
  tSh.appendRow([
    tx.id, tx.memberId, tx.date, tx.timestamp, 
    tx.housing, tx.land, tx.shares, tx.savings, 
    tx.welfare, tx.insurance, tx.donation, tx.generalLoan, 
    tx.totalAmount, tx.recordedBy, tx.paymentMethod
  ]);
  const d = mSh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(tx.memberId)) {
      mSh.getRange(i+1, 9).setValue((Number(d[i][8])||0) + (Number(tx.shares)||0));
      mSh.getRange(i+1, 10).setValue((Number(d[i][9])||0) + (Number(tx.savings)||0));
      mSh.getRange(i+1, 11).setValue(Math.max(0, (Number(d[i][10])||0) - (Number(tx.housing)||0)));
      mSh.getRange(i+1, 12).setValue(Math.max(0, (Number(d[i][11])||0) - (Number(tx.land)||0)));
      mSh.getRange(i+1, 13).setValue(Math.max(0, (Number(d[i][12])||0) - (Number(tx.generalLoan)||0)));
      break;
    }
  }
  return { status: "success" };
}

function handleDeleteTransaction(id, memberId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tSh = ss.getSheetByName("Transactions");
  const mSh = ss.getSheetByName(SHEET_NAME);
  const tData = tSh.getDataRange().getValues();
  for (let i = 1; i < tData.length; i++) {
    if (String(tData[i][0]) === String(id)) {
      const tx = {
        housing: tData[i][4], land: tData[i][5], shares: tData[i][6],
        savings: tData[i][7], generalLoan: tData[i][11]
      };
      const d = mSh.getDataRange().getValues();
      for (let j = 1; j < d.length; j++) {
        if (String(d[j][0]) === String(memberId)) {
          mSh.getRange(j+1, 9).setValue((Number(d[j][8])||0) - (Number(tx.shares)||0));
          mSh.getRange(j+1, 10).setValue((Number(d[j][9])||0) - (Number(tx.savings)||0));
          mSh.getRange(j+1, 11).setValue((Number(d[j][10])||0) + (Number(tx.housing)||0));
          mSh.getRange(j+1, 12).setValue((Number(d[j][11])||0) + (Number(tx.land)||0));
          mSh.getRange(j+1, 13).setValue((Number(d[j][12])||0) + (Number(tx.generalLoan)||0));
          break;
        }
      }
      tSh.deleteRow(i + 1);
      break;
    }
  }
  return { status: "success" };
}

function handleInitDatabase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let mSheet = ss.getSheetByName(SHEET_NAME); if(!mSheet) mSheet = ss.insertSheet(SHEET_NAME);
  if (mSheet.getLastRow() === 0) mSheet.appendRow(["ID", "Name", "MemberCode", "IDCard", "Phone", "Address", "JoinedDate", "Type", "Shares", "Savings", "HousingDebt", "LandDebt", "GenDebt", "Monthly", "Missed"]);
  return { message: "Database initialized" };
}

function logError(msg) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName("ErrorLogs");
    if (!sh) { sh = ss.insertSheet("ErrorLogs"); sh.appendRow(["Date", "Message"]); }
    sh.appendRow([new Date(), msg]);
  } catch(e) {}
}

function responseOK(obj) { return ContentService.createTextOutput(JSON.stringify({ status: "success", ...obj })).setMimeType(ContentService.MimeType.JSON); }
function responseError(msg) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg })).setMimeType(ContentService.MimeType.JSON); }
