import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/cards_api_client.dart';
import 'cards_event.dart';
import 'cards_state.dart';

class CardsBloc extends Bloc<CardsEvent, CardsState> {
  final CardsApiClient cardsApiClient;

  CardsBloc({required this.cardsApiClient}) : super(CardsInitial()) {
    on<FetchCardsStock>(_onFetchCardsStock);
    on<BuyCardsRequested>(_onBuyCardsRequested);
    on<SellCardRequested>(_onSellCardRequested);
    on<UploadCardsRequested>(_onUploadCardsRequested);
  }

  Future<void> _onFetchCardsStock(
      FetchCardsStock event, Emitter<CardsState> emit) async {
    emit(CardsLoading());
    try {
      final response = await cardsApiClient.getStock(
        operator: event.operator,
        status: event.status,
        value: event.value,
      );
      if (response['success'] == true) {
        emit(CardsLoaded(
          cards: response['cards'] ?? [],
          summary: response['summary'] ?? [],
          storeSummary: response['store_summary'] ?? [],
        ));
      } else {
        emit(const CardsError(error: 'فشل تحميل بيانات المخزون'));
      }
    } catch (e) {
      emit(CardsError(error: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onBuyCardsRequested(
      BuyCardsRequested event, Emitter<CardsState> emit) async {
    emit(CardsActionSubmitting());
    try {
      final response = await cardsApiClient.buyCards(
        operator: event.operator,
        value: event.value,
        quantity: event.quantity,
      );
      if (response['success'] == true) {
        emit(CardsActionSuccess(message: response['message'] ?? 'تم الشراء بنجاح'));
      } else {
        emit(const CardsActionFailure(error: 'فشل عملية الشراء'));
      }
    } catch (e) {
      emit(CardsActionFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onSellCardRequested(
      SellCardRequested event, Emitter<CardsState> emit) async {
    emit(CardsActionSubmitting());
    try {
      final response = await cardsApiClient.sellCard(
        operator: event.operator,
        value: event.value,
        clientId: event.clientId,
      );
      if (response['success'] == true) {
        emit(const CardsActionSuccess(message: 'تم بيع البطاقة بنجاح'));
      } else {
        emit(const CardsActionFailure(error: 'فشل بيع البطاقة'));
      }
    } catch (e) {
      emit(CardsActionFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onUploadCardsRequested(
      UploadCardsRequested event, Emitter<CardsState> emit) async {
    emit(CardsActionSubmitting());
    try {
      final response = await cardsApiClient.uploadCards(event.cards);
      if (response['success'] == true) {
        final imported = response['imported'] ?? 0;
        emit(CardsActionSuccess(message: 'تم رفع $imported بطاقة بنجاح'));
      } else {
        emit(const CardsActionFailure(error: 'فشل رفع البطاقات'));
      }
    } catch (e) {
      emit(CardsActionFailure(error: e.toString().replaceAll('Exception: ', '')));
    }
  }
}
