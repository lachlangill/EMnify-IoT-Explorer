//variables = lower_case
//functions = camelCase
//constants = CAPS

// testing device IMEI - 8684460306494107
// testing device endpoint name - nbpi4 - lachlan
// 10.192.200.12

//----- VARIABLES -----//
var debug = true; //change to false when finished

var backlight = true;
var updateIntervalId; // 
var update_interval_ms = 10000; // timeout duration in ms

var all_operators = [];
var visible_gsm_networks = [];
var visible_catm_networks = [];
var visible_nb_networks = []; //these are populated by the scanCarriers() function
var scan_result = "";

//LTE bands
var LTE_B1 = "1";
var LTE_B2 = "2";
var LTE_B3 = "4";
var LTE_B4 = "8";
var LTE_B5 = "10";
var LTE_B8 = "80";
var LTE_B12 = "800";
var LTE_B13 = "1000";
var LTE_B18 = "20000";
var LTE_B19 = "40000";
var LTE_B20 = "80000";
var LTE_B26 = "2000000";
var LTE_B28 = "8000000";
var LTE_B39 = "4000000000";  // catm1 only
var LTE_CATM1_ANY = "400A0E189F";
var LTE_CATNB1_ANY = "A0E189F";
var LTE_NO_CHANGE = "0";

require("Font6x8").add(Graphics);
require("Font8x12").add(Graphics);



//----- DEVICE FUNCTIONS -----/
function toggleBacklight() {
	backlight = !backlight;
	digitalWrite(LED1,backlight);
}

function startupScreen() {
	//(0,0) to (127.63) are legal boundaries
	g.clear();
	//lines with text
	for (i=0;i<43;i+=3) g.drawLine(3*i,0,56+i,63);
	g.setColor(0);
	g.fillRect(35,32,91,46);
	g.setFont6x8();
	g.setColor(1);
	g.drawString("EMnify IoT", 41,36);
	g.flip();

	setTimeout(function() {mainScreen();}, 3000); //transition to next screen after 3 seconds
}

function mainScreen() {
	g.clear();
	g.flip();
	g.setFont8x12();
	g.drawString("Main Screen",30,0);
	g.setFontBitmap();
	/* g.drawString("Configuring modem for", 1,30);
	g.drawString("automatic test...", 1,36); */
	g.flip();
}

sendAtCommand = function (command, timeoutMs, waitForLine) {
	return new Promise((resolve, reject) => {
		var answer = "";
		at.cmd(command + "\r\n", timeoutMs || 1E3, function processResponse(response) {
			if (undefined === response || "ERROR" === response || response.startsWith("+CME ERROR")) {
				reject(response ? (command + ": " + response) : (command + ": TIMEOUT"));
			} else if (waitForLine ? (response.startsWith(waitForLine)) : ("OK" === response)) {
				resolve(waitForLine ? response : answer);
			} else {
				answer += (answer ? "\n" : "") + response;
				return processResponse;
			}
		});
	});
};

//----- MODEM FUNCTIONS -----//
function resetModem() {
	sendAtCommand('AT&F0')										//factory reset
	.then(() => sendAtCommand('ATE0'))							//command echo off
	.then(() => sendAtCommand('AT+CPIN?'));						//check if sim is locked/not present
}

function configureModem(lte_band) {
	sendAtCommand('AT+CFUN=4')												//turn modem transmitter to airplane mode to reconfigure	
	//.then(() => sendAtCommand('AT+QGPSEND'))								//disable GNSS
	.then(() => sendAtCommand('AT+QCFG=\"band\",0,' + lte_band + ',0'))		//config for specified band
	.then(() => sendAtCommand('AT+QCFG=\"nwscanseq\",02,1'))				//network scan sequence - 02=CAT-M
	.then(() => sendAtCommand('AT+QCFG=\"nwscanmode\",3,1'))				//scan mode - CAT-M
	.then(() => sendAtCommand('AT+QCFG=\"iotopmode\",0,1'))					//IoT search mode - 0=CAT-M only, 2=CAT-M and NBIoT
	.then(() => sendAtCommand('AT+QCFG=\"servicedomain\",1,1'))				//service domain - PS only
	.then(() => g.setFontBitmap())
	.then(() => g.drawString("Configured.", 1,57)) //indicate when fully configured
	.then(() => g.flip());
	
}

function connectModem(carrier) {
	//requires operator in numeric format
	sendAtCommand('AT+CGDCONT=1,\"IP\",\"em\",,')						//connection details
	.then(() => sendAtCommand('AT+CFUN=1'))								//turn on modem transmitter
	.then(() => sendAtCommand('AT+QGPS=1'))								//turn on GNSS
	.then(() => sendAtCommand('AT+CEREG=2'))							//register to network
	.then(() => sendAtCommand('AT+COPS=1,2,' + carrier + ',8', 5000));	//8 - CAT-M
}

function scanCarriers() {
	//TODO - AT+COPS=?
	sendAtCommand('AT+CFUN=1');
	scan_result = sendAtCommand('AT+COPS=?'); 
}

function parseScanResult() {
	console.log("scan_result = " + scan_result);
	var temp = JSON.stringify(scan_result);
	console.log("stringify temp = " + temp);
	var num = temp.indexOf("("); //find start of results
	if (num == -1) {											//auto rescan if no carriers are found
		console.log("No carriers found. Rescanning...");
		scanCarriers();
		setTimeout(function() {parseScanResult();}, 10000);
	}
	console.log("num = " + num);
	temp = temp.slice(num, -1); // remove junk from start of scan results
	console.log("slice temp = " + temp);
	temp = temp.split(",");
	
	var iteration = 0;
	var x1; // carrier index number from scan
	var x2; // long carrier name
	var x3; // short carrier name
	var x4; // location that holds the carrier number
	var carrier_id;
	
	var slice_position
	
	while (true) {
		
		carrier_id = temp[iteration + 3];
		all_operators[iteration] = carrier_id.slice(2,-2); // WORKING FOR ONE CARRIER
		console.log("carrier ID = " + all_operators[iteration]);
		
		break; // TODO - remove and test with multiple carriers 
	
	}
}

function autoScan() {
	resetModem();
	console.log("reset modem");
	setTimeout(function() {configureModem(LTE_CATM1_ANY);}, 3000);
	setTimeout(function() {console.log("configured modem");}, 3000);
	setTimeout(function() {scanCarriers();}, 8000);
	setTimeout(function() {console.log("scanned carriers");}, 8000);
	setTimeout(function() {parseScanResult();}, 18000);
	setTimeout(function() {console.log("parsing scan result");}, 18000);
	
}


//----- MAIN FUNCTION -----//
function onInit() {
	//set up debugging and config serial for modem communication 
	console.log("initializing...");
	Bluetooth.setConsole(true);
	clearWatch();
	clearInterval();
	Serial1.removeAllListeners();
	Serial1.on('data', (data) => {});
	Serial1.setup(9600, {tx: D11, rx: D10});
	at = require("AT").connect(Serial1);
	if (debug) {
		at.debug(true);
	}
	digitalWrite(LED1,backlight); // turn on backlight
	
	startupScreen();
	autoScan();
	

	//for (var i=0;i<all_operators.length;i+=1) console.log(all_operators[i] + "\r\n");
	//setTimeout(function() {connectModem(selected_carrier);} , 5000); // connect modem after 5 seconds
	
}
onInit(); //auto run during dev