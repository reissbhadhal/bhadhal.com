# Mark Rober Hack Pack Turret Control (IR Remote)

This project controls your Hack Pack Turret using the included IR Remote.

## Setup

### 1. Install Library
In the Arduino IDE:
1.  Go to **Sketch** > **Include Library** > **Manage Libraries...**
2.  Search for `IRremote`.
3.  Install **"IRremote" by Armin Joachimsmeyer** (Version 4.x or later).

### 2. Check Wiring
Ensure your components are connected to these pins (or update the code to match):
- **IR Receiver**: Pin 9 (Blue/Purple wire)
- **Pan Servo**: Pin 5 (Left/Right)
- **Tilt Servo**: Pin 6 (Up/Down)
- **Trigger**: Pin 12
- **Flywheel**: Pin 5

### 3. Flash the Firmware
1.  Open `firmware/turret_firmware.ino`.
2.  Upload to your Arduino Nano.

## Usage

Point your remote at the turret and use these buttons:

- **Up / Down**: Tilt the turret.
- **Left / Right**: Pan the turret.
- **OK (Middle)**: FIRE! (Be careful)
- **# (Hash)**: Toggle Flywheel (Spin up/down for rapid fire).

## Troubleshooting / Custom Remotes

If your remote buttons don't work:
1.  Keep the Arduino connected to USB.
2.  Open **Tools** > **Serial Monitor** in Arduino IDE.
3.  Set baud rate to **115200**.
4.  Press a button on your remote.
5.  Look for output like: `Protocol=NEC Command=0x18`.
6.  Copy that `0x18` code into the firmware file:
    ```cpp
    #define CMD_UP      0x18 
    ```
7.  Re-upload the code.
