import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/demo_config.dart';

class AuthApiClient {
  final Dio _dio = ApiClient().dio;

  Future<Map<String, dynamic>> login(String username, String password) async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 600)); // Simulate networking lag
      return {
        'success': true,
        'accessToken': 'demo_access_token',
        'refreshToken': 'demo_refresh_token',
        'user': {
          'id': 999,
          'username': 'demo_user',
          'email': 'demo@flexygsm.com',
          'full_name': 'حساب تجريبي (Demo)',
          'role': 'ADMIN',
          'wallet': DemoConfig.demoWallet,
          'debt': DemoConfig.demoDebt,
          'usb_auth_required': false,
          'permissions': '["dashboard","flexy","idoom","cards","settings"]'
        }
      };
    }

    try {
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل تسجيل الدخول';
      throw Exception(errorMsg);
    }
  }

  Future<Map<String, dynamic>> getMe() async {
    if (DemoConfig.isDemoMode) {
      return {
        'success': true,
        'user': {
          'id': 999,
          'username': 'demo_user',
          'email': 'demo@flexygsm.com',
          'full_name': 'حساب تجريبي (Demo)',
          'role': 'ADMIN',
          'wallet': DemoConfig.demoWallet,
          'debt': DemoConfig.demoDebt,
          'usb_auth_required': false,
          'permissions': '["dashboard","flexy","idoom","cards","settings"]'
        }
      };
    }

    try {
      final response = await _dio.get('/auth/me');
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل جلب بيانات الحساب';
      throw Exception(errorMsg);
    }
  }

  Future<void> logout(String refreshToken) async {
    if (DemoConfig.isDemoMode) {
      DemoConfig.reset();
      return;
    }

    try {
      await _dio.post('/auth/logout', data: {
        'refreshToken': refreshToken,
      });
    } catch (_) {
      // Ignore network errors on logout, local clear is prioritized
    }
  }
}
