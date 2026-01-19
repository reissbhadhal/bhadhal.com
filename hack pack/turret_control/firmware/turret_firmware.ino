/*
 * Mark Rober Hack Pack Turret Control Firmware (IR Version)
 *
 * This sketch allows the turret to be controlled via the IR Remote.
 *
 * REQUIREMENTS:
 * - Install "IRremote" library by Armin Joachimsmeyer (v4.x+) via Library
 * Manager.
 *
 * DEBUGGING:
 * - Open Serial Monitor at 115200 baud.
 * - Press buttons on remote.
 * - If turret doesn't move, check the "Protocol=..." and "Command=0x..."
 * output.
 * - Update the #define HEX codes below to match your remote if needed.
 */

#include <Arduino.h>
#include <IRremote.hpp> // Make sure to install "IRremote" library!
#include <Servo.h>

// --- PIN DEFINITIONS ---
#define PIN_IR_RECEIVER 9 // Purple wire from IR receiver
// Note: On some Arduino Nanos, Pin 9 and 10 are used by the Servo library,
// creating a conflict with the IR Library (which also uses a timer).
// If servo jitters or IR doesn't work, try moving IR Receiver to Pin 2 or 3!
// But for now, we stick to the Hack Pack standard Pin 9.

#define PIN_PAN_SERVO 10
#define PIN_TILT_SERVO 11
#define PIN_TRIGGER_SERVO 12
#define PIN_FLYWHEEL 5

// --- REMOTE CODES (NEC Protocol) ---
// If the turret doesn't respond, open Verify > Serial Monitor to see your
// codes. Then change the values below to match what you see (e.g. 0x46 instead
// of 0x18).

// SET 1: Common "Keyes" Remote (Default)
#define CMD_UP 0x18
#define CMD_DOWN 0x52
#define CMD_LEFT 0x08
#define CMD_RIGHT 0x5A
#define CMD_OK 0x1C   // Fire
#define CMD_HASH 0x0D // Toggle Flywheel (#)
#define CMD_STAR 0x16 // (*)

// SET 2: Alternate "Car MP3" Remote (Try these if defaults fail)
// To use these, comment out SET 1 and uncomment SET 2.
/*
#define CMD_UP      0x46
#define CMD_DOWN    0x15
#define CMD_LEFT    0x44
#define CMD_RIGHT   0x43
#define CMD_OK      0x40
#define CMD_HASH    0x52 // Note: 0x52 is DOWN in Set 1.
#define CMD_STAR    0x42
*/

// --- SERVO CONFIGURATION ---
#define SERVO_PAN_MIN 0
#define SERVO_PAN_MAX 180
#define SERVO_TILT_MIN 0
#define SERVO_TILT_MAX 180

#define TRIGGER_REST_POS 0
#define TRIGGER_PUSH_POS 90
#define TRIGGER_DELAY 200

// --- GLOBALS ---
Servo panServo;
Servo tiltServo;
Servo triggerServo;

int currentPan = 90;
int currentTilt = 90;
bool flywheelOn = false;

void setup() {
  Serial.begin(115200);
  while (!Serial)
    ;

  Serial.println("STARTING: Turret IR Firmware");
  Serial.println("IR Receiver Pin: " + String(IR_RECEIVE_PIN));

  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);

  // Attach Servos
  panServo.attach(PIN_PAN_SERVO);
  tiltServo.attach(PIN_TILT_SERVO);
  triggerServo.attach(PIN_TRIGGER_SERVO);

  // Setup Motor
  pinMode(PIN_FLYWHEEL, OUTPUT);
  analogWrite(PIN_FLYWHEEL, 0);

  // Initial Positions
  panServo.write(currentPan);
  tiltServo.write(currentTilt);
  triggerServo.write(TRIGGER_REST_POS);

  Serial.println("READY. Press buttons on remote!");
}

void loop() {
  // --- 1. IR CONTROL ---
  if (IrReceiver.decode()) {
    // Print for Debugging
    Serial.print("Protocol: ");
    Serial.print(IrReceiver.getProtocolString());
    Serial.print(" Command: 0x");
    Serial.println(IrReceiver.decodedIRData.command, HEX);

    // Map Commands
    switch (IrReceiver.decodedIRData.command) {
    case CMD_UP:
      moveTilt(5);
      break;
    case CMD_DOWN:
      moveTilt(-5);
      break;
    case CMD_LEFT:
      movePan(5);
      break;
    case CMD_RIGHT:
      movePan(-5);
      break;
    case CMD_OK:
      fireShot();
      break;
    case CMD_HASH:
      toggleFlywheel();
      break;
    default:
      break;
    }
    IrReceiver.resume();
  }

  // --- 2. SERIAL CONTROL (USB) ---
  if (Serial.available() > 0) {
    char cmd = Serial.read();

    // Simple Single-Char Commands for Web Interface
    // U=Up, D=Down, L=Left, R=Right, S=Shoot, F=Flywheel
    switch (cmd) {
    case 'U':
      moveTilt(5);
      break;
    case 'D':
      moveTilt(-5);
      break;
    case 'L':
      movePan(5);
      break;
    case 'R':
      movePan(-5);
      break;
    case 'S':
      fireShot();
      break;
    case 'F':
      toggleFlywheel();
      break;
    }

    // Clear buffer
    while (Serial.available() > 0 &&
           (Serial.peek() == '\n' || Serial.peek() == '\r')) {
      Serial.read();
    }
  }
}

// --- HELPER FUNCTIONS ---

void moveTilt(int delta) {
  currentTilt = constrain(currentTilt + delta, SERVO_TILT_MIN, SERVO_TILT_MAX);
  tiltServo.write(currentTilt);
  Serial.print("TILT:");
  Serial.println(currentTilt);
}

void movePan(int delta) {
  currentPan = constrain(currentPan + delta, SERVO_PAN_MIN, SERVO_PAN_MAX);
  panServo.write(currentPan);
  Serial.print("PAN:");
  Serial.println(currentPan);
}

void toggleFlywheel() {
  flywheelOn = !flywheelOn;
  analogWrite(PIN_FLYWHEEL, flywheelOn ? 255 : 0);
  Serial.println(flywheelOn ? "FLYWHEEL:ON" : "FLYWHEEL:OFF");
}

void fireShot() {
  bool wasOff = !flywheelOn;
  if (wasOff) {
    analogWrite(PIN_FLYWHEEL, 255);
    delay(1000); // Spin up
  }

  triggerServo.write(TRIGGER_PUSH_POS);
  delay(TRIGGER_DELAY);
  triggerServo.write(TRIGGER_REST_POS);
  delay(TRIGGER_DELAY);

  if (wasOff) {
    analogWrite(PIN_FLYWHEEL, 0);
  }
  Serial.println("FIRED");
}
