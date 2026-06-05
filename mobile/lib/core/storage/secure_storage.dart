import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage();
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userKey = 'user_profile';
  static const String _backendUrlKey = 'backend_api_url';
  static const String _langKey = 'app_language';

  // Access Token
  static Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _accessTokenKey, value: token);
  }

  static Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  static Future<void> deleteAccessToken() async {
    await _storage.delete(key: _accessTokenKey);
  }

  // Refresh Token
  static Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: _refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  static Future<void> deleteRefreshToken() async {
    await _storage.delete(key: _refreshTokenKey);
  }

  // User Profile
  static Future<void> saveUserProfile(Map<String, dynamic> userMap) async {
    final String userStr = jsonEncode(userMap);
    await _storage.write(key: _userKey, value: userStr);
  }

  static Future<Map<String, dynamic>?> getUserProfile() async {
    final String? userStr = await _storage.read(key: _userKey);
    if (userStr == null) return null;
    try {
      return jsonDecode(userStr) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  static Future<void> deleteUserProfile() async {
    await _storage.delete(key: _userKey);
  }

  // Backend API URL
  static Future<void> saveBackendUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_backendUrlKey, url);
  }

  static Future<String> getBackendUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_backendUrlKey) ?? 'http://10.0.2.2:5000/api/v1'; // Default emulator localhost bridge
  }

  // Language Setting
  static Future<void> saveLanguage(String lang) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_langKey, lang);
  }

  static Future<String> getLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_langKey) ?? 'ar';
  }

  // Clear Session
  static Future<void> clearSession() async {
    await deleteAccessToken();
    await deleteRefreshToken();
    await deleteUserProfile();
  }
}
