import 'package:equatable/equatable.dart';

abstract class CardsEvent extends Equatable {
  const CardsEvent();

  @override
  List<Object?> get props => [];
}

class FetchCardsStock extends CardsEvent {
  final String? operator;
  final String? status;
  final String? value;

  const FetchCardsStock({this.operator, this.status, this.value});

  @override
  List<Object?> get props => [operator, status, value];
}

class BuyCardsRequested extends CardsEvent {
  final String operator;
  final double value;
  final int quantity;

  const BuyCardsRequested({
    required this.operator,
    required this.value,
    required this.quantity,
  });

  @override
  List<Object?> get props => [operator, value, quantity];
}

class SellCardRequested extends CardsEvent {
  final String operator;
  final double value;
  final String? clientId;

  const SellCardRequested({
    required this.operator,
    required this.value,
    this.clientId,
  });

  @override
  List<Object?> get props => [operator, value, clientId];
}

class UploadCardsRequested extends CardsEvent {
  final List<Map<String, dynamic>> cards;

  const UploadCardsRequested({required this.cards});

  @override
  List<Object?> get props => [cards];
}
