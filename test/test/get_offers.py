#!/usr/bin/env python3
import sys
import re
import json
from pathlib import Path
import urllib.request
import urllib.error
import urllib.parse
import http.cookiejar

BASE_URL = "https://creditshift.co"
WORKSPACE_DIR = Path(__file__).parent
COOKIES_FILE = WORKSPACE_DIR / "cookies"
CRED_FILE = WORKSPACE_DIR / "cred"

def parse_cookies_file(file_path):
    if not file_path.exists():
        return {}
    
    content = file_path.read_text(encoding="utf-8").strip()
    cookies = {}

    for line in content.splitlines():
        line = line.strip()
        if not line or line.lower().startswith("cookie"):
            continue
        parts = line.split(";")
        for part in parts:
            if "=" in part:
                k, v = part.strip().split("=", 1)
                cookies[k.strip()] = v.strip()
    
    return cookies

def try_auto_login():
    """Attempts auto-login using cred and login.py."""
    print("[*] Cookies expired or missing. Attempting auto-login using 'cred'...")
    try:
        from login import parse_cred_file, get_existing_did, login
        username, password, pin = parse_cred_file(CRED_FILE)
        existing_did = get_existing_did(COOKIES_FILE)
        did, sid = login(username, password, pin=pin, existing_did=existing_did)
        return parse_cookies_file(COOKIES_FILE)
    except Exception as e:
        print(f"[-] Auto-login failed: {e}")
        return None

def get_operator(phone_nbr):
    cleaned = re.sub(r"\D", "", phone_nbr)
    if cleaned.startswith("05"):
        return "Ooredoo (05)"
    elif cleaned.startswith("06"):
        return "Mobilis (06)"
    elif cleaned.startswith("07"):
        return "Djezzy (07)"
    return "Unknown Operator"

def get_session_and_role(cookies_dict):
    if not cookies_dict:
        return "seller", ""
        
    cookie_str = "; ".join([f"{k}={v}" for k, v in cookies_dict.items()])
    headers = {
        "Cookie": cookie_str
    }
    
    req = urllib.request.Request(f"{BASE_URL}/", headers=headers)
    try:
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def http_error_302(self, req, fp, code, msg, headers):
                return fp

        opener = urllib.request.build_opener(NoRedirectHandler)
        resp = opener.open(req, timeout=15)
        loc = resp.headers.get("Location")
        if loc and loc.startswith("/"):
            role = loc.strip("/").split("/")[0]
            if role in ["seller", "distributor", "admin"]:
                return role, cookie_str
    except Exception:
        pass
    
    return "seller", cookie_str

def fetch_offers(phone_nbr, role="seller", cookie_str=""):
    cleaned_phone = re.sub(r"\D", "", phone_nbr)
    if not cleaned_phone:
        raise ValueError("Phone number must not be empty.")
    
    url = f"{BASE_URL}/{role}/getFlexyOffers?phoneNbr={cleaned_phone}"
    headers = {
        "Referer": f"{BASE_URL}/{role}/flexy",
        "Cookie": cookie_str,
        "Accept": "application/json, text/plain, */*"
    }
    
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def http_error_302(self, req, fp, code, msg, headers):
            return fp

    opener = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, headers=headers)
    resp = opener.open(req, timeout=15)
    
    if resp.status == 302 or resp.headers.get("Location"):
        raise urllib.error.HTTPError(url, 302, "Session expired / redirected", resp.headers, None)
        
    body = resp.read().decode("utf-8")
    if body.strip().startswith("<!DOCTYPE html>"):
        raise urllib.error.HTTPError(url, 401, "Returned HTML instead of JSON", resp.headers, None)
        
    return json.loads(body)

def main():
    if len(sys.argv) > 1 and sys.argv[1] in ("-h", "--help"):
        print("Usage: python3 get_offers.py <phone_number> [--json]")
        print("Example: python3 get_offers.py 0699326406")
        sys.exit(0)
    
    phone = None
    output_json = False
    
    for arg in sys.argv[1:]:
        if arg == "--json":
            output_json = True
        elif not phone and not arg.startswith("-"):
            phone = arg
            
    if not phone:
        phone = input("Enter SIM phone number (e.g. 0699326406): ").strip()
    
    phone = re.sub(r"\D", "", phone)
    if not phone:
        print("Error: No phone number provided.")
        sys.exit(1)
        
    cookies_dict = parse_cookies_file(COOKIES_FILE)
    if not cookies_dict:
        cookies_dict = try_auto_login()
        if not cookies_dict:
            print("[-] Unable to obtain valid cookies. Exiting.")
            sys.exit(1)
        
    role, cookie_str = get_session_and_role(cookies_dict)
    operator = get_operator(phone)
    
    offers = None
    for attempt in range(2):
        try:
            offers = fetch_offers(phone, role=role, cookie_str=cookie_str)
            break
        except (urllib.error.HTTPError, Exception) as e:
            if attempt == 0:
                print(f"[*] Session issue detected ({e}). Trying to auto-refresh session...")
                cookies_dict = try_auto_login()
                if cookies_dict:
                    role, cookie_str = get_session_and_role(cookies_dict)
                    continue
            print(f"[-] Error fetching offers: {e}")
            sys.exit(1)
        
    if output_json:
        print(json.dumps(offers, ensure_ascii=False, indent=2))
        return
        
    print(f"\n==========================================")
    print(f" Phone Number : {phone}")
    print(f" Operator     : {operator}")
    print(f" Account Role : /{role}")
    print(f" Total Offers : {len(offers)}")
    print(f"==========================================\n")
    
    if not offers:
        print("لا توجد عروض لهذا الرقم (No offers found for this number).")
        return
        
    if isinstance(offers, dict) and "error" in offers:
        err = offers["error"]
        msg = err.get("message_ar") or err.get("message") or str(err)
        print(f"Server Message: {msg}")
        return

    print(f"{'#':<4} | {'Offer Name':<35} | {'Price (DZD)':<10}")
    print("-" * 55)
    for idx, item in enumerate(offers, 1):
        name = item.get("offerName", "")
        cleaned_name = re.sub(r"\d+_DA\|", "", name)
        amount = item.get("offerAmount", 0)
        print(f"{idx:<4} | {cleaned_name:<35} | {amount} DZD")
    print("-" * 55)

if __name__ == "__main__":
    main()
