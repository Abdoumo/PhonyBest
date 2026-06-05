import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/dashboard_api_client.dart';
import 'dashboard_event.dart';
import 'dashboard_state.dart';

class DashboardBloc extends Bloc<DashboardEvent, DashboardState> {
  final DashboardApiClient dashboardApiClient;

  DashboardBloc({required this.dashboardApiClient}) : super(DashboardInitial()) {
    on<FetchDashboardData>(_onFetchDashboardData);
  }

  Future<void> _onFetchDashboardData(
      FetchDashboardData event, Emitter<DashboardState> emit) async {
    emit(DashboardLoading());
    try {
      final response = await dashboardApiClient.getDashboardStats();
      if (response['success'] == true) {
        emit(DashboardLoaded(
          stats: response['stats'] ?? {},
          recentTransactions: response['recentTransactions'] ?? [],
        ));
      } else {
        emit(const DashboardError(message: 'فشل تحميل الإحصائيات من الخادم'));
      }
    } catch (e) {
      emit(DashboardError(message: e.toString().replaceAll('Exception: ', '')));
    }
  }
}
