
/******** CONFIG *********/
const SHEET_ID = "1YJQaoc3vP_5wrLscsbB-OwX_35RtjawxxcbCtcno9_o";
const LINE_TOKEN = "fSC99nQ32pISc+43cC4rkIsuxVsVhF4AmSqGCZ3qL/pgyUaAKgAkFERipkTqN66G9LCL/qC9eEhIsg7VIfshepVsSQi/QvGsyUbBj4eNzaKsCwPM8c83GlNUv4oibxX/bmTniEAWBKmcGp3JCImSHQdB04t89/1O/w1cDnyilFU="; 

/******** ENTRY POINTS *********/

function doGet(e) {
  return ContentService.createTextOutput("🚀 ระบบสหกรณ์ตะอาวุน (System is Online)\nWebhook URL นี้พร้อมใช้งานสำหรับ LINE และ WebApp ครับ")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return responseError("No data received");
    }

    const contents = JSON.parse(e.postData.contents);
    
    // 1. LINE WEBHOOK PART
    if (contents.events && contents.events.length > 0) {
      const event = contents.events[0];
      if (!event || !event.replyToken) return responseOK({});

      const userId = event.source.userId;
      const text = (event.message.text || "").trim();

      // Register by ID Card (13 digits)
      if (/^\d{13}$/.test(text)) {
        const member = getMemberByIdCard(text);
        if (!member) return reply(event.replyToken, "❌ ไม่พบเลขบัตรนี้ในระบบ");

        saveLink(userId, member.ID);
        return reply(event.replyToken, "✅ ลงทะเบียนสำเร็จ\nสวัสดีคุณ " + member.Name);
      }

      const member = getLinkedMember(userId);
      if (!member) return reply(event.replyToken, "กรุณาส่งเลขบัตรประชาชน 13 หลัก เพื่อลงทะเบียนครับ");

      // Commands
      if (text === "ยอดหนี้") return replyFlex(event.replyToken, flexDebt(member));
      if (text === "หุ้นสะสม") return replyFlex(event.replyToken, flexShares(member));
      if (text === "เงินออมทรัพย์") return replyFlex(event.replyToken, flexSavings(member));
      if (text === "ข้อมูลสมาชิก") return reply(event.replyToken, "👤 ข้อมูลสมาชิกของคุณ\nชื่อ: " + member.Name + "\nรหัสสมาชิก: " + member.Code);

      return reply(event.replyToken, "พิมพ์คำที่ต้องการทราบ:\n- ยอดหนี้\n- หุ้นสะสม\n- เงินออมทรัพย์");
    }

    // 2. DIALOGFLOW FULFILLMENT PART
    if (contents.queryResult) {
      return handleDialogflowFulfillment(contents);
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

/******** GOOGLE SHEET READ (FAST + CACHE) *********/

function getMemberByIdCard(idCard) {
  const cache = CacheService.getScriptCache();
  const key = "ID_" + idCard;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName("Members");
  if (!sh) return null;
  
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  
  const data = sh.getRange(2, 1, lastRow - 1, 15).getValues();

  for (let r of data) {
    if (String(r[3]).replace(/\D/g,'') === idCard.replace(/\D/g,'')) {
      const m = mapMember(r);
      cache.put(key, JSON.stringify(m), 600); // Cache for 10 mins
      return m;
    }
  }
  return null;
}

function mapMember(r) {
  return {
    ID: String(r[0]), 
    Name: String(r[1]), 
    Code: String(r[2]), 
    IDCard: String(r[3]),
    Shares: Number(r[8]) || 0, 
    Savings: Number(r[9]) || 0,
    HousingDebt: Number(r[10]) || 0, 
    LandDebt: Number(r[11]) || 0, 
    GenDebt: Number(r[12]) || 0,
    Monthly: Number(r[13]) || 0, 
    Missed: Number(r[14]) || 0
  };
}

/******** LINK USER *********/

function saveLink(userId, memberId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName("LineUsers");
  if (!sh) sh = ss.insertSheet("LineUsers");
  if (sh.getLastRow() === 0) sh.appendRow(["UserID", "MemberID", "Timestamp"]);
  
  // Clean old links for this userId
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const shLink = ss.getSheetByName("LineUsers");
  if (!shLink) return null;
  
  const links = shLink.getDataRange().getValues();
  let mid = null;
  for (let i = 1; i < links.length; i++) {
    if (links[i][0] == userId) {
      mid = links[i][1];
      break;
    }
  }
  if (!mid) return null;

  const shMem = ss.getSheetByName("Members");
  const memData = shMem.getRange(2, 1, shMem.getLastRow() - 1, 15).getValues();
  for (let r of memData) {
    if (String(r[0]) == String(mid)) return mapMember(r);
  }
  return null;
}

/******** FLEX UI (AS REQUESTED) *********/

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
    payload: JSON.stringify({
      replyToken: token,
      messages: [{ type: "text", text: text }]
    }),
    muteHttpExceptions: true
  });
}

function replyLineFlex(token, altText, flex) {
  return replyFlex(token, flex); // Alias for compatibility
}

function replyFlex(token, flex) {
  return UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    method: "post",
    headers: { Authorization: "Bearer " + LINE_TOKEN },
    contentType: "application/json",
    payload: JSON.stringify({
      replyToken: token,
      messages: [{ type: "flex", altText: "ข้อมูลสมาชิก", contents: flex }]
    }),
    muteHttpExceptions: true
  });
}

/******** WEBAPP DASHBOARD HELPERS *********/

function handleGetData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
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
    ledger: lData.length > 1 ? lData.slice(1).map(r => ({ id: String(r[0]), amount: Number(r[5])||0 })) : []
  };
}

function handleAddMember(member) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName("Members");
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
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Members");
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
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Members");
  const d = sh.getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]) === String(id)) { sh.deleteRow(i + 1); return { status: "success" }; }
  }
  return { status: "error", message: "Member not found" };
}

function handleAddTransaction(tx) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tSh = ss.getSheetByName("Transactions");
  if (!tSh) ss.insertSheet("Transactions");
  const lSh = ss.getSheetByName("Ledger");
  if (!lSh) ss.insertSheet("Ledger");
  const mSh = ss.getSheetByName("Members");
  
  tSh.appendRow([
    tx.id, tx.memberId, tx.date, tx.timestamp,
    tx.housing, tx.land, tx.shares, tx.savings,
    tx.welfare, tx.insurance, tx.donation, tx.generalLoan,
    tx.totalAmount, tx.recordedBy, tx.paymentMethod
  ]);
  
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
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const tSh = ss.getSheetByName("Transactions");
  const mSh = ss.getSheetByName("Members");
  const lSh = ss.getSheetByName("Ledger");
  
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
    const lData = lSh.getDataRange().getValues();
    for (let j = 1; j < lData.length; j++) {
      if (String(lData[j][0]) === "L-TX-"+id) { lSh.deleteRow(j + 1); break; }
    }
  }
  return { status: "success" };
}

function handleInitDatabase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let mSheet = ss.getSheetByName("Members"); if(!mSheet) mSheet = ss.insertSheet("Members");
  if (mSheet.getLastRow() === 0) {
    mSheet.appendRow(["ID", "Name", "Code", "IDCard", "Phone", "Address", "Type", "JoinedDate", "Shares", "Savings", "HousingDebt", "LandDebt", "GeneralDebt", "MonthlyInstallment", "MissedInstallments"]);
  }
  let tSheet = ss.getSheetByName("Transactions"); if(!tSheet) tSheet = ss.insertSheet("Transactions");
  if (tSheet.getLastRow() === 0) {
    tSheet.appendRow(["ID", "MemberID", "Date", "Timestamp", "Housing", "Land", "Shares", "Savings", "Welfare", "Insurance", "Donation", "GeneralLoan", "Total", "RecordedBy", "Method"]);
  }
  let lSheet = ss.getSheetByName("Ledger"); if(!lSheet) lSheet = ss.insertSheet("Ledger");
  if (lSheet.getLastRow() === 0) {
    lSheet.appendRow(["ID", "Date", "Type", "Category", "Description", "Amount", "Method", "RecordedBy", "Timestamp"]);
  }
  return { message: "Database initialized" };
}

function handleDialogflowFulfillment(contents) {
  // Simple fulfillment for Dialogflow integration
  const queryResult = contents.queryResult;
  const fulfillmentText = "ระบบได้รับข้อมูลจาก Dialogflow แล้วครับ";
  return ContentService.createTextOutput(JSON.stringify({ fulfillmentText: fulfillmentText }))
    .setMimeType(ContentService.MimeType.JSON);
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
