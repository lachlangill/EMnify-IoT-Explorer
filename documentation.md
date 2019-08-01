# EMnify Network Testing Device Documentation

# Device Description

The testing device is an all-in-one device; all components are housed inside the 3D printed enclosure.
The device screen is visible on top of the enclosure, with four control buttons, two on either side of the display.
These buttons are numbered from one through to four, starting with the top left button rotating anticlockwise.

Each button generally controls the same function on the device.
Each individual control will be reiterated in the Operating Guide section.
Each button will be referred to as **BTN#**:
- **BTN1** toggles the backlight on any screen;
- **BTN2** is used to cycle through scan results or test parameters.
- **BTN3** is used to start a test or initiate a connection;
- **BTN4** is used to toggle between automatic and manual test modes.

The network antenna is present on the left side of the device.
This should be in the vertical orientation for best network performance.
A micro-USB charging port can be found beside the antenna on the left side, which is used to recharge the internal battery. 
A power switch can be found on the other side of the antenna, used to turn the testing device on or off.

---

# Key Technical Specifications

## Microcontroller
|Parameter|Description/Value|
---|---
Name|Espruino Pixl.js
Display|128x64 monocolour, 54 mm diagonal
Backlight|Yes, white LED
Supply voltage (Vin)|3 – 16 V (min – max)
Maximum current draw (Imax)|12 mA (with NFC/Bluetooth scanning)
Memory|64 kB RAM, 512 kB Flash

Further technical specifications can be found [here](https://www.espruino.com/Pixl.js).

## Network Modem and Shield
|Parameter|Description/Value|
---|---
Name|Dragino NB-IoT shield with BG96 modem
Supply voltage (Vs)|3.3 or 5 V suitable
Maximum current draw (Imax)|223 mA at maximum gain (23 dBm)
Sim card slot|Micro-sim compatible
Supported cellular technologies|GSM, CAT-M1, NB-IoT
GSM bands|850/900/1800/1900
CAT-M1 bands|1/2/3/4/5/8/12/13/18/19/20/26/28/39
NB-IoT bands|1/2/3/4/5/8/12/13/18/19/20/26/28
GNSS support|GPS, GLONASS, BeiDou/Compass, Galileo, QZSS

Further technical specifications can be found [here](https://www.dragino.com/products/nb-iot/item/130-nb-iot-shield.html).

## Battery
|Parameter|Description/Value|
---|---
Capacity|2000 mAh (typ.)
Technology|Lithium Polymer
Charging circuit|Adafruit PowerBoost 500 charger
Output voltage (Vout)|5.2 V
Low voltage detection|3.2 V (from battery)
Recharge current|500 mA (max.)

Further technical specifications can be found [here](https://learn.adafruit.com/adafruit-powerboost-500-plus-charger/overview).

---

# Operating Guide

After turning the device on, the Pixl.js bootloader screen will be displayed for a few seconds.
The device will then load up the network scanning program from its onboard memory.
The program will go through a few stages of initialization, before reaching the manual testing screen.

From this screen you can press **BTN2** to cycle between manual testing modes, **BTN3** to start the manual network scan, or press **BTN4** to switch to automatic testing.

## Manual Scan

After pressing **BTN4** on the automatic test screen to reach the manual test screen, the network type can be selected by pressing **BTN2** to cycle between Automatic, GSM, CAT-M1, and NB-IoT scan modes.
Pressing **BTN3** will initiate the scan of the desired network type.
After scanning for carriers that offer the desired network type, the results will be processed by the device and made available on the screen.
Pressing **BTN2** will cycle between the scan results, and **BTN3** will cause the modem to connect to the currently selected carrier.
The connection details will then be collected and displayed on the screen.
**BTN2** can be used to scroll through the connection details.
By pressing **BTN4**, the device will connect to the remote data server and upload the scan results and current connection information.
This can take up to 20 seconds.
After this is complete, pressing **BTN3** will disconnect the device from the chosen carrier and will display the scan results again, allowing another connection to be selected.

To initiate a different scan type, press **BTN4** twice to reset the manual test.
To switch to automatic scanning mode, press **BTN4** once.

## Automatic Scan

By pressing BTN4 on the manual test screen, the Automatic Test Screen will be displayed. 
To start the automatic test, press **BTN3** on the automatic test screen.
The device will then automatically scan for all available carriers with all network types that are present in the current location.

After completing a successful scan, the device will use the results to test each carrier and connection type sequentially.
The device will connect to a carrier, then display the connection results on the screen.

The carrier ID and name will be shown, along with the network type when the modem is trying to connect.
After connecting, the connection strength and other details will be collected and displayed on the screen.
The modem will then disconnect, moving on to test the next connection.

Upon completion of the test, the device returns to the Automatic Test Screen.
To restart the Automatic Test, press **BTN3** to restart the test.
To switch to manual scanning mode, press **BTN4** once.

---

# Errors and Troubleshooting

This section details some common errors that may be encountered during the device operation.
Each error cause and solutions are detailed below.

Generally, the easiest way to solve an error is to simply restart the device and start another scan.

## Error Screen

If an error with the modem occurs, the error screen will be displayed with the corresponding location that the error occurred in, as well as a message that indicates what caused the error.

## Common Errors

These are some errors that occurred often during the testing of this project.

*CME ERROR TIMEOUT*

This error indicates that the modem is busy processing an instruction.
This is usually caused by initiating a network scan, then restarting the device or trying to perform another action quickly.
The modem will still be trying to scan for networks and will not accept any other commands until it completes its scan.

Possible solutions for this problem:
- Perform a hard restart of the device. This can be achieved by turning the device off, then switching it back on after about ten seconds.
- Wait for the modem to complete its operation before trying to initiate any further action or function.

*CME ERROR 3*

This error can occur when the modem is not initialized properly. 
It can also be caused by invalid permissions with the modem and carriers.

Possible solutions for this problem:
- Reset the device.

## Device Problems

*Display isn’t turning on*
- Check the device has power
- Plug in to power and try again

*Device is unresponsive/frozen*
- The device can get stuck on function execution
- Wait for the current scan to complete
- Alternatively, perform a hard reset

*No networks are found*
- Check the antenna is connected properly
- Check the scan type
- Start another scan

---

## Further error messages
For any error messages not listed here, please refer to the Quectel BG96 AT Commands Manual, sections 12.5 and 12.6 available [here](https://www.quectel.com/UploadImage/Downlad/Quectel_BG96_AT_Commands_Manual_V2.1.pdf).
