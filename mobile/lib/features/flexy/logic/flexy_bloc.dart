import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/flexy_api_client.dart';
import 'flexy_event.dart';
import 'flexy_state.dart';

class FlexyBloc extends Bloc<FlexyEvent, FlexyState> {
  final FlexyApiClient flexyApiClient;

  FlexyBloc({required this.flexyApiClient}) : super(FlexyInitial()) {
    on<SendFlexyRequested>(_onSendFlexyRequested);
    on<FetchFlexyHistory>(_onFetchFlexyHistory);
  }

  Future<void> _onSendFlexyRequested(
      SendFlexyRequested event, Emitter<FlexyState> emit) async {
    emit(FlexySubmitting());
    try {
      final response = await flexyApiClient.sendFlexy(
        operator: event.operator,
        number: event.number,
        amount: event.amount,
        offer: event.offer,
      );
      if (response['success'] == true) {
        emit(FlexySuccess(transaction: response['transaction'] ?? {}));
      } else {
        emit(const FlexyFailure(error: 'فشل إرسال الفليكسي'));
      }
    } catch (e) {
      emit(FlexyFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onFetchFlexyHistory(
      FetchFlexyHistory event, Emitter<FlexyState> emit) async {
    emit(FlexyHistoryLoading());
    try {
      final response = await flexyApiClient.getFlexyHistory(
        status: event.status,
        operator: event.operator,
        search: event.search,
        page: event.page,
      );
      if (response['success'] == true) {
        final txs = response['transactions'] ?? [];
        final pagination = response['pagination'] ?? {};
        final totalPages = pagination['pages'] ?? 1;
        emit(FlexyHistoryLoaded(
          transactions: txs,
          page: event.page,
          hasReachedMax: event.page >= totalPages,
        ));
      } else {
        emit(const FlexyHistoryFailure(error: 'فشل تحميل السجل من الخادم'));
      }
    } catch (e) {
      emit(FlexyHistoryFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }
}
