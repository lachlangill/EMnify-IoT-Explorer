//global variables
var backlight = true;

// main menu
var mainmenu = {
	"" : {"title" : "-- Main Menu --" },
	"Backlight On" : function() { LED1.set(); },
	"Backlight Off" : function() { LED1.reset(); },
	"Config" : function() {Pixl.menu(submenu); },
	"Exit" : function() { Pixl.menu(); },
};

// submenu - config
var submenu = {
	"" : { "title" : "-- Configuration --" },
	"Contrast Reset" : function() { Pixl.setContrast(0.5); },
	"Toggle Backlight" : function() { toggleBacklight(); },
	"Placeholder" : undefined,
	"< Back to previous" : function() {Pixl.menu(mainmenu); },
};

function toggleBacklight() {
	backlight = !backlight;
	Pixl.setLCDPower(backlight);
}

function onInit() {
	Bluetooth.setConsole(true);	
	//main section
	Pixl.setLCDPower(true);
	Pixl.menu(mainmenu);

}