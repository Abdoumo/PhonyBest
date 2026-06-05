import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/demo_config.dart';

class DashboardApiClient {
  final Dio _dio = ApiClient().dio;

  Future<Map<String, dynamic>> getDashboardStats() async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 200));
      return {
        'success': true,
        'stats': {
          'todayEarnings': 450.0,
          'totalTransactions': DemoConfig.demoTransactions.length,
          'failedOperations': 0,
          'activeSims': 3,
          'totalUsers': 12,
          'totalWalletBalance': DemoConfig.demoWallet,
          'myWalletBalance': DemoConfig.demoWallet,
        },
        'recentTransactions': DemoConfig.demoTransactions,
        'chartData': []
      };
    }

    try {
      final response = await _dio.get('/dashboard/stats');
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل جلب بيانات لوحة القيادة';
      throw Exception(errorMsg);
    }
  }
}
