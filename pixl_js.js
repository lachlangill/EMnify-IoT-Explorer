/* 	EMnify IoT Explorer Testing Device
* 	Author: Lachlan Gill, July 2019
*	
*	Cellular connection bands used for scans:
*	GSM_ANY = "F"
*	LTE_CATM1_ANY = "400A0E189F"
*	LTE_CATNB1_ANY = "A0E189F"
*	'0' is used to indicate no change in the band when reconfiguring the modem
*	
*	Manual testing:
*	allows the user to select a scan type, then test the connection to any of the discovered networks.
*	
*	Automatic testing: 
*	automatically scans for all network types, then iterates through all, testing the connection to each
*/

//----- GLOBAL VARIABLES -----//
var debug = true; //change to false when finished
var backlight = true;
//operator details
var carrier_id = [];
var carrier_name = [];
var carrier_type = [];
var scan_result = "";
var connection_quality = ""; 		//CSQ
var connection_information = ""; 	//QNWINFO
var connection_signal = ""; 		//QCSQ
var connection_quality = []; 	//operator id, network type, band, channel, rssi, ber, sinr
//manual test parameters
var is_manual_test = 0;
var selected_carrier = 0;
var selected_mode = 0; 		//connection type - 0: all, 1: GSM, 2: CAT-M, 3: NB-IoT
var display_info = 0;
//data submission variables
var data_payload = ""; 		//current connection
var scan_payload = ""; 		//scan results
var is_scan_sent = 0;

//----- CONSTANTS -----//
var AUTOTEST_DEFAULT = 0;
var MAX_SCAN_DURATION = 180000; //time in ms
var CONNECTION_NAMES = ["GSM","CAT-M1","NB-IoT"]; 	//0,8,9
var MODE_NAMES = ["Auto","GSM","CAT-M1","NB-IoT"];
					//GSM,   CATM,	  NBIoT,	scanseq, scanmode,iotopmode
var MODE_VALUES = [	['F','400A0E189F','A0E189F','020301','0','2'], //automatic mode
					['F',	'0',		'0',	'01'	,'1','2'], //GSM only
					['0','400A0E189F',	'0',	'02'	,'3','0'], //CAT-M only
					['0','0',		'A0E189F',	'03'	,'3','1']];//NB-IoT only
//data submission
var POST_HEADER_PROTOTYPE = "POST /db HTTP/1.1\r\nHost: emnipi.herokuapp.com\r\nContent-Type: application/json\r\nContent-Length: "; //change post header if necessary
var POST_DATA_PROTOTYPE = "{\"token\":\"c48cae698f2d696143a91452c6dec7f6de8e233d\",\"description\":\""; //change token here if necessary
var SERVER_URL = "https://emnipi.herokuapp.com";	//remote data server address, change if necessary
//graphics
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

function cycleMode() {
	selected_mode += 1;
	if (selected_mode > 3) {
		selected_mode = 0;
	}
}

function cycleCarrierInfo() {
	display_info = !display_info;
}

function assignButtons(current_screen) {	//button configuration - TOP LEFT CCW - 1,2,3,4
	clearButtons();
	setWatch(() => {
		toggleBacklight();
	}, BTN1, {edge:"rising", debounce:50, repeat:true});
	if (current_screen == 0) {						// automatic testing start screen
		setWatch(() => {
			startAutoTest();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			manualTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
	}
	else if (current_screen == 1) {				// manual testing screen
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			cycleCarrier();
			drawCarrierInfo();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			startManualTest();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
	} 
	else if (current_screen == 2) { 			// error screen
		setWatch(() => {
			onInit();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
	}
	else if (current_screen == 3) {				// autotest results screen
		setWatch(() => {
			cycleCarrier();
			drawCarrierInfo();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			autoTest();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			manualTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:false});
	} 
	else if (current_screen == 4) {				//mode select screen for manual test
		setWatch(() => {
			cycleMode();
			g.setFont6x8();
			g.setColor(0);
			g.fillRect(48,16,127,32);
			g.setColor(1);
			g.drawString(MODE_NAMES[selected_mode],48,24);
			g.flip();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			manualTestScan();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			autoTest();
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
	}
	else if (current_screen == 5) {				//connected to carrier screen
		setWatch(() => {
			cycleCarrierInfo();
			connectionScreen();
		}, BTN2, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			disconnectModem();
			manualTestScreen();
		}, BTN3, {edge:"rising", debounce:50, repeat:true});
		setWatch(() => {
			sendConnectionResults()
			.then(() => {
				g.setPixel(127,63,1);
				g.flip();
			});
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
	}
}

function clearButtons() {
	clearWatch();
}

//----- DISPLAY FUNCTIONS -----//
function startupScreen() {
	g.clear();
	for (i=0;i<43;i+=3) g.drawLine(3*i,0,42+i,63); //fancy lines
	g.setColor(0);
	g.fillRect(35,32,91,46);
	g.setFont6x8();
	g.setColor(1);
	g.drawString("EMnify IoT", 41,36);
	g.flip();
}

function autoTestStartScreen() {
	assignButtons(0);
	g.clear();
	displayHeading("Auto Network Test");
	displayControls(4,"manual testing",3,"start automatic test");
}

function autoTestScreen() {
	g.clear();
	displayHeading("Auto Network Test");
}

function modeSelectScreen() {
	assignButtons(4);
	g.clear();
	displayHeading("Manual Network Test");
	displayControls(4,"change to automatic testing",3,"start scan",2,"cycle mode");
	g.setFont6x8();
	g.drawString("Mode: ",2,24);
	g.drawString(MODE_NAMES[selected_mode],48,24);
	g.flip();
}

function manualTestScreen() {
	assignButtons(1);		
	g.clear();
	displayHeading("Manual Network Test");
	displayControls(4,"change to automatic testing",3,"start test",2,"cycle carrier");
	drawCarrierInfo();
}

function connectionScreen() {
	g.clear();
	displayHeading("Connection Details");	
	g.setFont6x8();
	if (display_info == 0) {
		g.drawString("Carrier ID: ",2,12);
		g.drawString("Connection Type: ",2,22);
		g.drawString("Band: ",2,32);
		g.drawString("Channel ID: ",2,42);
		for (var i=0;i<4;i+=1) g.drawString(connection_quality[i], 80, 12 + (10 * i));
	}
	else {
		g.drawString("Signal Strength: ",2,12);
		g.drawString("Error Rate: ",2,22);
		g.drawString("SNR: ",2,32);
		for (var i=4;i<7;i+=1) g.drawString(connection_quality[i], 80, 12 + (10 * (i - 4)));
		g.setFontBitmap();
		g.drawString("dB",119,14);
		g.drawString("%", 119,24);
		g.drawString("dB",119,34);
	}
	
	if (is_manual_test) {
		assignButtons(5);
		displayControls(3,"disconnect from network",2,"more details...");
	}
	g.flip();
}

function errorScreen(location,error) {
	console.log('catch', error);
	assignButtons(2);
	g.clear();
	g.setFont6x8();
	g.drawString("ERROR",40,6);
	g.setFontBitmap();
	g.drawString(location,0,30);
	g.drawString(error,0,36);
	displayControls(3,"reset device");
	g.flip();
}

function drawCarrierInfo() {
	g.setFont6x8();
	g.setColor(0);
	g.fillRect(0,10,127,42);
	g.setColor(1);
	g.drawString("Carrier ID: ",2,12);
	g.drawString("Name: ",2,22);
	g.drawString("Connection: ", 2,32);
	g.drawString(carrier_id[selected_carrier],56,12);
	g.drawString(carrier_name[selected_carrier],56,22);
	g.drawString(carrier_type[selected_carrier] == 0 ? CONNECTION_NAMES[carrier_type[selected_carrier]] : CONNECTION_NAMES[carrier_type[selected_carrier] - 7],56,32);
	g.flip();
}

function displayHeading(text) {
	g.setColor(0);
	g.fillRect(0,0,128,12);
	g.setColor(1);
	g.setFont8x12();
	g.drawString(text,10,0);
	g.flip();
}

function displayControls(num3, text3, num2, text2, num1, text1) {
	g.setColor(0);
	g.fillRect(0,49,128,63);
	g.setColor(1);
	g.setFontBitmap();
	if (num3 >0) g.drawString("BTN" + num3 + "-" + text3,0,58);
	if (num2 >0) g.drawString("BTN" + num2 + "-" + text2,0,52);
	if (num1 >0) g.drawString("BTN" + num1 + "-" + text1,0,46);
	g.flip();
}

//----- INTERRUPT HANDLERS -----//
function processDataInterrupt() {
	Serial1.removeListener("data", processDataInterrupt);
	parseScanResult();
	if (is_manual_test) {
		setTimeout( function() { manualTestScreen();}, 4000);
	}
	else { //start automatic test - TODO
		g.setFontBitmap();
		g.drawString("Connections found. Testing...",1,57);		
		setTimeout( function() { processAutoTest();}, 5000);
	}
}

function processConnectionInterrupt() {
	Serial1.removeListener("data", processConnectionInterrupt);
	display_info = 0;
	getNetworkDetails()
	.then(() => processNetworkDetails())
	.then(() => connectionScreen());
	if (!is_manual_test) {
		cycleAutoTest();
	}
}

//----- MODEM FUNCTIONS -----//
function sendAtCommand(command,timeoutMs, waitForLine) {
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
}

function sendAtData(data) {
	return new Promise((resolve) => {
		Serial1.write(data);
		resolve(data);
	});
}

function resetModem() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 2000);
	})
	.then(() => sendAtCommand('AT&F0'))		//factory reset
	.then(() => sendAtCommand('ATE0'))		//command echo off
	.then(() => sendAtCommand('AT+CPIN?'))	//check if sim is locked/not present
	.catch((err) => {
		errorScreen("modem reset", err);
	});
}

function configureModem(mode) {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 2000);
	})
	.then(() => sendAtCommand('AT+CFUN=4'))									//turn modem transmitter to airplane mode to reconfigure
	.then(() => sendAtCommand('AT+QCFG=\"band\",' + MODE_VALUES[mode][0] + ',' + MODE_VALUES[mode][1] + ',' + MODE_VALUES[mode][2]))		//config for specified band
	.then(() => sendAtCommand('AT+QCFG=\"nwscanseq\",' + MODE_VALUES[mode][3] + ',1'))				//network scan sequence
	.then(() => sendAtCommand('AT+QCFG=\"nwscanmode\",' + MODE_VALUES[mode][4] + ',1'))				//scan mode
	.then(() => sendAtCommand('AT+QCFG=\"iotopmode\",' + MODE_VALUES[mode][5] + ',1'))				//IoT search mode
	.then(() => sendAtCommand('AT+QCFG=\"servicedomain\",1,1'))				//service domain - PS only
	.catch((err) => {
		errorScreen("modem config", err);
	});
}

function scanCarriers() {	
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 2000);
	})
	.then(() => {
		is_scan_sent = 0;
		scan_result = "";
	})
	.then(() => sendAtCommand('AT+CFUN=1'))								//set radio to transmit
	.then(() => {
		scan_result = sendAtCommand('AT+COPS=?',MAX_SCAN_DURATION);		//scan for all available carriers
	})
	.then(() => Serial1.on("data",processDataInterrupt))				//activate interrupt handler
	.catch((err) => {
		errorScreen("carrier scan", err);
	});
}

function parseScanResult() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 3000); //long enough for scan results to be sent through serial
	})
	.then(() => {
		var temp = JSON.stringify(scan_result);
		var num = temp.indexOf("("); 	//find start of results
		
		if (num == -1) {				//no carriers are found
			errorScreen("scanning for carriers", "no carriers found.");
		}
		else { 							//carriers are found - parse results
			var end_num = temp.indexOf(",,");
			temp = temp.slice(num, end_num); // remove junk from start and end of scan results
			temp = temp.split(",");
			
			var iteration = 0;
			var temp_id;
			var temp_type;
			
			while (true) {
				if (temp[5*iteration] == null) {
					break;
				}
				temp_id = temp[5*iteration + 3];
				carrier_id[iteration] = temp_id.slice(2,-2);
				temp_name = temp[5*iteration + 1];
				carrier_name[iteration] = temp_name.slice(2,-2);
				temp_type = temp[5*iteration + 4];
				carrier_type[iteration] = temp_type.slice(0,-1);
				console.log(carrier_name[iteration] + " " + carrier_id[iteration] + " " + carrier_type[iteration]);
				
				iteration += 1;
			}
		}
	})
	.catch((err) => {
		errorScreen("scan result", err);
	});
}

function connectModem(carrier,type) {			//requires operator in numeric format
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 100);
	})
	.then(() => sendAtCommand('AT+CGDCONT=1,\"IP\",\"em\",,'))			//apn connection details - em for emnify, iot.1nce.net for 1nce
	.then(() => sendAtCommand('AT+CREG=2'))								//enable network registration (changed CEREG to CREG)
	.then(() => Serial1.on("data", processConnectionInterrupt))
	.then(() => {
		var a = sendAtCommand('AT+COPS=1,2,' + carrier + ',' + type, 60000, "OK"); 	//type: 0 - GSM, 8 - CAT-M, 9 - NB_IoT
		a.catch((err) => {
			g.setColor(0);
			g.fillRect(0,53,127,63);
			g.setColor(1);
			g.setFontBitmap();
			g.drawString("Unable to connect to carrier.",1,57);
			g.flip();
			if (is_manual_test) {
				setTimeout( function() { manualTestScreen();}, 5000);
			}
			else {
				setTimeout( function() { processAutoTest();}, 5000);
			}
		});
	})
	.catch((err) => {
		errorScreen("carrier connect", err);
	});
}

function disconnectModem() {
	sendAtCommand('AT+COPS=2');
}

function getNetworkDetails() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 100);
	}).
	then(() => {
		connection_quality = sendAtCommand('AT+CSQ');			//signal strength (rssi), bit error rate (ber)
	})
	.then(() => {
		connection_information = sendAtCommand('AT+QNWINFO');	//connection type (act), operator id (oper), current band (band), channel id (channel)
	})
	.then(() => {
		connection_signal = sendAtCommand('AT+QCSQ');			//connection type (sysmode), signal strength (rssi), [lte only] reference signal received power(rsrp), signal to interference and noise (sinr), reference signal received quality (rsrq)
	})
	.catch((err) => {
		errorScreen("get network details", err);
	});
}

function processNetworkDetails() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 1000);
	})
	.then(() => {
		//CSQ
		var temp = JSON.stringify(connection_quality);
		var num = temp.indexOf("+CSQ");
		temp = temp.slice(num + 5, -2);
		temp = temp.split(",");
		connection_quality[4] = ( -113 + (2* temp[0])); //rssi scaled to dB
		temp[1] == 99 ? connection_quality[5] = 0 : connection_quality[5] = temp[1]; //ber
		//QNWINFO
		temp = JSON.stringify(connection_information);
		num = temp.indexOf("+QNWINFO");
		temp = temp.slice(num + 9, -2);
		temp = temp.split(",");
		connection_quality[1] = (temp[0]).slice(3,-2); //act
		connection_quality[0] = (temp[1]).slice(2,-2); //oper id
		connection_quality[2] = (temp[2]).slice(6,-2); //band
		connection_quality[3] = (temp[3]); //channel
		//QCSQ
		temp = JSON.stringify(connection_signal);
		num = temp.indexOf("+QCSQ");
		temp = temp.slice(num + 6, -2);
		temp = temp.split(",");
		connection_quality[6] = ((temp[3] / 5) - 20); //sinr converted to dB
	})
	.catch((err) => {
		errorScreen("process network details", err);
	});
}

function sendConnectionResults() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 500);
	})
	.then(() => {
		var post_data = POST_DATA_PROTOTYPE;
		var post_scan_data = POST_DATA_PROTOTYPE;
		//current connection data
		post_data += "Connection Results: ";
		post_data += " " + carrier_name[selected_carrier];
		post_data += " ID: " + carrier_id[selected_carrier];
		post_data += " Type: " + carrier_type[selected_carrier];
		post_data += " Band: " + connection_quality[2]; 		//band
		post_data += " Channel: " + connection_quality[3]; 		//channel
		post_data += " SNR: " + connection_quality[4] + "dB";	//rssi
		post_data += "\"}";
		
		data_payload = POST_HEADER_PROTOTYPE + post_data.length + "\r\n\r\n" + post_data;		//concatenated data to be sent
		console.log(data_payload);
		
		//scan results data
		post_scan_data += "Scan Results: ";
		post_scan_data += "Type: " + (is_manual_test ? "manual" : "auto");
		var i = 0;
		while (true) {
			if (carrier_name[i] == null) break;
			post_scan_data += " " + carrier_name[i];
			post_scan_data += " ID: " + carrier_id[i];
			post_scan_data += " Type: " + carrier_type[i] + ",";
			i += 1;
		}
		post_scan_data += "\"}";
		
		scan_payload = POST_HEADER_PROTOTYPE + post_scan_data.length + "\r\n\r\n" + post_scan_data;		//concatenated data to be sent
		console.log(scan_payload);
		
	})
	.then(() => sendAtCommand('AT+QICSGP=1,1,\"em\",\"\",\"\",1'))		//config TCP/IP
	.then(() => sendAtCommand('AT+QIACT=1',10000))						//activate context
	.then(() => sendAtCommand('AT+QHTTPCFG=\"contextid\",1'))			//config PDP context
	.then(() => sendAtCommand('AT+QHTTPCFG=\"requestheader\",1'))	 	//allow request header
	.then(() => sendAtCommand('AT+QHTTPCFG=\"responseheader\",1'))		//allow HTTP response header
	.then(() => sendAtCommand('AT+QHTTPURL=' + SERVER_URL.length + ',10',10000,"CONNECT"))			//puts modem in data mode to accept URL
	.then(() => sendAtData(SERVER_URL))
	.then(() => {
		setTimeout(function() {
			if (is_scan_sent == 0) {
				sendAtCommand('AT+QHTTPPOST=' + scan_payload.length + ',20,60',20000,"CONNECT")
				.then(() => sendAtData(scan_payload));
				is_scan_sent = 1;
			}
		}, 20000);		//20 second delay to avoid losing data
		setTimeout(function() {
			sendAtCommand('AT+QHTTPPOST=' + data_payload.length + ',20,60',20000,"CONNECT")
			.then(() => sendAtData(data_payload));
		}, 10000); 		//10 second delay to avoid losing data
	})
	.catch((err) => {
		errorScreen("sending connection results", err);
	});
}

function autoTest() { //starting screen
	autoTestStartScreen();
}

function startAutoTest() { //called after confirming test start - config and start scan
	autoTestScreen();
	is_manual_test = 0;
	selected_carrier = -1; 	//used to iterate properly
	scan_result = ""; 		//clear scan results
	selected_mode = AUTOTEST_DEFAULT;
	configureModem(selected_mode)
	.then(() => {
		g.setFontBitmap();
		g.drawString("Scanning for carriers...",2,42);
		g.flip();
	})
	.then(() => scanCarriers());
}

function processAutoTest() { // called from callback - iterate through carrier results and test connection
	clearInterval();
	selected_carrier += 1;
	if (carrier_id[selected_carrier] == null) { //end test
		g.clear();
		g.setFont6x8();
		g.drawString("Automatic test completed.", 1,30);
		g.drawString("Returning to menu in 10 sec...",1,38);
		g.flip();
		setTimeout( function() {autoTestStartScreen();}, 10000);
	}
	else { //continue through scan
		autoTestScreen();
		drawCarrierInfo();
		connectModem(carrier_id[selected_carrier],carrier_type[selected_carrier]);
		g.setFontBitmap();
		g.drawString("Connecting...",1,57);
		g.flip();
	}
}

function cycleAutoTest() { //used to iterate through auto test results
	setInterval( function() {
		cycleCarrierInfo();
		connectionScreen();
	}, 2000);
	setTimeout( function() {disconnectModem();}, 10000);
	setTimeout( function() {processAutoTest();}, 12000);
}

function manualTest() {
	is_manual_test = 1;
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
	.then(() => scanCarriers());
}

function startManualTest() {
	g.setColor(0);
	g.fillRect(0,42,127,63);
	g.setColor(1);
	g.setFontBitmap();
	g.drawString("Connecting to " + carrier_name[selected_carrier] + "...",2,57);
	g.flip();
	connectModem(carrier_id[selected_carrier],carrier_type[selected_carrier]);
}

//----- MAIN FUNCTION -----//
function onInit() {
	//debug and config
	scan_result = "";
	console.log("initializing...");
	Bluetooth.setConsole(debug);
	clearWatch();
	clearInterval();
	Serial1.removeAllListeners();
	Serial1.on('data', (data) => {});
	Serial1.setup(9600, {tx: D11, rx: D10});
	at = require("AT").connect(Serial1);
	at.debug(debug);
	assignButtons(0);
	digitalWrite(LED1, backlight);
	startupScreen();
	resetModem();
	setTimeout(function() {manualTest();}, 5000);
}
onInit();  //auto run during dev