# PrepPulse — Local Network & Cross-Device Setup Guide

This guide provides step-by-step instructions to connect multiple physical devices (laptops, desktops, Android phones, iOS devices) to your running PrepPulse instance over your local Wi-Fi network without requiring page reloads.

---

## 1. Prerequisites

1. **Both devices must be connected to the SAME local Wi-Fi or LAN network.**
2. The host machine (running Spring Boot and Vite) must keep the servers running:
   - Backend running on port **8082**
   - Frontend running on port **5173**
   - Docker containers running PostgreSQL (**5432**) and Redis (**6379**)

---

## 2. Find Your Host Machine's IPv4 Address

On Windows, open PowerShell or Command Prompt and run:

```powershell
ipconfig
```

Look for your active wireless or ethernet adapter (e.g., `Wireless LAN adapter Wi-Fi`):
```text
IPv4 Address. . . . . . . . . . . : 10.21.121.162
Subnet Mask . . . . . . . . . . . : 255.255.248.0
Default Gateway . . . . . . . . . : 10.21.120.1
```
> In this setup, your host IP is: **`10.21.121.162`**

---

## 3. Windows Defender Firewall Configuration

Windows Defender Firewall blocks incoming connections from other devices on the LAN by default. You must allow inbound traffic on ports **5173** and **8082**.

Open PowerShell **as Administrator** and execute:

```powershell
# Allow Vite Frontend (Port 5173)
New-NetFirewallRule -DisplayName "PrepPulse Frontend (Vite 5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# Allow Spring Boot Backend (Port 8082)
New-NetFirewallRule -DisplayName "PrepPulse Backend (Spring Boot 8082)" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
```

*(Optional)* To remove these rules later when you are finished testing:
```powershell
Remove-NetFirewallRule -DisplayName "PrepPulse Frontend (Vite 5173)"
Remove-NetFirewallRule -DisplayName "PrepPulse Backend (Spring Boot 8082)"
```

---

## 4. Connecting from a Second Device (Android / Laptop)

1. Make sure your Android mobile or second laptop is connected to the **same Wi-Fi network**.
2. Open Chrome, Safari, or any modern web browser on the second device.
3. In the address bar, type:
   ```text
   http://10.21.121.162:5173
   ```
   *(Replace with your actual IP if changed upon router reboot)*

---

## 5. End-to-End Test Procedure

### Test 1: Two Users, Two Devices
1. **Device A (Host Laptop)**:
   - Navigate to `http://localhost:5173`
   - Log in as **Aarav Sharma** (`aarav_sharma` / `Password@123` or click demo button).
   - Open room `#dsa-leetcode-grind`.

2. **Device B (Android Mobile / Second Laptop)**:
   - Navigate to `http://10.21.121.162:5173`
   - Log in as **Priya Patel** (`priya_patel` / `Password@123` or click demo button).
   - Open room `#dsa-leetcode-grind`.

3. **Real-Time Verification**:
   - Device A types a message: Notice the real-time **typing indicator** on Device B.
   - Device A sends a message: Device B immediately receives the message with **SENT** / **DELIVERED** status without page refresh.
   - Device B views the message: Device A's checkmark turns to **SEEN** (double green checkmark).
   - Device B replies: Device A receives the response instantly.
   - Check the **Active Members / Online Indicator**: Both users show green dots (ONLINE) backed by Redis session counters.

---

## 6. Troubleshooting Common Network Issues

### Problem 1: Phone browser says "ERR_CONNECTION_TIMED_OUT" or "Site can't be reached"
- **Cause 1**: The phone is not on the same Wi-Fi network (e.g., phone is using mobile cellular data).
  - *Fix*: Connect phone to the same Wi-Fi router as your host laptop.
- **Cause 2**: Windows Defender Firewall is blocking inbound connections.
  - *Fix*: Run the PowerShell firewall commands listed in Section 3 as Administrator.
- **Cause 3**: AP Isolation (Client Isolation) is enabled on your Wi-Fi router.
  - *Fix*: Some university, hotel, or office guest Wi-Fi networks block device-to-device communication. Use your personal mobile hotspot: Turn on Hotspot on your phone, connect your laptop to the phone's hotspot, run `ipconfig`, and use the newly assigned IP.

### Problem 2: Page loads, but login fails with Network Error
- **Cause**: CORS rejection or Vite proxy unable to forward to `localhost:8082`.
  - *Fix*: PrepPulse has configured `allowedOriginPatterns` to accept all LAN origins (`10.*:*`, `192.168.*:*`, `172.*:*`). If your custom domain or subnet differs, set `CORS_ALLOWED_ORIGIN_PATTERNS` in your environment.

### Problem 3: WebSocket fails or disconnects immediately
- **Cause**: SockJS fallback needs sticky connection or proper headers.
  - *Fix*: Ensure your JWT token hasn't expired. If you get `401 Unauthorized` in the browser console, log out and log back in to refresh your JWT token.

