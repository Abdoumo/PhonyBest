import 'package:equatable/equatable.dart';

abstract class CardsState extends Equatable {
  const CardsState();

  @override
  List<Object?> get props => [];
}

class CardsInitial extends CardsState {}

class CardsLoading extends CardsState {}

class CardsLoaded extends CardsState {
  final List<dynamic> cards;
  final List<dynamic> summary;
  final List<dynamic> storeSummary;

  const CardsLoaded({
    required this.cards,
    required this.summary,
    required this.storeSummary,
  });

  @override
  List<Object?> get props => [cards, summary, storeSummary];
}

class CardsError extends CardsState {
  final String error;

  const CardsError({required this.error});

  @override
  List<Object?> get props => [error];
}

// Action operations
class CardsActionSubmitting extends CardsState {}

class CardsActionSuccess extends CardsState {
  final String message;

  const CardsActionSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

class CardsActionFailure extends CardsState {
  final String error;

  const CardsActionFailure({required this.error});

  @override
  List<Object?> get props => [error];
}
