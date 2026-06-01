"""
FlexyGSM USB Security Key Client
================================
This Python application acts as a hardware bridge between a USB flash drive
containing a security.auth file and the FlexyGSM backend API.

Behavior:
  1. Continuously scans for USB drive insertion
  2. Detects and reads /security.auth file from the USB
  3. Reads the USB drive's hardware serial number
  4. Sends verification request to the backend
  5. If authenticated: starts heartbeat loop every 5 seconds
  6. If USB is removed: immediately calls logout and terminates session

Usage:
  python usb_auth_client.py [--api-url http://localhost:8000/api/v1]

Requirements:
  pip install requests wmi pywin32
"""

import os
import sys
import json
import time
import string
import ctypes
import hashlib
import argparse
import threading
import subprocess
from datetime import datetime

# Fix Windows terminal encoding
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' package is required. Install with: pip install requests")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════

DEFAULT_API_URL = "http://localhost:8000/api/v1"
HEARTBEAT_INTERVAL = 5  # seconds
SCAN_INTERVAL = 2       # seconds
AUTH_FILENAME = "security.auth"

# ═══════════════════════════════════════════════════════════════════
# Windows USB utilities
# ═══════════════════════════════════════════════════════════════════

def get_removable_drives():
    """Get list of removable drive letters (USB flash drives)."""
    drives = []
    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    for i in range(26):
        if bitmask & (1 << i):
            letter = chr(65 + i) + ":\\"
            try:
                drive_type = ctypes.windll.kernel32.GetDriveTypeW(letter)
                # DRIVE_REMOVABLE = 2
                if drive_type == 2:
                    drives.append(letter)
            except Exception:
                continue
    return drives


def get_usb_serial_wmi(drive_letter):
    """Get USB serial number using WMI (Windows Management Instrumentation)."""
    try:
        import wmi
        c = wmi.WMI()
        
        # Map drive letter to physical disk
        drive_letter_clean = drive_letter.rstrip("\\")
        
        for logical_disk in c.Win32_LogicalDisk():
            if logical_disk.DeviceID == drive_letter_clean:
                for partition in logical_disk.associators("Win32_LogicalDiskToPartition"):
                    for disk in partition.associators("Win32_DiskDriveToDiskPartition"):
                        serial = disk.SerialNumber
                        if serial:
                            return serial.strip()
        return None
    except ImportError:
        return None
    except Exception as e:
        print(f"  [WMI] Error: {e}")
        return None


def get_usb_serial_wmic(drive_letter):
    """Get USB serial number using WMIC command (fallback)."""
    try:
        drive_letter_clean = drive_letter.rstrip("\\")
        
        # Get volume serial as fallback identifier
        result = subprocess.run(
            ["wmic", "logicaldisk", "where", f"DeviceID='{drive_letter_clean}'", "get", "VolumeSerialNumber", "/format:list"],
            capture_output=True, text=True, timeout=10,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
        )
        
        for line in result.stdout.strip().split('\n'):
            if line.startswith('VolumeSerialNumber='):
                serial = line.split('=', 1)[1].strip()
                if serial:
                    return serial
        
        # Try to get physical disk serial
        result = subprocess.run(
            ["wmic", "diskdrive", "where", "InterfaceType='USB'", "get", "SerialNumber", "/format:list"],
            capture_output=True, text=True, timeout=10,
            creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
        )
        
        for line in result.stdout.strip().split('\n'):
            if line.startswith('SerialNumber='):
                serial = line.split('=', 1)[1].strip()
                if serial:
                    return serial
        
        return None
    except Exception as e:
        print(f"  [WMIC] Error: {e}")
        return None


def get_usb_serial(drive_letter):
    """Get USB serial number using best available method."""
    # Try WMI first
    serial = get_usb_serial_wmi(drive_letter)
    if serial:
        return serial
    
    # Fallback to WMIC
    serial = get_usb_serial_wmic(drive_letter)
    if serial:
        return serial
    
    # Last resort: generate a hash from volume info
    try:
        drive_letter_clean = drive_letter.rstrip("\\")
        volume_info = ctypes.create_unicode_buffer(256)
        fs_name = ctypes.create_unicode_buffer(256)
        serial_number = ctypes.c_ulong()
        max_component = ctypes.c_ulong()
        flags = ctypes.c_ulong()
        
        success = ctypes.windll.kernel32.GetVolumeInformationW(
            drive_letter,
            volume_info, 256,
            ctypes.byref(serial_number),
            ctypes.byref(max_component),
            ctypes.byref(flags),
            fs_name, 256
        )
        
        if success:
            return f"VOL-{serial_number.value:08X}"
    except Exception as e:
        print(f"  [Volume] Error: {e}")
    
    return None


# ═══════════════════════════════════════════════════════════════════
# Auth File Parser
# ═══════════════════════════════════════════════════════════════════

def read_auth_file(drive_letter):
    """Read and parse the security.auth file from a USB drive."""
    auth_path = os.path.join(drive_letter, AUTH_FILENAME)
    
    if not os.path.isfile(auth_path):
        return None
    
    try:
        with open(auth_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Validate required fields
        required = ['version', 'user_id', 'auth_token', 'signature', 'issuer']
        for field in required:
            if field not in data:
                print(f"  [AUTH] Missing field: {field}")
                return None
        
        if data.get('issuer') != 'FlexyGSM-USB-Auth':
            print("  [AUTH] Invalid issuer")
            return None
        
        return data
    except json.JSONDecodeError as e:
        print(f"  [AUTH] Invalid JSON: {e}")
        return None
    except PermissionError:
        print("  [AUTH] Permission denied reading file")
        return None
    except Exception as e:
        print(f"  [AUTH] Error reading file: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════
# API Client
# ═══════════════════════════════════════════════════════════════════

class USBAuthClient:
    def __init__(self, api_url):
        self.api_url = api_url.rstrip('/')
        self.session_id = None
        self.usb_serial = None
        self.user_info = None
        self.authenticated = False
        self.active_drive = None
        self._heartbeat_thread = None
        self._stop_heartbeat = threading.Event()
    
    def verify(self, auth_data, usb_serial):
        """Send verification request to backend."""
        try:
            payload = {
                "auth_token": auth_data['auth_token'],
                "user_id": auth_data['user_id'],
                "usb_serial": usb_serial,
                "signature": auth_data['signature'],
            }
            
            response = requests.post(
                f"{self.api_url}/usb-auth/verify",
                json=payload,
                timeout=10,
                headers={"User-Agent": "FlexyGSM-USB-Client/1.0"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.session_id = data['session_id']
                self.usb_serial = usb_serial
                self.user_info = data.get('user', {})
                self.authenticated = True
                return True, data.get('message', 'Authenticated')
            else:
                error = response.json().get('error', 'Unknown error')
                return False, error
        except requests.ConnectionError:
            return False, "Cannot connect to server"
        except requests.Timeout:
            return False, "Server timeout"
        except Exception as e:
            return False, str(e)
    
    def send_heartbeat(self):
        """Send heartbeat to keep session alive."""
        try:
            response = requests.post(
                f"{self.api_url}/usb-auth/heartbeat",
                json={
                    "session_id": self.session_id,
                    "usb_serial": self.usb_serial,
                },
                timeout=5,
                headers={"User-Agent": "FlexyGSM-USB-Client/1.0"}
            )
            return response.status_code == 200
        except Exception:
            return False
    
    def logout(self):
        """Terminate the session on the backend."""
        if not self.session_id:
            return
        
        try:
            requests.post(
                f"{self.api_url}/usb-auth/logout",
                json={"session_id": self.session_id},
                timeout=5,
                headers={"User-Agent": "FlexyGSM-USB-Client/1.0"}
            )
        except Exception:
            pass
        
        self.session_id = None
        self.authenticated = False
        self.usb_serial = None
        self.user_info = None
        self.active_drive = None
    
    def start_heartbeat(self):
        """Start the heartbeat loop in a background thread."""
        self._stop_heartbeat.clear()
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
    
    def stop_heartbeat(self):
        """Stop the heartbeat loop."""
        self._stop_heartbeat.set()
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=HEARTBEAT_INTERVAL + 2)
    
    def _heartbeat_loop(self):
        """Background heartbeat loop."""
        consecutive_failures = 0
        while not self._stop_heartbeat.is_set():
            if self.send_heartbeat():
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                if consecutive_failures >= 3:
                    print("\n  [!] Heartbeat failed 3 times. Session may be invalid.")
                    break
            
            self._stop_heartbeat.wait(HEARTBEAT_INTERVAL)


# ═══════════════════════════════════════════════════════════════════
# Console UI
# ═══════════════════════════════════════════════════════════════════

def print_banner():
    """Print application banner."""
    banner = """
+==============================================================+
|                                                              |
|      [*]  FlexyGSM USB Security Key Client  [*]             |
|                                                              |
|   Hardware Authentication Bridge                             |
|   Insert your USB security key to authenticate               |
|                                                              |
+==============================================================+
"""
    print(banner)


def print_status(msg, level="INFO"):
    """Print timestamped status message."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    icons = {
        "INFO": "[i]",
        "OK": "[+]",
        "WARN": "[!]",
        "ERROR": "[x]",
        "USB": "[USB]",
        "HEART": "[~]",
    }
    icon = icons.get(level, "[.]")
    print(f"  [{timestamp}] {icon}  {msg}")


# ═══════════════════════════════════════════════════════════════════
# Main Loop
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="FlexyGSM USB Security Key Client")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Backend API base URL")
    args = parser.parse_args()
    
    print_banner()
    print_status(f"API Server: {args.api_url}", "INFO")
    print_status("Scanning for USB drives...\n", "USB")
    
    client = USBAuthClient(args.api_url)
    
    try:
        while True:
            if not client.authenticated:
                # ── Scan for USB drives ──
                drives = get_removable_drives()
                
                for drive in drives:
                    auth_data = read_auth_file(drive)
                    if auth_data is None:
                        continue
                    
                    print_status(f"Security key found on drive {drive}", "USB")
                    print_status(f"User: {auth_data.get('username', 'Unknown')} (ID: {auth_data['user_id']})", "INFO")
                    
                    # Get USB serial
                    usb_serial = get_usb_serial(drive)
                    if not usb_serial:
                        print_status("Could not read USB serial number", "ERROR")
                        continue
                    
                    print_status(f"USB Serial: {usb_serial}", "INFO")
                    print_status("Verifying with server...", "INFO")
                    
                    success, message = client.verify(auth_data, usb_serial)
                    
                    if success:
                        client.active_drive = drive
                        print_status(f"AUTHENTICATED! {message}", "OK")
                        print_status(f"Session: {client.session_id[:16]}...", "OK")
                        print_status(f"User: {client.user_info.get('username', '?')} ({client.user_info.get('role', '?')})", "OK")
                        print_status("Heartbeat started (every 5s)", "HEART")
                        print_status("DO NOT REMOVE USB — session will terminate!\n", "WARN")
                        
                        # Start heartbeat
                        client.start_heartbeat()
                    else:
                        print_status(f"Authentication failed: {message}", "ERROR")
                
                time.sleep(SCAN_INTERVAL)
            
            else:
                # ── Monitor USB presence ──
                drive = client.active_drive
                
                # Check if drive is still accessible
                drive_present = os.path.exists(drive)
                
                if not drive_present:
                    print_status("USB REMOVED! Logging out immediately...", "WARN")
                    client.stop_heartbeat()
                    client.logout()
                    print_status("Session terminated. Waiting for USB...\n", "INFO")
                    continue
                
                # Also verify the auth file still exists
                auth_path = os.path.join(drive, AUTH_FILENAME)
                if not os.path.isfile(auth_path):
                    print_status("security.auth removed from USB! Logging out...", "WARN")
                    client.stop_heartbeat()
                    client.logout()
                    print_status("Session terminated. Waiting for USB...\n", "INFO")
                    continue
                
                time.sleep(SCAN_INTERVAL)
    
    except KeyboardInterrupt:
        print("\n")
        print_status("Shutting down...", "INFO")
        if client.authenticated:
            client.stop_heartbeat()
            client.logout()
            print_status("Session terminated", "OK")
        print_status("Goodbye!", "INFO")
        sys.exit(0)


if __name__ == "__main__":
    main()
