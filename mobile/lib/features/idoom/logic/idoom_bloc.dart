import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/idoom_api_client.dart';
import 'idoom_event.dart';
import 'idoom_state.dart';

class IdoomBloc extends Bloc<IdoomEvent, IdoomState> {
  final IdoomApiClient idoomApiClient;

  IdoomBloc({required this.idoomApiClient}) : super(IdoomInitial()) {
    on<RechargeIdoomRequested>(_onRechargeIdoomRequested);
    on<FetchIdoomHistory>(_onFetchIdoomHistory);
  }

  Future<void> _onRechargeIdoomRequested(
      RechargeIdoomRequested event, Emitter<IdoomState> emit) async {
    emit(IdoomSubmitting());
    try {
      final response = await idoomApiClient.rechargeIdoom(
        ssuid: event.ssuid,
        amount: event.amount,
        type: event.type,
      );
      if (response['success'] == true) {
        emit(IdoomSuccess(transaction: response['transaction'] ?? {}));
      } else {
        emit(const IdoomFailure(error: 'فشل إرسال شحن أيدوم'));
      }
    } catch (e) {
      emit(IdoomFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onFetchIdoomHistory(
      FetchIdoomHistory event, Emitter<IdoomState> emit) async {
    emit(IdoomHistoryLoading());
    try {
      final response = await idoomApiClient.getIdoomHistory(page: event.page);
      if (response['success'] == true) {
        final txs = response['transactions'] ?? [];
        final pagination = response['pagination'] ?? {};
        final totalPages = pagination['pages'] ?? 1;
        emit(IdoomHistoryLoaded(
          transactions: txs,
          page: event.page,
          hasReachedMax: event.page >= totalPages,
        ));
      } else {
        emit(const IdoomHistoryFailure(error: 'فشل تحميل سجل أيدوم'));
      }
    } catch (e) {
      emit(IdoomHistoryFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }
}
