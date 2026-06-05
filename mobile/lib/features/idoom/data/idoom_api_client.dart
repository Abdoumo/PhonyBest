import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/demo_config.dart';

class IdoomApiClient {
  final Dio _dio = ApiClient().dio;

  Future<Map<String, dynamic>> rechargeIdoom({
    required String ssuid,
    required double amount,
    required String type,
  }) async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 500));
      DemoConfig.demoWallet -= amount;
      final newTx = {
        'id': DemoConfig.demoTransactions.length + 1,
        'type': 'idoom',
        'operator': 'idoom',
        'phone_number': ssuid,
        'amount': amount,
        'status': 'success',
        'client_name': 'حساب تجريبي (Demo)',
        'created_at': DateTime.now().toIso8601String()
      };
      DemoConfig.demoTransactions.insert(0, newTx);
      return {
        'success': true,
        'transaction': newTx
      };
    }

    try {
      final response = await _dio.post('/idoom/recharge', data: {
        'ssuid': ssuid,
        'phone_number': ssuid,
        'amount': amount,
        'type': type.toLowerCase(),
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل تعبئة حساب أيدوم';
      throw Exception(errorMsg);
    }
  }

  Future<Map<String, dynamic>> getIdoomHistory({
    int page = 1,
    int limit = 20,
  }) async {
    if (DemoConfig.isDemoMode) {
      final filtered = DemoConfig.demoTransactions
          .where((t) => t['type'] == 'idoom')
          .toList();
      return {
        'success': true,
        'transactions': filtered,
        'pagination': {'total': filtered.length, 'page': 1, 'limit': 20, 'pages': 1}
      };
    }

    try {
      final response = await _dio.get('/idoom/history', queryParameters: {
        'page': page,
        'limit': limit,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل تحميل سجل العمليات';
      throw Exception(errorMsg);
    }
  }
}

