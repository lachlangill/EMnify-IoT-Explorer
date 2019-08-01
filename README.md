# EMnify Pixl.js IoT Explorer Board

This testing device is comprised of a [Pixl.js](https://www.espruino.com/Pixl.js) microcontroller with a [NB-IoT Explorer shield](https://wiki.dragino.com/index.php?title=NB-IoT_Shield), complete with an [EMnify sim card](https://www.emnify.com/global-iot-sim) for global network connectivity.

This code is designed to run on a Pixl.js board. Other boards may be capable of running this program with some modification.

The device can be programmed though the [Espruino web IDE](https://www.espruino.com/ide/ "Espruino Web IDE").
[Minification](https://www.espruino.com/Performance "Espruino Performance Notes") will be required to run the code natively on the Pixl.js

The purpose of this project is to test the availability of cellular connectivity technologies and the carriers that offer each. 
The device will scan for all available carriers and connection types, displaying the results of the scan to the built-in display.
After connecting to a network, the details of the connection will be collected and then displayed on the screen.

Both Manual and Automatic testing modes are available for this project.
In manual mode, the scan type and individual carriers can be selected. After connecting to a carrier, the connection details will be collected and displayed on the screen.
Automatic mode will scan for all network types, then iterate through the results, connecting to each carrier and collecting the connection details.