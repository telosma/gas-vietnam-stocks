const CONFIG_SHEET = 'configs'
const MAIL_SUBJECT = 'test'
var Config = {}

function test() {
  loadConfig()
  sendMail("<h2>hi there!</h2>")
}

function loadConfig() {
  let sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET);
  let data = sheet.getDataRange().getValues();
  for (var i in data) {
    let row = data[i];
    if (Config[row[0]]) {
      Config[row[0]].push(row[1])
    } else {
      Config[row[0]] = [row[1]]
    }
  }
  Logger.log(Config)
}

function getStockPrice(symbols) {
  const response = UrlFetchApp.fetch("https://priceservice.vndirect.com.vn/priceservice/secinfo/snapshot/q=codes:" + symbols)
  const json = response.getContentText()
  const data = JSON.parse(json)

  const stockData = data.reduce(
    (accumulator, d) => {
      const arrStock = d.split("|")
      accumulator[arrStock[3]] = {
        price: arrStock[19],
        r_price: arrStock[8],
        h_price: arrStock[13],
        l_price: arrStock[14],
        volume: arrStock[36],
        f_buy_volume: arrStock[37],
        f_sell_volume: arrStock[38]
      }
    return accumulator
  }, {})

  return stockData
}


function getAllPrices() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("stocks")
  var symbols = sheet.getRange("A3:A10").getValues()
  symbols = symbols.filter(function(s) {
    return s[0].length > 0
  }).map(function(s) {
    return s[0]
  })

  Logger.log(symbols)

  const stocks = getStockPrice(symbols)
  let startRow = 3
  for (let idx = 0; idx < symbols.length; idx++) {
    if (!stocks[symbols[idx]]) continue
    
    const curStock = stocks[symbols[idx]]
    const row = startRow + idx

    const refPriceRange = sheet.getRange(row, 5, 1, 1)
    const priceRange = sheet.getRange(row, 6, 1, 1)
    const highestPriceRange = sheet.getRange(row, 7, 1, 1)
    const lowestPriceRange = sheet.getRange(row, 8, 1, 1)
    const totalVolumeRange = sheet.getRange(row, 9, 1, 1)
    const foreignBuyRange = sheet.getRange(row, 10, 1, 1)
    const foreignSellRange = sheet.getRange(row, 11, 1, 1)
    
    const oldPrice = priceRange.getValue()
    const refPrice = stocks[symbols[idx]]['r_price']
    const curPrice = stocks[symbols[idx]]['price']
    
    if (curPrice > refPrice) {
      priceRange.setFontColor('green')
    } else if (curPrice < refPrice) {
      priceRange.setFontColor('red')
    }
    
    refPriceRange.setValue(curStock['r_price'])
    priceRange.setValue(curStock['price'])
    highestPriceRange.setValue(curStock['h_price'])
    lowestPriceRange.setValue(curStock['l_price'])
    totalVolumeRange.setValue(curStock['volume'])
    foreignBuyRange.setValue(curStock['f_buy_volume'])
    foreignSellRange.setValue(curStock['f_sell_volume'])
  }
  sheet.getRange(1, 1, 1, 1).setValue("Last update: " + new Date().toLocaleString('vn-VI', { timeZone: 'Asia/Ho_Chi_Minh' }))
}

/**
 * Google trigger function. When the sheet is opened, a custom menu is produced.
 * 
 */

function onOpen() {
  getAllPrices();
  SpreadsheetApp.getUi()
  .createMenu('Stock Utils')
  .addItem('Refresh', 'getAllPrices')
  .addItem("Enable send mail","enableSendMail")
  .addToUi();
}

function enableSendMail() {
  Config.enableSendMail = true
}

/**
 * Send mail
 */
function sendMail(htmlBody) {
  for (var i in Config.email_receiver) {
    MailApp.sendEmail(Config.email_receiver[i], MAIL_SUBJECT, '', {htmlBody: htmlBody});  
  }  
}


/********************************************************
 * Mail HTML body
 */
function createHeader(type, content, body) {
  return body + `<${type}>${content}</${type}>`
}

function createTblHeader(body) {
  let TABLEFORMAT = 'cellspacing="2" cellpadding="2" dir="ltr" border="1" style="width:100%;table-layout:fixed;font-size:10pt;font-family:arial,sans,sans-serif;border-collapse:collapse;border:1px solid #ccc;font-weight:normal;color:black;background-color:white;text-align:center;text-decoration:none;font-style:normal;'
  let header = '<table ' + TABLEFORMAT +' ">';
  return body + header
}

function createTblEnd(body) {
  return body + "</table>";
}

function createRow(isHeader, colVals, body, colProps) {
  let colTagStart = '<td>';
  let colTagEnd = '</td>';
  if (isHeader) {
    colTagStart = '<th';
    colTagEnd = '</th>';
  }
  let row = '';
  for (var i in ColNames) {
    colStr = colTagStart
    if (colProps.length > 0) {
      colStr += " " + colProps[i] + ">"
    }
    row += `${colStr}${colVals[i]}${colTagEnd}`;
  }
  row = `<tr>${row}</tr>`
  return body + row
}


