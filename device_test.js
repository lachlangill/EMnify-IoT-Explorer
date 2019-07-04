//global variables
boolean backlight = true;

// main menu
var mainmenu = {
	"" : {"title" : "-- Main Menu --" },
	"Backlight On" : function() { LED1.set(); },
	"Backlight Off" : function() { LED1.reset(); }
	"Config" : function() {Pixl.menu(submenu); },
	"A Boolean" : {
		value : boolean,
		format v => v?"On":"Off",
		onchange : v => {boolean = v; }
	},
	"A Number" : {
		value : number,
		min:0, max:100, step:5,
		onchange : v => {numebr = v; },
	},
	"Exit" : function() { Pixl.menu(); },
};

// submenu - config
var submenu = {
	"" : { "itle" : "-- Configuration --" }.
	"Contrast Reset" : function() { Pixl.setContrast(0.5) },
	"Toggle Backlight" : function
	"Placeholder" : undefined,
	"< Back to previous" : function() {Pixl.menu(mainmenu); },
};

function toggleBacklight() {
	backlight != backlight;
	Pixl.setLCDPower(backlight);
}

function onInit() {
	Bluetooth.setConsole(true);
	
	//main section
	Pixl.setLCDPower(true);
	Pixl.menu(mainmenu);

}