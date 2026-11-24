# SMART INTERACTIVE FINE-MOTOR & HAND-EYE COORDINATION TRAINING PAD

**Team Name:** NOVA NEXES  
**Team ID:** EJ26T978713  
**Project:** Smart Interactive Fine-Motor & Hand-Eye Coordination Training Pad

---

> [!IMPORTANT]
> **Educational & Assistive Scope Notice**:
> This system is designed solely for educational motor skill practice, sequence learning, and progress monitoring. It is **not** a medical device and does not diagnose, treat, prevent, or cure any medical condition.

---

## 1. Application Overview

The **Smart Interactive Fine-Motor & Hand-Eye Coordination Training Pad** is a responsive web application and digital companion for a physical electronic training pad. 

The physical hardware uses:
- **ESP32 microcontroller**
- **15x Magnetic reed switches** mounted underneath activity holes
- **Safe training stylus** containing a permanent neodymium magnet
- **LED indicators** for visual cues
- **Audio buzzer / chime** for acoustic feedback
- **Bluetooth Low Energy (BLE)** & Wi-Fi communication

Children place the magnetic stylus into activity holes in sequence. The reed switches detect the stylus position and transmit the events to the ESP32. The application verifies the sequence in real time, provides immediate positive or gentle retry feedback, computes precision performance analytics, and displays multi-session progression charts for teachers, parents, and therapists.

### Key Capabilities
- **Physical Working Pad Integration & Strict Sequential LED Rule**:
  - The teacher selects the shape/pattern in software (e.g. **Shape "L"**: `1 → 2 → 3 → 4 → 5`).
  - The sequence is sent directly to the physical ESP32 pad.
  - **CRITICAL HARDWARE RULE**: An LED on the physical pad (and web monitor) **ONLY GLOWS** when the child hits that hole in the **exact sequential order**!
  - If a wrong hole is touched, or if holes are touched out of order (e.g. `2, 3, 1, 4, 5`), the LED **DOES NOT GLOW** (stays completely OFF).
- **Dual Major Experiences**:
  - **Child Activity Experience**: Big visual pad, cheerful high-contrast buttons, step progress counter, gentle non-punitive "Try Again" cues, and pleasant Web Audio chimes.
  - **Teacher / Parent Dashboard**: Multi-child profile management, session history audit trail, interactive progression charts, custom pattern creator, hardware console, and printable PDF / CSV export.
- **High-Fidelity Simulation Mode**: Fully operational without physical hardware. Virtual pad clicks trigger identical reed-switch telemetry frames.
- **Embedded Web Audio Synthesizer**: Native sine and triangle wave harmonic chimes with zero external sound asset dependencies.

---

## 2. Folder & Project Structure

```
project_1/
├── firmware/
│   └── esp32_training_pad.ino         # Complete Arduino/ESP-IDF C++ sketch
├── public/
│   └── favicon.svg                    # Custom brand icon
├── src/
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── Navbar.tsx             # Brand header, child switcher, BLE status, demo launcher
│   │   │   └── Sidebar.tsx            # Main educator navigation menu
│   │   └── pad/
│   │       ├── VirtualPad.tsx         # Interactive training pad with reed switch dots & LEDs
│   │       └── PatternConnectorSvg.tsx# Animated sequence connector overlay
│   ├── context/
│   │   └── AppContext.tsx             # Global React state, view router, and engine subscriber
│   ├── engine/
│   │   └── ActivityEngine.ts          # Sequence verification, timer, attempts tally, accuracy math
│   ├── services/
│   │   ├── bleDeviceManager.ts        # Web Bluetooth API manager & live packet buffer
│   │   ├── hardwareProtocol.ts        # BLE GATT UUIDs and JSON packet encoders
│   │   ├── simulatorService.ts        # Hardware simulator mirroring ESP32 logic
│   │   └── soundService.ts            # Web Audio API harmonic chime synthesizer
│   ├── store/
│   │   ├── dataStore.ts               # LocalStorage repository with CRUD operations
│   │   └── demoData.ts                # Initial seed data (3 children, 11 activities, 15 sessions)
│   ├── types/
│   │   └── index.ts                   # Domain models and TypeScript contracts
│   ├── views/
│   │   ├── ActivityConfigModal.tsx    # Pre-session configuration modal (hints, audio, time limit)
│   │   ├── ActivityLibraryView.tsx    # Activities grouped by Level 1, Level 2, Level 3
│   │   ├── ChildActivityView.tsx      # Dedicated fullscreen child training mode
│   │   ├── ChildProfilesView.tsx      # Child profile management & individual benchmarks
│   │   ├── CompletionView.tsx         # Celebratory summary with confetti & accuracy score
│   │   ├── DashboardView.tsx          # Teacher/parent overview & quick stats
│   │   ├── DemoGuideModal.tsx         # Interactive presentation walkthrough for evaluators
│   │   ├── DeviceStatusView.tsx       # ESP32 BLE status, sandbox, and packet console
│   │   ├── PatternCreatorView.tsx     # Custom pattern designer with interactive pad
│   │   ├── ProgressDashboardView.tsx  # Multi-session accuracy & pacing trendline charts
│   │   ├── ReportsView.tsx            # Formatted printable PDF report and CSV download
│   │   └── SettingsView.tsx           # Preferences, supervisor roles, and demo reset
│   ├── App.tsx                        # Master layout and view switcher
│   ├── index.css                      # Tailwind styling, glowing animations, print stylesheet
│   └── main.tsx                       # React application entry point
├── index.html                         # Responsive HTML shell
├── package.json                       # Dependencies & build scripts
├── tsconfig.app.json                  # TypeScript compiler settings
├── vite.config.ts                     # Vite + Tailwind configuration
└── README.md                          # Project documentation
```

---

## 3. Database & Data Model

All records are persisted locally in `LocalStorage` with schema safety and pre-populated realistic demo data.

### Core Entities

#### `ChildProfile`
```typescript
interface ChildProfile {
  id: string;                         // 'ch-01'
  name: string;                       // 'Leo Chen'
  profileId: string;                  // 'CH-2026-01'
  age: number;                        // 6
  avatar: string;                     // '🦁'
  createdAt: string;                  // '2026-08-15'
  totalSessions: number;              // 14
  lastActivityDate: string | null;    // '2026-09-22'
  overallAccuracy: number;            // 86.4
  totalCompletedActivities: number;   // 12
  notes?: string;
}
```

#### `Activity`
```typescript
interface Activity {
  id: string;                         // 'act-05'
  name: string;                       // 'Zig-Zag Rhythm'
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  sequence: number[];                 // [1, 7, 3, 9, 5]
  stepCount: number;                  // 5
  estimatedDurationSec: number;       // 45
  padLayout: '3x5' | '4x4';          // '3x5'
  isCustom?: boolean;
  createdBy?: string;
  previousBestAccuracy?: number;
}
```

#### `SessionRecord`
```typescript
interface SessionRecord {
  sessionId: string;                  // 'SES-901'
  childId: string;
  childName: string;
  activityId: string;
  activityName: string;
  level: ActivityLevel;
  startTime: number;
  endTime: number;
  completionTimeSec: number;          // 74
  totalAttempts: number;              // 6
  correctAttempts: number;            // 5
  wrongAttempts: number;              // 1
  accuracy: number;                   // (5 / 6) * 100 = 83.3%
  completedSteps: number;             // 5
  totalSteps: number;                 // 5
  status: 'completed' | 'abandoned';
  events: SessionEvent[];             // Step-by-step sensor telemetry
  configUsed: ActivityConfig;
}
```

#### Accuracy Formula
$$\text{Accuracy} = \left(\frac{\text{Correct Attempts}}{\text{Total Attempts}}\right) \times 100$$

---

## 4. Hardware Communication Interface

Communication between the physical ESP32 and the Web application uses **Bluetooth Low Energy (BLE)** via the Web Bluetooth API.

### GATT Service & Characteristics
- **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e` (Nordic UART Service)
- **RX Characteristic (App -> ESP32)**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e` (Write)
- **TX Characteristic (ESP32 -> App)**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e` (Notify)

### JSON Frame Protocol

#### A. Stylus Hole Selection (ESP32 -> App)
```json
{
  "deviceId": "PAD_NOVA_01",
  "hole": 4,
  "timestamp": 1727068555120,
  "event": "HOLE_SELECTED"
}
```

#### B. Activity Configuration & Sequence Start (App -> ESP32)
```json
{
  "cmd": "START_PATTERN",
  "pattern": [1, 3, 5, 7, 9],
  "audio": true,
  "visual": true,
  "timestamp": 1727068550000
}
```

#### C. Step Correct / Wrong Telemetry
```json
{
  "cmd": "CORRECT_STEP",
  "hole": 3,
  "nextHole": 5,
  "timestamp": 1727068558000
}
```

#### D. Activity Finished (ESP32 -> App)
```json
{
  "deviceId": "PAD_NOVA_01",
  "event": "ACTIVITY_COMPLETED",
  "totalSteps": 5,
  "timestamp": 1727068590000
}
```

---

## 5. Simulation Interface

The application includes a **Hardware Simulation Layer (`SimulatorService`)** that runs autonomously when physical hardware is not attached.

- **Virtual Pad Holes**: Clicking any hole on the virtual pad dispatches a synthetic `HOLE_SELECTED` event to the `BleDeviceManager`.
- **Identical State Path**: The `ActivityEngine` processes virtual inputs through the exact same sequence verification, audio feedback, and telemetry pipelines as physical reed switch inputs.
- **Packet Inspector Console**: Located in `Device & Hardware` -> `Live Packet Console`, showing live incoming and outgoing frames with microsecond timestamps.
- **Sandbox Mode**: Test random stylus placements, retries, and sequences freely without affecting recorded child metrics.

---

## 6. How to Run the Project

### Prerequisites
- **Node.js** v18+ (tested on Node v24.16.0)
- Any modern web browser (Google Chrome, Microsoft Edge, or Opera recommended for Web Bluetooth support).

### Setup & Launch
1. Open PowerShell or Command Prompt in the project folder:
   ```powershell
   cd C:\Users\LENOVO\Downloads\project_1
   ```
2. Run the development server:
   ```powershell
   npm.cmd run dev
   ```
3. Open the displayed URL in your browser:
   `http://localhost:5173/`

### Production Build
To create an optimized production bundle:
```powershell
npm.cmd run build
npm.cmd run preview
```

---

## 7. Connecting Physical ESP32 Hardware

The complete Arduino C++ sketch is available in [`firmware/esp32_training_pad.ino`](file:///c:/Users/LENOVO/Downloads/project_1/firmware/esp32_training_pad.ino).

### Pinout & Wiring Diagram

| Component | ESP32 GPIO Pin | Connection Details |
| :--- | :--- | :--- |
| **Reed Switches #1 - #15** | GPIO `13, 12, 14, 27, 26, 25, 33, 32, 35, 34, 23, 22, 21, 5, 4` | Connect one terminal of each switch to the GPIO pin and the other terminal to GND. Internal pullups enabled. |
| **Buzzer** | GPIO `19` | Piezo / active buzzer positive pin to GPIO 19, negative to GND. |
| **Status LED** | GPIO `2` | Built-in LED on ESP32 development board. |
| **Addressable LEDs (WS2812B)** | GPIO `18` | Data IN to GPIO 18, 5V to VIN, GND to GND. |

### Flashing Firmware
1. Open Arduino IDE (v2.0+ recommended).
2. Install the **ESP32 by Espressif Systems** board package (`Boards Manager` -> `ESP32`).
3. Install the **ArduinoJson** library (`Library Manager` -> `ArduinoJson` v6 or v7).
4. Select board: `ESP32 Dev Module` or `ESP32-WROOM-DA Module`.
5. Connect your ESP32 via USB and click **Upload**.
6. In the web application, go to **Device & Hardware** -> click **Connect ESP32 (BLE)** -> select **NOVA NEXES Training Pad**.

---

## 8. Presentation Demonstration Script

Use the built-in **"Project Demo Tour"** button in the top navigation bar or follow this flow:

1. **Active Learner Selection**: In the top bar, observe that `Leo Chen (Age 6)` is selected. Open the dropdown to inspect `Maya Patel` and `Sam Miller`.
2. **Dashboard Overview**: Note the quick metrics: `Avg Accuracy (86.4%)`, `Completed Sessions`, and the `Recent Activity` card.
3. **Activity Catalog**: Click **Activity Library** in the sidebar. Review Level 1 (Straight), Level 2 (Zig-zag), and Level 3 (Advanced). Note the progression indicators.
4. **Child Activity Mode**:
   - Click **Start** on `Zig-Zag Rhythm (Level 2)`.
   - The configuration modal appears with pattern preview `1 → 7 → 3 → 9 → 5`. Click **Start Activity**.
   - The child-friendly screen loads with large holes and progress bar.
   - Tap Hole `1`: Notice the green pulse, positive chime, and step advance.
   - Tap Hole `4` (wrong hole): Notice the gentle amber pulse and encouragement: *"Try again! You can do it!"*
   - Tap Hole `7`, then `3`, then `9`, then `5`: Observe the celebratory fanfare and confetti burst!
5. **Session Review**:
   - The completion card displays `Accuracy: 83%` (5 correct ÷ 6 tries), time, and step summary.
   - Click **Save Session & Return to Dashboard**.
6. **Progress Charts & Audit**:
   - Click **Progress & Analytics** in the sidebar. Observe that the accuracy and pacing charts have dynamically updated with the newly completed run!
   - Click **Session History** to inspect the step-by-step event replay.
7. **Custom Pattern Studio**:
   - Click **Pattern Creator**. Click holes `2 → 4 → 6 → 8 → 10`. Name it *"Even Jump"*, select Beginner, and click **Save to Activity Library**.
8. **Export**:
   - Go to **Reports & Export**, review the student summary, click **Export CSV** to download tabular records or **Print / Save PDF**.

---

## 9. Future Development & Extensibility

- **Expanded Pad Configurations**: Support for 4×4 (16 holes) and 5×5 (25 holes) interchangeable snap-on overlays.
- **Multi-Child Classroom Sidecars**: Multi-pad Bluetooth hub allowing a teacher to run simultaneous activities on up to 6 physical pads from a single tablet dashboard.
- **Haptic Vibration Stylus**: Wireless stylus with tiny ERM motor for sensory tactile confirmation upon correct hole selection.
- **Cloud Sync & Data Connector**: Optional encrypted sync to cloud storage for school district longitudinal reporting.
