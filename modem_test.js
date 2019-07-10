// testing device IMEI: 8684460306494107
// testing device endpoint name: nbpi4 - lachlan
// 10.192.200.12

// TO ADD
// - consolidate modem config functions - DONE
// - testing method and results quantification
// - fix scan result parsing - need to work out how to terminate loop
// - EDRX and PSM testing
// - fix manual test scan/starting + control buttons - mostly done
// - multiple carrier and band auto test - mostly done
// - power draw/battery level

// OPTIONAL
// - condense small IF statements with ternary operator

//BUTTONS CONFIG
// 1 - backlight toggle
// 2 - cycle test parameters
// 3 - start manual test/advance through selection parameters
// 4 - manual/auto test toggle

//----- GLOBAL VARIABLES -----//
var at;
var debug = true; //change to false when finished
var backlight = true;

var carrier_id = [];
var carrier_name = [];		//could combine into 2d array
var carrier_type = [];
/* var visible_gsm_networks = []; // 3 are currently unused - may implement
var visible_catm_networks = []; 
var visible_nb_networks = []; */
var scan_result = "";
var scan_successful = 0;
var update_after_scan = 0;

//manual test parameters
var selected_lte = 14;
var selected_carrier = 0;
var selected_type = 0;
var selected_mode = 0; //connection type - 0: all, 1: GSM, 2: CAT-M, 3: NB-IoT

//----- CONSTANTS -----//
var AUTOSCAN_DEFAULT = 2; //change here if required

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

var LTE_BANDS = ["1","2","4","8","10","80","800","1000","20000","40000","80000","2000000","8000000","4000000000","400A0E189F","A0E189F","0"];
var LTE_NAMES = ["B1","B2","B3","B4","B5","B8","B12","B13","B18","B19","B20","B26","B28","B39","CATM1_ANY","CATNB1_ANY","NO_CHANGE"];

var CONNECTION_NAMES = ["GSM","CAT-M1","NB-IoT"];
var CONNECTION_TYPES = [0,8,9];

var scan_duration = [150000,45000,30000,30000]; // duration for network scans
var MODE_NAMES = ["Auto","GSM","CAT-M1","NB-IoT"];

					//GSM,   CATM,	  NBIoT,	scanseq, scanmode,iotopmode
var MODE_VALUES = [	['F','400A0E189F','A0E189F','020301','0','2'], //automatic mode
					['F',	'0',		'0',	'01'	,'1','2'], //GSM only
					['0','400A0E189F',	'0',	'02'	,'3','0'], //CAT-M only
					['0','0',			'0',	'03'	,'3','1']];//NB-IoT only

require("Font4x4").add(Graphics);
require("Font6x8").add(Graphics);
require("Font8x12").add(Graphics);

//----- BUTTON FUNCTIONS -----/
function toggleBacklight() {
	backlight = !backlight;
	digitalWrite(LED1,backlight);
}

function cycleCarrier() {
	selected_carrier += 1;
	if (carrier_id[selected_carrier] == null) {
		selected_carrier = 0;
	}
}

function cycleBand() {
	selected_lte += 1;
	if (LTE_BANDS[selected_lte] == "0") {
		selected_lte = 0;
	}
}

function cycleMode() {
	selected_mode += 1;
	if (selected_mode > 3) {
		selected_mode = 0;
	}
}

function assignButtons(current_screen) {	//button configuration - TOP LEFT CCW - 1,2,3,4
	clearButtons();
	setWatch(() => {
		toggleBacklight();
	}, BTN1, {edge:"rising", debounce:50, repeat:true});
	if (current_screen == 0) {						// automatic testing screen
		setWatch(() => {
			if (scan_successful) 	{				//only allow manual test after successful scan
				manualTest();
			}
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
	} 
	else if (current_screen == 1) {				// manual testing screen
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			cycleCarrier();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(56,10,127,42);								//CHECK
			g.setColor(1);
			g.drawString(carrier_id[selected_carrier],56,12);
			g.drawString(carrier_name[selected_carrier],56,22);
			g.drawString(carrier_type[selected_carrier] == 0 ? CONNECTION_NAMES[selected_carrier] : CONNECTION_NAMES[carrier_type[selected_carrier] - 7],56,32);
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			bandSelectScreen();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
	} 
	else if (current_screen == 2) { 				// band select screen
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			cycleBand();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(56,40,127,52);							//CHECK
			g.setColor(1);
			g.drawString(LTE_NAMES[selected_lte],56,42); 				//CHECK
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			startManualTest();									//TODO - get working
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
	} 
	else if (current_screen == 3) {				// autotest results screen
		setWatch(() => {
			cycleCarrier();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(56,10,127,42);								//CHECK
			g.setColor(1);
			g.drawString(carrier_id[selected_carrier],56,12);
			g.drawString(carrier_name[selected_carrier],56,22);
			g.drawString(carrier_type[selected_carrier] == 0 ? CONNECTION_NAMES[selected_carrier] : CONNECTION_NAMES[carrier_type[selected_carrier] - 7],56,32);
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			autoTest();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			manualTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
	} 
	else if (current_screen == 4) {				//mode select screen for manual test
		setWatch(() => {
			cycleMode();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(48,16,127,32);							//CHECK
			g.setColor(1);
			g.drawString(MODE_NAMES[selected_mode],48,24); 				//CHECK
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			manualTestScan();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
	}
}

function clearButtons() {
	clearWatch();
}

//----- DISPLAY FUNCTIONS -----//
function startupScreen() {
	//(0,0) to (127.63) are legal boundaries
	g.clear();
	for (i=0;i<43;i+=3) g.drawLine(3*i,0,56+i,63); //fancy lines
	g.setColor(0);
	g.fillRect(35,32,91,46);
	g.setFont6x8();
	g.setColor(1);
	g.drawString("EMnify IoT", 41,36);
	g.flip();
	setTimeout(function() {mainScreen();}, 3000);
}

function mainScreen() {
	assignButtons(0);
	g.clear();
	g.flip();
	g.setFont8x12();
	g.drawString("Main Screen",30,0);
	g.setFontBitmap();
	g.drawString("Automatic test will start", 1,30);
	g.drawString("very soon...", 1,36);
	g.flip();
}

function autoTestScreen() {
	assignButtons(0);
	g.clear();
	g.setFont8x12();
	g.drawString("Auto Network Test",10,0);						//CHECK
	g.setFont6x8();
	g.drawString("Carrier ID: ",2,12);
	g.drawString("Name: ",2,22);
	g.drawString("Connection: ", 2,32);
	g.drawString(carrier_id[selected_carrier],56,12);
	g.drawString(carrier_name[selected_carrier],56,22);
	g.drawString(carrier_type[selected_carrier] == 0 ? CONNECTION_NAMES[selected_carrier] : CONNECTION_NAMES[carrier_type[selected_carrier] - 7],56,32);
	g.setFontBitmap();
	g.drawString("BTN4 - change to manual testing",1,57);
	//g.drawString("after network scan",1,59);
	g.flip();
}

function modeSelectScreen() {
	assignButtons(4);
	g.clear();
	g.setFont8x12();
	g.drawString("Manual Network Test",1,0);						//CHECK
	g.setFont6x8();
	g.drawString("Mode: ",2,24);
	g.drawString(MODE_NAMES[selected_mode],48,24);					//CHECK	
	g.setFontBitmap();
	g.drawString("BTN2 - cycle mode",1,53);
	g.drawString("BTN3 - start scan",1,59);
	g.flip();
}

function manualTestScreen() {
	assignButtons(1);		
	g.clear();
	g.setFont8x12();
	g.drawString("Manual Network Test",1,0);					//CHECK
	g.setFont6x8();
	g.drawString("Carrier ID: ",2,12);
	g.drawString("Name: ",2,22);
	g.drawString("Connection: ", 2,32);
	g.drawString(carrier_id[selected_carrier],56,12);
	g.drawString(carrier_name[selected_carrier],56,22);
	g.drawString(carrier_type[selected_carrier] == 0 ? CONNECTION_NAMES[selected_carrier] : CONNECTION_NAMES[carrier_type[selected_carrier] - 7],56,32);
	g.setFontBitmap();
	g.drawString("BTN2 - cycle carrier",1,53);
	g.drawString("BTN3 - select band",1,59);
	g.flip();
}

function bandSelectScreen() {
	assignButtons(2);
	g.setColor(0);
	g.fillRect(0,50,127,63);
	g.setColor(1);
	g.setFont6x8();
	g.drawString("Band: ",2,42);
	g.drawString(LTE_NAMES[selected_lte],56,42);
	g.setFontBitmap();
	g.drawString("BTN2 - cycle band",1,53);
	g.drawString("BTN3 - start test",1,59);
	g.flip();
}

//----- MODEM FUNCTIONS -----//
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

function resetModem() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 2000);
	})
	.then(() => sendAtCommand('AT&F0'))				//factory reset
	.then(() => sendAtCommand('ATE0'))				//command echo off
	.then(() => sendAtCommand('AT+CPIN?'))			//check if sim is locked/not present
	.catch((err) => {
		console.log('catch', err);
	});
}

//TODO - consolidate two connection types
function configureModem(mode) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 3000);
	})
	.then(() => sendAtCommand('AT+CFUN=4'))									//turn modem transmitter to airplane mode to reconfigure
	//.then(() => sendAtCommand('AT+QGPSEND'))								//disable GNSS - NOT WORKING
	.then(() => sendAtCommand('AT+QCFG=\"band\",' + MODE_VALUES[mode][0] + ',' + MODE_VALUES[mode][1] + ',' + MODE_VALUES[mode][2]))		//config for specified band
	.then(() => sendAtCommand('AT+QCFG=\"nwscanseq\",' + MODE_VALUES[mode][3] + ',1'))				//network scan sequence
	.then(() => sendAtCommand('AT+QCFG=\"nwscanmode\",' + MODE_VALUES[mode][4] + ',1'))				//scan mode
	.then(() => sendAtCommand('AT+QCFG=\"iotopmode\",' + MODE_VALUES[mode][5] + ',1'))					//IoT search mode
	.then(() => sendAtCommand('AT+QCFG=\"servicedomain\",1,1'))				//service domain - PS only
	.catch((err) => {
		console.log('catch', err);
	});
}

function scanCarriers() {	
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 2000);
	})
	.then(() => {
		scan_result = "";
		scan_successful = 0;
	})
	.then(() => sendAtCommand('AT+CFUN=1'))					//set radio to transmit
	.then(() => {
		scan_result = sendAtCommand('AT+COPS=?',scan_duration[selected_mode]);			//scan for all available carriers
	})
	.then(() => parseScanResult(scan_duration[selected_mode]))
	.catch((err) => {
		console.log('catch', err);
	});
}

function parseScanResult(timeout) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), timeout);
	})
	.then(() => {
		console.log("scan_result = " + scan_result);
		var temp = JSON.stringify(scan_result);
		console.log("stringify temp = " + temp);
		var num = temp.indexOf("("); 	//find start of results
		
		if (num == -1) {				//no carriers are found
			console.log("No carriers found.");
		}
		else { 							//carriers are found - parse results
			scan_successful = 1;
			
			var end_num = temp.indexOf(",,");
			console.log("num = " + num);
			console.log("end_num = " + end_num);
			
			temp = temp.slice(num, end_num); // remove junk from start and end of scan results
			console.log("slice temp = " + temp);
			temp = temp.split(",");
			
			var iteration = 0;
			var temp_id;
			var temp_type;
			
			while (true) {
				
				temp_id = temp[5*iteration + 3];
				carrier_id[iteration] = temp_id.slice(2,-2);
				temp_name = temp[5*iteration + 1];
				carrier_name[iteration] = temp_name.slice(2,-2);
				temp_type = temp[5*iteration + 4];
				carrier_type[iteration] = temp_type.slice(0,-1);
				console.log("carrier ID = " + carrier_id[iteration]);
				console.log("carrier name = " + carrier_name[iteration]);
				console.log("carrier type = " + carrier_type[iteration]);
				
				iteration += 1;
				
				if (iteration == 6) {
					break;		//need to change
				}
			}
			if (update_after_scan == 1) {			// TODO - fix bad screen updates
				autoTestScreen();				//only called on auto test update - manual has its own method
				update_after_scan = 0;
			}
		}
	});
}
//TODO - change to add connection type
function connectModem(carrier,type) {	//requires operator in numeric format
	sendAtCommand('AT+CGDCONT=1,\"IP\",\"iot.1nce.net\",,')						//connection details - em for emnify apn, iot.1nce.net for 1nce
	.then(() => sendAtCommand('AT+CFUN=1'))								//turn on modem transmitter
	.then(() => sendAtCommand('AT+QGPS=1'))								//turn on GNSS
	.then(() => sendAtCommand('AT+CEREG=2'))							//register to network
	.then(() => sendAtCommand('AT+COPS=1,2,' + carrier + ',' + type, 5000));	//0 - GSM, 8 - CAT-M, 9 - NB_IoT
}

function autoTest() {
	update_after_scan = 1;
	selected_mode = AUTOSCAN_DEFAULT;			//autoscan default
	autoTestScreen();
	configureModem(selected_mode) // 0 - automatic mode
	.then(() => g.setFontBitmap())
	.then(() => g.drawString("Scanning for carriers...",2,42))
	.then(() => g.flip())
	.then(() => {
		if (scan_successful == 0) {
			scanCarriers();
		}
	})
	.then(() => autoTestScreen())
	.then(() => {
		assignButtons(3);
	});
}

function manualTest() {
	clearButtons();
	g.clear();
	g.setFont8x12();
	g.drawString("Preparing...",32,26);
	g.flip();
	modeSelectScreen();
}

function manualTestScan() {
	g.clear();
	g.setFont8x12();
	g.drawString("Scanning...",32,26);
	g.flip();
	configureModem(selected_mode)
	.then(() => scanCarriers())
	.then(() => setTimeout( function() { manualTestScreen();}, scan_duration[selected_mode]));
}

function startManualTest() {
	configureModem(selected_mode)
	.then(() => {
		g.setColor(0);
		g.fillRect(0,53,127,63);
		g.setColor(1);
		g.setFontBitmap();
		g.drawString("Connecting to " + carrier_name[selected_carrier],2,57);
		g.flip();
	})
	.then(() => connectModem(carrier_id[selected_carrier],carrier_type[selected_carrier]));
}

//----- MAIN FUNCTION -----//
function onInit() {
	//debug and config
	scan_result = "";
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
	
	assignButtons(0);
	digitalWrite(LED1, backlight);
	
	//sendAtCommand('AT+CMEE=2');			//verbose error logging
	
	startupScreen();
	resetModem();
	setTimeout(function() {autoTest();}, 5000);
	
}
onInit(); //auto run during dev