//global variables
var backlight = true;
var contrast = 0.5;

// main menu
var mainmenu = {
	"" : {"title" : "-- Main Menu --" },
	"Backlight On" : function() { LED1.set(); },
	"Backlight Off" : function() { LED1.reset(); },
	"Config" : function() {Pixl.menu(submenu); },
	"Exit" : function() { Pixl.menu(mainmenu); },
};

// submenu - config
var submenu = {
	"" : { "title" : "-- Configuration --" },
	"Contrast Increase" : function() { raiseContrast(); },
	"Contrast Decrease" : function() { lowerContrast(); },
	"Toggle Backlight" : function() { toggleBacklight(); },
	"Placeholder" : undefined,
	"< Back to previous" : function() {Pixl.menu(mainmenu); },
};

function lowerContrast() {
	contrast = contrast - 0.1;
	Pixl.setContrast(contrast);
}

function raiseContrast() {
	contrast = contrast + 0.1;
	Pixl.setContrast(contrast);
}

function toggleBacklight() {
	backlight = !backlight;
	digitalWrite(LED1,backlight);
}

function onInit() {
	Bluetooth.setConsole(true);	
	//main section
	Pixl.setLCDPower(true);
	Pixl.menu(mainmenu);

}