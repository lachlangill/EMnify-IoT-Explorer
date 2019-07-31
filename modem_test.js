/* 	EMnify IoT Explorer Testing Device
* 	Author: Lachlan Gill 2019
*	
*/

//----- GLOBAL VARIABLES -----//
var debug = true; //change to false when finished
var backlight = true;

var carrier_id = [];
var carrier_name = [];		//could combine into 2d array
var carrier_type = [];
var scan_result = "";
var is_manual_test = 0;
var connection_quality = ""; 		//CSQ
var connection_information = ""; 	//QNWINFO
var connection_signal = ""; 		//QCSQ

var connection_status;	//used for interrupt handling

var connection_quality = []; 	//operator id, network type, band, channel, rssi, ber, sinr

//manual test parameters
var selected_carrier = 0;
var selected_mode = 0; //connection type - 0: all, 1: GSM, 2: CAT-M, 3: NB-IoT
var display_info = 0;

//data submission variables
var post_header;
var post_data;
var payload;
var server_url = "https://emnipi.herokuapp.com";	//remote data server address

//----- CONSTANTS -----//
var AUTOSCAN_DEFAULT = 0; //change here if required

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
var LTE_B39 = "4000000000";  // cat-m1 only
var LTE_CATM1_ANY = "400A0E189F";
var LTE_CATNB1_ANY = "A0E189F";
var LTE_NO_CHANGE = "0";

var CONNECTION_NAMES = ["GSM","CAT-M1","NB-IoT"]; 	//0,8,9

var MAX_SCAN_DURATION = 180000; //time in ms

var MODE_NAMES = ["Auto","GSM","CAT-M1","NB-IoT"];
					//GSM,   CATM,	  NBIoT,	scanseq, scanmode,iotopmode
var MODE_VALUES = [	['F','400A0E189F','A0E189F','020301','0','2'], //automatic mode
					['F',	'0',		'0',	'01'	,'1','2'], //GSM only
					['0','400A0E189F',	'0',	'02'	,'3','0'], //CAT-M only
					['0','0',		'A0E189F',	'03'	,'3','1']];//NB-IoT only

//graphics
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

function cycleMode() {
	selected_mode += 1;
	if (selected_mode > 3) {
		selected_mode = 0;
	}
}

function cycleCarrierInfo() { //change to numerical for 3 or more screens
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
		}, BTN4, {edge:"rising", debounce:50, repeat:true});
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
	}
}

function clearButtons() {
	clearWatch();
}

// interrupt handler for successful network scan
function processDataInterrupt() {
	Serial1.removeListener("data", processDataInterrupt);
	parseScanResult();
	if(scan_result == "CME ERROR: 3") {
		console.log("Hard reset required.");
	}
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

//----- DISPLAY FUNCTIONS -----//
function startupScreen() {
	g.clear();
	//g.drawImage(img,0,0);
	for (i=0;i<43;i+=3) g.drawLine(3*i,0,56+i,63); //fancy lines
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
	g.setFont8x12();
	g.drawString("Auto Network Test",10,0);
	g.setFontBitmap();
	g.drawString("BTN3 - start automatic testing",1,51);
	g.drawString("BTN4 - change to manual testing",1,57);
	g.flip();
}

function autoTestScreen() {
	g.clear();
	g.setFont8x12();
	g.drawString("Auto Network Test",10,0);
	//drawCarrierInfo();
	g.setFontBitmap();
	g.flip();
}

function modeSelectScreen() {
	assignButtons(4);
	g.clear();
	g.setFont8x12();
	g.drawString("Manual Network Test",1,0);
	g.setFont6x8();
	g.drawString("Mode: ",2,24);
	g.drawString(MODE_NAMES[selected_mode],48,24);
	g.setFontBitmap();
	g.drawString("BTN2 - cycle mode",1,47);
	g.drawString("BTN3 - start scan",1,53);
	g.drawString("BTN4 - switch to automatic scan",1,59);
	g.flip();
}

function manualTestScreen() {
	assignButtons(1);		
	g.clear();
	g.setFont8x12();
	g.drawString("Manual Network Test",1,0);
	drawCarrierInfo();
	g.setFontBitmap();
	g.drawString("BTN2 - cycle carrier",1,53);
	g.drawString("BTN3 - start test",1,59);
	g.flip();
}

function connectionScreen() {
	g.clear();
	g.setFont8x12();
	g.drawString("Connection Details",2,0);
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
		g.setFontBitmap();
		g.drawString("BTN2 - cycle connection details",1,53);
		g.drawString("BTN3 - disconnect from network",1,59);
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
	g.drawString("BTN3 - reset device",1,57);
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

sendAtData = function (data) {
	return new Promise((resolve) => {
		Serial1.write(data);
		resolve(data);
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
		errorScreen("modem reset", err);
	});
}

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
		errorScreen("modem config", err);
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
		scan_result = sendAtCommand('AT+COPS=?',MAX_SCAN_DURATION);			//scan for all available carriers
	})
	.then(() => Serial1.on("data",processDataInterrupt))
	.catch((err) => {
		errorScreen("carrier scan", err);
	});
}

function parseScanResult() {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 3000); //long enough for scan results to be sent through serial
	})
	.then(() => {
		console.log("scan_result = " + scan_result);
		var temp = JSON.stringify(scan_result);
		console.log("stringify temp = " + temp);
		var num = temp.indexOf("("); 	//find start of results
		
		if (num == -1) {				//no carriers are found
			console.log("No carriers found.");
			g.setColor(0);
			g.fillRect(0,10,127,42);
			g.setColor(1);
			g.setFont6x8();
			g.drawString("No carriers found.",2,22);
			g.flip();
		}
		else { 							//carriers are found - parse results
			
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
				if (temp[5*iteration] == null) {
					break;
				}
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
		try {
			connection_status = sendAtCommand('AT+COPS=1,2,' + carrier + ',' + type, 60000); 	//0 - GSM, 8 - CAT-M, 9 - NB_IoT
		}
		catch (err) {			//TODO - not working
			console.log("unable to connect");
			errorScreen("carrier connect", err);
			if (is_manual_test) {
				setTimeout( function() { manualTestScreen();}, 3000);
			}
			else {
				setTimeout( function() { processAutoTest();}, 3000);
			}
		}
	})
	.catch((err) => {
		errorScreen("carrier connect", err);
		/* console.log('catch', err);
		g.clear();
		g.setFontBitmap();
		g.drawString("ERROR - Cannot connect to carrier.");
		g.flip();
		if (!is_manual_test) {
			setTimeout( function() {processAutoTest();}, 5000);
			//cycleAutoTest();
		} */
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
		connection_quality = sendAtCommand('AT+CSQ');					//signal strength (rssi), bit error rate (ber)
	})
	.then(() => {
		connection_information = sendAtCommand('AT+QNWINFO');			//connection type (act), operator id (oper), current band (band), channel id (channel)
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
		console.log("CSQ slice = " + temp);
		temp = temp.split(",");
		
		connection_quality[4] = ( -113 + (2* temp[0])); //rssi scaled to dB
		temp[1] == 99 ? connection_quality[5] = 0 : connection_quality[5] = temp[1]; //ber
		
		//QNWINFO
		temp = JSON.stringify(connection_information);
		num = temp.indexOf("+QNWINFO");
		temp = temp.slice(num + 9, -2);
		console.log("QNWINFO slice = " + temp);
		temp = temp.split(",");
		
		connection_quality[1] = (temp[0]).slice(3,-2); //act
		connection_quality[0] = (temp[1]).slice(2,-2); //oper id
		connection_quality[2] = (temp[2]).slice(6,-2); //band
		connection_quality[3] = (temp[3]); //channel
		
		//QCSQ
		temp = JSON.stringify(connection_signal);
		num = temp.indexOf("+QCSQ");
		temp = temp.slice(num + 6, -2);
		console.log("QCSQ slice = " + temp);
		temp = temp.split(",");
		
		connection_quality[6] = ((temp[3] / 5) - 20); //sinr converted to dB
	})
	.catch((err) => {
		errorScreen("process network details", err);
	});
}

function sendConnectionResults() { //TODO - get working
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 500);
	})
	.then(() => {
		// every post request must contain the APP token and description (data):
		// {"token":"c48cae698f2d696143a91452c6dec7f6de8e233d","description":"data content here"}
		post_header = "POST /db HTTP/1.1\r\nHost: emnipi.herokuapp.com\r\nContent-Type: application/json\r\nContent-Length: "; 	//HTTP request header
		post_data = "{\"token\":\"c48cae698f2d696143a91452c6dec7f6de8e233d\",\"description\":\"my pixl.js data test\"}"; 		//TODO - add test data, time, (optional) location
		payload = post_header + post_data.length + "\r\n\r\n" + post_data; 														//concatenated data to be sent
		console.log(payload);
	})
	.then(() => sendAtCommand('AT+QICSGP=1,1,\"em\",\"\",\"\",1'))		//config TCP/IP
	.then(() => sendAtCommand('AT+QIACT=1',10000))						//activate context
	.then(() => sendAtCommand('AT+QHTTPCFG=\"contextid\",1'))			//config PDP context
	.then(() => sendAtCommand('AT+QHTTPCFG=\"requestheader\",1'))	 	//allow request header
	.then(() => sendAtCommand('AT+QHTTPCFG=\"responseheader\",1'))		//allow HTTP response header
	.then(() => sendAtCommand('AT+QHTTPURL=' + server_url.length + ',10',10000,"CONNECT"))			//puts modem in data mode to accept URL
	.then(() => sendAtData(server_url))
	.then(() => {
		setTimeout(function() {
			sendAtCommand('AT+QHTTPPOST=' + payload.length + ',20,60',20000,"CONNECT")	//TODO - check data length, change max response times (current 80)
			.then(() => sendAtData(payload));
		}, 5000);		//5 second delay to avoid losing data
	})
	//.then(() => sendAtCommand('AT+QIDEACT=1'))							//deactivate context
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
	selected_carrier = 0;
	scan_result = ""; //clear scan results
	selected_mode = AUTOSCAN_DEFAULT;			//autoscan default
	configureModem(selected_mode) // 0 - automatic mode
	.then(() => {
		g.setFontBitmap();
		g.drawString("Scanning for carriers...",2,42);
		g.flip();
	})
	.then(() => scanCarriers()); //TODO - in results handler - call function and iterate through results
}

function processAutoTest() { // called from callback - iterate through carrier results and test connection
	console.log("processing auto test...");
	autoTestScreen();
	drawCarrierInfo();
	connectModem(carrier_id[selected_carrier],carrier_type[selected_carrier]);
	g.setFontBitmap();
	g.drawString("Connecting...",1,57);
	g.flip();
	selected_carrier += 1; //used to increment to next carreir on next loop
}

function cycleAutoTest() { //used to iterate through auto test results
	setTimeout( function() {cycleCarrierInfo();}, 1000);
	setTimeout( function() {connectionScreen();}, 2000);
	setTimeout( function() {cycleCarrierInfo();}, 4000);
	setTimeout( function() {disconnectModem();}, 4000);
	//selected_carrier += 1;
	if (selected_carrier == null) {	//end test
		setTimeout( function() {
			g.clear();
			g.setFont6x8();
			g.drawString("Automatic test completed.", 1,30); //CHECK
		}, 60000);
		setTimeout( function() {autoTestStartScreen();}, 10000);
	}
	else {	//continue test
		setTimeout( function() {processAutoTest();}, 6000);
	}
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
	g.fillRect(0,53,127,63);
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
	Bluetooth.setConsole(true);
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