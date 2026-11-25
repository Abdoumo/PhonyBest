#!/usr/bin/env python3
"""
CreditShift Auto-Login Script
Logs into creditshift.co using credentials in 'cred', handles Device ID (DID)
and 4-digit PIN verification, and saves authenticated cookies to 'cookies'.
"""

import sys
import re
import urllib.request
import urllib.error
import urllib.parse
import http.cookiejar
from pathlib import Path

BASE_URL = "https://creditshift.co"
WORKSPACE_DIR = Path(__file__).parent
CRED_FILE = WORKSPACE_DIR / "cred"
COOKIES_FILE = WORKSPACE_DIR / "cookies"

def parse_cred_file(path):
    if not path.exists():
        raise FileNotFoundError(f"Credentials file not found: {path}")
    
    creds = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, v = line.split("=", 1)
            creds[k.strip().lower()] = v.strip()
            
    username = creds.get("username") or creds.get("user")
    password = creds.get("pass") or creds.get("password")
    pin = creds.get("pin")
    
    if not username or not password:
        raise ValueError("Missing 'username' or 'pass' in cred file.")
        
    return username, password, pin

def get_existing_did(cookies_path):
    if not cookies_path.exists():
        return None
    content = cookies_path.read_text(encoding="utf-8")
    match = re.search(r"DID=([a-f0-9]{32,64})", content)
    if match:
        return match.group(1)
    return None

def save_cookies(cookies_path, did, sid):
    content = (
        f"SID={sid}\n"
        f"DID={did}\n"
        f"Cookie\n"
        f"\tDID={did}; SID={sid}; language=ar\n"
    )
    cookies_path.write_text(content, encoding="utf-8")
    print(f"[+] Cookies successfully saved to {cookies_path}")

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def http_error_302(self, req, fp, code, msg, headers):
        return fp

def login(username, password, pin=None, existing_did=None):
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), NoRedirectHandler)
    
    # Step 1: Obtain device ID
    device_id = existing_did
    if not device_id:
        req_page = urllib.request.Request(f"{BASE_URL}/login")
        try:
            with urllib.request.urlopen(req_page, timeout=15) as resp:
                html = resp.read().decode("utf-8")
                match = re.search(r"localStorage\.setItem\([\"']auth-token[\"'],\s*[\"']([a-f0-9]+)[\"']\)", html)
                if match:
                    device_id = match.group(1)
        except Exception:
            pass
            
    if not device_id:
        device_id = "b66a803e173c0989ab6a1e108ba18a6da07bfec9d313c041e95a4bb9900da4eb"
        
    print(f"[*] Logging in as '{username}' using Device ID: {device_id[:16]}...")
    
    # Step 2: POST /login
    post_fields = {
        "auth_token": device_id,
        "location_lat": "",
        "location_long": "",
        "username": username,
        "password": password,
        "remember": "on"
    }
    post_data = urllib.parse.urlencode(post_fields).encode("utf-8")
    
    login_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": f"{BASE_URL}/login",
        "Cookie": f"DID={device_id}"
    }
    
    req_login = urllib.request.Request(f"{BASE_URL}/login", data=post_data, headers=login_headers)
    resp_login = opener.open(req_login, timeout=20)
    
    cookies = {c.name: c.value for c in cj}
    sid = cookies.get("SID")
    did = cookies.get("DID") or device_id
    
    if not sid:
        for h in resp_login.headers.get_all("Set-Cookie", []):
            m = re.search(r"SID=([^;]+)", h)
            if m:
                sid = m.group(1)
                
    if not sid:
        print("[-] Login failed. Could not obtain initial session ID.")
        sys.exit(1)
        
    cookie_header = f"DID={did}; SID={sid}; language=ar"
    
    # Step 3: Check if dashboard (/seller) is accessible or if PIN verification is required
    test_req = urllib.request.Request(f"{BASE_URL}/seller", headers={
        "Cookie": cookie_header
    })
    
    test_body = ""
    is_authenticated = False
    try:
        with opener.open(test_req, timeout=15) as resp_test:
            if resp_test.status == 200:
                is_authenticated = True
            else:
                test_body = resp_test.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        test_body = e.read().decode("utf-8", errors="ignore")
        
    if not is_authenticated:
        if "verifyPin" in test_body or "أدخل الرقم السري" in test_body:
            print("[*] 4-digit PIN verification is required.")
            if not pin:
                if sys.stdin.isatty():
                    pin = input("Enter your 4-digit PIN code: ").strip()
                else:
                    raise ValueError("PIN required but not found in 'cred'.")
                    
            pin = pin.strip()
            print(f"[*] Submitting PIN code verification...")
            
            pin_data = urllib.parse.urlencode({
                "auth_token": did,
                "pin": pin
            }).encode("utf-8")
            
            pin_headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": f"{BASE_URL}/seller",
                "Cookie": cookie_header
            }
            
            req_pin = urllib.request.Request(f"{BASE_URL}/verifyPin", data=pin_data, headers=pin_headers)
            resp_pin = opener.open(req_pin, timeout=20)
            
            for h in resp_pin.headers.get_all("Set-Cookie", []):
                m = re.search(r"SID=([^;]+)", h)
                if m:
                    sid = m.group(1)
                    
            cookie_header = f"DID={did}; SID={sid}; language=ar"
            
            verify_check = urllib.request.Request(f"{BASE_URL}/seller", headers={
                "Cookie": cookie_header
            })
            with urllib.request.urlopen(verify_check, timeout=15) as resp_v:
                if resp_v.status == 200:
                    print("[+] PIN verification SUCCESSFUL! Full access granted.")
                    is_authenticated = True
                else:
                    print(f"[-] PIN verification failed. HTTP Status {resp_v.status}")
                    sys.exit(1)
                    
        elif "wa.me" in test_body or "VERIFY-" in test_body:
            match_wa = re.search(r"https://wa\.me/[^\s\"']+", test_body)
            wa_link = match_wa.group(0).replace("&#x3D;", "=") if match_wa else "WhatsApp Verification"
            print(f"[!] Device not recognized. WhatsApp verification required:")
            print(f"    Link: {wa_link}")
            sys.exit(1)
            
    if is_authenticated:
        save_cookies(COOKIES_FILE, did, sid)
        return did, sid
    else:
        print("[-] Login could not be completed.")
        sys.exit(1)

def main():
    try:
        username, password, pin = parse_cred_file(CRED_FILE)
    except Exception as e:
        print(f"[-] Error reading credentials: {e}")
        sys.exit(1)
        
    existing_did = get_existing_did(COOKIES_FILE)
    login(username, password, pin=pin, existing_did=existing_did)

if __name__ == "__main__":
    main()
