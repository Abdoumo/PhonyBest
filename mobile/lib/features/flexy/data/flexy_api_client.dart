import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/demo_config.dart';

class FlexyApiClient {
  final Dio _dio = ApiClient().dio;

  Future<Map<String, dynamic>> sendFlexy({
    required String operator,
    required String number,
    required double amount,
    String? offer,
  }) async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 500));
      DemoConfig.demoWallet -= amount;
      final newTx = {
        'id': DemoConfig.demoTransactions.length + 1,
        'type': 'flexy',
        'operator': operator.toLowerCase(),
        'phone_number': number,
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
      final response = await _dio.post('/flexy/send', data: {
        'operator': operator.toLowerCase(),
        'number': number,
        'amount': amount,
        'offer': offer,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل إرسال رصيد فليكسي';
      throw Exception(errorMsg);
    }
  }

  Future<Map<String, dynamic>> getFlexyHistory({
    String? status,
    String? operator,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    if (DemoConfig.isDemoMode) {
      final filtered = DemoConfig.demoTransactions
          .where((t) => t['type'] == 'flexy')
          .toList();
      return {
        'success': true,
        'transactions': filtered,
        'pagination': {'total': filtered.length, 'page': 1, 'limit': 20, 'pages': 1}
      };
    }

    try {
      final response = await _dio.get('/flexy/history', queryParameters: {
        if (status != null) 'status': status,
        if (operator != null) 'operator': operator.toLowerCase(),
        if (search != null) 'search': search,
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
