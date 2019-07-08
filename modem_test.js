// testing device IMEI: 8684460306494107
// testing device endpoint name: nbpi4 - lachlan
// 10.192.200.12

//TO ADD
// - testing method and result quantification
// - fix scan result parsing
// - EDRX testing
// - manual test starting + control buttons
// - multiple carrier and band auto test

//BUTTONS CONFIG
// 1 - backlight toggle
// 2 - cycle test parameters
// 3 - start manual test/advance through selection parameters
// 4 - manual/auto test toggle

//----- VARIABLES -----//
var debug = true; //change to false when finished

var backlight = true;

var carrier_id = [];
var carrier_name = [];
var visible_gsm_networks = []; // 3 are currently unused - may implement
var visible_catm_networks = []; 
var visible_nb_networks = [];
var scan_result = "";
var scan_successful = 0;

var update_after_scan = 0;

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

var selected_lte = 14;
var selected_carrier = 0;

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
	console.log(selected_carrier);
}

function cycleBand() {
	selected_lte += 1;
	if (LTE_BANDS[selected_lte] == "0") {
		selected_lte = 0;
	}
	console.log(selected_lte);
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
	} else if (current_screen == 1) {				// manual testing screen
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			cycleCarrier();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(70,10,127,32);								//CHECK
			g.setColor(1);
			g.drawString(carrier_id[selected_carrier],70,12);
			g.drawString(carrier_name[selected_carrier],70,22);
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			bandSelectScreen();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
	
	} else if (current_screen == 2) { 				// band select screen
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			cycleBand();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(70,30,127,42);							//CHECK
			g.setColor(1);
			g.drawString(LTE_NAMES[selected_lte],70,32); 				//CHECK
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			startManualTest();									//TODO - get working
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
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
	g.drawString("Carrier Name: ",2,22);
	g.drawString(carrier_id[selected_carrier],70,12);
	g.drawString(carrier_name[selected_carrier],70,22);
	g.setFontBitmap();
	g.drawString("BTN4 - change to manual testing",1,52);
	g.drawString("(after network scan)",1,58);
	g.flip();
}

function manualTestScreen() {
	assignButtons(1);		
	g.clear();
	g.setFont8x12();
	g.drawString("Manual Network Test",1,0);					//CHECK
	g.setFont6x8();
	g.drawString("Carrier ID: ",2,12);
	g.drawString("Carrier Name: ",2,22);
	g.drawString(carrier_id[selected_carrier],70,12);
	g.drawString(carrier_name[selected_carrier],70,22);
	g.setFontBitmap();
	g.drawString("BTN2 - cycle carrier",1,50);
	g.drawString("BTN3 - select band",1,56);
	g.flip();
}

function bandSelectScreen() {
	assignButtons(2);
	g.setColor(0);
	g.fillRect(0,40,127,63);
	g.setColor(1);
	g.setFont6x8();
	g.drawString("Band: ",2,32);
	g.drawString(LTE_NAMES[selected_lte],70,32);
	g.setFontBitmap();
	g.drawString("BTN2 - cycle band",1,50);
	g.drawString("BTN3 - start test",1,56);
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
		setTimeout(() => resolve(), 1000);
	})
	.then(() => sendAtCommand('AT&F0'))				//factory reset
	.then(() => sendAtCommand('ATE0'))				//command echo off
	.then(() => sendAtCommand('AT+CPIN?'))			//check if sim is locked/not present
	.catch((err) => {
		console.log('catch', err);
	});
}

function configureModem(lte_band) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 1000);
	})
	.then(() => sendAtCommand('AT+CFUN=4'))									//turn modem transmitter to airplane mode to reconfigure
	//.then(() => sendAtCommand('AT+QGPSEND'))								//disable GNSS - NOT WORKING ON BG96
	.then(() => sendAtCommand('AT+QCFG=\"band\",0,' + lte_band + ',0'))		//config for specified band
	.then(() => sendAtCommand('AT+QCFG=\"nwscanseq\",02,1'))				//network scan sequence - 02=CAT-M
	.then(() => sendAtCommand('AT+QCFG=\"nwscanmode\",3,1'))				//scan mode - CAT-M
	.then(() => sendAtCommand('AT+QCFG=\"iotopmode\",0,1'))					//IoT search mode - 0=CAT-M only, 2=CAT-M and NBIoT
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
	})
	.then(() => sendAtCommand('AT+CFUN=1'))					//set radio to transmit
	.then(() => {
		scan_result = sendAtCommand('AT+COPS=?');			//scan for all available carriers
	})
	.catch((err) => {
		console.log('catch', err);
	});
}

function parseScanResult(is_manual_test) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 1000);
	})
	.then(() => {
		scan_successful = 1; 							//assume scan is successful - changed to zero if no results are returned
		console.log("scan_result = " + scan_result);
		var temp = JSON.stringify(scan_result);
		console.log("stringify temp = " + temp);
		var num = temp.indexOf("("); 	//find start of results
		if (num == -1) {				//auto rescan if no carriers are found
			scan_successful = 0;
			console.log("No carriers found. Rescanning...");
			scanCarriers();
			setTimeout(function() {parseScanResult();}, 5000);
		}
		if (scan_successful == 1) { 
			
			console.log("num = " + num);
			temp = temp.slice(num, -1); // remove junk from start of scan results
			console.log("slice temp = " + temp);
			temp = temp.split(",");
			
			var iteration = 0;
			var temp_id;
			
			while (true) {
				
				temp_id = temp[iteration + 3];
				carrier_id[iteration] = temp_id.slice(2,-2); 				// WORKING FOR ONE CARRIER
				temp_name = temp[iteration + 1];
				carrier_name[iteration] = temp_name.slice(2,-2);
				console.log("carrier ID = " + carrier_id[iteration]);
				console.log("carrier name = " + carrier_name[iteration]);
				
				break; 														// TODO - remove and test with multiple carriers 
			}
			if (update_after_scan == 1) {			// TODO - fix bad screen updates
				autoTestScreen();				//only called on auto test update - manual has its own method
				update_after_scan = 0;
			}
		}
	});
}

function connectModem(carrier) {	//requires operator in numeric format
	sendAtCommand('AT+CGDCONT=1,\"IP\",\"em\",,')						//connection details - em for emnify apn
	.then(() => sendAtCommand('AT+CFUN=1'))								//turn on modem transmitter
	.then(() => sendAtCommand('AT+QGPS=1'))								//turn on GNSS
	.then(() => sendAtCommand('AT+CEREG=2'))							//register to network
	.then(() => sendAtCommand('AT+COPS=1,2,' + carrier + ',8', 5000));	//8 - CAT-M
}

function autoTest() {
	update_after_scan = 1;
	autoTestScreen();
	resetModem()
	.then(() => configureModem(LTE_BANDS[selected_lte]))
	.then(() => g.setFontBitmap())
	.then(() => g.drawString("Waiting for carrier discovery...",2,40))
	.then(() => g.flip())
	.then(() => scanCarriers())
	.then(() => parseScanResult())
	.then(() => autoTestScreen()); //redraw after successful parse of scan
	//.then(() => connectModem(carrier_id[0])) 		// work out a method to set a boolean then connect and test
	
}

function manualTest() {
	clearButtons();
	g.clear();
	g.setFont8x12();
	g.drawString("Preparing...",32,26);
	g.flip();
	resetModem()
	.then(() => manualTestScreen());
}

function startManualTest() {
	configureModem(LTE_BANDS[selected_lte])
	.then(() => g.setFontBitmap())
	.then(() => g.drawString("Connecting to " + carrier_name[selected_carrier],2,40))
	.then(() => g.flip())
	.then(() => connectModem(carrier_id[selected_carrier]));
	
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
	
	//main 
	startupScreen();
	setTimeout(function() {autoTest();}, 5000);
	
}
onInit(); //auto run during dev