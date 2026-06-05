import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;

  ApiClient._internal() {
    dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Dynamically get the backend URL configured by the user
        final baseUrl = await SecureStorage.getBackendUrl();
        options.baseUrl = baseUrl;

        // Get accessToken and append to headers
        final token = await SecureStorage.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // If Unauthorized (401) and we have a refresh token, try to refresh
        if (e.response?.statusCode == 401 && 
            e.requestOptions.path != '/auth/login' && 
            e.requestOptions.path != '/auth/refresh') {
          
          final refreshToken = await SecureStorage.getRefreshToken();
          if (refreshToken != null) {
            try {
              // Create a clean Dio instance to avoid circular calls
              final refreshDio = Dio();
              final baseUrl = await SecureStorage.getBackendUrl();
              
              final refreshResponse = await refreshDio.post(
                '$baseUrl/auth/refresh',
                data: {'refreshToken': refreshToken},
              );

              if (refreshResponse.statusCode == 200 && refreshResponse.data['success'] == true) {
                final newAccessToken = refreshResponse.data['accessToken'];
                final newRefreshToken = refreshResponse.data['refreshToken'];

                await SecureStorage.saveAccessToken(newAccessToken);
                await SecureStorage.saveRefreshToken(newRefreshToken);

                // Retry original request with new token
                final options = e.requestOptions;
                options.headers['Authorization'] = 'Bearer $newAccessToken';
                
                final response = await dio.fetch(options);
                return handler.resolve(response);
              }
            } catch (err) {
              // Refresh failed, clear session and reject
              await SecureStorage.clearSession();
              // Can optionally notify stream or bloc here
            }
          }
        }
        return handler.next(e);
      },
    ));
  }
}
