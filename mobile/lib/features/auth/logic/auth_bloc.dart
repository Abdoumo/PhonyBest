import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/storage/secure_storage.dart';
import '../data/auth_api_client.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthApiClient authApiClient;

  AuthBloc({required this.authApiClient}) : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    try {
      final token = await SecureStorage.getAccessToken();
      if (token == null) {
        emit(const Unauthenticated());
        return;
      }

      emit(AuthLoading());
      final response = await authApiClient.getMe();
      if (response['success'] == true) {
        final user = response['user'];
        await SecureStorage.saveUserProfile(user);
        emit(Authenticated(user: user));
      } else {
        await SecureStorage.clearSession();
        emit(const Unauthenticated());
      }
    } catch (_) {
      // If endpoint is unreachable or token is invalid, check if we have cached profile
      final user = await SecureStorage.getUserProfile();
      if (user != null) {
        emit(Authenticated(user: user));
      } else {
        await SecureStorage.clearSession();
        emit(const Unauthenticated());
      }
    }
  }

  Future<void> _onLoginRequested(LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final response = await authApiClient.login(event.username, event.password);
      if (response['success'] == true) {
        final accessToken = response['accessToken'];
        final refreshToken = response['refreshToken'];
        final user = response['user'];

        await SecureStorage.saveAccessToken(accessToken);
        await SecureStorage.saveRefreshToken(refreshToken);
        await SecureStorage.saveUserProfile(user);

        emit(Authenticated(user: user));
      } else {
        emit(const Unauthenticated(error: 'Invalid login credentials'));
      }
    } catch (e) {
      emit(Unauthenticated(error: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onLogoutRequested(LogoutRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken != null) {
        await authApiClient.logout(refreshToken);
      }
    } catch (_) {
      // Ignore network failures on logout
    } finally {
      await SecureStorage.clearSession();
      emit(const Unauthenticated());
    }
  }
}
