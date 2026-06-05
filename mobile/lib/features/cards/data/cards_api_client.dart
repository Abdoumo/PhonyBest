import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/demo_config.dart';

class CardsApiClient {
  final Dio _dio = ApiClient().dio;

  Future<Map<String, dynamic>> getStock({
    String? operator,
    String? status,
    String? value,
    int page = 1,
    int limit = 40,
  }) async {
    if (DemoConfig.isDemoMode) {
      final availableCards = DemoConfig.demoCards.where((c) => c['status'] == 'available').toList();
      return {
        'success': true,
        'cards': DemoConfig.demoCards,
        'summary': [
          {'operator': 'mobilis', 'status': 'available', 'count': availableCards.where((c) => c['operator'] == 'mobilis').length, 'total_value': '200'},
          {'operator': 'djezzy', 'status': 'available', 'count': availableCards.where((c) => c['operator'] == 'djezzy').length, 'total_value': '500'},
          {'operator': 'ooredoo', 'status': 'available', 'count': availableCards.where((c) => c['operator'] == 'ooredoo').length, 'total_value': '1000'},
        ],
        'store_summary': [
          {'operator': 'mobilis', 'value': 100.0, 'available_count': 5},
          {'operator': 'djezzy', 'value': 100.0, 'available_count': 10},
          {'operator': 'ooredoo', 'value': 500.0, 'available_count': 3},
        ]
      };
    }

    try {
      final response = await _dio.get('/cards/stock', queryParameters: {
        if (operator != null) 'operator': operator,
        if (status != null) 'status': status,
        if (value != null) 'value': value,
        'page': page,
        'limit': limit,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل تحميل بيانات المخزون';
      throw Exception(errorMsg);
    }
  }

  Future<Map<String, dynamic>> buyCards({
    required String operator,
    required double value,
    required int quantity,
  }) async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 500));
      final cost = value * quantity;
      DemoConfig.demoWallet -= cost;
      for (int i = 0; i < quantity; i++) {
        DemoConfig.demoCards.add({
          'id': DemoConfig.demoCards.length + 200,
          'serial': '${operator.substring(0, 3).toUpperCase()}-${100000 + DemoConfig.demoCards.length}',
          'pin': '1111-2222-${3333 + DemoConfig.demoCards.length}',
          'operator': operator.toLowerCase(),
          'value': value,
          'status': 'available'
        });
      }
      final newTx = {
        'id': DemoConfig.demoTransactions.length + 1,
        'type': 'buy_cards',
        'operator': operator.toLowerCase(),
        'amount': cost,
        'status': 'success',
        'client_name': 'حساب تجريبي (Demo)',
        'created_at': DateTime.now().toIso8601String()
      };
      DemoConfig.demoTransactions.insert(0, newTx);
      return {
        'success': true,
        'message': 'تم شراء $quantity بطاقة بنجاح'
      };
    }

    try {
      final response = await _dio.post('/cards/buy', data: {
        'operator': operator.toLowerCase(),
        'value': value,
        'quantity': quantity,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل عملية شراء البطاقات';
      throw Exception(errorMsg);
    }
  }

  Future<Map<String, dynamic>> sellCard({
    required String operator,
    required double value,
    String? clientId,
  }) async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 400));
      // Find an available card and mark it sold
      final index = DemoConfig.demoCards.indexWhere((c) =>
          c['operator'] == operator.toLowerCase() &&
          c['value'] == value &&
          c['status'] == 'available');
      if (index != -1) {
        DemoConfig.demoCards[index]['status'] = 'sold';
        DemoConfig.demoWallet -= value;
      } else {
        throw Exception('لا توجد بطاقة متوفرة من هذه الفئة في مخزونك');
      }
      final newTx = {
        'id': DemoConfig.demoTransactions.length + 1,
        'type': 'card',
        'operator': operator.toLowerCase(),
        'amount': value,
        'status': 'success',
        'client_name': 'حساب تجريبي (Demo)',
        'created_at': DateTime.now().toIso8601String()
      };
      DemoConfig.demoTransactions.insert(0, newTx);
      return {
        'success': true,
        'card': {'status': 'sold'}
      };
    }

    try {
      final response = await _dio.post('/cards/sell', data: {
        'operator': operator.toLowerCase(),
        'value': value,
        if (clientId != null) 'client_id': clientId,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل بيع البطاقة';
      throw Exception(errorMsg);
    }
  }

  Future<Map<String, dynamic>> uploadCards(List<Map<String, dynamic>> cards) async {
    if (DemoConfig.isDemoMode) {
      await Future.delayed(const Duration(milliseconds: 600));
      for (final card in cards) {
        DemoConfig.demoCards.add({
          'id': DemoConfig.demoCards.length + 300,
          'serial': card['serial'],
          'pin': card['pin'],
          'operator': card['operator'].toString().toLowerCase(),
          'value': double.tryParse(card['value'].toString()) ?? 100.0,
          'status': 'available'
        });
      }
      return {
        'success': true,
        'imported': cards.length
      };
    }

    try {
      final response = await _dio.post('/cards/upload', data: {
        'cards': cards,
      });
      return response.data;
    } on DioException catch (e) {
      final errorMsg = e.response?.data['error'] ?? 'فشل رفع البطاقات';
      throw Exception(errorMsg);
    }
  }
}
