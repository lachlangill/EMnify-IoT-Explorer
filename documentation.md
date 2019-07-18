# EMnify Network Testing Device
### Documentation

---

# Device Description

The testing device is an all-in-one device; all components are housed inside the 3D printed enclosure.
The device screen is visible on top of the enclosure, with four control buttons, two on either side of the display.
These buttons are numbered from one through to four, starting with the top left button rotating anticlockwise.

Each button generally controls the same function on the device. Each individual control will be reiterated in the Operating Guide section. Each button will be referred to as BTN#:
- BTN1 toggles the backlight on any screen;
- BTN2 is used to cycle through scan results or test parameters.
- BTN3 is used to start a test or initiate a connection;
- BTN4 is used to toggle between automatic and manual test modes.

The network antenna is present on the left side of the device. This should be in the vertical orientation for best network performance.
A micro-USB charging port can be found on the right side of the device, which is used to recharge the internal battery.
A power switch can be found beside the charging port. This is used to turn the testing device on or off.

---

# Key Technical Specifications
### Microcontroller
Name|Espruino Pixl.js
Display|128x64 monocolour, 54 mm diagonal
Backlight|Yes, white LED
Supply voltage (Vin)|3 – 16 V (min – max)
Maximum current draw (I¬max¬¬)|12 mA (with NFC/Bluetooth scanning)
Memory|64 kB RAM, 512 kB Flash

### Network Modem and Shield
Name|Dragino NB-IoT shield with BG96 modem
Supply voltage (Vs)|3.3 or 5 V suitable
Maximum current draw (Imax)|223 mA at maximum gain (23 dBm)
Sim card slot|Micro-sim compatible
Supported cellular technologies|GSM, CAT-M1, NB-IoT
GSM bands|850/900/1800/1900
CAT-M1 bands|1/2/3/4/5/8/12/13/18/19/20/26/28/39
NB-IoT bands|1/2/3/4/5/8/12/13/18/19/20/26/28
GNSS support|GPS, GLONASS, BeiDou/Compass, Galileo, QZSS

### Battery
Capacity|2000 mAh (typ.)
Technology|Lithium Polymer
Charging circuit|Adafruit PowerBoost 500 charger
Output voltage (Vout)|5.2 V
Low voltage detection|3.2 V (from battery)
Recharge current|500 mA (max.)

---

# Operating Guide

todo